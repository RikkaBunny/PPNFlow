from engine.base_node import BaseNode, register_node


@register_node
class MouseClickNode(BaseNode):
    type     = "mouse_click"
    label    = "Mouse Click"
    category = "Automation"
    volatile = True
    dependencies = {"pyautogui": "pyautogui"}

    inputs  = [
        {"name": "x", "type": "INT",  "label": "X",      "optional": True},
        {"name": "y", "type": "INT",  "label": "Y",       "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "x",      "type": "int",    "label": "X (fallback)",  "default": 0},
        {"name": "y",      "type": "int",    "label": "Y (fallback)",  "default": 0},
        {"name": "button", "type": "select", "label": "Button",        "default": "left",
         "options": ["left", "right", "middle"]},
        {"name": "clicks", "type": "int",    "label": "Clicks",        "default": 1, "min": 1, "max": 3},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import pyautogui
        except ImportError:
            return {"success": False}

        x = int(float(inputs.get("x") or config.get("x", 0)))
        y = int(float(inputs.get("y") or config.get("y", 0)))
        button = config.get("button", "left")
        clicks = int(config.get("clicks", 1))

        # Safety: skip if coordinates are at screen corners
        if x <= 5 and y <= 5:
            return {"success": False}

        # Temporarily disable failsafe for automation
        old_failsafe = pyautogui.FAILSAFE
        pyautogui.FAILSAFE = False
        try:
            pyautogui.click(x, y, button=button, clicks=clicks)
        finally:
            pyautogui.FAILSAFE = old_failsafe
        return {"success": True}
