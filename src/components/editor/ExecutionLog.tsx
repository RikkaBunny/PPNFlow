import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useExecutionStore } from "@/stores/executionStore";

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
}

export function ExecutionLog() {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRunning = useExecutionStore((s) => s.isRunning);
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const loopIteration = useExecutionStore((s) => s.loopIteration);

  // Generate log entries from node state changes
  useEffect(() => {
    const entries: LogEntry[] = [];
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      const shortId = nodeId.slice(0, 8);
      const time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      if (state.status === "running") {
        entries.push({
          id: `${nodeId}-running`,
          time,
          type: "info",
          message: `Node ${shortId} executing...`,
        });
      } else if (state.status === "done") {
        entries.push({
          id: `${nodeId}-done`,
          time,
          type: "success",
          message: `Node ${shortId} completed${state.ms ? ` (${state.ms}ms)` : ""}`,
        });
      } else if (state.status === "error") {
        entries.push({
          id: `${nodeId}-error`,
          time,
          type: "error",
          message: `Node ${shortId}: ${state.errorMsg ?? "Unknown error"}`,
        });
      }
    }
    if (entries.length > 0) {
      setLogs((prev) => [...prev, ...entries].slice(-200));
    }
  }, [nodeStates]);

  // Log loop iterations
  useEffect(() => {
    if (loopIteration > 0) {
      const time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLogs((prev) =>
        [
          ...prev,
          {
            id: `loop-${loopIteration}`,
            time,
            type: "info" as const,
            message: `Loop iteration #${loopIteration}`,
          },
        ].slice(-200)
      );
    }
  }, [loopIteration]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, expanded]);

  const typeColor = {
    info: "text-blue-400/70",
    success: "text-emerald-400/70",
    error: "text-red-400/70",
    warning: "text-yellow-400/70",
  };

  return (
    <div
      className="border-t select-none"
      style={{ background: "#13131a", borderColor: "#2a2a3a" }}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-1.5
                   hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-white/30">Console</span>
          {isRunning && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] text-blue-400/60">Running</span>
            </span>
          )}
          {logs.length > 0 && (
            <span className="text-[10px] text-white/15">{logs.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLogs([]);
              }}
              className="p-0.5 rounded text-white/15 hover:text-white/40 transition-colors"
              title="Clear logs"
            >
              <Trash2 size={11} />
            </button>
          )}
          {expanded ? (
            <ChevronDown size={13} className="text-white/20" />
          ) : (
            <ChevronUp size={13} className="text-white/20" />
          )}
        </div>
      </button>

      {/* Log content */}
      {expanded && (
        <div
          ref={scrollRef}
          className="h-[140px] overflow-y-auto px-4 pb-2 font-mono animate-slide-in-up"
        >
          {logs.length === 0 ? (
            <p className="text-[10px] text-white/10 py-2">No logs yet. Run a workflow to see output.</p>
          ) : (
            logs.map((log, i) => (
              <div
                key={`${log.id}-${i}`}
                className="flex items-start gap-3 py-0.5 text-[10px] leading-relaxed"
              >
                <span className="text-white/15 tabular-nums flex-shrink-0">
                  {log.time}
                </span>
                <span className={clsx("flex-shrink-0 uppercase w-12", typeColor[log.type])}>
                  {log.type}
                </span>
                <span className="text-white/40 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
