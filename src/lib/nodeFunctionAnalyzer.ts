/**
 * Analyze a selection of nodes to determine:
 *  - Internal nodes & edges (fully inside the selection)
 *  - Exposed input ports (edges coming from outside)
 *  - Exposed output ports (edges going to outside)
 */
import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData, NodeManifest } from "@/types/node";
import type { NodeFunctionPortMapping } from "@/types/nodeFunction";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface FunctionAnalysis {
  /** IDs of selected nodes */
  internalNodeIds: Set<string>;
  /** Selected nodes serialized for storage in the function def */
  internalNodes: WorkflowNode[];
  /** Edges fully inside the selection */
  internalEdges: WorkflowEdge[];
  /** Auto-detected input ports (external → internal) */
  detectedInputs: NodeFunctionPortMapping[];
  /** Auto-detected output ports (internal → external) */
  detectedOutputs: NodeFunctionPortMapping[];
  /** Edges crossing the boundary inward */
  incomingEdges: Edge[];
  /** Edges crossing the boundary outward */
  outgoingEdges: Edge[];
}

/**
 * Analyze which ports to expose when collapsing selectedNodeIds into a function.
 */
export function analyzeSelection(
  selectedNodeIds: string[],
  allNodes: Node<FlowNodeData>[],
  allEdges: Edge[],
  byType: Record<string, NodeManifest>
): FunctionAnalysis {
  const internalIds = new Set(selectedNodeIds);

  const internalEdges: WorkflowEdge[] = [];
  const incomingEdges: Edge[] = [];
  const outgoingEdges: Edge[] = [];

  // Classify every edge
  for (const e of allEdges) {
    const srcIn = internalIds.has(e.source);
    const tgtIn = internalIds.has(e.target);

    if (srcIn && tgtIn) {
      // Fully internal
      internalEdges.push({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? "",
        target: e.target,
        targetHandle: e.targetHandle ?? "",
      });
    } else if (!srcIn && tgtIn) {
      incomingEdges.push(e);
    } else if (srcIn && !tgtIn) {
      outgoingEdges.push(e);
    }
    // If both outside, ignore
  }

  // Serialize internal nodes
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const internalNodes: WorkflowNode[] = [];
  for (const id of selectedNodeIds) {
    const n = nodeMap.get(id);
    if (!n) continue;
    const d = n.data as Record<string, unknown>;
    internalNodes.push({
      id: n.id,
      type: d.nodeType as string,
      position: { ...n.position },
      config: { ...(d.config as Record<string, unknown>) },
    });
  }

  // Detect input ports (dedup by target node+port)
  const inputPortKey = new Set<string>();
  const detectedInputs: NodeFunctionPortMapping[] = [];

  for (const e of incomingEdges) {
    const key = `${e.target}::${e.targetHandle}`;
    if (inputPortKey.has(key)) continue;
    inputPortKey.add(key);

    const targetNode = nodeMap.get(e.target);
    const targetNodeType = targetNode
      ? (targetNode.data as Record<string, unknown>).nodeType as string
      : "";
    const manifest = byType[targetNodeType];
    const portDef = manifest?.inputs.find((p) => p.name === e.targetHandle);

    const label = portDef?.label ?? e.targetHandle ?? "input";
    const type = portDef?.type ?? "ANY";
    const name = `in_${e.targetHandle ?? "input"}`;

    detectedInputs.push({
      name,
      label,
      type,
      internalNodeId: e.target,
      internalPortName: e.targetHandle ?? "",
    });
  }

  // Detect output ports (dedup by source node+port)
  const outputPortKey = new Set<string>();
  const detectedOutputs: NodeFunctionPortMapping[] = [];

  for (const e of outgoingEdges) {
    const key = `${e.source}::${e.sourceHandle}`;
    if (outputPortKey.has(key)) continue;
    outputPortKey.add(key);

    const sourceNode = nodeMap.get(e.source);
    const sourceNodeType = sourceNode
      ? (sourceNode.data as Record<string, unknown>).nodeType as string
      : "";
    const manifest = byType[sourceNodeType];
    const portDef = manifest?.outputs.find((p) => p.name === e.sourceHandle);

    const label = portDef?.label ?? e.sourceHandle ?? "output";
    const type = portDef?.type ?? "ANY";
    const name = `out_${e.sourceHandle ?? "output"}`;

    detectedOutputs.push({
      name,
      label,
      type,
      internalNodeId: e.source,
      internalPortName: e.sourceHandle ?? "",
    });
  }

  return {
    internalNodeIds: internalIds,
    internalNodes,
    internalEdges,
    detectedInputs,
    detectedOutputs,
    incomingEdges,
    outgoingEdges,
  };
}
