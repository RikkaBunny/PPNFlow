/**
 * Mock executor for browser dev mode (no Tauri/Python).
 * Simulates execution by walking the graph in topological order,
 * generating fake outputs for each node type.
 */
import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { useExecutionStore } from "@/stores/executionStore";

/** Tiny 1x1 pink pixel as base64 placeholder */
const MOCK_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAA40lEQVR42u3RAQ0AAAjDMO5fNCCDkC5z0HTs3OUqwCACAxEYiMBABAYiMBCBgQgMRGAgAgMRGIjAQAQGIjAQgYEIDERgIAIDERiIwEAEBiIwEIGBCAxEYCACAxEYiMBABAYiMBCBgQgMRGAgAgMRGIjAQAQGIjAQgYEIDERgIAIDERiIwEAEBiIwEIGBCAxEYCACAxEYiMBABAYiMBCBgQgMRGAgAgMRGIjAQAQGIjAQgYEIDERgIAIDERiIwEAEBiIwEIGBCAxEYCACAxEYiMBABAYiMBCBgQgMRGAgAgP5YQF/n1cE2gVs3gAAAABJRU5ErkJggg==";
function topoSort(nodes: Node<FlowNodeData>[], edges: Edge[]): string[] {
  const inDeg: Record<string, number> = {};
  const deps: Record<string, string[]> = {};
  for (const n of nodes) {
    inDeg[n.id] = 0;
    deps[n.id] = [];
  }
  for (const e of edges) {
    if (inDeg[e.target] !== undefined) inDeg[e.target]++;
    if (deps[e.source]) deps[e.source].push(e.target);
  }
  const queue: string[] = [];
  for (const id of Object.keys(inDeg)) {
    if (inDeg[id] === 0) queue.push(id);
  }
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const dep of deps[id] ?? []) {
      inDeg[dep]--;
      if (inDeg[dep] === 0) queue.push(dep);
    }
  }
  return order;
}

/** Generate mock outputs based on node type */
function mockOutputs(nodeType: string, config: Record<string, unknown>): Record<string, unknown> {
  const manifest = useManifestStore.getState().byType[nodeType];
  if (!manifest) return {};

  const result: Record<string, unknown> = {};
  for (const port of manifest.outputs) {
    switch (port.type.toUpperCase()) {
      case "STRING":
        if (nodeType === "text_input") result[port.name] = config.value ?? "";
        else if (port.name === "response") result[port.name] = '{"action":"click","x":500,"y":300,"reason":"Found button"}';
        else if (port.name === "stdout") result[port.name] = "command output here";
        else if (port.name === "hex") result[port.name] = "#FF6B6B";
        else if (port.name === "titles") result[port.name] = "Chrome\nNotepad\nExplorer";
        else result[port.name] = `mock_${port.name}`;
        break;
      case "INT":
        if (port.name === "status_code") result[port.name] = 200;
        else if (port.name === "exit_code") result[port.name] = 0;
        else if (port.name === "r" || port.name === "g" || port.name === "b") result[port.name] = Math.floor(Math.random() * 255);
        else if (port.name === "width") result[port.name] = 1920;
        else if (port.name === "height") result[port.name] = 1080;
        else if (port.name === "count") result[port.name] = 3;
        else if (port.name === "size") result[port.name] = 1024;
        else result[port.name] = Math.floor(Math.random() * 100);
        break;
      case "FLOAT":
        if (nodeType === "number_input") result[port.name] = Number(config.value ?? 0);
        else if (port.name === "confidence") result[port.name] = 0.95;
        else if (nodeType === "math") {
          const a = 10, b = Number(config.b_fallback ?? 0);
          const ops: Record<string, number> = {
            add: a + b, subtract: a - b, multiply: a * b,
            divide: b !== 0 ? a / b : 0, power: a ** b,
          };
          result[port.name] = ops[config.op as string] ?? a + b;
        }
        else result[port.name] = Math.random() * 100;
        break;
      case "BOOL":
        if (port.name === "found" || port.name === "match") result[port.name] = true;
        else if (port.name === "is_first") result[port.name] = true;
        else result[port.name] = true;
        break;
      case "IMAGE":
        result[port.name] = MOCK_IMAGE;
        break;
      case "JSON":
        if (nodeType === "json_parse") result[port.name] = { action: "click", x: 500, y: 300 };
        else if (port.name === "windows") result[port.name] = [{ title: "Chrome" }, { title: "Notepad" }];
        else if (port.name === "blocks") result[port.name] = [{ text: "Hello", x: 10, y: 10 }];
        else if (port.name === "parts") result[port.name] = ["a", "b", "c"];
        else if (port.name === "groups") result[port.name] = ["group1"];
        else result[port.name] = { mock: true };
        break;
      case "ANY":
        result[port.name] = "mock_value";
        break;
      default:
        result[port.name] = `mock_${port.type}`;
    }
  }

  // Special internal keys
  if (nodeType === "text_display") result["_display"] = "Mock display text";
  if (nodeType === "log") result["_display"] = `[${config.label ?? "LOG"}] mock_value`;
  if (nodeType === "image_display") result["_display_image"] = MOCK_IMAGE;

  // Add preview for image-producing nodes
  if (["screenshot", "window_screenshot", "image_crop", "image_resize"].includes(nodeType)) {
    result["_preview_image"] = MOCK_IMAGE;
  }

  return result;
}

/**
 * Run mock execution for a set of nodes/edges.
 * Updates executionStore progressively with delays.
 */
export async function mockExecute(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  stopRef: { current: boolean },
) {
  const store = useExecutionStore.getState();
  const order = topoSort(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  store.setRunning(true, crypto.randomUUID());

  for (const nodeId of order) {
    if (stopRef.current) break;

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const nd = node.data as Record<string, unknown>;
    const nodeType = nd.nodeType as string;
    const config = (nd.config ?? {}) as Record<string, unknown>;

    // Set running
    useExecutionStore.getState().setNodeStatus(nodeId, "running");

    // Simulate execution time (50-300ms)
    const ms = 50 + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, ms));

    if (stopRef.current) break;

    // Generate mock outputs
    const outputs = mockOutputs(nodeType, config);

    // Set done with ALL outputs in one atomic update
    const store2 = useExecutionStore.getState();
    const prev = store2.nodeStates[nodeId] ?? { status: "idle", outputs: {} };
    useExecutionStore.setState({
      nodeStates: {
        ...store2.nodeStates,
        [nodeId]: {
          ...prev,
          status: "done",
          ms,
          outputs: { ...prev.outputs, ...outputs },
        },
      },
    });
  }

  useExecutionStore.getState().setRunning(false);
}
