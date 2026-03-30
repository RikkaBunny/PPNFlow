/**
 * Category → visual mapping for nodes.
 * Each category gets a unique accent color and Lucide icon name.
 */

export interface CategoryStyle {
  color: string;      // Tailwind-compatible hex
  bgLight: string;    // Light background for node header
  bgDark: string;     // Dark background for node body
  border: string;     // Border color
  icon: string;       // Lucide icon name
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Input: {
    color: "#f97316",
    bgLight: "rgba(249,115,22,0.15)",
    bgDark: "rgba(249,115,22,0.06)",
    border: "rgba(249,115,22,0.4)",
    icon: "Download",
  },
  Output: {
    color: "#8b5cf6",
    bgLight: "rgba(139,92,246,0.15)",
    bgDark: "rgba(139,92,246,0.06)",
    border: "rgba(139,92,246,0.4)",
    icon: "Upload",
  },
  AI: {
    color: "#ec4899",
    bgLight: "rgba(236,72,153,0.15)",
    bgDark: "rgba(236,72,153,0.06)",
    border: "rgba(236,72,153,0.4)",
    icon: "Brain",
  },
  Automation: {
    color: "#3b82f6",
    bgLight: "rgba(59,130,246,0.15)",
    bgDark: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.4)",
    icon: "Zap",
  },
  Logic: {
    color: "#eab308",
    bgLight: "rgba(234,179,8,0.15)",
    bgDark: "rgba(234,179,8,0.06)",
    border: "rgba(234,179,8,0.4)",
    icon: "GitBranch",
  },
  Transform: {
    color: "#06b6d4",
    bgLight: "rgba(6,182,212,0.15)",
    bgDark: "rgba(6,182,212,0.06)",
    border: "rgba(6,182,212,0.4)",
    icon: "Shuffle",
  },
  Display: {
    color: "#22c55e",
    bgLight: "rgba(34,197,94,0.15)",
    bgDark: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.4)",
    icon: "Monitor",
  },
  Other: {
    color: "#94a3b8",
    bgLight: "rgba(148,163,184,0.15)",
    bgDark: "rgba(148,163,184,0.06)",
    border: "rgba(148,163,184,0.4)",
    icon: "Box",
  },
};

export function getCategoryStyle(category?: string): CategoryStyle {
  return CATEGORY_STYLES[category ?? "Other"] ?? CATEGORY_STYLES.Other;
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
