import { describe, it, expect } from "vitest";
import { createFlowNode } from "@/components/editor/createFlowNode";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";
import type { NodeManifest } from "@/types/node";

describe("createFlowNode", () => {
  const position = { x: 100, y: 200 };

  it("should return a node with correct structure", () => {
    const manifest = MOCK_MANIFESTS[0]; // screenshot
    const node = createFlowNode(manifest, position);

    expect(node.id).toBeTruthy();
    expect(node.type).toBe("ppnNode");
    expect(node.position).toEqual(position);
    expect(node.data.nodeType).toBe(manifest.type);
    expect(node.data.label).toBe(manifest.label);
    expect(node.data.status).toBe("idle");
  });

  it("should generate a UUID-format id", () => {
    const manifest = MOCK_MANIFESTS[0];
    const node = createFlowNode(manifest, position);
    // UUID v4 format: 8-4-4-4-12
    expect(node.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("should generate unique IDs on each call", () => {
    const manifest = MOCK_MANIFESTS[0];
    const ids = new Set(
      Array.from({ length: 10 }, () => createFlowNode(manifest, position).id)
    );
    expect(ids.size).toBe(10);
  });

  it("should extract default config from config_schema", () => {
    const manifest: NodeManifest = {
      type: "test_node",
      label: "Test",
      category: "Test",
      volatile: false,
      inputs: [],
      outputs: [],
      config_schema: [
        { name: "text", type: "string", label: "Text", default: "hello" },
        { name: "count", type: "int", label: "Count", default: 5 },
        { name: "enabled", type: "bool", label: "Enabled", default: true },
      ],
    };
    const node = createFlowNode(manifest, position);
    expect(node.data.config).toEqual({
      text: "hello",
      count: 5,
      enabled: true,
    });
  });

  it("should default to empty string when config field has no default", () => {
    const manifest: NodeManifest = {
      type: "test_node",
      label: "Test",
      category: "Test",
      volatile: false,
      inputs: [],
      outputs: [],
      config_schema: [
        { name: "path", type: "string", label: "Path" },
      ],
    };
    const node = createFlowNode(manifest, position);
    expect(node.data.config.path).toBe("");
  });

  it("should produce empty config for nodes with no config_schema", () => {
    const manifest: NodeManifest = {
      type: "json_parse",
      label: "JSON Parse",
      category: "Data",
      volatile: false,
      inputs: [{ name: "text", type: "STRING", label: "JSON String" }],
      outputs: [{ name: "data", type: "JSON", label: "Data" }],
      config_schema: [],
    };
    const node = createFlowNode(manifest, position);
    expect(node.data.config).toEqual({});
  });

  describe("all manifest types", () => {
    it.each(MOCK_MANIFESTS)(
      "should correctly create node for type: $type",
      (manifest) => {
        const node = createFlowNode(manifest, position);

        expect(node.data.nodeType).toBe(manifest.type);
        expect(node.data.label).toBe(manifest.label);
        expect(node.data.status).toBe("idle");

        // Verify every config field exists with correct default
        for (const field of manifest.config_schema) {
          expect(
            node.data.config,
            `config missing field "${field.name}" for ${manifest.type}`
          ).toHaveProperty(field.name);
          const expected = field.default ?? "";
          expect(node.data.config[field.name]).toEqual(expected);
        }
      }
    );
  });
});
