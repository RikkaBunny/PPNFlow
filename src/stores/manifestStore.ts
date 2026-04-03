import { create } from "zustand";
import type { NodeManifest } from "@/types/node";

interface ManifestState {
  manifests: NodeManifest[];
  dynamicManifests: NodeManifest[];
  byType: Record<string, NodeManifest>;
  categories: string[];
  loaded: boolean;

  setManifests: (manifests: NodeManifest[]) => void;
  registerDynamicManifests: (manifests: NodeManifest[]) => void;
}

function rebuildIndex(
  base: NodeManifest[],
  dynamic: NodeManifest[]
): { byType: Record<string, NodeManifest>; categories: string[] } {
  const byType: Record<string, NodeManifest> = {};
  const catSet = new Set<string>();
  for (const m of base) {
    byType[m.type] = m;
    catSet.add(m.category);
  }
  for (const m of dynamic) {
    byType[m.type] = m;
    catSet.add(m.category);
  }
  return { byType, categories: [...catSet].sort() };
}

export const useManifestStore = create<ManifestState>((set, get) => ({
  manifests: [],
  dynamicManifests: [],
  byType: {},
  categories: [],
  loaded: false,

  setManifests: (manifests) => {
    const { dynamicManifests } = get();
    const { byType, categories } = rebuildIndex(manifests, dynamicManifests);
    set({ manifests, byType, categories, loaded: true });
  },

  registerDynamicManifests: (dynamic) => {
    const { manifests } = get();
    const { byType, categories } = rebuildIndex(manifests, dynamic);
    set({ dynamicManifests: dynamic, byType, categories });
  },
}));
