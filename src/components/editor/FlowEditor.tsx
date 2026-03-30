/**
 * Flow editor canvas — n8n style.
 * Full-screen canvas with floating "+" button and minimap.
 */
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
import { Plus } from "lucide-react";

import { nodeTypes } from "@/components/nodes";
import { useFlowStore } from "@/stores/flowStore";
import { useExecutionStore } from "@/stores/executionStore";
import { useManifestStore } from "@/stores/manifestStore";
import type { FlowNodeData } from "@/types/node";
import { createFlowNode } from "./createFlowNode";

interface Props {
  onSelectNode: (node: Node<FlowNodeData> | null) => void;
  onOpenPalette: () => void;
}

export function FlowEditor({ onSelectNode, onOpenPalette }: Props) {
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
          label: byType[(n.data as Record<string, unknown>).nodeType as string]?.label ?? (n.data as Record<string, unknown>).label,
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
      const bounds = (e.target as HTMLElement)
        .closest(".react-flow")
        ?.getBoundingClientRect();
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

  // Double-click canvas to add node
  const onDoubleClick = useCallback(() => {
    onOpenPalette();
  }, [onOpenPalette]);

  return (
    <div className="w-full h-full relative" style={{ background: "var(--color-canvas)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_, node) => onSelectNode(node)}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={(instance) => {
          rfInstance.current = instance;
        }}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          style: { stroke: "var(--color-connection)", strokeWidth: 2 },
          animated: false,
          type: "smoothstep",
        }}
        connectionLineStyle={{
          stroke: "var(--color-accent)",
          strokeWidth: 2,
          strokeDasharray: "6 4",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="var(--color-canvas-dot)"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            const data = n.data as unknown as FlowNodeData;
            const status = data.status;
            const colors: Record<string, string> = {
              running: "#1fa8f2",
              done: "#4cd964",
              error: "#ff3b5c",
              cached: "#6b7280",
            };
            return colors[status ?? ""] ?? "#363655";
          }}
          maskColor="rgba(248,245,247,0.85)"
          style={{
            background: "var(--color-panel)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Floating "+" button (n8n style) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{ zIndex: 5 }}>
        <button
          onClick={onOpenPalette}
          onDoubleClick={onDoubleClick}
          className="add-node-btn"
          title="Add a node"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
