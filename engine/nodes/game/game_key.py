"""
Game Key — send keyboard input to the game window via PostMessage.
Operates in background: does NOT steal focus or control user's keyboard.
Supports press, hold_down, hold_up, hold_duration modes.
Requires admin privileges to interact with elevated game processes.
"""
import time
from engine.base_node import BaseNode, register_node

WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101
WM_ACTIVATE = 0x0006
WA_ACTIVE = 1


@register_node
class GameKeyNode(BaseNode):
    type     = "game_key"
    label    = "Game Key"
    category = "Game"
    volatile = True

    inputs  = [
        {"name": "key",     "type": "STRING", "label": "Key",          "optional": True},
        {"name": "title",   "type": "STRING", "label": "Window Title", "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title",
         "default": "", "placeholder": "e.g. 鸣潮"},
        {"name": "key", "type": "string", "label": "Key",
         "default": "f2", "placeholder": "e.g. f2, esc, space, w, q, r, e"},
        {"name": "mode", "type": "select", "label": "Mode", "default": "press",
         "options": ["press", "hold_down", "hold_up", "hold_duration"]},
        {"name": "hold_seconds", "type": "float", "label": "Hold Duration (s)",
         "default": 0.5, "min": 0, "max": 30},
        {"name": "down_time", "type": "float", "label": "Key Down Time (s)",
         "default": 0.01, "min": 0, "max": 1},
        {"name": "after_sleep", "type": "float", "label": "After Sleep (s)",
         "default": 1.0, "min": 0, "max": 30},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        import win32gui
        from engine.utils.win_utils import find_hwnd, get_vk_code, make_lparam

        title = inputs.get("title") or config.get("window_title", "")
        key = inputs.get("key") or config.get("key", "f2")
        mode = config.get("mode", "press")
        hold_secs = float(config.get("hold_seconds", 0.5))
        down_time = float(config.get("down_time", 0.01))
        after_sleep = float(config.get("after_sleep", 1.0))

        if not title:
            raise RuntimeError("Window title is required")

        hwnd = find_hwnd(title)
        if not hwnd:
            raise RuntimeError(f"Window not found: '{title}'")

        win32gui.PostMessage(hwnd, WM_ACTIVATE, WA_ACTIVE, 0)
        vk_code = get_vk_code(key)

        if mode == "press":
            win32gui.PostMessage(hwnd, WM_KEYDOWN, vk_code, make_lparam(vk_code, False))
            time.sleep(down_time)
            win32gui.PostMessage(hwnd, WM_KEYUP, vk_code, make_lparam(vk_code, True))
        elif mode == "hold_down":
            win32gui.PostMessage(hwnd, WM_KEYDOWN, vk_code, make_lparam(vk_code, False))
        elif mode == "hold_up":
            win32gui.PostMessage(hwnd, WM_KEYUP, vk_code, make_lparam(vk_code, True))
        elif mode == "hold_duration":
            win32gui.PostMessage(hwnd, WM_KEYDOWN, vk_code, make_lparam(vk_code, False))
            time.sleep(hold_secs)
            win32gui.PostMessage(hwnd, WM_KEYUP, vk_code, make_lparam(vk_code, True))

        if after_sleep > 0:
            time.sleep(after_sleep)

        return {"success": True}
