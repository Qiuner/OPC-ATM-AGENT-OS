import json
from pathlib import Path


def export_content_pack(content_pack: dict, output_dir: str = "outputs") -> str:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    out_file = Path(output_dir) / "content_pack.json"
    out_file.write_text(json.dumps(content_pack, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(out_file)
