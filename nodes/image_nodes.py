import json

import torch


class FlexibleOptionalInputType(dict):
    """Allows dynamic optional inputs by accepting any key name.

    Overrides __contains__ to accept any key and __getitem__ to return
    the expected type tuple for unknown keys. Known keys (passed via data)
    return their predefined types.
    """

    def __init__(self, type_value, data=None):
        self.type = type_value
        self.data = data or {}
        for k, v in self.data.items():
            self[k] = v

    def __getitem__(self, key):
        if key in self.data:
            return self.data[key]
        return (self.type,)

    def __contains__(self, key):
        return True


class DD_ImageResize:
    """Resizes an image to the specified dimensions."""

    RESIZE_METHODS = ["nearest", "bilinear", "bicubic", "area"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "width": ("INT", {"default": 512, "min": 1, "max": 8192, "step": 1}),
                "height": ("INT", {"default": 512, "min": 1, "max": 8192, "step": 1}),
                "method": (cls.RESIZE_METHODS, {"default": "bilinear"}),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "execute"
    CATEGORY = "DD Nodes/Image"

    def execute(self, image, width, height, method):
        # image shape: (B, H, W, C) -> (B, C, H, W) for interpolation
        img = image.permute(0, 3, 1, 2)
        resized = torch.nn.functional.interpolate(img, size=(height, width), mode=method)
        return (resized.permute(0, 2, 3, 1),)


class DD_ImageBatch:
    """Combines two images into a single batch."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_a": ("IMAGE",),
                "image_b": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "execute"
    CATEGORY = "DD Nodes/Image"

    def execute(self, image_a, image_b):
        if image_a.shape[1:] != image_b.shape[1:]:
            img_b = image_b.permute(0, 3, 1, 2)
            img_b = torch.nn.functional.interpolate(
                img_b, size=(image_a.shape[1], image_a.shape[2]), mode="bilinear"
            )
            image_b = img_b.permute(0, 2, 3, 1)
        return (torch.cat([image_a, image_b], dim=0),)


class DD_GetImageSize:
    """Returns the width and height of an image."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("INT", "INT")
    RETURN_NAMES = ("width", "height")
    FUNCTION = "execute"
    CATEGORY = "DD Nodes/Image"

    def execute(self, image):
        # image shape: (B, H, W, C)
        return (image.shape[2], image.shape[1])


class DD_ImagePowerSelector:
    """Selectable image batch builder with per-slot toggle switches.

    Use +/- buttons to add or remove image input slots. Each slot has a
    toggle switch — disabled slots are excluded from the output batch.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": FlexibleOptionalInputType("IMAGE", {
                "toggle_states": ("STRING", {"default": "{}"}),
            }),
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "execute"
    CATEGORY = "DD Nodes/Image"

    def execute(self, toggle_states="{}", **kwargs):
        toggles = json.loads(toggle_states)

        images = []
        # Sort by slot number for consistent ordering
        image_keys = sorted(
            (k for k in kwargs if k.startswith("image_")),
            key=lambda k: int(k.split("_")[1]),
        )
        for key in image_keys:
            if toggles.get(key, True) and kwargs[key] is not None:
                images.append(kwargs[key])

        if not images:
            return (torch.zeros(1, 64, 64, 3),)

        # Resize all images to match the first image's dimensions
        target_h, target_w = images[0].shape[1], images[0].shape[2]
        result = []
        for img in images:
            if img.shape[1] != target_h or img.shape[2] != target_w:
                img_t = img.permute(0, 3, 1, 2)
                img_t = torch.nn.functional.interpolate(
                    img_t, size=(target_h, target_w), mode="bilinear"
                )
                img = img_t.permute(0, 2, 3, 1)
            result.append(img)

        return (torch.cat(result, dim=0),)


NODE_CLASS_MAPPINGS = {
    "DD_ImageResize": DD_ImageResize,
    "DD_ImageBatch": DD_ImageBatch,
    "DD_GetImageSize": DD_GetImageSize,
    "DD_ImagePowerSelector": DD_ImagePowerSelector,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DD_ImageResize": "DD Image Resize",
    "DD_ImageBatch": "DD Image Batch",
    "DD_GetImageSize": "DD Get Image Size",
    "DD_ImagePowerSelector": "DD Image Power Selector",
}
