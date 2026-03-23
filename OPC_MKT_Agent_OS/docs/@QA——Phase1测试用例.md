# [@QA] Phase 1 测试用例 — 统一系统架构

**完成时间：** 2026-03-20
**参与人员：** @QA（测试用例设计）
**依赖文档：** @PM——PRD-多Agent协作架构.md、@DEV——技术实施方案-多Agent架构.md
**测试范围：** Phase 1 — engine/ 为核心，web/ 为 UI 层的统一架构

---

## 1. 测试概览

### 1.1 Phase 1 核心交付物

| 模块 | 交付物 | 对应文件 |
|------|--------|----------|
| Agent Registry | Agent 注册中心（单例模式） | `engine/agents/registry.ts` |
| API Gateway | 统一 Agent 执行端点 | `web/src/app/api/agent/execute/route.ts` |
| API Gateway | Agent 状态查询端点 | `web/src/app/api/agent/status/route.ts` |
| API Gateway | EventBus SSE 推送端点 | `web/src/app/api/agent/events/route.ts` |
| SDK 适配层 | executor 封装 | `web/src/lib/agent-sdk/executor.ts` |
| CEO 增强 | Supervisor 模式调度子 Agent | `engine/agents/ceo.ts` |
| Podcast Agent | 新增 P0 Agent | `engine/agents/podcast-agent.ts` |
| 回归测试 | 现有功能不被破坏 | 原有 API + UI 页面 |

### 1.2 测试策略

| 测试类型 | 覆盖范围 | 工具 |
|----------|----------|------|
| 单元测试 | Registry、类型定义、工具函数 | Jest + ts-jest |
| 集成测试 | API 端点、SDK executor、CEO 调度 | Jest + supertest |
| SSE 流式测试 | execute SSE 流、events SSE 推送 | Jest + EventSource mock |
| 回归测试 | 现有 API 端点、页面可访问性 | Jest + 构建验证 |

---

## 2. Agent Registry 测试用例

### TC-001: Registry 单例模式
- **前置条件**: 无
- **测试步骤**:
  1. 调用 `AgentRegistry.getInstance()` 获取实例 A
  2. 再次调用 `AgentRegistry.getInstance()` 获取实例 B
  3. 比较 A 和 B 是否为同一引用
- **预期结果**: A === B，严格相等
- **优先级**: P0
- **类型**: 功能

### TC-002: 默认 Agent 注册
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 获取 Registry 实例
  2. 调用 `getAll()` 获取所有已注册 Agent
  3. 检查是否包含 P0 Agent: `ceo`, `xhs-agent`, `analyst-agent`, `podcast-agent`
  4. 检查是否包含其他默认 Agent: `growth-agent`, `brand-reviewer`
- **预期结果**: 至少注册 6 个默认 Agent，每个 Agent 具备完整的 `AgentDefinition` 字段
- **优先级**: P0
- **类型**: 功能

### TC-003: 按 ID 查询 Agent
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 调用 `get('ceo')`
  2. 调用 `get('xhs-agent')`
  3. 调用 `get('nonexistent-agent')`
- **预期结果**:
  - `get('ceo')` 返回 CEO Agent 定义，包含 `id: 'ceo'`, `level: 'orchestrator'`, `tools` 包含 `'Agent'`
  - `get('xhs-agent')` 返回 XHS Agent 定义，`level: 'specialist'`
  - `get('nonexistent-agent')` 返回 `undefined`
- **优先级**: P0
- **类型**: 功能

### TC-004: 按级别筛选 Agent
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 调用 `getByLevel('orchestrator')`
  2. 调用 `getByLevel('specialist')`
  3. 调用 `getByLevel('reviewer')`
- **预期结果**:
  - `orchestrator` 级别仅返回 CEO
  - `specialist` 级别返回 XHS、Analyst、Growth、Podcast 等
  - `reviewer` 级别返回 Brand Reviewer
- **优先级**: P1
- **类型**: 功能

### TC-005: 动态注册新 Agent
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 构造新的 `AgentDefinition` 对象（id: 'test-agent'）
  2. 调用 `register(newAgent)`
  3. 调用 `get('test-agent')`
  4. 调用 `getAll()` 确认总数增加
- **预期结果**: 新 Agent 成功注册并可查询，总数 = 默认数量 + 1
- **优先级**: P1
- **类型**: 功能

