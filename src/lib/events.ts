/**
 * Simple event bus for node UI interactions.
 * GenericNode emits events, App.tsx listens.
 */
type Handler = (...args: unknown[]) => void;
const listeners: Map<string, Set<Handler>> = new Map();

export function emit(event: string, ...args: unknown[]) {
  listeners.get(event)?.forEach((fn) => fn(...args));
}

export function on(event: string, handler: Handler): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => { listeners.get(event)?.delete(handler); };
}
