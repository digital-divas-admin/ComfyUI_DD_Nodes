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
    FUNCTION = "execute"
    CATEGORY = "DD Nodes/Text"

    def execute(self, text_a, text_b, separator=", "):
        parts = [p for p in (text_a, text_b) if p]
        return (separator.join(parts),)


class DD_TextReplace:
    """Replaces occurrences of a search string within text."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {"default": "", "multiline": True}),
                "find": ("STRING", {"default": ""}),
                "replace_with": ("STRING", {"default": ""}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "execute"
    CATEGORY = "DD Nodes/Text"

    def execute(self, text, find, replace_with):
        return (text.replace(find, replace_with),)


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
    FUNCTION = "execute"
    CATEGORY = "DD Nodes/Text"
    OUTPUT_NODE = True

    def execute(self, text):
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
