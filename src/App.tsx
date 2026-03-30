/**
 * PPNFlow App — n8n-inspired layout.
 * Full-screen canvas with overlay panels for node palette and properties.
 */
import { useState, useCallback } from "react";
import type { Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";

import { FlowEditor } from "@/components/editor/FlowEditor";
import { NodePalette } from "@/components/editor/NodePalette";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { Toolbar } from "@/components/editor/Toolbar";
import { ExecutionLog } from "@/components/editor/ExecutionLog";
import { createFlowNode } from "@/components/editor/createFlowNode";

import { useEngine } from "@/hooks/useEngine";
import { useFlowStore } from "@/stores/flowStore";
import type { FlowNodeData, NodeManifest } from "@/types/node";
import { serializeGraph, deserializeGraph } from "@/lib/graphSerializer";
import type { WorkflowFile } from "@/types/workflow";

function AppInner() {
  useEngine();

  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const addNode = useFlowStore((s) => s.addNode);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const settings = useFlowStore((s) => s.settings);
  const name = useFlowStore((s) => s.workflowName);
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const setName = useFlowStore((s) => s.setWorkflowName);

  const handleAddNode = useCallback(
    (manifest: NodeManifest) => {
      const existingCount = nodes.length;
      const node = createFlowNode(manifest, {
        x: 200 + (existingCount % 4) * 280,
        y: 150 + Math.floor(existingCount / 4) * 150 + (Math.random() * 30 - 15),
      });
      addNode(node);
    },
    [addNode]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes(nodes.filter((n) => n.id !== id));
      setEdges(edges.filter((e) => e.source !== id && e.target !== id));
      setSelectedNode(null);
    },
    [nodes, edges, setNodes, setEdges]
  );

  const handleSelectNode = useCallback(
    (node: Node<FlowNodeData> | null) => {
      setSelectedNode(node);
      // Close palette when selecting a node
      if (node) setPaletteOpen(false);
    },
    []
  );

  const handleSave = useCallback(() => {
    const workflow = serializeGraph(nodes, edges, settings, name);
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.ppnflow`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, settings, name]);

  const handleLoad = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ppnflow,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const workflow = JSON.parse(
            ev.target?.result as string
          ) as WorkflowFile;
          const { nodes: n, edges: ed } = deserializeGraph(workflow);
          setNodes(n);
          setEdges(ed);
          setName(workflow.name ?? "Untitled");
          setSelectedNode(null);
        } catch (err) {
          alert(`Failed to load workflow: ${err}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges, setName]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--color-canvas)" }}>
      {/* Toolbar */}
      <Toolbar
        onSave={handleSave}
        onLoad={handleLoad}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Canvas (full area) */}
      <div className="flex-1 relative overflow-hidden">
        <FlowEditor
          onSelectNode={handleSelectNode}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <ExecutionLog />
      </div>

      {/* Overlay: Node Palette */}
      <NodePalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAddNode={handleAddNode}
      />

      {/* Overlay: Properties Panel */}
      <PropertiesPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onDeleteNode={handleDeleteNode}
      />

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const store = useFlowStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="overlay-backdrop" onClick={onClose} />
      <div
        className="relative z-10 rounded-2xl p-6 w-[400px] animate-scale-in"
        style={{
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.1)",
        }}
      >
        <h2 className="text-[16px] font-semibold mb-5" style={{ color: "var(--color-text)" }}>Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}>
              Workflow Name
            </label>
            <input
              className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors border"
              style={{ color: "var(--color-text)", background: "var(--color-canvas)", borderColor: "var(--color-border)" }}
              value={store.workflowName}
              onChange={(e) => store.setWorkflowName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}>
              Loop Delay (ms)
            </label>
            <input
              type="number"
              className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors border tabular-nums"
              style={{ color: "var(--color-text)", background: "var(--color-canvas)", borderColor: "var(--color-border)" }}
              value={store.settings.loop_delay_ms}
              min={0}
              onChange={(e) =>
                store.updateSettings({
                  loop_delay_ms: parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </div>

          <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            API keys are configured per-node in the node settings panel.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-white hover:brightness-105"
          style={{
            background: "linear-gradient(135deg, #e84393, #fd79a8)",
            boxShadow: "0 2px 12px rgba(232,67,147,0.25)",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