### TC-006: AgentDefinition 字段完整性
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 遍历 `getAll()` 返回的所有 Agent
  2. 检查每个 Agent 必须具备以下字段：`id`, `name`, `nameEn`, `description`, `model`, `tools`, `maxTurns`, `level`, `color`, `avatar`
  3. 检查 `tools` 为非空数组
  4. 检查 `model` 为有效模型字符串
- **预期结果**: 所有 Agent 字段完整，无 undefined/null 值
- **优先级**: P0
- **类型**: 边界

### TC-007: buildDirectConfig 构建 SDK 配置
- **前置条件**: Registry 初始化完成，SKILL.md 文件存在
- **测试步骤**:
  1. 调用 `buildDirectConfig('xhs-agent', '写一篇关于AI工具的笔记')`
  2. 检查返回的 `prompt` 包含 Agent 名称和用户消息
  3. 检查 `options` 包含 `model`, `allowedTools`, `maxTurns`
- **预期结果**: 返回有效的 SDK query 配置对象，prompt 中包含 SOP 和品牌调性
- **优先级**: P0
- **类型**: 功能

### TC-008: buildDirectConfig 处理不存在的 Agent
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 调用 `buildDirectConfig('nonexistent', 'test')`
- **预期结果**: 抛出 Error: `Agent not found: nonexistent`
- **优先级**: P0
- **类型**: 异常

### TC-009: buildSupervisorConfig 构建 CEO 调度配置
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 调用 `buildSupervisorConfig('帮我写一篇小红书笔记')`
  2. 检查返回的 `options.agents` 包含所有非 CEO 的 Agent 作为子 Agent
  3. 检查每个子 Agent 的 `description` 和 `prompt` 非空
  4. 检查 `options.allowedTools` 包含 `'Agent'`
- **预期结果**: CEO 配置包含所有 specialist/reviewer 作为子 Agent，且配置合法
- **优先级**: P0
- **类型**: 功能

---

## 3. POST /api/agent/execute 端点测试用例

### TC-010: 正常执行 — direct 模式
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST 请求到 `/api/agent/execute`
  2. 请求体: `{ "agent": "xhs-agent", "message": "写一篇AI工具推荐笔记", "mode": "direct" }`
  3. 验证响应 Content-Type 为 `text/event-stream`
  4. 读取 SSE 事件流
- **预期结果**:
  - 返回 200 状态码
  - Content-Type: `text/event-stream`
  - 事件流包含 `type: 'text'` 事件（Agent 输出文本）
  - 事件流以 `type: 'done'` 事件结束
  - 每个事件的 `agentId` 为 `'xhs-agent'`
- **优先级**: P0
- **类型**: 功能

### TC-011: 正常执行 — supervisor 模式
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST 请求: `{ "agent": "ceo", "message": "帮我做一篇小红书笔记", "mode": "supervisor" }`
  2. 读取 SSE 事件流
- **预期结果**:
  - 返回 200 状态码
  - 事件流中出现 `type: 'sub_agent_start'` 事件（CEO 调度子 Agent）
  - 事件流中出现 `type: 'sub_agent_done'` 事件
  - 事件流以 `type: 'done'` 事件结束
- **优先级**: P0
- **类型**: 功能

### TC-012: 请求参数缺失 — 缺少 agent
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST 请求: `{ "message": "测试" }`（缺少 agent 字段）
- **预期结果**: 返回 400 状态码，错误消息提示 agent 字段必填
- **优先级**: P0
- **类型**: 异常

### TC-013: 请求参数缺失 — 缺少 message
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST 请求: `{ "agent": "ceo" }`（缺少 message 字段）
- **预期结果**: 返回 400 状态码，错误消息提示 message 字段必填
- **优先级**: P0
- **类型**: 异常

### TC-014: 无效 Agent ID
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST 请求: `{ "agent": "fake-agent-999", "message": "测试" }`
- **预期结果**: 返回 404 状态码，错误消息: `Agent not found: fake-agent-999`
- **优先级**: P0
- **类型**: 异常

### TC-015: 空 message 字符串
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST 请求: `{ "agent": "ceo", "message": "" }`
- **预期结果**: 返回 400 状态码，提示 message 不能为空
- **优先级**: P1
- **类型**: 边界

