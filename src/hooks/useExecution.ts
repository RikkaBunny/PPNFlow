import { useCallback, useRef } from "react";
import { isWsConnected, wsSend } from "@/lib/wsEngine";
import { useFlowStore } from "@/stores/flowStore";
import { useExecutionStore } from "@/stores/executionStore";
import { useNodeFunctionStore } from "@/stores/nodeFunctionStore";
import { serializeGraph, expandNodeFunctions } from "@/lib/graphSerializer";
import { mockExecute } from "@/lib/mockExecutor";

export function useExecution() {
  const nodes    = useFlowStore((s) => s.nodes);
  const edges    = useFlowStore((s) => s.edges);
  const settings = useFlowStore((s) => s.settings);
  const name     = useFlowStore((s) => s.workflowName);

  const isRunning          = useExecutionStore((s) => s.isRunning);
  const currentExecutionId = useExecutionStore((s) => s.currentExecutionId);
  const clearAll           = useExecutionStore((s) => s.clearAll);
  const setNotice          = useExecutionStore((s) => s.setNotice);
  const execIdRef          = useRef<string | null>(null);
  const stopRef            = useRef(false);

  const run = useCallback(async () => {
    if (isRunning) return;
    clearAll();
    stopRef.current = false;
    if (!isWsConnected()) {
      setNotice({
        kind: "error",
        message: "Python backend is not connected. The UI will fall back to mock execution, so desktop automation templates will not control the game. Start the backend on ws://localhost:9320 or use start-dev.bat.",
      });
    } else {
      setNotice(null);
    }
    const id = crypto.randomUUID();
    execIdRef.current = id;

    const defs = useNodeFunctionStore.getState().defs;
    const rawGraph = serializeGraph(nodes, edges, settings, name, Object.values(defs));
    const graph = expandNodeFunctions(rawGraph, defs);

    try {
      await wsSend("execute_graph", {
        graph,
        id, mode: settings.run_mode, loop_delay_ms: settings.loop_delay_ms,
      });
    } catch {
      console.log("[PPNFlow] Engine not connected, using mock execution");
      await mockExecute(nodes, edges, stopRef);
    }
  }, [isRunning, clearAll, nodes, edges, settings, name, setNotice]);

  const runToNode = useCallback(async (targetNodeId: string) => {
    if (isRunning) return;
    if (!nodes.find((n) => n.id === targetNodeId)) {
      console.error("[PPNFlow] runToNode: node not found:", targetNodeId);
      return;
    }
    clearAll();
    stopRef.current = false;
    if (!isWsConnected()) {
      setNotice({
        kind: "error",
        message: "Python backend is not connected. Run-to-node is using mock execution only, so desktop automation nodes will not affect the game.",
      });
    } else {
      setNotice(null);
    }

    // BFS backwards
    const needed = new Set<string>();
    const queue = [targetNodeId];
    needed.add(targetNodeId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of edges) {
        if (edge.target === current && !needed.has(edge.source)) {
          needed.add(edge.source);
          queue.push(edge.source);
        }
      }
    }
    const subNodes = nodes.filter((n) => needed.has(n.id));
    const subEdges = edges.filter((e) => needed.has(e.source) && needed.has(e.target));

    const id = crypto.randomUUID();
    execIdRef.current = id;
    const defs = useNodeFunctionStore.getState().defs;
    const rawGraph = serializeGraph(subNodes, subEdges, { ...settings, run_mode: "once" }, name, Object.values(defs));
    const graph = expandNodeFunctions(rawGraph, defs);

    try {
      await wsSend("execute_graph", { graph, id, mode: "once" });
    } catch {
      await mockExecute(subNodes, subEdges, stopRef);
    }
  }, [isRunning, clearAll, nodes, edges, settings, name, setNotice]);

  const stop = useCallback(async () => {
    stopRef.current = true;
    const id = execIdRef.current ?? currentExecutionId;
    if (id) {
      try { await wsSend("stop_execution", { id }); } catch { /* ok */ }
    }
    useExecutionStore.getState().setRunning(false);
  }, [currentExecutionId]);

  return { run, stop, runToNode, isRunning };
}
