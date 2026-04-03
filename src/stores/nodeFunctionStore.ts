/**
 * Store for Node Function definitions.
 * Syncs dynamic manifests to manifestStore whenever defs change.
 */
import { create } from "zustand";
import type { NodeFunctionDef } from "@/types/nodeFunction";
import { toMfType } from "@/types/nodeFunction";
import type { NodeManifest } from "@/types/node";
import { useManifestStore } from "./manifestStore";

interface NodeFunctionState {
  defs: Record<string, NodeFunctionDef>;
  addDef: (def: NodeFunctionDef) => void;
  removeDef: (id: string) => void;
  updateDef: (id: string, partial: Partial<NodeFunctionDef>) => void;
  loadDefs: (defs: NodeFunctionDef[]) => void;
  clearAll: () => void;
}

function defToManifest(def: NodeFunctionDef): NodeManifest {
  return {
    type: toMfType(def.id),
    label: def.name,
    category: def.category || "Node Function",
    volatile: false,
    inputs: def.inputs.map((p) => ({
      name: p.name,
      type: p.type,
      label: p.label,
      optional: false,
    })),
    outputs: def.outputs.map((p) => ({
      name: p.name,
      type: p.type,
      label: p.label,
    })),
    config_schema: [],
  };
}

function syncManifests(defs: Record<string, NodeFunctionDef>): void {
  const manifests = Object.values(defs).map(defToManifest);
  useManifestStore.getState().registerDynamicManifests(manifests);
}

export const useNodeFunctionStore = create<NodeFunctionState>((set, get) => ({
  defs: {},

  addDef: (def) => {
    const next = { ...get().defs, [def.id]: def };
    set({ defs: next });
    syncManifests(next);
  },

  removeDef: (id) => {
    const { [id]: _, ...rest } = get().defs;
    set({ defs: rest });
    syncManifests(rest);
  },

  updateDef: (id, partial) => {
    const prev = get().defs[id];
    if (!prev) return;
    const next = { ...get().defs, [id]: { ...prev, ...partial } };
    set({ defs: next });
    syncManifests(next);
  },

  loadDefs: (defs) => {
    const map: Record<string, NodeFunctionDef> = {};
    for (const d of defs) map[d.id] = d;
    set({ defs: map });
    syncManifests(map);
  },

  clearAll: () => {
    set({ defs: {} });
    syncManifests({});
  },
}));
