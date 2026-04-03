/**
 * Integration test: full Node Function flow with Bilibili template.
 * Simulates: load template → select nodes → analyze → create function → expand for engine.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { TEMPLATES } from "@/lib/templates";
import { deserializeGraph, serializeGraph, expandNodeFunctions } from "@/lib/graphSerializer";
import { analyzeSelection } from "@/lib/nodeFunctionAnalyzer";
import { convertSelectionToFunction } from "@/lib/nodeFunctionConverter";
import { useManifestStore } from "@/stores/manifestStore";
import { useNodeFunctionStore } from "@/stores/nodeFunctionStore";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";
import type { NodeFunctionDef } from "@/types/nodeFunction";

describe("Node Function Integration — Bilibili Template", () => {
  beforeEach(() => {
    useManifestStore.getState().setManifests(MOCK_MANIFESTS);
    useNodeFunctionStore.getState().clearAll();
  });

  it("should load template, create function from first 3 nodes, and preserve graph structure", () => {
    // 1. Load Bilibili template
    const template = TEMPLATES.find((t) => t.id === "bilibili-hot-download");
    expect(template).toBeDefined();
    const { nodes, edges } = deserializeGraph(template!.workflow);
    const byType = useManifestStore.getState().byType;

    expect(nodes).toHaveLength(8);
    expect(edges).toHaveLength(7);

    // 2. Analyze selection of first 3 nodes (HTTP Request, Extract Field, List Filter)
    const selectedIds = ["n1", "n2", "n3"];
    const analysis = analyzeSelection(selectedIds, nodes, edges, byType);

    expect(analysis.internalNodes).toHaveLength(3);
    expect(analysis.internalEdges).toHaveLength(2); // n1→n2, n2→n3
    expect(analysis.detectedInputs).toHaveLength(0); // n1 has no external input
    expect(analysis.detectedOutputs).toHaveLength(1); // n3.result → outside
    expect(analysis.detectedOutputs[0].type).toBe("JSON");
    expect(analysis.outgoingEdges).toHaveLength(2); // n3→n4 and n3→n6

    // 3. Create function definition
    const def: NodeFunctionDef = {
      id: "mf_bili_fetch",
      name: "Bilibili Hot Fetcher",
      category: "Node Function",
      internalNodes: analysis.internalNodes,
      internalEdges: analysis.internalEdges,
      inputs: analysis.detectedInputs,
      outputs: analysis.detectedOutputs,
    };

    useNodeFunctionStore.getState().addDef(def);

    // 4. Verify dynamic manifest registered
    const mfManifest = useManifestStore.getState().byType["mf:mf_bili_fetch"];
    expect(mfManifest).toBeDefined();
    expect(mfManifest.label).toBe("Bilibili Hot Fetcher");
    expect(mfManifest.category).toBe("Node Function");
    expect(mfManifest.inputs).toHaveLength(0);
    expect(mfManifest.outputs).toHaveLength(1);

    // 5. Convert selection to function node
    const result = convertSelectionToFunction(analysis, def, nodes, edges);

    // Should have 6 nodes: function + n4 + n5 + n6 + n7 + n8
    expect(result.nodes).toHaveLength(6);

    const mfNode = result.nodes.find((n) => n.data.nodeType === "mf:mf_bili_fetch");
    expect(mfNode).toBeDefined();
    expect(mfNode!.data.label).toBe("Bilibili Hot Fetcher");

    // Remaining original nodes should still be there
    const remainingIds = result.nodes.map((n) => n.id).filter((id) => id !== mfNode!.id);
    expect(remainingIds).toContain("n4");
    expect(remainingIds).toContain("n5");
    expect(remainingIds).toContain("n6");
    expect(remainingIds).toContain("n7");
    expect(remainingIds).toContain("n8");

    // Edges: function→n4, function→n6, n4→n5, n6→n7, n6→n8 = 5 edges
    // (was 7, minus 2 internal, minus 2 boundary outgoing, plus 2 replacement)
    expect(result.edges).toHaveLength(5);

    // Check replacement edges from function to n4 and n6
    const fnToN4 = result.edges.find((e) => e.source === mfNode!.id && e.target === "n4");
    const fnToN6 = result.edges.find((e) => e.source === mfNode!.id && e.target === "n6");
    expect(fnToN4).toBeDefined();
    expect(fnToN6).toBeDefined();
    expect(fnToN4!.sourceHandle).toBe("out_result"); // mapped output port name
    expect(fnToN6!.sourceHandle).toBe("out_result");
  });

  it("should expand function node back to flat graph for engine execution", () => {
    // Setup: create the function and converted graph (same as above)
    const template = TEMPLATES.find((t) => t.id === "bilibili-hot-download")!;
    const { nodes, edges, settings } = deserializeGraph(template.workflow);
    const byType = useManifestStore.getState().byType;

    const analysis = analyzeSelection(["n1", "n2", "n3"], nodes, edges, byType);
    const def: NodeFunctionDef = {
      id: "mf_bili_fetch",
      name: "Bilibili Hot Fetcher",
      category: "Node Function",
      internalNodes: analysis.internalNodes,
      internalEdges: analysis.internalEdges,
      inputs: analysis.detectedInputs,
      outputs: analysis.detectedOutputs,
    };

    useNodeFunctionStore.getState().addDef(def);
    const converted = convertSelectionToFunction(analysis, def, nodes, edges);

    // Serialize the converted graph (with function node)
    const defs = Object.values(useNodeFunctionStore.getState().defs);
    const serialized = serializeGraph(converted.nodes, converted.edges, settings, "Test", defs);

    // Verify serialized graph has function node
    const mfSerializedNode = serialized.nodes.find((n) => n.type === "mf:mf_bili_fetch");
    expect(mfSerializedNode).toBeDefined();
    expect(serialized.nodeFunctions).toHaveLength(1);

    // Expand for engine
    const defsMap = useNodeFunctionStore.getState().defs;
    const expanded = expandNodeFunctions(serialized, defsMap);

    // Expanded should have NO mf: nodes
    const mfNodes = expanded.nodes.filter((n) => n.type.startsWith("mf:"));
    expect(mfNodes).toHaveLength(0);

    // Should have 8 nodes total (3 internal + 5 remaining)
    expect(expanded.nodes).toHaveLength(8);

    // Should have all original node types
    const types = expanded.nodes.map((n) => n.type).sort();
    expect(types).toContain("http_request");
    expect(types).toContain("extract_field");
    expect(types).toContain("list_filter");
    expect(types).toContain("list_map");
    expect(types).toContain("video_download");

    // Edges should reconnect correctly
    // Internal edges (2) + replacement edges remapped to internal nodes + remaining edges
    expect(expanded.edges.length).toBeGreaterThanOrEqual(7);

    // No nodeFunctions in expanded output
    expect(expanded.nodeFunctions).toBeUndefined();
  });

  it("should support undo after conversion (serialization round-trip)", () => {
    const template = TEMPLATES.find((t) => t.id === "bilibili-hot-download")!;
    const { nodes, edges, settings } = deserializeGraph(template.workflow);
    const byType = useManifestStore.getState().byType;

    const analysis = analyzeSelection(["n1", "n2", "n3"], nodes, edges, byType);
    const def: NodeFunctionDef = {
      id: "mf_undo_test",
      name: "Undo Test",
      category: "Node Function",
      internalNodes: analysis.internalNodes,
      internalEdges: analysis.internalEdges,
      inputs: analysis.detectedInputs,
      outputs: analysis.detectedOutputs,
    };

    useNodeFunctionStore.getState().addDef(def);
    const converted = convertSelectionToFunction(analysis, def, nodes, edges);

    // Verify conversion changed node count
    expect(converted.nodes).toHaveLength(6);

    // Serialize and deserialize (save/load round trip)
    const defs = Object.values(useNodeFunctionStore.getState().defs);
    const saved = serializeGraph(converted.nodes, converted.edges, settings, "Test", defs);
    const loaded = deserializeGraph(saved);

    expect(loaded.nodes).toHaveLength(6);
    expect(loaded.nodeFunctions).toHaveLength(1);
    expect(loaded.nodeFunctions[0].id).toBe("mf_undo_test");
  });
});
