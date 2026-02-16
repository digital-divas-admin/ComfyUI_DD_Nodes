import { app } from "../../../scripts/app.js";

const NODE_NAME = "DD_ImagePowerSelector";
const DEFAULT_SLOTS = 2;

app.registerExtension({
    name: "DDNodes.ImagePowerSelector",

    async beforeRegisterNodeDef(nodeType, nodeData, _app) {
        if (nodeData.name !== NODE_NAME) return;

        // --- Add an image input slot ---
        nodeType.prototype._addImageSlot = function () {
            this._slotCounter++;
            const name = "image_" + this._slotCounter;
            this.addInput(name, "IMAGE");
            this._toggleStates[name] = true;
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
        };

        // --- Sync toggle state to the hidden widget ---
        nodeType.prototype._syncToggleStates = function () {
            const w = this.widgets?.find((w) => w.name === "toggle_states");
            if (w) {
                w.value = JSON.stringify(this._toggleStates);
            }
            // Also update the stored ref in case widget was cached
            if (this._toggleWidget) {
                this._toggleWidget.value = JSON.stringify(this._toggleStates);
            }
        };

        // --- Hide the toggle_states widget visually ---
        // Keep it in the widgets array so ComfyUI can read its value during
        // prompt execution. Just make it invisible and zero-height.
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
            // Use LiteGraph's own getConnectionPos for exact slot position,
            // then convert from graph-space to local node-space.
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
            this.addWidget("button", "➕ Add Image", null, () => {
                this._addImageSlot();
                this._syncToggleStates();
                this.setSize(this.computeSize());
                this.setDirtyCanvas(true, true);
            });

            this.addWidget("button", "➖ Remove Image", null, () => {
                this._removeLastImageSlot();
                this._syncToggleStates();
                this.setSize(this.computeSize());
                this.setDirtyCanvas(true, true);
            });

            // Hide toggle_states widget after a microtask so ComfyUI has created it
            const node = this;
            requestAnimationFrame(() => {
                node._hideToggleWidget();
                node._syncToggleStates();
                node.setSize(node.computeSize());
                node.setDirtyCanvas(true, true);
            });

            this.size[0] = Math.max(this.size[0], 240);
            this._syncToggleStates();
        };

        // --- Draw toggle indicators on the foreground ---
        const origDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            if (origDrawForeground) origDrawForeground.apply(this, arguments);
            if (!this.inputs) return;

            for (let i = 0; i < this.inputs.length; i++) {
                const input = this.inputs[i];
                if (!input.name.startsWith("image_")) continue;

                const isOn = this._toggleStates?.[input.name] !== false;
                const slotY = this._getSlotY(i);
                const toggleX = 75;
                const radius = 5;

                ctx.save();
                ctx.beginPath();
                ctx.arc(toggleX, slotY, radius, 0, Math.PI * 2);

                if (isOn) {
                    ctx.fillStyle = "#4CAF50";
                    ctx.fill();
                    ctx.strokeStyle = "#2E7D32";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
                    ctx.fill();
                    ctx.strokeStyle = "#666";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                // Draw ON/OFF label next to toggle
                ctx.font = "10px Arial";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillStyle = isOn ? "#4CAF50" : "#666";
                ctx.fillText(isOn ? "ON" : "OFF", toggleX + 8, slotY);

                ctx.restore();
            }
        };

        // --- Handle mouse clicks on toggle circles ---
        const origOnMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, localPos, graphCanvas) {
            if (this.inputs && this._toggleStates) {
                for (let i = 0; i < this.inputs.length; i++) {
                    const input = this.inputs[i];
                    if (!input.name.startsWith("image_")) continue;

                    const toggleX = 75;
                    const slotY = this._getSlotY(i);
                    const dx = localPos[0] - toggleX;
                    const dy = localPos[1] - slotY;

                    if (dx * dx + dy * dy < 144) {
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

            // Hide the toggle_states widget
            requestAnimationFrame(() => {
                this._hideToggleWidget();
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
