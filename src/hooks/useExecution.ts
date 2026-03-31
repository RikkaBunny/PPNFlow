import { useCallback, useRef } from "react";
import { isTauri } from "@/lib/tauriApi";
import { wsSend } from "@/lib/wsEngine";
import { useFlowStore } from "@/stores/flowStore";
import { useExecutionStore } from "@/stores/executionStore";
import { serializeGraph } from "@/lib/graphSerializer";
import { mockExecute } from "@/lib/mockExecutor";

export function useExecution() {
  const nodes    = useFlowStore((s) => s.nodes);
  const edges    = useFlowStore((s) => s.edges);
  const settings = useFlowStore((s) => s.settings);
  const name     = useFlowStore((s) => s.workflowName);

  const isRunning          = useExecutionStore((s) => s.isRunning);
  const currentExecutionId = useExecutionStore((s) => s.currentExecutionId);
  const clearAll           = useExecutionStore((s) => s.clearAll);
  const execIdRef          = useRef<string | null>(null);
  const stopRef            = useRef(false);

  const run = useCallback(async () => {
    if (isRunning) return;
    clearAll();
    stopRef.current = false;
    const id = crypto.randomUUID();
    execIdRef.current = id;

    const graph = serializeGraph(nodes, edges, settings, name);

    if (isTauri()) {
      const { engineApi } = await import("@/lib/tauriApi");
      await engineApi.executeGraph(graph, {
        id, mode: settings.run_mode, loop_delay_ms: settings.loop_delay_ms,
      });
    } else {
      // Try WebSocket engine first, fallback to mock
      try {
        await wsSend("execute_graph", {
          graph, id, mode: settings.run_mode, loop_delay_ms: settings.loop_delay_ms,
        });
      } catch {
        console.log("[PPNFlow] Engine not connected, using mock execution");
        await mockExecute(nodes, edges, stopRef);
      }
    }
  }, [isRunning, clearAll, nodes, edges, settings, name]);

  const runToNode = useCallback(async (targetNodeId: string) => {
    if (isRunning) return;
    clearAll();
    stopRef.current = false;

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
    const graph = serializeGraph(subNodes, subEdges, { ...settings, run_mode: "once" }, name);

    if (isTauri()) {
      const { engineApi } = await import("@/lib/tauriApi");
      await engineApi.executeGraph(graph, { id, mode: "once" });
    } else {
      try {
        await wsSend("execute_graph", { graph, id, mode: "once" });
      } catch {
        await mockExecute(subNodes, subEdges, stopRef);
      }
    }
  }, [isRunning, clearAll, nodes, edges, settings, name]);

  const stop = useCallback(async () => {
    stopRef.current = true;
    const id = execIdRef.current ?? currentExecutionId;
    if (id) {
      if (isTauri()) {
        const { engineApi } = await import("@/lib/tauriApi");
        await engineApi.stopExecution(id);
      } else {
        try { await wsSend("stop_execution", { id }); } catch { /* ok */ }
      }
    }
    useExecutionStore.getState().setRunning(false);
  }, [currentExecutionId]);

  return { run, stop, runToNode, isRunning };
}
