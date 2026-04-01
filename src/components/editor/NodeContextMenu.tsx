/**
 * Node right-click context menu — Run to here, View output, Delete.
 */
import { useEffect, useRef } from "react";
import { Play, Eye, Trash2, Copy, Settings } from "lucide-react";

export interface NodeMenuState {
  nodeId: string;
  nodeLabel: string;
  x: number;
  y: number;
}

interface Props {
  state: NodeMenuState | null;
  onClose: () => void;
  onRunToHere: (nodeId: string) => void;
  onViewOutput: (nodeId: string) => void;
  onOpenConfig: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  hasOutput: boolean;
}

export function NodeContextMenu({
  state, onClose, onRunToHere, onViewOutput, onOpenConfig, onDuplicate, onDelete, hasOutput,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!state) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) onCloseRef.current();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [state]);

  if (!state) return null;

  const x = Math.min(state.x, window.innerWidth - 200);
  const y = Math.min(state.y, window.innerHeight - 260);

  const items = [
    { icon: Play, label: "Run to here", color: "var(--color-accent)", action: () => { onRunToHere(state.nodeId); onClose(); } },
    ...(hasOutput ? [
      { icon: Eye, label: "View output", color: "var(--color-text-secondary)", action: () => { onViewOutput(state.nodeId); onClose(); } },
    ] : []),
    { icon: Settings, label: "Configure", color: "var(--color-text-secondary)", action: () => { onOpenConfig(state.nodeId); onClose(); } },
    { icon: Copy, label: "Duplicate", color: "var(--color-text-secondary)", action: () => { onDuplicate(state.nodeId); onClose(); } },
    { icon: Trash2, label: "Delete", color: "var(--color-error)", action: () => { onDelete(state.nodeId); onClose(); } },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-scale-in py-1.5"
      style={{
        left: x, top: y, width: 180,
        background: "var(--color-panel)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div className="px-3 py-1.5 mb-0.5" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
        <span className="text-[11px] font-semibold truncate block" style={{ color: "var(--color-text)" }}>
          {state.nodeLabel}
        </span>
      </div>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
          style={{ color: item.color }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <item.icon size={13} />
          <span className="text-[12px]">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
