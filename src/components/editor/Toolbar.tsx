import {
  Play,
  Square,
  Save,
  FolderOpen,
  Settings,
  Repeat,
  BookTemplate,
} from "lucide-react";
import { useFlowStore } from "@/stores/flowStore";
import { useExecution } from "@/hooks/useExecution";
import { useExecutionStore } from "@/stores/executionStore";
import clsx from "clsx";

interface Props {
  onSave: () => void;
  onLoad: () => void;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
}

export function Toolbar({ onSave, onLoad, onOpenSettings, onOpenTemplates }: Props) {
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
      {/* Left: Logo + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #e84393, #fd79a8)" }}
        >
          <span className="text-white text-[11px] font-black">P</span>
        </div>
        <div className="w-px h-5" style={{ background: "var(--color-border)" }} />
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent text-[15px] font-medium outline-none
                     min-w-[80px] max-w-[280px] truncate transition-colors"
          style={{
            color: "var(--color-text)",
          }}
          placeholder="Untitled Workflow"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateSettings({ run_mode: isLoop ? "once" : "loop" })}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border",
            isLoop
              ? "border-purple-300 bg-purple-50 text-purple-600"
              : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          )}
        >
          <Repeat size={13} />
          <span>{isLoop ? "Loop" : "Once"}</span>
        </button>

        {isRunning && isLoop && loopIteration > 0 && (
          <span className="text-purple-500 text-[11px] tabular-nums font-medium">
            #{loopIteration}
          </span>
        )}

        <div className="w-px h-5" style={{ background: "var(--color-border)" }} />

        <IconBtn onClick={onOpenTemplates} title="Templates"><BookTemplate size={15} /></IconBtn>
        <IconBtn onClick={onSave} title="Save"><Save size={15} /></IconBtn>
        <IconBtn onClick={onLoad} title="Open"><FolderOpen size={15} /></IconBtn>
        <IconBtn onClick={onOpenSettings} title="Settings"><Settings size={15} /></IconBtn>

        <div className="w-px h-5" style={{ background: "var(--color-border)" }} />

        {isRunning ? (
          <button
            onClick={stop}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
                       transition-all bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
          >
            <Square size={13} />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={run}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold
                       transition-all text-white hover:brightness-105"
            style={{
              background: "linear-gradient(135deg, #e84393, #fd79a8)",
              boxShadow: "0 2px 12px rgba(232, 67, 147, 0.25)",
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
  onClick, title, children,
}: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg transition-colors hover:bg-pink-50"
      style={{ color: "var(--color-text-muted)" }}
    >
      {children}
    </button>
  );
}
