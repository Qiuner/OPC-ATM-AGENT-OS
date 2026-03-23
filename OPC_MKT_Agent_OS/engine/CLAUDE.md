# Marketing Agent OS — Engine

## 项目概述
Claude Agent SDK 驱动的营销自动化引擎。CEO Agent 调度子 Agent 执行营销任务，Analyst Agent 驱动数据飞轮。

## 技术栈
- **Runtime**: Node.js 20+, TypeScript, tsx
- **Agent 框架**: @anthropic-ai/claude-agent-sdk (query 函数)
- **数据库**: Supabase PostgreSQL
- **调度**: node-cron

## 目录结构
```
engine/
├── agents/          # Agent 实现（CEO, XHS, Analyst...）
├── skills/          # SKILL.md 文件（Agent SOP，Analyst 自动更新）
├── memory/          # 文件系统记忆（品牌/受众/胜出模式）
├── db/              # 数据库 Schema + 客户端
├── mcps/            # MCP 工具集成（待实现）
├── webhooks/        # 数据回调服务器（待实现）
└── scheduler.ts     # Cron 定时调度
```

## 运行命令
```bash
pnpm install                                    # 安装依赖
npx tsx agents/ceo.ts "写一篇小红书笔记"          # 手动触发 CEO
npx tsx agents/xhs-agent.ts "主题描述"            # 独立运行 XHS Agent
npx tsx agents/analyst-agent.ts                  # 手动触发飞轮分析
npx tsx scheduler.ts                             # 启动定时调度器
```

## Claude Agent SDK 用法
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "...",
  options: {
    model: "claude-sonnet-4-20250514",
    agents: { "sub-agent": { description, prompt, tools } },
    mcpServers: { ... },
    allowedTools: ["Read", "Write", "Agent"],
  },
})) { ... }
```

## 数据飞轮
内容生成 → 发布 → 回收指标 → Analyst 分析 Top 20% → 更新 SKILL.md → 下轮更好

## 新建 Agent 规范（必须遵守）

新增 Agent 时必须同时完成以下 3 项：

### 1. 注册到 Registry
在 `agents/registry.ts` 的 `registerDefaults()` 中添加，包含完整字段：
- `id`, `name`, `nameEn`, `description`, `skillFile`, `model`, `tools`, `mcpServers`, `maxTurns`, `level`, `color`, `avatar`

### 2. 系统提示词（SKILL.md）
在 `skills/` 目录创建对应的 `{agent-name}.SKILL.md`，内容包含：
- 角色定义（你是谁、核心能力）
- SOP 工作流程（分步骤描述）
- 输出格式规范
- 质量标准和边界条件

### 3. 像素头像（PixelAgentSVG）
在 `web/src/components/features/agent-monitor/pixel-agents.tsx` 中：
- 添加对应的像素角色组件（20x26 viewBox，pixel art 风格）
- 在 `PixelAgentSVG` 中注册新 agentId
- 每个角色要有辨识度（不同服装/配件/颜色）
- 支持 busy/online/offline 三种状态的配色变化
