"""
Shared Windows utilities for game automation nodes.
Consolidates window lookup, elevation checks, client rect helpers,
and virtual key helpers.
"""
import ctypes
import ctypes.wintypes
import os
from typing import Optional


PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
TOKEN_QUERY = 0x0008
TOKEN_ELEVATION_CLASS = 20

WW_TITLE_ALIASES = {
    "\u9e23\u6f6e",
    "wuthering",
    "wuthering waves",
    "client-win64-shipping",
    "client-win64-shipping.exe",
}

WW_PROCESS_MARKERS = {
    "client-win64-shipping",
    "client-win64-shipping.exe",
    "wuthering waves",
}


class TOKEN_ELEVATION(ctypes.Structure):
    _fields_ = [("TokenIsElevated", ctypes.wintypes.DWORD)]


def is_user_admin() -> bool:
    """Return True when the current Python process is elevated."""
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def get_window_process_id(hwnd: int) -> Optional[int]:
    """Return the owning PID for a window handle."""
    user32 = ctypes.windll.user32
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    return int(pid.value) if pid.value else None


def get_process_path(pid: int) -> str:
    """Resolve the full executable path for a PID."""
    kernel32 = ctypes.windll.kernel32
    query_name = kernel32.QueryFullProcessImageNameW
    query_name.argtypes = [
        ctypes.wintypes.HANDLE,
        ctypes.wintypes.DWORD,
        ctypes.wintypes.LPWSTR,
        ctypes.POINTER(ctypes.wintypes.DWORD),
    ]
    query_name.restype = ctypes.wintypes.BOOL

    handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        return ""
    try:
        buf = ctypes.create_unicode_buffer(1024)
        size = ctypes.wintypes.DWORD(len(buf))
        ok = query_name(handle, 0, buf, ctypes.byref(size))
        return buf.value if ok else ""
    finally:
        kernel32.CloseHandle(handle)


def is_process_elevated(pid: int) -> bool:
    """
    Return True when a target process is elevated.

    If the token cannot be queried, fall back to False so callers can still
    produce a best-effort preflight result instead of crashing.
    """
    kernel32 = ctypes.windll.kernel32
    advapi32 = ctypes.windll.advapi32

    open_process_token = advapi32.OpenProcessToken
    open_process_token.argtypes = [
        ctypes.wintypes.HANDLE,
        ctypes.wintypes.DWORD,
        ctypes.POINTER(ctypes.wintypes.HANDLE),
    ]
    open_process_token.restype = ctypes.wintypes.BOOL

    get_token_information = advapi32.GetTokenInformation
    get_token_information.argtypes = [
        ctypes.wintypes.HANDLE,
        ctypes.wintypes.DWORD,
        ctypes.c_void_p,
        ctypes.wintypes.DWORD,
        ctypes.POINTER(ctypes.wintypes.DWORD),
    ]
    get_token_information.restype = ctypes.wintypes.BOOL

    process_handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not process_handle:
        return False

    token_handle = ctypes.wintypes.HANDLE()
    try:
        if not open_process_token(process_handle, TOKEN_QUERY, ctypes.byref(token_handle)):
            return False

        elevation = TOKEN_ELEVATION()
        size = ctypes.wintypes.DWORD(ctypes.sizeof(elevation))
        ok = get_token_information(
            token_handle,
            TOKEN_ELEVATION_CLASS,
            ctypes.byref(elevation),
            ctypes.sizeof(elevation),
            ctypes.byref(size),
        )
        return bool(elevation.TokenIsElevated) if ok else False
    finally:
        if token_handle:
            kernel32.CloseHandle(token_handle)
        kernel32.CloseHandle(process_handle)


