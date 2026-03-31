"""
Auto-install missing Python packages at runtime.
Shows a log message and installs via pip on the fly.
"""
import subprocess
import sys
import importlib
import logging

logger = logging.getLogger("auto_install")

_installed_cache: set[str] = set()


def ensure_package(import_name: str, pip_name: str | None = None) -> None:
    """
    Import a package; if missing, auto-install it via pip then retry.

    Args:
        import_name: Python import name (e.g. "cv2")
        pip_name: pip package name if different (e.g. "opencv-python")
    """
    pip_name = pip_name or import_name

    if pip_name in _installed_cache:
        return

    try:
        importlib.import_module(import_name)
        _installed_cache.add(pip_name)
        return
    except ImportError:
        pass

    logger.info(f"Package '{pip_name}' not found, installing...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q", pip_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # Retry import after install
        importlib.invalidate_caches()
        importlib.import_module(import_name)
        _installed_cache.add(pip_name)
        logger.info(f"Successfully installed '{pip_name}'")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"Failed to auto-install '{pip_name}'.\n"
            f"Try manually: pip install {pip_name}"
        ) from e
    except ImportError:
        raise RuntimeError(
            f"Installed '{pip_name}' but still can't import '{import_name}'.\n"
            f"Try restarting the engine."
        )
