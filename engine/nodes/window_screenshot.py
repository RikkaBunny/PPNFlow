"""
Window Screenshot — capture a specific window by title.
Supports four capture methods:
  - dxcam: DirectX capture via DXGI duplication, needs window visible
  - wgc: Windows Graphics Capture via monitor + crop, no focus needed
  - bitblt: Win32 BitBlt/PrintWindow, works with minimized GDI windows
  - mss: screen region capture via mss library
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
        {"name": "title",   "type": "STRING", "label": "Window Title", "optional": True},
    ]
    outputs = [
        {"name": "image",    "type": "IMAGE",  "label": "Image"},
        {"name": "img_path", "type": "STRING", "label": "File Path"},
        {"name": "width",    "type": "INT",    "label": "Width"},
        {"name": "height",   "type": "INT",    "label": "Height"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title",
         "default": "", "placeholder": "e.g. Notepad, 鸣潮"},
        {"name": "capture_method", "type": "select", "label": "Capture Method",
         "default": "dxcam",
         "options": [
             {"value": "dxcam",  "label": "dxcam (DirectX, needs visible)"},
             {"value": "wgc",   "label": "WGC (background, no focus)"},
             {"value": "bitblt","label": "BitBlt (GDI, works minimized)"},
             {"value": "mss",   "label": "mss (screen region)"},
         ]},
        {"name": "bring_to_front", "type": "bool", "label": "Bring to Front (dxcam only)",
         "default": True},
        {"name": "preview_size", "type": "int", "label": "Preview Width (px)",
         "default": 320, "min": 64, "max": 1920},
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
        elif method == "wgc":
            return self._capture_wgc(hwnd, left, top, cw, ch, preview_w)
        elif method == "bitblt":
            return self._capture_bitblt(hwnd, cw, ch, preview_w)
        else:
            return self._capture_mss(left, top, cw, ch, preview_w)

    # ── WGC capture (window-level, works occluded/minimized) ──

    def _capture_wgc(self, hwnd, left, top, cw, ch, preview_w):
        import ctypes
        import ctypes.wintypes
        import tempfile
        import numpy as np
        import os

        dll_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                                "capture", "wgc_capture.dll")
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

        ret = dll.wgc_capture(
            ctypes.wintypes.HWND(hwnd),
            ctypes.byref(buf), ctypes.byref(w), ctypes.byref(h), ctypes.byref(stride),
        )

        if ret != 0 or not buf.value:
            raise RuntimeError(f"WGC capture failed (code {ret})")

        try:
            PBYTE = ctypes.POINTER(ctypes.c_uint8)
            data = ctypes.cast(buf, PBYTE)
            arr = np.ctypeslib.as_array(data, (h.value, w.value, 4))
            rgb = arr[:, :, [2, 1, 0]].copy()  # BGRA -> RGB
        finally:
            dll.wgc_free(buf)

        from PIL import Image
        img = Image.fromarray(rgb)
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()

        return {
            "image": tmp.name, "img_path": tmp.name,
            "width": w.value, "height": h.value,
            "_preview_image": self._to_preview(img, preview_w),
        }

    # ── dxcam capture (DirectX, needs visible window) ──

    def _capture_dxcam(self, hwnd, left, top, cw, ch, preview_w, bring_front):
        import ctypes
        import tempfile
        import time

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
        except ImportError:
            raise RuntimeError("dxcam required: pip install dxcam")

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

        from PIL import Image
        img = Image.fromarray(frame)
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()

        return {
            "image": tmp.name, "img_path": tmp.name,
            "width": cw, "height": ch,
            "_preview_image": self._to_preview(img, preview_w),
        }

    # ── BitBlt capture (GDI windows, works minimized) ──

    def _capture_bitblt(self, hwnd, cw, ch, preview_w):
        import ctypes
        import tempfile

        if cw <= 0 or ch <= 0:
            raise RuntimeError(f"Window has invalid size ({cw}x{ch})")

        import win32gui, win32ui, win32con

        hwnd_dc = win32gui.GetWindowDC(hwnd)
        mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
        save_dc = mfc_dc.CreateCompatibleDC()

        bmp = win32ui.CreateBitmap()
        bmp.CreateCompatibleBitmap(mfc_dc, cw, ch)
        save_dc.SelectObject(bmp)

        result = ctypes.windll.user32.PrintWindow(hwnd, save_dc.GetSafeHdc(), 3)
        if not result:
            save_dc.BitBlt((0, 0), (cw, ch), mfc_dc, (0, 0), win32con.SRCCOPY)

        from PIL import Image
        bmp_info = bmp.GetInfo()
        bmp_bits = bmp.GetBitmapBits(True)
        img = Image.frombuffer("RGB", (bmp_info["bmWidth"], bmp_info["bmHeight"]),
                               bmp_bits, "raw", "BGRX", 0, 1)

        save_dc.DeleteDC()
        mfc_dc.DeleteDC()
        win32gui.ReleaseDC(hwnd, hwnd_dc)
        win32gui.DeleteObject(bmp.GetHandle())

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()

        return {
            "image": tmp.name, "img_path": tmp.name,
            "width": cw, "height": ch,
            "_preview_image": self._to_preview(img, preview_w),
        }

    # ── mss region capture (visible windows only) ──

    def _capture_mss(self, left, top, cw, ch, preview_w):
        import mss, mss.tools
        import tempfile

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
            "image": tmp.name, "img_path": tmp.name,
            "width": cw, "height": ch,
            "_preview_image": preview,
        }

    # ── Preview helper ──

    def _to_preview(self, img, max_w: int = 320) -> str:
        try:
            ratio = max_w / max(img.width, 1)
            img = img.resize((max_w, int(img.height * ratio)))
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=70)
            return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"
        except Exception:
            return ""
