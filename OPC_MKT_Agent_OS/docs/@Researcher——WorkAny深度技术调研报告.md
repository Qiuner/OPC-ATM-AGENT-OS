# WorkAny 深度技术调研报告

**完成时间**: 2026-03-27
**参与人员**: @Researcher (市场研究员)
**调研对象**: https://github.com/workany-ai/workany
**官网**: https://workany.ai

---

## 1. 项目概述

### 1.1 核心定位

WorkAny 是一款**桌面端 AI Agent 应用**，定位为 "Desktop Agent for Any Task"。用户通过自然语言输入任务，系统自动规划、执行，并生成各类产物（网站、文档、表格、PPT、数据分析脚本等）。

### 1.2 关键数据

| 指标 | 数值 |
|------|------|
| GitHub Stars | 1,364 |
| Forks | 218 |
| 主要语言 | TypeScript (93%+) |
| 创建时间 | 2026-01-19 |
| 最后更新 | 2026-03-26 |
| 当前版本 | 0.1.19 |
| License | WorkAny Community License (基于 Apache 2.0 + 附加条款) |
| 公司主体 | ThinkAny, LLC |

### 1.3 核心价值主张

- **自然语言驱动**: 用户输入任务描述，AI 自动完成
- **两阶段执行**: 先规划 (Plan) -> 用户审批 -> 再执行 (Execute)
- **多 Agent 后端**: 支持 Claude / Codex / DeepAgents / Kimi 等多种 AI 引擎
- **沙箱隔离执行**: 脚本在隔离环境运行，确保安全
- **丰富的产物预览**: 内置 HTML/React/PDF/Excel/PPT/DOCX/音视频等预览
- **桌面原生**: 通过 Tauri 2 封装为跨平台桌面应用

---

## 2. 技术栈详解

### 2.1 三层架构

```
workany/
+-- src/           # 前端层 (React + TypeScript)
+-- src-api/       # 后端 API 层 (Hono + Claude Agent SDK)
+-- src-tauri/     # 桌面壳层 (Tauri 2 + Rust)
```

### 2.2 具体技术选型

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | React | 19.1.0 | 最新 React 19 |
| **构建工具** | Vite | 7.0.4 | 极速 HMR |
| **CSS 框架** | Tailwind CSS | 4.1.18 | v4 最新版 |
| **UI 组件库** | Radix UI | 多组件 | Dialog, Dropdown, Tooltip, Separator 等 |
| **组件变体** | class-variance-authority (CVA) | 0.7.1 | shadcn/ui 模式 |
| **路由** | React Router DOM | 7.12.0 | v7 最新版 |
| **Markdown** | react-markdown + remark-gfm | 9.0.1 | Agent 消息渲染 |
| **代码高亮** | react-syntax-highlighter | 16.1.0 | 代码块展示 |
| **后端框架** | Hono | 4.7.10 | 超轻量 Web 框架 |
| **AI SDK** | @anthropic-ai/claude-agent-sdk | 0.2.69 | Claude 官方 Agent SDK |
| **AI 基础** | @anthropic-ai/sdk | 0.78.0 | Anthropic 基础 SDK |
| **沙箱** | @anthropic-ai/sandbox-runtime | 0.0.28 | 隔离执行环境 |
| **MCP** | @modelcontextprotocol/sdk | 1.25.2 | MCP 协议支持 |
| **Schema** | Zod | 4.3.5 | 运行时类型验证 |
| **桌面框架** | Tauri | 2.10.1 | Rust 驱动的桌面壳 |
| **数据库** | SQLite | 通过 tauri-plugin-sql | 本地持久化 |
| **文件操作** | tauri-plugin-fs | 2.x | 本地文件系统访问 |
| **Shell** | tauri-plugin-shell | 2.x | 系统命令执行 |
| **二进制打包** | @yao-pkg/pkg | 6.0.0 | Node.js -> 原生二进制 |

### 2.3 关键技术决策分析

