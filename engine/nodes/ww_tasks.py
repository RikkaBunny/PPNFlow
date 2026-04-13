"""
Wuthering Waves composite task nodes.
Each node mirrors one ok-wuthering-waves step with background-safe
capture/input behavior.
"""
import asyncio
import os
import re
import time

from engine.base_node import BaseNode, register_node


TPL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "assets",
    "wuthering-waves",
    "templates",
)


def _tpl(name: str) -> str:
    return os.path.join(TPL_DIR, f"{name}.png")


BOOK_REGION = (15 / 3840, 208 / 2160, 283 / 3840, 1651 / 2160)
BOOK_TAB_FALLBACKS = {
    "gray_book_quest": (150.5 / 3840, 345.5 / 2160),
    "gray_book_weekly": (143.0 / 3840, 881.0 / 2160),
}


class _WW:
    """Low-level game interaction helpers shared by WW nodes."""

    def __init__(self, hwnd: int, title: str):
        self.hwnd = hwnd
        self.title = title

    async def screenshot(self) -> str:
        """Take a WGC screenshot with retry on failure."""
        from engine.nodes.window_screenshot import WindowScreenshotNode

        ss = WindowScreenshotNode()
        for attempt in range(3):
            try:
                result = await ss.execute(
                    {},
                    {
                        "window_title": self.title,
                        "capture_method": "wgc",
                        "bring_to_front": False,
                        "preview_size": 64,
                    },
                )
                return result["image"]
            except Exception:
                if attempt < 2:
                    await asyncio.sleep(1)
        raise RuntimeError("WGC screenshot failed after 3 retries")

    async def save_debug_screenshot(self, name: str) -> str:
        """Save the current WGC screenshot into the repo root for debugging."""
        import shutil

        src = await self.screenshot()
        dst = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), name)
        shutil.copyfile(src, dst)
        return dst

    async def find_one(
        self,
        template_name: str,
        threshold: float = 0.8,
        region: tuple | None = None,
    ) -> dict | None:
        """Match a template against the current screenshot."""
        import cv2

        shot = await self.screenshot()
        source = cv2.imread(shot)
        tpl_path = _tpl(template_name)
        if not os.path.exists(tpl_path):
            return None
        tpl = cv2.imread(tpl_path)
        if source is None or tpl is None:
            return None

        scale = source.shape[1] / 3840.0
        if abs(scale - 1.0) > 0.05:
            new_w = max(1, int(tpl.shape[1] * scale))
            new_h = max(1, int(tpl.shape[0] * scale))
            tpl = cv2.resize(tpl, (new_w, new_h), interpolation=cv2.INTER_AREA)

        offset_x, offset_y = 0, 0
        if region:
            h, w = source.shape[:2]
            rx, ry, rw, rh = region
            x1, y1 = int(w * rx), int(h * ry)
            x2, y2 = int(w * (rx + rw)), int(h * (ry + rh))
            source = source[y1:y2, x1:x2]
            offset_x, offset_y = x1, y1

        if source.shape[0] < tpl.shape[0] or source.shape[1] < tpl.shape[1]:
            return None

        result = cv2.matchTemplate(source, tpl, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(result)
        if max_val < threshold:
            return None

        return {
            "x": int(max_loc[0] + tpl.shape[1] // 2 + offset_x),
            "y": int(max_loc[1] + tpl.shape[0] // 2 + offset_y),
            "confidence": float(max_val),
        }

    async def ocr(
        self,
        region: tuple | None = None,
        match: str | re.Pattern | None = None,
        preprocess: str = "none",
    ) -> list[dict]:
        """Run OCR on the current screenshot, optionally cropped to a region."""
        from PIL import Image
        from engine.nodes.ocr import OcrNode
        import tempfile

        shot = await self.screenshot()
        if region:
            image = Image.open(shot)
            w, h = image.size
            rx, ry, rw, rh = region
            crop = image.crop((int(w * rx), int(h * ry), int(w * (rx + rw)), int(h * (ry + rh))))
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            crop.save(tmp.name)
            tmp.close()
            shot = tmp.name

        ocr = OcrNode()
        result = await ocr.execute({"image": shot}, {"engine": "rapidocr", "preprocess": preprocess})
        blocks = result.get("blocks", [])

        if match:
            pattern = re.compile(match) if isinstance(match, str) else match
            blocks = [block for block in blocks if pattern.search(block.get("text", ""))]

        return blocks

    async def send_key(self, key: str, after_sleep: float = 1.0):
        from engine.nodes.game_key import GameKeyNode

        node = GameKeyNode()
        await node.execute(
            {},
            {
                "window_title": self.title,
                "key": key,
                "mode": "press",
                "down_time": 0.01,
                "after_sleep": after_sleep,
            },
        )

    async def send_key_down(self, key: str):
        from engine.nodes.game_key import GameKeyNode

        node = GameKeyNode()
        await node.execute(
            {},
            {
                "window_title": self.title,
                "key": key,
                "mode": "hold_down",
                "down_time": 0.01,
                "after_sleep": 0.05,
            },
        )

    async def send_key_up(self, key: str):
        from engine.nodes.game_key import GameKeyNode

        node = GameKeyNode()
        await node.execute(
            {},
            {
                "window_title": self.title,
                "key": key,
                "mode": "hold_up",
                "down_time": 0.01,
                "after_sleep": 0.02,
            },
        )

    async def click(self, x: float, y: float, after_sleep: float = 0.5):
        """Click at normalized client coordinates."""
        from engine.nodes.game_click import GameClickNode

        node = GameClickNode()
        await node.execute(
            {},
            {
                "window_title": self.title,
                "rel_x": x,
                "rel_y": y,
                "button": "left",
                "clicks": 1,
                "down_time": 0.2,
                "after_sleep": after_sleep,
            },
        )

    async def click_abs(self, x: int, y: int, after_sleep: float = 0.5):
        """Click at absolute client coordinates."""
        from engine.nodes.game_click import GameClickAbsNode

        node = GameClickAbsNode()
        await node.execute(
            {},
            {
                "window_title": self.title,
                "x": x,
                "y": y,
                "button": "left",
                "down_time": 0.2,
                "after_sleep": after_sleep,
            },
        )

    async def wait_until(self, condition, time_out: float = 10, interval: float = 0.3) -> bool:
        start = time.time()
        while time.time() - start < time_out:
            result = await condition()
            if result:
                return True
            await asyncio.sleep(interval)
        return False

    async def in_team_and_world(self) -> bool:
        """Detect the in-world HUD using the bottom-center HP bar."""
        import cv2
        import numpy as np

        shot = await self.screenshot()
        source = cv2.imread(shot)
        if source is None:
            return False

        h, w = source.shape[:2]
        bar = source[int(h * 0.925):int(h * 0.955), int(w * 0.38):int(w * 0.62)]
        gray = cv2.cvtColor(bar, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = np.count_nonzero(edges) / edges.size
        return edge_ratio > 0.12

    async def back(self, after_sleep: float = 1.0):
        await self.send_key("esc", after_sleep=after_sleep)

    async def handle_login_screen(self) -> bool:
        """
        Handle title/login states before the character enters the world.

        Returns True when a login-related action was performed and the caller
        should retry state detection.
        """
        connect_blocks = await self.ocr(
            region=(0.25, 0.72, 0.5, 0.24),
            match=re.compile(
                "(\u70b9\u51fb\u8fde\u63a5|\u5f00\u59cb\u6e38\u620f|\u8fdb\u5165\u6e38\u620f|\u767b\u5f55)"
            ),
        )
        if connect_blocks:
            await self.click(0.5, 0.93, after_sleep=3)
            return True

        dialog_blocks = await self.ocr(
            region=(0.25, 0.25, 0.5, 0.45),
            match=re.compile("(\u767b\u5f55|\u540c\u610f|\u9690\u79c1)"),
        )
        if dialog_blocks:
            block = dialog_blocks[0]
            await self.click_abs(block["x"] + block["w"] // 2, block["y"] + block["h"] // 2, after_sleep=2)
            return True

        product_blocks = await self.ocr(
            region=(0.58, 0.05, 0.38, 0.12),
            match=re.compile(r"Windows.{0,3}Product", re.IGNORECASE),
        )
        if product_blocks:
            await self.click(0.5, 0.5, after_sleep=3)
            return True

        return False

    async def get_daily_progress(self) -> int:
        """Read the daily stamina progress from the quest page."""
        blocks = await self.ocr(
            region=(0.10, 0.10, 0.40, 0.65),
            match=re.compile(r"^(\d+)/180$"),
            preprocess="contrast",
        )
        if not blocks:
            await self.click(0.961, 0.6, after_sleep=1)
            blocks = await self.ocr(
                region=(0.10, 0.10, 0.40, 0.65),
                match=re.compile(r"^(\d+)/180$"),
                preprocess="contrast",
            )

        for block in blocks:
            match = re.search(r"(\d+)/180", block.get("text", ""))
            if match:
                return int(match.group(1))
        return 0

    async def get_total_daily_points(self) -> int:
        """Read total daily points from the quest page."""
        blocks = await self.ocr(
            region=(0.19, 0.80, 0.11, 0.13),
            match=re.compile(r"\d+"),
            preprocess="contrast",
        )
        for block in blocks:
            match = re.search(r"\d+", block.get("text", ""))
            if match:
                return int(match.group(0))
        return 0

    async def click_daily_reward_box(self, reward_points: int) -> bool:
        """Claim the daily chest using OCR-first logic, with a coordinate fallback."""
        blocks = await self.ocr(
            region=(0.72, 0.78, 0.26, 0.20),
            match=re.compile(rf"^{reward_points}$"),
        )
        if blocks:
            reward = max(blocks, key=lambda block: block["x"])
            click_x = int(reward["x"] - reward["w"] * 0.3)
            click_y = int(reward["y"] - reward["h"] * 1.9)
            await self.click_abs(click_x, click_y, after_sleep=1)
            return True

        await self.click(0.90, 0.85, after_sleep=1)
        return False

    async def get_book_tab_point(self, tab: str) -> dict | None:
        """Get a stable absolute click point for a book sidebar tab."""
        rel = BOOK_TAB_FALLBACKS.get(tab)
        if not rel:
            return None

        shot = await self.screenshot()
        from PIL import Image

        image = Image.open(shot)
        return {
            "x": int(image.size[0] * rel[0]),
            "y": int(image.size[1] * rel[1]),
            "confidence": 0.0,
        }

    async def is_book_open(self) -> bool:
        """Best-effort detection that the F2 book UI is open."""
        for tab in ("gray_book_quest", "gray_book_weekly"):
            if await self.find_one(tab, threshold=0.55, region=BOOK_REGION):
                return True
        return not await self.in_team_and_world()


def _get_ww(config: dict) -> _WW:
    from engine.utils.win_utils import find_hwnd

    title = config.get("window_title", "Wuthering Waves")
    hwnd = find_hwnd(title)
    if not hwnd:
        raise RuntimeError(f"Window not found: '{title}'")
    return _WW(hwnd, title)


@register_node
class WWPreflightNode(BaseNode):
    """Check background capture/control prerequisites before starting the workflow."""

    type = "ww_preflight"
    label = "WW: Preflight"
    category = "Game"
    volatile = True

    inputs = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [
        {"name": "ready", "type": "BOOL", "label": "Ready"},
        {"name": "message", "type": "STRING", "label": "Message"},
        {"name": "window_found", "type": "BOOL", "label": "Window Found"},
        {"name": "was_minimized", "type": "BOOL", "label": "Was Minimized"},
        {"name": "can_capture", "type": "BOOL", "label": "Can Capture"},
        {"name": "can_control", "type": "BOOL", "label": "Can Control"},
        {"name": "background_mode", "type": "BOOL", "label": "Background Mode"},
        {"name": "is_admin", "type": "BOOL", "label": "Is Admin"},
        {"name": "target_elevated", "type": "BOOL", "label": "Target Elevated"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        from engine.nodes.window_screenshot import WindowScreenshotNode
        from engine.utils.win_utils import (
            find_hwnd,
            get_window_process_id,
            is_window_minimized,
            is_process_elevated,
            is_user_admin,
            restore_window,
        )

        title = config.get("window_title", "Wuthering Waves")
        is_admin = is_user_admin()
        hwnd = find_hwnd(title)
        window_found = bool(hwnd)
        can_capture = False
        can_control = False
        target_elevated = False
        was_minimized = False
        capture_error = ""

        if hwnd:
            was_minimized = is_window_minimized(hwnd)
            if was_minimized:
                restore_window(hwnd)
                await asyncio.sleep(1)

            pid = get_window_process_id(hwnd)
            target_elevated = is_process_elevated(pid) if pid else False
            can_control = is_admin or not target_elevated

            try:
                shot = WindowScreenshotNode()
                await shot.execute(
                    {},
                    {
                        "window_title": title,
                        "capture_method": "wgc",
                        "bring_to_front": False,
                        "preview_size": 64,
                    },
                )
                can_capture = True
            except Exception as exc:
                capture_error = str(exc)

        background_mode = window_found and can_capture and can_control

        if not window_found:
            message = (
                f"Background mode not ready: window '{title}' was not found. "
                "Start Wuthering Waves first and keep the configured title aligned with the game process."
            )
        elif not can_capture:
            message = (
                "Background mode blocked: WGC window capture failed. "
                f"Reason: {capture_error or 'unknown error'}. "
                "The game can stay in the background, but it cannot remain minimized."
            )
        elif not can_control:
            message = (
                "Background mode blocked: window capture is available, but PostMessage input needs admin "
                "privileges because the game process is elevated."
            )
        else:
            message = (
                "Background mode ready: this workflow can capture the game in the background via WGC and send "
                "PostMessage input without stealing your real mouse or keyboard."
            )
            if was_minimized:
                message += " The preflight restored a minimized game window so background capture could continue."

        return {
            "ready": background_mode,
            "message": message,
            "window_found": window_found,
            "was_minimized": was_minimized,
            "can_capture": can_capture,
            "can_control": can_control,
            "background_mode": background_mode,
            "is_admin": is_admin,
            "target_elevated": target_elevated,
        }


@register_node
class WWEnsureMainNode(BaseNode):
    """wait until the game is at the main world screen."""

    type = "ww_ensure_main"
    label = "WW: Ensure Main"
    category = "Game"
    volatile = True

    inputs = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
        {"name": "timeout", "type": "int", "label": "Timeout (s)", "default": 30},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        preflight = WWPreflightNode()
        status = await preflight.execute({}, config)
        if not status["ready"]:
            raise RuntimeError(status["message"])

        ww = _get_ww(config)
        timeout = int(config.get("timeout", 180))
        attempt = 0

        async def is_main():
            nonlocal attempt
            attempt += 1
            if await ww.in_team_and_world():
                return True
            if await ww.handle_login_screen():
                return False

            monthly_card = await ww.find_one("monthly_card", threshold=0.8)
            if monthly_card:
                await ww.click_abs(monthly_card["x"], monthly_card["y"], after_sleep=3)
                return False

            if attempt % 2 == 0:
                await ww.click(0.70, 0.91, after_sleep=1)

            await ww.back(after_sleep=2)
            return False

        ok = await ww.wait_until(is_main, time_out=timeout, interval=1)
        if not ok:
            raise RuntimeError("Timeout: game not at main screen")
        await asyncio.sleep(0.5)
        return {"success": True}


@register_node
class WWOpenBookNode(BaseNode):
    """Open the in-game book and locate a target tab."""

    type = "ww_open_book"
    label = "WW: Open Book"
    category = "Game"
    volatile = True

    inputs = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [
        {"name": "success", "type": "BOOL", "label": "Success"},
        {"name": "x", "type": "INT", "label": "X"},
        {"name": "y", "type": "INT", "label": "Y"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
        {
            "name": "tab",
            "type": "string",
            "label": "Book Tab",
            "default": "gray_book_quest",
            "placeholder": "gray_book_quest or gray_book_weekly",
        },
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)
        tab = config.get("tab", "gray_book_quest")

        async def find_book_tab(name: str) -> dict | None:
            return await ww.find_one(name, threshold=0.6, region=BOOK_REGION)

        book_open = False
        found = await find_book_tab(tab)
        if found:
            book_open = True

        if not found:
            for attempt in range(4):
                if attempt == 0:
                    await ww.send_key_down("alt")
                    await asyncio.sleep(0.05)
                    await ww.click(0.77, 0.05, after_sleep=0.02)
                    await ww.send_key_up("alt")
                    await asyncio.sleep(3)
                else:
                    await ww.send_key("f2", after_sleep=2.5)
                    await asyncio.sleep(0.5)

                found = await find_book_tab(tab)
                if found:
                    book_open = True
                    break

                stable_tab = await find_book_tab("gray_book_weekly")
                if stable_tab or await ww.is_book_open():
                    book_open = True
                    break

        if not found and book_open:
            found = await ww.get_book_tab_point(tab)

        if not found:
            await ww.save_debug_screenshot("daily_debug_open_book_fail.png")
            raise RuntimeError(f"Book tab '{tab}' not found after F2")

        await asyncio.sleep(0.8)
        return {"success": True, "x": found["x"], "y": found["y"]}


@register_node
class WWGoToTowerNode(BaseNode):
    """Navigate to the weekly tower via the book."""

    type = "ww_go_to_tower"
    label = "WW: Go to Tower"
    category = "Game"
    volatile = True

    inputs = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        ensure = WWEnsureMainNode()
        await ensure.execute({}, config)

        book = WWOpenBookNode()
        book_result = await book.execute({}, {**config, "tab": "gray_book_weekly"})
        await ww.click_abs(book_result["x"], book_result["y"], after_sleep=1)

        proceed = await ww.find_one("boss_proceed", threshold=0.7, region=(0.9, 0.25, 0.1, 0.2))
        if not proceed:
            await ww.back(after_sleep=1)
            return {"success": False}
        await ww.click_abs(proceed["x"], proceed["y"], after_sleep=1)

        async def click_travel():
            for tpl in ["fast_travel_custom", "gray_teleport", "remove_custom", "confirm_btn_hcenter_vcenter"]:
                found = await ww.find_one(tpl, threshold=0.7)
                if found:
                    await ww.click_abs(found["x"], found["y"], after_sleep=1)
                    return True
            return False

        ok = await ww.wait_until(click_travel, time_out=10)
        if not ok:
            await ww.back(after_sleep=1)
            return {"success": False}

        loaded = await ww.wait_until(ww.in_team_and_world, time_out=120, interval=2)
        await asyncio.sleep(1)
        return {"success": loaded}


@register_node
class WWOpenDailyNode(BaseNode):
    """Open the daily quest page and read stamina/points via OCR."""

    type = "ww_open_daily"
    label = "WW: Open Daily"
    category = "Game"
    volatile = True

    inputs = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [
        {"name": "stamina", "type": "INT", "label": "Stamina Used"},
        {"name": "points", "type": "INT", "label": "Daily Points"},
        {"name": "ready", "type": "BOOL", "label": "Reward Ready"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        async def open_daily_page() -> tuple[int, int]:
            book = WWOpenBookNode()
            book_result = await book.execute({}, {**config, "tab": "gray_book_quest"})
            await ww.click_abs(book_result["x"], book_result["y"], after_sleep=1.5)
            return await ww.get_daily_progress(), await ww.get_total_daily_points()

        stamina, points = await open_daily_page()
        if stamina == 0 and points == 0:
            weekly_point = await ww.get_book_tab_point("gray_book_weekly")
            quest_point = await ww.get_book_tab_point("gray_book_quest")
            if weekly_point and quest_point:
                await ww.click_abs(weekly_point["x"], weekly_point["y"], after_sleep=0.8)
                await ww.click_abs(quest_point["x"], quest_point["y"], after_sleep=1.5)
                stamina = await ww.get_daily_progress()
                points = await ww.get_total_daily_points()

        if stamina == 0 and points == 0:
            stamina, points = await open_daily_page()
        if stamina == 0 and points == 0:
            await ww.save_debug_screenshot("daily_debug_open_daily.png")
        return {"stamina": stamina, "points": points, "ready": points >= 100}


@register_node
class WWClaimDailyNode(BaseNode):
    """Claim the 100-point daily reward chest."""

    type = "ww_claim_daily"
    label = "WW: Claim Daily"
    category = "Game"
    volatile = True

    inputs = [
        {"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True},
        {"name": "points", "type": "INT", "label": "Points", "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        total_points = await ww.get_total_daily_points()
        if total_points < 100:
            await ww.click(0.87, 0.17, after_sleep=0.5)
            await asyncio.sleep(1)
            total_points = await ww.get_total_daily_points()

        if total_points < 100:
            raise RuntimeError("Daily points are still below 100. The daily task is not complete yet.")

        await ww.click_daily_reward_box(100)
        await ww.click(0.70, 0.91, after_sleep=1)
        await ww.back(after_sleep=1)
        await asyncio.sleep(1)

        ensure = WWEnsureMainNode()
        await ensure.execute({}, {**config, "timeout": 15})
        return {"success": True}


@register_node
class WWClaimMailNode(BaseNode):
    """Open mailbox and claim all mail rewards."""

    type = "ww_claim_mail"
    label = "WW: Claim Mail"
    category = "Game"
    volatile = True

    inputs = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        await ww.back(after_sleep=1.5)
        await ww.click(0.64, 0.95, after_sleep=1)
        await ww.click(0.14, 0.9, after_sleep=1)
        await asyncio.sleep(1)

        ensure = WWEnsureMainNode()
        await ensure.execute({}, {**config, "timeout": 15})
        return {"success": True}


@register_node
class WWClaimBattlePassNode(BaseNode):
    """Open battle pass and claim available rewards."""

    type = "ww_claim_battle_pass"
    label = "WW: Claim Battle Pass"
    category = "Game"
    volatile = True

    inputs = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "Wuthering Waves"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        await ww.send_key_down("alt")
        await asyncio.sleep(0.05)
        await ww.click(0.86, 0.05, after_sleep=0.02)
        await ww.send_key_up("alt")
        await asyncio.sleep(1)

        bp_check = await ww.ocr(region=(0.15, 0.1, 0.2, 0.15), match=r"\d+")
        if not bp_check:
            ensure = WWEnsureMainNode()
            await ensure.execute({}, {**config, "timeout": 10})
            return {"success": False}

        async def claim_and_dismiss():
            await ww.click(0.68, 0.91, after_sleep=3)
            await ww.click(0.70, 0.91, after_sleep=1)
            await ww.click(0.04, 0.17, after_sleep=1)
            await ww.back(after_sleep=1)

        await ww.click(0.04, 0.3, after_sleep=1)
        await claim_and_dismiss()
        await claim_and_dismiss()

        for _ in range(3):
            check = await ww.ocr(region=(0.15, 0.1, 0.2, 0.15), match=r"\d+")
            if not check:
                break
            await claim_and_dismiss()

        ensure = WWEnsureMainNode()
        await ensure.execute({}, {**config, "timeout": 10})
        return {"success": True}
