import { create } from "zustand";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { FlowNodeData } from "@/types/node";
import type { WorkflowSettings } from "@/types/workflow";

interface Snapshot {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

interface FlowState {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  settings: WorkflowSettings;
  workflowName: string;

  // Undo/redo
  history: Snapshot[];
  future: Snapshot[];

  // Actions
  setNodes: (nodes: Node<FlowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<Node<FlowNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<FlowNodeData>) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  updateSettings: (settings: Partial<WorkflowSettings>) => void;
  setWorkflowName: (name: string) => void;
  resetGraph: () => void;
  /** Save current state to undo history (call before batch mutations). */
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

function pushHistory(state: FlowState): Partial<FlowState> {
  return {
    history: [
      ...state.history.slice(-(MAX_HISTORY - 1)),
      { nodes: state.nodes, edges: state.edges },
    ],
    future: [],
  };
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowName: "Untitled",
  settings: {
    run_mode: "once",
    loop_delay_ms: 500,
  },
  history: [],
  future: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => {
    const s = get();
    set({
      ...pushHistory(s),
      edges: addEdge({ ...connection, animated: false }, s.edges),
    });
  },

  addNode: (node) => {
    const s = get();
    set({
      ...pushHistory(s),
      nodes: [...s.nodes, node],
    });
  },

  updateNodeConfig: (nodeId, config) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } }
          : n
      ),
    }),

  updateSettings: (partial) =>
    set({ settings: { ...get().settings, ...partial } }),

  setWorkflowName: (name) => set({ workflowName: name }),

  resetGraph: () => {
    const s = get();
    set({ ...pushHistory(s), nodes: [], edges: [] });
  },

  pushHistory: () => {
    const s = get();
    set(pushHistory(s));
  },

  undo: () => {
    const { history, nodes, edges, future } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      history: history.slice(0, -1),
      future: [{ nodes, edges }, ...future.slice(0, MAX_HISTORY - 1)],
    });
  },

  redo: () => {
    const { future, nodes, edges, history } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      nodes: next.nodes,
      edges: next.edges,
      future: future.slice(1),
      history: [...history, { nodes, edges }],
    });
  },
}));
