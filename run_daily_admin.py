"""Self-elevating admin launcher for daily test."""
import ctypes
import sys
import os
import subprocess
import traceback

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(SCRIPT_DIR, "test_daily_run.py")
LOG_FILE = os.path.join(SCRIPT_DIR, "daily_admin_log.txt")

if ctypes.windll.shell32.IsUserAnAdmin():
    os.chdir(SCRIPT_DIR)
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    try:
        proc = subprocess.run(
            [sys.executable, "-B", "-X", "utf8", "-u", TARGET],
            cwd=SCRIPT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=600,
            env=env,
        )
        output = proc.stdout.decode("utf-8", errors="replace")
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write(f"CWD: {os.getcwd()}\n")
            f.write(f"Python: {sys.executable}\n")
            f.write(f"Admin: True\n")
            f.write(f"Output length: {len(proc.stdout)} bytes\n\n")
            f.write(output)
            f.write(f"\n=== EXIT CODE: {proc.returncode} ===\n")
    except Exception as e:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write(f"LAUNCHER ERROR:\n{traceback.format_exc()}\n")
else:
    ctypes.windll.shell32.ShellExecuteW(
        None, "runas", sys.executable,
        f'"{os.path.abspath(__file__)}"',
        SCRIPT_DIR, 1,
    )