**为什么选 Tauri 2 而非 Electron?**
- Tauri 基于系统 WebView，安装包极小 (对比 Electron 100MB+ 的 Chromium)
- Rust 后端性能优异，内存占用低
- Tauri 2 支持插件生态 (SQL, FS, Shell, Dialog 等)
- 缺点: 渲染一致性不如 Electron (依赖系统 WebView)

**为什么选 Hono 而非 Express/Fastify?**
- Hono 是超轻量框架，专为 Edge/Serverless 设计
- 完美支持 SSE (Server-Sent Events) 流式响应
- TypeScript 原生支持
- 可通过 @hono/node-server 在 Node.js 中运行

**API Server 作为 Sidecar 进程运行:**
- 前端 Tauri 启动时，同步启动 workany-api 二进制作为 sidecar
- API 通过 pkg 打包为独立 Node.js 二进制
- 开发时端口 2026，生产时端口 2620

---

## 3. 项目架构深度分析

### 3.1 后端架构 (src-api)

```
src-api/src/
+-- index.ts                    # Hono 服务器入口，路由注册
+-- app/
|   +-- api/
|   |   +-- agent.ts            # Agent API (plan/execute/stop/chat)
|   |   +-- sandbox.ts          # 沙箱执行 API
|   |   +-- preview.ts          # 产物预览 API
|   |   +-- providers.ts        # Provider 管理 API
|   |   +-- files.ts            # 文件操作 API
|   |   +-- mcp.ts              # MCP 服务器管理 API
|   |   +-- health.ts           # 健康检查 + 环境检测
|   +-- middleware/              # CORS 等中间件
+-- core/
|   +-- agent/
|   |   +-- types.ts            # Agent 接口定义 (IAgent)
|   |   +-- base.ts             # BaseAgent 抽象类 + 规划指令模板
|   |   +-- registry.ts         # Agent 注册表 (插件化)
|   |   +-- plugin.ts           # 插件系统定义
|   |   +-- index.ts            # 统一导出 + 初始化
|   +-- sandbox/
|       +-- index.ts            # 沙箱管理器
|       +-- pool.ts             # 沙箱连接池
|       +-- registry.ts         # 沙箱 Provider 注册表
|       +-- plugin.ts           # 沙箱插件定义
|       +-- types.ts            # 沙箱类型
+-- extensions/
|   +-- agent/
|   |   +-- claude/             # Claude Agent SDK 实现 (74KB, 主要实现)
|   |   +-- codex/              # OpenAI Codex CLI 实现
|   |   +-- deepagents/         # DeepAgents.js 适配器
|   |   +-- kimi/               # Kimi 代码模型实现
|   +-- mcp/
|   |   +-- sandbox-server.ts   # MCP 沙箱桥接
|   +-- sandbox/                # 沙箱扩展
+-- shared/
|   +-- provider/
|   |   +-- manager.ts          # Provider 生命周期管理
|   |   +-- registry.ts         # 通用 Provider 注册表
|   |   +-- loader.ts           # 配置加载器
|   |   +-- types.ts            # Provider 接口定义
|   +-- skills/
|   |   +-- loader.ts           # Skills 加载器 (从 ~/.claude/skills 等)
|   +-- services/               # 业务逻辑服务
|   +-- mcp/                    # MCP 客户端
|   +-- types/                  # 共享类型
|   +-- utils/                  # 工具函数
+-- config/
    +-- constants.ts            # 全局常量
    +-- loader.ts               # 配置文件加载
```

### 3.2 前端架构 (src)

