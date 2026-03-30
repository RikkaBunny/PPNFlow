import { useEffect, useRef, useCallback } from "react";
import { engineApi, onEngineEvent, isTauri } from "@/lib/tauriApi";
import { useManifestStore } from "@/stores/manifestStore";
import { useExecutionStore } from "@/stores/executionStore";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";

/**
 * Manages the Python engine lifecycle and routes incoming events
 * to the appropriate stores.
 * Falls back to mock manifests when running outside Tauri (pure browser dev).
 */
export function useEngine() {
  const setManifests  = useManifestStore((s) => s.setManifests);
  const setNodeStatus = useExecutionStore((s) => s.setNodeStatus);
  const setNodeOutput = useExecutionStore((s) => s.setNodeOutput);
  const setRunning    = useExecutionStore((s) => s.setRunning);
  const setLoopIter   = useExecutionStore((s) => s.setLoopIteration);
  const unlistenRef   = useRef<(() => void) | null>(null);

  const handleEvent = useCallback(
    (evt: { event: string; data: unknown }) => {
      const d = evt.data as Record<string, unknown>;
      switch (evt.event) {
        case "engine_ready":
          engineApi.getNodeSchemas().then((res) => {
            const r = res as { result?: { schemas: unknown[] }; schemas?: unknown[] };
            const schemas = r?.result?.schemas ?? (r as { schemas?: unknown[] })?.schemas ?? [];
            setManifests(schemas as Parameters<typeof setManifests>[0]);
          }).catch(console.error);
          break;

        case "node_status":
          setNodeStatus(d.id as string, d.status as "running" | "done" | "error", {
            ms: d.ms as number | undefined,
            errorMsg: d.error as string | undefined,
          });
          break;

        case "node_cached":
          setNodeStatus(d.id as string, "cached");
          break;

        case "node_output":
          setNodeOutput(d.id as string, d.port as string, d.preview);
          break;

        case "node_error":
          setNodeStatus(d.id as string, "error", { errorMsg: d.error as string });
          break;

        case "execution_start":
          setRunning(true, d.execution_id as string);
          break;

        case "execution_done":
        case "execution_stopped":
        case "execution_error":
          setRunning(false);
          break;

        case "loop_iteration":
          setLoopIter(d.iteration as number);
          break;
      }
    },
    [setManifests, setNodeStatus, setNodeOutput, setRunning, setLoopIter]
  );

  useEffect(() => {
    if (isTauri()) {
      // Running inside Tauri — connect to real Python engine
      onEngineEvent(handleEvent).then((unlisten) => {
        unlistenRef.current = unlisten;
      });
      engineApi.start().catch(console.error);
    } else {
      // Browser dev mode — load mock manifests so the UI is usable
      setManifests(MOCK_MANIFESTS);
    }

    return () => {
      unlistenRef.current?.();
    };
  }, [handleEvent, setManifests]);
}
