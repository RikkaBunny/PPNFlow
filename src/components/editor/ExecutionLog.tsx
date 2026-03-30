/**
 * Execution log — n8n style bottom console bar.
 * Collapsible, shows real-time node execution events.
 */
import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Trash2, Terminal } from "lucide-react";
import { useExecutionStore } from "@/stores/executionStore";

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "success" | "error";
  message: string;
}

function now() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ExecutionLog() {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRunning = useExecutionStore((s) => s.isRunning);
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const loopIteration = useExecutionStore((s) => s.loopIteration);

  useEffect(() => {
    const entries: LogEntry[] = [];
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      const short = nodeId.slice(0, 8);
      if (state.status === "running") {
        entries.push({ id: `${nodeId}-run`, time: now(), type: "info", message: `[${short}] Executing...` });
      } else if (state.status === "done") {
        entries.push({ id: `${nodeId}-done`, time: now(), type: "success", message: `[${short}] Done${state.ms ? ` (${state.ms}ms)` : ""}` });
      } else if (state.status === "error") {
        entries.push({ id: `${nodeId}-err`, time: now(), type: "error", message: `[${short}] ${state.errorMsg ?? "Error"}` });
      }
    }
    if (entries.length > 0) setLogs((p) => [...p, ...entries].slice(-150));
  }, [nodeStates]);

  useEffect(() => {
    if (loopIteration > 0) {
      setLogs((p) => [...p, { id: `loop-${loopIteration}`, time: now(), type: "info" as const, message: `── Loop #${loopIteration} ──` }].slice(-150));
    }
  }, [loopIteration]);

  useEffect(() => {
    if (scrollRef.current && expanded) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, expanded]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0"
      style={{
        background: "var(--color-panel)",
        borderTop: "1px solid var(--color-border)",
        zIndex: 4,
      }}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2
                   hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-white/20" />
          <span className="text-[11px] font-medium text-white/30">Console</span>
          {isRunning && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-running)" }} />
              <span className="text-[10px]" style={{ color: "var(--color-running)", opacity: 0.6 }}>Running</span>
            </span>
          )}
          {logs.length > 0 && (
            <span className="text-[10px] text-white/12 tabular-nums">{logs.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLogs([]); }}
              className="p-1 rounded text-white/10 hover:text-white/30 transition-colors"
            >
              <Trash2 size={11} />
            </button>
          )}
          {expanded ? <ChevronDown size={13} className="text-white/15" /> : <ChevronUp size={13} className="text-white/15" />}
        </div>
      </button>

      {expanded && (
        <div ref={scrollRef} className="h-[130px] overflow-y-auto px-4 pb-2 font-mono animate-fade-in">
          {logs.length === 0 ? (
            <p className="text-[10px] text-white/10 py-3">Execute a workflow to see output.</p>
          ) : (
            logs.map((l, i) => (
              <div key={`${l.id}-${i}`} className="flex items-start gap-3 py-px text-[10px] leading-relaxed">
                <span className="text-white/12 tabular-nums flex-shrink-0">{l.time}</span>
                <span className={
                  l.type === "error" ? "text-red-400/60" :
                  l.type === "success" ? "text-emerald-400/60" :
                  "text-blue-400/50"
                }>
                  {l.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
