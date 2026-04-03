import { describe, it, expect } from "vitest";
import { analyzeSelection } from "@/lib/nodeFunctionAnalyzer";
import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData, NodeManifest } from "@/types/node";

// Helper to create mock nodes
function mkNode(id: string, nodeType: string, x = 0, y = 0): Node<FlowNodeData> {
  return {
    id,
    type: "ppnNode",
    position: { x, y },
    data: { nodeType, label: nodeType, config: {}, status: "idle" },
  };
}

function mkEdge(id: string, src: string, srcH: string, tgt: string, tgtH: string): Edge {
  return { id, source: src, sourceHandle: srcH, target: tgt, targetHandle: tgtH };
}

const byType: Record<string, NodeManifest> = {
  A: {
    type: "A", label: "A", category: "Test", volatile: false,
    inputs: [{ name: "in1", type: "STRING", label: "In1" }],
    outputs: [{ name: "out1", type: "STRING", label: "Out1" }],
    config_schema: [],
  },
  B: {
    type: "B", label: "B", category: "Test", volatile: false,
    inputs: [{ name: "in1", type: "STRING", label: "In1" }],
    outputs: [{ name: "out1", type: "JSON", label: "Out1" }],
    config_schema: [],
  },
  C: {
    type: "C", label: "C", category: "Test", volatile: false,
    inputs: [{ name: "in1", type: "JSON", label: "In1" }],
    outputs: [{ name: "out1", type: "JSON", label: "Out1" }],
    config_schema: [],
  },
};

describe("analyzeSelection", () => {
  it("should detect 1 input and 1 output for a middle node", () => {
    // Chain: A -> B -> C, select B
    const nodes = [mkNode("a", "A"), mkNode("b", "B"), mkNode("c", "C")];
    const edges = [
      mkEdge("e1", "a", "out1", "b", "in1"),
      mkEdge("e2", "b", "out1", "c", "in1"),
    ];

    const result = analyzeSelection(["b"], nodes, edges, byType);

    expect(result.internalNodeIds.size).toBe(1);
    expect(result.internalNodes).toHaveLength(1);
    expect(result.internalEdges).toHaveLength(0);
    expect(result.detectedInputs).toHaveLength(1);
    expect(result.detectedInputs[0].type).toBe("STRING");
    expect(result.detectedInputs[0].internalNodeId).toBe("b");
    expect(result.detectedOutputs).toHaveLength(1);
    expect(result.detectedOutputs[0].type).toBe("JSON");
    expect(result.detectedOutputs[0].internalNodeId).toBe("b");
  });

  it("should detect 0 inputs and 1 output when selecting first nodes", () => {
    // Chain: A -> B -> C, select A and B
    const nodes = [mkNode("a", "A"), mkNode("b", "B"), mkNode("c", "C")];
    const edges = [
      mkEdge("e1", "a", "out1", "b", "in1"),
      mkEdge("e2", "b", "out1", "c", "in1"),
    ];

    const result = analyzeSelection(["a", "b"], nodes, edges, byType);

    expect(result.internalNodes).toHaveLength(2);
    expect(result.internalEdges).toHaveLength(1); // e1 is internal
    expect(result.detectedInputs).toHaveLength(0); // no external inputs
    expect(result.detectedOutputs).toHaveLength(1); // B → C
  });

  it("should detect 0 inputs and 0 outputs when selecting all nodes", () => {
    const nodes = [mkNode("a", "A"), mkNode("b", "B")];
    const edges = [mkEdge("e1", "a", "out1", "b", "in1")];

    const result = analyzeSelection(["a", "b"], nodes, edges, byType);

    expect(result.detectedInputs).toHaveLength(0);
    expect(result.detectedOutputs).toHaveLength(0);
    expect(result.internalEdges).toHaveLength(1);
  });

  it("should deduplicate multiple edges to the same internal port", () => {
    // Two external nodes A1, A2 both connect to B.in1
    const nodes = [mkNode("a1", "A"), mkNode("a2", "A"), mkNode("b", "B")];
    const edges = [
      mkEdge("e1", "a1", "out1", "b", "in1"),
      mkEdge("e2", "a2", "out1", "b", "in1"),
    ];

    const result = analyzeSelection(["b"], nodes, edges, byType);

    // Should detect only 1 input (deduplicated by target+port)
    expect(result.detectedInputs).toHaveLength(1);
    expect(result.incomingEdges).toHaveLength(2);
  });

  it("should handle fork topology (one node to multiple)", () => {
    // A -> B, A -> C. Select {B, C}
    const nodes = [mkNode("a", "A"), mkNode("b", "B"), mkNode("c", "C")];
    const edges = [
      mkEdge("e1", "a", "out1", "b", "in1"),
      mkEdge("e2", "a", "out1", "c", "in1"),
    ];

    const result = analyzeSelection(["b", "c"], nodes, edges, byType);

    expect(result.detectedInputs).toHaveLength(2); // B.in1 and C.in1
    expect(result.detectedOutputs).toHaveLength(0); // no outgoing
    expect(result.internalEdges).toHaveLength(0);
  });

  it("should serialize internal nodes with correct data", () => {
    const nodes = [mkNode("a", "A", 100, 200)];
    const result = analyzeSelection(["a"], nodes, [], byType);

    expect(result.internalNodes[0].id).toBe("a");
    expect(result.internalNodes[0].type).toBe("A");
    expect(result.internalNodes[0].position).toEqual({ x: 100, y: 200 });
  });
});
