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
        { id: "e6", source: "n5", sourceHandle: "success",  target: "n6", targetHandle: "title" },
      ],
    },
  },

  // ── 8. 鸣潮日常一条龙 (Wuthering Waves Daily) ──
  {
    id: "wuthering-waves-daily",
    name: "Wuthering Waves Daily",
    description: "Login → tower → farm stamina → claim daily/mail/battle pass",
    icon: "Swords",
    color: "#6c5ce7",
    workflow: {
      version: "1.0",
      name: "Wuthering Waves Daily Task",
      settings: { run_mode: "once", loop_delay_ms: 0 },
      nodes: [
        // ── Step 1: Ensure Main (wait for game world) ──
        { id: "s1_title", type: "text_input", position: { x: 60, y: 40 },
          config: { value: "assets/wuthering-waves/templates/world_earth_icon.png" } },
        { id: "s1_wait", type: "wait_feature", position: { x: 340, y: 20 },
          config: {
            window_title: "鸣潮", capture_method: "wgc", threshold: 0.7, timeout: 60, interval: 1,
            region_x: 0, region_y: 0, region_w: 0.15, region_h: 0.1,
          } },
        { id: "s1_log", type: "log", position: { x: 620, y: 40 },
          config: { label: "STEP 1: In Game World" } },

        // ── Step 2: Open F2 Book ──
        { id: "s2_key", type: "game_key", position: { x: 60, y: 200 },
          config: { window_title: "鸣潮", key: "f2", mode: "press", after_sleep: 3 } },
        { id: "s2_tpl", type: "text_input", position: { x: 60, y: 340 },
          config: { value: "assets/wuthering-waves/templates/gray_book_weekly.png" } },
        { id: "s2_wait", type: "wait_feature", position: { x: 340, y: 200 },
          config: {
            window_title: "鸣潮", capture_method: "wgc", threshold: 0.6, timeout: 10, interval: 0.5,
            region_x: 0, region_y: 0, region_w: 1, region_h: 0.15,
          } },
        { id: "s2_log", type: "log", position: { x: 620, y: 200 },
          config: { label: "STEP 2: F2 Book Opened" } },

        // ── Step 3: Click Weekly tab ──
        { id: "s3_click", type: "game_click_abs", position: { x: 620, y: 340 },
          config: { window_title: "鸣潮", x: 0, y: 0, button: "left", after_sleep: 1 } },

        // ── Step 4: Find & click boss_proceed ──
        { id: "s4_tpl", type: "text_input", position: { x: 60, y: 480 },
          config: { value: "assets/wuthering-waves/templates/boss_proceed.png" } },
        { id: "s4_wait", type: "wait_feature", position: { x: 340, y: 480 },
          config: {
            window_title: "鸣潮", capture_method: "wgc", threshold: 0.7, timeout: 5, interval: 0.5,
            region_x: 0.9, region_y: 0.25, region_w: 0.1, region_h: 0.2,
          } },
        { id: "s4_click", type: "game_click_abs", position: { x: 620, y: 480 },
          config: { window_title: "鸣潮", x: 0, y: 0, button: "left", after_sleep: 2 } },
        { id: "s4_log", type: "log", position: { x: 900, y: 480 },
          config: { label: "STEP 4: Tower Travel Started" } },

        // ── Step 5: Wait for teleport (gray_teleport) ──
        { id: "s5_tpl", type: "text_input", position: { x: 60, y: 620 },
          config: { value: "assets/wuthering-waves/templates/gray_teleport.png" } },
        { id: "s5_wait", type: "wait_feature", position: { x: 340, y: 620 },
          config: {
            window_title: "鸣潮", capture_method: "wgc", threshold: 0.7, timeout: 10, interval: 1,
          } },
        { id: "s5_click", type: "game_click_abs", position: { x: 620, y: 620 },
          config: { window_title: "鸣潮", x: 0, y: 0, button: "left", after_sleep: 3 } },

        // ── Step 6: Wait arrive in world ──
        { id: "s6_wait", type: "wait_feature", position: { x: 340, y: 760 },
          config: {
            window_title: "鸣潮", capture_method: "wgc", threshold: 0.7, timeout: 120, interval: 2,
            region_x: 0, region_y: 0, region_w: 0.15, region_h: 0.1,
          } },
        { id: "s6_log", type: "log", position: { x: 620, y: 760 },
          config: { label: "STEP 6: Arrived at Tower" } },

        // ── Step 7: Open daily quest (F2 → quest tab) ──
        { id: "s7_key", type: "game_key", position: { x: 60, y: 900 },
          config: { window_title: "鸣潮", key: "f2", mode: "press", after_sleep: 3 } },
        { id: "s7_tpl", type: "text_input", position: { x: 60, y: 1040 },
          config: { value: "assets/wuthering-waves/templates/gray_book_quest.png" } },
        { id: "s7_wait", type: "wait_feature", position: { x: 340, y: 900 },
          config: {
            window_title: "鸣潮", capture_method: "wgc", threshold: 0.6, timeout: 10, interval: 0.5,
          } },
        { id: "s7_click", type: "game_click_abs", position: { x: 620, y: 900 },
          config: { window_title: "鸣潮", x: 0, y: 0, button: "left", after_sleep: 1.5 } },
        { id: "s7_log", type: "log", position: { x: 900, y: 900 },
          config: { label: "STEP 7: Daily Quest Page Open" } },

        // ── Step 8: OCR stamina progress ──
        { id: "s8_shot", type: "window_screenshot", position: { x: 60, y: 1180 },
          config: { window_title: "鸣潮", capture_method: "wgc", bring_to_front: false } },
        { id: "s8_crop", type: "image_crop", position: { x: 340, y: 1180 },
          config: { x: 192, y: 108, width: 768, height: 648 } },
        { id: "s8_ocr", type: "ocr", position: { x: 620, y: 1180 },
          config: { engine: "rapidocr", preprocess: "none" } },
        { id: "s8_log", type: "log", position: { x: 900, y: 1180 },
          config: { label: "STEP 8: Stamina Progress" } },

        // ── Step 9: Claim daily reward (click 100pt box) ──
        { id: "s9_click", type: "game_click", position: { x: 60, y: 1360 },
          config: { window_title: "鸣潮", rel_x: 0.90, rel_y: 0.85, button: "left", after_sleep: 1 } },
        { id: "s9_log", type: "log", position: { x: 340, y: 1360 },
          config: { label: "STEP 9: Claimed Daily Reward" } },

        // ── Step 10: ESC back + Claim mail ──
        { id: "s10_esc", type: "game_key", position: { x: 60, y: 1500 },
          config: { window_title: "鸣潮", key: "esc", mode: "press", after_sleep: 1.5 } },
        { id: "s10_mail", type: "game_click", position: { x: 340, y: 1500 },
          config: { window_title: "鸣潮", rel_x: 0.64, rel_y: 0.95, button: "left", after_sleep: 1 } },
        { id: "s10_claim", type: "game_click", position: { x: 620, y: 1500 },
          config: { window_title: "鸣潮", rel_x: 0.14, rel_y: 0.9, button: "left", after_sleep: 1 } },
        { id: "s10_log", type: "log", position: { x: 900, y: 1500 },
          config: { label: "STEP 10: Mail Claimed" } },

        // ── Step 11: ESC back + claim battle pass ──
        { id: "s11_esc", type: "game_key", position: { x: 60, y: 1640 },
          config: { window_title: "鸣潮", key: "esc", mode: "press", after_sleep: 1 } },
        { id: "s11_wait", type: "wait_feature", position: { x: 340, y: 1640 },
          config: {
            window_title: "鸣潮", capture_method: "wgc", threshold: 0.7, timeout: 30, interval: 1,
            region_x: 0, region_y: 0, region_w: 0.15, region_h: 0.1,
          } },
        { id: "s11_bp1", type: "game_click", position: { x: 620, y: 1640 },
          config: { window_title: "鸣潮", rel_x: 0.86, rel_y: 0.05, button: "left", after_sleep: 1 } },
        { id: "s11_bp2", type: "game_click", position: { x: 620, y: 1780 },
          config: { window_title: "鸣潮", rel_x: 0.04, rel_y: 0.3, button: "left", after_sleep: 1 } },
        { id: "s11_bp3", type: "game_click", position: { x: 900, y: 1780 },
          config: { window_title: "鸣潮", rel_x: 0.68, rel_y: 0.91, button: "left", after_sleep: 3 } },
        { id: "s11_log", type: "log", position: { x: 900, y: 1640 },
          config: { label: "STEP 11: Battle Pass Claimed" } },

        // ── Step 12: Return to main ──
        { id: "s12_esc", type: "game_key", position: { x: 60, y: 1920 },
          config: { window_title: "鸣潮", key: "esc", mode: "press", after_sleep: 2 } },
        { id: "s12_log", type: "log", position: { x: 340, y: 1920 },
          config: { label: "DONE: Daily Task Complete!" } },
      ],
      edges: [
        // Step 1: ensure main — template path → wait_feature
        { id: "e1", source: "s1_title", sourceHandle: "text",  target: "s1_wait", targetHandle: "template" },
        { id: "e2", source: "s1_wait",  sourceHandle: "found", target: "s1_log",  targetHandle: "value" },

        // Step 2: F2 key → wait for book
        { id: "e3", source: "s1_log",   sourceHandle: "value",   target: "s2_key",  targetHandle: "title" },
        { id: "e4", source: "s2_tpl",   sourceHandle: "text",    target: "s2_wait", targetHandle: "template" },
        { id: "e5", source: "s2_key",   sourceHandle: "success", target: "s2_wait", targetHandle: "title" },
        { id: "e6", source: "s2_wait",  sourceHandle: "found",   target: "s2_log",  targetHandle: "value" },

        // Step 3: click weekly tab — use wait_feature output position
        { id: "e7", source: "s2_wait",  sourceHandle: "x",     target: "s3_click", targetHandle: "x" },
        { id: "e8", source: "s2_wait",  sourceHandle: "y",     target: "s3_click", targetHandle: "y" },

        // Step 4: find boss_proceed → click
        { id: "e9",  source: "s4_tpl",   sourceHandle: "text",    target: "s4_wait",  targetHandle: "template" },
        { id: "e10", source: "s3_click", sourceHandle: "success", target: "s4_wait",  targetHandle: "title" },
        { id: "e11", source: "s4_wait",  sourceHandle: "x",       target: "s4_click", targetHandle: "x" },
        { id: "e12", source: "s4_wait",  sourceHandle: "y",       target: "s4_click", targetHandle: "y" },
        { id: "e13", source: "s4_click", sourceHandle: "success", target: "s4_log",   targetHandle: "value" },

        // Step 5: wait teleport → click
        { id: "e14", source: "s5_tpl",   sourceHandle: "text",    target: "s5_wait",  targetHandle: "template" },
        { id: "e15", source: "s4_click", sourceHandle: "success", target: "s5_wait",  targetHandle: "title" },
        { id: "e16", source: "s5_wait",  sourceHandle: "x",       target: "s5_click", targetHandle: "x" },
        { id: "e17", source: "s5_wait",  sourceHandle: "y",       target: "s5_click", targetHandle: "y" },

        // Step 6: wait arrive (reuse world_earth_icon template)
        { id: "e18", source: "s1_title", sourceHandle: "text",    target: "s6_wait", targetHandle: "template" },
        { id: "e19", source: "s5_click", sourceHandle: "success", target: "s6_wait", targetHandle: "title" },
        { id: "e20", source: "s6_wait",  sourceHandle: "found",   target: "s6_log",  targetHandle: "value" },

        // Step 7: open daily quest (F2 → quest tab)
        { id: "e21", source: "s6_log",   sourceHandle: "value",   target: "s7_key",   targetHandle: "title" },
        { id: "e22", source: "s7_tpl",   sourceHandle: "text",    target: "s7_wait",  targetHandle: "template" },
        { id: "e23", source: "s7_key",   sourceHandle: "success", target: "s7_wait",  targetHandle: "title" },
        { id: "e24", source: "s7_wait",  sourceHandle: "x",       target: "s7_click", targetHandle: "x" },
        { id: "e25", source: "s7_wait",  sourceHandle: "y",       target: "s7_click", targetHandle: "y" },
        { id: "e26", source: "s7_click", sourceHandle: "success", target: "s7_log",   targetHandle: "value" },

        // Step 8: OCR stamina
        { id: "e27", source: "s7_log",   sourceHandle: "value",   target: "s8_shot",  targetHandle: "title" },
        { id: "e28", source: "s8_shot",  sourceHandle: "image",   target: "s8_crop",  targetHandle: "image" },
        { id: "e29", source: "s8_crop",  sourceHandle: "image",   target: "s8_ocr",   targetHandle: "image" },
        { id: "e30", source: "s8_ocr",   sourceHandle: "text",    target: "s8_log",   targetHandle: "value" },

        // Step 9: claim daily reward
        { id: "e31", source: "s8_log",   sourceHandle: "value",   target: "s9_click", targetHandle: "title" },
        { id: "e32", source: "s9_click", sourceHandle: "success", target: "s9_log",   targetHandle: "value" },

        // Step 10: claim mail
        { id: "e33", source: "s9_log",    sourceHandle: "value",   target: "s10_esc",   targetHandle: "title" },
        { id: "e34", source: "s10_esc",   sourceHandle: "success", target: "s10_mail",  targetHandle: "title" },
        { id: "e35", source: "s10_mail",  sourceHandle: "success", target: "s10_claim", targetHandle: "title" },
        { id: "e36", source: "s10_claim", sourceHandle: "success", target: "s10_log",   targetHandle: "value" },

        // Step 11: battle pass
        { id: "e37", source: "s10_log",   sourceHandle: "value",   target: "s11_esc",  targetHandle: "title" },
        { id: "e38", source: "s1_title",  sourceHandle: "text",    target: "s11_wait", targetHandle: "template" },
        { id: "e39", source: "s11_esc",   sourceHandle: "success", target: "s11_wait", targetHandle: "title" },
        { id: "e40", source: "s11_wait",  sourceHandle: "found",   target: "s11_bp1",  targetHandle: "title" },
        { id: "e41", source: "s11_bp1",   sourceHandle: "success", target: "s11_bp2",  targetHandle: "title" },
        { id: "e42", source: "s11_bp2",   sourceHandle: "success", target: "s11_bp3",  targetHandle: "title" },
        { id: "e43", source: "s11_bp3",   sourceHandle: "success", target: "s11_log",  targetHandle: "value" },

        // Step 12: final ESC
        { id: "e44", source: "s11_log",   sourceHandle: "value",   target: "s12_esc",  targetHandle: "title" },
        { id: "e45", source: "s12_esc",   sourceHandle: "success", target: "s12_log",  targetHandle: "value" },
      ],
    },
  },
];
