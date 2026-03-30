from engine.base_node import BaseNode, register_node


@register_node
class MouseMoveNode(BaseNode):
    type     = "mouse_move"
    label    = "Mouse Move"
    category = "Automation"
    volatile = True

    inputs  = [
        {"name": "x", "type": "INT", "label": "X", "optional": True},
        {"name": "y", "type": "INT", "label": "Y", "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "x",        "type": "int",   "label": "X (fallback)",    "default": 0},
        {"name": "y",        "type": "int",   "label": "Y (fallback)",    "default": 0},
        {"name": "duration", "type": "float", "label": "Duration (sec)",  "default": 0.1, "min": 0, "max": 5},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import pyautogui
        except ImportError:
            return {"success": False}

        x = int(inputs.get("x") or config.get("x", 0))
        y = int(inputs.get("y") or config.get("y", 0))
        duration = float(config.get("duration", 0.1))

        pyautogui.moveTo(x, y, duration=duration)
        return {"success": True}
