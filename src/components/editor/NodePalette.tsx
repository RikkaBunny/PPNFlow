import { useState, useCallback } from "react";
import {
  Search,
  ChevronRight,
  Brain,
  Zap,
  Download,
  Upload,
  GitBranch,
  Shuffle,
  Monitor,
  Box,
  type LucideProps,
} from "lucide-react";
import clsx from "clsx";
import { useManifestStore } from "@/stores/manifestStore";
import { getCategoryStyle } from "@/lib/nodeColors";
import type { NodeManifest } from "@/types/node";

/** Map category icon name → Lucide component */
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Brain,
  Zap,
  Download,
  Upload,
  GitBranch,
  Shuffle,
  Monitor,
  Box,
};

interface Props {
  onAddNode: (manifest: NodeManifest) => void;
}

export function NodePalette({ onAddNode }: Props) {
  const manifests = useManifestStore((s) => s.manifests);
  const categories = useManifestStore((s) => s.categories);
  const loaded = useManifestStore((s) => s.loaded);

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

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

  // Drag start handler — encode manifest type in dataTransfer
  const handleDragStart = useCallback(
    (e: React.DragEvent, manifest: NodeManifest) => {
      e.dataTransfer.setData("application/ppnflow-node", manifest.type);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2 animate-fade-in">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-2xs text-white/30">Starting engine...</p>
        </div>
      </div>
    );
  }

  if (manifests.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-2xs text-white/30 text-center">
          No nodes available. Check the Python engine.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20"
          />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-1.5
                       text-xs text-white/80 placeholder:text-white/20
                       outline-none focus:border-accent/50 focus:bg-white/8
                       transition-colors"
          />
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto pb-4">
        {filteredCategories.map((cat) => {
          const style = getCategoryStyle(cat);
          const Icon = ICON_MAP[style.icon] ?? Box;
          const isCollapsed = collapsed[cat] && !search.trim();
          const items = filtered.filter((m) => m.category === cat);

          return (
            <div key={cat} className="animate-fade-in">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left
                           hover:bg-white/5 transition-colors group"
              >
                <ChevronRight
                  size={12}
                  className={clsx(
                    "text-white/20 transition-transform duration-200",
                    !isCollapsed && "rotate-90"
                  )}
                />
                <Icon size={13} style={{ color: style.color }} />
                <span
                  className="text-[11px] font-semibold tracking-wide flex-1"
                  style={{ color: style.color }}
                >
                  {cat}
                </span>
                <span className="text-[10px] text-white/15">
                  {items.length}
                </span>
              </button>

              {/* Node items */}
              {!isCollapsed && (
                <div className="pb-1">
                  {items.map((m) => (
                    <div
                      key={m.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, m)}
                      onClick={() => onAddNode(m)}
                      className="group/item flex items-center gap-2 mx-2 px-2.5 py-1.5
                                 rounded-lg cursor-grab
                                 hover:bg-white/5 active:bg-white/8
                                 transition-colors"
                    >
                      <div
                        className="w-1 h-4 rounded-full flex-shrink-0 opacity-40 group-hover/item:opacity-80 transition-opacity"
                        style={{ background: style.color }}
                      />
                      <span className="text-xs text-white/60 group-hover/item:text-white/90 transition-colors truncate">
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
