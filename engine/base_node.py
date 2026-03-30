"""
BaseNode - all custom nodes inherit from this class.

To create a node, subclass BaseNode and add @register_node:

    from engine.base_node import BaseNode, register_node

    @register_node
    class MyNode(BaseNode):
        type     = "my_node"
        label    = "My Node"
        category = "Custom"

        inputs  = [{"name": "text", "type": "STRING", "label": "Text"}]
        outputs = [{"name": "result", "type": "STRING", "label": "Result"}]
        config_schema = []

        async def execute(self, inputs: dict, config: dict) -> dict:
            return {"result": inputs.get("text", "").upper()}
"""
from __future__ import annotations
import asyncio
from abc import ABC, abstractmethod
from typing import Any

# Global registry: type_name -> class
_REGISTRY: dict[str, type["BaseNode"]] = {}


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
