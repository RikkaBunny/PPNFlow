import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";
import type { WorkflowFile, WorkflowSettings } from "@/types/workflow";

/**
 * Serialize React Flow graph → engine-compatible JSON
 * (also used as the .ppnflow save format)
 */
export function serializeGraph(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  settings: WorkflowSettings,
  name = "Untitled"
): WorkflowFile {
  return {
    version: "1.0",
    name,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      position: n.position,
      config: n.data.config ?? {},
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? "",
      target: e.target,
      targetHandle: e.targetHandle ?? "",
    })),
    settings,
  };
}

/**
 * Deserialize .ppnflow JSON → React Flow nodes/edges
 */
export function deserializeGraph(file: WorkflowFile): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  settings: WorkflowSettings;
} {
  const nodes: Node<FlowNodeData>[] = file.nodes.map((n) => ({
    id: n.id,
    type: "ppnNode",   // all nodes use the same React Flow type
    position: n.position,
    data: {
      nodeType: n.type,
      label: n.type,   // will be overwritten by manifest label after load
      config: n.config ?? {},
      status: "idle",
    },
  }));

  const edges: Edge[] = file.edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle,
    target: e.target,
    targetHandle: e.targetHandle,
  }));

  return { nodes, edges, settings: file.settings };
}
