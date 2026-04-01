/**
 * Node detail panel — right-side slide-over.
 * Shows: node info, config, inputs received, outputs produced, errors.
 * Opens on double-click or right-click → View output.
 * Works for any node state: idle, running, done, error.
 */
import { useState } from "react";
import {
  X, Clock, AlertCircle, CheckCircle2, Copy, Check,
  Image, FileText, Braces, Hash, ToggleLeft, ChevronDown, ChevronRight,
  Settings, Zap, AlertTriangle, Loader2,
} from "lucide-react";
import { useExecutionStore } from "@/stores/executionStore";
import { useManifestStore } from "@/stores/manifestStore";
import { useFlowStore } from "@/stores/flowStore";
import { getCategoryStyle, getNodeIcon, getPortColor } from "@/lib/nodeColors";
import { NodeIcon } from "@/components/nodes/NodeIcon";

interface Props {
  nodeId: string | null;
  nodeType: string | null;
  onClose: () => void;
}

function isBase64Image(val: unknown): val is string {
  return typeof val === "string" && val.startsWith("data:image");
}

function isImagePath(val: unknown): val is string {
  return typeof val === "string" && /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(val);
}

function CopyBtn({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text ?? "");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded transition-colors hover:bg-pink-50 flex-shrink-0"
      style={{ color: copied ? "var(--color-success)" : "var(--color-text-muted)" }}
      title="Copy"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

function TypeIcon({ type }: { type: string }) {
  const t = type.toUpperCase();
  const color = getPortColor(type);
  if (t === "IMAGE") return <Image size={11} style={{ color }} />;
  if (t === "JSON") return <Braces size={11} style={{ color }} />;
  if (t === "INT" || t === "FLOAT") return <Hash size={11} style={{ color }} />;
  if (t === "BOOL") return <ToggleLeft size={11} style={{ color }} />;
  return <FileText size={11} style={{ color }} />;
}

/** Format a value for display */
function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "(null)";
  if (typeof val === "string") return val || "(empty)";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

/** Render a value with type-aware display */
function ValueDisplay({ value, type }: { value: unknown; type: string }) {
  const [expanded, setExpanded] = useState(true);
  const t = type.toUpperCase();

  // Image
  if (t === "IMAGE" || isBase64Image(value) || isImagePath(value)) {
    if (isBase64Image(value)) {
      return (
        <div>
          <img src={value} alt="output"
            className="w-full rounded-lg border cursor-pointer"
            style={{ borderColor: "var(--color-border)", maxHeight: 400 }}
            onClick={() => window.open(value, "_blank")} />
          <span className="text-[9px] mt-1 block" style={{ color: "var(--color-text-muted)" }}>
            Click to open full size
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <Image size={14} style={{ color: getPortColor(type), flexShrink: 0 }} />
        <span className="text-[11px] font-mono truncate flex-1" style={{ color: "var(--color-text)" }}>
          {String(value)}
        </span>
        <CopyBtn value={value} />
      </div>
    );
  }

  // JSON / Object / Array
  if (t === "JSON" || (typeof value === "object" && value !== null)) {
    const text = JSON.stringify(value, null, 2);
    const lines = text.split("\n").length;
    return (
      <div>
        {lines > 5 && (
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mb-1 text-[10px]"
            style={{ color: "var(--color-text-muted)" }}>
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {expanded ? "Collapse" : `Expand (${lines} lines)`}
          </button>
        )}
        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all font-mono rounded-lg p-3 overflow-auto"
          style={{ background: "var(--color-canvas)", color: "var(--color-text)",
            border: "1px solid var(--color-border-light)", maxHeight: expanded ? 400 : 100 }}>
          {text}
        </pre>
      </div>
    );
  }

  // Boolean
  if (t === "BOOL" || typeof value === "boolean") {
    const b = Boolean(value);
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: b ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.15)" }}>
          {b ? <Check size={12} style={{ color: "var(--color-success)" }} />
             : <X size={12} style={{ color: "var(--color-error)" }} />}
        </div>
        <span className="text-[13px] font-semibold"
          style={{ color: b ? "var(--color-success)" : "var(--color-error)" }}>
          {String(b)}
        </span>
      </div>
    );
  }

  // Number
  if (t === "INT" || t === "FLOAT" || typeof value === "number") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <span className="text-[15px] font-mono font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
          {String(value)}
        </span>
      </div>
    );
  }

  // String (default)
  const str = String(value ?? "");
  return (
    <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono rounded-lg p-3 overflow-auto"
      style={{ background: "var(--color-canvas)", color: "var(--color-text)",
        border: "1px solid var(--color-border-light)", maxHeight: 300 }}>
      {str || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>(empty)</span>}
    </pre>
  );
}

