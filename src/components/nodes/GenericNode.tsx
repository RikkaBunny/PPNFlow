import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { NodeShell } from "./NodeShell";
import { NodeIcon } from "./NodeIcon";
import type { FlowNodeData, PortDef } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon, getPortColor } from "@/lib/nodeColors";

/** Port type short labels */
const TYPE_SHORT: Record<string, string> = {
  STRING: "str",
  IMAGE: "img",
  INT: "int",
  FLOAT: "flt",
  BOOL: "bool",
  JSON: "json",
  ANY: "any",
};

function typeShort(t: string) {
  return TYPE_SHORT[t.toUpperCase()] ?? t.toLowerCase().slice(0, 4);
}

function extractNodeData(raw: Record<string, unknown>) {
  return {
    nodeType: raw.nodeType as string,
    label: raw.label as string,
    config: (raw.config ?? {}) as Record<string, unknown>,
    status: raw.status as FlowNodeData["status"],
    errorMsg: raw.errorMsg as string | undefined,
    lastOutputs: (raw.lastOutputs ?? {}) as Record<string, unknown>,
  };
}

function GenericNodeInner(props: NodeProps<Node<FlowNodeData>>) {
  const d = extractNodeData(props.data as Record<string, unknown>);
  const selected = Boolean(props.selected);
  const manifest = useManifestStore((s) => s.byType[d.nodeType]);

  const inputs: PortDef[] = manifest?.inputs ?? [];
  const outputs: PortDef[] = manifest?.outputs ?? [];
  const label = manifest?.label ?? d.label ?? d.nodeType;
  const category = manifest?.category;
  const catStyle = getCategoryStyle(category);
  const iconName = getNodeIcon(d.nodeType, category);

  const rawPreview = d.lastOutputs["_preview_image"] ?? d.lastOutputs["_display_image"];
  const imagePreview = typeof rawPreview === "string" ? rawPreview : null;
  const displayText = d.lastOutputs["_display"];

  // Calculate handle position based on port count
  const hasBody = inputs.length > 0 || outputs.length > 0;
  const headerH = 44;
  const rowH = 22;
  const bodyPadTop = 6;
  function portTop(index: number): number {
    return headerH + bodyPadTop + index * rowH + rowH / 2;
  }

  return (
    <NodeShell
      label={label}
      icon={<NodeIcon name={iconName} size={18} color={catStyle.color} />}
      iconBg={catStyle.bg}
      status={d.status}
      errorMsg={d.errorMsg}
      selected={selected}
    >
      {/* Image preview */}
      {imagePreview !== null ? (
        <img
          src={imagePreview}
          alt="preview"
          className="w-full rounded-lg object-contain max-h-28 border"
          style={{ borderColor: "var(--color-border-light)" }}
        />
      ) : null}

      {/* Text display */}
      {displayText != null ? (
        <div
          className="text-[10px] max-h-14 overflow-auto break-words whitespace-pre-wrap rounded-lg px-2 py-1"
          style={{ color: "var(--color-text-secondary)", background: "var(--color-accent-light)" }}
        >
          {String(displayText)}
        </div>
      ) : null}

      {/* Port labels row */}
      {hasBody && (
        <div className="flex justify-between gap-2 mt-1">
          {/* Input labels */}
          <div className="space-y-0.5 min-w-0">
            {inputs.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 h-[22px]">
                <span
                  className="text-[9px] font-mono px-1 py-0.5 rounded leading-none"
                  style={{
                    color: getPortColor(p.type),
                    background: getPortColor(p.type) + "15",
                  }}
                >
                  {typeShort(p.type)}
                </span>
                <span
                  className="text-[10px] truncate"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {p.label}
                </span>
                {p.optional && (
                  <span className="text-[8px] italic" style={{ color: "var(--color-text-muted)" }}>
                    ?
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Output labels */}
          <div className="space-y-0.5 min-w-0 text-right">
            {outputs.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 justify-end h-[22px]">
                <span
                  className="text-[10px] truncate"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {p.label}
                </span>
                <span
                  className="text-[9px] font-mono px-1 py-0.5 rounded leading-none"
                  style={{
                    color: getPortColor(p.type),
                    background: getPortColor(p.type) + "15",
                  }}
                >
                  {typeShort(p.type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input handles */}
      {inputs.map((p, i) => (
        <Handle
          key={`in-${p.name}`}
          type="target"
          position={Position.Left}
          id={p.name}
          title={`${p.label} (${p.type})`}
          style={{
            top: portTop(i),
            background: getPortColor(p.type),
            width: 10,
            height: 10,
            border: "2.5px solid white",
            borderRadius: "50%",
            left: -5.5,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        />
      ))}

      {/* Output handles */}
      {outputs.map((p, i) => (
        <Handle
          key={`out-${p.name}`}
          type="source"
          position={Position.Right}
          id={p.name}
          title={`${p.label} (${p.type})`}
          style={{
            top: portTop(i),
            background: getPortColor(p.type),
            width: 10,
            height: 10,
            border: "2.5px solid white",
            borderRadius: "50%",
            right: -5.5,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        />
      ))}
    </NodeShell>
  );
}

export const GenericNode = memo(GenericNodeInner);
