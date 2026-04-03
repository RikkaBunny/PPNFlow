/**
 * Multi-selection right-click context menu.
 * Shows "Convert to Node Function" and "Delete selected".
 */
import { useEffect, useRef } from "react";
import { Boxes, Trash2 } from "lucide-react";

export interface SelectionMenuState {
  nodeIds: string[];
  x: number;
  y: number;
}

interface Props {
  state: SelectionMenuState | null;
  onClose: () => void;
  onDeleteSelected: (nodeIds: string[]) => void;
  onConvertToFunction: (nodeIds: string[]) => void;
}

export function SelectionContextMenu({
  state, onClose, onDeleteSelected, onConvertToFunction,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!state) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement))
        onCloseRef.current();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [state]);

  if (!state) return null;

  const x = Math.min(state.x, window.innerWidth - 220);
  const y = Math.min(state.y, window.innerHeight - 160);

  const items = [
    {
      icon: Boxes,
      label: "Convert to Node Function",
      color: "var(--color-accent)",
      action: () => {
        onConvertToFunction(state.nodeIds);
        onClose();
      },
    },
    {
      icon: Trash2,
      label: `Delete ${state.nodeIds.length} nodes`,
      color: "var(--color-error)",
      action: () => {
        onDeleteSelected(state.nodeIds);
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-scale-in py-1.5"
      style={{
        left: x,
        top: y,
        width: 220,
        background: "var(--color-panel)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div
        className="px-3 py-1.5 mb-0.5"
        style={{ borderBottom: "1px solid var(--color-border-light)" }}
      >
        <span
          className="text-[11px] font-semibold block"
          style={{ color: "var(--color-text)" }}
        >
          {state.nodeIds.length} nodes selected
        </span>
      </div>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
          style={{ color: item.color }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <item.icon size={13} />
          <span className="text-[12px]">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
