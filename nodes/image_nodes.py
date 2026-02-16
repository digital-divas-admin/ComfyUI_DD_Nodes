import torch


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


NODE_CLASS_MAPPINGS = {
    "DD_ImageResize": DD_ImageResize,
    "DD_ImageBatch": DD_ImageBatch,
    "DD_GetImageSize": DD_GetImageSize,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DD_ImageResize": "DD Image Resize",
    "DD_ImageBatch": "DD Image Batch",
    "DD_GetImageSize": "DD Get Image Size",
}
