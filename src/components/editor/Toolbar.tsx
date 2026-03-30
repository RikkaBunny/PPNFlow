import { Play, Square, RotateCcw, Save, FolderOpen, Settings } from "lucide-react";
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
  const loopIteration  = useExecutionStore((s) => s.loopIteration);
  const settings       = useFlowStore((s) => s.settings);
  const updateSettings = useFlowStore((s) => s.updateSettings);
  const workflowName   = useFlowStore((s) => s.workflowName);
  const isLoop         = settings.run_mode === "loop";

  return (
    <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-3 gap-2">
      {/* App name */}
      <span className="text-slate-400 text-sm font-bold mr-2">PPNFlow</span>
      <span className="text-slate-500 text-xs truncate max-w-[120px]">{workflowName}</span>

      <div className="flex-1" />

      {/* Loop toggle */}
      <button
        onClick={() => updateSettings({ run_mode: isLoop ? "once" : "loop" })}
        className={clsx(
          "px-2 py-1 rounded text-xs transition-colors",
          isLoop
            ? "bg-purple-600 text-white"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
        )}
        title="Toggle loop mode"
      >
        {isLoop ? "Loop" : "Once"}
      </button>

      {/* Loop iteration counter */}
      {isRunning && isLoop && loopIteration > 0 && (
        <span className="text-blue-300 text-xs">#{loopIteration}</span>
      )}

      {/* Run / Stop */}
      {isRunning ? (
        <ToolbarBtn onClick={stop} title="Stop" variant="danger">
          <Square size={14} />
          <span>Stop</span>
        </ToolbarBtn>
      ) : (
        <ToolbarBtn onClick={run} title="Run" variant="primary">
          <Play size={14} />
          <span>Run</span>
        </ToolbarBtn>
      )}

      <div className="w-px h-5 bg-slate-700 mx-1" />

      <ToolbarBtn onClick={onSave}   title="Save workflow">   <Save size={14} /></ToolbarBtn>
      <ToolbarBtn onClick={onLoad}   title="Load workflow">   <FolderOpen size={14} /></ToolbarBtn>
      <ToolbarBtn onClick={onOpenSettings} title="Settings">  <Settings size={14} /></ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  variant = "default",
  children,
}: {
  onClick: () => void;
  title: string;
  variant?: "default" | "primary" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
        variant === "primary" && "bg-green-600 hover:bg-green-500 text-white",
        variant === "danger"  && "bg-red-600 hover:bg-red-500 text-white",
        variant === "default" && "bg-slate-700 hover:bg-slate-600 text-slate-300"
      )}
    >
      {children}
    </button>
  );
}
