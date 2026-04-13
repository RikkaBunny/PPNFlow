/**
 * PPNFlow App — n8n-inspired layout.
 * Full-screen canvas with overlay panels for node palette and properties.
 */
import { useState, useCallback, useEffect } from "react";
import type { Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { on } from "@/lib/events";

import { FlowEditor } from "@/components/editor/FlowEditor";
import { NodePalette } from "@/components/editor/NodePalette";
import { NodeDetailPanel, type DetailPanelState } from "@/components/editor/NodeDetailPanel";
import { Toolbar } from "@/components/editor/Toolbar";
import { ExecutionLog } from "@/components/editor/ExecutionLog";
import { createFlowNode } from "@/components/editor/createFlowNode";
import { TemplatePicker } from "@/components/editor/TemplatePicker";

import { useEngine } from "@/hooks/useEngine";
import { useFlowStore } from "@/stores/flowStore";
import { useManifestStore } from "@/stores/manifestStore";
import { useExecutionStore } from "@/stores/executionStore";
import type { FlowNodeData, NodeManifest } from "@/types/node";
import { useExecution } from "@/hooks/useExecution";
import { serializeGraph, deserializeGraph } from "@/lib/graphSerializer";
import { useNodeFunctionStore } from "@/stores/nodeFunctionStore";
import type { WorkflowFile } from "@/types/workflow";
import type { TemplateInfo } from "@/lib/templates";

function AppInner() {
  useEngine();

  const [detailPanel, setDetailPanel] = useState<DetailPanelState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const { runToNode } = useExecution();
  const notice = useExecutionStore((s) => s.notice);
  const clearNotice = useExecutionStore((s) => s.clearNotice);

  // Listen for events from GenericNode (port clicks, error/output details)
  useEffect(() => {
    const unsub1 = on("port-click", (nodeId, portName) => {
      setDetailPanel({ nodeId: nodeId as string, tab: "data", focusPort: portName as string });
    });
    const unsub2 = on("open-data", (nodeId) => {
      setDetailPanel({ nodeId: nodeId as string, tab: "data" });
    });
    const unsub3 = on("open-error", (nodeId) => {
      setDetailPanel({ nodeId: nodeId as string, tab: "error" });
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const addNode = useFlowStore((s) => s.addNode);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const settings = useFlowStore((s) => s.settings);
  const name = useFlowStore((s) => s.workflowName);
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const setName = useFlowStore((s) => s.setWorkflowName);

  const handleAddNode = useCallback(
    (manifest: NodeManifest, position?: { x: number; y: number }) => {
      const existingCount = nodes.length;
      const pos = position ?? {
        x: 200 + (existingCount % 4) * 280,
        y: 150 + Math.floor(existingCount / 4) * 150 + (Math.random() * 30 - 15),
      };
      // Snap to grid
      pos.x = Math.round(pos.x / 20) * 20;
      pos.y = Math.round(pos.y / 20) * 20;
      const node = createFlowNode(manifest, pos);
      addNode(node);
    },
    [addNode, nodes.length]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes(nodes.filter((n) => n.id !== id));
      setEdges(edges.filter((e) => e.source !== id && e.target !== id));
      setDetailPanel(null);
    },
    [nodes, edges, setNodes, setEdges]
  );

  const handleDuplicateNode = useCallback(
    (id: string) => {
      const original = nodes.find((n) => n.id === id);
      if (!original) return;
      const nd = original.data as Record<string, unknown>;
      const nodeType = nd.nodeType as string;
      const manifest = useManifestStore.getState().byType[nodeType];
      if (!manifest) return;
      const newNode = createFlowNode(manifest, {
        x: original.position.x + 40,
        y: original.position.y + 60,
      });
      // Copy config from original
      newNode.data = { ...newNode.data, config: { ...(nd.config as Record<string, unknown>) } };
      addNode(newNode);
    },
    [nodes, addNode]
  );

  const handleSelectNode = useCallback(
    (node: Node<FlowNodeData> | null) => {
      if (node) {
        setDetailPanel({ nodeId: node.id, tab: "config" });
        setPaletteOpen(false);
      } else {
        setDetailPanel(null);
      }
    },
    []
  );

  const handleSave = useCallback(() => {
    const defs = Object.values(useNodeFunctionStore.getState().defs);
    const workflow = serializeGraph(nodes, edges, settings, name, defs);
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

  const handleLoadTemplate = useCallback(
    (template: TemplateInfo) => {
      const { nodes: n, edges: ed, settings: s, nodeFunctions: nf } = deserializeGraph(template.workflow);
      setNodes(n);
      setEdges(ed);
      useFlowStore.getState().updateSettings(s);
      setName(template.workflow.name);
      useNodeFunctionStore.getState().loadDefs(nf);
      setDetailPanel(null);
    },
    [setNodes, setEdges, setName]
  );

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
          const { nodes: n, edges: ed, nodeFunctions: nf } = deserializeGraph(workflow);
          setNodes(n);
          setEdges(ed);
          setName(workflow.name ?? "Untitled");
          useNodeFunctionStore.getState().loadDefs(nf);
          setDetailPanel(null);
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
        onOpenTemplates={() => setTemplatesOpen(true)}
      />

      {notice && (
        <div
          className="mx-4 mt-3 rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{
            background:
              notice.kind === "error"
                ? "rgba(220, 38, 38, 0.08)"
                : notice.kind === "success"
                  ? "rgba(22, 163, 74, 0.08)"
                  : "rgba(59, 130, 246, 0.08)",
            borderColor:
              notice.kind === "error"
                ? "rgba(220, 38, 38, 0.22)"
                : notice.kind === "success"
                  ? "rgba(22, 163, 74, 0.22)"
                  : "rgba(59, 130, 246, 0.22)",
            color: "var(--color-text)",
          }}
        >
          <div
            className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{
              background:
                notice.kind === "error"
                  ? "#dc2626"
                  : notice.kind === "success"
                    ? "#16a34a"
                    : "#2563eb",
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-6">{notice.message}</p>
          </div>
          <button
            onClick={clearNotice}
            className="text-[12px] font-medium px-2 py-1 rounded-lg transition-colors hover:bg-white/40"
            style={{ color: "var(--color-text-muted)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Canvas (full area) */}
      <div className="flex-1 relative overflow-hidden">
        <FlowEditor
          onSelectNode={handleSelectNode}
          onOpenPalette={() => setPaletteOpen(true)}
          onRunToNode={runToNode}
          onViewNodeOutput={(id) => setDetailPanel({ nodeId: id, tab: "data" })}
          onOpenNodeConfig={(id) => setDetailPanel({ nodeId: id, tab: "config" })}
          onDeleteNode={handleDeleteNode}
          onDuplicateNode={handleDuplicateNode}
        />
        <ExecutionLog />
      </div>

      {/* Overlay: Node Palette */}
      <NodePalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAddNode={handleAddNode}
      />

      {/* Unified Detail Panel */}
      <NodeDetailPanel
        state={detailPanel}
        onClose={() => setDetailPanel(null)}
        onDeleteNode={handleDeleteNode}
      />

      {/* Template Picker */}
      <TemplatePicker
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onLoad={handleLoadTemplate}
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
