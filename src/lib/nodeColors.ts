/**
 * Node category and type visual mappings.
 * Matches n8n's icon-centric design.
 */

export interface CategoryStyle {
  color: string;
  bg: string;
  icon: string;  // Lucide icon name
}

/** Category → visual style */
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Input: {
    color: "#ff6d5a",
    bg: "rgba(255,109,90,0.15)",
    icon: "Download",
  },
  Output: {
    color: "#af6bef",
    bg: "rgba(175,107,239,0.15)",
    icon: "Upload",
  },
  AI: {
    color: "#ff6dd3",
    bg: "rgba(255,109,211,0.15)",
    icon: "Sparkles",
  },
  Automation: {
    color: "#1fa8f2",
    bg: "rgba(31,168,242,0.15)",
    icon: "MousePointer2",
  },
  Logic: {
    color: "#e8b520",
    bg: "rgba(232,181,32,0.15)",
    icon: "GitBranch",
  },
  Transform: {
    color: "#1ac4b5",
    bg: "rgba(26,196,181,0.15)",
    icon: "ArrowRightLeft",
  },
  Display: {
    color: "#4cd964",
    bg: "rgba(76,217,100,0.15)",
    icon: "Eye",
  },
  Other: {
    color: "#8b95a5",
    bg: "rgba(139,149,165,0.15)",
    icon: "Box",
  },
};

/** Node type → specific icon override */
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

/** Port type → handle color */
export const PORT_COLORS: Record<string, string> = {
  STRING: "#a3e635",
  IMAGE: "#fb923c",
  INT: "#60a5fa",
  FLOAT: "#818cf8",
  BOOL: "#f472b6",
  JSON: "#facc15",
  ANY: "#94a3b8",
};

export function getPortColor(type: string): string {
  return PORT_COLORS[type.toUpperCase()] ?? PORT_COLORS.ANY;
}
