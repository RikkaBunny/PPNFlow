import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeShell } from "./NodeShell";
import type { FlowNodeData, PortDef } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { useExecutionStore } from "@/stores/executionStore";

// Port type → color (matches common conventions)
const PORT_COLORS: Record<string, string> = {
  STRING: "#a3e635",
  IMAGE:  "#fb923c",
  INT:    "#60a5fa",
  FLOAT:  "#818cf8",
  BOOL:   "#f472b6",
  JSON:   "#facc15",
  ANY:    "#94a3b8",
  BOOL_OUT: "#f472b6",
};

function portColor(type: string) {
  return PORT_COLORS[type.toUpperCase()] ?? PORT_COLORS.ANY;
}

// Space handles evenly along the node side
function handleTop(index: number, total: number): string {
  if (total === 1) return "50%";
  const step = 80 / (total - 1);
  return `${10 + index * step}%`;
}

interface Props extends NodeProps {
  data: FlowNodeData;
  selected: boolean;
}

function GenericNodeInner({ data, selected }: Props) {
  const manifest = useManifestStore((s) => s.byType[data.nodeType]);
  const nodeState = useExecutionStore((s) => s.nodeStates[data.nodeType]);
  // nodeState is keyed by node id but we need per-instance; handled in FlowEditor

  const inputs: PortDef[]  = manifest?.inputs  ?? [];
  const outputs: PortDef[] = manifest?.outputs ?? [];
  const label = manifest?.label ?? data.label ?? data.nodeType;

  // Check for image preview in outputs
  const imagePreview = data.lastOutputs?.["_preview_image"] as string | undefined
    ?? data.lastOutputs?.["_display_image"] as string | undefined;

  return (
    <NodeShell
      label={label}
      category={manifest?.category}
      status={data.status}
      errorMsg={data.errorMsg}
      selected={selected}
    >
      {/* Image preview (for screenshot / image_display nodes) */}
      {imagePreview && (
        <img
          src={imagePreview}
          alt="preview"
          className="w-full rounded object-contain max-h-32"
        />
      )}

      {/* Text display */}
      {data.lastOutputs?.["_display"] && (
        <div className="text-slate-300 text-[10px] max-h-16 overflow-auto break-words whitespace-pre-wrap">
          {String(data.lastOutputs["_display"])}
        </div>
      )}

      {/* Port labels */}
      {inputs.length > 0 && (
        <div className="text-slate-400 space-y-0.5">
          {inputs.map((p) => (
            <div key={p.name} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: portColor(p.type) }}
              />
              <span>{p.label}</span>
              {p.optional && <span className="text-slate-500">(opt)</span>}
            </div>
          ))}
        </div>
      )}

      {outputs.length > 0 && (
        <div className="text-slate-400 space-y-0.5">
          {outputs.map((p) => (
            <div key={p.name} className="flex items-center gap-1 justify-end">
              <span>{p.label}</span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: portColor(p.type) }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Input handles (left side) */}
      {inputs.map((p, i) => (
        <Handle
          key={`in-${p.name}`}
          type="target"
          position={Position.Left}
          id={p.name}
          style={{
            top: handleTop(i, inputs.length),
            background: portColor(p.type),
            width: 10,
            height: 10,
            border: "2px solid #1e293b",
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
            background: portColor(p.type),
            width: 10,
            height: 10,
            border: "2px solid #1e293b",
          }}
        />
      ))}
    </NodeShell>
  );
}

export const GenericNode = memo(GenericNodeInner);
