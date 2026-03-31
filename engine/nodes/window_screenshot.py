"""
Window Screenshot — capture a specific window by title.
Uses win32gui + mss to locate window bounds and capture that region.
"""
import base64
import io
from engine.base_node import BaseNode, register_node


@register_node
class WindowScreenshotNode(BaseNode):
    type     = "window_screenshot"
    label    = "Window Screenshot"
    category = "Input"
    volatile = True
    dependencies = {"mss": "mss", "Pillow": "PIL"}

    inputs  = [
        {"name": "title", "type": "STRING", "label": "Window Title", "optional": True},
    ]
    outputs = [
        {"name": "image",    "type": "IMAGE",  "label": "Image"},
        {"name": "img_path", "type": "STRING", "label": "File Path"},
        {"name": "width",    "type": "INT",    "label": "Width"},
        {"name": "height",   "type": "INT",    "label": "Height"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title",
         "default": "", "placeholder": "e.g. Notepad, Chrome"},
        {"name": "preview_size", "type": "int", "label": "Preview Width (px)",
         "default": 320, "min": 64, "max": 1920},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        title = inputs.get("title") or config.get("window_title", "")
        preview_w = int(config.get("preview_size", 320))

        if not title:
            raise RuntimeError("Window title is required")

        rect = self._find_window(title)
        if not rect:
            raise RuntimeError(f"Window not found: '{title}'")

        return self._capture_region(rect, preview_w)

    def _find_window(self, title: str) -> dict | None:
        try:
            import ctypes
            user32 = ctypes.windll.user32

            # Try exact match first, then partial
            import ctypes.wintypes
            results = []

            def enum_cb(hwnd, _):
                if user32.IsWindowVisible(hwnd):
                    length = user32.GetWindowTextLengthW(hwnd)
                    if length > 0:
                        buf = ctypes.create_unicode_buffer(length + 1)
                        user32.GetWindowTextW(hwnd, buf, length + 1)
                        wt = buf.value
                        if title.lower() in wt.lower():
                            rect = ctypes.wintypes.RECT()
                            user32.GetWindowRect(hwnd, ctypes.byref(rect))
                            results.append({
                                "left": rect.left,
                                "top": rect.top,
                                "width": rect.right - rect.left,
                                "height": rect.bottom - rect.top,
                                "title": wt,
                            })
                return True

            WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
            user32.EnumWindows(WNDENUMPROC(enum_cb), 0)

            return results[0] if results else None
        except Exception:
            # Fallback: try pygetwindow
            try:
                import pygetwindow as gw
                wins = gw.getWindowsWithTitle(title)
                if wins:
                    w = wins[0]
                    return {"left": w.left, "top": w.top, "width": w.width, "height": w.height}
            except ImportError:
                pass
            return None

    def _capture_region(self, rect: dict, preview_w: int) -> dict:
        import mss
        import mss.tools
        import tempfile

        monitor = {
            "left": rect["left"],
            "top": rect["top"],
            "width": rect["width"],
            "height": rect["height"],
        }

        with mss.mss() as sct:
            shot = sct.grab(monitor)
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            mss.tools.to_png(shot.rgb, shot.size, output=tmp.name)
            tmp.close()

            preview = self._make_preview(shot, preview_w)

        return {
            "image": tmp.name,
            "img_path": tmp.name,
            "width": rect["width"],
            "height": rect["height"],
            "_preview_image": preview,
        }

    def _make_preview(self, shot, max_w: int) -> str:
        try:
            from PIL import Image
            img = Image.frombytes("RGB", shot.size, shot.rgb)
            ratio = max_w / img.width
            img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=70)
            return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"
        except Exception:
            return ""
