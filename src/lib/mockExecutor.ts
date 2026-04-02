/**
 * Mock executor for browser dev mode (no Tauri/Python).
 * Simulates execution by walking the graph in topological order,
 * propagating outputs between nodes via edges (like the real Python engine).
 */
import type { Node, Edge } from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";
import { useManifestStore } from "@/stores/manifestStore";
import { useExecutionStore } from "@/stores/executionStore";

/** SVG placeholder that looks like a screenshot preview */
const MOCK_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">` +
  `<rect width="320" height="200" fill="#f5f5f5"/>` +
  `<rect x="8" y="8" width="304" height="28" rx="6" fill="#e8e8e8"/>` +
  `<circle cx="22" cy="22" r="5" fill="#ff6b6b"/>` +
  `<circle cx="36" cy="22" r="5" fill="#ffc078"/>` +
  `<circle cx="50" cy="22" r="5" fill="#69db7c"/>` +
  `<rect x="64" y="15" width="160" height="14" rx="7" fill="#ddd"/>` +
  `<rect x="8" y="44" width="304" height="148" rx="4" fill="#eee"/>` +
  `<text x="160" y="126" text-anchor="middle" fill="#bbb" font-family="system-ui,sans-serif" font-size="14" font-weight="500">Screenshot Preview</text>` +
  `</svg>`
)}`;

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

/** Resolve input values for a node by tracing upstream edges */
function resolveInputs(
  nodeId: string,
  edges: Edge[],
  allOutputs: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const srcOutputs = allOutputs[e.source];
    if (srcOutputs && e.sourceHandle && e.targetHandle) {
      inputs[e.targetHandle] = srcOutputs[e.sourceHandle];
    }
  }
  return inputs;
}

/** Resolve a dotted path like "a.b.c" from an object */
function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Generate mock outputs based on node type, config, AND upstream inputs */
function mockOutputs(
  nodeType: string,
  config: Record<string, unknown>,
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  const manifest = useManifestStore.getState().byType[nodeType];
  if (!manifest) return {};

  const result: Record<string, unknown> = {};

  // ── Nodes with input-dependent logic ──

  if (nodeType === "text_input") {
    result.text = config.value ?? "";
    return result;
  }
  if (nodeType === "number_input") {
    result.value = Number(config.value ?? 0);
    return result;
  }
  if (nodeType === "json_parse") {
    const text = inputs.text;
    if (typeof text === "string") {
      try { result.data = JSON.parse(text); } catch { result.data = { error: "parse_failed" }; }
    } else {
      result.data = { action: "click", x: 500, y: 300 };
    }
    return result;
  }
  if (nodeType === "extract_field") {
    const data = inputs.data;
    const path = String(config.path ?? "");
    if (data != null && path) {
      result.value = getByPath(data, path) ?? `(no field: ${path})`;
    } else {
      result.value = `(no field: ${path})`;
    }
    return result;
  }
  if (nodeType === "template") {
    let tpl = String(config.template ?? "");
    // Replace {key} placeholders from inputs
    const data = inputs.data as Record<string, unknown> | undefined;
    const text = inputs.text;
    if (data && typeof data === "object") {
      for (const [k, v] of Object.entries(data)) {
        tpl = tpl.replaceAll(`{${k}}`, String(v ?? ""));
      }
    }
    if (text != null) tpl = tpl.replaceAll("{text}", String(text));
    result.result = tpl;
    return result;
  }
  if (nodeType === "string_concat") {
    const a = inputs.a != null ? String(inputs.a) : "";
    const b = inputs.b != null ? String(inputs.b) : "";
    const sep = String(config.separator ?? "");
    result.result = b ? a + sep + b : a;
    return result;
  }
  if (nodeType === "string_replace") {
    const text = inputs.text != null ? String(inputs.text) : "";
    const find = String(config.find ?? "");
    const replace = String(config.replace ?? "");
    result.result = find ? text.replaceAll(find, replace) : text;
    return result;
  }
  if (nodeType === "string_split") {
    const text = inputs.text != null ? String(inputs.text) : "";
    const delim = String(config.delimiter ?? "\\n").replace("\\n", "\n").replace("\\t", "\t");
    const parts = text.split(delim);
    result.parts = parts;
    result.count = parts.length;
    result.first = parts[0] ?? "";
    result.last = parts[parts.length - 1] ?? "";
    return result;
  }
  if (nodeType === "regex") {
    const text = inputs.text != null ? String(inputs.text) : "";
    const pattern = String(config.pattern ?? "");
    if (!pattern) {
      result.match = ""; result.groups = []; result.found = false; result.all = [];
    } else {
      try {
        const re = new RegExp(pattern, "g");
        const m = re.exec(text);
        result.found = m !== null;
        result.match = m ? m[0] : "";
        result.groups = m ? m.slice(1) : [];
        // findall
        const all: string[] = [];
        const re2 = new RegExp(pattern, "g");
        let mm;
        while ((mm = re2.exec(text)) !== null) all.push(mm[0]);
        result.all = all;
      } catch {
        result.match = ""; result.groups = []; result.found = false; result.all = [];
      }
    }
    return result;
  }
  if (nodeType === "math") {
    const a = inputs.a != null ? Number(inputs.a) : 10;
    const bInput = inputs.b != null ? Number(inputs.b) : Number(config.b_fallback ?? 0);
    const op = String(config.op ?? "add");
    const ops: Record<string, number> = {
      add: a + bInput, subtract: a - bInput, multiply: a * bInput,
      divide: bInput !== 0 ? a / bInput : 0, mod: bInput !== 0 ? a % bInput : 0,
      power: a ** bInput, min: Math.min(a, bInput), max: Math.max(a, bInput),
      abs: Math.abs(a),
    };
    result.result = ops[op] ?? a + bInput;
    return result;
  }
  if (nodeType === "compare") {
    const a = inputs.a;
    const b = inputs.b ?? config.b_value ?? "";
    const op = String(config.op ?? "==");
    const sa = String(a ?? ""), sb = String(b ?? "");
    const na = Number(a), nb = Number(b);
    const ops: Record<string, boolean> = {
      "==": sa === sb, "!=": sa !== sb,
      ">": na > nb, "<": na < nb, ">=": na >= nb, "<=": na <= nb,
      contains: sa.includes(sb), starts_with: sa.startsWith(sb), ends_with: sa.endsWith(sb),
    };
    result.result = ops[op] ?? false;
    return result;
  }
  if (nodeType === "type_convert") {
    const v = inputs.value;
    result.string = String(v ?? "");
    result.number = Number(v) || 0;
    result.integer = Math.floor(Number(v) || 0);
    result.bool = Boolean(v);
    return result;
  }
  if (nodeType === "condition") {
    const value = inputs.value;
    // Simple truthy check
    const truthy = Boolean(value);
    result.true_out = truthy ? value : undefined;
    result.false_out = truthy ? undefined : value;
    return result;
  }
  if (nodeType === "delay") {
    result.trigger = inputs.trigger ?? true;
    return result;
  }
  if (nodeType === "loop_counter") {
    result.count = Math.floor(Math.random() * 10);
    result.is_first = true;
    return result;
  }
  if (nodeType === "log") {
    const value = inputs.value ?? "null";
    result.value = value;
    result["_display"] = `[${config.label ?? "LOG"}] ${typeof value === "object" ? JSON.stringify(value) : String(value)}`;
    return result;
  }
  if (nodeType === "text_display") {
    result["_display"] = inputs.text != null ? String(inputs.text) : "Mock display text";
    return result;
  }
  if (nodeType === "image_display") {
    result["_display_image"] = inputs.image ?? MOCK_IMAGE;
    return result;
  }

  // ── Nodes that generate new data (no upstream dependency) ──

  for (const port of manifest.outputs) {
    if (result[port.name] !== undefined) continue; // already set above
    switch (port.type.toUpperCase()) {
      case "STRING":
        if (port.name === "response") result[port.name] = '{"action":"click","x":500,"y":300,"reason":"Found button"}';
        else if (port.name === "stdout") result[port.name] = "command output here";
        else if (port.name === "hex") result[port.name] = "#FF6B6B";
        else if (port.name === "titles") result[port.name] = "Chrome\nNotepad\nExplorer";
        else result[port.name] = inputs[port.name] != null ? String(inputs[port.name]) : `mock_${port.name}`;
        break;
      case "INT":
        if (port.name === "status_code") result[port.name] = 200;
        else if (port.name === "exit_code") result[port.name] = 0;
        else if (port.name === "r" || port.name === "g" || port.name === "b") result[port.name] = Math.floor(Math.random() * 255);
        else if (port.name === "width") result[port.name] = 1920;
        else if (port.name === "height") result[port.name] = 1080;
        else if (port.name === "count") result[port.name] = 3;
        else if (port.name === "size") result[port.name] = 1024;
        else result[port.name] = inputs[port.name] != null ? Number(inputs[port.name]) : Math.floor(Math.random() * 100);
        break;
      case "FLOAT":
        if (port.name === "confidence") result[port.name] = 0.95;
        else result[port.name] = inputs[port.name] != null ? Number(inputs[port.name]) : Math.random() * 100;
        break;
      case "BOOL":
        if (port.name === "found" || port.name === "match") result[port.name] = true;
        else if (port.name === "is_first") result[port.name] = true;
        else result[port.name] = true;
        break;
      case "IMAGE":
        result[port.name] = inputs[port.name] ?? MOCK_IMAGE;
        break;
      case "JSON":
        if (port.name === "windows") result[port.name] = [{ title: "Chrome" }, { title: "Notepad" }];
        else if (port.name === "blocks") result[port.name] = [{ text: "Hello", x: 10, y: 10 }];
        else if (port.name === "parts") result[port.name] = ["a", "b", "c"];
        else if (port.name === "groups") result[port.name] = ["group1"];
        else result[port.name] = inputs[port.name] ?? { mock: true };
        break;
      case "ANY":
        result[port.name] = inputs[port.name] ?? "mock_value";
        break;
      default:
        result[port.name] = `mock_${port.type}`;
    }
  }

  // Add preview for image-producing nodes
  if (["screenshot", "window_screenshot", "image_crop", "image_resize"].includes(nodeType)) {
    result["_preview_image"] = MOCK_IMAGE;
  }

  return result;
}

/**
 * Run mock execution for a set of nodes/edges.
 * Updates executionStore progressively with delays.
 * Propagates outputs between nodes via edges (like the real Python engine).
 */
export async function mockExecute(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  stopRef: { current: boolean },
) {
  const store = useExecutionStore.getState();
  const order = topoSort(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Accumulate outputs from all executed nodes
  const allOutputs: Record<string, Record<string, unknown>> = {};

  store.setRunning(true, crypto.randomUUID());

  for (const nodeId of order) {
    if (stopRef.current) break;

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const nd = node.data as Record<string, unknown>;
    const nodeType = nd.nodeType as string;
    const config = (nd.config ?? {}) as Record<string, unknown>;

    // Resolve inputs from upstream nodes via edges
    const inputs = resolveInputs(nodeId, edges, allOutputs);

    // Set running
    useExecutionStore.getState().setNodeStatus(nodeId, "running");

    // Simulate execution time (50-300ms)
    const ms = 50 + Math.floor(Math.random() * 250);
    await new Promise((r) => setTimeout(r, ms));

    if (stopRef.current) break;

    // Generate outputs with input propagation
    const outputs = mockOutputs(nodeType, config, inputs);

    // Store for downstream nodes
    allOutputs[nodeId] = outputs;

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
