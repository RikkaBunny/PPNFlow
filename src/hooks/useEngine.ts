import { useEffect, useRef, useCallback } from "react";
import { connectWsEngine, wsSend } from "@/lib/wsEngine";
import { useManifestStore } from "@/stores/manifestStore";
import { useExecutionStore } from "@/stores/executionStore";
import { useFlowStore } from "@/stores/flowStore";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";

/**
 * Manages the WebSocket connection to the Python engine.
 * The frontend always talks to the backend via JSON messages over WebSocket.
 * Falls back to mock manifests when the backend is unavailable.
 */
export function useEngine() {
  const setManifests  = useManifestStore((s) => s.setManifests);
  const loaded        = useManifestStore((s) => s.loaded);
  const setNodeStatus = useExecutionStore((s) => s.setNodeStatus);
  const setNodeOutput = useExecutionStore((s) => s.setNodeOutput);
  const setRunning    = useExecutionStore((s) => s.setRunning);
  const setLoopIter   = useExecutionStore((s) => s.setLoopIteration);
  const setNotice     = useExecutionStore((s) => s.setNotice);
  const unlistenRef   = useRef<(() => void) | null>(null);

  const handleEvent = useCallback(
    (evt: { event: string; data: unknown }) => {
      const d = evt.data as Record<string, unknown>;
      switch (evt.event) {
        case "engine_ready":
          setNotice(null);
          wsSend("get_node_schemas")
            .then((res) => {
              const r = res as { schemas?: unknown[] };
              if (r?.schemas) {
                setManifests(r.schemas as Parameters<typeof setManifests>[0]);
              }
            })
            .catch(() => {
              if (!loaded) setManifests(MOCK_MANIFESTS);
            });
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
          {
            const nodeId = d.id as string;
            const port = d.port as string;
            const preview = d.preview;
            const node = useFlowStore.getState().nodes.find((item) => item.id === nodeId);
            const nodeType = typeof node?.data?.nodeType === "string" ? node.data.nodeType : "";
            const text = typeof preview === "string" ? preview : String(preview ?? "");
            if (
              nodeType === "ww_preflight" &&
              port === "message" &&
              /not ready|blocked|not found|needs admin|minimized/i.test(text)
            ) {
              setNotice({
                kind: "error",
                message: `Wuthering Waves preflight failed: ${text}`,
              });
            }
          }
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
          if (typeof d.error === "string" && d.error.trim()) {
            setNotice({ kind: "error", message: d.error });
          }
          setRunning(false);
          break;

        case "loop_iteration":
          setLoopIter(d.iteration as number);
          break;
      }
    },
    [setManifests, setNodeStatus, setNodeOutput, setRunning, setLoopIter, loaded, setNotice]
  );

  useEffect(() => {
    const unlisten = connectWsEngine(handleEvent);
    unlistenRef.current = unlisten;

    // If no engine connects within 3s, load mock manifests
    const fallbackTimer = setTimeout(() => {
      if (!useManifestStore.getState().loaded) {
        console.log("[PPNFlow] No engine connected, using mock manifests");
        setManifests(MOCK_MANIFESTS);
        setNotice({
          kind: "error",
          message: "Python engine is not connected. PPNFlow is currently using mock mode, so nodes can render and simulate but desktop automation templates will not actually control external apps or games.",
        });
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      unlistenRef.current?.();
    };
  }, [handleEvent, setManifests]);
}
