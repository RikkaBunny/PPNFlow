import type { NodeTypes } from "@xyflow/react";
import { GenericNode } from "./GenericNode";

// All PPNFlow nodes use the same React component (driven by schema)
// Define outside component to prevent re-renders
export const nodeTypes: NodeTypes = {
  ppnNode: GenericNode,
};
