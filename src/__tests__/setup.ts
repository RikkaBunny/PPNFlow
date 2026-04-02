/**
 * Vitest global setup — ensure crypto.randomUUID is available.
 * Node 19+ has it natively; older versions need a polyfill.
 */
import { vi } from "vitest";

if (typeof globalThis.crypto === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomUUID } = await import("node:crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID },
  });
}
