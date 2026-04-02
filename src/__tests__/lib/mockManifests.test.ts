import { describe, it, expect } from "vitest";
import { MOCK_MANIFESTS } from "@/lib/mockManifests";

const VALID_PORT_TYPES = ["STRING", "IMAGE", "INT", "FLOAT", "BOOL", "JSON", "ANY"];
const VALID_CONFIG_TYPES = ["string", "int", "float", "bool", "select", "password"];

describe("MOCK_MANIFESTS", () => {
  it("should contain at least 30 manifests", () => {
    expect(MOCK_MANIFESTS.length).toBeGreaterThanOrEqual(30);
  });

  it("should have unique type identifiers", () => {
    const types = MOCK_MANIFESTS.map((m) => m.type);
    expect(new Set(types).size).toBe(types.length);
  });

  describe.each(MOCK_MANIFESTS)("$type ($label)", (manifest) => {
    it("should have all required fields", () => {
      expect(manifest.type).toBeTruthy();
      expect(manifest.label).toBeTruthy();
      expect(manifest.category).toBeTruthy();
      expect(typeof manifest.volatile).toBe("boolean");
      expect(Array.isArray(manifest.inputs)).toBe(true);
      expect(Array.isArray(manifest.outputs)).toBe(true);
      expect(Array.isArray(manifest.config_schema)).toBe(true);
    });

    it("should have valid input port definitions", () => {
      for (const port of manifest.inputs) {
        expect(port.name, `input port missing name`).toBeTruthy();
        expect(port.label, `input port ${port.name} missing label`).toBeTruthy();
        expect(
          VALID_PORT_TYPES,
          `input port ${port.name} has invalid type: ${port.type}`
        ).toContain(port.type);
      }
    });

    it("should have valid output port definitions", () => {
      for (const port of manifest.outputs) {
        expect(port.name, `output port missing name`).toBeTruthy();
        expect(port.label, `output port ${port.name} missing label`).toBeTruthy();
        expect(
          VALID_PORT_TYPES,
          `output port ${port.name} has invalid type: ${port.type}`
        ).toContain(port.type);
      }
    });

    it("should have unique input port names", () => {
      const names = manifest.inputs.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("should have unique output port names", () => {
      const names = manifest.outputs.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("should have valid config field definitions", () => {
      for (const field of manifest.config_schema) {
        expect(field.name, `config field missing name`).toBeTruthy();
        expect(field.label, `config field ${field.name} missing label`).toBeTruthy();
        expect(
          VALID_CONFIG_TYPES,
          `config field ${field.name} has invalid type: ${field.type}`
        ).toContain(field.type);
      }
    });

    it("should have options for select-type config fields", () => {
      for (const field of manifest.config_schema) {
        if (field.type === "select") {
          expect(
            Array.isArray(field.options) && field.options.length > 0,
            `select field ${field.name} must have non-empty options`
          ).toBe(true);
        }
      }
    });

    it("should have consistent min/max constraints", () => {
      for (const field of manifest.config_schema) {
        if (field.min !== undefined && field.max !== undefined) {
          expect(
            field.min <= field.max,
            `config field ${field.name}: min (${field.min}) > max (${field.max})`
          ).toBe(true);
        }
      }
    });
  });
});
