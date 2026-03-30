import {
  Play,
  Square,
  Save,
  FolderOpen,
  Settings,
  Repeat,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
} from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useExecution } from "@/hooks/useExecution";
import { useExecutionStore } from "@/stores/executionStore";
import clsx from "clsx";

interface Props {
  onSave: () => void;
  onLoad: () => void;
  onOpenSettings: () => void;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

export function Toolbar({
  onSave,
  onLoad,
  onOpenSettings,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
}: Props) {
  const { run, stop, isRunning } = useExecution();
  const loopIteration = useExecutionStore((s) => s.loopIteration);
  const settings = useFlowStore((s) => s.settings);
  const updateSettings = useFlowStore((s) => s.updateSettings);
  const workflowName = useFlowStore((s) => s.workflowName);
  const setWorkflowName = useFlowStore((s) => s.setWorkflowName);
  const isLoop = settings.run_mode === "loop";

  return (
    <div
      className="h-12 flex items-center px-3 gap-1 border-b select-none"
      style={{
        background: "#16161e",
        borderColor: "#2a2a3a",
      }}
    >
      {/* Left section: Logo + panel toggles */}
      <div className="flex items-center gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-black">P</span>
          </div>
          <span className="text-white/80 text-sm font-bold tracking-tight hidden sm:inline">
            PPNFlow
          </span>
        </div>

        <div className="w-px h-5 bg-white/8 mx-1" />

        {/* Toggle panels */}
        <ToolbarIconBtn
          onClick={onToggleLeftPanel}
          tooltip={leftPanelOpen ? "Hide nodes" : "Show nodes"}
        >
          {leftPanelOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </ToolbarIconBtn>
      </div>

      {/* Center: Workflow name */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/8 transition-colors group">
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-sm text-white/80 text-center outline-none
                       placeholder:text-white/20 min-w-[80px] max-w-[200px]
                       group-hover:text-white transition-colors"
            placeholder="Untitled"
          />
          <ChevronDown size={12} className="text-white/20" />
        </div>
      </div>

      {/* Right section: Execution + File ops */}
      <div className="flex items-center gap-1.5">
        {/* Loop toggle */}
        <button
          onClick={() =>
            updateSettings({ run_mode: isLoop ? "once" : "loop" })
          }
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all",
            isLoop
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "text-white/40 hover:text-white/60 hover:bg-white/5"
          )}
          title="Toggle loop mode"
        >
          <Repeat size={13} className={isLoop ? "text-purple-400" : ""} />
          <span className="hidden sm:inline">{isLoop ? "Loop" : "Once"}</span>
        </button>

        {/* Loop iteration counter */}
        {isRunning && isLoop && loopIteration > 0 && (
          <span className="text-purple-300/70 text-[11px] tabular-nums animate-fade-in">
            #{loopIteration}
          </span>
        )}

        {/* Run / Stop */}
        {isRunning ? (
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-red-500/20 text-red-300 border border-red-500/30
                       hover:bg-red-500/30 transition-all"
          >
            <Square size={13} />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={run}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-emerald-500/20 text-emerald-300 border border-emerald-500/30
                       hover:bg-emerald-500/30 transition-all"
          >
            <Play size={13} />
            <span>Run</span>
          </button>
        )}

        <div className="w-px h-5 bg-white/8 mx-0.5" />

        {/* File operations */}
        <ToolbarIconBtn onClick={onSave} tooltip="Save workflow">
          <Save size={15} />
        </ToolbarIconBtn>
        <ToolbarIconBtn onClick={onLoad} tooltip="Load workflow">
          <FolderOpen size={15} />
        </ToolbarIconBtn>

        <div className="w-px h-5 bg-white/8 mx-0.5" />

        <ToolbarIconBtn onClick={onOpenSettings} tooltip="Settings">
          <Settings size={15} />
        </ToolbarIconBtn>

        <ToolbarIconBtn
          onClick={onToggleRightPanel}
          tooltip={rightPanelOpen ? "Hide properties" : "Show properties"}
        >
          {rightPanelOpen ? (
            <PanelRightClose size={15} />
          ) : (
            <PanelRightOpen size={15} />
          )}
        </ToolbarIconBtn>
      </div>
    </div>
  );
}

function ToolbarIconBtn({
  onClick,
  tooltip,
  children,
}: {
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5
                 transition-colors"
    >
      {children}
    </button>
  );
}