/** A single port card (input or output) */
function PortCard({ name, type, value }: { name: string; type: string; value: unknown }) {
  const color = getPortColor(type);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-light)" }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: color + "08", borderBottom: "1px solid var(--color-border-light)" }}>
        <div className="flex items-center gap-2">
          <TypeIcon type={type} />
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-text)" }}>{name}</span>
          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
            style={{ color, background: color + "15" }}>
            {type.toLowerCase()}
          </span>
        </div>
        <CopyBtn value={value} />
      </div>
      <div className="p-3">
        {value !== undefined && value !== null
          ? <ValueDisplay value={value} type={type} />
          : <span className="text-[11px] italic" style={{ color: "var(--color-text-muted)" }}>(not connected)</span>}
      </div>
    </div>
  );
}


export function OutputDetailPanel({ nodeId, nodeType, onClose }: Props) {
  const nodeState = useExecutionStore((s) => nodeId ? s.nodeStates[nodeId] : null);
  const manifest = useManifestStore((s) => nodeType ? s.byType[nodeType] : null);
  const node = useFlowStore((s) => nodeId ? s.nodes.find((n) => n.id === nodeId) : null);

  if (!nodeId) return null;

  const catStyle = getCategoryStyle(manifest?.category);
  const iconName = getNodeIcon(nodeType ?? "", manifest?.category);

  const status = nodeState?.status ?? "idle";
  const isError = status === "error";
  const isDone = status === "done";
  const isRunning = status === "running";
  const isIdle = status === "idle";

  // Port definitions
  const inputDefs = manifest?.inputs ?? [];
  const outputDefs = manifest?.outputs ?? [];

  // Actual output values
  const outputs = nodeState?.outputs ?? {};
  const outputEntries = Object.entries(outputs).filter(([k]) => !k.startsWith("_"));

  // Internal display values
  const rawPreview = outputs["_preview_image"] ?? outputs["_display_image"];
  const previewImage: string | null = isBase64Image(rawPreview) ? rawPreview : null;
  const displayText: string | null = typeof outputs["_display"] === "string" ? outputs["_display"] : null;

  // Node config
  const nodeData = node ? (node.data as Record<string, unknown>) : null;
  const config = (nodeData?.config ?? {}) as Record<string, unknown>;

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col animate-slide-in-right"
        style={{ width: 460, background: "var(--color-panel)", borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)" }}
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-pink-50"
              style={{ color: "var(--color-text-muted)" }}>
              <X size={16} />
            </button>
            <div className="flex items-center gap-2">
              {nodeState?.ms != null && (
                <span className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-text-muted)", background: "var(--color-canvas)" }}>
                  <Clock size={10} /> {nodeState.ms}ms
                </span>
              )}
              {isRunning && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-running)", background: "rgba(52,152,219,0.1)" }}>
                  <Loader2 size={10} className="animate-spin" /> Running
                </span>
              )}
              {isDone && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-success)", background: "rgba(46,204,113,0.1)" }}>
                  <CheckCircle2 size={10} /> Success
                </span>
              )}
              {isError && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-error)", background: "rgba(231,76,60,0.1)" }}>
                  <AlertCircle size={10} /> Error
                </span>
              )}
              {isIdle && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-text-muted)", background: "var(--color-canvas)" }}>
                  Not executed
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: catStyle.bg }}>
              <NodeIcon name={iconName} size={20} color={catStyle.color} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
                {manifest?.label ?? nodeType}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: catStyle.color }}>
                {manifest?.category ?? ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Error Section */}
          {isError && nodeState?.errorMsg && (
            <section>
              <div className="text-[11px] font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "var(--color-error)" }}>
                <AlertTriangle size={12} /> Error
              </div>
              <div className="rounded-xl p-4"
                style={{ background: "rgba(231,76,60,0.04)", border: "1px solid rgba(231,76,60,0.12)" }}>
                <div className="flex justify-end mb-1">
                  <CopyBtn value={nodeState.errorMsg} />
                </div>
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                  style={{ color: "var(--color-error)" }}>
                  {nodeState.errorMsg}
                </pre>
              </div>
            </section>
          )}

          {/* Image Preview */}
          {previewImage !== null && (
            <section>
              <div className="text-[11px] font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}>
                <Image size={11} /> Preview
              </div>
              <img src={previewImage} alt="preview"
                className="w-full rounded-xl border cursor-pointer"
                style={{ borderColor: "var(--color-border)", maxHeight: 300 }}
                onClick={() => window.open(previewImage, "_blank")} />
            </section>
          )}

          {/* Display Text */}
          {displayText !== null && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5"
                  style={{ color: "var(--color-text-muted)" }}>
                  <FileText size={11} /> Display
                </span>
                <CopyBtn value={displayText} />
              </div>
              <pre className="text-[12px] leading-relaxed whitespace-pre-wrap break-words rounded-xl p-3 font-mono"
                style={{ background: "var(--color-canvas)", color: "var(--color-text)",
                  border: "1px solid var(--color-border-light)" }}>
                {displayText}
              </pre>
            </section>
          )}

          {/* Output Ports */}
          {outputEntries.length > 0 && (
            <section>
              <div className="text-[11px] font-bold mb-3 uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}>
                <Zap size={11} /> Outputs ({outputEntries.length})
              </div>
              <div className="space-y-2.5">
                {outputEntries.map(([key, value]) => {
                  const portType = outputDefs.find((p) => p.name === key)?.type
                    ?? (typeof value === "number" ? "FLOAT" : typeof value === "boolean" ? "BOOL" : "STRING");
                  return <PortCard key={key} name={key} type={portType} value={value} />;
                })}
              </div>
            </section>
          )}

          {/* Input Ports (show what this node received) */}
          {inputDefs.length > 0 && isDone && (
            <section>
              <div className="text-[11px] font-bold mb-3 uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}>
                <Settings size={11} /> Inputs Received
              </div>
              <div className="space-y-2">
                {inputDefs.map((p) => {
                  // Try to find what value this input received (from execution outputs of upstream)
                  // We don't have this data directly, so show port definition
                  return (
                    <div key={p.name} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
                      <TypeIcon type={p.type} />
                      <span className="text-[11px] font-medium" style={{ color: "var(--color-text)" }}>
                        {p.label}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded"
                        style={{ color: getPortColor(p.type), background: getPortColor(p.type) + "15" }}>
                        {p.type.toLowerCase()}
                      </span>
                      {p.optional && (
                        <span className="text-[9px] italic" style={{ color: "var(--color-text-muted)" }}>optional</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Node Config (always shown) */}
          {Object.keys(config).length > 0 && (
            <section>
              <div className="text-[11px] font-bold mb-3 uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}>
                <Settings size={11} /> Configuration
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-light)" }}>
                {Object.entries(config).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2"
                    style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                    <span className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      {key}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-right max-w-[200px] truncate"
                        style={{ color: "var(--color-text)" }}>
                        {typeof value === "string" && value.length > 30
                          ? value.slice(0, 30) + "..."
                          : formatValue(value)}
                      </span>
                      <CopyBtn value={value} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty: no execution, no config */}
          {isIdle && outputEntries.length === 0 && Object.keys(config).length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "var(--color-canvas)" }}>
                <FileText size={20} style={{ color: "var(--color-text-muted)" }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                No data yet
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
                Run the workflow or right-click → Run to here
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}>
          <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
            {nodeId?.slice(0, 16)}
          </span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            {nodeType} · {outputEntries.length} outputs
          </span>
        </div>
      </div>
    </>
  );
}
