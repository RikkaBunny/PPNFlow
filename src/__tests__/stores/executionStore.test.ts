import { describe, it, expect, beforeEach } from "vitest";
import { useExecutionStore } from "@/stores/executionStore";

describe("executionStore", () => {
  beforeEach(() => {
    useExecutionStore.getState().clearAll();
  });

  it("should start with clean state", () => {
    const state = useExecutionStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.currentExecutionId).toBeNull();
    expect(state.loopIteration).toBe(0);
    expect(state.nodeStates).toEqual({});
  });

  describe("setRunning", () => {
    it("should set running state with executionId", () => {
      useExecutionStore.getState().setRunning(true, "exec-123");
      const state = useExecutionStore.getState();
      expect(state.isRunning).toBe(true);
      expect(state.currentExecutionId).toBe("exec-123");
    });

    it("should set executionId to null when not provided", () => {
      useExecutionStore.getState().setRunning(true);
      expect(useExecutionStore.getState().currentExecutionId).toBeNull();
    });

    it("should reset loopIteration to 0 when starting", () => {
      useExecutionStore.getState().setLoopIteration(5);
      useExecutionStore.getState().setRunning(true, "exec-1");
      expect(useExecutionStore.getState().loopIteration).toBe(0);
    });

    it("should preserve loopIteration when stopping", () => {
      useExecutionStore.getState().setRunning(true, "exec-1");
      useExecutionStore.getState().setLoopIteration(3);
      useExecutionStore.getState().setRunning(false);
      expect(useExecutionStore.getState().loopIteration).toBe(3);
    });
  });

  describe("setNodeStatus", () => {
    it("should set status for a node", () => {
      useExecutionStore.getState().setNodeStatus("n1", "running");
      const ns = useExecutionStore.getState().nodeStates["n1"];
      expect(ns.status).toBe("running");
      expect(ns.outputs).toEqual({});
    });

    it("should merge extra fields", () => {
      useExecutionStore.getState().setNodeStatus("n1", "done", { ms: 150 });
      const ns = useExecutionStore.getState().nodeStates["n1"];
      expect(ns.status).toBe("done");
      expect(ns.ms).toBe(150);
    });

    it("should preserve existing outputs when updating status", () => {
      useExecutionStore.getState().setNodeOutput("n1", "text", "hello");
      useExecutionStore.getState().setNodeStatus("n1", "done");
      const ns = useExecutionStore.getState().nodeStates["n1"];
      expect(ns.outputs.text).toBe("hello");
    });

    it("should merge error message via extra", () => {
      useExecutionStore.getState().setNodeStatus("n1", "error", { errorMsg: "fail" });
      const ns = useExecutionStore.getState().nodeStates["n1"];
      expect(ns.status).toBe("error");
      expect(ns.errorMsg).toBe("fail");
    });
  });

  describe("setNodeOutput", () => {
    it("should set output for a port", () => {
      useExecutionStore.getState().setNodeOutput("n1", "text", "hello");
      const ns = useExecutionStore.getState().nodeStates["n1"];
      expect(ns.outputs.text).toBe("hello");
    });

    it("should preserve existing outputs when adding new ports", () => {
      useExecutionStore.getState().setNodeOutput("n1", "text", "hello");
      useExecutionStore.getState().setNodeOutput("n1", "count", 5);
      const ns = useExecutionStore.getState().nodeStates["n1"];
      expect(ns.outputs.text).toBe("hello");
      expect(ns.outputs.count).toBe(5);
    });

    it("should create node state if it does not exist", () => {
      useExecutionStore.getState().setNodeOutput("new_node", "val", 42);
      const ns = useExecutionStore.getState().nodeStates["new_node"];
      expect(ns).toBeDefined();
      expect(ns.status).toBe("idle");
      expect(ns.outputs.val).toBe(42);
    });
  });

  describe("clearAll", () => {
    it("should reset all state", () => {
      useExecutionStore.getState().setRunning(true, "exec-1");
      useExecutionStore.getState().setNodeStatus("n1", "done");
      useExecutionStore.getState().setLoopIteration(3);
      useExecutionStore.getState().clearAll();

      const state = useExecutionStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentExecutionId).toBeNull();
      expect(state.loopIteration).toBe(0);
      expect(state.nodeStates).toEqual({});
    });
  });
});
