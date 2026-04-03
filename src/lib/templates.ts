/**
 * Example workflow templates.
 * Each template is a complete WorkflowFile that can be loaded directly.
 */
import type { WorkflowFile } from "@/types/workflow";

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;   // Lucide icon name
  color: string;
  workflow: WorkflowFile;
}

export const TEMPLATES: TemplateInfo[] = [
  // ── 1. Galgame AI ──
  {
    id: "galgame-ai",
    name: "Galgame AI",
    description: "Screenshot → AI analyze → auto click to advance visual novel",
    icon: "Gamepad2",
    color: "#e84393",
    workflow: {
      version: "1.0",
      name: "AI Game Bot",
      settings: { run_mode: "loop", loop_delay_ms: 2000 },
      nodes: [
        { id: "n1", type: "window_screenshot", position: { x: 60, y: 160 },
          config: { window_title: "Tricolour" } },
        { id: "n2", type: "ai_chat", position: { x: 360, y: 140 },
          config: {
            provider: "ollama", model: "minicpm-v",
            base_url: "http://localhost:11434/v1",
            system_prompt: "你是一个视觉小说游戏AI助手。分析游戏截图并决定下一步操作。\n\n规则：\n- 如果看到对话文本，点击屏幕中央推进对话\n- 如果看到选项/按钮，点击第一个选项\n- 如果看到标题画面或菜单，点击\"开始\"或\"继续\"按钮\n\n必须只返回JSON格式：\n{\"action\": \"click\", \"x\": 数字, \"y\": 数字, \"reason\": \"原因\"}",
            temperature: 0.3, max_tokens: 256,
          } },
        { id: "n3", type: "json_parse", position: { x: 660, y: 160 },
          config: {} },
        { id: "n4", type: "extract_field", position: { x: 660, y: 300 },
          config: { path: "action" } },
        { id: "n5", type: "extract_field", position: { x: 900, y: 100 },
          config: { path: "x" } },
        { id: "n6", type: "extract_field", position: { x: 900, y: 220 },
          config: { path: "y" } },
        { id: "n7", type: "mouse_click", position: { x: 1140, y: 140 },
          config: { button: "left", clicks: 1 } },
        { id: "n8", type: "log", position: { x: 900, y: 380 },
          config: { label: "ACTION" } },
        { id: "n9", type: "delay", position: { x: 1140, y: 320 },
          config: { ms: 1000 } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image",    target: "n2", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "response", target: "n3", targetHandle: "text" },
        { id: "e3", source: "n3", sourceHandle: "data",     target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "data",     target: "n5", targetHandle: "data" },
        { id: "e5", source: "n3", sourceHandle: "data",     target: "n6", targetHandle: "data" },
        { id: "e6", source: "n5", sourceHandle: "value",    target: "n7", targetHandle: "x" },
        { id: "e7", source: "n6", sourceHandle: "value",    target: "n7", targetHandle: "y" },
        { id: "e8", source: "n4", sourceHandle: "value",    target: "n8", targetHandle: "value" },
      ],
    },
  },

  // ── 2. 网页数据抓取 ──
  {
    id: "web-scraper",
    name: "Web Scraper",
    description: "HTTP request → parse JSON → extract fields → save file",
    icon: "Globe",
    color: "#2980b9",
    workflow: {
      version: "1.0",
      name: "Web Data Scraper",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        { id: "n1", type: "text_input", position: { x: 60, y: 180 },
          config: { value: "https://jsonplaceholder.typicode.com/posts/1" } },
        { id: "n2", type: "http_request", position: { x: 340, y: 160 },
          config: { method: "GET", headers: "{}", timeout: 30 } },
        { id: "n3", type: "extract_field", position: { x: 640, y: 100 },
          config: { path: "title" } },
        { id: "n4", type: "extract_field", position: { x: 640, y: 240 },
          config: { path: "body" } },
        { id: "n5", type: "template", position: { x: 920, y: 140 },
          config: { template: "Title: {title}\n\nContent:\n{body}" } },
        { id: "n6", type: "text_display", position: { x: 1200, y: 100 },
          config: {} },
        { id: "n7", type: "file_write", position: { x: 1200, y: 260 },
          config: { path: "output.txt", mode: "write" } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "text",      target: "n2", targetHandle: "url" },
        { id: "e2", source: "n2", sourceHandle: "json_data",  target: "n3", targetHandle: "data" },
        { id: "e3", source: "n2", sourceHandle: "json_data",  target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "value",      target: "n5", targetHandle: "text" },
        { id: "e5", source: "n4", sourceHandle: "value",      target: "n5", targetHandle: "data" },
        { id: "e6", source: "n5", sourceHandle: "result",     target: "n6", targetHandle: "text" },
        { id: "e7", source: "n5", sourceHandle: "result",     target: "n7", targetHandle: "content" },
      ],
    },
  },

  // ── 3. 屏幕 OCR 翻译 ──
  {
    id: "screen-ocr-translate",
    name: "Screen OCR + AI Translate",
    description: "Screenshot region → OCR → AI translate → display",
    icon: "ScanText",
    color: "#e67e22",
    workflow: {
      version: "1.0",
      name: "Screen OCR Translator",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        { id: "n1", type: "screenshot", position: { x: 60, y: 180 },
          config: { monitor: 0 } },
        { id: "n2", type: "image_crop", position: { x: 340, y: 160 },
          config: { x: 100, y: 100, width: 800, height: 200 } },
        { id: "n3", type: "ocr", position: { x: 620, y: 160 },
          config: { engine: "pytesseract", lang: "eng" } },
        { id: "n4", type: "template", position: { x: 620, y: 340 },
          config: { template: "Translate the following text to Chinese:\n\n{text}" } },
        { id: "n5", type: "ai_chat", position: { x: 920, y: 260 },
          config: { provider: "openai", model: "gpt-4o-mini", temperature: 0.3 } },
        { id: "n6", type: "text_display", position: { x: 1200, y: 100 },
          config: {} },
        { id: "n7", type: "text_display", position: { x: 1200, y: 280 },
          config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image",    target: "n2", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "image",    target: "n3", targetHandle: "image" },
        { id: "e3", source: "n3", sourceHandle: "text",     target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "text",     target: "n6", targetHandle: "text" },
        { id: "e5", source: "n4", sourceHandle: "result",   target: "n5", targetHandle: "prompt" },
        { id: "e6", source: "n5", sourceHandle: "response", target: "n7", targetHandle: "text" },
      ],
    },
  },

  // ── 4. 图片找色点击 ──
  {
    id: "color-detect-click",
    name: "Color Detect & Click",
    description: "Loop: screenshot → check pixel color → click if match",
    icon: "Pipette",
    color: "#27ae60",
    workflow: {
      version: "1.0",
      name: "Color Detect Clicker",
      settings: { run_mode: "loop", loop_delay_ms: 1000 },
      nodes: [
        { id: "n1", type: "screenshot", position: { x: 60, y: 180 },
          config: { monitor: 0 } },
        { id: "n2", type: "pixel_color", position: { x: 340, y: 160 },
          config: { x: 500, y: 300, expect_hex: "#FF0000", tolerance: 30 } },
        { id: "n3", type: "condition", position: { x: 620, y: 160 },
          config: { expression: "value == True" } },
        { id: "n4", type: "mouse_click", position: { x: 920, y: 100 },
          config: { x: 500, y: 300, button: "left", clicks: 1 } },
        { id: "n5", type: "log", position: { x: 920, y: 280 },
          config: { label: "NOT FOUND" } },
        { id: "n6", type: "loop_counter", position: { x: 620, y: 360 },
          config: { counter_id: "scan" } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image",     target: "n2", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "match",     target: "n3", targetHandle: "value" },
        { id: "e3", source: "n3", sourceHandle: "true_out",  target: "n4", targetHandle: "x" },
        { id: "e4", source: "n3", sourceHandle: "false_out", target: "n5", targetHandle: "value" },
      ],
    },
  },

  // ── 5. 图片模板匹配 ──
  {
    id: "template-match-click",
    name: "Image Find & Click",
    description: "Find a template image on screen → click its location",
    icon: "ScanSearch",
    color: "#8e44ad",
    workflow: {
      version: "1.0",
      name: "Image Find & Click",
      settings: { run_mode: "loop", loop_delay_ms: 2000 },
      nodes: [
        { id: "n1", type: "screenshot", position: { x: 60, y: 180 },
          config: { monitor: 0 } },
        { id: "n2", type: "text_input", position: { x: 60, y: 360 },
          config: { value: "template.png" } },
        { id: "n3", type: "image_match", position: { x: 380, y: 200 },
          config: { threshold: 0.8 } },
        { id: "n4", type: "condition", position: { x: 680, y: 200 },
          config: { expression: "value == True" } },
        { id: "n5", type: "mouse_click", position: { x: 980, y: 140 },
          config: { button: "left", clicks: 1 } },
        { id: "n6", type: "log", position: { x: 980, y: 320 },
          config: { label: "MATCH" } },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "image",     target: "n3", targetHandle: "image" },
        { id: "e2", source: "n2", sourceHandle: "text",      target: "n3", targetHandle: "template" },
        { id: "e3", source: "n3", sourceHandle: "found",     target: "n4", targetHandle: "value" },
        { id: "e4", source: "n4", sourceHandle: "true_out",  target: "n5", targetHandle: "x" },
        { id: "e5", source: "n3", sourceHandle: "x",         target: "n5", targetHandle: "x" },
        { id: "e6", source: "n3", sourceHandle: "y",         target: "n5", targetHandle: "y" },
        { id: "e7", source: "n3", sourceHandle: "confidence",target: "n6", targetHandle: "value" },
      ],
    },
  },

  // ── 6. B站热门视频下载 (通用节点组合) ──
  {
    id: "bilibili-hot-download",
    name: "Bilibili Hot Download",
    description: "API → filter → map → download (generic composable nodes)",
    icon: "Video",
    color: "#00a1d6",
    workflow: {
      version: "1.0",
      name: "Bilibili Hot Video Downloader",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        { id: "n1", type: "http_request", position: { x: 60, y: 200 },
          config: {
            url: "https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1",
            method: "GET",
            headers: JSON.stringify({
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "https://www.bilibili.com",
            }),
          } },
        { id: "n2", type: "extract_field", position: { x: 340, y: 200 },
          config: { path: "data.list" } },
        { id: "n3", type: "list_filter", position: { x: 600, y: 200 },
          config: {
            expression: "item.get('duration', 0) <= 600",
            limit: 10,
            sort_by: "view",
          } },
        { id: "n4", type: "list_map", position: { x: 860, y: 120 },
          config: {
            fields: "title, duration, bvid",
            url_template: "https://www.bilibili.com/video/{bvid}",
            summary_template: "[{duration}s] {title}",
          } },
        { id: "n5", type: "text_display", position: { x: 1120, y: 60 },
          config: {} },
        { id: "n6", type: "video_download", position: { x: 860, y: 320 },
          config: {
            output_dir: "./bilibili_downloads",
            quality: "best",
            format: "mp4",
            url_field: "url",
          } },
        { id: "n7", type: "log", position: { x: 1120, y: 260 },
          config: { label: "DOWNLOADED" } },
        { id: "n8", type: "text_display", position: { x: 1120, y: 400 },
          config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "json_data",target: "n2", targetHandle: "data" },
        { id: "e2", source: "n2", sourceHandle: "value",    target: "n3", targetHandle: "data" },
        { id: "e3", source: "n3", sourceHandle: "result",   target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "result",   target: "n6", targetHandle: "urls" },
        { id: "e5", source: "n4", sourceHandle: "summary",  target: "n5", targetHandle: "text" },
        { id: "e6", source: "n6", sourceHandle: "count",    target: "n7", targetHandle: "value" },
        { id: "e7", source: "n6", sourceHandle: "output_dir",target: "n8",targetHandle: "text" },
      ],
    },
  },

  // ── 7. 自动填表 ──
  {
    id: "auto-form-fill",
    name: "Auto Form Filler",
    description: "Read data from file → type into fields with Tab navigation",
    icon: "FileInput",
    color: "#16a085",
    workflow: {
      version: "1.0",
      name: "Auto Form Filler",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        { id: "n1", type: "file_read", position: { x: 60, y: 180 },
          config: { path: "data.json" } },
        { id: "n2", type: "json_parse", position: { x: 320, y: 180 },
          config: {} },
        { id: "n3", type: "extract_field", position: { x: 580, y: 100 },
          config: { path: "name" } },
        { id: "n4", type: "extract_field", position: { x: 580, y: 240 },
          config: { path: "email" } },
        { id: "n5", type: "window_focus", position: { x: 580, y: 380 },
          config: { title: "Chrome" } },
        { id: "n6", type: "delay", position: { x: 840, y: 380 },
          config: { ms: 500 } },
        { id: "n7", type: "keyboard_type", position: { x: 840, y: 100 },
          config: {} },
        { id: "n8", type: "keyboard_press", position: { x: 1080, y: 100 },
          config: { key: "tab" } },
        { id: "n9", type: "keyboard_type", position: { x: 1080, y: 240 },
          config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", sourceHandle: "content",  target: "n2", targetHandle: "text" },
        { id: "e2", source: "n2", sourceHandle: "data",     target: "n3", targetHandle: "data" },
        { id: "e3", source: "n2", sourceHandle: "data",     target: "n4", targetHandle: "data" },
        { id: "e4", source: "n3", sourceHandle: "value",    target: "n7", targetHandle: "text" },
        { id: "e5", source: "n4", sourceHandle: "value",    target: "n9", targetHandle: "text" },
        { id: "e6", source: "n5", sourceHandle: "success",  target: "n6", targetHandle: "trigger" },
      ],
    },
  },
];