### TC-016: SSE 事件格式验证
- **前置条件**: API 服务运行中，成功发起执行请求
- **测试步骤**:
  1. 发送有效请求并读取 SSE 流
  2. 解析每个 `data:` 行
  3. 验证每个事件都是合法 JSON
  4. 验证每个事件都有 `type` 字段
  5. 验证 `type` 值在允许列表中: `text`, `tool_call`, `tool_result`, `sub_agent_start`, `sub_agent_done`, `agent_message`, `done`, `error`
- **预期结果**: 所有事件格式合法，`type` 值在预定义列表内
- **优先级**: P0
- **类型**: 功能

### TC-017: context 参数传递
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST 请求: `{ "agent": "ceo", "message": "执行", "mode": "supervisor", "context": { "campaignId": "camp_001" } }`
  2. 验证 Agent 执行过程中能够访问 context 信息
- **预期结果**: 请求成功，context 被传递给 Agent
- **优先级**: P1
- **类型**: 功能

### TC-018: 请求方法错误
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 GET 请求到 `/api/agent/execute`
- **预期结果**: 返回 405 Method Not Allowed
- **优先级**: P1
- **类型**: 异常

---

## 4. GET /api/agent/status 端点测试用例

### TC-019: 查询所有 Agent 状态
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 GET 请求到 `/api/agent/status`
  2. 解析 JSON 响应
- **预期结果**:
  - 返回 200 状态码
  - 响应体包含 `agents` 数组
  - 每个 Agent 对象包含: `id`, `name`, `status`, `toolCallCount`
  - `status` 值为 `'idle'` | `'busy'` | `'offline'` 之一
  - 至少返回 6 个已注册 Agent
- **优先级**: P0
- **类型**: 功能

### TC-020: Agent 执行中状态变更
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 先查询 `/api/agent/status`，记录初始状态
  2. 发起一个 Agent 执行请求（POST `/api/agent/execute`）
  3. 在执行过程中再次查询 `/api/agent/status`
  4. 等待执行完成后再次查询
- **预期结果**:
  - 执行前: 目标 Agent status = `'idle'`
  - 执行中: 目标 Agent status = `'busy'`, `currentTask` 有值
  - 执行后: 目标 Agent status = `'idle'`, `lastActivity` 已更新
- **优先级**: P1
- **类型**: 功能

### TC-021: status 响应字段类型验证
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. GET `/api/agent/status`
  2. 验证每个 Agent 的字段类型
- **预期结果**:
  - `id`: string
  - `name`: string
  - `status`: `'idle'` | `'busy'` | `'offline'`
  - `toolCallCount`: number (>= 0)
  - `currentTask`: string | undefined
  - `lastActivity`: string (ISO 时间) | undefined
- **优先级**: P1
- **类型**: 边界

---

## 5. GET /api/agent/events SSE 推送测试用例

### TC-022: SSE 连接建立
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 GET 请求到 `/api/agent/events`
  2. 检查响应头
- **预期结果**:
  - 返回 200 状态码
  - Content-Type: `text/event-stream`
  - Cache-Control: `no-cache`
  - Connection: `keep-alive`
- **优先级**: P0
- **类型**: 功能

### TC-023: SSE 事件推送 — Agent 启动事件
- **前置条件**: SSE 连接已建立
- **测试步骤**:
  1. 建立 SSE 连接到 `/api/agent/events`
  2. 在另一个请求中触发 Agent 执行（POST `/api/agent/execute`）
  3. 监听 SSE 流中的事件
- **预期结果**: 收到 `type: 'agent:start'` 事件，包含 `agentId` 和启动信息
- **优先级**: P0
- **类型**: 功能

### TC-024: SSE 事件推送 — Agent 完成事件
- **前置条件**: SSE 连接已建立，Agent 执行已触发
- **测试步骤**:
  1. 等待 Agent 执行完成
  2. 监听 SSE 流
- **预期结果**: 收到 `type: 'agent:done'` 事件，包含 `agentId`
- **优先级**: P0
- **类型**: 功能

### TC-025: SSE since 参数过滤
- **前置条件**: 有历史事件存在
- **测试步骤**:
  1. 记录当前时间戳 T
  2. 触发一次 Agent 执行并等待完成
  3. 发送 GET `/api/agent/events?since=T`
- **预期结果**: 仅返回时间戳 > T 的事件，不返回更早的事件
- **优先级**: P1
- **类型**: 功能

---

## 6. CEO 调度子 Agent 测试用例

