import { create } from "zustand";
import type { NodeManifest } from "@/types/node";

interface ManifestState {
  manifests: NodeManifest[];
  byType: Record<string, NodeManifest>;
  categories: string[];
  loaded: boolean;

  setManifests: (manifests: NodeManifest[]) => void;
}

export const useManifestStore = create<ManifestState>((set) => ({
  manifests: [],
  byType: {},
  categories: [],
  loaded: false,

  setManifests: (manifests) => {
    const byType: Record<string, NodeManifest> = {};
    const catSet = new Set<string>();
    for (const m of manifests) {
      byType[m.type] = m;
      catSet.add(m.category);
    }
    set({ manifests, byType, categories: [...catSet].sort(), loaded: true });
  },
}));
