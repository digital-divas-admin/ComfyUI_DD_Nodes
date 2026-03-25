import { app } from "../../../scripts/app.js";

const NODE_NAME = "DD_ImagePowerSelector";
const DEFAULT_SLOTS = 2;

/**
 * Detect whether Nodes 2.0 (Vue renderer) is active.
 * Falls back to false if the setting API isn't available.
 */
function isVueNodesEnabled() {
    try {
        return !!app.ui?.settings?.getSettingValue("Comfy.VueNodes.Enabled");
    } catch {
        return false;
    }
}

app.registerExtension({
    name: "DDNodes.ImagePowerSelector",

    async beforeRegisterNodeDef(nodeType, nodeData, _app) {
        if (nodeData.name !== NODE_NAME) return;

        // --- Add an image input slot ---
        nodeType.prototype._addImageSlot = function () {
            this._slotCounter++;
            const name = "image_" + this._slotCounter;
            const toggleName = "toggle_" + this._slotCounter;
            this.addInput(name, "IMAGE");
            this._toggleStates[name] = true;

            // Add a toggle widget for Nodes 2.0 compatibility.
            // In LiteGraph mode these are hidden (canvas circles handle the UI).
            // In Nodes 2.0 / Vue mode these render as native toggle switches.
            const node = this;
            const w = this.addWidget("toggle", toggleName, true, function (value) {
                node._toggleStates[name] = value;
                node._syncToggleStates();
                if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
            });
            w._ddToggleWidget = true; // marker for easy identification

            this._applyToggleWidgetVisibility();
        };

        // --- Remove the last image input slot ---
        nodeType.prototype._removeLastImageSlot = function () {
            const imageInputs = [];
            if (this.inputs) {
                for (let i = 0; i < this.inputs.length; i++) {
                    if (this.inputs[i].name.startsWith("image_")) {
                        imageInputs.push({ input: this.inputs[i], index: i });
                    }
                }
            }
            if (imageInputs.length <= 1) return;

            const last = imageInputs[imageInputs.length - 1];
            if (last.input.link != null) {
                this.disconnectInput(last.index);
            }
            this.removeInput(last.index);
            delete this._toggleStates[last.input.name];

            // Remove matching toggle widget
            const slotNum = last.input.name.split("_")[1];
            const toggleName = "toggle_" + slotNum;
            if (this.widgets) {
                const idx = this.widgets.findIndex(
                    (w) => w.name === toggleName
                );
                if (idx !== -1) {
                    this.widgets.splice(idx, 1);
                }
            }
        };

        // --- Sync toggle state to the hidden widget ---
        nodeType.prototype._syncToggleStates = function () {
            const w = this.widgets?.find((w) => w.name === "toggle_states");
            if (w) {
                w.value = JSON.stringify(this._toggleStates);
            }
            if (this._toggleWidget) {
                this._toggleWidget.value = JSON.stringify(this._toggleStates);
            }

            // Also sync individual toggle widgets to match _toggleStates
            if (this.widgets) {
                for (const widget of this.widgets) {
                    if (widget._ddToggleWidget && widget.name.startsWith("toggle_")) {
                        const slotNum = widget.name.split("_")[1];
                        const imageName = "image_" + slotNum;
                        widget.value = this._toggleStates[imageName] !== false;
                    }
                }
            }
        };

        // --- Always hide toggle widgets — canvas-drawn toggles handle the UI ---
        nodeType.prototype._applyToggleWidgetVisibility = function () {
            if (!this.widgets) return;

            for (const w of this.widgets) {
                if (!w._ddToggleWidget) continue;
                w.computeSize = () => [0, -4];
                w.draw = () => {};
                w.type = "converted-widget";
            }
        };

        // --- Hide the toggle_states widget visually ---
        nodeType.prototype._hideToggleWidget = function () {
            if (!this.widgets) return;
            const w = this.widgets.find((w) => w.name === "toggle_states");
            if (w) {
                this._toggleWidget = w;
                w.computeSize = () => [0, -4];
                w.draw = () => {};
                w.type = "converted-widget";
                const node = this;
                w.serializeValue = function () {
                    return JSON.stringify(node._toggleStates || {});
                };
            }
        };

        // --- Helper: get Y position for an input slot (local coords) ---
        nodeType.prototype._getSlotY = function (slotIndex) {
            const pos = this.getConnectionPos(true, slotIndex);
            return pos[1] - this.pos[1];
        };

        // --- onNodeCreated: set up dynamic slots, toggles, and buttons ---
        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (origOnNodeCreated) origOnNodeCreated.apply(this, arguments);

            this._toggleStates = this._toggleStates || {};
            this._slotCounter = this._slotCounter || 0;

            // Only add default slots if none exist yet (fresh node, not loaded)
            if (!this.inputs || this.inputs.filter(i => i.name.startsWith("image_")).length === 0) {
                for (let i = 0; i < DEFAULT_SLOTS; i++) {
                    this._addImageSlot();
                }
            }

            // Add +/- button widgets
            this.addWidget("button", "\u2795 Add Image", null, () => {
                this._addImageSlot();
                this._syncToggleStates();
                this.setSize(this.computeSize());
                this.setDirtyCanvas(true, true);
            });

            this.addWidget("button", "\u2796 Remove Image", null, () => {
                this._removeLastImageSlot();
                this._syncToggleStates();
                this.setSize(this.computeSize());
                this.setDirtyCanvas(true, true);
            });

            // Hide toggle_states widget after a microtask so ComfyUI has created it
            const node = this;
            requestAnimationFrame(() => {
                node._hideToggleWidget();
                node._applyToggleWidgetVisibility();
                node._syncToggleStates();
                node.setSize(node.computeSize());
                node.setDirtyCanvas(true, true);
            });

            this.size[0] = Math.max(this.size[0], 240);
            this._syncToggleStates();
        };

        // --- Draw toggle switches on the foreground (all modes) ---
        const origDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            if (origDrawForeground) origDrawForeground.apply(this, arguments);
            if (!this.inputs) return;

            const trackW = 28;
            const trackH = 14;
            const knobRadius = 5;

            for (let i = 0; i < this.inputs.length; i++) {
                const input = this.inputs[i];
                if (!input.name.startsWith("image_")) continue;

                const isOn = this._toggleStates?.[input.name] !== false;
                const slotY = this._getSlotY(i);
                const trackX = this.size[0] - trackW - 10;
                const trackY = slotY - trackH / 2;

                ctx.save();

                // Draw pill-shaped track
                const trackRadius = trackH / 2;
                ctx.beginPath();
                ctx.roundRect(trackX, trackY, trackW, trackH, trackRadius);
                ctx.fillStyle = isOn ? "#4CAF50" : "rgba(100, 100, 100, 0.5)";
                ctx.fill();

                // Draw knob circle
                const knobX = isOn
                    ? trackX + trackW - trackRadius
                    : trackX + trackRadius;
                ctx.beginPath();
                ctx.arc(knobX, slotY, knobRadius, 0, Math.PI * 2);
                ctx.fillStyle = "#fff";
                ctx.fill();

                ctx.restore();
            }
        };

        // --- Handle mouse clicks on toggle switches (all modes) ---
        const origOnMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, localPos, graphCanvas) {
            if (this.inputs && this._toggleStates) {
                const trackW = 28;
                const trackH = 14;

                for (let i = 0; i < this.inputs.length; i++) {
                    const input = this.inputs[i];
                    if (!input.name.startsWith("image_")) continue;

                    const slotY = this._getSlotY(i);
                    const trackX = this.size[0] - trackW - 10;
                    const trackY = slotY - trackH / 2;

                    if (
                        localPos[0] >= trackX &&
                        localPos[0] <= trackX + trackW &&
                        localPos[1] >= trackY &&
                        localPos[1] <= trackY + trackH
                    ) {
                        this._toggleStates[input.name] =
                            !this._toggleStates[input.name];
                        this._syncToggleStates();
                        this.setDirtyCanvas(true, true);
                        return true;
                    }
                }
            }
            if (origOnMouseDown)
                return origOnMouseDown.apply(this, arguments);
        };

        // --- Restore state when loading from saved workflow ---
        const origOnConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            // Initialize before configure restores inputs
            this._toggleStates = this._toggleStates || {};
            this._slotCounter = this._slotCounter || 0;

            if (origOnConfigure) origOnConfigure.apply(this, arguments);

            // Restore toggle states from widget values in saved data
            if (info.widgets_values) {
                for (const val of info.widgets_values) {
                    if (typeof val === "string" && val.startsWith("{")) {
                        try {
                            const parsed = JSON.parse(val);
                            if (parsed && typeof parsed === "object") {
                                this._toggleStates = parsed;
                                break;
                            }
                        } catch (e) {
                            // Not our JSON, skip
                        }
                    }
                }
            }

            // Also try from the widget directly
            const toggleWidget = this.widgets?.find(
                (w) => w.name === "toggle_states"
            );
            if (toggleWidget && toggleWidget.value && typeof toggleWidget.value === "string") {
                try {
                    const parsed = JSON.parse(toggleWidget.value);
                    if (parsed && typeof parsed === "object") {
                        this._toggleStates = parsed;
                    }
                } catch (e) {
                    // ignore
                }
            }

            // Rebuild _slotCounter from existing inputs
            let maxSlot = 0;
            if (this.inputs) {
                for (const input of this.inputs) {
                    const match = input.name.match(/^image_(\d+)$/);
                    if (match) {
                        maxSlot = Math.max(maxSlot, parseInt(match[1]));
                        if (!(input.name in this._toggleStates)) {
                            this._toggleStates[input.name] = true;
                        }
                    }
                }
            }
            this._slotCounter = maxSlot;

            // Ensure toggle widgets exist for each image input (for Nodes 2.0)
            if (this.inputs && this.widgets) {
                for (const input of this.inputs) {
                    const match = input.name.match(/^image_(\d+)$/);
                    if (!match) continue;
                    const toggleName = "toggle_" + match[1];
                    const hasToggleWidget = this.widgets.some(
                        (w) => w.name === toggleName
                    );
                    if (!hasToggleWidget) {
                        const node = this;
                        const imageName = input.name;
                        const w = this.addWidget("toggle", toggleName, this._toggleStates[imageName] !== false, function (value) {
                            node._toggleStates[imageName] = value;
                            node._syncToggleStates();
                            if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
                        });
                        w._ddToggleWidget = true;
                    }
                }
            }

            // Hide the toggle_states widget and apply visibility
            requestAnimationFrame(() => {
                this._hideToggleWidget();
                this._applyToggleWidgetVisibility();
                this._syncToggleStates();
                this.setSize(this.computeSize());
                this.setDirtyCanvas(true, true);
            });
        };

        // --- Override getExtraMenuOptions for toggle all ---
        const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (_, options) {
            if (origGetExtraMenuOptions) {
                origGetExtraMenuOptions.apply(this, arguments);
            }

            options.unshift(
                {
                    content: "Toggle All ON",
                    callback: () => {
                        if (this.inputs) {
                            for (const input of this.inputs) {
                                if (input.name.startsWith("image_")) {
                                    this._toggleStates[input.name] = true;
                                }
                            }
                        }
                        this._syncToggleStates();
                        this.setDirtyCanvas(true, true);
                    },
                },
                {
                    content: "Toggle All OFF",
                    callback: () => {
                        if (this.inputs) {
                            for (const input of this.inputs) {
                                if (input.name.startsWith("image_")) {
                                    this._toggleStates[input.name] = false;
                                }
                            }
                        }
                        this._syncToggleStates();
                        this.setDirtyCanvas(true, true);
                    },
                },
                null // separator
            );

            return options;
        };
    },
});
