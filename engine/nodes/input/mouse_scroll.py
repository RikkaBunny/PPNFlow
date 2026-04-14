"""Mouse Scroll and Mouse Drag nodes."""
from engine.base_node import BaseNode, register_node


@register_node
class MouseScrollNode(BaseNode):
    type     = "mouse_scroll"
    label    = "Mouse Scroll"
    category = "Automation"
    volatile = True
    dependencies = {"pyautogui": "pyautogui"}

    inputs  = [
        {"name": "x", "type": "INT", "label": "X", "optional": True},
        {"name": "y", "type": "INT", "label": "Y", "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "x",       "type": "int", "label": "X (optional)",  "default": -1},
        {"name": "y",       "type": "int", "label": "Y (optional)",  "default": -1},
        {"name": "clicks",  "type": "int", "label": "Scroll Amount", "default": 3, "min": -100, "max": 100},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import pyautogui
        except ImportError:
            return {"success": False}
        x = inputs.get("x") or config.get("x", -1)
        y = inputs.get("y") or config.get("y", -1)
        clicks = int(config.get("clicks", 3))
        x = int(x) if int(x) >= 0 else None
        y = int(y) if int(y) >= 0 else None
        pyautogui.scroll(clicks, x=x, y=y)
        return {"success": True}


@register_node
class MouseDragNode(BaseNode):
    type     = "mouse_drag"
    label    = "Mouse Drag"
    category = "Automation"
    volatile = True
    dependencies = {"pyautogui": "pyautogui"}

    inputs  = [
        {"name": "start_x", "type": "INT", "label": "Start X", "optional": True},
        {"name": "start_y", "type": "INT", "label": "Start Y", "optional": True},
        {"name": "end_x",   "type": "INT", "label": "End X",   "optional": True},
        {"name": "end_y",   "type": "INT", "label": "End Y",   "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "start_x",  "type": "int",   "label": "Start X",       "default": 0},
        {"name": "start_y",  "type": "int",   "label": "Start Y",       "default": 0},
        {"name": "end_x",    "type": "int",   "label": "End X",         "default": 100},
        {"name": "end_y",    "type": "int",   "label": "End Y",         "default": 100},
        {"name": "duration", "type": "float", "label": "Duration (sec)", "default": 0.3, "min": 0, "max": 5},
        {"name": "button",   "type": "select","label": "Button",         "default": "left", "options": ["left", "right", "middle"]},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import pyautogui
        except ImportError:
            return {"success": False}
        sx = int(inputs.get("start_x") or config.get("start_x", 0))
        sy = int(inputs.get("start_y") or config.get("start_y", 0))
        ex = int(inputs.get("end_x") or config.get("end_x", 100))
        ey = int(inputs.get("end_y") or config.get("end_y", 100))
        dur = float(config.get("duration", 0.3))
        btn = config.get("button", "left")
        pyautogui.moveTo(sx, sy)
        pyautogui.drag(ex - sx, ey - sy, duration=dur, button=btn)
        return {"success": True}
