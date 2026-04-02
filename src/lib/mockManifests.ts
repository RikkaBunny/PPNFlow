/**
 * Built-in node manifests for UI preview when the Python engine is not running.
 * Auto-generated from engine/nodes/*.py definitions.
 */
import type { NodeManifest } from "@/types/node";

export const MOCK_MANIFESTS: NodeManifest[] = [
  // ── Input ──
  {
    type: "screenshot", label: "Screenshot", category: "Input", volatile: true,
    inputs: [],
    outputs: [
      { name: "image", type: "IMAGE", label: "Image" },
      { name: "img_path", type: "STRING", label: "File Path" },
    ],
    config_schema: [
      { name: "monitor", type: "int", label: "Monitor Index", default: 0, min: 0, max: 8 },
      { name: "window_title", type: "string", label: "Window Title", default: "" },
    ],
  },
  {
    type: "window_screenshot", label: "Window Screenshot", category: "Input", volatile: true,
    inputs: [
      { name: "title", type: "STRING", label: "Window Title", optional: true },
    ],
    outputs: [
      { name: "image", type: "IMAGE", label: "Image" },
      { name: "img_path", type: "STRING", label: "File Path" },
      { name: "width", type: "INT", label: "Width" },
      { name: "height", type: "INT", label: "Height" },
    ],
    config_schema: [
      { name: "window_title", type: "string", label: "Window Title", default: "" },
    ],
  },
  {
    type: "text_input", label: "Text Input", category: "Input", volatile: false,
    inputs: [],
    outputs: [{ name: "text", type: "STRING", label: "Text" }],
    config_schema: [
      { name: "value", type: "string", label: "Text Value", default: "", multiline: true },
    ],
  },
  {
    type: "number_input", label: "Number Input", category: "Input", volatile: false,
    inputs: [],
    outputs: [{ name: "value", type: "FLOAT", label: "Value" }],
    config_schema: [
      { name: "value", type: "float", label: "Value", default: 0 },
    ],
  },
  {
    type: "random_number", label: "Random Number", category: "Input", volatile: true,
    inputs: [],
    outputs: [
      { name: "value", type: "FLOAT", label: "Value" },
      { name: "integer", type: "INT", label: "Integer" },
    ],
    config_schema: [
      { name: "min", type: "float", label: "Min", default: 0 },
      { name: "max", type: "float", label: "Max", default: 100 },
    ],
  },
  {
    type: "pixel_color", label: "Pixel Color", category: "Input", volatile: true,
    inputs: [
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
      { name: "image", type: "IMAGE", label: "Image", optional: true },
    ],
    outputs: [
      { name: "r", type: "INT", label: "R" },
      { name: "g", type: "INT", label: "G" },
      { name: "b", type: "INT", label: "B" },
      { name: "hex", type: "STRING", label: "Hex" },
      { name: "match", type: "BOOL", label: "Match" },
    ],
    config_schema: [
      { name: "x", type: "int", label: "X", default: 0 },
      { name: "y", type: "int", label: "Y", default: 0 },
      { name: "expect_hex", type: "string", label: "Expected Color", default: "" },
    ],
  },

  // ── AI ──
  {
    type: "ai_chat", label: "AI Chat", category: "AI", volatile: true,
    inputs: [
      { name: "prompt", type: "STRING", label: "Prompt" },
      { name: "image", type: "IMAGE", label: "Image", optional: true },
      { name: "system_prompt", type: "STRING", label: "System Prompt", optional: true },
    ],
    outputs: [{ name: "response", type: "STRING", label: "Response" }],
    config_schema: [
      { name: "provider", type: "select", label: "Provider", default: "openai",
        options: ["openai", "anthropic", "ollama", "lmstudio", "custom"] },
      { name: "api_key", type: "password", label: "API Key", default: "",
        visible_when: { field: "provider", values: ["openai", "anthropic", "custom"] } },
      { name: "base_url", type: "string", label: "API Base URL", default: "",
        placeholder: "e.g. http://localhost:11434/v1",
        visible_when: { field: "provider", values: ["ollama", "lmstudio", "custom"] } },
      { name: "model", type: "string", label: "Model", default: "gpt-4o" },
      { name: "system_prompt", type: "string", label: "System Prompt", default: "", multiline: true },
      { name: "temperature", type: "float", label: "Temperature", default: 0.7, min: 0, max: 2 },
      { name: "max_tokens", type: "int", label: "Max Tokens", default: 4096, min: 1, max: 32768 },
    ],
  },

  // ── Automation ──
  {
    type: "mouse_click", label: "Mouse Click", category: "Automation", volatile: true,
    inputs: [
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
    ],
    outputs: [{ name: "success", type: "BOOL", label: "Success" }],
    config_schema: [
      { name: "x", type: "int", label: "X", default: 0 },
      { name: "y", type: "int", label: "Y", default: 0 },
      { name: "button", type: "select", label: "Button", default: "left", options: ["left", "right", "middle"] },
      { name: "clicks", type: "int", label: "Clicks", default: 1, min: 1, max: 3 },
    ],
  },
  {
    type: "mouse_move", label: "Mouse Move", category: "Automation", volatile: true,
    inputs: [
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
    ],
    outputs: [{ name: "success", type: "BOOL", label: "Success" }],
    config_schema: [
      { name: "x", type: "int", label: "X", default: 0 },
      { name: "y", type: "int", label: "Y", default: 0 },
      { name: "duration", type: "float", label: "Duration (s)", default: 0.1 },
    ],
  },
  {
    type: "mouse_scroll", label: "Mouse Scroll", category: "Automation", volatile: true,
    inputs: [
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
    ],
    outputs: [{ name: "success", type: "BOOL", label: "Success" }],
    config_schema: [
      { name: "clicks", type: "int", label: "Scroll Amount", default: 3, min: -100, max: 100 },
    ],
  },
  {
    type: "mouse_drag", label: "Mouse Drag", category: "Automation", volatile: true,
    inputs: [
      { name: "start_x", type: "INT", label: "Start X", optional: true },
      { name: "start_y", type: "INT", label: "Start Y", optional: true },
      { name: "end_x", type: "INT", label: "End X", optional: true },
      { name: "end_y", type: "INT", label: "End Y", optional: true },
    ],
    outputs: [{ name: "success", type: "BOOL", label: "Success" }],
    config_schema: [
      { name: "start_x", type: "int", label: "Start X", default: 0 },
      { name: "start_y", type: "int", label: "Start Y", default: 0 },
      { name: "end_x", type: "int", label: "End X", default: 100 },
      { name: "end_y", type: "int", label: "End Y", default: 100 },
      { name: "duration", type: "float", label: "Duration (s)", default: 0.3 },
    ],
  },
  {
    type: "keyboard_type", label: "Keyboard Type", category: "Automation", volatile: true,
    inputs: [{ name: "text", type: "STRING", label: "Text", optional: true }],
    outputs: [{ name: "success", type: "BOOL", label: "Success" }],
    config_schema: [
      { name: "text", type: "string", label: "Text", default: "" },
      { name: "interval", type: "float", label: "Interval (s)", default: 0.05 },
    ],
  },
  {
    type: "keyboard_press", label: "Keyboard Press", category: "Automation", volatile: true,
    inputs: [{ name: "key", type: "STRING", label: "Key", optional: true }],
    outputs: [{ name: "success", type: "BOOL", label: "Success" }],
    config_schema: [
      { name: "key", type: "string", label: "Key / Hotkey", default: "enter" },
    ],
  },
  {
    type: "window_focus", label: "Window Focus", category: "Automation", volatile: true,
    inputs: [{ name: "title", type: "STRING", label: "Title", optional: true }],
    outputs: [{ name: "success", type: "BOOL", label: "Success" }],
    config_schema: [
      { name: "title", type: "string", label: "Window Title", default: "" },
    ],
  },
  {
    type: "window_list", label: "Window List", category: "Automation", volatile: true,
    inputs: [],
    outputs: [
      { name: "windows", type: "JSON", label: "Windows" },
      { name: "titles", type: "STRING", label: "Titles" },
    ],
    config_schema: [
      { name: "filter", type: "string", label: "Filter", default: "" },
    ],
  },

  // ── Image ──
  {
    type: "image_crop", label: "Image Crop", category: "Image", volatile: false,
    inputs: [
      { name: "image", type: "IMAGE", label: "Image" },
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
    ],
    outputs: [
      { name: "image", type: "IMAGE", label: "Cropped" },
      { name: "img_path", type: "STRING", label: "File Path" },
    ],
    config_schema: [
      { name: "x", type: "int", label: "X", default: 0 },
      { name: "y", type: "int", label: "Y", default: 0 },
      { name: "width", type: "int", label: "Width", default: 200 },
      { name: "height", type: "int", label: "Height", default: 200 },
    ],
  },
  {
    type: "image_resize", label: "Image Resize", category: "Image", volatile: false,
    inputs: [{ name: "image", type: "IMAGE", label: "Image" }],
    outputs: [
      { name: "image", type: "IMAGE", label: "Resized" },
      { name: "img_path", type: "STRING", label: "File Path" },
    ],
    config_schema: [
      { name: "width", type: "int", label: "Width", default: 640 },
      { name: "height", type: "int", label: "Height", default: 480 },
      { name: "keep_ratio", type: "bool", label: "Keep Aspect Ratio", default: true },
    ],
  },
  {
    type: "image_match", label: "Image Match", category: "Image", volatile: true,
    inputs: [
      { name: "image", type: "IMAGE", label: "Source Image" },
      { name: "template", type: "IMAGE", label: "Template" },
    ],
    outputs: [
      { name: "found", type: "BOOL", label: "Found" },
      { name: "x", type: "INT", label: "X" },
      { name: "y", type: "INT", label: "Y" },
      { name: "confidence", type: "FLOAT", label: "Confidence" },
    ],
    config_schema: [
      { name: "threshold", type: "float", label: "Threshold", default: 0.8, min: 0, max: 1 },
    ],
  },
  {
    type: "ocr", label: "OCR", category: "Image", volatile: true,
    inputs: [
      { name: "image", type: "IMAGE", label: "Image" },
      { name: "x", type: "INT", label: "X", optional: true },
      { name: "y", type: "INT", label: "Y", optional: true },
      { name: "w", type: "INT", label: "Width", optional: true },
      { name: "h", type: "INT", label: "Height", optional: true },
    ],
    outputs: [
      { name: "text", type: "STRING", label: "Text" },
      { name: "blocks", type: "JSON", label: "Blocks" },
      { name: "confidence", type: "FLOAT", label: "Confidence" },
      { name: "count", type: "INT", label: "Block Count" },
    ],
    config_schema: [
      { name: "engine", type: "select", label: "OCR Engine", default: "rapidocr",
        options: [
          { value: "rapidocr", label: "RapidOCR (recommended)", package: "rapidocr" },
          { value: "pytesseract", label: "Tesseract OCR", package: "pytesseract" },
          { value: "easyocr", label: "EasyOCR", package: "easyocr" },
          { value: "winocr", label: "Windows OCR", package: "winocr" },
        ] },
      { name: "lang", type: "string", label: "Language", default: "" },
      { name: "preprocess", type: "select", label: "Preprocessing", default: "none",
        options: ["none", "grayscale", "binarize", "contrast"] },
      { name: "crop_region", type: "bool", label: "Crop from Inputs", default: false },
    ],
  },

  // ── Data ──
  {
    type: "json_parse", label: "JSON Parse", category: "Data", volatile: false,
    inputs: [{ name: "text", type: "STRING", label: "JSON String" }],
    outputs: [{ name: "data", type: "JSON", label: "Data" }],
    config_schema: [],
  },
  {
    type: "extract_field", label: "Extract Field", category: "Data", volatile: false,
    inputs: [{ name: "data", type: "JSON", label: "Data" }],
    outputs: [{ name: "value", type: "ANY", label: "Value" }],
    config_schema: [
      { name: "path", type: "string", label: "Field Path", default: "key" },
    ],
  },
  {
    type: "template", label: "Template", category: "Data", volatile: false,
    inputs: [
      { name: "data", type: "JSON", label: "Data", optional: true },
      { name: "text", type: "STRING", label: "Text", optional: true },
    ],
    outputs: [{ name: "result", type: "STRING", label: "Result" }],
    config_schema: [
      { name: "template", type: "string", label: "Template", default: "", multiline: true },
    ],
  },
  {
    type: "string_concat", label: "String Concat", category: "Data", volatile: false,
    inputs: [
      { name: "a", type: "STRING", label: "A" },
      { name: "b", type: "STRING", label: "B", optional: true },
    ],
    outputs: [{ name: "result", type: "STRING", label: "Result" }],
    config_schema: [
      { name: "separator", type: "string", label: "Separator", default: "" },
    ],
  },
  {
    type: "string_replace", label: "String Replace", category: "Data", volatile: false,
    inputs: [{ name: "text", type: "STRING", label: "Text" }],
    outputs: [{ name: "result", type: "STRING", label: "Result" }],
    config_schema: [
      { name: "find", type: "string", label: "Find", default: "" },
      { name: "replace", type: "string", label: "Replace With", default: "" },
    ],
  },
  {
    type: "string_split", label: "String Split", category: "Data", volatile: false,
    inputs: [{ name: "text", type: "STRING", label: "Text" }],
    outputs: [
      { name: "parts", type: "JSON", label: "Parts" },
      { name: "count", type: "INT", label: "Count" },
      { name: "first", type: "STRING", label: "First" },
      { name: "last", type: "STRING", label: "Last" },
    ],
    config_schema: [
      { name: "delimiter", type: "string", label: "Delimiter", default: "\\n" },
    ],
  },
  {
    type: "regex", label: "Regex Match", category: "Data", volatile: false,
    inputs: [{ name: "text", type: "STRING", label: "Text" }],
    outputs: [
      { name: "match", type: "STRING", label: "Match" },
      { name: "groups", type: "JSON", label: "Groups" },
      { name: "found", type: "BOOL", label: "Found" },
      { name: "all", type: "JSON", label: "All Matches" },
    ],
    config_schema: [
      { name: "pattern", type: "string", label: "Pattern", default: "" },
      { name: "mode", type: "select", label: "Mode", default: "search", options: ["search", "findall", "match"] },
    ],
  },
  {
    type: "math", label: "Math", category: "Data", volatile: false,
    inputs: [
      { name: "a", type: "FLOAT", label: "A" },
      { name: "b", type: "FLOAT", label: "B", optional: true },
    ],
    outputs: [{ name: "result", type: "FLOAT", label: "Result" }],
    config_schema: [
      { name: "op", type: "select", label: "Operation", default: "add", options: ["add", "subtract", "multiply", "divide", "mod", "power", "min", "max", "abs"] },
      { name: "b_fallback", type: "float", label: "B (fallback)", default: 0 },
    ],
  },
  {
    type: "compare", label: "Compare", category: "Data", volatile: false,
    inputs: [
      { name: "a", type: "ANY", label: "A" },
      { name: "b", type: "ANY", label: "B", optional: true },
    ],
    outputs: [{ name: "result", type: "BOOL", label: "Result" }],
    config_schema: [
      { name: "op", type: "select", label: "Operator", default: "==", options: ["==", "!=", ">", "<", ">=", "<=", "contains", "starts_with", "ends_with"] },
      { name: "b_value", type: "string", label: "B (fallback)", default: "" },
    ],
  },
  {
    type: "type_convert", label: "Type Convert", category: "Data", volatile: false,
    inputs: [{ name: "value", type: "ANY", label: "Value" }],
    outputs: [
      { name: "string", type: "STRING", label: "String" },
      { name: "number", type: "FLOAT", label: "Number" },
      { name: "integer", type: "INT", label: "Integer" },
      { name: "bool", type: "BOOL", label: "Boolean" },
    ],
    config_schema: [],
  },

  // ── Control Flow ──
  {
    type: "condition", label: "Condition", category: "Control Flow", volatile: true,
    inputs: [{ name: "value", type: "ANY", label: "Value" }],
    outputs: [
      { name: "true_out", type: "ANY", label: "True" },
      { name: "false_out", type: "ANY", label: "False" },
    ],
    config_schema: [
      { name: "expression", type: "string", label: "Expression", default: "value == True" },
    ],
  },
  {
    type: "delay", label: "Delay", category: "Control Flow", volatile: true,
    inputs: [{ name: "trigger", type: "ANY", label: "Trigger", optional: true }],
    outputs: [{ name: "trigger", type: "ANY", label: "Trigger" }],
    config_schema: [
      { name: "ms", type: "int", label: "Milliseconds", default: 1000, min: 0, max: 60000 },
    ],
  },
  {
    type: "loop_counter", label: "Loop Counter", category: "Control Flow", volatile: true,
    inputs: [{ name: "reset", type: "BOOL", label: "Reset", optional: true }],
    outputs: [
      { name: "count", type: "INT", label: "Count" },
      { name: "is_first", type: "BOOL", label: "Is First" },
    ],
    config_schema: [
      { name: "counter_id", type: "string", label: "Counter ID", default: "default" },
    ],
  },

  // ── Network ──
  {
    type: "http_request", label: "HTTP Request", category: "Network", volatile: true,
    inputs: [
      { name: "url", type: "STRING", label: "URL", optional: true },
      { name: "body", type: "STRING", label: "Body", optional: true },
    ],
    outputs: [
      { name: "response", type: "STRING", label: "Response" },
      { name: "status_code", type: "INT", label: "Status Code" },
      { name: "json_data", type: "JSON", label: "JSON" },
    ],
    config_schema: [
      { name: "url", type: "string", label: "URL", default: "" },
      { name: "method", type: "select", label: "Method", default: "GET", options: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
      { name: "headers", type: "string", label: "Headers (JSON)", default: "{}", multiline: true },
      { name: "body", type: "string", label: "Body", default: "", multiline: true },
    ],
  },

  // ── File ──
  {
    type: "file_read", label: "File Read", category: "File", volatile: false,
    inputs: [{ name: "path", type: "STRING", label: "Path", optional: true }],
    outputs: [
      { name: "content", type: "STRING", label: "Content" },
      { name: "size", type: "INT", label: "Size" },
    ],
    config_schema: [
      { name: "path", type: "string", label: "File Path", default: "" },
      { name: "encoding", type: "string", label: "Encoding", default: "utf-8" },
    ],
  },
  {
    type: "file_write", label: "File Write", category: "File", volatile: true,
    inputs: [
      { name: "content", type: "STRING", label: "Content" },
      { name: "path", type: "STRING", label: "Path", optional: true },
    ],
    outputs: [
      { name: "path", type: "STRING", label: "Path" },
      { name: "success", type: "BOOL", label: "Success" },
    ],
    config_schema: [
      { name: "path", type: "string", label: "File Path", default: "" },
      { name: "mode", type: "select", label: "Mode", default: "write", options: ["write", "append"] },
    ],
  },

  // ── Output ──
  {
    type: "text_display", label: "Text Display", category: "Output", volatile: true,
    inputs: [{ name: "text", type: "STRING", label: "Text" }],
    outputs: [],
    config_schema: [],
  },
  {
    type: "image_display", label: "Image Display", category: "Output", volatile: true,
    inputs: [{ name: "image", type: "IMAGE", label: "Image" }],
    outputs: [],
    config_schema: [],
  },
  {
    type: "log", label: "Log", category: "Output", volatile: true,
    inputs: [{ name: "value", type: "ANY", label: "Value" }],
    outputs: [{ name: "value", type: "ANY", label: "Pass Through" }],
    config_schema: [
      { name: "label", type: "string", label: "Label", default: "LOG" },
    ],
  },

  // ── System ──
  {
    type: "run_command", label: "Run Command", category: "System", volatile: true,
    inputs: [{ name: "command", type: "STRING", label: "Command", optional: true }],
    outputs: [
      { name: "stdout", type: "STRING", label: "Output" },
      { name: "stderr", type: "STRING", label: "Error" },
      { name: "exit_code", type: "INT", label: "Exit Code" },
    ],
    config_schema: [
      { name: "command", type: "string", label: "Command", default: "", multiline: true },
      { name: "timeout", type: "int", label: "Timeout (sec)", default: 30 },
    ],
  },
];
