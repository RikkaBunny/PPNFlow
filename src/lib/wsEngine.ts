/**
 * WebSocket connection to the Python engine (browser dev mode).
 * Connects to ws://localhost:9320 and implements the same
 * JSON-RPC protocol as the Tauri stdin/stdout bridge.
 */

type EventHandler = (event: { event: string; data: unknown }) => void;
type ResponseHandler = (result: unknown, error?: string) => void;

let ws: WebSocket | null = null;
let eventHandler: EventHandler | null = null;
const pendingRequests: Map<string, ResponseHandler> = new Map();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const WS_URL = "ws://localhost:9320";

export function connectWsEngine(onEvent: EventHandler): () => void {
  eventHandler = onEvent;
  _connect();
  return () => {
    eventHandler = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
    ws = null;
  };
}

function _connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  try {
    ws = new WebSocket(WS_URL);
  } catch {
    _scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log("[PPNFlow] Connected to Python engine via WebSocket");
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);

      // It's an event (no id)
      if (msg.event && eventHandler) {
        eventHandler({ event: msg.event, data: msg.data });
        return;
      }

      // It's a response to a request
      if (msg.id && pendingRequests.has(msg.id)) {
        const handler = pendingRequests.get(msg.id)!;
        pendingRequests.delete(msg.id);
        handler(msg.result, msg.error);
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onclose = () => {
    console.log("[PPNFlow] WebSocket disconnected");
    _scheduleReconnect();
  };

  ws.onerror = () => {
    // will trigger onclose
  };
}

function _scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    _connect();
  }, 2000);
}

/**
 * Send a JSON-RPC request and return a promise for the response.
 */
export function wsSend(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket not connected. Is the Python engine running?"));
      return;
    }

    const id = crypto.randomUUID();
    pendingRequests.set(id, (result, error) => {
      if (error) reject(new Error(error));
      else resolve(result);
    });

    ws.send(JSON.stringify({ id, method, params }));

    // Timeout after 60s
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }
    }, 60000);
  });
}

export function isWsConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
