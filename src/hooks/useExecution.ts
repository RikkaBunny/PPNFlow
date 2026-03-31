import { useCallback, useRef } from "react";
import { engineApi, isTauri } from "@/lib/tauriApi";
import { useFlowStore } from "@/stores/flowStore";
import { useExecutionStore } from "@/stores/executionStore";
import { serializeGraph } from "@/lib/graphSerializer";

export function useExecution() {
  const nodes    = useFlowStore((s) => s.nodes);
  const edges    = useFlowStore((s) => s.edges);
  const settings = useFlowStore((s) => s.settings);
  const name     = useFlowStore((s) => s.workflowName);

  const isRunning          = useExecutionStore((s) => s.isRunning);
  const currentExecutionId = useExecutionStore((s) => s.currentExecutionId);
  const clearAll           = useExecutionStore((s) => s.clearAll);
  const execIdRef          = useRef<string | null>(null);

  const run = useCallback(async () => {
    if (isRunning) return;
    clearAll();
    const id = crypto.randomUUID();
    execIdRef.current = id;
    const graph = serializeGraph(nodes, edges, settings, name);
    if (isTauri()) {
      await engineApi.executeGraph(graph, {
        id,
        mode: settings.run_mode,
        loop_delay_ms: settings.loop_delay_ms,
      });
    }
  }, [isRunning, clearAll, nodes, edges, settings, name]);

  /**
   * Run to a specific node — execute all upstream nodes up to and including targetNodeId.
   * We build a subgraph containing only the target node and its ancestors.
   */
  const runToNode = useCallback(async (targetNodeId: string) => {
    if (isRunning) return;
    clearAll();

    // Find all ancestor nodes via BFS backwards through edges
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

    // Build subgraph
    const subNodes = nodes.filter((n) => needed.has(n.id));
    const subEdges = edges.filter((e) => needed.has(e.source) && needed.has(e.target));

    const id = crypto.randomUUID();
    execIdRef.current = id;
    const graph = serializeGraph(subNodes, subEdges, { ...settings, run_mode: "once" }, name);

    if (isTauri()) {
      await engineApi.executeGraph(graph, { id, mode: "once" });
    }
  }, [isRunning, clearAll, nodes, edges, settings, name]);

  const stop = useCallback(async () => {
    const id = execIdRef.current ?? currentExecutionId;
    if (id && isTauri()) {
      await engineApi.stopExecution(id);
    }
  }, [currentExecutionId]);

  return { run, stop, runToNode, isRunning };
}
