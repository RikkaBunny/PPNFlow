import { describe, it, expect } from "vitest";
import { TEMPLATES } from "@/lib/templates";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";
import { deserializeGraph, serializeGraph } from "@/lib/graphSerializer";

// Build a lookup from manifests
const manifestByType = new Map(MOCK_MANIFESTS.map((m) => [m.type, m]));

describe("TEMPLATES", () => {
  const MOJIBAKE_MARKERS = ["鈫", "楦ｆ疆", "浣犳", "缃戦", "鍥剧", "鑷", "鏃ュ"];

  it("should contain the built-in template set", () => {
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(TEMPLATES)("$id ($name)", (template) => {
    it("should round-trip through graph serialization", () => {
      const deserialized = deserializeGraph(template.workflow);
      const roundTrip = serializeGraph(
        deserialized.nodes,
        deserialized.edges,
        deserialized.settings,
        template.workflow.name,
        deserialized.nodeFunctions
      );

      expect(roundTrip.nodes).toHaveLength(template.workflow.nodes.length);
      expect(roundTrip.edges).toHaveLength(template.workflow.edges.length);
      expect(roundTrip.settings).toEqual(template.workflow.settings);
    });

    it("should have all required top-level fields", () => {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.icon).toBeTruthy();
      expect(template.color).toBeTruthy();
      expect(template.workflow).toBeDefined();
    });

    it("should have valid workflow structure", () => {
      const wf = template.workflow;
      expect(wf.version).toBe("1.0");
      expect(wf.name).toBeTruthy();
      expect(Array.isArray(wf.nodes)).toBe(true);
      expect(Array.isArray(wf.edges)).toBe(true);
      expect(wf.settings).toBeDefined();
      expect(["once", "loop"]).toContain(wf.settings.run_mode);
      expect(typeof wf.settings.loop_delay_ms).toBe("number");
    });

    it("should have unique node IDs within the workflow", () => {
      const ids = template.workflow.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should have unique edge IDs within the workflow", () => {
      const ids = template.workflow.edges.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should reference only valid node types (exist in MOCK_MANIFESTS)", () => {
      for (const node of template.workflow.nodes) {
        expect(
          manifestByType.has(node.type),
          `node ${node.id} references unknown type "${node.type}"`
        ).toBe(true);
      }
    });

    it("should have edges that reference existing nodes", () => {
      const nodeIds = new Set(template.workflow.nodes.map((n) => n.id));
      for (const edge of template.workflow.edges) {
        expect(
          nodeIds.has(edge.source),
          `edge ${edge.id}: source "${edge.source}" not found in nodes`
        ).toBe(true);
        expect(
          nodeIds.has(edge.target),
          `edge ${edge.id}: target "${edge.target}" not found in nodes`
        ).toBe(true);
      }
    });

    it("should have edges with valid source port handles", () => {
      const nodeTypeMap = new Map(
        template.workflow.nodes.map((n) => [n.id, n.type])
      );
      for (const edge of template.workflow.edges) {
        const nodeType = nodeTypeMap.get(edge.source);
        if (!nodeType) continue;
        const manifest = manifestByType.get(nodeType);
        if (!manifest) continue;
        const outputNames = manifest.outputs.map((p) => p.name);
        expect(
          outputNames,
          `edge ${edge.id}: sourceHandle "${edge.sourceHandle}" is not a valid output of "${nodeType}" (valid: ${outputNames.join(", ")})`
        ).toContain(edge.sourceHandle);
      }
    });

    it("should have edges with valid target port handles", () => {
      const nodeTypeMap = new Map(
        template.workflow.nodes.map((n) => [n.id, n.type])
      );
      for (const edge of template.workflow.edges) {
        const nodeType = nodeTypeMap.get(edge.target);
        if (!nodeType) continue;
        const manifest = manifestByType.get(nodeType);
        if (!manifest) continue;
        const inputNames = manifest.inputs.map((p) => p.name);
        expect(
          inputNames,
          `edge ${edge.id}: targetHandle "${edge.targetHandle}" is not a valid input of "${nodeType}" (valid: ${inputNames.join(", ")})`
        ).toContain(edge.targetHandle);
      }
    });

    it("should have valid node positions", () => {
      for (const node of template.workflow.nodes) {
        expect(typeof node.position.x).toBe("number");
        expect(typeof node.position.y).toBe("number");
      }
    });

    it("should not contain obvious mojibake in user-facing strings", () => {
      const strings: string[] = [];
      const visit = (value: unknown) => {
        if (typeof value === "string") {
          strings.push(value);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (value && typeof value === "object") {
          Object.values(value).forEach(visit);
        }
      };

      visit({
        name: template.name,
        description: template.description,
        workflowName: template.workflow.name,
        configs: template.workflow.nodes.map((node) => node.config),
      });

      for (const value of strings) {
        for (const marker of MOJIBAKE_MARKERS) {
          expect(
            value.includes(marker),
            `found mojibake marker "${marker}" in "${value}"`
          ).toBe(false);
        }
      }
    });
  });

  it("web-scraper should feed template data from JSON", () => {
    const template = TEMPLATES.find((item) => item.id === "web-scraper");
    expect(template).toBeDefined();

    const edge = template!.workflow.edges.find((item) => item.target === "n5" && item.targetHandle === "data");
    expect(edge).toBeDefined();
    expect(edge!.source).toBe("n2");
    expect(edge!.sourceHandle).toBe("json_data");
  });

  it("screen-ocr-translate should feed OCR text into the template text input", () => {
    const template = TEMPLATES.find((item) => item.id === "screen-ocr-translate");
    expect(template).toBeDefined();

    const edge = template!.workflow.edges.find((item) => item.id === "e3");
    expect(edge).toMatchObject({
      source: "n3",
      sourceHandle: "text",
      target: "n4",
      targetHandle: "text",
    });
  });

  it("auto-form-fill should enforce focus -> delay -> type -> tab -> type order", () => {
    const template = TEMPLATES.find((item) => item.id === "auto-form-fill");
    expect(template).toBeDefined();

    expect(template!.workflow.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "n5", target: "n6" }),
        expect.objectContaining({ source: "n6", target: "n7" }),
        expect.objectContaining({ source: "n7", target: "n8" }),
        expect.objectContaining({ source: "n8", target: "n9" }),
      ])
    );
  });

  it("wuthering-waves-daily should preflight background mode before the task chain starts", () => {
    const template = TEMPLATES.find((item) => item.id === "wuthering-waves-daily");
    expect(template).toBeDefined();

    expect(template!.workflow.nodes.some((node) => node.id === "n0" && node.type === "ww_preflight")).toBe(true);
    expect(template!.workflow.nodes.some((node) => node.id === "n0a" && node.type === "condition")).toBe(true);
    expect(template!.workflow.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "n0", sourceHandle: "ready", target: "n0a", targetHandle: "value" }),
        expect.objectContaining({ source: "n0", sourceHandle: "message", target: "n0b", targetHandle: "value" }),
        expect.objectContaining({ source: "n0a", sourceHandle: "true_out", target: "n1", targetHandle: "trigger" }),
      ])
    );
  });

  it("wuthering-waves-daily should branch on the ready flag before claiming daily rewards", () => {
    const template = TEMPLATES.find((item) => item.id === "wuthering-waves-daily");
    expect(template).toBeDefined();

    expect(template!.workflow.nodes.some((node) => node.id === "n3a" && node.type === "condition")).toBe(true);
    expect(template!.workflow.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "n3", sourceHandle: "ready", target: "n3a", targetHandle: "value" }),
        expect.objectContaining({ source: "n3a", sourceHandle: "true_out", target: "n4", targetHandle: "trigger" }),
        expect.objectContaining({ source: "n3a", sourceHandle: "false_out", target: "n5", targetHandle: "trigger" }),
      ])
    );
  });
});
