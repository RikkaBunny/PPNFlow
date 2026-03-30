import { useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "@/components/nodes";
import { useFlowStore } from "@/stores/flowStore";
import { useExecutionStore } from "@/stores/executionStore";
import { useManifestStore } from "@/stores/manifestStore";
import type { FlowNodeData, NodeManifest } from "@/types/node";

interface Props {
  selectedNode: Node<FlowNodeData> | null;
  onSelectNode: (node: Node<FlowNodeData> | null) => void;
}

export function FlowEditor({ selectedNode, onSelectNode }: Props) {
  const nodes         = useFlowStore((s) => s.nodes);
  const edges         = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect     = useFlowStore((s) => s.onConnect);
  const setNodes      = useFlowStore((s) => s.setNodes);
  const byType        = useManifestStore((s) => s.byType);
  const nodeStates    = useExecutionStore((s) => s.nodeStates);

  // Sync execution state (status, outputs) back onto node data so GenericNode re-renders
  useEffect(() => {
    if (Object.keys(nodeStates).length === 0) return;
    setNodes(
      nodes.map((n) => {
        const state = nodeStates[n.id];
        if (!state) return n;
        return {
          ...n,
          data: {
            ...n.data,
            status:      state.status,
            errorMsg:    state.errorMsg,
            lastOutputs: state.outputs,
          },
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeStates]);

  // Sync manifest labels onto nodes after manifests load
  useEffect(() => {
    if (Object.keys(byType).length === 0) return;
    setNodes(
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          label: byType[n.data.nodeType]?.label ?? n.data.label,
        },
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byType]);

  const onNodeClick: NodeMouseHandler<Node<FlowNodeData>> = useCallback(
    (_, node) => onSelectNode(node),
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => onSelectNode(null), [onSelectNode]);

  return (
    <div className="w-full h-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        className="bg-slate-950"
        defaultEdgeOptions={{
          style: { stroke: "#64748b", strokeWidth: 2 },
          animated: false,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} color="#1e293b" />
        <Controls className="bg-slate-800 border-slate-600 text-white" />
        <MiniMap
          nodeColor={(n) => {
            const status = (n.data as FlowNodeData).status;
            const colors: Record<string, string> = {
              running: "#3b82f6",
              done:    "#22c55e",
              error:   "#ef4444",
              cached:  "#6b7280",
            };
            return colors[status ?? ""] ?? "#334155";
          }}
          className="bg-slate-900 border-slate-700"
        />
      </ReactFlow>
    </div>
  );
}

// Helper used by App to add nodes from the palette
export function createFlowNode(manifest: NodeManifest, position: { x: number; y: number }): Node<FlowNodeData> {
  return {
    id: crypto.randomUUID(),
    type: "ppnNode",
    position,
    data: {
      nodeType: manifest.type,
      label:    manifest.label,
      config:   Object.fromEntries(
        manifest.config_schema.map((f) => [f.name, f.default ?? ""])
      ),
      status: "idle",
    },
  };
}
