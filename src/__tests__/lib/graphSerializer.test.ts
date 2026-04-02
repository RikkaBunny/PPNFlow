import { describe, it, expect } from "vitest";
import { serializeGraph, deserializeGraph } from "@/lib/graphSerializer";
import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";
import type { WorkflowFile, WorkflowSettings } from "@/types/workflow";

const makeNode = (
  id: string,
  nodeType: string,
  config: Record<string, unknown> = {}
): Node<FlowNodeData> => ({
  id,
  type: "ppnNode",
  position: { x: 100, y: 200 },
  data: { nodeType, label: nodeType, config, status: "idle" },
});

const makeEdge = (
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
): Edge => ({ id, source, sourceHandle, target, targetHandle });

const defaultSettings: WorkflowSettings = { run_mode: "once", loop_delay_ms: 500 };

describe("serializeGraph", () => {
  it("should produce a valid WorkflowFile", () => {
    const nodes = [makeNode("n1", "text_input", { value: "hello" })];
    const edges = [makeEdge("e1", "n1", "text", "n2", "prompt")];

    const result = serializeGraph(nodes, edges, defaultSettings, "Test");
    expect(result.version).toBe("1.0");
    expect(result.name).toBe("Test");
    expect(result.settings).toEqual(defaultSettings);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: "n1",
      type: "text_input",
      position: { x: 100, y: 200 },
      config: { value: "hello" },
    });
    expect(result.edges[0]).toEqual({
      id: "e1",
      source: "n1",
      sourceHandle: "text",
      target: "n2",
      targetHandle: "prompt",
    });
  });

  it("should default name to 'Untitled'", () => {
    const result = serializeGraph([], [], defaultSettings);
    expect(result.name).toBe("Untitled");
  });

  it("should handle empty nodes and edges", () => {
    const result = serializeGraph([], [], defaultSettings);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("should default config to {} when data.config is undefined", () => {
    const node: Node<FlowNodeData> = {
      id: "n1",
      type: "ppnNode",
      position: { x: 0, y: 0 },
      data: { nodeType: "log", label: "Log", config: undefined as unknown as Record<string, unknown>, status: "idle" },
    };
    const result = serializeGraph([node], [], defaultSettings);
    expect(result.nodes[0].config).toEqual({});
  });

  it("should default missing handles to empty string", () => {
    const edge: Edge = { id: "e1", source: "n1", target: "n2" };
    const result = serializeGraph([], [edge], defaultSettings);
    expect(result.edges[0].sourceHandle).toBe("");
    expect(result.edges[0].targetHandle).toBe("");
  });
});

describe("deserializeGraph", () => {
  it("should convert WorkflowFile nodes to React Flow format", () => {
    const file: WorkflowFile = {
      version: "1.0",
      name: "Test",
      settings: defaultSettings,
      nodes: [{ id: "n1", type: "text_input", position: { x: 50, y: 60 }, config: { value: "hi" } }],
      edges: [],
    };

    const { nodes } = deserializeGraph(file);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("n1");
    expect(nodes[0].type).toBe("ppnNode");
    expect(nodes[0].position).toEqual({ x: 50, y: 60 });
    expect(nodes[0].data.nodeType).toBe("text_input");
    expect(nodes[0].data.label).toBe("text_input");
    expect(nodes[0].data.config).toEqual({ value: "hi" });
    expect(nodes[0].data.status).toBe("idle");
  });

  it("should convert WorkflowFile edges to React Flow format", () => {
    const file: WorkflowFile = {
      version: "1.0",
      name: "Test",
      settings: defaultSettings,
      nodes: [],
      edges: [{ id: "e1", source: "n1", sourceHandle: "text", target: "n2", targetHandle: "prompt" }],
    };

    const { edges } = deserializeGraph(file);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({
      id: "e1",
      source: "n1",
      sourceHandle: "text",
      target: "n2",
      targetHandle: "prompt",
    });
  });

  it("should return settings from the file", () => {
    const file: WorkflowFile = {
      version: "1.0",
      name: "Test",
      settings: { run_mode: "loop", loop_delay_ms: 1000 },
      nodes: [],
      edges: [],
    };

    const { settings } = deserializeGraph(file);
    expect(settings).toEqual({ run_mode: "loop", loop_delay_ms: 1000 });
  });

  it("should default config to {} when node config is undefined", () => {
    const file: WorkflowFile = {
      version: "1.0",
      name: "Test",
      settings: defaultSettings,
      nodes: [{ id: "n1", type: "log", position: { x: 0, y: 0 }, config: undefined as unknown as Record<string, unknown> }],
      edges: [],
    };

    const { nodes } = deserializeGraph(file);
    expect(nodes[0].data.config).toEqual({});
  });
});

describe("serialize → deserialize round-trip", () => {
  it("should preserve data through round-trip", () => {
    const nodes = [
      makeNode("n1", "text_input", { value: "hello" }),
      makeNode("n2", "ai_chat", { model: "gpt-4o", temperature: 0.7 }),
    ];
    const edges = [makeEdge("e1", "n1", "text", "n2", "prompt")];

    const serialized = serializeGraph(nodes, edges, defaultSettings, "RoundTrip");
    const { nodes: desNodes, edges: desEdges, settings } = deserializeGraph(serialized);

    // Verify node count and data integrity
    expect(desNodes).toHaveLength(2);
    expect(desNodes[0].data.nodeType).toBe("text_input");
    expect(desNodes[0].data.config).toEqual({ value: "hello" });
    expect(desNodes[1].data.nodeType).toBe("ai_chat");
    expect(desNodes[1].data.config).toEqual({ model: "gpt-4o", temperature: 0.7 });

    // Verify edge integrity
    expect(desEdges).toHaveLength(1);
    expect(desEdges[0].source).toBe("n1");
    expect(desEdges[0].sourceHandle).toBe("text");
    expect(desEdges[0].target).toBe("n2");
    expect(desEdges[0].targetHandle).toBe("prompt");

    // Verify settings
    expect(settings).toEqual(defaultSettings);
  });

  it("should handle empty graph round-trip", () => {
    const serialized = serializeGraph([], [], defaultSettings);
    const { nodes, edges } = deserializeGraph(serialized);
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });
});