```
src/
+-- main.tsx                    # 入口
+-- app/
|   +-- App.tsx                 # 根组件
|   +-- router.tsx              # 路由配置 (4 个页面)
|   +-- pages/                  # 页面组件
+-- components/
|   +-- home/
|   |   +-- TaskInput.tsx       # 任务输入框
|   |   +-- AgentMessages.tsx   # Agent 消息流展示 (17KB)
|   +-- task/
|   |   +-- PlanApproval.tsx    # 计划审批组件
|   |   +-- QuestionInput.tsx   # 交互式问答
|   |   +-- ToolExecutionItem.tsx  # 工具执行展示
|   |   +-- VirtualComputer.tsx # 虚拟计算机视图 (26KB)
|   |   +-- VitePreview.tsx     # Vite 实时预览
|   |   +-- RightSidebar.tsx    # 右侧面板 (43KB, 最大组件)
|   +-- artifacts/              # 产物预览系统
|   |   +-- ArtifactPreview.tsx # 通用预览路由 (30KB)
|   |   +-- CodePreview.tsx     # 代码预览
|   |   +-- DocxPreview.tsx     # Word 文档预览
|   |   +-- ExcelPreview.tsx    # Excel 预览
|   |   +-- PptxPreview.tsx     # PPT 预览
|   |   +-- PdfPreview.tsx      # PDF 预览
|   |   +-- ImagePreview.tsx    # 图片预览
|   |   +-- AudioPreview.tsx    # 音频预览
|   |   +-- VideoPreview.tsx    # 视频预览
|   |   +-- WebSearchPreview.tsx # 搜索结果预览
|   +-- layout/
|   |   +-- left-sidebar.tsx    # 左侧导航 (35KB)
|   |   +-- right-sidebar.tsx   # 右侧面板框架
|   |   +-- sidebar-context.tsx # Sidebar 状态管理
|   +-- settings/               # 设置模块 (Provider 配置)
|   +-- ui/                     # shadcn/ui 基础组件
|   +-- shared/                 # 共享组件
|   +-- common/                 # 通用组件
+-- shared/
|   +-- hooks/
|   |   +-- useAgent.ts         # Agent 交互核心 Hook (100KB! 最大文件)
|   |   +-- useProviders.ts     # Provider 管理 Hook
|   |   +-- useVitePreview.ts   # Vite 预览 Hook
|   +-- db/
|   |   +-- database.ts         # SQLite 数据库操作 (24KB)
|   |   +-- settings.ts         # 设置存储 (29KB)
|   |   +-- types.ts            # 数据库类型定义
|   +-- providers/
|   |   +-- theme-provider.tsx  # 主题切换
|   |   +-- language-provider.tsx # i18n
|   +-- lib/                    # 工具库
+-- core/
|   +-- i18n/                   # 国际化
+-- config/
|   +-- locale/                 # 语言包
|   +-- style/                  # 样式配置
+-- types/                      # 全局类型
```

### 3.3 桌面壳层 (src-tauri)

- **Tauri 2.10.1** + Rust 2021 Edition
- 插件: `tauri-plugin-sql` (SQLite), `tauri-plugin-fs`, `tauri-plugin-shell`, `tauri-plugin-opener`
- 外部二进制: workany-api, claude CLI, codex CLI 作为 sidecar
- 窗口默认: 1200x800, macOS 有 entitlements (网络、文件访问权限)
- 有 Homebrew Cask 配置 (macOS 安装支持)

---

## 4. Agent 工作流深度分析

### 4.1 两阶段执行模型 (Plan-Execute)

这是 WorkAny 最核心的设计模式:

**Phase 1 - Planning:**
1. 用户输入自然语言任务
2. 前端调用 `POST /agent/plan`
3. 后端创建 Session，发送 PLANNING_INSTRUCTION 系统提示
4. Agent 分析任务意图:
   - **简单问题** (问候/闲聊/知识问答) -> 返回 `direct_answer`，直接回复
   - **复杂任务** (文件操作/代码生成/多步骤) -> 返回 `plan` JSON
5. 前端展示计划步骤，等待用户审批

**Phase 2 - Execution:**
1. 用户审批计划 (Approve/Reject)
2. 前端调用 `POST /agent/execute` (携带 planId)
3. 后端查找存储的 Plan，构建执行提示词
4. Agent 按步骤执行，通过 SSE 实时流式返回
5. 消息类型: text / tool_use / tool_result / result / error / done