### TC-026: CEO 调度 XHS Agent
- **前置条件**: CEO Agent 和 XHS Agent 均已注册
- **测试步骤**:
  1. 通过 executor 以 supervisor 模式执行: `"写一篇关于AI工具的小红书笔记"`
  2. 监听事件流
- **预期结果**:
  - 事件流中出现 CEO 调度 xhs-agent 的 `sub_agent_start` 事件
  - XHS Agent 产出内容（text 事件）
  - XHS Agent 完成后 CEO 汇总结果
  - 最终输出包含小红书笔记格式的内容（标题、正文、标签）
- **优先级**: P0
- **类型**: 功能

### TC-027: CEO 调度 Analyst Agent
- **前置条件**: CEO Agent 和 Analyst Agent 均已注册
- **测试步骤**:
  1. 以 supervisor 模式执行: `"分析上周小红书内容表现"`
  2. 监听事件流
- **预期结果**:
  - 事件流中出现 CEO 调度 analyst-agent 的事件
  - Analyst Agent 执行数据分析
  - CEO 汇总分析结果
- **优先级**: P0
- **类型**: 功能

### TC-028: CEO 调度 Podcast Agent
- **前置条件**: CEO Agent 和 Podcast Agent 均已注册
- **测试步骤**:
  1. 以 supervisor 模式执行: `"帮我做一期关于Claude Agent SDK的播客"`
  2. 监听事件流
- **预期结果**:
  - 事件流中出现 CEO 调度 podcast-agent 的事件
  - Podcast Agent 生成播客脚本
  - CEO 汇总结果，输出包含脚本内容
- **优先级**: P0
- **类型**: 功能

### TC-029: CEO 多 Agent 串行调度
- **前置条件**: 所有 P0 Agent 已注册
- **测试步骤**:
  1. 以 supervisor 模式执行: `"帮我写一篇小红书笔记，需要先做选题研究"`
  2. 监听事件流中的调度顺序
- **预期结果**:
  - CEO 先调度 growth-agent 做选题研究
  - 基于选题结果再调度 xhs-agent 创作
  - 可能调度 brand-reviewer 审查
  - 调度顺序符合标准工作流逻辑
- **优先级**: P1
- **类型**: 功能

### TC-030: CEO 调度结果汇总
- **前置条件**: Agent 执行完成
- **测试步骤**:
  1. 完成一次完整的 supervisor 模式执行
  2. 检查最终 `type: 'done'` 前的文本输出
- **预期结果**: CEO 输出执行摘要，包含：完成的任务、产出物列表、质量评估
- **优先级**: P1
- **类型**: 功能

---

## 7. SDK 适配层 (executor) 测试用例

### TC-031: executeAgent 函数签名验证
- **前置条件**: executor 模块可导入
- **测试步骤**:
  1. 导入 `executeAgent` 函数
  2. 验证其为 AsyncGenerator 函数
  3. 验证接受参数: `(agentName: string, userMessage: string, context?: Record<string, unknown>)`
- **预期结果**: 函数存在且类型签名正确
- **优先级**: P0
- **类型**: 功能

### TC-032: executeAgent 事件流格式
- **前置条件**: executor 可运行
- **测试步骤**:
  1. 调用 `executeAgent('xhs-agent', '测试任务')`
  2. 使用 `for await` 遍历产出的事件
  3. 验证每个事件的结构
- **预期结果**: 每个事件都符合 `AgentStreamEvent` 类型定义，包含 `type` 和相关数据
- **优先级**: P0
- **类型**: 功能

### TC-033: executeAgent 事件发射到 EventBus
- **前置条件**: EventBus 可监听
- **测试步骤**:
  1. 订阅 EventBus 的事件
  2. 调用 `executeAgent` 执行一个任务
  3. 检查 EventBus 是否收到 `agent:start` 和 `agent:done` 事件
- **预期结果**: EventBus 依次收到 `agent:start` → 中间事件 → `agent:done`
- **优先级**: P0
- **类型**: 功能

---

## 8. Podcast Agent 测试用例

### TC-034: Podcast Agent 注册验证
- **前置条件**: Registry 初始化完成
- **测试步骤**:
  1. 调用 `registry.get('podcast-agent')`
  2. 验证返回的定义
- **预期结果**:
  - `id`: `'podcast-agent'`
  - `name`: `'播客制作专家'`
  - `level`: `'specialist'`
  - `tools` 包含 `'Read'`, `'Write'`, `'Bash'`
  - `maxTurns`: 8
