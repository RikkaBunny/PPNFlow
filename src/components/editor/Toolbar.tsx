/**
 * Toolbar — n8n style minimal top bar.
 * Left: back + workflow name
 * Right: execution controls + save/load
 */
import {
  Play,
  Square,
  Save,
  FolderOpen,
  Settings,
  Repeat,
} from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useExecution } from "@/hooks/useExecution";
import { useExecutionStore } from "@/stores/executionStore";
import clsx from "clsx";

interface Props {
  onSave: () => void;
  onLoad: () => void;
  onOpenSettings: () => void;
}

export function Toolbar({ onSave, onLoad, onOpenSettings }: Props) {
  const { run, stop, isRunning } = useExecution();
  const loopIteration = useExecutionStore((s) => s.loopIteration);
  const settings = useFlowStore((s) => s.settings);
  const updateSettings = useFlowStore((s) => s.updateSettings);
  const workflowName = useFlowStore((s) => s.workflowName);
  const setWorkflowName = useFlowStore((s) => s.setWorkflowName);
  const isLoop = settings.run_mode === "loop";

  return (
    <div
      className="h-[52px] flex items-center px-4 gap-3 select-none"
      style={{
        background: "var(--color-panel)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Left: Logo + workflow name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Logo */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #ff6d5a, #ff3b8d)" }}
        >
          <span className="text-white text-[11px] font-black">P</span>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-white/8" />

        {/* Workflow name */}
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent text-[15px] font-medium text-white/80 outline-none
                     placeholder:text-white/20 min-w-[80px] max-w-[280px] truncate
                     hover:text-white focus:text-white transition-colors"
          placeholder="Untitled Workflow"
        />
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Loop toggle */}
        <button
          onClick={() => updateSettings({ run_mode: isLoop ? "once" : "loop" })}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
            isLoop
              ? "bg-purple-500/15 text-purple-400 border border-purple-500/25"
              : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
          )}
        >
          <Repeat size={13} />
          <span>{isLoop ? "Loop" : "Once"}</span>
        </button>

        {/* Loop counter */}
        {isRunning && isLoop && loopIteration > 0 && (
          <span className="text-purple-400/60 text-[11px] tabular-nums">
            #{loopIteration}
          </span>
        )}

        {/* Separator */}
        <div className="w-px h-5 bg-white/8" />

        {/* Save / Load */}
        <IconBtn onClick={onSave} title="Save">
          <Save size={15} />
        </IconBtn>
        <IconBtn onClick={onLoad} title="Open">
          <FolderOpen size={15} />
        </IconBtn>
        <IconBtn onClick={onOpenSettings} title="Settings">
          <Settings size={15} />
        </IconBtn>

        {/* Separator */}
        <div className="w-px h-5 bg-white/8" />

        {/* Run / Stop */}
        {isRunning ? (
          <button
            onClick={stop}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
                       transition-all"
            style={{
              background: "rgba(255,59,92,0.12)",
              color: "#ff3b5c",
              border: "1px solid rgba(255,59,92,0.2)",
            }}
          >
            <Square size={13} />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={run}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
                       transition-all hover:brightness-110"
            style={{
              background: "var(--color-accent)",
              color: "white",
              boxShadow: "0 2px 12px rgba(255,109,90,0.3)",
            }}
          >
            <Play size={13} />
            <span>Execute</span>
          </button>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04]
                 transition-colors"
    >
      {children}
    </button>
  );
}
