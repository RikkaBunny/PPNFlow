import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  BackgroundVariant,
  ConnectionMode,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "@/components/nodes";
import { useFlowStore } from "@/stores/flowStore";
import { useExecutionStore } from "@/stores/executionStore";
import { useManifestStore } from "@/stores/manifestStore";
import type { FlowNodeData } from "@/types/node";
import { createFlowNode } from "./createFlowNode";

interface Props {
  selectedNode: Node<FlowNodeData> | null;
  onSelectNode: (node: Node<FlowNodeData> | null) => void;
}

export function FlowEditor({ onSelectNode }: Props) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const setNodes = useFlowStore((s) => s.setNodes);
  const addNode = useFlowStore((s) => s.addNode);
  const byType = useManifestStore((s) => s.byType);
  const nodeStates = useExecutionStore((s) => s.nodeStates);

  const rfInstance = useRef<ReactFlowInstance<Node<FlowNodeData>> | null>(null);

  // Sync execution state onto node data
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
            status: state.status,
            errorMsg: state.errorMsg,
            lastOutputs: state.outputs,
          },
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeStates]);

  // Sync manifest labels
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

  // Drag-and-drop from palette
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/ppnflow-node");
      if (!nodeType || !byType[nodeType]) return;

      const manifest = byType[nodeType];
      const bounds = (e.target as HTMLElement).closest(".react-flow")?.getBoundingClientRect();
      if (!bounds || !rfInstance.current) return;

      const position = rfInstance.current.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const node = createFlowNode(manifest, position);
      addNode(node);
    },
    [byType, addNode]
  );

  return (
    <div className="w-full h-full" style={{ background: "#0f0f14" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={(instance) => { rfInstance.current = instance; }}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          style: { stroke: "#4a4a5a", strokeWidth: 2 },
          animated: false,
          type: "smoothstep",
        }}
        connectionLineStyle={{
          stroke: "#6366f1",
          strokeWidth: 2,
          strokeDasharray: "6 3",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1e1e2a"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            const status = (n.data as unknown as FlowNodeData).status;
            const colors: Record<string, string> = {
              running: "#3b82f6",
              done: "#22c55e",
              error: "#ef4444",
              cached: "#6b7280",
            };
            return colors[status ?? ""] ?? "#2a2a3a";
          }}
          maskColor="rgba(15,15,20,0.85)"
          style={{
            background: "#16161e",
            border: "1px solid #2a2a3a",
            borderRadius: "10px",
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
