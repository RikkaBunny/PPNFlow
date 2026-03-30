import { type Node } from "@xyflow/react";
import type { FlowNodeData, ConfigField } from "@/types/node";
import { useFlowStore } from "@/stores/flowStore";
import { useManifestStore } from "@/stores/manifestStore";

interface Props {
  node: Node<FlowNodeData> | null;
}

export function PropertiesPanel({ node }: Props) {
  const updateConfig = useFlowStore((s) => s.updateNodeConfig);
  const manifest = useManifestStore((s) => node ? s.byType[node.data.nodeType] : undefined);

  if (!node) {
    return (
      <div className="p-4 text-slate-500 text-sm">
        Select a node to configure it.
      </div>
    );
  }

  const fields: ConfigField[] = manifest?.config_schema ?? [];
  const config = node.data.config ?? {};

  const handleChange = (name: string, value: unknown) => {
    updateConfig(node.id, { [name]: value });
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {manifest?.label ?? node.data.nodeType}
      </div>

      {fields.length === 0 && (
        <div className="text-slate-500 text-xs">No configuration options.</div>
      )}

      {fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <label className="block text-[11px] text-slate-400">{field.label}</label>
          <FieldInput
            field={field}
            value={config[field.name] ?? field.default ?? ""}
            onChange={(v) => handleChange(field.name, v)}
          />
        </div>
      ))}
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
  const base = "w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500";

  if (field.type === "select") {
    return (
      <select
        className={base}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      >
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  if (field.type === "bool") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-500"
      />
    );
  }

  if (field.type === "string" && field.multiline) {
    return (
      <textarea
        className={`${base} resize-y min-h-[60px]`}
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
        placeholder="••••••••"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "int" || field.type === "float") {
    return (
      <input
        type="number"
        className={base}
        value={Number(value)}
        min={field.min}
        max={field.max}
        step={field.type === "float" ? 0.1 : 1}
        onChange={(e) =>
          onChange(field.type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
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
