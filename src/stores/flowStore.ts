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

interface FlowState {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  settings: WorkflowSettings;
  workflowName: string;

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
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowName: "Untitled",
  settings: {
    run_mode: "once",
    loop_delay_ms: 500,
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, animated: false }, get().edges) }),

  addNode: (node) =>
    set({ nodes: [...get().nodes, node] }),

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

  resetGraph: () => set({ nodes: [], edges: [] }),
}));
