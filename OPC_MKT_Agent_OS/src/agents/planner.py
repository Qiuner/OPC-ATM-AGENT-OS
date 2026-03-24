from datetime import date


def build_weekly_plan(context: dict) -> str:
    brand = context.get("brand", {}).get("name", "Your Brand")
    positioning = context.get("brand", {}).get("positioning", "")

    return f"""# {brand} - Weekly Marketing Plan ({date.today()})

## Positioning
{positioning}

## Weekly Focus
1. 教育市场：解释为什么老板需要“个人AI业务站”
2. 建立信任：展示你自己的样板站和拆解
3. 收集线索：引导评论关键词/私信领取诊断

## Content Rhythm
- Mon: 痛点型内容（为什么有流量却不成交）
- Tue: 方法型内容（OPC站的4个模块）
- Wed: 案例型内容（你的实战拆解）
- Thu: 误区型内容（只做账号不做资产）
- Fri: 招募型内容（内测名额）
- Weekend: 复盘 + FAQ
"""
