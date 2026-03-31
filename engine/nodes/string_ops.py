"""String operation nodes — split, replace, regex, concat, format."""
import re as re_mod
from engine.base_node import BaseNode, register_node


@register_node
class StringConcatNode(BaseNode):
    type     = "string_concat"
    label    = "String Concat"
    category = "Data"

    inputs  = [
        {"name": "a", "type": "STRING", "label": "A"},
        {"name": "b", "type": "STRING", "label": "B", "optional": True},
    ]
    outputs = [{"name": "result", "type": "STRING", "label": "Result"}]
    config_schema = [
        {"name": "separator", "type": "string", "label": "Separator", "default": ""},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        a = str(inputs.get("a", ""))
        b = str(inputs.get("b", ""))
        sep = config.get("separator", "")
        parts = [p for p in [a, b] if p]
        return {"result": sep.join(parts)}


@register_node
class StringReplaceNode(BaseNode):
    type     = "string_replace"
    label    = "String Replace"
    category = "Data"

    inputs  = [{"name": "text", "type": "STRING", "label": "Text"}]
    outputs = [{"name": "result", "type": "STRING", "label": "Result"}]
    config_schema = [
        {"name": "find",    "type": "string", "label": "Find",        "default": ""},
        {"name": "replace", "type": "string", "label": "Replace With", "default": ""},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        text = str(inputs.get("text", ""))
        find = config.get("find", "")
        replace = config.get("replace", "")
        return {"result": text.replace(find, replace)}


@register_node
class StringSplitNode(BaseNode):
    type     = "string_split"
    label    = "String Split"
    category = "Data"

    inputs  = [{"name": "text", "type": "STRING", "label": "Text"}]
    outputs = [
        {"name": "parts", "type": "JSON",   "label": "Parts (list)"},
        {"name": "count", "type": "INT",    "label": "Count"},
        {"name": "first", "type": "STRING", "label": "First"},
        {"name": "last",  "type": "STRING", "label": "Last"},
    ]
    config_schema = [
        {"name": "delimiter", "type": "string", "label": "Delimiter", "default": "\\n"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        text = str(inputs.get("text", ""))
        delim = config.get("delimiter", "\\n").replace("\\n", "\n").replace("\\t", "\t")
        parts = text.split(delim)
        return {
            "parts": parts,
            "count": len(parts),
            "first": parts[0] if parts else "",
            "last":  parts[-1] if parts else "",
        }


@register_node
class RegexNode(BaseNode):
    type     = "regex"
    label    = "Regex Match"
    category = "Data"

    inputs  = [{"name": "text", "type": "STRING", "label": "Text"}]
    outputs = [
        {"name": "match",   "type": "STRING", "label": "Match"},
        {"name": "groups",  "type": "JSON",   "label": "Groups"},
        {"name": "found",   "type": "BOOL",   "label": "Found"},
        {"name": "all",     "type": "JSON",   "label": "All Matches"},
    ]
    config_schema = [
        {"name": "pattern", "type": "string", "label": "Pattern", "default": "", "placeholder": "e.g. (\\d+)x(\\d+)"},
        {"name": "mode",    "type": "select", "label": "Mode",    "default": "search", "options": ["search", "findall", "match"]},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        text = str(inputs.get("text", ""))
        pattern = config.get("pattern", "")
        mode = config.get("mode", "search")

        if not pattern:
            return {"match": "", "groups": [], "found": False, "all": []}

        if mode == "findall":
            all_matches = re_mod.findall(pattern, text)
            return {
                "match": all_matches[0] if all_matches else "",
                "groups": all_matches,
                "found": len(all_matches) > 0,
                "all": all_matches,
            }
        else:
            fn = re_mod.match if mode == "match" else re_mod.search
            m = fn(pattern, text)
            if m:
                return {"match": m.group(0), "groups": list(m.groups()), "found": True, "all": [m.group(0)]}
            return {"match": "", "groups": [], "found": False, "all": []}
