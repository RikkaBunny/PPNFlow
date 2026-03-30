import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { NodeShell } from "./NodeShell";
import type { FlowNodeData, PortDef } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { getPortColor } from "@/lib/nodeColors";
import type { NodeStatus } from "@/types/execution";

/** Space handles evenly along the node side */
function handleTop(index: number, total: number): string {
  if (total === 1) return "50%";
  const step = 80 / (total - 1);
  return `${10 + index * step}%`;
}

/** Extract typed fields from the raw data record */
function extractNodeData(raw: Record<string, unknown>) {
  return {
    nodeType: raw.nodeType as string,
    label: raw.label as string,
    config: (raw.config ?? {}) as Record<string, unknown>,
    status: (raw.status ?? "idle") as NodeStatus,
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

  // Check for image preview in last run outputs
  const rawPreview = d.lastOutputs["_preview_image"] ?? d.lastOutputs["_display_image"];
  const imagePreview = typeof rawPreview === "string" ? rawPreview : null;
  const displayText = d.lastOutputs["_display"];

  return (
    <NodeShell
      label={label}
      category={manifest?.category}
      status={d.status}
      errorMsg={d.errorMsg}
      selected={selected}
    >
      {imagePreview !== null && (
        <img
          src={imagePreview}
          alt="preview"
          className="w-full rounded-md object-contain max-h-32 border border-white/5"
        />
      )}

      {displayText != null && (
        <div className="text-white/50 text-[10px] max-h-16 overflow-auto break-words whitespace-pre-wrap bg-white/5 rounded-md px-2 py-1">
          {String(displayText)}
        </div>
      )}

      {/* Port labels */}
      <div className="flex justify-between gap-4">
        {inputs.length > 0 && (
          <div className="space-y-1">
            {inputs.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: getPortColor(p.type) }}
                />
                <span className="text-[10px] text-white/40">{p.label}</span>
                {p.optional && (
                  <span className="text-[9px] text-white/20 italic">opt</span>
                )}
              </div>
            ))}
          </div>
        )}

        {outputs.length > 0 && (
          <div className="space-y-1 ml-auto">
            {outputs.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] text-white/40">{p.label}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: getPortColor(p.type) }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input handles (left side) */}
      {inputs.map((p, i) => (
        <Handle
          key={`in-${p.name}`}
          type="target"
          position={Position.Left}
          id={p.name}
          style={{
            top: handleTop(i, inputs.length),
            background: getPortColor(p.type),
            width: 10,
            height: 10,
            border: "2px solid #1a1a26",
            borderRadius: "50%",
          }}
        />
      ))}

      {/* Output handles (right side) */}
      {outputs.map((p, i) => (
        <Handle
          key={`out-${p.name}`}
          type="source"
          position={Position.Right}
          id={p.name}
          style={{
            top: handleTop(i, outputs.length),
            background: getPortColor(p.type),
            width: 10,
            height: 10,
            border: "2px solid #1a1a26",
            borderRadius: "50%",
          }}
        />
      ))}
    </NodeShell>
  );
}

export const GenericNode = memo(GenericNodeInner);
