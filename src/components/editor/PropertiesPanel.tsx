import { type Node } from "@xyflow/react";
import { X, Trash2 } from "lucide-react";
import type { FlowNodeData, ConfigField } from "@/types/node";
import { useFlowStore } from "@/stores/flowStore";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle } from "@/lib/nodeColors";

interface Props {
  node: Node<FlowNodeData> | null;
  onClose: () => void;
  onDeleteNode: (id: string) => void;
}

export function PropertiesPanel({ node, onClose, onDeleteNode }: Props) {
  const updateConfig = useFlowStore((s) => s.updateNodeConfig);
  const manifest = useManifestStore((s) =>
    node ? s.byType[node.data.nodeType] : undefined
  );

  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-2xs text-white/20 text-center leading-relaxed">
          Select a node to<br />view its properties
        </p>
      </div>
    );
  }

  const fields: ConfigField[] = manifest?.config_schema ?? [];
  const config = node.data.config ?? {};
  const style = getCategoryStyle(manifest?.category);

  const handleChange = (name: string, value: unknown) => {
    updateConfig(node.id, { [name]: value });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "#2a2a3a" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: style.color }}
            />
            <span className="text-sm font-semibold text-white/90">
              {manifest?.label ?? node.data.nodeType}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDeleteNode(node.id)}
              className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete node"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors"
              title="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              color: style.color,
              background: style.bgLight,
            }}
          >
            {manifest?.category ?? "Other"}
          </span>
          <span className="text-[10px] text-white/15">{node.data.nodeType}</span>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {fields.length === 0 && (
          <p className="text-2xs text-white/20">No configuration options.</p>
        )}

        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5">
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

      {/* Node ID footer */}
      <div
        className="px-4 py-2 border-t"
        style={{ borderColor: "#2a2a3a" }}
      >
        <p className="text-[9px] text-white/10 truncate font-mono">
          ID: {node.id}
        </p>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const base = `w-full rounded-lg px-3 py-2 text-xs text-white/80 outline-none
    transition-colors border
    bg-white/[0.03] border-white/8
    hover:border-white/15
    focus:border-accent/50 focus:bg-white/[0.05]
    placeholder:text-white/15`;

  if (field.type === "select") {
    return (
      <select
        className={base + " appearance-none cursor-pointer"}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      >
        {(field.options ?? []).map((o) => (
          <option key={o} value={o} className="bg-elevated text-white">
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "bool") {
    return (
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4.5 rounded-full bg-white/8 border border-white/10 peer-checked:bg-accent/30 peer-checked:border-accent/50 transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white/40 peer-checked:bg-accent peer-checked:translate-x-3.5 transition-all" />
        </div>
        <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
          {Boolean(value) ? "On" : "Off"}
        </span>
      </label>
    );
  }

  if (field.type === "string" && field.multiline) {
    return (
      <textarea
        className={`${base} resize-y min-h-[72px]`}
        value={String(value)}
        placeholder={field.placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "password") {
    return (
      <input
        type="password"
        className={base}
        value={String(value)}
        placeholder="Enter key..."
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "int" || field.type === "float") {
    return (
      <input
        type="number"
        className={base + " tabular-nums"}
        value={Number(value)}
        min={field.min}
        max={field.max}
        step={field.type === "float" ? 0.1 : 1}
        onChange={(e) =>
          onChange(
            field.type === "float"
              ? parseFloat(e.target.value)
              : parseInt(e.target.value, 10)
          )
        }
      />
    );
  }

  // Default: text input
  return (
    <input
      type="text"
      className={base}
      value={String(value)}
      placeholder={field.placeholder ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
