import { describe, it, expect } from "vitest";
import {
  getCategoryStyle,
  getNodeIcon,
  getPortColor,
  PORT_COLORS,
} from "@/lib/nodeColors";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";

describe("getCategoryStyle", () => {
  const knownCategories = [
    "Input", "Output", "AI", "Automation", "Control Flow",
    "Logic", "Data", "Transform", "Image", "Display",
    "Network", "File", "System",
  ];

  it.each(knownCategories)("should return a style for category: %s", (cat) => {
    const style = getCategoryStyle(cat);
    expect(style.color).toBeTruthy();
    expect(style.bg).toBeTruthy();
    expect(style.icon).toBeTruthy();
  });

  it("should return 'Other' fallback for unknown category", () => {
    const style = getCategoryStyle("UnknownCategory");
    expect(style).toEqual(getCategoryStyle("Other"));
  });

  it("should return 'Other' fallback when category is undefined", () => {
    const style = getCategoryStyle(undefined);
    expect(style.icon).toBe("Box");
  });

  it("should cover all categories used in MOCK_MANIFESTS", () => {
    const categories = new Set(MOCK_MANIFESTS.map((m) => m.category));
    for (const cat of categories) {
      const style = getCategoryStyle(cat);
      // Should NOT fall back to Other — the category should be explicitly defined
      expect(style.icon, `category "${cat}" fell back to Other`).not.toBe("Box");
    }
  });
});

describe("getNodeIcon", () => {
  it("should return an icon for every manifest node type", () => {
    for (const m of MOCK_MANIFESTS) {
      const icon = getNodeIcon(m.type, m.category);
      expect(icon, `no icon for node type "${m.type}"`).toBeTruthy();
    }
  });

  it("should fall back to category icon for unknown node type", () => {
    const icon = getNodeIcon("unknown_node", "AI");
    expect(icon).toBe("Sparkles"); // AI category icon
  });
});

describe("getPortColor", () => {
  const portTypes = ["STRING", "IMAGE", "INT", "FLOAT", "BOOL", "JSON", "ANY"];

  it.each(portTypes)("should return a color for port type: %s", (type) => {
    const color = getPortColor(type);
    expect(color).toBeTruthy();
    expect(color).toBe(PORT_COLORS[type]);
  });

  it("should handle lowercase port types", () => {
    expect(getPortColor("string")).toBe(PORT_COLORS.STRING);
    expect(getPortColor("image")).toBe(PORT_COLORS.IMAGE);
  });

  it("should return ANY color as fallback for unknown type", () => {
    expect(getPortColor("UNKNOWN")).toBe(PORT_COLORS.ANY);
  });

  it("should cover all port types used in MOCK_MANIFESTS", () => {
    const allPortTypes = new Set<string>();
    for (const m of MOCK_MANIFESTS) {
      for (const p of [...m.inputs, ...m.outputs]) {
        allPortTypes.add(p.type);
      }
    }
    for (const type of allPortTypes) {
      const color = getPortColor(type);
      expect(color, `no color for port type "${type}"`).toBeTruthy();
    }
  });
});
