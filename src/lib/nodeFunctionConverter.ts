/**
 * Convert a node selection into a function node on the canvas.
 * Performs the "graph surgery": removes selected nodes, inserts function node,
 * reconnects external edges.
 */
import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";
import type { NodeFunctionDef } from "@/types/nodeFunction";
import { toMfType } from "@/types/nodeFunction";
import type { FunctionAnalysis } from "./nodeFunctionAnalyzer";

interface ConversionResult {
  /** New set of nodes (selected removed, function node added) */
  nodes: Node<FlowNodeData>[];
  /** New set of edges (internal/boundary removed, replacement edges added) */
  edges: Edge[];
}

/**
 * Replace selected nodes with a single function node.
 * Returns the new nodes and edges arrays.
 */
export function convertSelectionToFunction(
  analysis: FunctionAnalysis,
  def: NodeFunctionDef,
  allNodes: Node<FlowNodeData>[],
  allEdges: Edge[]
): ConversionResult {
  const { internalNodeIds, incomingEdges, outgoingEdges } = analysis;
  const internalEdgeIds = new Set(analysis.internalEdges.map((e) => e.id));

  // Calculate centroid of selected nodes for function node placement
  let sumX = 0, sumY = 0, count = 0;
  for (const n of allNodes) {
    if (internalNodeIds.has(n.id)) {
      sumX += n.position.x;
      sumY += n.position.y;
      count++;
    }
  }
  const centerX = count > 0 ? Math.round(sumX / count / 20) * 20 : 0;
  const centerY = count > 0 ? Math.round(sumY / count / 20) * 20 : 0;

  // Create the function node
  const functionNodeId = crypto.randomUUID();
  const functionNode: Node<FlowNodeData> = {
    id: functionNodeId,
    type: "ppnNode",
    position: { x: centerX, y: centerY },
    data: {
      nodeType: toMfType(def.id),
      label: def.name,
      config: {},
      status: "idle",
    },
  };

  // Build new nodes: remove selected, add function node
  const newNodes = allNodes
    .filter((n) => !internalNodeIds.has(n.id))
    .concat(functionNode);

  // Build boundary edge sets for quick lookup
  const incomingEdgeIds = new Set(incomingEdges.map((e) => e.id));
  const outgoingEdgeIds = new Set(outgoingEdges.map((e) => e.id));

  // Build new edges: remove internal + boundary, add replacements
  const newEdges = allEdges.filter(
    (e) =>
      !internalEdgeIds.has(e.id) &&
      !incomingEdgeIds.has(e.id) &&
      !outgoingEdgeIds.has(e.id)
  );

  // Create replacement edges for incoming (external → function input)
  for (const e of incomingEdges) {
    const mapping = def.inputs.find(
      (m) =>
        m.internalNodeId === e.target &&
        m.internalPortName === (e.targetHandle ?? "")
    );
    if (mapping) {
      newEdges.push({
        id: `mfe_${crypto.randomUUID().slice(0, 8)}`,
        source: e.source,
        sourceHandle: e.sourceHandle ?? "",
        target: functionNodeId,
        targetHandle: mapping.name,
      });
    }
  }

  // Create replacement edges for outgoing (function output → external)
  for (const e of outgoingEdges) {
    const mapping = def.outputs.find(
      (m) =>
        m.internalNodeId === e.source &&
        m.internalPortName === (e.sourceHandle ?? "")
    );
    if (mapping) {
      newEdges.push({
        id: `mfe_${crypto.randomUUID().slice(0, 8)}`,
        source: functionNodeId,
        sourceHandle: mapping.name,
        target: e.target,
        targetHandle: e.targetHandle ?? "",
      });
    }
  }

  return { nodes: newNodes, edges: newEdges };
}