**意图检测的巧妙之处:**
- Planning 阶段强制要求输出 JSON 格式
- 系统提示中明确区分了 "简单问题" 和 "复杂任务"
- 内置了中英文示例 (鸡兔同笼、文件删除等)
- 解析器有 3 重 fallback 策略确保能提取 JSON

### 4.2 Agent 抽象层设计

```
IAgent (接口)
  +-- run()          # 直接执行模式
  +-- plan()         # 规划阶段
  +-- execute()      # 执行阶段
  +-- stop()         # 中止执行
  +-- getPlan()      # 获取存储的计划
  +-- deletePlan()   # 删除计划

BaseAgent (抽象基类)
  +-- Session 管理 (Map<id, AgentSession>)
  +-- Plan 存储 (Map<id, TaskPlan>)
  +-- 语言检测 (CJK -> zh-CN, 否则 en-US)
  +-- 工作空间指令生成

实现:
  +-- ClaudeAgent   (Claude Agent SDK, 74KB, 主力实现)
  +-- CodexAgent    (OpenAI Codex CLI)
  +-- DeepAgentsAdapter (DeepAgents.js/LangGraph)
  +-- KimiAgent     (Kimi 代码模型)
```

### 4.3 Plugin 系统

每个 Agent 实现都是一个 Plugin:

```typescript
interface AgentPlugin {
  metadata: AgentProviderMetadata;  // 类型、名称、支持特性
  factory: (config: AgentConfig) => IAgent;  // 工厂函数
  onInit?: () => Promise<void>;
  onDestroy?: () => Promise<void>;
}
```

Registry 模式管理所有 Plugin:
- 支持动态注册/注销
- 单例实例管理 (带配置变化检测)
- 支持按能力查询 (支持 Plan? 支持 Streaming? 支持 Sandbox?)

### 4.4 通信协议

前后端通过 **SSE (Server-Sent Events)** 通信:

```
前端 --(POST /agent/plan)--> 后端
后端 --[SSE stream]--> 前端
  data: {"type":"session","sessionId":"xxx"}
  data: {"type":"text","content":"..."}
  data: {"type":"plan","plan":{...}}
  data: {"type":"tool_use","name":"Write","input":{...}}
  data: {"type":"tool_result","output":"..."}
  data: {"type":"result","content":"...","cost":0.05,"duration":12000}
  data: {"type":"done"}
```

### 4.5 Sandbox 执行环境

- 基于 `@anthropic-ai/sandbox-runtime` 实现隔离执行
- Codex CLI 作为备选 sandbox provider
- 连接池管理 (最大 5 个并发)
- MCP 桥接: sandbox 内部通过 MCP 协议暴露工具

### 4.6 MCP 集成

- 从两个目录加载 MCP 配置: `~/.workany/mcp.json` 和 `~/.claude/settings.json`
- MCP 服务器作为 Agent 的工具扩展
- 前端提供 MCP 管理 API (`/mcp` 路由)

### 4.7 Skills 系统

- 从 `~/.workany/skills/` 和 `~/.claude/skills/` 加载自定义 Skills
- Skills 可扩展 Agent 的能力
- 兼容 Claude Code 的 Skills 格式

---

## 5. 前端 UI/UX 分析

### 5.1 页面结构 (4 个路由)

| 路由 | 组件 | 功能 |
|------|------|------|
| `/` | HomePage | 主页 - 任务输入 + 消息流 |
| `/task/:taskId` | TaskDetailPage | 任务详情 - 执行过程 + 产物预览 |
| `/library` | LibraryPage | 文件库 - 所有生成的产物 |
| `/setup` | SetupPage | 初始设置 (API Key 配置) |

### 5.2 布局模式

**三栏布局:**
- **左侧栏** (35KB): 任务历史列表、导航
- **主内容区**: 任务输入/消息流/执行详情
- **右侧栏** (43KB): 产物预览、文件浏览器

