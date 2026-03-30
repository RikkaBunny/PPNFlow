import { type ReactNode } from "react";
import clsx from "clsx";
import type { NodeStatus } from "@/types/execution";

interface NodeShellProps {
  label: string;
  category?: string;
  status?: NodeStatus;
  errorMsg?: string;
  ms?: number;
  selected?: boolean;
  children?: ReactNode;
}

const STATUS_COLORS: Record<NonNullable<NodeStatus>, string> = {
  idle:    "border-slate-600 bg-slate-800",
  running: "border-blue-500 bg-blue-950 shadow-lg shadow-blue-900/50",
  done:    "border-green-600 bg-green-950",
  error:   "border-red-600 bg-red-950",
  cached:  "border-slate-500 bg-slate-900",
};

const STATUS_DOT: Record<NonNullable<NodeStatus>, string> = {
  idle:    "bg-slate-500",
  running: "bg-blue-400 animate-pulse",
  done:    "bg-green-400",
  error:   "bg-red-400",
  cached:  "bg-slate-400",
};

export function NodeShell({
  label,
  category,
  status = "idle",
  errorMsg,
  ms,
  selected,
  children,
}: NodeShellProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border-2 min-w-[180px] max-w-[280px] text-white text-xs",
        "transition-colors duration-200 select-none",
        STATUS_COLORS[status],
        selected && "ring-2 ring-white/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/10">
        <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[status])} />
        <span className="font-semibold truncate flex-1">{label}</span>
        {ms !== undefined && status === "done" && (
          <span className="text-slate-400 text-[10px]">{ms}ms</span>
        )}
      </div>

      {/* Body */}
      {children && (
        <div className="px-3 py-2 space-y-1">{children}</div>
      )}

      {/* Error message */}
      {status === "error" && errorMsg && (
        <div className="px-3 pb-2 text-red-300 text-[10px] break-words">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
