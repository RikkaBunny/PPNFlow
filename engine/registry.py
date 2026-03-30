"""
Node registry: auto-discovers and imports all node files in engine/nodes/.
After calling load_all_nodes(), the global _REGISTRY in base_node is populated.
"""
from __future__ import annotations
import importlib
import pkgutil
import logging
from pathlib import Path
from engine.base_node import get_registry

logger = logging.getLogger(__name__)


def load_all_nodes() -> None:
    """Import every module in engine/nodes/ to trigger @register_node decorators."""
    nodes_pkg_path = Path(__file__).parent / "nodes"
    for finder, module_name, _ in pkgutil.iter_modules([str(nodes_pkg_path)]):
        full_name = f"engine.nodes.{module_name}"
        try:
            importlib.import_module(full_name)
            logger.debug(f"Loaded node module: {full_name}")
        except Exception as e:
            logger.warning(f"Failed to load node module {full_name}: {e}")


def get_all_schemas() -> list[dict]:
    """Return schema dicts for all registered nodes."""
    load_all_nodes()
    return [cls.get_schema() for cls in get_registry().values()]


def get_node_class(node_type: str):
    """Look up a node class by type string. Returns None if not found."""
    return get_registry().get(node_type)
