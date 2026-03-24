import json
from pathlib import Path

from agents.planner import build_weekly_plan
from agents.writer import build_content_pack
from agents.publisher import export_content_pack


def main():
    context_path = Path("data/context.example.json")
    output_dir = Path("outputs")
    output_dir.mkdir(parents=True, exist_ok=True)

    context = json.loads(context_path.read_text(encoding="utf-8"))

    plan = build_weekly_plan(context)
    (output_dir / "marketing_plan.md").write_text(plan, encoding="utf-8")

    content_pack = build_content_pack(context)
    pack_path = export_content_pack(content_pack, str(output_dir))

    print("✅ Done")
    print(f"- Plan: {output_dir / 'marketing_plan.md'}")
    print(f"- Pack: {pack_path}")


if __name__ == "__main__":
    main()
