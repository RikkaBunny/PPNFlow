import { useCallback, useRef } from "react";
import { engineApi } from "@/lib/tauriApi";
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
    await engineApi.executeGraph(graph, {
      id,
      mode: settings.run_mode,
      loop_delay_ms: settings.loop_delay_ms,
    });
  }, [isRunning, clearAll, nodes, edges, settings, name]);

  const stop = useCallback(async () => {
    const id = execIdRef.current ?? currentExecutionId;
    if (id) {
      await engineApi.stopExecution(id);
    }
  }, [currentExecutionId]);

  return { run, stop, isRunning };
}
