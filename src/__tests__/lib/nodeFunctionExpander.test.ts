import { describe, it, expect } from "vitest";
import { expandNodeFunctions } from "@/lib/graphSerializer";
import type { WorkflowFile } from "@/types/workflow";
import type { NodeFunctionDef } from "@/types/nodeFunction";

const baseDef: NodeFunctionDef = {
  id: "mf_test",
  name: "Test Function",
  category: "Node Function",
  internalNodes: [
    { id: "i1", type: "text_input", position: { x: 0, y: 0 }, config: { value: "hello" } },
    { id: "i2", type: "json_parse", position: { x: 200, y: 0 }, config: {} },
  ],
  internalEdges: [
    { id: "ie1", source: "i1", sourceHandle: "text", target: "i2", targetHandle: "text" },
  ],
  inputs: [
    { name: "in_text", label: "Text", type: "STRING", internalNodeId: "i1", internalPortName: "text" },
  ],
  outputs: [
    { name: "out_data", label: "Data", type: "JSON", internalNodeId: "i2", internalPortName: "data" },
  ],
};

function makeGraph(nodes: WorkflowFile["nodes"], edges: WorkflowFile["edges"]): WorkflowFile {
  return {
    version: "1.0",
    name: "Test",
    nodes,
    edges,
    settings: { run_mode: "once", loop_delay_ms: 0 },
  };
}

describe("expandNodeFunctions", () => {
  it("should pass through graphs with no function nodes", () => {
    const graph = makeGraph(
      [{ id: "n1", type: "text_input", position: { x: 0, y: 0 }, config: {} }],
      []
    );
    const result = expandNodeFunctions(graph, {});

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("n1");
  });

  it("should expand a single function node", () => {
    const graph = makeGraph(
      [{ id: "fn1", type: "mf:mf_test", position: { x: 100, y: 100 }, config: {} }],
      []
    );
    const result = expandNodeFunctions(graph, { mf_test: baseDef });

    // fn1 should be replaced by 2 internal nodes
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map((n) => n.id)).toContain("fn1_i1");
    expect(result.nodes.map((n) => n.id)).toContain("fn1_i2");

    // Internal edge should be prefixed
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe("fn1_i1");
    expect(result.edges[0].target).toBe("fn1_i2");
  });

  it("should remap incoming edges to internal input nodes", () => {
    const graph = makeGraph(
      [
        { id: "src", type: "text_input", position: { x: 0, y: 0 }, config: {} },
        { id: "fn1", type: "mf:mf_test", position: { x: 200, y: 0 }, config: {} },
      ],
      [
        { id: "e1", source: "src", sourceHandle: "text", target: "fn1", targetHandle: "in_text" },
      ]
    );
    const result = expandNodeFunctions(graph, { mf_test: baseDef });

    // src node should remain
    expect(result.nodes.find((n) => n.id === "src")).toBeDefined();
    // fn1 should be expanded to fn1_i1 + fn1_i2
    expect(result.nodes.find((n) => n.id === "fn1")).toBeUndefined();

    // Edge should be remapped: src → fn1_i1 (internal input node)
    const remapped = result.edges.find((e) => e.source === "src");
    expect(remapped).toBeDefined();
    expect(remapped!.target).toBe("fn1_i1");
    expect(remapped!.targetHandle).toBe("text"); // internalPortName
  });

  it("should remap outgoing edges from internal output nodes", () => {
    const graph = makeGraph(
      [
        { id: "fn1", type: "mf:mf_test", position: { x: 0, y: 0 }, config: {} },
        { id: "dst", type: "text_display", position: { x: 400, y: 0 }, config: {} },
      ],
      [
        { id: "e1", source: "fn1", sourceHandle: "out_data", target: "dst", targetHandle: "text" },
      ]
    );
    const result = expandNodeFunctions(graph, { mf_test: baseDef });

    const remapped = result.edges.find((e) => e.target === "dst");
    expect(remapped).toBeDefined();
    expect(remapped!.source).toBe("fn1_i2");
    expect(remapped!.sourceHandle).toBe("data"); // internalPortName
  });

  it("should expand multiple instances with unique prefixes", () => {
    const graph = makeGraph(
      [
        { id: "fn1", type: "mf:mf_test", position: { x: 0, y: 0 }, config: {} },
        { id: "fn2", type: "mf:mf_test", position: { x: 400, y: 0 }, config: {} },
      ],
      []
    );
    const result = expandNodeFunctions(graph, { mf_test: baseDef });

    // 2 instances × 2 internal nodes = 4 total
    expect(result.nodes).toHaveLength(4);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain("fn1_i1");
    expect(ids).toContain("fn1_i2");
    expect(ids).toContain("fn2_i1");
    expect(ids).toContain("fn2_i2");

    // 2 instances × 1 internal edge = 2 total
    expect(result.edges).toHaveLength(2);
  });

  it("should throw for unknown function def", () => {
    const graph = makeGraph(
      [{ id: "fn1", type: "mf:mf_unknown", position: { x: 0, y: 0 }, config: {} }],
      []
    );
    expect(() => expandNodeFunctions(graph, {})).toThrow("Unknown Node Function");
  });

  it("should strip nodeFunctions from output", () => {
    const graph: WorkflowFile = {
      ...makeGraph([], []),
      nodeFunctions: [baseDef],
    };
    const result = expandNodeFunctions(graph, {});
    expect(result.nodeFunctions).toBeUndefined();
  });

  it("should offset internal node positions by function node position", () => {
    const graph = makeGraph(
      [{ id: "fn1", type: "mf:mf_test", position: { x: 100, y: 200 }, config: {} }],
      []
    );
    const result = expandNodeFunctions(graph, { mf_test: baseDef });

    const i1 = result.nodes.find((n) => n.id === "fn1_i1");
    expect(i1!.position.x).toBe(100); // 0 + 100
    expect(i1!.position.y).toBe(200); // 0 + 200

    const i2 = result.nodes.find((n) => n.id === "fn1_i2");
    expect(i2!.position.x).toBe(300); // 200 + 100
    expect(i2!.position.y).toBe(200); // 0 + 200
  });
});
