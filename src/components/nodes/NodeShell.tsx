import { type ReactNode } from "react";
import clsx from "clsx";
import type { NodeStatus } from "@/types/execution";
import { getCategoryStyle } from "@/lib/nodeColors";

export interface NodeShellProps {
  label: string;
  category?: string;
  status?: NodeStatus;
  errorMsg?: string;
  ms?: number;
  selected?: boolean;
  children?: ReactNode;
}

export function NodeShell({
  label,
  category,
  status = "idle",
  errorMsg,
  ms,
  selected,
  children,
}: NodeShellProps) {
  const style = getCategoryStyle(category);

  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div
      className={clsx(
        "rounded-xl min-w-[200px] max-w-[280px] text-xs select-none",
        "transition-all duration-200",
        isRunning && "node-running",
        selected && "ring-2 ring-white/20 ring-offset-1 ring-offset-transparent"
      )}
      style={{
        background: "#1a1a26",
        border: `1.5px solid ${
          isRunning
            ? "#3b82f6"
            : isError
            ? "#ef4444"
            : isDone
            ? "#22c55e60"
            : selected
            ? style.color + "80"
            : "#2a2a3a"
        }`,
        boxShadow: isRunning
          ? "0 0 20px -4px rgba(59,130,246,0.3)"
          : isError
          ? "0 0 20px -4px rgba(239,68,68,0.2)"
          : "0 4px 24px -4px rgba(0,0,0,0.5)",
      }}
    >
      {/* Category accent stripe (top) */}
      <div
        className="h-[3px] rounded-t-xl"
        style={{ background: style.color }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Status dot */}
        <div
          className={clsx(
            "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors",
            isRunning && "status-dot-running"
          )}
          style={{
            background: isRunning
              ? "#3b82f6"
              : isDone
              ? "#22c55e"
              : isError
              ? "#ef4444"
              : status === "cached"
              ? "#6b7280"
              : style.color + "80",
            boxShadow: isRunning
              ? "0 0 6px rgba(59,130,246,0.5)"
              : isDone
              ? "0 0 6px rgba(34,197,94,0.3)"
              : "none",
          }}
        />

        {/* Label */}
        <span className="font-semibold text-[13px] text-white/90 truncate flex-1">
          {label}
        </span>

        {/* Execution time badge */}
        {ms !== undefined && isDone && (
          <span className="text-[10px] text-white/40 tabular-nums">
            {ms}ms
          </span>
        )}
      </div>

      {/* Separator */}
      <div className="mx-2" style={{ borderTop: "1px solid #2a2a3a" }} />

      {/* Body */}
      {children && (
        <div className="px-3 py-2 space-y-1.5">{children}</div>
      )}

      {/* Error message */}
      {isError && errorMsg && (
        <div className="mx-2 mb-2 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 text-[10px] break-words leading-relaxed">
            {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}
