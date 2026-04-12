"""Quick test: run WW daily task composite nodes sequentially."""
import ctypes, sys, os, asyncio, time

if not ctypes.windll.shell32.IsUserAnAdmin():
    print("[ERROR] Need admin for PostMessage"); sys.exit(1)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.nodes.ww_tasks import (
    WWEnsureMainNode, WWGoToTowerNode, WWOpenDailyNode,
    WWClaimDailyNode, WWClaimMailNode, WWClaimBattlePassNode,
)

CFG = {"window_title": "鸣潮", "timeout": 30}
LOG = []

async def step(name, node_cls, config=None):
    cfg = {**CFG, **(config or {})}
    print(f"\n{'='*50}")
    print(f"  {name}")
    print(f"{'='*50}")
    t0 = time.time()
    try:
        inst = node_cls()
        r = await inst.execute({}, cfg)
        elapsed = time.time() - t0
        print(f"  PASS ({elapsed:.1f}s) → {r}")
        LOG.append(f"PASS {name} ({elapsed:.1f}s)")
        return r
    except Exception as e:
        elapsed = time.time() - t0
        print(f"  FAIL ({elapsed:.1f}s) → {e}")
        LOG.append(f"FAIL {name} ({elapsed:.1f}s): {e}")
        return None

async def main():
    print("=== Wuthering Waves Daily Task ===\n")

    r1 = await step("1. Ensure Main", WWEnsureMainNode)
    if not r1: return

    r2 = await step("2. Go to Tower", WWGoToTowerNode)

    r3 = await step("3. Open Daily", WWOpenDailyNode)
    if r3:
        print(f"  Stamina: {r3.get('stamina')}/180, Points: {r3.get('points')}, Ready: {r3.get('ready')}")

    r4 = await step("4. Claim Daily", WWClaimDailyNode)

    r5 = await step("5. Claim Mail", WWClaimMailNode)

    r6 = await step("6. Claim Battle Pass", WWClaimBattlePassNode)

    print(f"\n{'='*50}")
    print("  SUMMARY")
    print(f"{'='*50}")
    for l in LOG:
        print(f"  {l}")

# Write results to file for non-admin process to read
asyncio.run(main())

with open(os.path.join(os.path.dirname(__file__), "daily_result.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(LOG))

print("\nTest complete.")