- **优先级**: P0
- **类型**: 功能

### TC-035: Podcast Agent 独立运行
- **前置条件**: `engine/agents/podcast-agent.ts` 存在
- **测试步骤**:
  1. 通过 CLI 运行: `npx tsx engine/agents/podcast-agent.ts "做一期关于AI编程的播客脚本"`
  2. 检查输出
- **预期结果**:
  - 进程正常启动，不报错
  - 输出包含播客脚本内容（双人对话格式）
  - 进程正常退出（exit code 0）
- **优先级**: P0
- **类型**: 功能

### TC-036: Podcast Agent SKILL.md 加载
- **前置条件**: `engine/skills/podcast.SKILL.md` 文件存在
- **测试步骤**:
  1. 确认 `engine/skills/podcast.SKILL.md` 存在
  2. 运行 Podcast Agent 并检查其行为是否遵循 SKILL.md 定义的 SOP
- **预期结果**: Podcast Agent 按照 SOP 生成脚本（双人对话格式、符合时长要求等）
- **优先级**: P1
- **类型**: 功能

---

## 9. npm workspace 集成测试用例

### TC-037: workspace 依赖配置
- **前置条件**: 项目根目录存在 `pnpm-workspace.yaml`
- **测试步骤**:
  1. 检查 `pnpm-workspace.yaml` 包含 `web` 和 `engine`
  2. 检查 `web/package.json` 的 dependencies 包含 `"marketing-agent-os-engine": "workspace:*"`
  3. 运行 `pnpm install` 验证依赖解析成功
- **预期结果**: workspace 配置正确，依赖安装无报错
- **优先级**: P0
- **类型**: 功能

### TC-038: web/ 导入 engine/ 模块
- **前置条件**: workspace 依赖已安装
- **测试步骤**:
  1. 在 web/ 的代码中尝试导入: `import { AgentRegistry } from 'marketing-agent-os-engine/agents/registry'`
  2. 验证导入成功，类型推断正确
- **预期结果**: 导入成功，TypeScript 类型正确识别
- **优先级**: P0
- **类型**: 功能

---

## 10. 回归测试用例

### TC-039: 现有 API 端点可用性
- **前置条件**: 开发服务器运行在 localhost:3002
- **测试步骤**:
  1. GET `/api/contents` — 验证返回 200
  2. GET `/api/campaigns` — 验证返回 200
  3. GET `/api/metrics` — 验证返回 200
  4. GET `/api/tasks` — 验证返回 200
  5. POST `/api/openclaw` — 验证端点可达（可能需要参数）
- **预期结果**: 所有现有 API 端点正常响应，未被新代码破坏
- **优先级**: P0
- **类型**: 回归

### TC-040: 构建通过验证
- **前置条件**: 所有 Phase 1 代码已合并
- **测试步骤**:
  1. 在 web/ 目录执行 `pnpm run build`
  2. 在 engine/ 目录执行 TypeScript 类型检查
- **预期结果**:
  - `pnpm run build` 成功，无报错
  - TypeScript 类型检查通过
- **优先级**: P0
- **类型**: 回归

### TC-041: Lint 通过验证
- **前置条件**: 所有 Phase 1 代码已合并
- **测试步骤**:
  1. 在 web/ 目录执行 `pnpm run lint`
- **预期结果**: lint 通过，无 error（warning 可接受）
- **优先级**: P0
- **类型**: 回归

### TC-042: 现有 Agent 功能不受影响
- **前置条件**: engine/ 已有 Agent（CEO、XHS、Analyst）
- **测试步骤**:
  1. 独立运行 XHS Agent: `npx tsx engine/agents/xhs-agent.ts "测试笔记"`
  2. 独立运行 Analyst Agent: `npx tsx engine/agents/analyst-agent.ts "分析数据"`
  3. 独立运行 CEO Agent: `npx tsx engine/agents/ceo.ts "帮我写笔记"`
- **预期结果**: 三个已有 Agent 均能正常启动和执行，输出格式与改造前一致
- **优先级**: P0
- **类型**: 回归

### TC-043: Team Studio 页面可访问
- **前置条件**: 开发服务器运行中
- **测试步骤**:
  1. 浏览器访问 `http://localhost:3002/team-studio`（或对应路径）
  2. 验证页面正常渲染
- **预期结果**: 页面正常加载，无白屏或报错
- **优先级**: P0
- **类型**: 回归

---

## 11. 边界与异常测试用例

