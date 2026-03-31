"""HTTP Request node — make HTTP requests (GET/POST/PUT/DELETE)."""
import json as json_mod
from engine.base_node import BaseNode, register_node


@register_node
class HttpRequestNode(BaseNode):
    type     = "http_request"
    label    = "HTTP Request"
    category = "Network"
    volatile = True

    inputs  = [
        {"name": "url",  "type": "STRING", "label": "URL",  "optional": True},
        {"name": "body", "type": "STRING", "label": "Body", "optional": True},
    ]
    outputs = [
        {"name": "response",    "type": "STRING", "label": "Response"},
        {"name": "status_code", "type": "INT",    "label": "Status Code"},
        {"name": "json_data",   "type": "JSON",   "label": "JSON"},
    ]
    config_schema = [
        {"name": "url",    "type": "string", "label": "URL",    "default": "", "placeholder": "https://api.example.com/data"},
        {"name": "method", "type": "select", "label": "Method", "default": "GET", "options": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
        {"name": "headers", "type": "string", "label": "Headers (JSON)", "default": "{}", "multiline": True},
        {"name": "body",    "type": "string", "label": "Body",           "default": "", "multiline": True},
        {"name": "timeout", "type": "int",    "label": "Timeout (sec)",  "default": 30, "min": 1, "max": 300},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        import urllib.request
        import urllib.error

        url     = inputs.get("url") or config.get("url", "")
        method  = config.get("method", "GET")
        body    = inputs.get("body") or config.get("body", "")
        timeout = int(config.get("timeout", 30))

        if not url:
            raise RuntimeError("URL is required")

        # Parse headers
        headers = {"User-Agent": "PPNFlow/0.1"}
        try:
            h = json_mod.loads(config.get("headers", "{}"))
            if isinstance(h, dict):
                headers.update(h)
        except Exception:
            pass

        data = body.encode("utf-8") if body else None
        if data and "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                text = resp.read().decode("utf-8", errors="replace")
                status = resp.status
        except urllib.error.HTTPError as e:
            text = e.read().decode("utf-8", errors="replace")
            status = e.code

        # Try parse JSON
        json_data = None
        try:
            json_data = json_mod.loads(text)
        except Exception:
            pass

        return {"response": text, "status_code": status, "json_data": json_data}
