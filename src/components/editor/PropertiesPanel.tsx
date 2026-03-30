import { type Node } from "@xyflow/react";
import { X, Trash2, Copy } from "lucide-react";
import type { FlowNodeData, ConfigField } from "@/types/node";
import { useFlowStore } from "@/stores/flowStore";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon } from "@/lib/nodeColors";
import { NodeIcon } from "@/components/nodes/NodeIcon";

interface Props {
  node: Node<FlowNodeData> | null;
  onClose: () => void;
  onDeleteNode: (id: string) => void;
}

export function PropertiesPanel({ node, onClose, onDeleteNode }: Props) {
  const updateConfig = useFlowStore((s) => s.updateNodeConfig);
  const manifest = useManifestStore((s) =>
    node ? s.byType[(node.data as Record<string, unknown>).nodeType as string] : undefined
  );

  if (!node) return null;

  const nodeData = node.data as Record<string, unknown>;
  const nodeType = nodeData.nodeType as string;
  const fields: ConfigField[] = manifest?.config_schema ?? [];
  const config = (nodeData.config ?? {}) as Record<string, unknown>;
  const catStyle = getCategoryStyle(manifest?.category);
  const iconName = getNodeIcon(nodeType, manifest?.category);

  const handleChange = (name: string, value: unknown) => {
    updateConfig(node.id, { [name]: value });
  };

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col animate-slide-in-right"
        style={{
          width: 380,
          background: "var(--color-panel)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-pink-50"
              style={{ color: "var(--color-text-muted)" }}>
              <X size={16} />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigator.clipboard.writeText(node.id)}
                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: "var(--color-text-muted)" }}
                title="Copy node ID">
                <Copy size={14} />
              </button>
              <button
                onClick={() => onDeleteNode(node.id)}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                style={{ color: "var(--color-text-muted)" }}
                title="Delete node">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: catStyle.bg }}>
              <NodeIcon name={iconName} size={20} color={catStyle.color} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
                {manifest?.label ?? nodeType}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: catStyle.color }}>
                {manifest?.category ?? "Other"}
              </span>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {fields.length === 0 && (
            <p className="text-[13px] text-center py-6" style={{ color: "var(--color-text-muted)" }}>
              This node has no configuration.
            </p>
          )}
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}>
                {field.label}
              </label>
              <FieldInput
                field={field}
                value={config[field.name] ?? field.default ?? ""}
                onChange={(v) => handleChange(field.name, v)}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--color-border)" }}>
          <span className="text-[10px] font-mono truncate" style={{ color: "var(--color-text-muted)" }}>
            {node.id.slice(0, 12)}...
          </span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{nodeType}</span>
        </div>
      </div>
    </>
  );
}

function FieldInput({ field, value, onChange }: {
  field: ConfigField; value: unknown; onChange: (v: unknown) => void;
}) {
  const base = `w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors border`;
  const style = {
    color: "var(--color-text)",
    background: "var(--color-canvas)",
    borderColor: "var(--color-border)",
  };

  if (field.type === "select") {
    return (
      <div className="relative">
        <select className={base + " appearance-none cursor-pointer pr-8"} style={style}
          value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  if (field.type === "bool") {
    const checked = Boolean(value);
    return (
      <button onClick={() => onChange(!checked)} className="flex items-center gap-3 group">
        <div className="w-9 h-5 rounded-full transition-colors relative"
          style={{ background: checked ? "var(--color-accent)" : "var(--color-border)" }}>
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: checked ? 18 : 2 }} />
        </div>
        <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          {checked ? "Enabled" : "Disabled"}
        </span>
      </button>
    );
  }

  if (field.type === "string" && field.multiline) {
    return <textarea className={`${base} resize-y min-h-[80px]`} style={style}
      value={String(value)} placeholder={field.placeholder ?? ""}
      onChange={(e) => onChange(e.target.value)} />;
  }

  if (field.type === "password") {
    return <input type="password" className={base} style={style}
      value={String(value)} placeholder="Enter key..."
      onChange={(e) => onChange(e.target.value)} />;
  }

  if (field.type === "int" || field.type === "float") {
    return <input type="number" className={base + " tabular-nums"} style={style}
      value={Number(value)} min={field.min} max={field.max}
      step={field.type === "float" ? 0.1 : 1}
      onChange={(e) => onChange(field.type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))} />;
  }

  return <input type="text" className={base} style={style}
    value={String(value)} placeholder={field.placeholder ?? ""}
    onChange={(e) => onChange(e.target.value)} />;
}
