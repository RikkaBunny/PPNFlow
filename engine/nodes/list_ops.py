"""List operations — filter and map over JSON arrays."""
import json as json_mod
from engine.base_node import BaseNode, register_node


@register_node
class ListFilterNode(BaseNode):
    type     = "list_filter"
    label    = "List Filter"
    category = "Data"

    inputs  = [
        {"name": "data", "type": "JSON", "label": "List"},
    ]
    outputs = [
        {"name": "result", "type": "JSON",  "label": "Filtered"},
        {"name": "count",  "type": "INT",   "label": "Count"},
    ]
    config_schema = [
        {"name": "expression", "type": "string", "label": "Filter Expression",
         "default": "True",
         "placeholder": "item.get('duration', 0) <= 600"},
        {"name": "limit", "type": "int", "label": "Max Items (0 = no limit)",
         "default": 0, "min": 0, "max": 10000},
        {"name": "sort_by", "type": "string", "label": "Sort By Field (desc)",
         "default": "", "placeholder": "view"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        data = inputs.get("data", [])
        if isinstance(data, str):
            data = json_mod.loads(data)
        if not isinstance(data, list):
            data = [data]

        expression = config.get("expression", "True").strip()
        limit      = int(config.get("limit", 0))
        sort_by    = config.get("sort_by", "").strip()

        safe_builtins = {
            "len": len, "str": str, "int": int, "float": float,
            "bool": bool, "abs": abs, "min": min, "max": max,
            "isinstance": isinstance, "type": type,
        }

        filtered = []
        for item in data:
            try:
                result = eval(expression, {"__builtins__": safe_builtins}, {"item": item})
                if result:
                    filtered.append(item)
            except Exception:
                continue

        if sort_by:
            try:
                filtered.sort(key=lambda x: x.get(sort_by, 0), reverse=True)
            except Exception:
                pass

        if limit > 0:
            filtered = filtered[:limit]

        return {"result": filtered, "count": len(filtered)}


@register_node
class ListMapNode(BaseNode):
    type     = "list_map"
    label    = "List Map"
    category = "Data"

    inputs  = [
        {"name": "data", "type": "JSON", "label": "List"},
    ]
    outputs = [
        {"name": "result",  "type": "JSON",   "label": "Mapped"},
        {"name": "count",   "type": "INT",    "label": "Count"},
        {"name": "first",   "type": "ANY",    "label": "First Item"},
        {"name": "summary", "type": "STRING", "label": "Summary"},
    ]
    config_schema = [
        {"name": "fields", "type": "string", "label": "Fields to Extract",
         "default": "", "multiline": True,
         "placeholder": "title, duration, url\nor: new_key = item['old_key']"},
        {"name": "url_template", "type": "string", "label": "URL Template (optional)",
         "default": "",
         "placeholder": "https://www.bilibili.com/video/{bvid}"},
        {"name": "summary_template", "type": "string", "label": "Summary Line Template",
         "default": "",
         "placeholder": "{title} ({duration}s)"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        data = inputs.get("data", [])
        if isinstance(data, str):
            data = json_mod.loads(data)
        if not isinstance(data, list):
            data = [data]

        fields_raw       = config.get("fields", "").strip()
        url_template     = config.get("url_template", "").strip()
        summary_template = config.get("summary_template", "").strip()

        mapped = []
        summary_lines = []

        for i, item in enumerate(data):
            if not isinstance(item, dict):
                mapped.append(item)
                continue

            new_item: dict = {}

            if fields_raw:
                for line in fields_raw.split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                    if "=" in line and not line.startswith("="):
                        key, expr = line.split("=", 1)
                        key = key.strip()
                        expr = expr.strip()
                        try:
                            new_item[key] = eval(
                                expr,
                                {"__builtins__": {"len": len, "str": str, "int": int, "float": float}},
                                {"item": item},
                            )
                        except Exception:
                            new_item[key] = None
                    else:
                        for field in line.split(","):
                            field = field.strip()
                            if field:
                                new_item[field] = item.get(field)
            else:
                new_item = dict(item)

            if url_template:
                try:
                    new_item["url"] = url_template.format(**item)
                except (KeyError, IndexError):
                    pass

            mapped.append(new_item)

            if summary_template:
                try:
                    summary_lines.append(f"{i+1}. {summary_template.format(**item)}")
                except (KeyError, IndexError):
                    summary_lines.append(f"{i+1}. (format error)")

        summary = "\n".join(summary_lines) if summary_lines else ""
        first = mapped[0] if mapped else None

        return {
            "result":  mapped,
            "count":   len(mapped),
            "first":   first,
            "summary": summary,
        }
