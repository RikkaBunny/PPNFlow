/**
 * Node palette — n8n style overlay panel.
 * Triggered by the floating "+" button on the canvas.
 * Slides in from left, can be closed by clicking backdrop or X.
 */
import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle, getNodeIcon } from "@/lib/nodeColors";
import { NodeIcon } from "@/components/nodes/NodeIcon";
import type { NodeManifest } from "@/types/node";

interface Props {
  open: boolean;
  onClose: () => void;
  onAddNode: (manifest: NodeManifest) => void;
}

export function NodePalette({ open, onClose, onAddNode }: Props) {
  const manifests = useManifestStore((s) => s.manifests);
  const categories = useManifestStore((s) => s.categories);
  const [search, setSearch] = useState("");

  const handleAdd = useCallback(
    (m: NodeManifest) => {
      onAddNode(m);
      onClose();
    },
    [onAddNode, onClose]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, manifest: NodeManifest) => {
      e.dataTransfer.setData("application/ppnflow-node", manifest.type);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  if (!open) return null;

  const filtered = search.trim()
    ? manifests.filter(
        (m) =>
          m.label.toLowerCase().includes(search.toLowerCase()) ||
          m.type.toLowerCase().includes(search.toLowerCase())
      )
    : manifests;

  const filteredCategories = search.trim()
    ? [...new Set(filtered.map((m) => m.category))].sort()
    : categories;

  return (
    <>
      {/* Backdrop */}
      <div className="overlay-backdrop" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col animate-slide-in-left"
        style={{
          width: 320,
          background: "var(--color-panel)",
          borderRight: "1px solid var(--color-border)",
          boxShadow: "8px 0 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2 className="text-[15px] font-semibold text-white/90">Add Node</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
            />
            <input
              type="text"
              placeholder="Search nodes..."
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg pl-9 pr-3 py-2.5
                         text-[13px] text-white/80 placeholder:text-white/20
                         outline-none transition-colors
                         bg-white/[0.04] border border-white/8
                         focus:border-white/20 focus:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Node list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filteredCategories.map((cat) => {
            const items = filtered.filter((m) => m.category === cat);
            const catStyle = getCategoryStyle(cat);

            return (
              <div key={cat} className="mb-4">
                {/* Category label */}
                <div className="px-2 py-1.5 mb-1">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: catStyle.color }}
                  >
                    {cat}
                  </span>
                </div>

                {/* Node items */}
                <div className="space-y-0.5">
                  {items.map((m) => {
                    const iconName = getNodeIcon(m.type, m.category);
                    return (
                      <button
                        key={m.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, m)}
                        onClick={() => handleAdd(m)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                   text-left cursor-grab
                                   hover:bg-white/[0.04] active:bg-white/[0.07]
                                   transition-colors group"
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: catStyle.bg }}
                        >
                          <NodeIcon
                            name={iconName}
                            size={15}
                            color={catStyle.color}
                          />
                        </div>

                        {/* Name + type */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-white/80 group-hover:text-white/95 transition-colors truncate">
                            {m.label}
                          </div>
                          <div className="text-[10px] text-white/20 truncate">
                            {m.type}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[13px] text-white/20">No nodes found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
