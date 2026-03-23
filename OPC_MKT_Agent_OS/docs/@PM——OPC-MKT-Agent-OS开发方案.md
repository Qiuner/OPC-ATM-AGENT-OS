# OPC_MKT_Agent_OS 开发方案

> 完成时间: 2026-03-10 | 参与人员: @PM, @Researcher（调研支撑）

---

## 1. 项目概要

**OPC_MKT_Agent_OS** 是一套面向一人公司/小团队的 AI 营销操作系统，核心闭环：

```
上下文资产 → AI策略生成 → 多平台内容生产 → 人工审核 → 发布包导出 → 数据复盘
```

**当前状态**：已有 Python 原型（planner/writer/publisher 三个 stub agent），能跑通最小 CLI 流程，但只是硬编码模板，未接入真实 LLM，也没有 Web UI。

---

## 2. 核心模块（6个）

| 模块 | 说明 | 优先级 |
|------|------|--------|
| A. Context Vault | 上下文资产库（产品/品牌/受众/案例） | P0 |
| B. Agent Studio | 多 Agent 编排（策略/内容/发布/复盘） | P0 |
| C. Task Board | 看板式任务管理 | P0 |
| D. Approval Center | 审核中心（通过/退回/风险检测） | P0 |
| E. Publishing Hub | 多平台格式化导出 | P1 |
| F. Analytics | 指标回填 + 周报生成 | P1 |

---

## 3. 技术方案建议：Next.js 全栈

### 选型理由
1. 团队技术栈就是 Next.js 15 + TypeScript + Tailwind + shadcn/ui
2. 全栈方案减少前后端联调成本，14 天内更容易交付
3. Next.js App Router 的 Server Actions + Route Handlers 完全能覆盖 PRD 中的 API 需求
4. 数据库用 Supabase（PostgreSQL），PRD 中的 9 张表直接建
5. LLM 接入用 Claude API，通过 Server Actions 调用

### 技术栈

| 层 | 选型 |
|----|------|
| 框架 | Next.js 15 (App Router) + TypeScript |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 数据库 | Supabase (PostgreSQL) |
| LLM | Claude API (Anthropic SDK) |
| 认证 | Supabase Auth |
| 部署 | Vercel |

---

## 4. Sprint 规划（14天）

### Sprint 1（D1-D4）：底座 + 最小闭环
- 项目脚手架、数据库建表
- Context Vault CRUD 页面
- Agent 工作流骨架（context → plan → drafts → export）
- 接入 Claude API 替换硬编码模板

### Sprint 2（D5-D9）：审核 + 看板 + 风控
- Task Board 看板页面（状态流转）
- Approval Center（审核/退回/风险词检测）
- Campaign 创建与管理
- Agent 运行日志与追踪

### Sprint 3（D10-D14）：多平台 + 复盘 + 老板看板
- 5 平台格式化导出（小红书/抖音/视频号/X/即刻）
- Dashboard 老板首页（数据汇总）
- 指标回填 + 周报自动生成
- 全链路 Demo 演示

---

## 5. 调研关键发现对开发的影响

来源：[@Researcher 小红书OPC与AI营销调研报告](./\@Researcher——小红书OPC与AI营销调研报告.md)

1. **小红书搜索流量占 65%+** — Writer Agent 必须内置 SEO 关键词策略
2. **AI 内容限流 40%+** — 系统应输出"半成品"让人修改，非全自动
3. **CES 评分公式** — 评论×4 + 转发×4 权重最高，CTA 模板应重点引导评论互动
4. **竞品格局** — Coze 在小红书推广最活跃，但没有"配置包商城"模式，这是差异化切入点

---

## 6. 决策确认（2026-03-10 老板已确认）

| # | 决策项 | 确认结果 |
|---|--------|----------|
| 1 | 技术方案 | Next.js 全栈 + Supabase |
| 2 | 项目位置 | `/Users/jaydenworkplace/Desktop/OPC_MKT_Agent_OS` |
| 3 | Paperclip 集成 | MVP 不集成，自建轻量编排，后期再接入 |
| 4 | LLM 选择 | 多 Provider 统一抽象：默认（Claude/Gemini/GPT）+ 国内（DeepSeek/MiniMax/GLM） |

**状态：已确认，进入开发阶段**

---

*@PM | 2026-03-10*
