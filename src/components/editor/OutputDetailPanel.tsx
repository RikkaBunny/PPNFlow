/**
 * Output detail panel — right-side slide-over showing full node output.
 * Renders images inline, JSON as formatted trees, text as code blocks.
 */
import { useState } from "react";
import {
  X, Clock, AlertCircle, CheckCircle2, Copy, Check,
  Image, FileText, Braces, Hash, ToggleLeft, ChevronDown, ChevronRight,
} from "lucide-react";
import { useExecutionStore } from "@/stores/executionStore";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon, getPortColor } from "@/lib/nodeColors";
import { NodeIcon } from "@/components/nodes/NodeIcon";

interface Props {
  nodeId: string | null;
  nodeType: string | null;
  onClose: () => void;
}

/** Check if a string looks like a base64 image data URI */
function isBase64Image(val: unknown): val is string {
  return typeof val === "string" && val.startsWith("data:image");
}

/** Check if a string looks like an image file path */
function isImagePath(val: unknown): val is string {
  if (typeof val !== "string") return false;
  return /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/i.test(val);
}

/** Tiny copy button with feedback */
function CopyBtn({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded transition-colors hover:bg-pink-50"
      style={{ color: copied ? "var(--color-success)" : "var(--color-text-muted)" }}
      title="Copy"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

/** Type icon for a port */
function TypeIcon({ type }: { type: string }) {
  const t = type.toUpperCase();
  const color = getPortColor(type);
  if (t === "IMAGE") return <Image size={11} style={{ color }} />;
  if (t === "JSON") return <Braces size={11} style={{ color }} />;
  if (t === "INT" || t === "FLOAT") return <Hash size={11} style={{ color }} />;
  if (t === "BOOL") return <ToggleLeft size={11} style={{ color }} />;
  return <FileText size={11} style={{ color }} />;
}

/** Render a single output value based on its type */
function OutputValue({ portName, portType, value }: {
  portName: string;
  portType: string;
  value: unknown;
}) {
  const [expanded, setExpanded] = useState(true);
  const type = portType.toUpperCase();
  const color = getPortColor(portType);

  // Image rendering
  if (type === "IMAGE" || isBase64Image(value) || isImagePath(value)) {
    const src = typeof value === "string" ? value : "";
    if (isBase64Image(value)) {
      return (
        <div className="space-y-2">
          <img src={src} alt={portName}
            className="w-full rounded-xl border cursor-pointer"
            style={{ borderColor: "var(--color-border)", maxHeight: 400 }}
            onClick={() => window.open(src, "_blank")}
          />
          <div className="flex items-center justify-between">
            <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
              Click image to open full size
            </span>
            <CopyBtn value={value} />
          </div>
        </div>
      );
    }
    // File path — show path text
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <Image size={14} style={{ color, flexShrink: 0 }} />
        <span className="text-[11px] font-mono truncate" style={{ color: "var(--color-text)" }}>
          {String(value)}
        </span>
        <CopyBtn value={value} />
      </div>
    );
  }

  // JSON / Object / Array
  if (type === "JSON" || typeof value === "object") {
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
        <pre
          className="text-[11px] leading-relaxed whitespace-pre-wrap break-all font-mono rounded-xl p-3 overflow-auto"
          style={{
            background: "var(--color-canvas)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border-light)",
            maxHeight: expanded ? 400 : 120,
          }}
        >
          {text}
        </pre>
      </div>
    );
  }

  // Boolean
  if (type === "BOOL" || typeof value === "boolean") {
    const boolVal = Boolean(value);
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: boolVal ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.15)" }}>
          {boolVal
            ? <Check size={12} style={{ color: "var(--color-success)" }} />
            : <X size={12} style={{ color: "var(--color-error)" }} />}
        </div>
        <span className="text-[13px] font-semibold"
          style={{ color: boolVal ? "var(--color-success)" : "var(--color-error)" }}>
          {String(boolVal)}
        </span>
      </div>
    );
  }

  // Number
  if (type === "INT" || type === "FLOAT" || typeof value === "number") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <span className="text-[15px] font-mono font-bold tabular-nums"
          style={{ color: "var(--color-text)" }}>
          {String(value)}
        </span>
      </div>
    );
  }

  // String (default)
  const strVal = String(value ?? "");
  return (
    <pre
      className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono rounded-xl p-3 overflow-auto"
      style={{
        background: "var(--color-canvas)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border-light)",
        maxHeight: 300,
      }}
    >
      {strVal || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>(empty)</span>}
    </pre>
  );
}


