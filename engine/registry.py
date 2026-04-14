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
    """Recursively import every module under engine/nodes/ to trigger @register_node decorators."""
    nodes_pkg_path = Path(__file__).parent / "nodes"
    prefix = "engine.nodes."
    for _finder, module_name, is_pkg in pkgutil.walk_packages([str(nodes_pkg_path)], prefix=prefix):
        if is_pkg:
            continue
        try:
            importlib.import_module(module_name)
            logger.debug(f"Loaded node module: {module_name}")
        except Exception as e:
            logger.warning(f"Failed to load node module {module_name}: {e}")


def get_all_schemas() -> list[dict]:
    """Return schema dicts for all registered nodes."""
    load_all_nodes()
    return [cls.get_schema() for cls in get_registry().values()]


_loaded = False

def get_node_class(node_type: str):
    """Look up a node class by type string. Returns None if not found."""
    global _loaded
    if not _loaded:
        load_all_nodes()
        _loaded = True
    return get_registry().get(node_type)