### 5.3 UI 组件体系

**基于 shadcn/ui 模式:**
- Radix UI 无头组件 + Tailwind CSS 样式
- CVA (class-variance-authority) 管理变体
- cmdk 命令面板
- lucide-react 图标库

**产物预览系统极为丰富:**
- ArtifactPreview.tsx (30KB) 作为路由器分发到具体预览器
- 支持 12+ 种文件格式的预览
- HTML/React 文件支持 Vite 实时预览
- Excel 使用 xlsx 库解析
- DOCX/PPTX 使用 JSZip 解析

### 5.4 核心交互模式

**useAgent Hook (100KB, 整个项目最大的单文件)**
- 管理完整的 Agent 交互生命周期
- SSE 连接建立和消息解析
- 计划审批流程控制
- 消息历史维护
- 错误处理和重试
- 与 SQLite 数据库同步

### 5.5 数据持久化

**SQLite 数据库结构:**
- `sessions` 表: 会话 (可包含多个任务)
- `tasks` 表: 任务记录 (status/cost/duration)
- `messages` 表: 消息记录 (text/tool_use/tool_result/plan)
- `library_files` 表: 生成的文件记录
- `settings` 表: Key-Value 设置存储

---

## 6. 值得学习的设计模式

### 6.1 Plan-Execute 两阶段模型

这是 WorkAny 最值得借鉴的模式。在 AI Agent 应用中:
- **Plan 阶段让用户保持控制权** -- Agent 不会直接执行可能危险的操作
- **意图检测避免过度工程化** -- 简单问题直接回答，复杂任务才走规划流程
- **步骤描述保持简短 (<50字符)** -- 不展示实现细节，降低用户认知负担

### 6.2 Provider Plugin 架构

- 统一 IAgent 接口，支持多种 AI 后端
- 插件元数据包含能力声明 (supportsPlan/supportsStreaming/supportsSandbox)
- Registry 单例管理 + 配置变更检测自动重建实例
- 可运行时动态注册新 Provider

### 6.3 Sidecar API Server 模式

- API Server 打包为独立二进制，作为 Tauri sidecar 运行
- 前后端通过 HTTP/SSE 通信，解耦清晰
- 开发时可独立运行 API Server，不需要 Tauri 环境
- 支持 Web-only 模式 (`pnpm dev:web`)

### 6.4 工作空间隔离

- 每个任务有独立的 workDir
- 所有文件操作强制在 workDir 内完成
- 生成的脚本必须使用 OUTPUT_DIR 变量
- Read-Before-Write 规则增加安全性

### 6.5 多重 JSON 解析 Fallback

Planning 响应的解析有 5 重策略:
1. Markdown code block 中提取
2. 原始 JSON 对象提取 (正确处理嵌套括号)
3. 任意 JSON 对象查找
4. 字符级 answer 字段提取
5. 正则模式匹配兜底

这说明 AI 输出的不确定性是真实的工程问题，需要防御性编程。

---

## 7. 与 OPC MKT Agent OS 的对比分析

| 维度 | WorkAny | OPC MKT Agent OS |
|------|---------|-------------------|
| **定位** | 通用桌面 AI Agent (任务执行) | 出海品牌 AI 营销团队 |
| **桌面框架** | Tauri 2 (Rust + 系统 WebView) | Electron (Chromium) |
| **前端** | React 19 + Vite + Tailwind v4 | React + Next.js/Vite |
| **后端** | Hono (Node.js sidecar) | Node.js |
| **AI 引擎** | Claude Agent SDK + 多 Provider | Claude API |
| **Agent 模型** | 单 Agent 多 Provider | 多 Agent 协作 (PM/Dev/QA) |
| **执行模式** | Plan -> Approve -> Execute | 多 Agent 流水线 |
| **MCP 支持** | 原生集成 | -- |
| **Skills 支持** | 原生集成 | -- |
| **数据库** | SQLite (本地) | -- |
| **国际化** | 中英双语 | 聚焦出海场景 |

