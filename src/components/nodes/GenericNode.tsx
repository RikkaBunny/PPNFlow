import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { NodeShell } from "./NodeShell";
import { NodeIcon } from "./NodeIcon";
import type { FlowNodeData, PortDef } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon, getPortColor } from "@/lib/nodeColors";

function handleOffset(index: number, total: number): string {
  if (total <= 1) return "50%";
  const step = 70 / (total - 1);
  return `${15 + index * step}%`;
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

  return (
    <NodeShell
      label={label}
      icon={<NodeIcon name={iconName} size={18} color={catStyle.color} />}
      iconBg={catStyle.bg}
      status={d.status}
      errorMsg={d.errorMsg}
      selected={selected}
    >
      {imagePreview !== null ? (
        <img
          src={imagePreview}
          alt="preview"
          className="w-full rounded-lg object-contain max-h-28 border"
          style={{ borderColor: "var(--color-border-light)" }}
        />
      ) : null}

      {displayText != null ? (
        <div className="text-[10px] max-h-14 overflow-auto break-words whitespace-pre-wrap rounded-lg px-2 py-1"
          style={{ color: "var(--color-text-secondary)", background: "var(--color-accent-light)" }}>
          {String(displayText)}
        </div>
      ) : null}

      {/* Input handles */}
      {inputs.map((p, i) => (
        <Handle
          key={`in-${p.name}`}
          type="target"
          position={Position.Left}
          id={p.name}
          style={{
            top: handleOffset(i, inputs.length),
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
          style={{
            top: handleOffset(i, outputs.length),
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
