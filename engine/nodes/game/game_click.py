"""
Game Click — click at a position within a game window via PostMessage.
Operates in background: does NOT steal focus or control user's mouse.
Requires admin privileges to interact with elevated game processes.
"""
import time
from engine.base_node import BaseNode, register_node

import win32con


@register_node
class GameClickNode(BaseNode):
    """Click at relative (0.0–1.0) coordinates within a game window."""
    type     = "game_click"
    label    = "Game Click"
    category = "Game"
    volatile = True

    inputs  = [
        {"name": "rel_x",   "type": "FLOAT",  "label": "Relative X",  "optional": True},
        {"name": "rel_y",   "type": "FLOAT",  "label": "Relative Y",  "optional": True},
        {"name": "title",   "type": "STRING", "label": "Window Title", "optional": True},
    ]
    outputs = [
        {"name": "success", "type": "BOOL", "label": "Success"},
        {"name": "abs_x",   "type": "INT",  "label": "Abs X"},
        {"name": "abs_y",   "type": "INT",  "label": "Abs Y"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title",
         "default": "", "placeholder": "e.g. 鸣潮"},
        {"name": "rel_x",    "type": "float",  "label": "X (0.0–1.0)", "default": 0.5, "min": 0, "max": 1},
        {"name": "rel_y",    "type": "float",  "label": "Y (0.0–1.0)", "default": 0.5, "min": 0, "max": 1},
        {"name": "button",   "type": "select", "label": "Button",      "default": "left",
         "options": ["left", "right", "middle"]},
        {"name": "clicks",   "type": "int",    "label": "Clicks",      "default": 1, "min": 1, "max": 3},
        {"name": "down_time","type": "float",  "label": "Down Time (s)", "default": 0.01, "min": 0, "max": 1},
        {"name": "after_sleep", "type": "float", "label": "After Sleep (s)", "default": 0.5, "min": 0, "max": 10},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        import win32gui
        import win32api
        from engine.utils.win_utils import find_hwnd

        title = inputs.get("title") or config.get("window_title", "")
        rel_x = float(inputs.get("rel_x") if inputs.get("rel_x") is not None else config.get("rel_x", 0.5))
        rel_y = float(inputs.get("rel_y") if inputs.get("rel_y") is not None else config.get("rel_y", 0.5))
        button = config.get("button", "left")
        clicks = int(config.get("clicks", 1))
        down_time = float(config.get("down_time", 0.01))
        after_sleep = float(config.get("after_sleep", 0.5))

        if not title:
            raise RuntimeError("Window title is required")

        hwnd = find_hwnd(title)
        if not hwnd:
            raise RuntimeError(f"Window not found: '{title}'")

        rect = win32gui.GetClientRect(hwnd)
        abs_x = int((rect[2] - rect[0]) * rel_x)
        abs_y = int((rect[3] - rect[1]) * rel_y)

        _post_click(hwnd, abs_x, abs_y, button, clicks, down_time)

        if after_sleep > 0:
            time.sleep(after_sleep)

        return {"success": True, "abs_x": abs_x, "abs_y": abs_y}


@register_node
class GameClickAbsNode(BaseNode):
    """Click at absolute pixel coordinates within a game window."""
    type     = "game_click_abs"
    label    = "Game Click (Abs)"
    category = "Game"
    volatile = True

    inputs  = [
        {"name": "x",       "type": "INT",    "label": "X",            "optional": True},
        {"name": "y",       "type": "INT",    "label": "Y",            "optional": True},
        {"name": "title",   "type": "STRING", "label": "Window Title", "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title",
         "default": "", "placeholder": "e.g. 鸣潮"},
        {"name": "x",      "type": "int",   "label": "X", "default": 0},
        {"name": "y",      "type": "int",   "label": "Y", "default": 0},
        {"name": "button", "type": "select", "label": "Button", "default": "left",
         "options": ["left", "right", "middle"]},
        {"name": "down_time",   "type": "float", "label": "Down Time (s)", "default": 0.01},
        {"name": "after_sleep", "type": "float", "label": "After Sleep (s)", "default": 0.5},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        from engine.utils.win_utils import find_hwnd

        title = inputs.get("title") or config.get("window_title", "")
        x = int(inputs.get("x") if inputs.get("x") is not None else config.get("x", 0))
        y = int(inputs.get("y") if inputs.get("y") is not None else config.get("y", 0))
        button = config.get("button", "left")
        down_time = float(config.get("down_time", 0.01))
        after_sleep = float(config.get("after_sleep", 0.5))

        if not title:
            raise RuntimeError("Window title is required")

        hwnd = find_hwnd(title)
        if not hwnd:
            raise RuntimeError(f"Window not found: '{title}'")

        _post_click(hwnd, x, y, button, 1, down_time)

        if after_sleep > 0:
            time.sleep(after_sleep)

        return {"success": True}


def _post_click(hwnd: int, x: int, y: int, button: str, clicks: int, down_time: float):
    """Send click via PostMessage."""
    import win32gui
    import win32api

    long_pos = win32api.MAKELONG(x, y)

    win32gui.PostMessage(hwnd, win32con.WM_ACTIVATE, win32con.WA_ACTIVE, 0)
    win32gui.PostMessage(hwnd, win32con.WM_MOUSEMOVE, 0, long_pos)
    time.sleep(down_time)

    btn_map = {
        "left":   (win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, win32con.WM_LBUTTONUP),
        "right":  (win32con.WM_RBUTTONDOWN, win32con.MK_RBUTTON, win32con.WM_RBUTTONUP),
        "middle": (win32con.WM_MBUTTONDOWN, win32con.MK_MBUTTON, win32con.WM_MBUTTONUP),
    }
    btn_down, btn_mk, btn_up = btn_map.get(button, btn_map["left"])

    for _ in range(clicks):
        win32gui.PostMessage(hwnd, btn_down, btn_mk, long_pos)
        time.sleep(down_time)
        win32gui.PostMessage(hwnd, btn_up, 0, long_pos)
        if clicks > 1:
            time.sleep(0.05)
