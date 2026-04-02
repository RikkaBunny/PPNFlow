import { describe, it, expect, beforeEach } from "vitest";
import { useFlowStore } from "@/stores/flowStore";
import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";

const makeNode = (id: string, nodeType = "text_input"): Node<FlowNodeData> => ({
  id,
  type: "ppnNode",
  position: { x: 0, y: 0 },
  data: { nodeType, label: nodeType, config: {}, status: "idle" },
});

describe("flowStore", () => {
  beforeEach(() => {
    useFlowStore.setState({
      nodes: [],
      edges: [],
      history: [],
      future: [],
      settings: { run_mode: "once", loop_delay_ms: 500 },
      workflowName: "Untitled",
    });
  });

  describe("addNode", () => {
    it("should add a node and record history", () => {
      const node = makeNode("n1");
      useFlowStore.getState().addNode(node);

      const state = useFlowStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe("n1");
      expect(state.history).toHaveLength(1);
      expect(state.future).toEqual([]);
    });

    it("should append to existing nodes", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().addNode(makeNode("n2"));
      expect(useFlowStore.getState().nodes).toHaveLength(2);
    });
  });

  describe("updateNodeConfig", () => {
    it("should update config for a specific node immutably", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      const before = useFlowStore.getState().nodes[0];
      useFlowStore.getState().updateNodeConfig("n1", { value: "test" });
      const after = useFlowStore.getState().nodes[0];

      expect(after.data.config.value).toBe("test");
      // Immutability check: should be a different object
      expect(after).not.toBe(before);
      expect(after.data).not.toBe(before.data);
    });

    it("should merge config, not replace", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().updateNodeConfig("n1", { a: 1 });
      useFlowStore.getState().updateNodeConfig("n1", { b: 2 });
      const config = useFlowStore.getState().nodes[0].data.config;
      expect(config).toEqual({ a: 1, b: 2 });
    });

    it("should not affect other nodes", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().addNode(makeNode("n2"));
      useFlowStore.getState().updateNodeConfig("n1", { value: "changed" });
      expect(useFlowStore.getState().nodes[1].data.config).toEqual({});
    });
  });

  describe("updateSettings", () => {
    it("should partially update settings", () => {
      useFlowStore.getState().updateSettings({ run_mode: "loop" });
      const settings = useFlowStore.getState().settings;
      expect(settings.run_mode).toBe("loop");
      expect(settings.loop_delay_ms).toBe(500); // unchanged
    });
  });

  describe("resetGraph", () => {
    it("should clear nodes and edges and record history", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().resetGraph();

      const state = useFlowStore.getState();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.history.length).toBeGreaterThan(0);
    });
  });

  describe("undo / redo", () => {
    it("should undo addNode", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      expect(useFlowStore.getState().nodes).toHaveLength(1);

      useFlowStore.getState().undo();
      expect(useFlowStore.getState().nodes).toHaveLength(0);
      expect(useFlowStore.getState().future).toHaveLength(1);
    });

    it("should redo after undo", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().undo();
      useFlowStore.getState().redo();

      expect(useFlowStore.getState().nodes).toHaveLength(1);
      expect(useFlowStore.getState().nodes[0].id).toBe("n1");
    });

    it("should do nothing when undo on empty history", () => {
      const before = useFlowStore.getState().nodes;
      useFlowStore.getState().undo();
      expect(useFlowStore.getState().nodes).toBe(before);
    });

    it("should do nothing when redo on empty future", () => {
      const before = useFlowStore.getState().nodes;
      useFlowStore.getState().redo();
      expect(useFlowStore.getState().nodes).toBe(before);
    });

    it("should clear future on new action after undo", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().undo();
      expect(useFlowStore.getState().future).toHaveLength(1);

      useFlowStore.getState().addNode(makeNode("n2"));
      expect(useFlowStore.getState().future).toEqual([]);
    });

    it("should respect MAX_HISTORY limit of 50", () => {
      for (let i = 0; i < 60; i++) {
        useFlowStore.getState().addNode(makeNode(`n${i}`));
      }
      expect(useFlowStore.getState().history.length).toBeLessThanOrEqual(50);
    });
  });

  describe("setWorkflowName", () => {
    it("should update workflow name", () => {
      useFlowStore.getState().setWorkflowName("My Flow");
      expect(useFlowStore.getState().workflowName).toBe("My Flow");
    });
  });

  describe("setNodes / setEdges", () => {
    it("should replace all nodes", () => {
      const nodes = [makeNode("n1"), makeNode("n2")];
      useFlowStore.getState().setNodes(nodes);
      expect(useFlowStore.getState().nodes).toHaveLength(2);
    });

    it("should replace all edges", () => {
      const edges = [
        { id: "e1", source: "n1", sourceHandle: "text", target: "n2", targetHandle: "prompt" },
      ];
      useFlowStore.getState().setEdges(edges);
      expect(useFlowStore.getState().edges).toHaveLength(1);
    });
  });

  describe("onNodesChange", () => {
    it("should apply position change to a node", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().onNodesChange([
        { type: "position", id: "n1", position: { x: 50, y: 100 } },
      ]);
      const node = useFlowStore.getState().nodes.find((n) => n.id === "n1");
      expect(node?.position).toEqual({ x: 50, y: 100 });
    });

    it("should remove a node via remove change", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().onNodesChange([
        { type: "remove", id: "n1" },
      ]);
      expect(useFlowStore.getState().nodes).toHaveLength(0);
    });
  });

  describe("onEdgesChange", () => {
    it("should remove an edge via remove change", () => {
      useFlowStore.getState().setEdges([
        { id: "e1", source: "n1", sourceHandle: "text", target: "n2", targetHandle: "prompt" },
      ]);
      useFlowStore.getState().onEdgesChange([
        { type: "remove", id: "e1" },
      ]);
      expect(useFlowStore.getState().edges).toHaveLength(0);
    });
  });

  describe("onConnect", () => {
    it("should add an edge and record history", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().addNode(makeNode("n2"));
      const historyBefore = useFlowStore.getState().history.length;

      useFlowStore.getState().onConnect({
        source: "n1",
        target: "n2",
        sourceHandle: "text",
        targetHandle: "prompt",
      });

      expect(useFlowStore.getState().edges).toHaveLength(1);
      expect(useFlowStore.getState().edges[0].source).toBe("n1");
      expect(useFlowStore.getState().edges[0].target).toBe("n2");
      expect(useFlowStore.getState().history.length).toBeGreaterThan(historyBefore);
    });

    it("should clear future on new connection", () => {
      useFlowStore.getState().addNode(makeNode("n1"));
      useFlowStore.getState().undo();
      expect(useFlowStore.getState().future.length).toBeGreaterThan(0);

      useFlowStore.getState().onConnect({
        source: "a",
        target: "b",
        sourceHandle: null,
        targetHandle: null,
      });
      expect(useFlowStore.getState().future).toEqual([]);
    });
  });
});
