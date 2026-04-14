"""Window Focus / Window List nodes."""
from engine.base_node import BaseNode, register_node


@register_node
class WindowFocusNode(BaseNode):
    type     = "window_focus"
    label    = "Window Focus"
    category = "Automation"
    volatile = True
    dependencies = {"PyGetWindow": "pygetwindow"}

    inputs  = [{"name": "title", "type": "STRING", "label": "Title", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "title", "type": "string", "label": "Window Title", "default": ""},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        title = inputs.get("title") or config.get("title", "")
        if not title:
            raise RuntimeError("Window title is required")
        try:
            import pygetwindow as gw
            wins = gw.getWindowsWithTitle(title)
            if wins:
                wins[0].activate()
                return {"success": True}
        except ImportError:
            # Fallback: ctypes
            try:
                import ctypes
                user32 = ctypes.windll.user32
                hwnd = user32.FindWindowW(None, title)
                if hwnd:
                    user32.SetForegroundWindow(hwnd)
                    return {"success": True}
            except Exception:
                pass
        return {"success": False}


@register_node
class WindowListNode(BaseNode):
    type     = "window_list"
    label    = "Window List"
    category = "Automation"
    volatile = True
    dependencies = {"PyGetWindow": "pygetwindow"}

    inputs  = []
    outputs = [
        {"name": "windows", "type": "JSON",   "label": "Windows"},
        {"name": "titles",  "type": "STRING", "label": "Titles"},
    ]
    config_schema = [
        {"name": "filter", "type": "string", "label": "Filter (optional)", "default": ""},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        filter_text = config.get("filter", "").lower()
        windows = []
        try:
            import pygetwindow as gw
            for w in gw.getAllWindows():
                if w.title and (not filter_text or filter_text in w.title.lower()):
                    windows.append({"title": w.title, "x": w.left, "y": w.top, "w": w.width, "h": w.height})
        except ImportError:
            try:
                import ctypes
                user32 = ctypes.windll.user32
                def enum_cb(hwnd, _):
                    if user32.IsWindowVisible(hwnd):
                        length = user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            buf = ctypes.create_unicode_buffer(length + 1)
                            user32.GetWindowTextW(hwnd, buf, length + 1)
                            t = buf.value
                            if not filter_text or filter_text in t.lower():
                                windows.append({"title": t})
                    return True
                WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
                user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
            except Exception:
                pass

        titles = "\n".join(w["title"] for w in windows)
        return {"windows": windows, "titles": titles}
