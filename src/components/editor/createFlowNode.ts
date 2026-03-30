import type { Node } from "@xyflow/react";
import type { FlowNodeData, NodeManifest } from "@/types/node";

/** Create a new React Flow node from a manifest definition */
export function createFlowNode(
  manifest: NodeManifest,
  position: { x: number; y: number }
): Node<FlowNodeData> {
  return {
    id: crypto.randomUUID(),
    type: "ppnNode",
    position,
    data: {
      nodeType: manifest.type,
      label: manifest.label,
      config: Object.fromEntries(
        manifest.config_schema.map((f) => [f.name, f.default ?? ""])
      ),
      status: "idle",
    },
  };
}
