import { useManifestStore } from "@/stores/manifestStore";
import type { NodeManifest } from "@/types/node";

interface Props {
  onAddNode: (manifest: NodeManifest) => void;
}

export function NodePalette({ onAddNode }: Props) {
  const manifests  = useManifestStore((s) => s.manifests);
  const categories = useManifestStore((s) => s.categories);
  const loaded     = useManifestStore((s) => s.loaded);

  if (!loaded) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        Starting engine...
      </div>
    );
  }

  if (manifests.length === 0) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        No nodes available.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto py-2">
      {categories.map((cat) => (
        <div key={cat} className="mb-3">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {cat}
          </div>
          {manifests
            .filter((m) => m.category === cat)
            .map((m) => (
              <button
                key={m.type}
                onClick={() => onAddNode(m)}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-300
                           hover:bg-slate-700 hover:text-white transition-colors"
              >
                {m.label}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
