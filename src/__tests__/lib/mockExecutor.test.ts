import { describe, it, expect, beforeEach } from "vitest";
import { mockExecute } from "@/lib/mockExecutor";
import { useManifestStore } from "@/stores/manifestStore";
import { useExecutionStore } from "@/stores/executionStore";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";
import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";

const makeNode = (
  id: string,
  nodeType: string,
  config: Record<string, unknown> = {}
): Node<FlowNodeData> => ({
  id,
  type: "ppnNode",
  position: { x: 0, y: 0 },
  data: { nodeType, label: nodeType, config, status: "idle" },
});

const makeEdge = (
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
): Edge => ({ id, source, sourceHandle, target, targetHandle });

describe("mockExecutor", () => {
  beforeEach(() => {
    useManifestStore.getState().setManifests(MOCK_MANIFESTS);
    useExecutionStore.getState().clearAll();
  });

  // ── Basic execution ──

  describe("basic execution", () => {
    it("should execute all nodes and mark them as done", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: "hello" }),
        makeNode("n2", "ai_chat", { model: "gpt-4o" }),
      ];
      const edges = [makeEdge("e1", "n1", "text", "n2", "prompt")];
      await mockExecute(nodes, edges, { current: false });

      const state = useExecutionStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.nodeStates["n1"]?.status).toBe("done");
      expect(state.nodeStates["n2"]?.status).toBe("done");
    });

    it("should handle empty graph gracefully", async () => {
      await mockExecute([], [], { current: false });
      expect(useExecutionStore.getState().isRunning).toBe(false);
    });

    it("should execute disconnected nodes", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: "a" }),
        makeNode("n2", "number_input", { value: 42 }),
      ];
      await mockExecute(nodes, [], { current: false });
      const state = useExecutionStore.getState();
      expect(state.nodeStates["n1"]?.status).toBe("done");
      expect(state.nodeStates["n2"]?.status).toBe("done");
    });

    it("should stop early when stopRef is set", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: "a" }),
        makeNode("n2", "text_input", { value: "b" }),
        makeNode("n3", "text_input", { value: "c" }),
      ];
      const stopRef = { current: false };
      setTimeout(() => { stopRef.current = true; }, 30);
      await mockExecute(nodes, [], stopRef);
      expect(useExecutionStore.getState().isRunning).toBe(false);
    });
  });

  // ── Data propagation ──

  describe("data propagation via edges", () => {
    it("should propagate text_input → json_parse → extract_field", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: '{"name":"Alice","age":30}' }),
        makeNode("n2", "json_parse", {}),
        makeNode("n3", "extract_field", { path: "name" }),
        makeNode("n4", "extract_field", { path: "age" }),
      ];
      const edges = [
        makeEdge("e1", "n1", "text", "n2", "text"),
        makeEdge("e2", "n2", "data", "n3", "data"),
        makeEdge("e3", "n2", "data", "n4", "data"),
      ];
      await mockExecute(nodes, edges, { current: false });

      const state = useExecutionStore.getState();
      expect(state.nodeStates["n2"]?.outputs.data).toEqual({ name: "Alice", age: 30 });
      expect(state.nodeStates["n3"]?.outputs.value).toBe("Alice");
      expect(state.nodeStates["n4"]?.outputs.value).toBe(30);
    });

    it("should propagate through template node", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: '{"title":"Hello","body":"World"}' }),
        makeNode("n2", "json_parse", {}),
        makeNode("n3", "extract_field", { path: "title" }),
        makeNode("n4", "template", { template: "Title: {text}" }),
      ];
      const edges = [
        makeEdge("e1", "n1", "text", "n2", "text"),
        makeEdge("e2", "n2", "data", "n3", "data"),
        makeEdge("e3", "n3", "value", "n4", "text"),
      ];
      await mockExecute(nodes, edges, { current: false });

      const state = useExecutionStore.getState();
      expect(state.nodeStates["n4"]?.outputs.result).toBe("Title: Hello");
    });

    it("should propagate math with upstream inputs", async () => {
      const nodes = [
        makeNode("n1", "number_input", { value: 7 }),
        makeNode("n2", "number_input", { value: 3 }),
        makeNode("n3", "math", { op: "multiply", b_fallback: 0 }),
      ];
      const edges = [
        makeEdge("e1", "n1", "value", "n3", "a"),
        makeEdge("e2", "n2", "value", "n3", "b"),
      ];
      await mockExecute(nodes, edges, { current: false });

      expect(useExecutionStore.getState().nodeStates["n3"]?.outputs.result).toBe(21);
    });

    it("should propagate compare with upstream inputs", async () => {
      const nodes = [
        makeNode("n1", "number_input", { value: 10 }),
        makeNode("n2", "compare", { op: ">", b_value: "5" }),
      ];
      const edges = [makeEdge("e1", "n1", "value", "n2", "a")];
      await mockExecute(nodes, edges, { current: false });

      expect(useExecutionStore.getState().nodeStates["n2"]?.outputs.result).toBe(true);
    });

    it("should propagate condition node (truthy)", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: "yes" }),
        makeNode("n2", "condition", {}),
      ];
      const edges = [makeEdge("e1", "n1", "text", "n2", "value")];
      await mockExecute(nodes, edges, { current: false });

      const out = useExecutionStore.getState().nodeStates["n2"]?.outputs;
      expect(out?.true_out).toBe("yes");
      expect(out?.false_out).toBeUndefined();
    });

    it("should propagate log node with upstream value", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: "hello" }),
        makeNode("n2", "log", { label: "TEST" }),
      ];
      const edges = [makeEdge("e1", "n1", "text", "n2", "value")];
      await mockExecute(nodes, edges, { current: false });

      const out = useExecutionStore.getState().nodeStates["n2"]?.outputs;
      expect(out?.value).toBe("hello");
      expect(out?._display).toBe("[TEST] hello");
    });

    it("should propagate text_display with upstream text", async () => {
      const nodes = [
        makeNode("n1", "text_input", { value: "show me" }),
        makeNode("n2", "text_display", {}),
      ];
      const edges = [makeEdge("e1", "n1", "text", "n2", "text")];
      await mockExecute(nodes, edges, { current: false });

      expect(useExecutionStore.getState().nodeStates["n2"]?.outputs._display).toBe("show me");
    });
  });

  // ── AI Game Bot template flow ──

  describe("AI Game Bot template flow", () => {
    it("should propagate full AI Game Bot data chain", async () => {
      const nodes = [
        makeNode("n1", "window_screenshot", { window_title: "Game" }),
        makeNode("n2", "ai_chat", { provider: "openai", model: "gpt-4o", system_prompt: "...", temperature: 0.3, max_tokens: 256 }),
        makeNode("n3", "json_parse", {}),
        makeNode("n4", "extract_field", { path: "action" }),
        makeNode("n5", "extract_field", { path: "x" }),
        makeNode("n6", "extract_field", { path: "y" }),
        makeNode("n7", "mouse_click", { button: "left", clicks: 1 }),
        makeNode("n8", "log", { label: "ACTION" }),
        makeNode("n9", "delay", { ms: 300 }),
      ];
      const edges = [
        makeEdge("e1", "n1", "image", "n2", "image"),
        makeEdge("e2", "n2", "response", "n3", "text"),
        makeEdge("e3", "n3", "data", "n4", "data"),
        makeEdge("e4", "n3", "data", "n5", "data"),
        makeEdge("e5", "n3", "data", "n6", "data"),
        makeEdge("e6", "n5", "value", "n7", "x"),
        makeEdge("e7", "n6", "value", "n7", "y"),
        makeEdge("e8", "n4", "value", "n8", "value"),
      ];
      await mockExecute(nodes, edges, { current: false });

      const state = useExecutionStore.getState();

      // All nodes should be done
      for (const n of nodes) {
        expect(state.nodeStates[n.id]?.status, `${n.id} should be done`).toBe("done");
      }

      // n1: screenshot produces image
      expect(state.nodeStates["n1"]?.outputs.image).toContain("data:image/");

      // n2: ai_chat produces JSON response string
      const response = state.nodeStates["n2"]?.outputs.response as string;
      expect(response).toContain("action");

      // n3: json_parse parses the response
      const parsed = state.nodeStates["n3"]?.outputs.data as Record<string, unknown>;
      expect(parsed).toHaveProperty("action");
      expect(parsed).toHaveProperty("x");
      expect(parsed).toHaveProperty("y");

      // n4: extract_field gets "action"
      expect(state.nodeStates["n4"]?.outputs.value).toBe("click");

      // n5: extract_field gets "x" = 500
      expect(state.nodeStates["n5"]?.outputs.value).toBe(500);

      // n6: extract_field gets "y" = 300
      expect(state.nodeStates["n6"]?.outputs.value).toBe(300);

      // n7: mouse_click receives correct coordinates
      expect(state.nodeStates["n7"]?.outputs.success).toBe(true);

      // n8: log shows the action
      expect(state.nodeStates["n8"]?.outputs._display).toBe("[ACTION] click");
    });
  });

  // ── Individual node output coverage ──

  describe("individual node outputs", () => {
    const runSingle = async (nodeType: string, config: Record<string, unknown> = {}) => {
      useExecutionStore.getState().clearAll();
      const nodes = [makeNode("t1", nodeType, config)];
      await mockExecute(nodes, [], { current: false });
      return useExecutionStore.getState().nodeStates["t1"]?.outputs ?? {};
    };

    it("text_input returns config.value", async () => {
      expect((await runSingle("text_input", { value: "hi" })).text).toBe("hi");
    });

    it("number_input returns config.value as number", async () => {
      expect((await runSingle("number_input", { value: 42 })).value).toBe(42);
    });

    it("screenshot returns image and _preview_image", async () => {
      const out = await runSingle("screenshot", {});
      expect(out.image).toContain("data:image/");
      expect(out._preview_image).toContain("data:image/");
    });

    it("image-producing nodes have _preview_image", async () => {
      for (const type of ["window_screenshot", "image_crop", "image_resize"]) {
        const out = await runSingle(type, {});
        expect(out._preview_image, `${type} should have _preview_image`).toBeTruthy();
      }
    });

    it("ai_chat returns JSON response string", async () => {
      const out = await runSingle("ai_chat", {});
      expect(typeof out.response).toBe("string");
      expect(out.response).toContain("action");
    });

    it("http_request returns status_code 200", async () => {
      expect((await runSingle("http_request", {})).status_code).toBe(200);
    });

    it("run_command returns stdout and exit_code", async () => {
      const out = await runSingle("run_command", {});
      expect(out.stdout).toBe("command output here");
      expect(out.exit_code).toBe(0);
    });

    it("pixel_color returns rgb and hex", async () => {
      const out = await runSingle("pixel_color", {});
      expect(typeof out.r).toBe("number");
      expect(typeof out.g).toBe("number");
      expect(typeof out.b).toBe("number");
      expect(out.hex).toBe("#FF6B6B");
    });

    it("window_screenshot returns width/height", async () => {
      const out = await runSingle("window_screenshot", {});
      expect(out.width).toBe(1920);
      expect(out.height).toBe(1080);
    });

    it("window_list returns windows and titles", async () => {
      const out = await runSingle("window_list", {});
      expect(out.windows).toEqual([{ title: "Chrome" }, { title: "Notepad" }]);
      expect(out.titles).toContain("Chrome");
    });

    it("ocr returns text, blocks, count", async () => {
      const out = await runSingle("ocr", {});
      expect(out.blocks).toEqual([{ text: "Hello", x: 10, y: 10 }]);
      expect(out.count).toBe(3);
    });

    it("image_match returns found, confidence", async () => {
      const out = await runSingle("image_match", {});
      expect(out.found).toBe(true);
      expect(out.confidence).toBe(0.95);
    });

    it("loop_counter returns count and is_first", async () => {
      const out = await runSingle("loop_counter", {});
      expect(typeof out.count).toBe("number");
      expect(out.is_first).toBe(true);
    });

    it("random_number returns value and integer", async () => {
      const out = await runSingle("random_number", {});
      expect(typeof out.value).toBe("number");
      expect(typeof out.integer).toBe("number");
    });

    it("file_read returns content and size", async () => {
      const out = await runSingle("file_read", {});
      expect(out.content).toBe("mock_content");
      expect(out.size).toBe(1024);
    });

    it("mouse_click returns success", async () => {
      expect((await runSingle("mouse_click", {})).success).toBe(true);
    });

    it("image_display has _display_image", async () => {
      const out = await runSingle("image_display", {});
      expect(out._display_image).toContain("data:image/");
    });

    it("text_display has _display", async () => {
      const out = await runSingle("text_display", {});
      expect(out._display).toBe("Mock display text");
    });

    it("log has _display with label", async () => {
      const out = await runSingle("log", { label: "TEST" });
      expect(out._display).toContain("[TEST]");
    });

    it("unknown node type returns empty outputs", async () => {
      const nodes = [makeNode("t1", "nonexistent_type", {})];
      useExecutionStore.getState().clearAll();
      await mockExecute(nodes, [], { current: false });
      expect(useExecutionStore.getState().nodeStates["t1"]?.status).toBe("done");
    });

    // Math operations
    it("math: add", async () => {
      expect((await runSingle("math", { op: "add", b_fallback: 5 })).result).toBe(15);
    });
    it("math: subtract", async () => {
      expect((await runSingle("math", { op: "subtract", b_fallback: 3 })).result).toBe(7);
    });
    it("math: multiply", async () => {
      expect((await runSingle("math", { op: "multiply", b_fallback: 2 })).result).toBe(20);
    });
    it("math: divide", async () => {
      expect((await runSingle("math", { op: "divide", b_fallback: 4 })).result).toBe(2.5);
    });
    it("math: divide by zero", async () => {
      expect((await runSingle("math", { op: "divide", b_fallback: 0 })).result).toBe(0);
    });
    it("math: power", async () => {
      expect((await runSingle("math", { op: "power", b_fallback: 2 })).result).toBe(100);
    });
    it("math: unknown op fallback", async () => {
      expect((await runSingle("math", { op: "???", b_fallback: 7 })).result).toBe(17);
    });

    // String operations
    it("string_concat joins inputs", async () => {
      const out = await runSingle("string_concat", { separator: "-" });
      expect(typeof out.result).toBe("string");
    });
    it("string_replace works", async () => {
      const out = await runSingle("string_replace", { find: "x", replace: "y" });
      expect(typeof out.result).toBe("string");
    });
    it("string_split splits text", async () => {
      const out = await runSingle("string_split", { delimiter: "," });
      expect(Array.isArray(out.parts)).toBe(true);
      expect(typeof out.count).toBe("number");
    });
    it("regex returns match result", async () => {
      const out = await runSingle("regex", { pattern: "test", mode: "search" });
      expect(typeof out.found).toBe("boolean");
    });
    it("type_convert returns all types", async () => {
      const out = await runSingle("type_convert", {});
      expect(out).toHaveProperty("string");
      expect(out).toHaveProperty("number");
      expect(out).toHaveProperty("integer");
      expect(out).toHaveProperty("bool");
    });
  });
});
