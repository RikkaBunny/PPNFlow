/**
 * Node Function (MF) — encapsulates a sub-graph as a reusable node.
 * Inspired by Unreal Engine's Material Function system.
 */
import type { WorkflowNode, WorkflowEdge } from "./workflow";

/** Maps one port on the function node to an internal node+port. */
export interface NodeFunctionPortMapping {
  /** Port name on the function node's exterior */
  name: string;
  /** Display label */
  label: string;
  /** Port data type: STRING | IMAGE | INT | FLOAT | BOOL | JSON | ANY */
  type: string;
  /** Internal node ID this port maps to */
  internalNodeId: string;
  /** Internal port name this port maps to */
  internalPortName: string;
}

/** A reusable node function definition containing a sub-graph. */
export interface NodeFunctionDef {
  /** Unique identifier, e.g. "mf_abc123" */
  id: string;
  /** User-given name, e.g. "Bilibili Scraper" */
  name: string;
  /** Category for palette grouping (always "Node Function") */
  category: string;
  /** Internal sub-graph nodes (serialized WorkflowNode format) */
  internalNodes: WorkflowNode[];
  /** Internal sub-graph edges */
  internalEdges: WorkflowEdge[];
  /** Exposed input ports with mapping to internal nodes */
  inputs: NodeFunctionPortMapping[];
  /** Exposed output ports with mapping to internal nodes */
  outputs: NodeFunctionPortMapping[];
}

/** Prefix used for function node types: "mf:<defId>" */
export const MF_TYPE_PREFIX = "mf:";

/** Check if a nodeType string is a function node */
export function isMfType(nodeType: string): boolean {
  return nodeType.startsWith(MF_TYPE_PREFIX);
}

/** Extract the function def ID from a nodeType string */
export function getMfDefId(nodeType: string): string {
  return nodeType.slice(MF_TYPE_PREFIX.length);
}

/** Build the nodeType string from a function def ID */
export function toMfType(defId: string): string {
  return `${MF_TYPE_PREFIX}${defId}`;
}
