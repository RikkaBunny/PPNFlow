/**
 * Unified Node Detail Panel — right-side slide-over.
 *
 * Tabs:
 *   Config — edit node configuration (replaces old PropertiesPanel)
 *   Data   — view input/output port values after execution
 *   Error  — full error message when node failed
 *
 * Opens on:
 *   - Click a node → Config tab
 *   - Click an input/output port label → Data tab, scrolled to that port
 *   - Click error "details" below node → Error tab
 *   - Double-click a node → Data tab
 *   - Right-click → View output → Data tab
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Trash2, Copy, Download, Check, Loader2, CircleAlert, AlertCircle,
  Image, FileText, Braces, Hash, ToggleLeft, ChevronDown, ChevronRight,
  Settings, Zap, AlertTriangle, Clock, CheckCircle2, Database,
} from "lucide-react";
import type { ConfigField, SelectOption } from "@/types/node";
import { isTauri } from "@/lib/tauriApi";
import { wsSend, isWsConnected } from "@/lib/wsEngine";
import { useFlowStore } from "@/stores/flowStore";
import { useExecutionStore } from "@/stores/executionStore";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon, getPortColor } from "@/lib/nodeColors";
import { NodeIcon } from "@/components/nodes/NodeIcon";

export type DetailTab = "config" | "data" | "error";

export interface DetailPanelState {
  nodeId: string;
  tab: DetailTab;
  focusPort?: string;  // scroll to this port name on open
}

interface Props {
  state: DetailPanelState | null;
  onClose: () => void;
  onDeleteNode: (id: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function isBase64Image(val: unknown): val is string {
  return typeof val === "string" && val.startsWith("data:image");
}

function CopyBtn({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded transition-colors hover-bg flex-shrink-0"
      style={{ color: copied ? "var(--color-success)" : "var(--color-text-muted)" }}
      title="Copy">
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

function ValueDisplay({ value, type }: { value: unknown; type: string }) {
  const [expanded, setExpanded] = useState(true);
  const t = type.toUpperCase();

  if (t === "IMAGE" || isBase64Image(value)) {
    if (isBase64Image(value)) {
      const openFullSize = () => {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(`<!DOCTYPE html><html><head><title>Image Preview</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a1a}</style></head><body><img src="${value}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`);
          w.document.close();
        }
      };
      return (
        <div>
          <img src={value} alt="output" className="w-full rounded-lg border cursor-pointer"
            style={{ borderColor: "var(--color-border)", maxHeight: 360 }}
            onClick={openFullSize} />
          <span className="text-[9px] mt-1 block" style={{ color: "var(--color-text-muted)" }}>Click to open full size</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <Image size={14} style={{ color: getPortColor(type), flexShrink: 0 }} />
        <span className="text-[11px] font-mono truncate flex-1" style={{ color: "var(--color-text)" }}>{String(value)}</span>
        <CopyBtn value={value} />
      </div>
    );
  }

  if (t === "JSON" || (typeof value === "object" && value !== null)) {
    const text = JSON.stringify(value, null, 2);
    const lines = text.split("\n").length;
    return (
      <div>
        {lines > 5 && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mb-1 text-[10px]"
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

  if (t === "BOOL" || typeof value === "boolean") {
    const b = Boolean(value);
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "var(--color-canvas)", border: "1px solid var(--color-border-light)" }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: b ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }}>
          {b ? <Check size={12} style={{ color: "var(--color-success)" }} />
             : <X size={12} style={{ color: "var(--color-error)" }} />}
        </div>
        <span className="text-[13px] font-semibold" style={{ color: b ? "var(--color-success)" : "var(--color-error)" }}>
          {String(b)}
        </span>
      </div>
    );
  }

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

  const str = String(value ?? "");
  return (
    <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono rounded-lg p-3 overflow-auto"
      style={{ background: "var(--color-canvas)", color: "var(--color-text)",
        border: "1px solid var(--color-border-light)", maxHeight: 300 }}>
      {str || <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>(empty)</span>}
    </pre>
  );
}

function PortCard({ name, type, value, id }: { name: string; type: string; value: unknown; id?: string }) {
  const color = getPortColor(type);
  return (
    <div id={id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-light)" }}>
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: color + "08", borderBottom: "1px solid var(--color-border-light)" }}>
        <div className="flex items-center gap-2">
          <TypeIcon type={type} />
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-text)" }}>{name}</span>
          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
            style={{ color, background: color + "15" }}>{type.toLowerCase()}</span>
        </div>
        <CopyBtn value={value} />
      </div>
      <div className="p-3">
        {value !== undefined && value !== null
          ? <ValueDisplay value={value} type={type} />
          : <span className="text-[11px] italic" style={{ color: "var(--color-text-muted)" }}>(no data)</span>}
      </div>
    </div>
  );
}


// ── Main Component ──────────────────────────────────────────────

export function NodeDetailPanel({ state, onClose, onDeleteNode }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("config");
  const scrollRef = useRef<HTMLDivElement>(null);

  const nodeId = state?.nodeId ?? null;
  const node = useFlowStore((s) => nodeId ? s.nodes.find((n) => n.id === nodeId) : null);
  const edges = useFlowStore((s) => s.edges);
  const allNodes = useFlowStore((s) => s.nodes);
  const updateConfig = useFlowStore((s) => s.updateNodeConfig);
  const nodeState = useExecutionStore((s) => nodeId ? s.nodeStates[nodeId] : null);
  const allNodeStates = useExecutionStore((s) => s.nodeStates);
  const manifest = useManifestStore((s) => {
    if (!node) return undefined;
    return s.byType[(node.data as Record<string, unknown>).nodeType as string];
  });

  // Switch tab when state changes
  useEffect(() => {
    if (state) {
      setActiveTab(state.tab);
      // Scroll to focused port after render
      if (state.focusPort) {
        setTimeout(() => {
          const el = document.getElementById(`port-${state.focusPort}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [state]);

  if (!state || !nodeId || !node) return null;

  const nodeData = node.data as Record<string, unknown>;
  const nodeType = nodeData.nodeType as string;
  const config = (nodeData.config ?? {}) as Record<string, unknown>;
  const catStyle = getCategoryStyle(manifest?.category);
  const iconName = getNodeIcon(nodeType, manifest?.category);
  const fields: ConfigField[] = manifest?.config_schema ?? [];
  const inputDefs = manifest?.inputs ?? [];
  const outputDefs = manifest?.outputs ?? [];

  const status = nodeState?.status ?? "idle";
  const isError = status === "error";
  const isDone = status === "done";
  const isRunning = status === "running";
  const outputs = nodeState?.outputs ?? {};
  const outputEntries = Object.entries(outputs).filter(([k]) => !k.startsWith("_"));

  // Resolve input values by tracing upstream edges
  const resolveInputValue = (portName: string): { value: unknown; sourceLabel: string } | null => {
    const edge = edges.find((e) => e.target === nodeId && e.targetHandle === portName);
    if (!edge) return null;
    const sourceState = allNodeStates[edge.source];
    if (!sourceState) return null;
    const value = sourceState.outputs[edge.sourceHandle ?? ""];
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    const sourceType = sourceNode ? (sourceNode.data as Record<string, unknown>).nodeType as string : "";
    const sourceManifest = useManifestStore.getState().byType[sourceType];
    return { value, sourceLabel: sourceManifest?.label ?? sourceType };
  };

  const handleChange = (name: string, value: unknown) => {
    updateConfig(nodeId, { [name]: value });
  };

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: "config", label: "Config", icon: <Settings size={12} /> },
    { key: "data", label: "Data", icon: <Database size={12} />,
      badge: outputEntries.length > 0 ? String(outputEntries.length) : undefined },
    ...(isError ? [{ key: "error" as DetailTab, label: "Error", icon: <AlertTriangle size={12} /> }] : []),
  ];

  return (
    <>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col animate-slide-in-right"
        style={{ width: 420, background: "var(--color-panel)", borderLeft: "1px solid var(--color-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)" }}>

        {/* Header */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover-bg"
              style={{ color: "var(--color-text-muted)" }}>
              <X size={16} />
            </button>
            <div className="flex items-center gap-2">
              {nodeState?.ms != null && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ color: "var(--color-text-muted)", background: "var(--color-canvas)" }}>
                  <Clock size={9} /> {nodeState.ms}ms
                </span>
              )}
              {isDone && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ color: "var(--color-success)", background: "rgba(16,185,129,0.1)" }}>
                <CheckCircle2 size={9} /> Done</span>}
              {isRunning && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ color: "var(--color-running)", background: "rgba(59,130,246,0.1)" }}>
                <Loader2 size={9} className="animate-spin" /> Running</span>}
              {isError && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ color: "var(--color-error)", background: "rgba(239,68,68,0.1)" }}>
                <AlertCircle size={9} /> Error</span>}
              <button onClick={() => onDeleteNode(nodeId)}
                className="p-1 rounded-lg transition-colors hover:bg-red-50" style={{ color: "var(--color-text-muted)" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: catStyle.bg }}>
              <NodeIcon name={iconName} size={17} color={catStyle.color} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
                {manifest?.label ?? nodeType}
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: catStyle.color }}>
                {manifest?.category}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  color: activeTab === t.key ? "var(--color-accent)" : "var(--color-text-muted)",
                  background: activeTab === t.key ? "var(--color-accent)" + "10" : "transparent",
                }}>
                {t.icon} {t.label}
                {t.badge && (
                  <span className="text-[9px] px-1 rounded-full"
                    style={{ background: "var(--color-accent)" + "15", color: "var(--color-accent)" }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Config Tab ── */}
          {activeTab === "config" && (
            <>
              {fields.length === 0 && (
                <p className="text-[12px] text-center py-6" style={{ color: "var(--color-text-muted)" }}>
                  No configuration.
                </p>
              )}
              {fields
                .filter((field) => {
                  if (!field.visible_when) return true;
                  const depValue = config[field.visible_when.field];
                  return field.visible_when.values.includes(depValue);
                })
                .map((field) => (
                <div key={field.name}>
                  <label className="block text-[10px] font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}>
                    {field.label}
                  </label>
                  <FieldInput field={field} value={config[field.name] ?? field.default ?? ""}
                    onChange={(v) => handleChange(field.name, v)} />
                </div>
              ))}
            </>
          )}

          {/* ── Data Tab ── */}
          {activeTab === "data" && (
            <>
              {/* Inputs */}
              {inputDefs.length > 0 && (
                <section>
                  <div className="text-[10px] font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: "var(--color-text-muted)" }}>
                    <ChevronRight size={10} /> Inputs ({inputDefs.length})
                  </div>
                  <div className="space-y-2">
                    {inputDefs.map((p) => {
                      const resolved = resolveInputValue(p.name);
                      return (
                        <PortCard key={p.name} id={`port-${p.name}`}
                          name={`${p.label}${resolved ? ` ← ${resolved.sourceLabel}` : ""}`}
                          type={p.type} value={resolved?.value} />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Preview image */}
              {isBase64Image(outputs["_preview_image"] ?? outputs["_display_image"]) && (
                <section>
                  <div className="text-[10px] font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: "var(--color-text-muted)" }}>
                    <Image size={10} /> Preview
                  </div>
                  <img src={(outputs["_preview_image"] ?? outputs["_display_image"]) as string}
                    alt="preview" className="w-full rounded-xl border"
                    style={{ borderColor: "var(--color-border)" }} />
                </section>
              )}

              {/* Outputs */}
              {outputEntries.length > 0 && (
                <section>
                  <div className="text-[10px] font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5"
                    style={{ color: "var(--color-text-muted)" }}>
                    <Zap size={10} /> Outputs ({outputEntries.length})
                  </div>
                  <div className="space-y-2">
                    {outputEntries.map(([key, value]) => {
                      const portType = outputDefs.find((p) => p.name === key)?.type
                        ?? (typeof value === "number" ? "FLOAT" : typeof value === "boolean" ? "BOOL" : "STRING");
                      return <PortCard key={key} id={`port-${key}`} name={key} type={portType} value={value} />;
                    })}
                  </div>
                </section>
              )}

              {/* No data state */}
              {outputEntries.length === 0 && inputDefs.length === 0 && (
                <div className="text-center py-10">
                  <Database size={24} className="mx-auto mb-2" style={{ color: "var(--color-text-muted)", opacity: 0.3 }} />
                  <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                    No data. Run the workflow first.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Error Tab ── */}
          {activeTab === "error" && isError && nodeState?.errorMsg && (
            <div className="rounded-xl p-4"
              style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} style={{ color: "var(--color-error)" }} />
                  <span className="text-[12px] font-bold" style={{ color: "var(--color-error)" }}>Error</span>
                </div>
                <CopyBtn value={nodeState.errorMsg} />
              </div>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                style={{ color: "var(--color-error)" }}>
                {nodeState.errorMsg}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 flex items-center justify-between flex-shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}>
          <span className="text-[9px] font-mono" style={{ color: "var(--color-text-muted)" }}>{nodeId.slice(0, 14)}</span>
          <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>{nodeType}</span>
        </div>
      </div>
    </>
  );
}


// ── Field Input (reused from old PropertiesPanel) ──────────────

function FieldInput({ field, value, onChange }: {
  field: ConfigField; value: unknown; onChange: (v: unknown) => void;
}) {
  const base = `w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors border`;
  const style = { color: "var(--color-text)", background: "var(--color-canvas)", borderColor: "var(--color-border)" };

  if (field.type === "select") {
    const opts = field.options ?? [];
    if (opts.length > 0 && typeof opts[0] === "object") return <PackageSelect field={field} value={value} onChange={onChange} />;
    return (
      <div className="relative">
        <select className={base + " appearance-none cursor-pointer pr-8"} style={style}
          value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {(opts as string[]).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }
  if (field.type === "bool") {
    const checked = Boolean(value);
    return (
      <button onClick={() => onChange(!checked)} className="flex items-center gap-3">
        <div className="w-9 h-5 rounded-full transition-colors relative"
          style={{ background: checked ? "var(--color-accent)" : "var(--color-border)" }}>
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: checked ? 18 : 2 }} />
        </div>
        <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{checked ? "Enabled" : "Disabled"}</span>
      </button>
    );
  }
  if (field.type === "string" && field.multiline)
    return <textarea className={`${base} resize-y min-h-[80px]`} style={style} value={String(value)} placeholder={field.placeholder ?? ""} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "password")
    return <input type="password" className={base} style={style} value={String(value)} placeholder="Enter key..." onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "int" || field.type === "float")
    return <input type="number" className={base + " tabular-nums"} style={style} value={Number(value)} min={field.min} max={field.max}
      step={field.type === "float" ? 0.1 : 1} onChange={(e) => onChange(field.type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value, 10))} />;
  return <input type="text" className={base} style={style} value={String(value)} placeholder={field.placeholder ?? ""} onChange={(e) => onChange(e.target.value)} />;
}


// ── Package Select ──────────────────────────────────────────────

async function checkPkgs(packages: string[]) {
  if (isTauri()) { const { engineApi } = await import("@/lib/tauriApi"); const r = await engineApi.sendCommand("check_packages", { packages }) as any; return r?.result?.installed ?? {}; }
  if (isWsConnected()) { const r = await wsSend("check_packages", { packages }) as any; return r?.installed ?? {}; }
  return {};
}
async function installPkg(pkg: string) {
  if (isTauri()) { const { engineApi } = await import("@/lib/tauriApi"); const r = await engineApi.sendCommand("install_package", { package: pkg }) as any; return r?.result?.success ?? false; }
  if (isWsConnected()) { const r = await wsSend("install_package", { package: pkg }) as any; return r?.success ?? false; }
  return false;
}

function PackageSelect({ field, value, onChange }: { field: ConfigField; value: unknown; onChange: (v: unknown) => void }) {
  const options = (field.options ?? []) as SelectOption[];
  const [installed, setInstalled] = useState<Record<string, boolean | "loading">>({});
  const [installing, setInstalling] = useState<string | null>(null);
  const optKey = options.map((o) => o.package ?? "").join(",");
  useEffect(() => {
    const pkgs = options.filter((o) => o.package).map((o) => o.package!);
    if (pkgs.length === 0) return;
    checkPkgs(pkgs).then(setInstalled).catch(() => {});
  }, [optKey]);  // eslint-disable-line
  const handleInstall = useCallback(async (pkg: string) => {
    setInstalling(pkg); setInstalled((p) => ({ ...p, [pkg]: "loading" }));
    try { const ok = await installPkg(pkg); setInstalled((p) => ({ ...p, [pkg]: ok })); }
    catch { setInstalled((p) => ({ ...p, [pkg]: false })); }
    setInstalling(null);
  }, []);

  return (
    <div className="space-y-1.5">
      {options.map((opt) => {
        const sel = String(value) === opt.value;
        const pkg = opt.package;
        const st = pkg ? installed[pkg] : true;
        return (
          <div key={opt.value} className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-all"
            style={{ background: sel ? "var(--color-accent)12" : "var(--color-canvas)", border: `1.5px solid ${sel ? "var(--color-accent)40" : "var(--color-border-light)"}` }}
            onClick={() => { if (st === true || st === undefined || !pkg) onChange(opt.value); }}>
            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: sel ? "var(--color-accent)" : "var(--color-border)" }}>
              {sel && <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>{opt.label}</div>
              {(opt.description || pkg) && <div className="text-[9px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{opt.description || pkg}</div>}
            </div>
            {pkg && st === true && <Check size={9} style={{ color: "var(--color-success)" }} />}
            {pkg && st === "loading" && <Loader2 size={10} className="animate-spin" style={{ color: "var(--color-running)" }} />}
            {pkg && st === false && (
              <button onClick={(e) => { e.stopPropagation(); handleInstall(pkg); }}
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg"
                style={{ color: "var(--color-accent)", background: "var(--color-accent)10", border: "1px solid var(--color-accent)25" }}
                disabled={installing !== null}>
                <Download size={10} /> Install
              </button>
            )}
            {pkg && st === undefined && <CircleAlert size={10} style={{ color: "var(--color-text-muted)" }} />}
          </div>
        );
      })}
    </div>
  );
}