### TC-044: 超长 message 输入
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 构造 10000 字符的 message
  2. 发送 POST `/api/agent/execute`
- **预期结果**: 正常处理或返回合理的 413/400 错误，不崩溃
- **优先级**: P2
- **类型**: 边界

### TC-045: 并发执行请求
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 同时发送 3 个 POST `/api/agent/execute` 请求（不同 Agent）
  2. 分别监听各自的 SSE 流
- **预期结果**: 三个请求独立执行，互不干扰，各自正常返回结果
- **优先级**: P1
- **类型**: 性能

### TC-046: SSE 客户端断开连接
- **前置条件**: SSE 连接已建立
- **测试步骤**:
  1. 建立 SSE 连接到 `/api/agent/events`
  2. 主动断开客户端连接
  3. 检查服务端是否正确清理资源
- **预期结果**: 服务端无内存泄漏，无未捕获的异常
- **优先级**: P1
- **类型**: 异常

### TC-047: 无效 JSON 请求体
- **前置条件**: API 服务运行中
- **测试步骤**:
  1. 发送 POST `/api/agent/execute`，Body 为非 JSON 字符串
- **预期结果**: 返回 400 状态码，提示 JSON 解析错误
- **优先级**: P1
- **类型**: 异常

---

## 12. 测试优先级汇总

| 优先级 | 用例数 | 说明 |
|--------|--------|------|
| P0 | 24 | 核心功能 + 基本错误处理，必须全部通过 |
| P1 | 17 | 次要功能 + 边界情况，应通过 |
| P2 | 2 | 极端边界，可延后 |
| **总计** | **43** | |

### P0 必过清单

| 用例ID | 描述 |
|--------|------|
| TC-001 | Registry 单例模式 |
| TC-002 | 默认 Agent 注册 |
| TC-003 | 按 ID 查询 Agent |
| TC-006 | AgentDefinition 字段完整性 |
| TC-007 | buildDirectConfig 构建 SDK 配置 |
| TC-008 | buildDirectConfig 处理不存在的 Agent |
| TC-009 | buildSupervisorConfig 构建 CEO 调度配置 |
| TC-010 | POST /api/agent/execute — direct 模式 |
| TC-011 | POST /api/agent/execute — supervisor 模式 |
| TC-012 | 请求参数缺失 — 缺少 agent |
| TC-013 | 请求参数缺失 — 缺少 message |
| TC-014 | 无效 Agent ID |
| TC-016 | SSE 事件格式验证 |
| TC-019 | 查询所有 Agent 状态 |
| TC-022 | SSE 连接建立 |
| TC-023 | SSE 事件推送 — Agent 启动 |
| TC-024 | SSE 事件推送 — Agent 完成 |
| TC-026 | CEO 调度 XHS Agent |
| TC-027 | CEO 调度 Analyst Agent |
| TC-028 | CEO 调度 Podcast Agent |
| TC-031 | executeAgent 函数签名验证 |
| TC-032 | executeAgent 事件流格式 |
| TC-033 | executeAgent 事件发射到 EventBus |
| TC-034 | Podcast Agent 注册验证 |
| TC-035 | Podcast Agent 独立运行 |
| TC-037 | workspace 依赖配置 |
| TC-038 | web/ 导入 engine/ 模块 |
| TC-039 | 现有 API 端点可用性 |
| TC-040 | 构建通过验证 |
| TC-041 | Lint 通过验证 |
| TC-042 | 现有 Agent 功能不受影响 |
| TC-043 | Team Studio 页面可访问 |

---

## 13. 测试执行计划

### Phase 1 代码提交后立即执行:

1. **第一轮 — 冒烟测试**（快速验证核心路径）
   - TC-040 构建验证
   - TC-041 Lint 验证
   - TC-037 workspace 配置
   - TC-002 默认 Agent 注册
   - TC-039 现有 API 可用性

2. **第二轮 — 单元测试**（Registry + 类型验证）
   - TC-001 ~ TC-009

3. **第三轮 — 集成测试**（API 端点 + SSE 流）
   - TC-010 ~ TC-025

4. **第四轮 — CEO 调度测试**（Supervisor 模式）
   - TC-026 ~ TC-030

5. **第五轮 — 回归测试**（现有功能验证）
   - TC-039 ~ TC-043

6. **第六轮 — 边界与异常**（鲁棒性）
   - TC-044 ~ TC-047
