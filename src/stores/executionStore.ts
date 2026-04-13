import { create } from "zustand";
import type { NodeStatus } from "@/types/execution";

interface NodeState {
  status: NodeStatus;
  errorMsg?: string;
  ms?: number;
  outputs: Record<string, unknown>;
}

export interface ExecutionNotice {
  kind: "info" | "success" | "error";
  message: string;
}

interface ExecutionState {
  isRunning: boolean;
  currentExecutionId: string | null;
  loopIteration: number;
  nodeStates: Record<string, NodeState>;
  notice: ExecutionNotice | null;

  setRunning: (running: boolean, executionId?: string) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus, extra?: Partial<NodeState>) => void;
  setNodeOutput: (nodeId: string, port: string, value: unknown) => void;
  setLoopIteration: (n: number) => void;
  setNotice: (notice: ExecutionNotice | null) => void;
  clearNotice: () => void;
  clearAll: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isRunning: false,
  currentExecutionId: null,
  loopIteration: 0,
  nodeStates: {},
  notice: null,

  setRunning: (running, executionId) =>
    set({
      isRunning: running,
      currentExecutionId: executionId ?? null,
      loopIteration: running ? 0 : get().loopIteration,
    }),

  setNodeStatus: (nodeId, status, extra = {}) =>
    set({
      nodeStates: {
        ...get().nodeStates,
        [nodeId]: {
          ...get().nodeStates[nodeId],
          status,
          outputs: get().nodeStates[nodeId]?.outputs ?? {},
          ...extra,
        },
      },
    }),

  setNodeOutput: (nodeId, port, value) => {
    const prev = get().nodeStates[nodeId] ?? { status: "idle", outputs: {} };
    set({
      nodeStates: {
        ...get().nodeStates,
        [nodeId]: { ...prev, outputs: { ...prev.outputs, [port]: value } },
      },
    });
  },

  setLoopIteration: (n) => set({ loopIteration: n }),

  setNotice: (notice) => set({ notice }),

  clearNotice: () => set({ notice: null }),

  clearAll: () =>
    set({ nodeStates: {}, isRunning: false, currentExecutionId: null, loopIteration: 0 }),
}));
