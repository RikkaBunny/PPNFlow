"""File Read / File Write nodes."""
from engine.base_node import BaseNode, register_node


@register_node
class FileReadNode(BaseNode):
    type     = "file_read"
    label    = "File Read"
    category = "File"

    inputs  = [{"name": "path", "type": "STRING", "label": "Path", "optional": True}]
    outputs = [
        {"name": "content", "type": "STRING", "label": "Content"},
        {"name": "size",    "type": "INT",    "label": "Size (bytes)"},
    ]
    config_schema = [
        {"name": "path",     "type": "string", "label": "File Path", "default": ""},
        {"name": "encoding", "type": "string", "label": "Encoding",  "default": "utf-8"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        path = inputs.get("path") or config.get("path", "")
        encoding = config.get("encoding", "utf-8")
        if not path:
            raise RuntimeError("File path is required")
        with open(path, "r", encoding=encoding) as f:
            content = f.read()
        import os
        return {"content": content, "size": os.path.getsize(path)}


@register_node
class FileWriteNode(BaseNode):
    type     = "file_write"
    label    = "File Write"
    category = "File"
    volatile = True

    inputs  = [
        {"name": "content", "type": "STRING", "label": "Content"},
        {"name": "path",    "type": "STRING", "label": "Path", "optional": True},
    ]
    outputs = [
        {"name": "path",    "type": "STRING", "label": "Path"},
        {"name": "success", "type": "BOOL",   "label": "Success"},
    ]
    config_schema = [
        {"name": "path",     "type": "string", "label": "File Path", "default": ""},
        {"name": "encoding", "type": "string", "label": "Encoding",  "default": "utf-8"},
        {"name": "mode",     "type": "select", "label": "Mode",      "default": "write", "options": ["write", "append"]},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        path = inputs.get("path") or config.get("path", "")
        content = inputs.get("content", "")
        encoding = config.get("encoding", "utf-8")
        mode = "a" if config.get("mode") == "append" else "w"
        if not path:
            raise RuntimeError("File path is required")
        with open(path, mode, encoding=encoding) as f:
            f.write(str(content))
        return {"path": path, "success": True}
