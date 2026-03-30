import { useState, useCallback } from "react";
import type { Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";

import { FlowEditor, createFlowNode } from "@/components/editor/FlowEditor";
import { NodePalette }   from "@/components/editor/NodePalette";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { Toolbar }       from "@/components/editor/Toolbar";

import { useEngine }     from "@/hooks/useEngine";
import { useFlowStore }  from "@/stores/flowStore";
import type { FlowNodeData, NodeManifest } from "@/types/node";
import { serializeGraph, deserializeGraph } from "@/lib/graphSerializer";
import type { WorkflowFile } from "@/types/workflow";

function AppInner() {
  useEngine();  // Start Python engine + subscribe to events

  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const addNode    = useFlowStore((s) => s.addNode);
  const nodes      = useFlowStore((s) => s.nodes);
  const edges      = useFlowStore((s) => s.edges);
  const settings   = useFlowStore((s) => s.settings);
  const name       = useFlowStore((s) => s.workflowName);
  const setNodes   = useFlowStore((s) => s.setNodes);
  const setEdges   = useFlowStore((s) => s.setEdges);
  const setName    = useFlowStore((s) => s.setWorkflowName);

  // Add a node from the palette at a reasonable canvas position
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

  // Save workflow as JSON file download
  const handleSave = useCallback(() => {
    const workflow = serializeGraph(nodes, edges, settings, name);
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${name}.ppnflow`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, settings, name]);

  // Load workflow from file
  const handleLoad = useCallback(() => {
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = ".ppnflow,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const workflow = JSON.parse(ev.target?.result as string) as WorkflowFile;
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
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {/* Top toolbar */}
      <Toolbar
        onSave={handleSave}
        onLoad={handleLoad}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node palette */}
        <div className="w-44 flex-shrink-0 bg-slate-900 border-r border-slate-700 overflow-hidden flex flex-col">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700">
            Nodes
          </div>
          <NodePalette onAddNode={handleAddNode} />
        </div>

        {/* Center: Flow canvas */}
        <div className="flex-1 overflow-hidden">
          <FlowEditor
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
        </div>

        {/* Right: Properties panel */}
        <div className="w-56 flex-shrink-0 bg-slate-900 border-l border-slate-700 overflow-hidden flex flex-col">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700">
            Properties
          </div>
          <PropertiesPanel node={selectedNode} />
        </div>
      </div>

      {/* Settings modal (basic) */}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const store = useFlowStore();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-96 border border-slate-600">
        <h2 className="text-white font-bold mb-4">Settings</h2>
        <p className="text-slate-400 text-sm mb-4">
          API keys are stored locally in the Properties panel of each AI Chat node.
        </p>
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Workflow Name</label>
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={store.workflowName}
            onChange={(e) => store.setWorkflowName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Loop Delay (ms)</label>
          <input
            type="number"
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={store.settings.loop_delay_ms}
            min={0}
            onChange={(e) => store.updateSettings({ loop_delay_ms: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-2 text-sm"
        >
          Close
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
