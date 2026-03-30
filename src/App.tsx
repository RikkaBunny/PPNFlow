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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

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
      const node = createFlowNode(manifest, {
        x: 200 + Math.random() * 200,
        y: 200 + Math.random() * 200,
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0f0f14" }}>
      {/* Top toolbar */}
      <Toolbar
        onSave={handleSave}
        onLoad={handleLoad}
        onOpenSettings={() => setSettingsOpen(true)}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node palette */}
        {leftPanelOpen && (
          <div
            className="w-52 flex-shrink-0 flex flex-col overflow-hidden border-r animate-slide-in-left"
            style={{ background: "#16161e", borderColor: "#2a2a3a" }}
          >
            <NodePalette onAddNode={handleAddNode} />
          </div>
        )}

        {/* Center: Flow canvas + bottom log */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <FlowEditor
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          </div>
          <ExecutionLog />
        </div>

        {/* Right: Properties panel */}
        {rightPanelOpen && (
          <div
            className="w-64 flex-shrink-0 flex flex-col overflow-hidden border-l animate-slide-in-right"
            style={{ background: "#16161e", borderColor: "#2a2a3a" }}
          >
            <PropertiesPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onDeleteNode={handleDeleteNode}
            />
          </div>
        )}
      </div>

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const store = useFlowStore();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div
        className="rounded-2xl p-6 w-[420px] shadow-2xl border"
        style={{ background: "#1e1e2a", borderColor: "#363648" }}
      >
        <h2 className="text-white/90 font-bold text-base mb-5">Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5">
              Workflow Name
            </label>
            <input
              className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/80
                         outline-none focus:border-accent/50 transition-colors"
              value={store.workflowName}
              onChange={(e) => store.setWorkflowName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5">
              Loop Delay (ms)
            </label>
            <input
              type="number"
              className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-sm text-white/80
                         outline-none focus:border-accent/50 transition-colors tabular-nums"
              value={store.settings.loop_delay_ms}
              min={0}
              onChange={(e) =>
                store.updateSettings({
                  loop_delay_ms: parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </div>

          <p className="text-[11px] text-white/20 leading-relaxed">
            API keys are configured per-node in the Properties panel.
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium
                       bg-accent/20 text-accent hover:bg-accent/30
                       border border-accent/30
                       transition-colors"
          >
            Done
          </button>
        </div>
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
