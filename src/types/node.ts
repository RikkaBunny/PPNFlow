// Node manifest schema - matches Python BaseNode.get_schema()
export interface PortDef {
  name: string;
  type: string;   // "STRING" | "IMAGE" | "INT" | "FLOAT" | "BOOL" | "JSON" | "ANY"
  label: string;
  optional?: boolean;
  default?: unknown;
}

export interface ConfigField {
  name: string;
  type: "string" | "int" | "float" | "bool" | "select" | "password";
  label: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: string[];
  multiline?: boolean;
  placeholder?: string;
}

export interface NodeManifest {
  type: string;
  label: string;
  category: string;
  volatile: boolean;
  inputs: PortDef[];
  outputs: PortDef[];
  config_schema: ConfigField[];
}

// Data stored on each React Flow node
export type FlowNodeData = Record<string, unknown> & {
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
  // Runtime state (set by executionStore, not persisted)
  status?: "idle" | "running" | "done" | "error" | "cached";
  errorMsg?: string;
  lastOutputs?: Record<string, unknown>;  // port → value/preview
};