### 7.1 可借鉴的方向

1. **Plan-Execute 模式**: 我们的多 Agent 流水线中，每个 Agent 输出计划让用户/PM 审批后再执行，提升用户信任感

2. **SSE 流式通信**: Agent 执行过程实时展示，比轮询更高效

3. **Provider Plugin 架构**: 我们也可以抽象 Agent 引擎层，未来支持不同 AI 模型

4. **Sidecar API 模式**: Electron 中同样可以启动独立 API 进程，前后端解耦

5. **产物预览系统**: 营销场景中生成的内容 (文案/图片/网页) 也需要实时预览

6. **SQLite 本地存储**: 桌面端不依赖远端数据库，离线可用

7. **Skills/MCP 扩展机制**: 营销工具 (SEO 分析/广告投放/社媒管理) 可以作为 Skills 或 MCP Server 接入

---

## 8. 风险与不足分析

### 8.1 WorkAny 的局限

1. **单 Agent 模型**: 不支持多 Agent 协作，复杂任务全靠单一 Agent 完成
2. **Claude 依赖度高**: 核心实现 (74KB) 高度耦合 Claude Agent SDK，其他 Provider 较薄
3. **前端代码集中度高**: useAgent.ts 100KB、RightSidebar.tsx 43KB -- 需要重构拆分
4. **社区版本限制**: License 基于 Apache 2.0 但有附加商业条款
5. **版本早期**: 0.1.19 仍处于早期阶段，API 不稳定

### 8.2 对我们的启示

1. 营销 Agent 的工作流比通用 Agent 更垂直，应该做得更深而非更广
2. 多 Agent 协作是我们的差异化优势，WorkAny 没有这个能力
3. 桌面端选型需要权衡: Tauri 小巧但 WebView 一致性差，Electron 臃肿但稳定
4. 产物预览能力是用户感知价值很高的功能，值得投入

---

## 9. 数据来源

| 来源 | URL |
|------|-----|
| GitHub 仓库 | https://github.com/workany-ai/workany |
| 官方网站 | https://workany.ai |
| package.json | https://github.com/workany-ai/workany/blob/main/package.json |
| src-api/package.json | https://github.com/workany-ai/workany/blob/main/src-api/package.json |
| Agent 核心代码 | https://github.com/workany-ai/workany/tree/main/src-api/src/core/agent |
| 前端 Hook | https://github.com/workany-ai/workany/blob/main/src/shared/hooks/useAgent.ts |
| 产物预览系统 | https://github.com/workany-ai/workany/tree/main/src/components/artifacts |
| Tauri 配置 | https://github.com/workany-ai/workany/blob/main/src-tauri/tauri.conf.json |

---

## 10. 结论与建议

WorkAny 是一个架构清晰、技术选型现代的桌面 AI Agent 项目。其 Plan-Execute 两阶段模型、Provider Plugin 架构、SSE 流式通信、丰富的产物预览系统都值得 OPC MKT Agent OS 借鉴。

**优先级建议:**

| 优先级 | 借鉴点 | 实施建议 |
|--------|--------|----------|
| P0 | Plan-Execute 模式 | 每个营销 Agent 输出执行计划，用户审批后执行 |
| P0 | SSE 流式通信 | Agent 执行过程实时展示，提升用户体验 |
| P1 | Provider Plugin 架构 | 抽象 AI 引擎层，支持多模型切换 |
| P1 | 产物预览 | 营销内容 (文案/广告素材/网页) 实时预览 |
| P2 | Skills/MCP 扩展 | 营销工具作为可插拔 Skills 接入 |
| P2 | SQLite 本地存储 | 桌面端离线任务历史保存 |

**核心差异化方向: WorkAny 做通用 Agent，我们做垂直营销 Agent 团队。多 Agent 协作是 WorkAny 没有的能力，这是我们的壁垒。**
