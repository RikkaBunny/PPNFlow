/**
 * Output detail panel — right-side slide-over showing full node output.
 */
import { X, Clock, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { useExecutionStore } from "@/stores/executionStore";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon } from "@/lib/nodeColors";
import { NodeIcon } from "@/components/nodes/NodeIcon";

interface Props {
  nodeId: string | null;
  nodeType: string | null;
  onClose: () => void;
}

export function OutputDetailPanel({ nodeId, nodeType, onClose }: Props) {
  const nodeState = useExecutionStore((s) => nodeId ? s.nodeStates[nodeId] : null);
  const manifest = useManifestStore((s) => nodeType ? s.byType[nodeType] : null);

  if (!nodeId || !nodeState) return null;

  const catStyle = getCategoryStyle(manifest?.category);
  const iconName = getNodeIcon(nodeType ?? "", manifest?.category);
  const isError = nodeState.status === "error";
  const isDone = nodeState.status === "done";

  // Build output entries
  const outputEntries = Object.entries(nodeState.outputs).filter(
    ([k]) => !k.startsWith("_")
  );
  const previewImage = nodeState.outputs["_preview_image"] as string | undefined
    ?? nodeState.outputs["_display_image"] as string | undefined;
  const displayText = nodeState.outputs["_display"] as string | undefined;

  const copyValue = (val: unknown) => {
    const text = typeof val === "string" ? val : JSON.stringify(val, null, 2);
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col animate-slide-in-right"
        style={{
          width: 420,
          background: "var(--color-panel)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-pink-50"
              style={{ color: "var(--color-text-muted)" }}>
              <X size={16} />
            </button>
            <div className="flex items-center gap-2">
              {isDone && nodeState.ms != null && (
                <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full"
                  style={{ color: "var(--color-text-muted)", background: "var(--color-canvas)" }}>
                  <Clock size={10} />
                  {nodeState.ms}ms
                </span>
              )}
              {isDone && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                  style={{ color: "var(--color-success)", background: "rgba(46,204,113,0.1)" }}>
                  <CheckCircle2 size={10} />
                  Done
                </span>
              )}
              {isError && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
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
                {manifest?.label ?? nodeType} — Output
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: catStyle.color }}>
                {manifest?.category ?? ""}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Error message */}
          {isError && nodeState.errorMsg && (
            <div className="rounded-xl p-3" style={{ background: "rgba(231,76,60,0.06)", border: "1px solid rgba(231,76,60,0.15)" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle size={13} style={{ color: "var(--color-error)" }} />
                <span className="text-[12px] font-semibold" style={{ color: "var(--color-error)" }}>Error</span>
              </div>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                style={{ color: "var(--color-error)" }}>
                {nodeState.errorMsg}
              </pre>
            </div>
          )}

          {/* Image preview */}
          {previewImage && (
            <div>
              <div className="text-[11px] font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                Preview
              </div>
              <img src={previewImage} alt="output" className="w-full rounded-xl border"
                style={{ borderColor: "var(--color-border)" }} />
            </div>
          )}

          {/* Display text */}
          {displayText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Display
                </span>
                <button onClick={() => copyValue(displayText)}
                  className="p-1 rounded transition-colors hover:bg-pink-50" style={{ color: "var(--color-text-muted)" }}>
                  <Copy size={11} />
                </button>
              </div>
              <pre className="text-[12px] leading-relaxed whitespace-pre-wrap break-words rounded-xl p-3 font-mono"
                style={{ background: "var(--color-canvas)", color: "var(--color-text)", border: "1px solid var(--color-border-light)" }}>
                {displayText}
              </pre>
            </div>
          )}

          {/* Output ports */}
          {outputEntries.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                Output Ports
              </div>
              <div className="space-y-2">
                {outputEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl p-3"
                    style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold" style={{ color: "var(--color-text)" }}>{key}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ color: "var(--color-text-muted)", background: "var(--color-border-light)" }}>
                          {typeof value}
                        </span>
                        <button onClick={() => copyValue(value)}
                          className="p-0.5 rounded transition-colors hover:bg-pink-50" style={{ color: "var(--color-text-muted)" }}>
                          <Copy size={10} />
                        </button>
                      </div>
                    </div>
                    <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all font-mono max-h-40 overflow-auto"
                      style={{ color: "var(--color-text-secondary)" }}>
                      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isError && outputEntries.length === 0 && !previewImage && !displayText && (
            <div className="text-center py-8">
              <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                No output yet. Run the workflow first.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center" style={{ borderTop: "1px solid var(--color-border)" }}>
          <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
            {nodeId?.slice(0, 12)}...
          </span>
        </div>
      </div>
    </>
  );
}
