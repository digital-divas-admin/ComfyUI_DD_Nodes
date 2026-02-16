class DD_TextConcatenate:
    """Concatenates two text strings with an optional separator."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text_a": ("STRING", {"default": "", "multiline": True}),
                "text_b": ("STRING", {"default": "", "multiline": True}),
            },
            "optional": {
                "separator": ("STRING", {"default": ", "}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "concatenate"
    CATEGORY = "DD Nodes/Text"

    def concatenate(self, text_a, text_b, separator=", "):
        if not text_a and not text_b:
            return ("",)
        if not text_a:
            return (text_b,)
        if not text_b:
            return (text_a,)
        return (f"{text_a}{separator}{text_b}",)


class DD_TextReplace:
    """Replaces occurrences of a search string within text."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {"default": "", "multiline": True}),
                "find": ("STRING", {"default": ""}),
                "replace": ("STRING", {"default": ""}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "replace"
    CATEGORY = "DD Nodes/Text"

    def replace(self, text, find, replace):
        return (text.replace(find, replace),)


class DD_ShowText:
    """Displays text output in the UI."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {"forceInput": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "show"
    CATEGORY = "DD Nodes/Text"
    OUTPUT_NODE = True

    def show(self, text):
        return {"ui": {"text": [text]}, "result": (text,)}


NODE_CLASS_MAPPINGS = {
    "DD_TextConcatenate": DD_TextConcatenate,
    "DD_TextReplace": DD_TextReplace,
    "DD_ShowText": DD_ShowText,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DD_TextConcatenate": "DD Text Concatenate",
    "DD_TextReplace": "DD Text Replace",
    "DD_ShowText": "DD Show Text",
}
