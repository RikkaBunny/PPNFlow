"""
BaseNode - all custom nodes inherit from this class.

To create a node, subclass BaseNode and add @register_node:

    from engine.base_node import BaseNode, register_node

    @register_node
    class MyNode(BaseNode):
        type     = "my_node"
        label    = "My Node"
        category = "Custom"

        # Declare dependencies: {pip_package: import_name}
        dependencies = {"Pillow": "PIL", "mss": "mss"}

        inputs  = [{"name": "text", "type": "STRING", "label": "Text"}]
        outputs = [{"name": "result", "type": "STRING", "label": "Result"}]
        config_schema = []

        async def execute(self, inputs: dict, config: dict) -> dict:
            from PIL import Image  # safe — auto-installed by framework
            return {"result": inputs.get("text", "").upper()}
"""
from __future__ import annotations
import subprocess
import sys
import importlib
import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger("engine.base_node")

# Global registry: type_name -> class
_REGISTRY: dict[str, type["BaseNode"]] = {}

# Track which packages we've already installed this session
_installed: set[str] = set()


def _ensure_package(pip_name: str, import_name: str | None = None) -> None:
    """Import a package; if missing, auto-install via pip then retry."""
    import_name = import_name or pip_name
    if pip_name in _installed:
        return
    try:
        importlib.import_module(import_name)
        _installed.add(pip_name)
        return
    except ImportError:
        pass

    logger.info(f"Auto-installing missing package: {pip_name}")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q", pip_name],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        importlib.invalidate_caches()
        importlib.import_module(import_name)
        _installed.add(pip_name)
        logger.info(f"Successfully installed {pip_name}")
    except Exception as e:
        raise RuntimeError(
            f"Missing package '{pip_name}' and auto-install failed.\n"
            f"Install manually: pip install {pip_name}\n"
            f"Error: {e}"
        )


def register_node(cls: type["BaseNode"]) -> type["BaseNode"]:
    """Decorator that registers a node class in the global registry."""
    key = cls.type
    if not key:
        raise ValueError(f"Node class {cls.__name__} must define a non-empty 'type'")
    _REGISTRY[key] = cls
    return cls


def get_registry() -> dict[str, type["BaseNode"]]:
    return dict(_REGISTRY)


class BaseNode(ABC):
    # ── Override these in subclasses ──────────────────────────────
    type: str = ""           # unique node type id, e.g. "screenshot"
    label: str = ""          # display name in UI
    category: str = "Other"  # palette category
    volatile: bool = False   # if True, never cache output

    # Port definitions
    inputs: list[dict] = []        # [{name, type, label, optional?, default?}]
    outputs: list[dict] = []       # [{name, type, label}]
    config_schema: list[dict] = [] # [{name, type, label, default, min?, max?, options?}]

    # Declare pip dependencies: {"pip_package": "import_name"}
    # e.g. {"Pillow": "PIL", "opencv-python": "cv2"}
    # These are auto-installed when the node executes.
    dependencies: dict[str, str] = {}

    # ── Schema export ─────────────────────────────────────────────
    @classmethod
    def get_schema(cls) -> dict:
        return {
            "type": cls.type,
            "label": cls.label,
            "category": cls.category,
            "volatile": cls.volatile,
            "inputs": cls.inputs,
            "outputs": cls.outputs,
            "config_schema": cls.config_schema,
        }

    # ── Auto-install dependencies before execution ────────────────
    def ensure_dependencies(self) -> None:
        """Auto-install any missing pip packages declared in dependencies."""
        for pip_name, import_name in self.dependencies.items():
            _ensure_package(pip_name, import_name)

    # ── Execution ─────────────────────────────────────────────────
    @abstractmethod
    async def execute(self, inputs: dict, config: dict) -> dict:
        """
        Execute the node.
        inputs: resolved input values keyed by port name
        config: user-configured values from config_schema
        Returns: dict of output values keyed by port name
        """
        ...
