import { describe, it, expect, beforeEach } from "vitest";
import { useManifestStore } from "@/stores/manifestStore";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";

describe("manifestStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useManifestStore.setState({
      manifests: [],
      byType: {},
      categories: [],
      loaded: false,
    });
  });

  it("should start with empty state", () => {
    const state = useManifestStore.getState();
    expect(state.manifests).toEqual([]);
    expect(state.byType).toEqual({});
    expect(state.categories).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it("should populate byType index from setManifests", () => {
    useManifestStore.getState().setManifests(MOCK_MANIFESTS);
    const state = useManifestStore.getState();

    expect(state.loaded).toBe(true);
    expect(state.manifests).toBe(MOCK_MANIFESTS);

    // Every manifest should be indexed by type
    for (const m of MOCK_MANIFESTS) {
      expect(state.byType[m.type]).toBe(m);
    }
  });

  it("should extract and sort categories", () => {
    useManifestStore.getState().setManifests(MOCK_MANIFESTS);
    const { categories } = useManifestStore.getState();

    // Should be sorted alphabetically
    const sorted = [...categories].sort();
    expect(categories).toEqual(sorted);

    // Should contain unique categories from manifests
    const expected = [...new Set(MOCK_MANIFESTS.map((m) => m.category))].sort();
    expect(categories).toEqual(expected);
  });

  it("should handle empty array", () => {
    useManifestStore.getState().setManifests([]);
    const state = useManifestStore.getState();
    expect(state.manifests).toEqual([]);
    expect(state.byType).toEqual({});
    expect(state.categories).toEqual([]);
    expect(state.loaded).toBe(true);
  });

  it("should overwrite previous data on re-call", () => {
    useManifestStore.getState().setManifests(MOCK_MANIFESTS);
    useManifestStore.getState().setManifests([MOCK_MANIFESTS[0]]);

    const state = useManifestStore.getState();
    expect(state.manifests).toHaveLength(1);
    expect(Object.keys(state.byType)).toHaveLength(1);
  });
});
