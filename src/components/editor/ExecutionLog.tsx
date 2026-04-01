/**
 * Execution log — bottom console bar.
 * Tracks state changes incrementally to avoid duplicate entries.
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
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function ExecutionLog() {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStatesRef = useRef<Record<string, string>>({});
  const isRunning = useExecutionStore((s) => s.isRunning);
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const loopIteration = useExecutionStore((s) => s.loopIteration);

  // Only log NEW state transitions (avoid duplicates)
  useEffect(() => {
    const entries: LogEntry[] = [];
    const prev = prevStatesRef.current;
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      const key = `${nodeId}:${state.status}`;
      if (prev[nodeId] === key) continue; // already logged
      prev[nodeId] = key;
      const short = nodeId.slice(0, 8);
      if (state.status === "running")
        entries.push({ id: key, time: now(), type: "info", message: `[${short}] Executing...` });
      else if (state.status === "done")
        entries.push({ id: key, time: now(), type: "success", message: `[${short}] Done${state.ms ? ` (${state.ms}ms)` : ""}` });
      else if (state.status === "error")
        entries.push({ id: key, time: now(), type: "error", message: `[${short}] ${state.errorMsg ?? "Error"}` });
    }
    if (entries.length > 0) setLogs((p) => [...p, ...entries].slice(-150));
  }, [nodeStates]);

  useEffect(() => {
    if (loopIteration > 0)
      setLogs((p) => [...p, { id: `loop-${loopIteration}`, time: now(), type: "info" as const, message: `── Loop #${loopIteration} ──` }].slice(-150));
  }, [loopIteration]);

  // Clear tracking when execution resets
  useEffect(() => {
    if (!isRunning && Object.keys(nodeStates).length === 0) {
      prevStatesRef.current = {};
    }
  }, [isRunning, nodeStates]);

  useEffect(() => {
    if (scrollRef.current && expanded) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, expanded]);

  const typeColor = {
    info: "var(--color-running)",
    success: "var(--color-success)",
    error: "var(--color-error)",
  };

  return (
    <div className="absolute bottom-0 left-0 right-0" style={{
      background: "var(--color-panel)", borderTop: "1px solid var(--color-border)", zIndex: 4,
    }}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 transition-colors"
        style={{ color: "var(--color-text-muted)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex items-center gap-2">
          <Terminal size={13} />
          <span className="text-[11px] font-medium">Console</span>
          {isRunning && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-running)" }} />
              <span className="text-[10px]" style={{ color: "var(--color-running)" }}>Running</span>
            </span>
          )}
          {logs.length > 0 && (
            <span className="text-[10px] tabular-nums">{logs.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLogs([]); prevStatesRef.current = {}; }}
              className="p-1 rounded transition-colors hover:bg-gray-100">
              <Trash2 size={11} />
            </button>
          )}
          {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </div>
      </button>

      {expanded && (
        <div ref={scrollRef} className="h-[130px] overflow-y-auto px-4 pb-2 font-mono animate-fade-in">
          {logs.length === 0 ? (
            <p className="text-[10px] py-3" style={{ color: "var(--color-text-muted)" }}>
              Execute a workflow to see output.
            </p>
          ) : (
            logs.map((l, i) => (
              <div key={`${l.id}-${i}`} className="flex items-start gap-3 py-px text-[10px] leading-relaxed">
                <span className="tabular-nums flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{l.time}</span>
                <span style={{ color: typeColor[l.type] }}>{l.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
