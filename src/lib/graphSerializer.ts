import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";
import type { WorkflowFile, WorkflowSettings } from "@/types/workflow";
import type { NodeFunctionDef } from "@/types/nodeFunction";
import { isMfType, getMfDefId } from "@/types/nodeFunction";

/**
 * Serialize React Flow graph → engine-compatible JSON
 * (also used as the .ppnflow save format)
 */
export function serializeGraph(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  settings: WorkflowSettings,
  name = "Untitled",
  nodeFunctions: NodeFunctionDef[] = []
): WorkflowFile {
  const result: WorkflowFile = {
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
  if (nodeFunctions.length > 0) {
    result.nodeFunctions = nodeFunctions;
  }
  return result;
}

/**
 * Deserialize .ppnflow JSON → React Flow nodes/edges
 */
export function deserializeGraph(file: WorkflowFile): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  settings: WorkflowSettings;
  nodeFunctions: NodeFunctionDef[];
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

  return {
    nodes,
    edges,
    settings: file.settings,
    nodeFunctions: file.nodeFunctions ?? [],
  };
}

/**
 * Expand all function nodes (mf:*) into their internal sub-graphs.
 * Called before sending to the engine so it sees only flat standard nodes.
 *
 * Supports recursive expansion (function inside function).
 */
export function expandNodeFunctions(
  file: WorkflowFile,
  defs: Record<string, NodeFunctionDef>
): WorkflowFile {
  const MAX_DEPTH = 10;
  let current = file;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const hasMf = current.nodes.some((n) => isMfType(n.type));
    if (!hasMf) break;

    current = expandOnePass(current, defs);
  }

  // Strip nodeFunctions from the output (engine doesn't need them)
  const { nodeFunctions: _, ...rest } = current;
  return rest;
}

function expandOnePass(
  file: WorkflowFile,
  defs: Record<string, NodeFunctionDef>
): WorkflowFile {
  const outNodes = [...file.nodes.filter((n) => !isMfType(n.type))];
  const outEdges = [...file.edges];
  const mfNodes = file.nodes.filter((n) => isMfType(n.type));

  for (const mfNode of mfNodes) {
    const defId = getMfDefId(mfNode.type);
    const def = defs[defId];
    if (!def) {
      throw new Error(`Unknown Node Function: ${mfNode.type} (def "${defId}" not found)`);
    }

    const prefix = `${mfNode.id}_`;

    // 1. Add internal nodes with prefixed IDs
    for (const iNode of def.internalNodes) {
      outNodes.push({
        ...iNode,
        id: prefix + iNode.id,
        position: {
          x: iNode.position.x + mfNode.position.x,
          y: iNode.position.y + mfNode.position.y,
        },
      });
    }

    // 2. Add internal edges with prefixed source/target
    for (const iEdge of def.internalEdges) {
      outEdges.push({
        ...iEdge,
        id: prefix + iEdge.id,
        source: prefix + iEdge.source,
        target: prefix + iEdge.target,
      });
    }

    // 3. Remap edges pointing TO the function node → internal input nodes
    for (let i = outEdges.length - 1; i >= 0; i--) {
      const e = outEdges[i];
      if (e.target === mfNode.id) {
        const mapping = def.inputs.find((m) => m.name === e.targetHandle);
        if (mapping) {
          outEdges[i] = {
            ...e,
            target: prefix + mapping.internalNodeId,
            targetHandle: mapping.internalPortName,
          };
        } else {
          // Edge points to a port that doesn't exist in the mapping — remove it
          outEdges.splice(i, 1);
        }
      }
    }

    // 4. Remap edges coming FROM the function node → internal output nodes
    for (let i = outEdges.length - 1; i >= 0; i--) {
      const e = outEdges[i];
      if (e.source === mfNode.id) {
        const mapping = def.outputs.find((m) => m.name === e.sourceHandle);
        if (mapping) {
          outEdges[i] = {
            ...e,
            source: prefix + mapping.internalNodeId,
            sourceHandle: mapping.internalPortName,
          };
        } else {
          outEdges.splice(i, 1);
        }
      }
    }
  }

  return {
    ...file,
    nodes: outNodes,
    edges: outEdges,
  };
}
