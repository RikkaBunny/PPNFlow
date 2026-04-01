/**
 * Right-click context menu for the canvas.
 * Shows categorized node list at cursor position.
 */
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon } from "@/lib/nodeColors";
import { NodeIcon } from "@/components/nodes/NodeIcon";
import type { NodeManifest } from "@/types/node";

export interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

interface Props {
  state: ContextMenuState | null;
  onClose: () => void;
  onAddNode: (manifest: NodeManifest, position: { x: number; y: number }) => void;
}

export function ContextMenu({ state, onClose, onAddNode }: Props) {
  const manifests = useManifestStore((s) => s.manifests);
  const categories = useManifestStore((s) => s.categories);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-focus search on open
  useEffect(() => {
    if (state) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state]);

  // Close on click outside — use ref to avoid re-registering on onClose change
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!state) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onCloseRef.current();
      }
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

  const filtered = search.trim()
    ? manifests.filter(
        (m) =>
          m.label.toLowerCase().includes(search.toLowerCase()) ||
          m.type.toLowerCase().includes(search.toLowerCase())
      )
    : manifests;

  const filteredCats = search.trim()
    ? [...new Set(filtered.map((m) => m.category))].sort()
    : categories;

  // Keep menu within viewport
  const menuW = 260;
  const menuH = 400;
  const x = Math.min(state.x, window.innerWidth - menuW - 10);
  const y = Math.min(state.y, window.innerHeight - menuH - 10);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-scale-in"
      style={{
        left: x,
        top: y,
        width: menuW,
        maxHeight: menuH,
        background: "var(--color-panel)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <div className="p-2.5" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg pl-8 pr-2 py-1.5
                       text-[12px] outline-none transition-colors"
            style={{
              color: "var(--color-text)",
              background: "var(--color-canvas)",
              border: "1px solid var(--color-border-light)",
            }}
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredCats.map((cat) => {
          const items = filtered.filter((m) => m.category === cat);
          const catStyle = getCategoryStyle(cat);
          return (
            <div key={cat}>
              <div className="px-3 pt-2 pb-0.5">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: catStyle.color }}
                >
                  {cat}
                </span>
              </div>
              {items.map((m) => {
                const iconName = getNodeIcon(m.type, m.category);
                return (
                  <button
                    key={m.type}
                    onClick={() => {
                      onAddNode(m, { x: state.flowX, y: state.flowY });
                      onClose();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5
                               text-left transition-colors"
                    style={{ color: "var(--color-text)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--color-surface-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: catStyle.bg }}
                    >
                      <NodeIcon name={iconName} size={13} color={catStyle.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium truncate">{m.label}</div>
                    </div>
                    {/* Show port counts */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {m.inputs.length > 0 && (
                        <span className="text-[9px] px-1 py-0.5 rounded"
                          style={{ color: "var(--color-text-muted)", background: "var(--color-accent-light)" }}>
                          {m.inputs.length}in
                        </span>
                      )}
                      {m.outputs.length > 0 && (
                        <span className="text-[9px] px-1 py-0.5 rounded"
                          style={{ color: "var(--color-text-muted)", background: "var(--color-accent-light)" }}>
                          {m.outputs.length}out
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-4">
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              No nodes found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