def find_hwnd(title: str) -> Optional[int]:
    """
    Find a top-level window by title, process name, or process path.

    This prefers real visible game windows over helper windows like
    ``GDI+ Window (...)`` so automation targets the actual game surface.
    """
    user32 = ctypes.windll.user32
    results: list[tuple[int, int]] = []
    title_norm = (title or "").strip().lower()
    if not title_norm:
        return None

    def enum_cb(hwnd, _):
        if not user32.IsWindow(hwnd):
            return True

        length = user32.GetWindowTextLengthW(hwnd)
        if length <= 0:
            return True

        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        window_title = buf.value
        window_title_norm = window_title.lower()

        pid = get_window_process_id(hwnd)
        process_path = get_process_path(pid) if pid else ""
        process_path_norm = process_path.lower()
        process_name_norm = os.path.basename(process_path_norm)

        class_buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, class_buf, 256)
        class_name = class_buf.value

        rect = ctypes.wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        width = max(0, rect.right - rect.left)
        height = max(0, rect.bottom - rect.top)

        score = -1
        if title_norm in window_title_norm:
            score = 100
        elif title_norm in process_name_norm:
            score = 80
        elif title_norm in process_path_norm:
            score = 60
        elif title_norm in WW_TITLE_ALIASES and any(marker in process_path_norm for marker in WW_PROCESS_MARKERS):
            score = 120

        if score >= 0:
            if user32.IsWindowVisible(hwnd):
                score += 20
            if class_name == "UnrealWindow":
                score += 20
            if window_title.startswith("GDI+ Window"):
                score -= 80
            if width < 400 or height < 300:
                score -= 20
            results.append((score, hwnd))
        return True

    wnd_enum_proc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumWindows(wnd_enum_proc(enum_cb), 0)
    if not results:
        return None
    results.sort(key=lambda item: item[0], reverse=True)
    return results[0][1]


def is_window_minimized(hwnd: int) -> bool:
    """Return True when a window is minimized/iconic."""
    return bool(ctypes.windll.user32.IsIconic(hwnd))


def restore_window(hwnd: int) -> None:
    """
    Restore a minimized window.

    Windows Graphics Capture cannot read minimized windows, so WW preflight
    restores the game before validating background capture.
    """
    user32 = ctypes.windll.user32
    if user32.IsIconic(hwnd):
        user32.ShowWindow(hwnd, 9)  # SW_RESTORE


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


VK_KEY_DICT: dict[str, int] = {
    "F1": 0x70,
    "F2": 0x71,
    "F3": 0x72,
    "F4": 0x73,
    "F5": 0x74,
    "F6": 0x75,
    "F7": 0x76,
    "F8": 0x77,
    "F9": 0x78,
    "F10": 0x79,
    "F11": 0x7A,
    "F12": 0x7B,
    "ESC": 0x1B,
    "ESCAPE": 0x1B,
    "ALT": 0x12,
    "LALT": 0xA4,
    "CONTROL": 0x11,
    "CTRL": 0x11,
    "LCONTROL": 0xA2,
    "SHIFT": 0x10,
    "LSHIFT": 0xA0,
    "TAB": 0x09,
    "ENTER": 0x0D,
    "RETURN": 0x0D,
    "SPACE": 0x20,
    "LEFT": 0x25,
    "UP": 0x26,
    "RIGHT": 0x27,
    "DOWN": 0x28,
    "BACKSPACE": 0x08,
    "DELETE": 0x2E,
    "HOME": 0x24,
    "END": 0x23,
    "PAGEUP": 0x21,
    "PAGEDOWN": 0x22,
}


def get_vk_code(key: str) -> int:
    """Convert a key string to a Windows virtual key code."""
    import win32api

    key_upper = key.strip().upper()
    if vk := VK_KEY_DICT.get(key_upper):
        return vk
    if len(key) == 1:
        return win32api.VkKeyScan(key) & 0xFF
    raise RuntimeError(f"Unknown key: '{key}'")


def make_lparam(vk_code: int, is_up: bool = False) -> int:
    """Build lParam for WM_KEYDOWN/WM_KEYUP."""
    import win32api

    scan_code = win32api.MapVirtualKey(vk_code, 0)
    lparam = (scan_code << 16) | 1
    if is_up:
        lparam |= (1 << 30) | (1 << 31)
    return lparam
