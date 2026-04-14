import json
from engine.base_node import BaseNode, register_node


@register_node
class JsonParseNode(BaseNode):
    type     = "json_parse"
    label    = "JSON Parse"
    category = "Data"

    inputs  = [{"name": "text", "type": "STRING", "label": "JSON String"}]
    outputs = [{"name": "data", "type": "JSON",   "label": "Data"}]
    config_schema = []

    async def execute(self, inputs: dict, config: dict) -> dict:
        text = str(inputs.get("text", "") or "")
        # Strip markdown code fences if present
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.split("\n")
            lines = lines[1:]  # skip ```json or ```
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            stripped = "\n".join(lines).strip()
        # Try to find JSON object/array in the text
        for start_char, end_char in [("{", "}"), ("[", "]")]:
            start = stripped.find(start_char)
            end = stripped.rfind(end_char)
            if start != -1 and end > start:
                try:
                    data = json.loads(stripped[start:end + 1])
                    return {"data": data}
                except json.JSONDecodeError:
                    continue
        # Fallback: try parsing the whole thing
        data = json.loads(stripped)
        return {"data": data}
