/**
 * Typed wrappers around Tauri invoke/listen.
 * In browser-only dev mode (no Tauri), these fall back to mock implementations.
 */

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(cmd, args);
  }
  throw new Error(`Tauri not available. Command: ${cmd}`);
}

type UnlistenFn = () => void;

async function listen<T>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  if (isTauri()) {
    const { listen: tauriListen } = await import("@tauri-apps/api/event");
    return tauriListen<T>(event, (e) => handler(e.payload));
  }
  // No-op in browser
  return () => {};
}

// ── Engine commands ───────────────────────────────────────────────

export const engineApi = {
  start: () => invoke<void>("start_engine"),
  stop:  () => invoke<void>("stop_engine"),
  isRunning: () => invoke<boolean>("engine_is_running"),

  sendCommand: (method: string, params: Record<string, unknown> = {}) =>
    invoke<unknown>("send_engine_command", { method, params }),

  getNodeSchemas: () =>
    invoke<{ schemas: import("@/types/node").NodeManifest[] }>(
      "send_engine_command", { method: "get_node_schemas", params: {} }
    ),

  ping: () =>
    invoke<{ result: { pong: boolean } }>(
      "send_engine_command", { method: "ping", params: {} }
    ),

  executeGraph: (graph: unknown, options: {
    id?: string;
    mode?: "once" | "loop";
    loop_delay_ms?: number;
  } = {}) =>
    invoke<unknown>("send_engine_command", {
      method: "execute_graph",
      params: { graph, id: options.id ?? crypto.randomUUID(), ...options },
    }),

  stopExecution: (id: string) =>
    invoke<unknown>("send_engine_command", {
      method: "stop_execution",
      params: { id },
    }),
};

// ── Engine event listener ─────────────────────────────────────────

export const onEngineEvent = (
  handler: (event: { event: string; data: unknown }) => void
): Promise<UnlistenFn> =>
  listen<{ event: string; data: unknown }>("engine-event", handler);