export function OutputDetailPanel({ nodeId, nodeType, onClose }: Props) {
  const nodeState = useExecutionStore((s) => nodeId ? s.nodeStates[nodeId] : null);
  const manifest = useManifestStore((s) => nodeType ? s.byType[nodeType] : null);

  if (!nodeId || !nodeState) return null;

  const catStyle = getCategoryStyle(manifest?.category);
  const iconName = getNodeIcon(nodeType ?? "", manifest?.category);
  const isError = nodeState.status === "error";
  const isDone = nodeState.status === "done";

  // Build port definitions map for type info
  const portDefs = new Map<string, string>();
  for (const p of manifest?.outputs ?? []) {
    portDefs.set(p.name, p.type);
  }

  // All outputs including internal ones for images
  const allOutputs = nodeState.outputs;
  const rawPreview = allOutputs["_preview_image"] ?? allOutputs["_display_image"];
  const previewImage: string | null = isBase64Image(rawPreview) ? rawPreview : null;
  const displayText: string | null = typeof allOutputs["_display"] === "string" ? allOutputs["_display"] : null;

  // User-facing outputs (non-internal)
  const outputEntries = Object.entries(allOutputs).filter(([k]) => !k.startsWith("_"));

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col animate-slide-in-right"
        style={{
          width: 440,
          background: "var(--color-panel)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-pink-50"
              style={{ color: "var(--color-text-muted)" }}>
              <X size={16} />
            </button>
            <div className="flex items-center gap-2">
              {isDone && nodeState.ms != null && (
                <span className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-text-muted)", background: "var(--color-canvas)" }}>
                  <Clock size={10} />
                  {nodeState.ms}ms
                </span>
              )}
              {isDone && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-success)", background: "rgba(46,204,113,0.1)" }}>
                  <CheckCircle2 size={10} />
                  Success
                </span>
              )}
              {isError && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: "var(--color-error)", background: "rgba(231,76,60,0.1)" }}>
                  <AlertCircle size={10} />
                  Error
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
              <span className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: catStyle.color }}>
                {manifest?.category ?? ""} — Output Details
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Error */}
          {isError && nodeState.errorMsg && (
            <div className="rounded-xl p-4" style={{ background: "rgba(231,76,60,0.05)", border: "1px solid rgba(231,76,60,0.15)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} style={{ color: "var(--color-error)" }} />
                  <span className="text-[12px] font-bold" style={{ color: "var(--color-error)" }}>Error Message</span>
                </div>
                <CopyBtn value={nodeState.errorMsg} />
              </div>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                style={{ color: "var(--color-error)" }}>
                {nodeState.errorMsg}
              </pre>
            </div>
          )}

          {/* Internal image preview */}
          {previewImage !== null && (
            <div>
              <div className="text-[11px] font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}>
                <Image size={11} />
                Preview
              </div>
              <img src={previewImage} alt="preview"
                className="w-full rounded-xl border cursor-pointer"
                style={{ borderColor: "var(--color-border)", maxHeight: 300 }}
                onClick={() => window.open(previewImage, "_blank")} />
            </div>
          )}

          {/* Internal display text */}
          {displayText !== null && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5"
                  style={{ color: "var(--color-text-muted)" }}>
                  <FileText size={11} />
                  Display
                </span>
                <CopyBtn value={displayText} />
              </div>
              <pre className="text-[12px] leading-relaxed whitespace-pre-wrap break-words rounded-xl p-3 font-mono"
                style={{ background: "var(--color-canvas)", color: "var(--color-text)", border: "1px solid var(--color-border-light)" }}>
                {displayText}
              </pre>
            </div>
          )}

          {/* Output Ports */}
          {outputEntries.length > 0 && (
            <div>
              <div className="text-[11px] font-bold mb-3 uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}>
                Output Ports ({outputEntries.length})
              </div>
              <div className="space-y-3">
                {outputEntries.map(([key, value]) => {
                  const portType = portDefs.get(key) ?? (typeof value === "number" ? "FLOAT" : typeof value === "boolean" ? "BOOL" : "STRING");
                  const color = getPortColor(portType);
                  return (
                    <div key={key} className="rounded-xl overflow-hidden"
                      style={{ border: "1px solid var(--color-border-light)" }}>
                      {/* Port header */}
                      <div className="flex items-center justify-between px-3 py-2"
                        style={{ background: color + "08", borderBottom: "1px solid var(--color-border-light)" }}>
                        <div className="flex items-center gap-2">
                          <TypeIcon type={portType} />
                          <span className="text-[12px] font-semibold" style={{ color: "var(--color-text)" }}>
                            {key}
                          </span>
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ color, background: color + "15" }}>
                            {portType.toLowerCase()}
                          </span>
                        </div>
                        <CopyBtn value={value} />
                      </div>
                      {/* Port value */}
                      <div className="p-3">
                        <OutputValue portName={key} portType={portType} value={value} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isError && outputEntries.length === 0 && previewImage === null && displayText === null && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "var(--color-canvas)" }}>
                <FileText size={20} style={{ color: "var(--color-text-muted)" }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                No output yet
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
                Run the workflow or right-click → Run to here
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}>
          <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
            {nodeId?.slice(0, 16)}
          </span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            {outputEntries.length} ports
          </span>
        </div>
      </div>
    </>
  );
}
