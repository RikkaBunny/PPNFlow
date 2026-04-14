"""
Window Screenshot - capture a specific window by title.

Capture methods:
- dxcam: DirectX capture, requires a visible foreground-able window
- wgc: Windows Graphics Capture, supports background capture
- bitblt: Win32 PrintWindow/BitBlt fallback
- mss: region capture based on screen coordinates
"""
import base64
import io

from engine.base_node import BaseNode, register_node


@register_node
class WindowScreenshotNode(BaseNode):
    type = "window_screenshot"
    label = "Window Screenshot"
    category = "Input"
    volatile = True
    dependencies = {"mss": "mss", "Pillow": "PIL"}

    inputs = [
        {"name": "title", "type": "STRING", "label": "Window Title", "optional": True},
    ]
    outputs = [
        {"name": "image", "type": "IMAGE", "label": "Image"},
        {"name": "img_path", "type": "STRING", "label": "File Path"},
        {"name": "width", "type": "INT", "label": "Width"},
        {"name": "height", "type": "INT", "label": "Height"},
    ]
    config_schema = [
        {
            "name": "window_title",
            "type": "string",
            "label": "Window Title",
            "default": "",
            "placeholder": "e.g. Notepad, Wuthering Waves",
        },
        {
            "name": "capture_method",
            "type": "select",
            "label": "Capture Method",
            "default": "dxcam",
            "options": [
                {"value": "dxcam", "label": "dxcam (DirectX, needs visible)"},
                {"value": "wgc", "label": "WGC (background, no focus)"},
                {"value": "bitblt", "label": "BitBlt (GDI, works minimized)"},
                {"value": "mss", "label": "mss (screen region)"},
            ],
        },
        {
            "name": "bring_to_front",
            "type": "bool",
            "label": "Bring to Front (dxcam only)",
            "default": True,
        },
        {
            "name": "preview_size",
            "type": "int",
            "label": "Preview Width (px)",
            "default": 320,
            "min": 64,
            "max": 1920,
        },
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        from engine.utils.win_utils import find_hwnd, get_client_rect

        title = inputs.get("title") or config.get("window_title", "")
        preview_w = int(config.get("preview_size", 320))
        method = config.get("capture_method", "dxcam")
        if isinstance(method, str):
            method = method.lower().strip()
        bring_front = config.get("bring_to_front", True)

        if not title:
            raise RuntimeError("Window title is required")

        hwnd = find_hwnd(title)
        if not hwnd:
            raise RuntimeError(f"Window not found: '{title}'")

        left, top, cw, ch = get_client_rect(hwnd)

        if method == "dxcam":
            return self._capture_dxcam(hwnd, left, top, cw, ch, preview_w, bring_front)
        if method == "wgc":
            return self._capture_wgc(hwnd, cw, ch, preview_w)
        if method == "bitblt":
            return self._capture_bitblt(hwnd, cw, ch, preview_w)
        return self._capture_mss(left, top, cw, ch, preview_w)

    def _capture_wgc(self, hwnd, cw, ch, preview_w):
        import ctypes
        import ctypes.wintypes
        import os
        import tempfile
        import time as _time

        import numpy as np
        from PIL import Image

        from engine.utils.win_utils import restore_window

        dll_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "capture", "wgc_capture.dll")
        if not os.path.exists(dll_path):
            raise RuntimeError(f"WGC DLL not found: {dll_path}")

        dll = ctypes.CDLL(dll_path)
        dll.wgc_capture.argtypes = [
            ctypes.wintypes.HWND,
            ctypes.POINTER(ctypes.c_void_p),
            ctypes.POINTER(ctypes.c_int),
            ctypes.POINTER(ctypes.c_int),
            ctypes.POINTER(ctypes.c_int),
        ]
        dll.wgc_capture.restype = ctypes.c_int
        dll.wgc_free.argtypes = [ctypes.c_void_p]
        dll.wgc_free.restype = None

        buf = ctypes.c_void_p()
        w = ctypes.c_int()
        h = ctypes.c_int()
        stride = ctypes.c_int()

        for _ in range(60):  # up to 30 seconds
            ret = dll.wgc_capture(
                ctypes.wintypes.HWND(hwnd),
                ctypes.byref(buf),
                ctypes.byref(w),
                ctypes.byref(h),
                ctypes.byref(stride),
            )
            if ret == -6:
                restore_window(hwnd)
                _time.sleep(0.5)
                continue
            break

        if ret != 0 or not buf.value:
            raise RuntimeError(f"WGC capture failed (code {ret})")

        try:
            pbyte = ctypes.POINTER(ctypes.c_uint8)
            data = ctypes.cast(buf, pbyte)
            arr = np.ctypeslib.as_array(data, (h.value, w.value, 4))
            rgb = arr[:, :, [2, 1, 0]].copy()
        finally:
            dll.wgc_free(buf)

        img = Image.fromarray(rgb)
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()

        return {
            "image": tmp.name,
            "img_path": tmp.name,
            "width": w.value,
            "height": h.value,
            "_preview_image": self._to_preview(img, preview_w),
        }

    def _capture_dxcam(self, hwnd, left, top, cw, ch, preview_w, bring_front):
        import ctypes
        import tempfile
        import time

        from PIL import Image

        if cw <= 0 or ch <= 0:
            raise RuntimeError(f"Window has invalid client size ({cw}x{ch})")

        if bring_front:
            user32 = ctypes.windll.user32
            if user32.IsIconic(hwnd):
                user32.ShowWindow(hwnd, 9)
                time.sleep(0.5)
            user32.SetForegroundWindow(hwnd)
            time.sleep(0.3)

        try:
            import dxcam
        except ImportError as exc:
            raise RuntimeError("dxcam required: pip install dxcam") from exc

        camera = dxcam.create()
        try:
            r_left = max(0, left)
            r_top = max(0, top)
            r_right = min(camera.width, left + cw)
            r_bottom = min(camera.height, top + ch)
            frame = camera.grab(region=(r_left, r_top, r_right, r_bottom))
        finally:
            del camera

        if frame is None:
            raise RuntimeError("dxcam capture returned no frame")

        img = Image.fromarray(frame)
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()

        return {
            "image": tmp.name,
            "img_path": tmp.name,
            "width": cw,
            "height": ch,
            "_preview_image": self._to_preview(img, preview_w),
        }

    def _capture_bitblt(self, hwnd, cw, ch, preview_w):
        import ctypes
        import tempfile

        import win32con
        import win32gui
        import win32ui
        from PIL import Image

        if cw <= 0 or ch <= 0:
            raise RuntimeError(f"Window has invalid size ({cw}x{ch})")

        hwnd_dc = win32gui.GetWindowDC(hwnd)
        mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
        save_dc = mfc_dc.CreateCompatibleDC()

        bmp = win32ui.CreateBitmap()
        bmp.CreateCompatibleBitmap(mfc_dc, cw, ch)
        save_dc.SelectObject(bmp)

        result = ctypes.windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 3)
        if not result:
            save_dc.BitBlt((0, 0), (cw, ch), mfc_dc, (0, 0), win32con.SRCCOPY)

        bmp_info = bmp.GetInfo()
        bmp_bits = bmp.GetBitmapBits(True)
        img = Image.frombuffer(
            "RGB",
            (bmp_info["bmWidth"], bmp_info["bmHeight"]),
            bmp_bits,
            "raw",
            "BGRX",
            0,
            1,
        )

        save_dc.DeleteDC()
        mfc_dc.DeleteDC()
        win32gui.ReleaseDC(hwnd, hwnd_dc)
        win32gui.DeleteObject(bmp.GetHandle())

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()

        return {
            "image": tmp.name,
            "img_path": tmp.name,
            "width": cw,
            "height": ch,
            "_preview_image": self._to_preview(img, preview_w),
        }

    def _capture_mss(self, left, top, cw, ch, preview_w):
        import tempfile

        import mss
        import mss.tools

        with mss.mss() as sct:
            shot = sct.grab({"left": left, "top": top, "width": cw, "height": ch})
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            mss.tools.to_png(shot.rgb, shot.size, output=tmp.name)
            tmp.close()

            try:
                from PIL import Image

                img = Image.frombytes("RGB", shot.size, shot.rgb)
                preview = self._to_preview(img, preview_w)
            except Exception:
                preview = ""

        return {
            "image": tmp.name,
            "img_path": tmp.name,
            "width": cw,
            "height": ch,
            "_preview_image": preview,
        }

    def _to_preview(self, img, max_w: int = 320) -> str:
        try:
            ratio = max_w / max(img.width, 1)
            resized = img.resize((max_w, int(img.height * ratio)))
            buf = io.BytesIO()
            resized.save(buf, format="JPEG", quality=70)
            return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"
        except Exception:
            return ""
