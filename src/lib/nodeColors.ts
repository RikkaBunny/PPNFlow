/**
 * Node category and type visual mappings.
 * White + pink theme — softer, lighter icon backgrounds.
 */

export interface CategoryStyle {
  color: string;
  bg: string;
  icon: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Input: {
    color: "#e84393",
    bg: "rgba(232,67,147,0.1)",
    icon: "Download",
  },
  Output: {
    color: "#8e44ad",
    bg: "rgba(142,68,173,0.1)",
    icon: "Upload",
  },
  AI: {
    color: "#e84393",
    bg: "rgba(232,67,147,0.1)",
    icon: "Sparkles",
  },
  Automation: {
    color: "#2980b9",
    bg: "rgba(41,128,185,0.1)",
    icon: "MousePointer2",
  },
  Logic: {
    color: "#e67e22",
    bg: "rgba(230,126,34,0.1)",
    icon: "GitBranch",
  },
  Transform: {
    color: "#16a085",
    bg: "rgba(22,160,133,0.1)",
    icon: "ArrowRightLeft",
  },
  Display: {
    color: "#27ae60",
    bg: "rgba(39,174,96,0.1)",
    icon: "Eye",
  },
  Other: {
    color: "#7f8c8d",
    bg: "rgba(127,140,141,0.1)",
    icon: "Box",
  },
};

const NODE_TYPE_ICONS: Record<string, string> = {
  screenshot: "Camera",
  ai_chat: "Sparkles",
  mouse_click: "MousePointer2",
  mouse_move: "Move",
  keyboard_type: "Keyboard",
  keyboard_press: "Keyboard",
  text_input: "Type",
  text_display: "FileText",
  image_display: "Image",
  json_parse: "Braces",
  extract_field: "Search",
  condition: "GitBranch",
  delay: "Clock",
  template: "FileCode",
};

export function getCategoryStyle(category?: string): CategoryStyle {
  return CATEGORY_STYLES[category ?? "Other"] ?? CATEGORY_STYLES.Other;
}

export function getNodeIcon(nodeType: string, category?: string): string {
  return NODE_TYPE_ICONS[nodeType] ?? getCategoryStyle(category).icon;
}

export const PORT_COLORS: Record<string, string> = {
  STRING: "#27ae60",
  IMAGE: "#e67e22",
  INT: "#2980b9",
  FLOAT: "#8e44ad",
  BOOL: "#e84393",
  JSON: "#f39c12",
  ANY: "#95a5a6",
};

export function getPortColor(type: string): string {
  return PORT_COLORS[type.toUpperCase()] ?? PORT_COLORS.ANY;
}
