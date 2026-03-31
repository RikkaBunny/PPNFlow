import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { NodeIcon } from "./NodeIcon";
import type { FlowNodeData, PortDef } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon, getPortColor } from "@/lib/nodeColors";
import clsx from "clsx";
import { Check, X, Loader2 } from "lucide-react";

const TYPE_SHORT: Record<string, string> = {
  STRING: "str", IMAGE: "img", INT: "int", FLOAT: "flt",
  BOOL: "bool", JSON: "json", ANY: "any",
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

  const isRunning = d.status === "running";
  const isDone = d.status === "done";
  const isError = d.status === "error";

  // Build unified port rows: pair up inputs[i] with outputs[i]
  const maxPorts = Math.max(inputs.length, outputs.length);

  return (
    <div
      className={clsx(
        "ppn-node",
        selected && "ppn-node--selected",
        isRunning && "ppn-node--running",
        isError && "ppn-node--error",
        isDone && "ppn-node--done"
      )}
      style={{ width: 220 }}
    >
      {/* Status badge */}
      {isRunning && (
        <div className="ppn-status-badge animate-pulse-ring" style={{ background: "var(--color-running)" }}>
          <Loader2 size={11} className="text-white" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}
      {isDone && (
        <div className="ppn-status-badge" style={{ background: "var(--color-success)" }}>
          <Check size={11} className="text-white" strokeWidth={3} />
        </div>
      )}
      {isError && (
        <div className="ppn-status-badge" style={{ background: "var(--color-error)" }}>
          <X size={11} className="text-white" strokeWidth={3} />
        </div>
      )}

      {/* ── Header: Icon + Title ── */}
      <div className="flex items-center" style={{ height: 42 }}>
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-l-[11px]"
          style={{ background: catStyle.bg, width: 42, height: 42 }}
        >
          <NodeIcon name={iconName} size={17} color={catStyle.color} />
        </div>
        <div className="flex-1 min-w-0 px-2.5">
          <div className="text-[12px] font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {label}
          </div>
          <div className="text-[9px] font-medium uppercase tracking-wider mt-px" style={{ color: catStyle.color, opacity: 0.6 }}>
            {category}
          </div>
        </div>
      </div>

      {/* ── Port Rows ── */}
      {maxPorts > 0 && (
        <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
          {Array.from({ length: maxPorts }).map((_, i) => {
            const inp = inputs[i] ?? null;
            const out = outputs[i] ?? null;
            return (
              <div
                key={i}
                className="flex items-center justify-between relative"
                style={{ height: 26, paddingLeft: 10, paddingRight: 10 }}
              >
                {/* Input side */}
                {inp ? (
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span
                      className="text-[8px] font-bold font-mono uppercase px-1 py-px rounded flex-shrink-0"
                      style={{
                        color: getPortColor(inp.type),
                        background: getPortColor(inp.type) + "18",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {typeShort(inp.type)}
                    </span>
                    <span className="text-[10px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                      {inp.label}
                    </span>
                    {inp.optional && (
                      <span className="text-[8px]" style={{ color: "var(--color-text-muted)" }}>?</span>
                    )}
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={inp.name}
                      title={`${inp.label} (${inp.type})`}
                      style={{
                        position: "absolute",
                        left: -5,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: getPortColor(inp.type),
                        width: 10, height: 10,
                        border: "2px solid white",
                        borderRadius: "50%",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                      }}
                    />
                  </div>
                ) : <div className="flex-1" />}

                {/* Output side */}
                {out ? (
                  <div className="flex items-center gap-1 min-w-0 justify-end flex-1">
                    <span className="text-[10px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                      {out.label}
                    </span>
                    <span
                      className="text-[8px] font-bold font-mono uppercase px-1 py-px rounded flex-shrink-0"
                      style={{
                        color: getPortColor(out.type),
                        background: getPortColor(out.type) + "18",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {typeShort(out.type)}
                    </span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={out.name}
                      title={`${out.label} (${out.type})`}
                      style={{
                        position: "absolute",
                        right: -5,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: getPortColor(out.type),
                        width: 10, height: 10,
                        border: "2px solid white",
                        borderRadius: "50%",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                      }}
                    />
                  </div>
                ) : <div className="flex-1" />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Preview / Display ── */}
      {(imagePreview !== null || displayText != null) && (
        <div className="px-2.5 pb-2 pt-1" style={{ borderTop: "1px solid var(--color-border-light)" }}>
          {imagePreview !== null ? (
            <img src={imagePreview} alt="preview"
              className="w-full rounded object-contain max-h-24 border"
              style={{ borderColor: "var(--color-border-light)" }} />
          ) : null}
          {displayText != null ? (
            <div className="text-[10px] max-h-12 overflow-auto break-words whitespace-pre-wrap rounded px-1.5 py-1"
              style={{ color: "var(--color-text-secondary)", background: "var(--color-accent-light)" }}>
              {String(displayText)}
            </div>
          ) : null}
        </div>
      )}

      {/* Error */}
      {isError && d.errorMsg && (
        <div className="px-2.5 pb-2" style={{ borderTop: "1px solid rgba(231,76,60,0.15)" }}>
          <p className="text-[9px] leading-relaxed mt-1 break-words" style={{ color: "var(--color-error)" }}>
            {d.errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}

export const GenericNode = memo(GenericNodeInner);
