export type NodeStatus = "idle" | "running" | "done" | "error" | "cached";

export interface EngineEvent {
  event: string;
  data: unknown;
}

export interface NodeStatusEvent {
  id: string;
  status: "running" | "done" | "error" | "cached";
  ms?: number;
  error?: string;
}

export interface NodeOutputEvent {
  id: string;
  port: string;
  preview: string;   // base64 data URI
}

export interface LoopIterationEvent {
  execution_id: string;
  iteration: number;
}

export interface ExecutionDoneEvent {
  execution_id: string;
}
