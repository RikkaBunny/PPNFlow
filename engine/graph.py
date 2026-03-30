"""
Graph data structures.
Mirrors the .ppnflow JSON format exactly so deserialization is trivial.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any


@dataclass
class NodeDef:
    id: str
    type: str
    config: dict = field(default_factory=dict)
    position: dict = field(default_factory=dict)  # {x, y} - for UI only


@dataclass
class EdgeDef:
    id: str
    source: str         # source node id
    source_handle: str  # source port name
    target: str         # target node id
    target_handle: str  # target port name


@dataclass
class GraphDef:
    nodes: list[NodeDef] = field(default_factory=list)
    edges: list[EdgeDef] = field(default_factory=list)
    settings: dict = field(default_factory=dict)


def parse_graph(data: dict) -> GraphDef:
    """Parse .ppnflow JSON dict into GraphDef."""
    nodes = [
        NodeDef(
            id=n["id"],
            type=n["type"],
            config=n.get("config", {}),
            position=n.get("position", {}),
        )
        for n in data.get("nodes", [])
    ]
    edges = [
        EdgeDef(
            id=e["id"],
            source=e["source"],
            source_handle=e["sourceHandle"],
            target=e["target"],
            target_handle=e["targetHandle"],
        )
        for e in data.get("edges", [])
    ]
    return GraphDef(nodes=nodes, edges=edges, settings=data.get("settings", {}))
