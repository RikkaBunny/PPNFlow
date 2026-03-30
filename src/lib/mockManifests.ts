/**
 * Built-in node manifests for UI preview when the Python engine is not running.
 * These match the Python node definitions in engine/nodes/.
 */
import type { NodeManifest } from "@/types/node";

export const MOCK_MANIFESTS: NodeManifest[] = [
  {
    type: "screenshot",
    label: "Screenshot",
    category: "Input",
    volatile: true,
    inputs: [],
    outputs: [
      { name: "image", type: "IMAGE", label: "Image" },
      { name: "img_path", type: "STRING", label: "Path" },
    ],
    config_schema: [
      { name: "monitor", type: "int", label: "Monitor Index", default: 0, min: 0, max: 8 },
      { name: "window_title", type: "string", label: "Window Title", default: "" },
    ],
  },
  {
    type: "ai_chat",
    label: "AI Chat",
    category: "AI",
    volatile: true,
    inputs: [
      { name: "prompt", type: "STRING", label: "Prompt" },
      { name: "image", type: "IMAGE", label: "Image", optional: true },
      { name: "system_prompt", type: "STRING", label: "System Prompt", optional: true },
    ],
    outputs: [
      { name: "response", type: "STRING", label: "Response" },
    ],
    config_schema: [
      { name: "provider", type: "select", label: "Provider", default: "openai", options: ["openai", "anthropic"] },
      { name: "model", type: "string", label: "Model", default: "gpt-4o" },
      { name: "system_prompt", type: "string", label: "System Prompt", default: "", multiline: true },
      { name: "temperature", type: "float", label: "Temperature", default: 0.7, min: 0, max: 2 },
      { name: "max_tokens", type: "int", label: "Max Tokens", default: 4096, min: 1, max: 32768 },
    ],
  },
  {
    type: "mouse_click",
    label: "Mouse Click",
    category: "Automation",
    volatile: true,
    inputs: [
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
    ],
    outputs: [
      { name: "success", type: "BOOL", label: "Success" },
    ],
    config_schema: [
      { name: "x", type: "int", label: "X (fallback)", default: 0 },
      { name: "y", type: "int", label: "Y (fallback)", default: 0 },
      { name: "button", type: "select", label: "Button", default: "left", options: ["left", "right", "middle"] },
      { name: "clicks", type: "int", label: "Clicks", default: 1, min: 1, max: 3 },
    ],
  },
  {
    type: "mouse_move",
    label: "Mouse Move",
    category: "Automation",
    volatile: true,
    inputs: [
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
    ],
    outputs: [
      { name: "success", type: "BOOL", label: "Success" },
    ],
    config_schema: [
      { name: "x", type: "int", label: "X", default: 0 },
      { name: "y", type: "int", label: "Y", default: 0 },
      { name: "duration", type: "float", label: "Duration (s)", default: 0.2, min: 0, max: 5 },
    ],
  },
  {
    type: "keyboard_type",
    label: "Keyboard Type",
    category: "Automation",
    volatile: true,
    inputs: [
      { name: "text", type: "STRING", label: "Text", optional: true },
    ],
    outputs: [
      { name: "success", type: "BOOL", label: "Success" },
    ],
    config_schema: [
      { name: "text", type: "string", label: "Text", default: "" },
      { name: "interval", type: "float", label: "Interval (s)", default: 0.02, min: 0, max: 1 },
    ],
  },
  {
    type: "keyboard_press",
    label: "Keyboard Press",
    category: "Automation",
    volatile: true,
    inputs: [],
    outputs: [
      { name: "success", type: "BOOL", label: "Success" },
    ],
    config_schema: [
      { name: "key", type: "string", label: "Key", default: "enter" },
    ],
  },
  {
    type: "condition",
    label: "Condition",
    category: "Logic",
    volatile: false,
    inputs: [
      { name: "value", type: "ANY", label: "Value" },
    ],
    outputs: [
      { name: "true", type: "ANY", label: "True" },
      { name: "false", type: "ANY", label: "False" },
    ],
    config_schema: [
      { name: "operator", type: "select", label: "Operator", default: "equals", options: ["equals", "not_equals", "contains", "gt", "lt"] },
      { name: "compare_value", type: "string", label: "Compare To", default: "" },
    ],
  },
  {
    type: "delay",
    label: "Delay",
    category: "Logic",
    volatile: true,
    inputs: [
      { name: "trigger", type: "ANY", label: "Trigger", optional: true },
    ],
    outputs: [
      { name: "done", type: "BOOL", label: "Done" },
    ],
    config_schema: [
      { name: "ms", type: "int", label: "Delay (ms)", default: 1000, min: 0, max: 60000 },
    ],
  },
  {
    type: "json_parse",
    label: "JSON Parse",
    category: "Transform",
    volatile: false,
    inputs: [
      { name: "text", type: "STRING", label: "JSON Text" },
    ],
    outputs: [
      { name: "data", type: "JSON", label: "Data" },
    ],
    config_schema: [],
  },
  {
    type: "extract_field",
    label: "Extract Field",
    category: "Transform",
    volatile: false,
    inputs: [
      { name: "data", type: "JSON", label: "Data" },
    ],
    outputs: [
      { name: "value", type: "ANY", label: "Value" },
    ],
    config_schema: [
      { name: "field", type: "string", label: "Field Path", default: "" },
    ],
  },
  {
    type: "text_input",
    label: "Text Input",
    category: "Input",
    volatile: false,
    inputs: [],
    outputs: [
      { name: "text", type: "STRING", label: "Text" },
    ],
    config_schema: [
      { name: "value", type: "string", label: "Text Value", default: "", multiline: true },
    ],
  },
  {
    type: "text_display",
    label: "Text Display",
    category: "Display",
    volatile: false,
    inputs: [
      { name: "text", type: "STRING", label: "Text" },
    ],
    outputs: [],
    config_schema: [],
  },
  {
    type: "image_display",
    label: "Image Display",
    category: "Display",
    volatile: false,
    inputs: [
      { name: "image", type: "IMAGE", label: "Image" },
    ],
    outputs: [],
    config_schema: [],
  },
  {
    type: "template",
    label: "Template",
    category: "Transform",
    volatile: false,
    inputs: [
      { name: "data", type: "JSON", label: "Data", optional: true },
    ],
    outputs: [
      { name: "text", type: "STRING", label: "Text" },
    ],
    config_schema: [
      { name: "template", type: "string", label: "Template", default: "", multiline: true, placeholder: "Use {{field}} for variables" },
    ],
  },
];
