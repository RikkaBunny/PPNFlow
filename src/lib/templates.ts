/**
 * Example workflow templates.
 * Each template is a complete WorkflowFile that can be loaded directly.
 */
import type { WorkflowFile } from "@/types/workflow";

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  workflow: WorkflowFile;
}

export const TEMPLATES: TemplateInfo[] = [
  // 1. Galgame AI
  {
    id: "galgame-ai",
    name: "Galgame AI",
    description: "Window screenshot -> AI analysis -> click to advance a visual novel",
    icon: "Gamepad2",
    color: "#e84393",
    workflow: {
      version: "1.0",
      name: "AI Game Bot",
      settings: { run_mode: "loop", loop_delay_ms: 2000 },
      nodes: [
        {
          id: "n1",
          type: "window_screenshot",
          position: { x: 60, y: 160 },
          config: { window_title: "Tricolour" },
        },
        {
          id: "n2",
          type: "ai_chat",
          position: { x: 360, y: 140 },
          config: {
            provider: "ollama",
            model: "minicpm-v",
            base_url: "http://localhost:11434/v1",
            system_prompt:
              "You are a visual novel game assistant. Analyze the screenshot and decide the next action.\n\nRules:\n- If dialogue text is visible, click near the center of the screen to advance.\n- If options or buttons are visible, click the first obvious choice.\n- If the title screen or menu is visible, click Start or Continue.\n\nReturn JSON only:\n{\"action\": \"click\", \"x\": 960, \"y\": 540, \"reason\": \"short explanation\"}",
            temperature: 0.3,
            max_tokens: 256,
          },
        },
        { id: "n3", type: "json_parse", position: { x: 660, y: 160 }, config: {} },
        { id: "n4", type: "extract_field", position: { x: 660, y: 300 }, config: { path: "action" } },
        { id: "n5", type: "extract_field", position: { x: 900, y: 100 }, config: { path: "x" } },
        { id: "n6", type: "extract_field", position: { x: 900, y: 220 }, config: { path: "y" } },
        { id: "n7", type: "mouse_click", position: { x: 1140, y: 140 }, config: { button: "left", clicks: 1 } },
        { id: "n8", type: "log", position: { x: 900, y: 380 }, config: { label: "ACTION" } },
        { id: "n9", type: "delay", position: { x: 1140, y: 320 }, config: { ms: 1000 } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image", target: "n2", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "response", target: "n3", targetHandle: "text" },
        { id: "e3", source: "n3", sourceHandle: "data", target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "data", target: "n5", targetHandle: "data" },
        { id: "e5", source: "n3", sourceHandle: "data", target: "n6", targetHandle: "data" },
        { id: "e6", source: "n5", sourceHandle: "value", target: "n7", targetHandle: "x" },
        { id: "e7", source: "n6", sourceHandle: "value", target: "n7", targetHandle: "y" },
        { id: "e8", source: "n4", sourceHandle: "value", target: "n8", targetHandle: "value" },
      ],
    },
  },

  // 2. Web Scraper
  {
    id: "web-scraper",
    name: "Web Scraper",
    description: "HTTP request -> parse JSON -> format content -> save file",
    icon: "Globe",
    color: "#2980b9",
    workflow: {
      version: "1.0",
      name: "Web Data Scraper",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        {
          id: "n1",
          type: "text_input",
          position: { x: 60, y: 180 },
          config: { value: "https://jsonplaceholder.typicode.com/posts/1" },
        },
        {
          id: "n2",
          type: "http_request",
          position: { x: 340, y: 160 },
          config: { method: "GET", headers: "{}", timeout: 30 },
        },
        { id: "n3", type: "extract_field", position: { x: 640, y: 100 }, config: { path: "title" } },
        { id: "n4", type: "extract_field", position: { x: 640, y: 240 }, config: { path: "body" } },
        {
          id: "n5",
          type: "template",
          position: { x: 920, y: 140 },
          config: { template: "Title: {title}\n\nContent:\n{body}" },
        },
        { id: "n6", type: "text_display", position: { x: 1200, y: 100 }, config: {} },
        {
          id: "n7",
          type: "file_write",
          position: { x: 1200, y: 260 },
          config: { path: "output.txt", mode: "write" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "text", target: "n2", targetHandle: "url" },
        { id: "e2", source: "n2", sourceHandle: "json_data", target: "n3", targetHandle: "data" },
        { id: "e3", source: "n2", sourceHandle: "json_data", target: "n4", targetHandle: "data" },
        { id: "e4", source: "n2", sourceHandle: "json_data", target: "n5", targetHandle: "data" },
        { id: "e6", source: "n5", sourceHandle: "result", target: "n6", targetHandle: "text" },
        { id: "e7", source: "n5", sourceHandle: "result", target: "n7", targetHandle: "content" },
      ],
    },
  },

  // 3. Screen OCR + AI Translate
  {
    id: "screen-ocr-translate",
    name: "Screen OCR + AI Translate",
    description: "Capture a screen region -> OCR -> AI translation -> display",
    icon: "ScanText",
    color: "#e67e22",
    workflow: {
      version: "1.0",
      name: "Screen OCR Translator",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        { id: "n1", type: "screenshot", position: { x: 60, y: 180 }, config: { monitor: 0 } },
        {
          id: "n2",
          type: "image_crop",
          position: { x: 340, y: 160 },
          config: { x: 100, y: 100, width: 800, height: 200 },
        },
        {
          id: "n3",
          type: "ocr",
          position: { x: 620, y: 160 },
          config: { engine: "rapidocr", lang: "eng" },
        },
        {
          id: "n4",
          type: "template",
          position: { x: 620, y: 340 },
          config: { template: "Translate the following text to Chinese:\n\n{text}" },
        },
        {
          id: "n5",
          type: "ai_chat",
          position: { x: 920, y: 260 },
          config: { provider: "openai", model: "gpt-4o-mini", temperature: 0.3 },
        },
        { id: "n6", type: "text_display", position: { x: 1200, y: 100 }, config: {} },
        { id: "n7", type: "text_display", position: { x: 1200, y: 280 }, config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image", target: "n2", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "image", target: "n3", targetHandle: "image" },
        { id: "e3", source: "n3", sourceHandle: "text", target: "n4", targetHandle: "text" },
        { id: "e4", source: "n3", sourceHandle: "text", target: "n6", targetHandle: "text" },
        { id: "e5", source: "n4", sourceHandle: "result", target: "n5", targetHandle: "prompt" },
        { id: "e6", source: "n5", sourceHandle: "response", target: "n7", targetHandle: "text" },
      ],
    },
  },

  // 4. Color Detect & Click
  {
    id: "color-detect-click",
    name: "Color Detect & Click",
    description: "Loop screenshot -> detect pixel color -> click when it matches",
    icon: "Pipette",
    color: "#27ae60",
    workflow: {
      version: "1.0",
      name: "Color Detect Clicker",
      settings: { run_mode: "loop", loop_delay_ms: 1000 },
      nodes: [
        { id: "n1", type: "screenshot", position: { x: 60, y: 180 }, config: { monitor: 0 } },
        {
          id: "n2",
          type: "pixel_color",
          position: { x: 340, y: 160 },
          config: { x: 500, y: 300, expect_hex: "#FF0000", tolerance: 30 },
        },
        { id: "n3", type: "condition", position: { x: 620, y: 160 }, config: { expression: "value == True" } },
        { id: "n4", type: "mouse_click", position: { x: 920, y: 100 }, config: { x: 500, y: 300, button: "left", clicks: 1 } },
        { id: "n5", type: "log", position: { x: 920, y: 280 }, config: { label: "NOT FOUND" } },
        { id: "n6", type: "loop_counter", position: { x: 620, y: 360 }, config: { counter_id: "scan" } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image", target: "n2", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "match", target: "n3", targetHandle: "value" },
        { id: "e3", source: "n3", sourceHandle: "true_out", target: "n4", targetHandle: "x" },
        { id: "e4", source: "n3", sourceHandle: "false_out", target: "n5", targetHandle: "value" },
      ],
    },
  },

  // 5. Image Find & Click
  {
    id: "template-match-click",
    name: "Image Find & Click",
    description: "Find a template image on screen -> click its location",
    icon: "ScanSearch",
    color: "#8e44ad",
    workflow: {
      version: "1.0",
      name: "Image Find & Click",
      settings: { run_mode: "loop", loop_delay_ms: 2000 },
      nodes: [
        { id: "n1", type: "screenshot", position: { x: 60, y: 180 }, config: { monitor: 0 } },
        { id: "n2", type: "text_input", position: { x: 60, y: 360 }, config: { value: "template.png" } },
        { id: "n3", type: "image_match", position: { x: 380, y: 200 }, config: { threshold: 0.8 } },
        { id: "n4", type: "condition", position: { x: 680, y: 200 }, config: { expression: "value == True" } },
        { id: "n5", type: "mouse_click", position: { x: 980, y: 140 }, config: { button: "left", clicks: 1 } },
        { id: "n6", type: "log", position: { x: 980, y: 320 }, config: { label: "MATCH" } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image", target: "n3", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "text", target: "n3", targetHandle: "template" },
        { id: "e3", source: "n3", sourceHandle: "found", target: "n4", targetHandle: "value" },
        { id: "e4", source: "n4", sourceHandle: "true_out", target: "n5", targetHandle: "x" },
        { id: "e5", source: "n3", sourceHandle: "x", target: "n5", targetHandle: "x" },
        { id: "e6", source: "n3", sourceHandle: "y", target: "n5", targetHandle: "y" },
        { id: "e7", source: "n3", sourceHandle: "confidence", target: "n6", targetHandle: "value" },
      ],
    },
  },

  // 6. Bilibili Hot Download
  {
    id: "bilibili-hot-download",
    name: "Bilibili Hot Download",
    description: "API -> filter -> map -> download with generic nodes",
    icon: "Video",
    color: "#00a1d6",
    workflow: {
      version: "1.0",
      name: "Bilibili Hot Video Downloader",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        {
          id: "n1",
          type: "http_request",
          position: { x: 60, y: 200 },
          config: {
            url: "https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1",
            method: "GET",
            headers: JSON.stringify({
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Referer: "https://www.bilibili.com",
            }),
          },
        },
        { id: "n2", type: "extract_field", position: { x: 340, y: 200 }, config: { path: "data.list" } },
        {
          id: "n3",
          type: "list_filter",
          position: { x: 600, y: 200 },
          config: {
            expression: "item.get('duration', 0) <= 600",
            limit: 10,
            sort_by: "view",
          },
        },
        {
          id: "n4",
          type: "list_map",
          position: { x: 860, y: 120 },
          config: {
            fields: "title, duration, bvid",
            url_template: "https://www.bilibili.com/video/{bvid}",
            summary_template: "[{duration}s] {title}",
          },
        },
        { id: "n5", type: "text_display", position: { x: 1120, y: 60 }, config: {} },
        {
          id: "n6",
          type: "video_download",
          position: { x: 860, y: 320 },
          config: {
            output_dir: "./bilibili_downloads",
            quality: "best",
            format: "mp4",
            url_field: "url",
          },
        },
        { id: "n7", type: "log", position: { x: 1120, y: 260 }, config: { label: "DOWNLOADED" } },
        { id: "n8", type: "text_display", position: { x: 1120, y: 400 }, config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "json_data", target: "n2", targetHandle: "data" },
        { id: "e2", source: "n2", sourceHandle: "value", target: "n3", targetHandle: "data" },
        { id: "e3", source: "n3", sourceHandle: "result", target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "result", target: "n6", targetHandle: "urls" },
        { id: "e5", source: "n4", sourceHandle: "summary", target: "n5", targetHandle: "text" },
        { id: "e6", source: "n6", sourceHandle: "count", target: "n7", targetHandle: "value" },
        { id: "e7", source: "n6", sourceHandle: "output_dir", target: "n8", targetHandle: "text" },
      ],
    },
  },

  // 7. Auto Form Filler
  {
    id: "auto-form-fill",
    name: "Auto Form Filler",
    description: "Read JSON data -> focus the target window -> type fields with Tab navigation",
    icon: "FileInput",
    color: "#16a085",
    workflow: {
      version: "1.0",
      name: "Auto Form Filler",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        { id: "n1", type: "file_read", position: { x: 60, y: 180 }, config: { path: "data.json" } },
        { id: "n2", type: "json_parse", position: { x: 320, y: 180 }, config: {} },
        { id: "n3", type: "extract_field", position: { x: 580, y: 100 }, config: { path: "name" } },
        { id: "n4", type: "extract_field", position: { x: 580, y: 240 }, config: { path: "email" } },
        { id: "n5", type: "window_focus", position: { x: 580, y: 380 }, config: { title: "Chrome" } },
        { id: "n6", type: "delay", position: { x: 840, y: 380 }, config: { ms: 500 } },
        { id: "n7", type: "keyboard_type", position: { x: 840, y: 100 }, config: {} },
        { id: "n8", type: "keyboard_press", position: { x: 1080, y: 100 }, config: { key: "tab" } },
        { id: "n9", type: "keyboard_type", position: { x: 1080, y: 240 }, config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "content", target: "n2", targetHandle: "text" },
        { id: "e2", source: "n2", sourceHandle: "data", target: "n3", targetHandle: "data" },
        { id: "e3", source: "n2", sourceHandle: "data", target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "value", target: "n7", targetHandle: "text" },
        { id: "e5", source: "n4", sourceHandle: "value", target: "n9", targetHandle: "text" },
        { id: "e6", source: "n5", sourceHandle: "success", target: "n6", targetHandle: "trigger" },
        { id: "e7", source: "n6", sourceHandle: "trigger", target: "n7", targetHandle: "text" },
        { id: "e8", source: "n7", sourceHandle: "success", target: "n8", targetHandle: "key" },
        { id: "e9", source: "n8", sourceHandle: "success", target: "n9", targetHandle: "text" },
      ],
    },
  },

  // 8. Wuthering Waves Daily
  {
    id: "wuthering-waves-daily",
    name: "Wuthering Waves Daily",
    description: "Ensure main screen -> tower -> claim daily, mail, and battle pass",
    icon: "Swords",
    color: "#6c5ce7",
    workflow: {
      version: "1.0",
      name: "Wuthering Waves Daily Task",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        { id: "n0", type: "ww_preflight", position: { x: 60, y: 100 }, config: { window_title: "Wuthering Waves" } },
        { id: "n0a", type: "condition", position: { x: 320, y: 100 }, config: { expression: "value == True" } },
        { id: "n0b", type: "log", position: { x: 320, y: 260 }, config: { label: "WW PRECHECK" } },
        { id: "n1", type: "ww_ensure_main", position: { x: 580, y: 100 }, config: { window_title: "Wuthering Waves", timeout: 180 } },
        { id: "n2", type: "ww_go_to_tower", position: { x: 880, y: 100 }, config: { window_title: "Wuthering Waves" } },
        { id: "n3", type: "ww_open_daily", position: { x: 1180, y: 100 }, config: { window_title: "Wuthering Waves" } },
        { id: "n3a", type: "condition", position: { x: 1420, y: 280 }, config: { expression: "value == True" } },
        { id: "n4", type: "ww_claim_daily", position: { x: 1480, y: 100 }, config: { window_title: "Wuthering Waves" } },
        { id: "n5", type: "ww_claim_mail", position: { x: 580, y: 300 }, config: { window_title: "Wuthering Waves" } },
        { id: "n6", type: "ww_claim_battle_pass", position: { x: 880, y: 300 }, config: { window_title: "Wuthering Waves" } },
        { id: "n7", type: "log", position: { x: 1180, y: 300 }, config: { label: "Daily Task Complete!" } },
      ],
      edges: [
        { id: "e0", source: "n0", sourceHandle: "ready", target: "n0a", targetHandle: "value" },
        { id: "e0a", source: "n0", sourceHandle: "message", target: "n0b", targetHandle: "value" },
        { id: "e1", source: "n0a", sourceHandle: "true_out", target: "n1", targetHandle: "trigger" },
        { id: "e2", source: "n1", sourceHandle: "success", target: "n2", targetHandle: "trigger" },
        { id: "e3", source: "n2", sourceHandle: "success", target: "n3", targetHandle: "trigger" },
        { id: "e4", source: "n3", sourceHandle: "ready", target: "n3a", targetHandle: "value" },
        { id: "e5", source: "n3a", sourceHandle: "true_out", target: "n4", targetHandle: "trigger" },
        { id: "e6", source: "n3a", sourceHandle: "false_out", target: "n5", targetHandle: "trigger" },
        { id: "e7", source: "n4", sourceHandle: "success", target: "n5", targetHandle: "trigger" },
        { id: "e8", source: "n5", sourceHandle: "success", target: "n6", targetHandle: "trigger" },
        { id: "e9", source: "n6", sourceHandle: "success", target: "n7", targetHandle: "value" },
      ],
    },
  },
];
