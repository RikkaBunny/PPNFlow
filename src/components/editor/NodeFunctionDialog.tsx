/**
 * Dialog for creating a Node Function from selected nodes.
 * Shows auto-detected inputs/outputs, lets user rename them, and confirm.
 */
import { useState } from "react";
import { Boxes, X } from "lucide-react";
import type { NodeFunctionPortMapping, NodeFunctionDef } from "@/types/nodeFunction";
import type { FunctionAnalysis } from "@/lib/nodeFunctionAnalyzer";

interface Props {
  analysis: FunctionAnalysis;
  onCancel: () => void;
  onCreate: (def: NodeFunctionDef) => void;
}

const TYPE_COLORS: Record<string, string> = {
  STRING: "#10b981",
  IMAGE: "#e84393",
  INT: "#3b82f6",
  FLOAT: "#8b5cf6",
  BOOL: "#f59e0b",
  JSON: "#ef4444",
  ANY: "#6b7280",
};

function PortRow({
  port,
  onChange,
}: {
  port: NodeFunctionPortMapping;
  onChange: (updated: NodeFunctionPortMapping) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
        style={{
          background: (TYPE_COLORS[port.type] ?? "#6b7280") + "18",
          color: TYPE_COLORS[port.type] ?? "#6b7280",
        }}
      >
        {port.type}
      </span>
      <input
        className="flex-1 px-2 py-1 rounded text-[12px] border outline-none"
        style={{
          color: "var(--color-text)",
          background: "var(--color-canvas)",
          borderColor: "var(--color-border)",
        }}
        value={port.name}
        onChange={(e) => onChange({ ...port, name: e.target.value })}
      />
      <input
        className="flex-1 px-2 py-1 rounded text-[12px] border outline-none"
        style={{
          color: "var(--color-text-secondary)",
          background: "var(--color-canvas)",
          borderColor: "var(--color-border)",
        }}
        value={port.label}
        placeholder="Label"
        onChange={(e) => onChange({ ...port, label: e.target.value })}
      />
    </div>
  );
}

export function NodeFunctionDialog({ analysis, onCancel, onCreate }: Props) {
  const [name, setName] = useState("My Function");
  const [inputs, setInputs] = useState<NodeFunctionPortMapping[]>(
    analysis.detectedInputs.map((p) => ({ ...p }))
  );
  const [outputs, setOutputs] = useState<NodeFunctionPortMapping[]>(
    analysis.detectedOutputs.map((p) => ({ ...p }))
  );

  const handleCreate = () => {
    const id = `mf_${crypto.randomUUID().slice(0, 8)}`;
    const def: NodeFunctionDef = {
      id,
      name,
      category: "Node Function",
      internalNodes: analysis.internalNodes,
      internalEdges: analysis.internalEdges,
      inputs,
      outputs,
    };
    onCreate(def);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="overlay-backdrop" onClick={onCancel} />
      <div
        className="relative z-10 rounded-2xl p-6 w-[480px] max-h-[80vh] overflow-y-auto animate-scale-in"
        style={{
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Boxes size={20} style={{ color: "var(--color-accent)" }} />
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--color-text)" }}>
              Create Node Function
            </h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-black/5">
            <X size={16} style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        {/* Function name */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}>
            Function Name
          </label>
          <input
            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none border"
            style={{
              color: "var(--color-text)",
              background: "var(--color-canvas)",
              borderColor: "var(--color-border)",
            }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Info */}
        <p className="text-[11px] mb-4" style={{ color: "var(--color-text-muted)" }}>
          {analysis.internalNodes.length} nodes will be collapsed.
          Edit port names and labels below.
        </p>

        {/* Inputs */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}>
            Inputs ({inputs.length})
          </label>
          {inputs.length === 0 ? (
            <p className="text-[11px] italic py-2" style={{ color: "var(--color-text-muted)" }}>
              No external inputs — this function is self-contained on the input side.
            </p>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}>
                <span className="w-[52px]">Type</span>
                <span className="flex-1">Name</span>
                <span className="flex-1">Label</span>
              </div>
              {inputs.map((port, i) => (
                <PortRow
                  key={i}
                  port={port}
                  onChange={(updated) => {
                    const next = [...inputs];
                    next[i] = updated;
                    setInputs(next);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Outputs */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}>
            Outputs ({outputs.length})
          </label>
          {outputs.length === 0 ? (
            <p className="text-[11px] italic py-2" style={{ color: "var(--color-text-muted)" }}>
              No external outputs — this function has no outgoing connections.
            </p>
          ) : (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}>
                <span className="w-[52px]">Type</span>
                <span className="flex-1">Name</span>
                <span className="flex-1">Label</span>
              </div>
              {outputs.map((port, i) => (
                <PortRow
                  key={i}
                  port={port}
                  onChange={(updated) => {
                    const next = [...outputs];
                    next[i] = updated;
                    setOutputs(next);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors"
            style={{
              color: "var(--color-text-secondary)",
              borderColor: "var(--color-border)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-105"
            style={{
              background: "linear-gradient(135deg, #e84393, #fd79a8)",
              boxShadow: "0 2px 12px rgba(232,67,147,0.25)",
            }}
          >
            Create Function
          </button>
        </div>
      </div>
    </div>
  );
}
