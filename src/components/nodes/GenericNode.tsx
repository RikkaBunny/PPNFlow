import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { NodeIcon } from "./NodeIcon";
import type { FlowNodeData, PortDef } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { emit } from "@/lib/events";
import { useExecutionStore } from "@/stores/executionStore";
import { getCategoryStyle, getNodeIcon, getPortColor } from "@/lib/nodeColors";
import clsx from "clsx";
import { Check, X, Loader2, Clock, AlertTriangle, ChevronRight } from "lucide-react";

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
    ms: raw.ms as number | undefined,
  };
}

/** Summarize an output value for mini-preview */
function summarize(val: unknown): string {
  if (val == null) return "null";
  if (typeof val === "string") {
    if (val.startsWith("data:image")) return "[image]";
    return val.length > 60 ? val.slice(0, 60) + "..." : val;
  }
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return `[array: ${val.length}]`;
  if (typeof val === "object") return `{${Object.keys(val).slice(0, 3).join(", ")}${Object.keys(val).length > 3 ? "..." : ""}}`;
  return String(val);
}

function GenericNodeInner(props: NodeProps<Node<FlowNodeData>>) {
  const d = extractNodeData(props.data as Record<string, unknown>);
  const selected = Boolean(props.selected);
  const manifest = useManifestStore((s) => s.byType[d.nodeType]);
  // Get ms from executionStore directly (more reliable)
  const execState = useExecutionStore((s) => s.nodeStates[props.id]);
  const ms = execState?.ms ?? d.ms;

  const inputs: PortDef[] = manifest?.inputs ?? [];
  const outputs: PortDef[] = manifest?.outputs ?? [];
  const label = manifest?.label ?? d.label ?? d.nodeType;
  const category = manifest?.category;
  const catStyle = getCategoryStyle(category);
  const iconName = getNodeIcon(d.nodeType, category);

  const isRunning = d.status === "running";
  const isDone = d.status === "done";
  const isError = d.status === "error";
  const hasRun = isDone || isError;

  // Build output summary (skip internal keys)
  const outputSummary = hasRun
    ? Object.entries(d.lastOutputs)
        .filter(([k]) => !k.startsWith("_"))
        .slice(0, 2)
        .map(([k, v]) => ({ key: k, value: summarize(v) }))
    : [];

  const maxPorts = Math.max(inputs.length, outputs.length);

  return (
    <div className="flex flex-col items-center">
      {/* ── Execution time badge (ABOVE node) ── */}
      {hasRun && ms != null && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full mb-1.5 animate-fade-in"
          style={{
            background: "var(--color-panel)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <Clock size={9} style={{ color: isDone ? "var(--color-success)" : "var(--color-error)" }} />
          <span className="text-[9px] font-mono tabular-nums" style={{ color: "var(--color-text-muted)" }}>
            {ms}ms
          </span>
        </div>
      )}

      {/* ── Main node card ── */}
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
        {/* Status badge (top-right corner) */}
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

        {/* Header: Icon + Title */}
        <div className="flex items-center" style={{ height: 42 }}>
          <div className="flex items-center justify-center flex-shrink-0 rounded-l-[11px]"
            style={{ background: catStyle.bg, width: 42, height: 42 }}>
            <NodeIcon name={iconName} size={17} color={catStyle.color} />
          </div>
          <div className="flex-1 min-w-0 px-2.5">
            <div className="text-[12px] font-semibold truncate" style={{ color: "var(--color-text)" }}>{label}</div>
            <div className="text-[9px] font-medium uppercase tracking-wider mt-px" style={{ color: catStyle.color, opacity: 0.6 }}>{category}</div>
          </div>
        </div>

        {/* Port Rows */}
        {maxPorts > 0 && (
          <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
            {Array.from({ length: maxPorts }).map((_, i) => {
              const inp = inputs[i] ?? null;
              const out = outputs[i] ?? null;
              return (
                <div key={i} className="flex items-center justify-between relative"
                  style={{ height: 26, paddingLeft: 10, paddingRight: 10 }}>
                  {inp ? (
                    <div className="flex items-center gap-1 min-w-0 flex-1 cursor-pointer nopan"
                      onClick={(e) => { e.stopPropagation(); emit("port-click", props.id, inp.name); }}>
                      <span className="text-[8px] font-bold font-mono uppercase px-1 py-px rounded flex-shrink-0"
                        style={{ color: getPortColor(inp.type), background: getPortColor(inp.type) + "18", letterSpacing: "0.03em" }}>
                        {typeShort(inp.type)}
                      </span>
                      <span className="text-[10px] truncate hover:underline" style={{ color: "var(--color-text-secondary)" }}>{inp.label}</span>
                      {inp.optional && <span className="text-[8px]" style={{ color: "var(--color-text-muted)" }}>?</span>}
                      <Handle type="target" position={Position.Left} id={inp.name} title={`${inp.label} (${inp.type})`}
                        style={{ position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)",
                          background: getPortColor(inp.type), width: 10, height: 10,
                          border: "2px solid white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
                    </div>
                  ) : <div className="flex-1" />}
                  {out ? (
                    <div className="flex items-center gap-1 min-w-0 justify-end flex-1 cursor-pointer nopan"
                      onClick={(e) => { e.stopPropagation(); emit("port-click", props.id, out.name); }}>
                      <span className="text-[10px] truncate hover:underline" style={{ color: "var(--color-text-secondary)" }}>{out.label}</span>
                      <span className="text-[8px] font-bold font-mono uppercase px-1 py-px rounded flex-shrink-0"
                        style={{ color: getPortColor(out.type), background: getPortColor(out.type) + "18", letterSpacing: "0.03em" }}>
                        {typeShort(out.type)}
                      </span>
                      <Handle type="source" position={Position.Right} id={out.name} title={`${out.label} (${out.type})`}
                        style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)",
                          background: getPortColor(out.type), width: 10, height: 10,
                          border: "2px solid white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
                    </div>
                  ) : <div className="flex-1" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Output / Error preview (BELOW node) ── */}
      {isDone && outputSummary.length > 0 && (
        <div
          className="mt-1.5 rounded-lg px-2.5 py-1.5 animate-fade-in cursor-pointer nopan"
          style={{
            width: 220,
            background: "var(--color-panel)",
            border: "1px solid var(--color-border-light)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
          title="Click to view details"
          onClick={(e) => { e.stopPropagation(); emit("open-data", props.id); }}
        >
          {outputSummary.map((o) => (
            <div key={o.key} className="flex items-start gap-1.5 py-0.5">
              <span className="text-[8px] font-bold font-mono uppercase flex-shrink-0 mt-px"
                style={{ color: "var(--color-success)" }}>{o.key}</span>
              <span className="text-[9px] truncate font-mono" style={{ color: "var(--color-text-muted)" }}>
                {o.value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-end mt-0.5">
            <span className="text-[8px] flex items-center gap-0.5" style={{ color: "var(--color-text-muted)" }}>
              details <ChevronRight size={8} />
            </span>
          </div>
        </div>
      )}

      {isError && d.errorMsg && (
        <div
          className="mt-1.5 rounded-lg px-2.5 py-1.5 animate-fade-in cursor-pointer nopan"
          style={{
            width: 220,
            background: "rgba(231,76,60,0.04)",
            border: "1px solid rgba(231,76,60,0.15)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
          title="Click to view error details"
          onClick={(e) => { e.stopPropagation(); emit("open-error", props.id); }}
        >
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-error)" }} />
            <span className="text-[9px] leading-relaxed break-words line-clamp-2" style={{ color: "var(--color-error)" }}>
              {d.errorMsg}
            </span>
          </div>
          <div className="flex items-center justify-end mt-0.5">
            <span className="text-[8px] flex items-center gap-0.5" style={{ color: "var(--color-error)", opacity: 0.6 }}>
              details <ChevronRight size={8} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export const GenericNode = memo(GenericNodeInner);
