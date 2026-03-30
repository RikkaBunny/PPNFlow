import { type ReactNode } from "react";
import clsx from "clsx";
import { Check, X, Loader2 } from "lucide-react";
import type { NodeStatus } from "@/types/execution";

export interface NodeShellProps {
  label: string;
  icon: ReactNode;
  iconBg: string;
  status?: NodeStatus;
  errorMsg?: string;
  ms?: number;
  selected?: boolean;
  children?: ReactNode;
}

export function NodeShell({
  label,
  icon,
  iconBg,
  status = "idle",
  errorMsg,
  selected,
  children,
}: NodeShellProps) {
  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div
      className={clsx(
        "ppn-node",
        selected && "ppn-node--selected",
        isRunning && "ppn-node--running",
        isError && "ppn-node--error",
        isDone && "ppn-node--done"
      )}
    >
      {/* Status badge (n8n style: top-right corner) */}
      {isRunning && (
        <div className="ppn-status-badge animate-pulse-ring" style={{ background: "var(--color-running)" }}>
          <Loader2 size={11} className="text-white animate-spin" style={{ animation: "spin 1s linear infinite" }} />
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

      {/* Header: Icon + Title (n8n style) */}
      <div className="flex items-center gap-0">
        {/* Icon area */}
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-l-[9px]"
          style={{
            background: iconBg,
            width: 42,
            height: 42,
          }}
        >
          {icon}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0 px-3 py-2.5">
          <span className="text-[13px] font-medium text-white/90 truncate block leading-tight">
            {label}
          </span>
        </div>
      </div>

      {/* Body (only shown if there's content) */}
      {children && (
        <div className="px-3 pb-2.5 pt-0.5 space-y-1.5 border-t border-white/5">
          {children}
        </div>
      )}

      {/* Error tooltip */}
      {isError && errorMsg && (
        <div className="px-3 pb-2 border-t border-red-500/20">
          <p className="text-[10px] text-red-400/80 leading-relaxed mt-1.5 break-words">
            {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}
