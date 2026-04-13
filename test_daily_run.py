"""Quick test: run WW daily task composite nodes sequentially."""
import asyncio
import ctypes
import os
import sys
import time

if not ctypes.windll.shell32.IsUserAnAdmin():
    print("[ERROR] Need admin for PostMessage")
    sys.exit(1)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.nodes.ww_tasks import (  # noqa: E402
    WWClaimBattlePassNode,
    WWClaimDailyNode,
    WWClaimMailNode,
    WWEnsureMainNode,
    WWGoToTowerNode,
    WWOpenDailyNode,
    WWPreflightNode,
)

CFG = {"window_title": "Wuthering Waves", "timeout": 30}
LOG: list[str] = []


async def step(name, node_cls, config=None):
    cfg = {**CFG, **(config or {})}
    print(f"\n{'=' * 50}")
    print(f"  {name}")
    print(f"{'=' * 50}")
    t0 = time.time()
    try:
        inst = node_cls()
        result = await inst.execute({}, cfg)
        elapsed = time.time() - t0
        print(f"  PASS ({elapsed:.1f}s) -> {result}")
        LOG.append(f"PASS {name} ({elapsed:.1f}s)")
        return result
    except Exception as exc:
        elapsed = time.time() - t0
        print(f"  FAIL ({elapsed:.1f}s) -> {exc}")
        LOG.append(f"FAIL {name} ({elapsed:.1f}s): {exc}")
        return None


async def main():
    print("=== Wuthering Waves Daily Task ===\n")

    r0 = await step("0. Preflight", WWPreflightNode)
    if not r0:
        return
    print(f"  {r0.get('message')}")
    if not r0.get("ready"):
        LOG.append("FAIL preflight: background mode is not ready")
        return

    r1 = await step("1. Ensure Main", WWEnsureMainNode)
    if not r1:
        return

    await step("2. Go to Tower", WWGoToTowerNode)

    r3 = await step("3. Open Daily", WWOpenDailyNode)
    if r3:
        print(f"  Stamina: {r3.get('stamina')}/180, Points: {r3.get('points')}, Ready: {r3.get('ready')}")

    await step("4. Claim Daily", WWClaimDailyNode)
    await step("5. Claim Mail", WWClaimMailNode)
    await step("6. Claim Battle Pass", WWClaimBattlePassNode)

    print(f"\n{'=' * 50}")
    print("  SUMMARY")
    print(f"{'=' * 50}")
    for line in LOG:
        print(f"  {line}")


asyncio.run(main())

with open(os.path.join(os.path.dirname(__file__), "daily_result.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))

print("\nTest complete.")
