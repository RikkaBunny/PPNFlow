"""
Wuthering Waves composite task nodes.
Each node replicates one ok-wuthering-waves method with full retry/state logic.
Ref: C:\\Github\\ok-wuthering-waves\\src\\task\\DailyTask.py
     C:\\Github\\ok-wuthering-waves\\src\\task\\BaseWWTask.py
"""
import asyncio
import os
import re
import time
from engine.base_node import BaseNode, register_node

# ── Shared helpers ──

TPL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                       "assets", "wuthering-waves", "templates")


def _tpl(name: str) -> str:
    return os.path.join(TPL_DIR, f"{name}.png")


class _WW:
    """Low-level game interaction helpers, shared across all WW nodes."""

    def __init__(self, hwnd: int, title: str):
        self.hwnd = hwnd
        self.title = title

    # ── Screenshot (WGC) ──

    async def screenshot(self) -> str:
        """Take WGC screenshot with retry on failure."""
        from engine.nodes.window_screenshot import WindowScreenshotNode
        ss = WindowScreenshotNode()
        for attempt in range(3):
            try:
                r = await ss.execute({}, {
                    "window_title": self.title, "capture_method": "wgc",
                    "bring_to_front": False, "preview_size": 64,
                })
                return r["image"]
            except Exception:
                if attempt < 2:
                    await asyncio.sleep(1)
        raise RuntimeError("WGC screenshot failed after 3 retries")

    # ── Template match ──

    async def find_one(self, template_name: str, threshold: float = 0.8,
                       region: tuple = None) -> dict | None:
        """Match template against screenshot. Returns {x, y, confidence} or None."""
        import cv2
        import numpy as np

        shot = await self.screenshot()
        source = cv2.imread(shot)
        tpl = cv2.imread(_tpl(template_name))
        if source is None or tpl is None:
            return None

        # Scale template from 3840→source width
        scale = source.shape[1] / 3840.0
        if abs(scale - 1.0) > 0.05:
            new_w = max(1, int(tpl.shape[1] * scale))
            new_h = max(1, int(tpl.shape[0] * scale))
            tpl = cv2.resize(tpl, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Optional region crop
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

        if max_val >= threshold:
            return {
                "x": int(max_loc[0] + tpl.shape[1] // 2 + offset_x),
                "y": int(max_loc[1] + tpl.shape[0] // 2 + offset_y),
                "confidence": float(max_val),
            }
        return None

    # ── OCR ──

    async def ocr(self, region: tuple = None, match: str = None) -> list[dict]:
        """Run OCR. region=(x,y,w,h) normalized. Returns [{text, x, y, w, h, conf}]."""
        from engine.nodes.ocr import OcrNode

        shot = await self.screenshot()

        # Crop region if specified
        if region:
            from PIL import Image
            img = Image.open(shot)
            w, h = img.size
            rx, ry, rw, rh = region
            crop = img.crop((int(w*rx), int(h*ry), int(w*(rx+rw)), int(h*(ry+rh))))
            import tempfile
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            crop.save(tmp.name)
            tmp.close()
            shot = tmp.name

        ocr = OcrNode()
        r = await ocr.execute({"image": shot}, {"engine": "rapidocr", "preprocess": "none"})
        blocks = r.get("blocks", [])

        if match:
            pat = re.compile(match) if isinstance(match, str) else match
            blocks = [b for b in blocks if pat.search(b.get("text", ""))]

        return blocks

    # ── Key press (PostMessage) ──

    async def send_key(self, key: str, after_sleep: float = 1.0):
        from engine.nodes.game_key import GameKeyNode
        gk = GameKeyNode()
        await gk.execute({}, {
            "window_title": self.title, "key": key,
            "mode": "press", "down_time": 0.01, "after_sleep": after_sleep,
        })

    async def send_key_down(self, key: str):
        from engine.nodes.game_key import GameKeyNode
        gk = GameKeyNode()
        await gk.execute({}, {
            "window_title": self.title, "key": key,
            "mode": "hold_down", "down_time": 0.01, "after_sleep": 0.05,
        })

    async def send_key_up(self, key: str):
        from engine.nodes.game_key import GameKeyNode
        gk = GameKeyNode()
        await gk.execute({}, {
            "window_title": self.title, "key": key,
            "mode": "hold_up", "down_time": 0.01, "after_sleep": 0.02,
        })

    # ── Click (PostMessage) ──

    async def click(self, x: float, y: float, after_sleep: float = 0.5):
        """Click at relative coords (0-1)."""
        from engine.nodes.game_click import GameClickNode
        gc = GameClickNode()
        await gc.execute({}, {
            "window_title": self.title,
            "rel_x": x, "rel_y": y,
            "button": "left", "clicks": 1,
            "down_time": 0.2, "after_sleep": after_sleep,
        })

    async def click_abs(self, x: int, y: int, after_sleep: float = 0.5):
        """Click at absolute pixel coords."""
        from engine.nodes.game_click import GameClickAbsNode
        gc = GameClickAbsNode()
        await gc.execute({}, {
            "window_title": self.title,
            "x": x, "y": y,
            "button": "left", "down_time": 0.2, "after_sleep": after_sleep,
        })

    # ── Wait until condition (ok-script pattern) ──

    async def wait_until(self, condition, time_out: float = 10, interval: float = 0.3) -> bool:
        """Retry condition() until truthy or timeout. Returns bool."""
        start = time.time()
        while time.time() - start < time_out:
            result = await condition()
            if result:
                return True
            await asyncio.sleep(interval)
        return False

    # ── Composite checks ──

    async def in_team_and_world(self) -> bool:
        """Check if character is in main game world by detecting HP bar.
        The HP bar (bottom center) has a distinctive dotted golden pattern
        that produces high edge density. Fast and team-independent.
        """
        import cv2
        import numpy as np

        shot = await self.screenshot()
        source = cv2.imread(shot)
        if source is None:
            return False

        h, w = source.shape[:2]
        # HP bar region: bottom center, y=0.925-0.955, x=0.38-0.62
        bar = source[int(h * 0.925):int(h * 0.955), int(w * 0.38):int(w * 0.62)]
        gray = cv2.cvtColor(bar, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = np.count_nonzero(edges) / edges.size
        # In main world: edge_ratio ~0.20+, in menus: ~0.05 or less
        return edge_ratio > 0.12

    async def back(self, after_sleep: float = 1.0):
        """Press ESC to close menus."""
        await self.send_key("esc", after_sleep=after_sleep)


# ── Composite Nodes ──

def _get_ww(config: dict) -> _WW:
    from engine.utils.win_utils import find_hwnd
    title = config.get("window_title", "鸣潮")
    hwnd = find_hwnd(title)
    if not hwnd:
        raise RuntimeError(f"Window not found: '{title}'")
    return _WW(hwnd, title)


@register_node
class WWEnsureMainNode(BaseNode):
    """ensure_main(): wait until game is at main world screen."""
    type     = "ww_ensure_main"
    label    = "WW: Ensure Main"
    category = "Game"
    volatile = True

    inputs  = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "鸣潮"},
        {"name": "timeout", "type": "int", "label": "Timeout (s)", "default": 30},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)
        timeout = int(config.get("timeout", 180))

        attempt = 0
        async def is_main():
            nonlocal attempt
            attempt += 1
            if await ww.in_team_and_world():
                return True
            # Handle monthly card popup
            mc = await ww.find_one("monthly_card", threshold=0.8)
            if mc:
                await ww.click_abs(mc["x"], mc["y"], after_sleep=3)
                return False
            # Every other attempt: click confirm area for reward popups
            # (reward dialogs don't respond to ESC)
            if attempt % 2 == 0:
                await ww.click(0.70, 0.91, after_sleep=1)
            # ESC to close menus (matches ok-ww pattern)
            await ww.back(after_sleep=2)
            return False

        ok = await ww.wait_until(is_main, time_out=timeout, interval=1)
        if not ok:
            raise RuntimeError("Timeout: game not at main screen")
        await asyncio.sleep(0.5)
        return {"success": True}


@register_node
class WWOpenBookNode(BaseNode):
    """openF2Book(): open game book and find a specific tab."""
    type     = "ww_open_book"
    label    = "WW: Open Book"
    category = "Game"
    volatile = True

    inputs  = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [
        {"name": "success", "type": "BOOL", "label": "Success"},
        {"name": "x", "type": "INT", "label": "X"},
        {"name": "y", "type": "INT", "label": "Y"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "鸣潮"},
        {"name": "tab", "type": "string", "label": "Book Tab",
         "default": "gray_book_quest", "placeholder": "gray_book_quest or gray_book_weekly"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)
        tab = config.get("tab", "gray_book_quest")

        # Try Alt+click to open book (like ok-ww)
        if await ww.in_team_and_world():
            await ww.send_key_down("alt")
            await asyncio.sleep(0.05)
            await ww.click(0.77, 0.05, after_sleep=0.02)
            await ww.send_key_up("alt")
            await asyncio.sleep(3)

        # Fallback: F2 key
        if await ww.in_team_and_world():
            await ww.send_key("f2", after_sleep=3)

        # Wait for book tab to appear
        found = None
        for _ in range(6):  # ~3 seconds
            found = await ww.find_one(tab, threshold=0.3)
            if found:
                break
            await asyncio.sleep(0.5)

        if not found:
            raise RuntimeError(f"Book tab '{tab}' not found after F2")

        await asyncio.sleep(0.8)
        return {"success": True, "x": found["x"], "y": found["y"]}


@register_node
class WWGoToTowerNode(BaseNode):
    """go_to_tower(): navigate to weekly tower via book."""
    type     = "ww_go_to_tower"
    label    = "WW: Go to Tower"
    category = "Game"
    volatile = True

    inputs  = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "鸣潮"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        # Step 1: ensure main
        ensure = WWEnsureMainNode()
        await ensure.execute({}, config)

        # Step 2: open book → weekly tab
        book = WWOpenBookNode()
        book_result = await book.execute({}, {**config, "tab": "gray_book_weekly"})
        await ww.click_abs(book_result["x"], book_result["y"], after_sleep=1)

        # Step 3: find boss_proceed button
        proceed = await ww.find_one("boss_proceed", threshold=0.7,
                                     region=(0.9, 0.25, 0.1, 0.2))
        if not proceed:
            await ww.back(after_sleep=1)
            return {"success": False}
        await ww.click_abs(proceed["x"], proceed["y"], after_sleep=1)

        # Step 4: click travel button (gray_teleport)
        async def click_travel():
            for tpl in ["gray_teleport", "confirm_btn_hcenter_vcenter"]:
                f = await ww.find_one(tpl, threshold=0.7)
                if f:
                    await ww.click_abs(f["x"], f["y"], after_sleep=1)
                    return True
            return False

        ok = await ww.wait_until(click_travel, time_out=10)
        if not ok:
            await ww.back(after_sleep=1)
            return {"success": False}

        # Step 5: wait for loading (in_team_and_world)
        loaded = await ww.wait_until(ww.in_team_and_world, time_out=120, interval=2)
        await asyncio.sleep(1)
        return {"success": loaded}


@register_node
class WWOpenDailyNode(BaseNode):
    """open_daily(): open daily quest page and read stamina/points via OCR."""
    type     = "ww_open_daily"
    label    = "WW: Open Daily"
    category = "Game"
    volatile = True

    inputs  = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [
        {"name": "stamina", "type": "INT", "label": "Stamina Used"},
        {"name": "points", "type": "INT", "label": "Daily Points"},
        {"name": "ready", "type": "BOOL", "label": "Reward Ready"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "鸣潮"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        # Open book → quest tab
        book = WWOpenBookNode()
        book_result = await book.execute({}, {**config, "tab": "gray_book_quest"})
        await ww.click_abs(book_result["x"], book_result["y"], after_sleep=1.5)

        # OCR stamina progress (X/180)
        blocks = await ww.ocr(region=(0.05, 0.05, 0.45, 0.7), match=r"\d+/180")
        stamina = 0
        if blocks:
            m = re.search(r"(\d+)/180", blocks[0].get("text", ""))
            if m:
                stamina = int(m.group(1))

        # OCR daily points
        points_blocks = await ww.ocr(region=(0.1, 0.75, 0.2, 0.15), match=r"^\d+$")
        points = 0
        if points_blocks:
            try:
                points = int(re.search(r"\d+", points_blocks[0].get("text", "0")).group())
            except (ValueError, AttributeError):
                pass

        return {"stamina": stamina, "points": points, "ready": points >= 100}


@register_node
class WWClaimDailyNode(BaseNode):
    """claim_daily(): claim the 100-point daily reward."""
    type     = "ww_claim_daily"
    label    = "WW: Claim Daily"
    category = "Game"
    volatile = True

    inputs  = [
        {"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True},
        {"name": "points", "type": "INT", "label": "Points", "optional": True},
    ]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "鸣潮"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        # Click reward box area (bottom-right of daily page)
        # ok-ww: click_daily_reward_box(100) → OCR find "100" → click above it
        # Fallback: click(0.90, 0.85)
        reward = await ww.ocr(region=(0.7, 0.75, 0.3, 0.25), match=r"^100$")
        if reward:
            await ww.click(0.90, 0.82, after_sleep=2)
        else:
            await ww.click(0.90, 0.85, after_sleep=2)

        # Dismiss any reward popup (click "确定" area)
        await ww.click(0.70, 0.91, after_sleep=1)
        await asyncio.sleep(1)

        # Ensure back to main
        ensure = WWEnsureMainNode()
        await ensure.execute({}, {**config, "timeout": 15})

        return {"success": True}


@register_node
class WWClaimMailNode(BaseNode):
    """claim_mail(): open mailbox and claim all."""
    type     = "ww_claim_mail"
    label    = "WW: Claim Mail"
    category = "Game"
    volatile = True

    inputs  = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "鸣潮"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        # ok-ww: back() → click mail icon → click claim all → ensure_main
        await ww.back(after_sleep=1.5)
        await ww.click(0.64, 0.95, after_sleep=1)  # Mail icon
        await ww.click(0.14, 0.9, after_sleep=1)    # Claim all
        await asyncio.sleep(1)

        # Let ensure_main spam ESC to close mail UI
        ensure = WWEnsureMainNode()
        await ensure.execute({}, {**config, "timeout": 15})

        return {"success": True}


@register_node
class WWClaimBattlePassNode(BaseNode):
    """claim_battle_pass(): open BP and claim rewards."""
    type     = "ww_claim_battle_pass"
    label    = "WW: Claim Battle Pass"
    category = "Game"
    volatile = True

    inputs  = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title", "default": "鸣潮"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ww = _get_ww(config)

        # ok-ww: Alt+click(0.86, 0.05) to open battle pass
        await ww.send_key_down("alt")
        await asyncio.sleep(0.05)
        await ww.click(0.86, 0.05, after_sleep=0.02)
        await ww.send_key_up("alt")
        await asyncio.sleep(1)

        # Check if battle pass is open (OCR for number)
        bp_check = await ww.ocr(region=(0.15, 0.1, 0.2, 0.15), match=r"\d+")
        if not bp_check:
            # Battle pass might have ended
            ensure = WWEnsureMainNode()
            await ensure.execute({}, {**config, "timeout": 10})
            return {"success": False}

        # Claim rewards — click claim, dismiss reward popup, repeat
        async def claim_and_dismiss():
            await ww.click(0.68, 0.91, after_sleep=3)   # Claim button
            # Dismiss reward popup: click "确定" button area, then click away
            await ww.click(0.70, 0.91, after_sleep=1)
            await ww.click(0.04, 0.17, after_sleep=1)
            # Extra: ESC as fallback for any remaining popup
            await ww.back(after_sleep=1)

        await ww.click(0.04, 0.3, after_sleep=1)    # Select left panel item
        await claim_and_dismiss()                     # First claim
        await claim_and_dismiss()                     # Second claim

        # Try claiming more if BP UI is still visible
        for _ in range(3):
            check = await ww.ocr(region=(0.15, 0.1, 0.2, 0.15), match=r"\d+")
            if not check:
                break
            await claim_and_dismiss()

        ensure = WWEnsureMainNode()
        await ensure.execute({}, {**config, "timeout": 10})

        return {"success": True}
