import { describe, it, expect } from "vitest";
import { TEMPLATES } from "@/lib/templates";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";

// Build a lookup from manifests
const manifestByType = new Map(MOCK_MANIFESTS.map((m) => [m.type, m]));

describe("TEMPLATES", () => {
  it("should contain the built-in template set", () => {
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(TEMPLATES)("$id ($name)", (template) => {
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
  });
});
