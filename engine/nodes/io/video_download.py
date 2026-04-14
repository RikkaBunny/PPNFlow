"""Video Download node — download videos from any yt-dlp supported site."""
import json as json_mod
import os
import subprocess
import sys
from engine.base_node import BaseNode, register_node


@register_node
class VideoDownloadNode(BaseNode):
    type     = "video_download"
    label    = "Video Download"
    category = "Network"
    volatile = True

    dependencies = {"yt-dlp": "yt_dlp"}

    inputs  = [
        {"name": "url",  "type": "STRING", "label": "URL",       "optional": True},
        {"name": "urls", "type": "JSON",   "label": "URL List",  "optional": True},
    ]
    outputs = [
        {"name": "results",    "type": "JSON",   "label": "Results"},
        {"name": "count",      "type": "INT",    "label": "Downloaded"},
        {"name": "output_dir", "type": "STRING", "label": "Output Dir"},
    ]
    config_schema = [
        {"name": "output_dir", "type": "string", "label": "Output Directory",
         "default": "./downloads"},
        {"name": "quality", "type": "select", "label": "Quality", "default": "best",
         "options": [
             {"value": "best",  "label": "Best Quality"},
             {"value": "worst", "label": "Lowest (fastest)"},
             {"value": "720p",  "label": "720p"},
             {"value": "480p",  "label": "480p"},
         ]},
        {"name": "format", "type": "select", "label": "Format", "default": "mp4",
         "options": ["mp4", "mkv", "flv"]},
        {"name": "url_field", "type": "string", "label": "URL Field Name",
         "default": "url",
         "placeholder": "Field name to extract URL from objects"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        self.ensure_dependencies()

        single_url = inputs.get("url") or ""
        urls_input = inputs.get("urls")
        output_dir = config.get("output_dir", "./downloads")
        quality    = config.get("quality", "best")
        fmt        = config.get("format", "mp4")
        url_field  = config.get("url_field", "url")

        # Build URL list from inputs
        url_list: list[dict] = []

        if urls_input:
            if isinstance(urls_input, str):
                urls_input = json_mod.loads(urls_input)
            if isinstance(urls_input, list):
                for item in urls_input:
                    if isinstance(item, str):
                        url_list.append({"url": item, "title": ""})
                    elif isinstance(item, dict):
                        url = item.get(url_field, "")
                        title = item.get("title", "")
                        url_list.append({"url": url, "title": title})

        if single_url and not url_list:
            url_list.append({"url": single_url, "title": ""})

        if not url_list:
            raise RuntimeError(
                "No URLs provided. Connect a URL string or a JSON list of URLs/objects."
            )

        os.makedirs(output_dir, exist_ok=True)

        # yt-dlp format string
        format_map = {
            "best":  "bestvideo+bestaudio/best",
            "worst": "worstvideo+worstaudio/worst",
            "720p":  "bestvideo[height<=720]+bestaudio/best[height<=720]",
            "480p":  "bestvideo[height<=480]+bestaudio/best[height<=480]",
        }
        format_str = format_map.get(quality, "bestvideo+bestaudio/best")

        results: list[dict] = []
        downloaded = 0

        for i, entry in enumerate(url_list):
            url   = entry.get("url", "")
            title = entry.get("title", f"video_{i}")

            if not url:
                results.append({"title": title, "success": False, "error": "No URL"})
                continue

            safe_title = "".join(
                c if c.isalnum() or c in " _-" else "_" for c in title
            )[:80]
            output_tpl = (
                os.path.join(output_dir, f"{safe_title}.%(ext)s")
                if safe_title
                else os.path.join(output_dir, "%(title)s.%(ext)s")
            )

            cmd = [
                sys.executable, "-m", "yt_dlp",
                "--no-warnings",
                "--no-check-certificates",
                "-f", format_str,
                "--merge-output-format", fmt,
                "-o", output_tpl,
                url,
            ]

            try:
                proc = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=300,
                )
                if proc.returncode == 0:
                    downloaded += 1
                    results.append({
                        "title": title, "url": url, "success": True,
                        "path": os.path.join(output_dir, f"{safe_title}.{fmt}"),
                    })
                else:
                    err = proc.stderr.strip()[-200:] if proc.stderr else "Unknown error"
                    results.append({
                        "title": title, "url": url, "success": False, "error": err,
                    })
            except subprocess.TimeoutExpired:
                results.append({
                    "title": title, "url": url, "success": False,
                    "error": "Download timed out (5 min limit)",
                })
            except Exception as exc:
                results.append({
                    "title": title, "url": url, "success": False,
                    "error": str(exc),
                })

        return {
            "results":    results,
            "count":      downloaded,
            "output_dir": os.path.abspath(output_dir),
        }
