# OPC_MKT_Agent_OS

OPC（一人公司）营销 Agent 操作系统原型。

目标：把用户的**产品、经验、内容资产**沉淀为统一上下文，驱动多 Agent 自动完成：
- 营销策略生成
- 多平台内容生产
- 分发排程与发布（小红书 / 抖音 / 视频号 / X / 即刻）
- 数据回流与迭代优化

---

## 1. 核心能力（MVP）

1. Context Vault（上下文资产库）
   - 存产品信息、用户画像、过往案例、品牌语气、禁用词
2. Strategy Planner Agent
   - 基于上下文生成周/月营销计划
3. Content Studio Agents
   - 图文、短视频脚本、推文线程等多格式内容生成
4. Publisher Agent
   - 统一发布任务（先支持“导出待发布包 + 手动发布”）
5. Feedback Agent
   - 收集平台数据，形成下轮优化建议

---

## 2. 目录结构

```bash
OPC_MKT_Agent_OS/
  docs/                # 方案文档
  config/              # 配置文件
  data/                # 用户上下文数据
  outputs/             # 生成结果
  src/                 # Agent 代码
```

---

## 3. 快速开始

```bash
cd OPC_MKT_Agent_OS
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

运行后会在 `outputs/` 生成：
- `marketing_plan.md`
- `content_pack.json`

---

## 4. 下一步建议

- 接入真实 LLM API（OpenAI / Claude / Gemini）
- 接入发布通道（先做 webhook / 手动确认）
- 增加素材检索与复用（RAG）
- 建立“平台语气模板 + 平台风控规则”
