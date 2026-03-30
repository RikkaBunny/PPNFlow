"""
Simple result cache keyed by (node_type, inputs_hash, config_hash).
Volatile nodes are never cached.
"""
from __future__ import annotations
import hashlib
import json
from typing import Any


def _stable_hash(obj: Any) -> str:
    """Deterministic hash of a JSON-serializable object."""
    serialized = json.dumps(obj, sort_keys=True, default=str)
    return hashlib.md5(serialized.encode()).hexdigest()


class ResultCache:
    def __init__(self) -> None:
        self._store: dict[str, dict] = {}

    def _key(self, node_type: str, inputs: dict, config: dict) -> str:
        return f"{node_type}:{_stable_hash(inputs)}:{_stable_hash(config)}"

    def get(self, node_type: str, inputs: dict, config: dict) -> dict | None:
        return self._store.get(self._key(node_type, inputs, config))

    def put(self, node_type: str, inputs: dict, config: dict, result: dict) -> None:
        self._store[self._key(node_type, inputs, config)] = result

    def clear(self) -> None:
        self._store.clear()

    def invalidate_node(self, node_type: str) -> None:
        keys_to_remove = [k for k in self._store if k.startswith(f"{node_type}:")]
        for k in keys_to_remove:
            del self._store[k]
