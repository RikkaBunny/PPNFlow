"""
Shared Windows utilities for game automation nodes.
Consolidates window finding, client rect, and virtual key helpers.
"""
import ctypes
import ctypes.wintypes
from typing import Optional


def find_hwnd(title: str) -> Optional[int]:
    """Find window handle by partial title match. Includes minimized windows."""
    user32 = ctypes.windll.user32
    results: list[int] = []

    def enum_cb(hwnd, _):
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            if title.lower() in buf.value.lower():
                results.append(hwnd)
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
    return results[0] if results else None


def get_client_rect(hwnd: int) -> tuple[int, int, int, int]:
    """
    Get window client area in screen coordinates.
    Returns (left, top, width, height).
    """
    user32 = ctypes.windll.user32
    pt = ctypes.wintypes.POINT(0, 0)
    user32.ClientToScreen(hwnd, ctypes.byref(pt))
    rect = ctypes.wintypes.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rect))
    return pt.x, pt.y, rect.right, rect.bottom


# ── Virtual key code helpers ──

VK_KEY_DICT: dict[str, int] = {
    'F1': 0x70, 'F2': 0x71, 'F3': 0x72, 'F4': 0x73,
    'F5': 0x74, 'F6': 0x75, 'F7': 0x76, 'F8': 0x77,
    'F9': 0x78, 'F10': 0x79, 'F11': 0x7A, 'F12': 0x7B,
    'ESC': 0x1B, 'ESCAPE': 0x1B,
    'ALT': 0x12, 'LALT': 0xA4,
    'CONTROL': 0x11, 'CTRL': 0x11, 'LCONTROL': 0xA2,
    'SHIFT': 0x10, 'LSHIFT': 0xA0,
    'TAB': 0x09, 'ENTER': 0x0D, 'RETURN': 0x0D,
    'SPACE': 0x20,
    'LEFT': 0x25, 'UP': 0x26, 'RIGHT': 0x27, 'DOWN': 0x28,
    'BACKSPACE': 0x08, 'DELETE': 0x2E,
    'HOME': 0x24, 'END': 0x23,
    'PAGEUP': 0x21, 'PAGEDOWN': 0x22,
}


def get_vk_code(key: str) -> int:
    """Convert key string to virtual key code."""
    import win32api
    key_upper = key.strip().upper()
    if vk := VK_KEY_DICT.get(key_upper):
        return vk
    if len(key) == 1:
        return win32api.VkKeyScan(key) & 0xFF
    raise RuntimeError(f"Unknown key: '{key}'")


def make_lparam(vk_code: int, is_up: bool = False) -> int:
    """Build lParam for WM_KEYDOWN/WM_KEYUP (same as ok-script)."""
    import win32api
    scan_code = win32api.MapVirtualKey(vk_code, 0)
    lparam = (scan_code << 16) | 1
    if is_up:
        lparam |= (1 << 30) | (1 << 31)
    return lparam
