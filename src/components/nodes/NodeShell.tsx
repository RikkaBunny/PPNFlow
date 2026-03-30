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
      {/* Status badge */}
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
      <div className="flex items-center gap-0">
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-l-[11px]"
          style={{
            background: iconBg,
            width: 44,
            height: 44,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0 px-3 py-2.5">
          <span className="text-[13px] font-semibold truncate block leading-tight"
            style={{ color: "var(--color-text)" }}>
            {label}
          </span>
        </div>
      </div>

      {/* Body */}
      {children && (
        <div className="px-3 pb-2.5 pt-0.5 space-y-1.5"
          style={{ borderTop: "1px solid var(--color-border-light)" }}>
          {children}
        </div>
      )}

      {/* Error */}
      {isError && errorMsg && (
        <div className="px-3 pb-2" style={{ borderTop: "1px solid rgba(231,76,60,0.15)" }}>
          <p className="text-[10px] leading-relaxed mt-1.5 break-words" style={{ color: "var(--color-error)" }}>
            {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}
