/**
 * Flow editor canvas with:
 * - Right-click context menu to add nodes
 * - Keyboard shortcut (Space) to open node search
 * - Snap-to-grid (20px)
 * - Connection type validation
 * - Drag-drop from palette
 * - Floating "+" button
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  type IsValidConnection,
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
import { ContextMenu, type ContextMenuState } from "./ContextMenu";
import type { NodeManifest } from "@/types/node";

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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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
          label:
            byType[(n.data as Record<string, unknown>).nodeType as string]
              ?.label ?? (n.data as Record<string, unknown>).label,
        },
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byType]);

  const onNodeClick: NodeMouseHandler<Node<FlowNodeData>> = useCallback(
    (_, node) => {
      setContextMenu(null);
      onSelectNode(node);
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(
    (_e: React.MouseEvent) => {
      // Don't close selection if we just opened a context menu
      if (contextMenu) {
        setContextMenu(null);
        return;
      }
      onSelectNode(null);
    },
    [onSelectNode, contextMenu]
  );

  // ── Right-click context menu ──
  const onContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!rfInstance.current) return;
      const bounds = (e.target as HTMLElement)
        .closest(".react-flow")
        ?.getBoundingClientRect();
      if (!bounds) return;
      const flowPos = rfInstance.current.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    []
  );

  const handleContextAdd = useCallback(
    (manifest: NodeManifest, position: { x: number; y: number }) => {
      // Snap to grid
      const snapped = {
        x: Math.round(position.x / 20) * 20,
        y: Math.round(position.y / 20) * 20,
      };
      const node = createFlowNode(manifest, snapped);
      addNode(node);
    },
    [addNode]
  );

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Space to open palette (only when not typing in input)
      if (
        e.code === "Space" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        onOpenPalette();
      }
      // Ctrl+Z / Ctrl+Shift+Z for undo/redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          useFlowStore.getState().undo();
        }
        if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          useFlowStore.getState().redo();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onOpenPalette]);

  // ── Drag-and-drop from palette ──
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
      // Snap to grid
      const snapped = {
        x: Math.round(position.x / 20) * 20,
        y: Math.round(position.y / 20) * 20,
      };
      const node = createFlowNode(manifest, snapped);
      addNode(node);
    },
    [byType, addNode]
  );

  // ── Connection type validation ──
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return false;
      // No self-connections
      if (connection.source === connection.target) return false;

      // Check port type compatibility
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourceType = (sourceNode.data as Record<string, unknown>)
        .nodeType as string;
      const targetType = (targetNode.data as Record<string, unknown>)
        .nodeType as string;
      const sourceManifest = byType[sourceType];
      const targetManifest = byType[targetType];
      if (!sourceManifest || !targetManifest) return true; // allow if no manifest

      const sourcePort = sourceManifest.outputs.find(
        (p) => p.name === connection.sourceHandle
      );
      const targetPort = targetManifest.inputs.find(
        (p) => p.name === connection.targetHandle
      );
      if (!sourcePort || !targetPort) return true;

      // ANY type matches everything
      if (
        sourcePort.type.toUpperCase() === "ANY" ||
        targetPort.type.toUpperCase() === "ANY"
      )
        return true;

      // Same type always OK
      if (sourcePort.type.toUpperCase() === targetPort.type.toUpperCase())
        return true;

      // Allow STRING → most types (will be parsed by the node)
      if (sourcePort.type.toUpperCase() === "STRING") return true;

      return false;
    },
    [nodes, byType]
  );

  return (
    <div
      className="w-full h-full relative"
      style={{ background: "var(--color-canvas)" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_, node) => onSelectNode(node)}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={(instance) => {
          rfInstance.current = instance;
        }}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        isValidConnection={isValidConnection}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
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
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            const data = n.data as unknown as FlowNodeData;
            const status = data.status;
            const colors: Record<string, string> = {
              running: "#3498db",
              done: "#2ecc71",
              error: "#e74c3c",
              cached: "#95a5a6",
            };
            return colors[status ?? ""] ?? "#d4bfc8";
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

      {/* Floating "+" button */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        style={{ zIndex: 5 }}
      >
        <button
          onClick={onOpenPalette}
          className="add-node-btn"
          title="Add a node (or press Space)"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Right-click context menu */}
      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddNode={handleContextAdd}
      />
    </div>
  );
}
