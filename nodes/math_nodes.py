class DD_IntMath:
    """Performs basic math operations on two integers."""

    OPERATIONS = ["add", "subtract", "multiply", "divide", "modulo", "power", "min", "max"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "a": ("INT", {"default": 0, "min": -2**31, "max": 2**31 - 1}),
                "b": ("INT", {"default": 0, "min": -2**31, "max": 2**31 - 1}),
                "operation": (cls.OPERATIONS, {"default": "add"}),
            },
        }

    RETURN_TYPES = ("INT", "FLOAT")
    RETURN_NAMES = ("int_result", "float_result")
    FUNCTION = "compute"
    CATEGORY = "DD Nodes/Math"

    def compute(self, a, b, operation):
        ops = {
            "add": lambda: a + b,
            "subtract": lambda: a - b,
            "multiply": lambda: a * b,
            "divide": lambda: a / b if b != 0 else 0,
            "modulo": lambda: a % b if b != 0 else 0,
            "power": lambda: a**b,
            "min": lambda: min(a, b),
            "max": lambda: max(a, b),
        }
        result = ops[operation]()
        return (int(result), float(result))


class DD_FloatMath:
    """Performs basic math operations on two floats."""

    OPERATIONS = ["add", "subtract", "multiply", "divide", "power", "min", "max"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "a": ("FLOAT", {"default": 0.0, "min": -1e10, "max": 1e10, "step": 0.01}),
                "b": ("FLOAT", {"default": 0.0, "min": -1e10, "max": 1e10, "step": 0.01}),
                "operation": (cls.OPERATIONS, {"default": "add"}),
            },
        }

    RETURN_TYPES = ("FLOAT", "INT")
    RETURN_NAMES = ("float_result", "int_result")
    FUNCTION = "compute"
    CATEGORY = "DD Nodes/Math"

    def compute(self, a, b, operation):
        ops = {
            "add": lambda: a + b,
            "subtract": lambda: a - b,
            "multiply": lambda: a * b,
            "divide": lambda: a / b if b != 0 else 0.0,
            "power": lambda: a**b,
            "min": lambda: min(a, b),
            "max": lambda: max(a, b),
        }
        result = ops[operation]()
        return (float(result), int(result))


class DD_IntToFloat:
    """Converts an integer to a float."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("INT", {"default": 0, "min": -2**31, "max": 2**31 - 1}),
            },
        }

    RETURN_TYPES = ("FLOAT",)
    RETURN_NAMES = ("float_value",)
    FUNCTION = "convert"
    CATEGORY = "DD Nodes/Math"

    def convert(self, value):
        return (float(value),)


class DD_FloatToInt:
    """Converts a float to an integer."""

    ROUND_MODES = ["round", "floor", "ceil", "truncate"]

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("FLOAT", {"default": 0.0, "min": -1e10, "max": 1e10, "step": 0.01}),
                "mode": (cls.ROUND_MODES, {"default": "round"}),
            },
        }

    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("int_value",)
    FUNCTION = "convert"
    CATEGORY = "DD Nodes/Math"

    def convert(self, value, mode):
        import math

        modes = {
            "round": lambda: round(value),
            "floor": lambda: math.floor(value),
            "ceil": lambda: math.ceil(value),
            "truncate": lambda: int(value),
        }
        return (modes[mode](),)


NODE_CLASS_MAPPINGS = {
    "DD_IntMath": DD_IntMath,
    "DD_FloatMath": DD_FloatMath,
    "DD_IntToFloat": DD_IntToFloat,
    "DD_FloatToInt": DD_FloatToInt,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DD_IntMath": "DD Integer Math",
    "DD_FloatMath": "DD Float Math",
    "DD_IntToFloat": "DD Int to Float",
    "DD_FloatToInt": "DD Float to Int",
}
