"""
TDD tests for wgc_capture DLL — Python ctypes interface.

DLL exports:
  int wgc_capture(HWND hwnd, uint8_t** out_buf, int* out_width, int* out_height, int* out_stride)
  void wgc_free(uint8_t* buf)

Returns BGRA pixel data. Caller must free with wgc_free().
"""
import ctypes
import ctypes.wintypes
import os
import sys
import platform
import numpy as np
import pytest

DLL_DIR = os.path.dirname(os.path.abspath(__file__))
DLL_PATH = os.path.join(DLL_DIR, "wgc_capture.dll")


def _load_dll():
    if not os.path.exists(DLL_PATH):
        pytest.skip(f"DLL not found: {DLL_PATH}")
    dll = ctypes.CDLL(DLL_PATH)

    # int wgc_capture(HWND hwnd, uint8_t** out_buf, int* out_w, int* out_h, int* out_stride)
    dll.wgc_capture.argtypes = [
        ctypes.wintypes.HWND,
        ctypes.POINTER(ctypes.c_void_p),
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
    ]
    dll.wgc_capture.restype = ctypes.c_int

    # void wgc_free(uint8_t* buf)
    dll.wgc_free.argtypes = [ctypes.c_void_p]
    dll.wgc_free.restype = None

    return dll


def _find_any_visible_hwnd():
    """Find any visible window with a reasonable size for testing."""
    user32 = ctypes.windll.user32
    results = []

    def enum_cb(hwnd, _):
        if user32.IsWindowVisible(hwnd) and not user32.IsIconic(hwnd):
            rect = ctypes.wintypes.RECT()
            user32.GetClientRect(hwnd, ctypes.byref(rect))
            w, h = rect.right, rect.bottom
            if w >= 200 and h >= 200:
                results.append((hwnd, w, h))
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
    return results[0] if results else None


# ── Unit tests ──

class TestDllLoads:
    def test_dll_file_exists(self):
        assert os.path.exists(DLL_PATH), f"DLL must exist at {DLL_PATH}"

    def test_dll_loads(self):
        dll = _load_dll()
        assert dll is not None

    def test_exports_wgc_capture(self):
        dll = _load_dll()
        assert hasattr(dll, "wgc_capture")

    def test_exports_wgc_free(self):
        dll = _load_dll()
        assert hasattr(dll, "wgc_free")


class TestInvalidInput:
    def test_null_hwnd_returns_error(self):
        dll = _load_dll()
        buf = ctypes.c_void_p()
        w = ctypes.c_int()
        h = ctypes.c_int()
        stride = ctypes.c_int()
        ret = dll.wgc_capture(
            ctypes.wintypes.HWND(0),
            ctypes.byref(buf), ctypes.byref(w), ctypes.byref(h), ctypes.byref(stride),
        )
        assert ret != 0, "Should fail for null HWND"

    def test_invalid_hwnd_returns_error(self):
        dll = _load_dll()
        buf = ctypes.c_void_p()
        w = ctypes.c_int()
        h = ctypes.c_int()
        stride = ctypes.c_int()
        ret = dll.wgc_capture(
            ctypes.wintypes.HWND(0xDEAD),
            ctypes.byref(buf), ctypes.byref(w), ctypes.byref(h), ctypes.byref(stride),
        )
        assert ret != 0, "Should fail for invalid HWND"


class TestCapture:
    def test_capture_visible_window(self):
        """Capture any visible window and verify output."""
        dll = _load_dll()
        target = _find_any_visible_hwnd()
        if not target:
            pytest.skip("No visible window found")

        hwnd, expected_w, expected_h = target

        buf = ctypes.c_void_p()
        w = ctypes.c_int()
        h = ctypes.c_int()
        stride = ctypes.c_int()

        ret = dll.wgc_capture(
            ctypes.wintypes.HWND(hwnd),
            ctypes.byref(buf), ctypes.byref(w), ctypes.byref(h), ctypes.byref(stride),
        )
        assert ret == 0, f"wgc_capture failed with code {ret}"
        assert buf.value is not None, "Buffer should not be null"
        assert w.value > 0, "Width must be positive"
        assert h.value > 0, "Height must be positive"
        assert stride.value >= w.value * 4, "Stride must be >= width*4 (BGRA)"

        # Read pixels into numpy
        total_bytes = stride.value * h.value
        PBYTE = ctypes.POINTER(ctypes.c_uint8)
        data = ctypes.cast(buf, PBYTE)
        arr = np.ctypeslib.as_array(data, (h.value, stride.value // 4, 4))[:, :w.value]

        # Verify not all black
        assert arr.max() > 0, "Captured image should not be all black"
        # Verify BGRA format (4 channels)
        assert arr.shape[2] == 4, "Should be BGRA (4 channels)"

        # Cleanup
        dll.wgc_free(buf)

    def test_capture_returns_correct_dimensions(self):
        """Captured size should match window client area."""
        dll = _load_dll()
        target = _find_any_visible_hwnd()
        if not target:
            pytest.skip("No visible window found")

        hwnd, expected_w, expected_h = target

        buf = ctypes.c_void_p()
        w = ctypes.c_int()
        h = ctypes.c_int()
        stride = ctypes.c_int()

        ret = dll.wgc_capture(
            ctypes.wintypes.HWND(hwnd),
            ctypes.byref(buf), ctypes.byref(w), ctypes.byref(h), ctypes.byref(stride),
        )
        if ret != 0:
            pytest.skip("Capture failed (might need admin)")

        # WGC may include title bar, so height could be larger than client
        assert w.value >= expected_w - 20, f"Width {w.value} too small vs expected {expected_w}"
        assert h.value >= expected_h - 20, f"Height {h.value} too small vs expected {expected_h}"

        dll.wgc_free(buf)

    def test_free_does_not_crash(self):
        """wgc_free(NULL) should be safe."""
        dll = _load_dll()
        dll.wgc_free(ctypes.c_void_p(0))  # Should not crash


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
