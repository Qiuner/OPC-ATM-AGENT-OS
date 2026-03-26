# @DEV — Electron 迁移技术预研

> 完成时间：2026-03-26
> 参与人员：@DEV（技术架构师 & 高级开发工程师）
> 状态：预研完成，等待 Task #1（Researcher 脚手架调研）结果后进入实施

---

## 1. 现有架构分析

### 1.1 Web 端整体架构

```
web/
├── src/app/           # Next.js App Router 页面 + API Routes
│   ├── api/           # 36 个 API 端点（HTTP REST + SSE）
│   ├── (dashboard)/   # Dashboard 页面
│   ├── tasks/         # Task Board
│   ├── contents/      # Content Review
│   ├── approvals/     # Approval Center
│   ├── context/       # Context Assets
│   ├── settings/      # Settings
│   └── team-studio/   # Team Studio
├── src/lib/
│   ├── store/         # JSON 文件 CRUD（fs + process.cwd()）
│   ├── agent-sdk/     # Agent 执行器（executor + event-bus + roundtable + team-executor）
│   ├── agents/        # Legacy Agent 实现（orchestrator, analyst, learning-store）
│   └── llm/           # LLM provider 抽象
├── src/data/          # JSON 数据文件（tasks/contents/approvals/metrics/...）
└── src/types/         # TypeScript 类型定义
```

### 1.2 Engine 架构

```
engine/
├── agents/
│   ├── registry.ts    # AgentRegistry 单例 — 14 个 Agent 注册
│   ├── ceo.ts         # CEO Agent 入口（CLI + SDK query()）
│   ├── types.ts       # Agent 类型定义
│   └── *.ts           # 各专业 Agent 实现
├── skills/            # SKILL.md 文件（Agent SOP）
├── memory/            # 文件系统记忆（品牌/受众/胜出模式）
└── mcps/              # MCP 工具服务
```

### 1.3 数据流

```
用户操作 → fetch(/api/xxx) → API Route Handler → lib/store/xxx.ts → fs.readFileSync/writeFileSync → src/data/*.json
                                                                   ↘ lib/agent-sdk/executor.ts → Claude Agent SDK → SSE 流
```

---

## 2. API Routes 完整清单与迁移映射

共计 **36 个 API 端点**，按优先级分类：

### 2.1 核心 CRUD — P0（必须迁移）

| # | Web API Route | HTTP Method | 对应 IPC Channel（提议） | 说明 |
|---|---------------|-------------|--------------------------|------|
| 1 | `/api/tasks` | GET | `store:tasks:list` | 列表 + 过滤（status, campaign_id） |
| 2 | `/api/tasks` | POST | `store:tasks:create` | 创建任务 |
| 3 | `/api/tasks/[id]` | GET | `store:tasks:get` | 获取单条 |
| 4 | `/api/tasks/[id]` | PUT | `store:tasks:update` | 更新任务 |
| 5 | `/api/tasks/[id]` | DELETE | `store:tasks:delete` | 删除任务 |
| 6 | `/api/contents` | GET | `store:contents:list` | 列表 + 过滤 |
| 7 | `/api/contents` | POST | `store:contents:create` | 创建内容 |
| 8 | `/api/contents/[id]` | GET | `store:contents:get` | 获取单条 |
| 9 | `/api/contents/[id]` | PUT | `store:contents:update` | 更新内容 |
| 10 | `/api/contents/[id]` | DELETE | `store:contents:delete` | 删除 + 关联审批 |
| 11 | `/api/approvals` | GET | `store:approvals:list` | 列表 + 过滤 |
| 12 | `/api/approvals` | POST | `store:approvals:create` | 创建审批记录 |
| 13 | `/api/context` | GET | `store:context:list` | 上下文资产列表 |
| 14 | `/api/context` | POST | `store:context:create` | 创建上下文资产 |
| 15 | `/api/context/[id]` | GET | `store:context:get` | 获取单条 |
| 16 | `/api/context/[id]` | PUT | `store:context:update` | 更新 |
| 17 | `/api/context/[id]` | DELETE | `store:context:delete` | 删除 |
| 18 | `/api/metrics` | GET | `store:metrics:list` | 数据指标列表 |
| 19 | `/api/metrics` | POST | `store:metrics:create` | 创建指标（含 Learning 闭环） |
| 20 | `/api/settings` | GET | `store:settings:get` | 读取设置 |
| 21 | `/api/settings` | PUT | `store:settings:update` | 更新设置 |

### 2.2 Agent 执行 — P0（SSE → IPC 事件）

| # | Web API Route | HTTP Method | 对应 IPC Channel | 说明 |
|---|---------------|-------------|-------------------|------|
| 22 | `/api/agent/execute` | POST (SSE) | `agent:execute` | Agent 流式执行（核心） |
| 23 | `/api/agent/events` | GET (SSE) | `agent:event` | EventBus 实时推送 |
| 24 | `/api/agent/status` | GET | `agent:status` | Agent 状态查询 |
| 25 | `/api/agent/save-result` | POST | `agent:save-result` | 保存执行结果 |
| 26 | `/api/agent/roundtable` | POST (SSE) | `agent:roundtable` | 共创圆桌（多 Agent 讨论） |
| 27 | `/api/team/execute` | POST (SSE) | `agent:team:execute` | Claude Code Team 模式 |

### 2.3 配置 — P0

| # | Web API Route | HTTP Method | 对应 IPC Channel | 说明 |
|---|---------------|-------------|-------------------|------|
| 28 | `/api/config` | GET | `config:get` | 读取配置（mode/provider/features） |
| 29 | `/api/config` | POST | `config:set` | 写入配置（含 API Keys） |

### 2.4 Skills 文件管理 — P1

| # | Web API Route | HTTP Method | 对应 IPC Channel | 说明 |
|---|---------------|-------------|-------------------|------|
| 30 | `/api/skills/custom` | GET | `fs:skills:list` | 列出自定义 Skill 文件 |
| 31 | `/api/skills/custom` | POST | `fs:skills:create` | 创建/更新 Skill |
| 32 | `/api/skills/custom` | DELETE | `fs:skills:delete` | 删除 Skill |

### 2.5 Legacy/特殊 — P2（按需迁移）

| # | Web API Route | HTTP Method | 说明 |
|---|---------------|-------------|------|
| 33 | `/api/agents` | GET/POST | Legacy 工作流模式（Strategist → Writer → Publisher） |
| 34 | `/api/learnings` | GET/POST | 学习记录 CRUD |
| 35 | `/api/learnings/analyze` | POST | 飞轮分析触发 |
| 36 | `/api/analytics/report` | POST | 数据分析报告 |
| 37 | `/api/contents/[id]/approve` | POST | 快捷审批 |
| 38 | `/api/contents/[id]/reject` | POST | 快捷拒绝 |
| 39-44 | `/api/openclaw/*` | GET/POST | OpenClaw 集成（6 个端点） |
| 45 | `/api/agent-chat/[...path]` | * | Agent Chat 代理 |
| 46 | `/api/context/scrape` | POST | 网页抓取 |
| 47 | `/api/team-studio` | GET | Team Studio 数据 |

---

## 3. IPC Channel 设计规范

### 3.1 命名约定

```
domain:entity:action
```

| Domain | 用途 | 示例 |
|--------|------|------|
| `store` | JSON 数据 CRUD | `store:tasks:list` |
| `agent` | Agent 执行与状态 | `agent:execute` |
| `config` | 系统配置 | `config:get` |
| `secure` | 敏感信息存储 | `secure:keys:set` |
| `fs` | 文件系统操作 | `fs:skills:list` |

### 3.2 通信模式

**请求-响应模式**（大部分 CRUD）：
```
renderer → ipcRenderer.invoke(channel, ...args)  →  main
renderer ← Promise<IpcResponse<T>>                ←  main (ipcMain.handle)
```

**推送模式**（SSE 替代方案）：
```
main → webContents.send(channel, data) → renderer
renderer 通过 ipcRenderer.on(channel, handler) 监听
preload 暴露 onXxx(callback): () => void 注册/取消监听
```

### 3.3 统一响应格式

```typescript
interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
```

---

## 4. SSE → IPC 事件迁移方案

### 4.1 现有 SSE 流模式

Web 端有 4 个 SSE 端点：
1. `/api/agent/execute` — Agent 执行流（text/tool_call/tool_result/sub_agent/done/error）
2. `/api/agent/events` — EventBus 全局事件推送
3. `/api/agent/roundtable` — 圆桌讨论流
4. `/api/team/execute` — Team 模式执行流

当前实现模式：
```
ReadableStream → SSE text/event-stream → EventSource（client）
```

### 4.2 Electron IPC 替代方案

```
Agent 执行 (main process)
  ↓ for await ... executeAgent()
  ↓ webContents.send('agent:stream:chunk', event)
  → renderer 通过 preload 的 onStreamChunk(callback) 接收

Agent 执行完毕
  ↓ webContents.send('agent:stream:end')
  → renderer 清理监听器

EventBus 全局事件
  ↓ eventBus.on('*', handler)
  ↓ webContents.send('agent:event', agentEvent)
  → renderer 通过 preload 的 onEvent(callback) 接收
```

### 4.3 关键注意事项

- IPC 序列化：Electron IPC 使用 Structured Clone Algorithm，支持大部分 JS 类型，但不支持 Function、Error 等
- 背压控制：SSE 有自然的 TCP 背压，IPC 推送需要考虑 renderer 处理能力
- 连接管理：SSE 连接可能断开重连，IPC 在窗口存活期间始终可用
- 并发隔离：每个 BrowserWindow 有独立的 webContents，多窗口场景需要广播

---

## 5. 数据存储迁移方案

### 5.1 当前存储方式

```
web/src/data/*.json  ← fs.readFileSync/writeFileSync (process.cwd() 相对路径)
```

问题：
- 依赖 Next.js 的 `process.cwd()` 指向项目根目录
- 数据文件在源码目录中，不适合桌面端分发
- 无持久化保障（开发时 HMR 可能覆盖）

### 5.2 Electron 端方案（三层存储）

| 层级 | 技术 | 用途 | 安全性 |
|------|------|------|--------|
| Collection Data | JSON files → `app.getPath('userData')/data/` | Tasks, Contents, Approvals 等业务数据 | 明文，本地文件 |
| App Settings | `electron-store` | 窗口状态、AI 模式、审批设置、UI 偏好 | 明文，本地文件 |
| Sensitive Keys | `safeStorage` + `electron-store` | API Keys | OS Keychain 加密 |

**初始化策略**：首次启动时从 `web/src/data/` 拷贝种子数据到 userData 目录。

### 5.3 SQLite 评估

**结论：当前阶段不引入 SQLite (better-sqlite3)**

理由：
- 数据量在百级以内，JSON 读写性能足够
- 无复杂查询需求（JOIN/聚合/全文搜索）
- better-sqlite3 是 native module，增加跨平台编译和打包复杂度
- 推荐时机：单集合超过 1000 条，或需要全文搜索/复杂关联时

---

## 6. 前端框架迁移关键点

### 6.1 路由迁移

```
Next.js App Router → react-router-dom (HashRouter)
```

- 使用 `HashRouter` 而非 `BrowserRouter`，因为 Electron 使用 `file://` 协议
- `next/link` → `react-router-dom/Link`
- `useRouter` / `usePathname` → `useNavigate` / `useLocation`

### 6.2 依赖替换清单

| Next.js 依赖 | 替代方案 |
|--------------|---------|
| `next/link` | `react-router-dom/Link` |
| `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) | `react-router-dom` 对应 hooks |
| `next/font/google` | CDN `<link>` 或 本地字体文件 |
| `next-themes` | 手动实现（硬编码 dark theme 或 CSS class 切换） |
| `next/image` | 标准 `<img>` 标签 |
| `next/server` (`NextRequest`, `NextResponse`) | 不需要（IPC 直接返回对象） |

### 6.3 shadcn/ui 迁移

shadcn/ui 组件本质是纯 React 代码，不依赖 Next.js，可直接复制使用。注意事项：
- `shadcn/tailwind.css` 中的自定义 variant 和动画需要手动内联到 `globals.css`
- 部分组件依赖 `next-themes` 的 `useTheme()`，需要替换
- Tailwind CSS 4 使用 `@tailwindcss/vite` 插件（非 PostCSS）

### 6.4 数据获取模式

```
Web:   fetch('/api/xxx') → JSON → useState
Electron: window.api.xxx.list() → IPC → useState
```

封装 hooks：
```typescript
// useStore.ts
export function useTasks(filter?: TaskFilter) {
  const [data, setData] = useState<Task[]>([])
  useEffect(() => {
    window.api.tasks.list(filter).then(res => {
      if (res.success) setData(res.data)
    })
  }, [filter])
  return data
}
```

---

## 7. Agent 执行层迁移考量

### 7.1 核心问题

`web/src/lib/agent-sdk/executor.ts` 使用 `@anthropic-ai/claude-agent-sdk` 的 `query()` 函数，这是 Node.js 端代码。在 Electron 中应运行在 **main process**。

### 7.2 迁移路径

```
Web:     API Route (server) → executor.ts → query() → SSE → Client
Electron: Main Process → executor.ts → query() → IPC push → Renderer
```

Main process 中：
1. 接收 `agent:execute` IPC 请求
2. 调用 `executeAgent()` async generator
3. 每个 yield 的事件通过 `webContents.send('agent:stream:chunk', event)` 推送
4. 完成后发送 `agent:stream:end`
5. 自动保存结果到本地 store

### 7.3 Engine 集成

Engine 包通过 `marketing-agent-os-engine/agents/registry` 导入。在 Electron main process 中：
- 确保 engine/ 在 pnpm workspace 中注册
- 动态 import 避免启动阻塞：`const { AgentRegistry } = await import(...)`
- MCP Server 子进程需确认 Electron 打包后路径正确

---

## 8. 构建工具选型预判

### 8.1 候选方案

| 工具 | 优势 | 劣势 |
|------|------|------|
| **electron-vite** | 专为 Electron 设计，main/preload/renderer 三进程分离构建，原生支持 HMR | 社区相对小 |
| **electron-forge** | Electron 官方推荐，完善的打包/分发/签名 | 配置复杂，Vite 集成需额外配置 |
| **electron-builder** | 成熟的打包方案，跨平台支持好 | 仅打包工具，需搭配 Vite/Webpack |

**初步倾向：electron-vite（开发） + electron-builder（打包分发）**

等 Researcher 的调研报告确认最终选型。

### 8.2 项目结构预判

```
desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App 入口、窗口创建
│   │   ├── ipc-handlers.ts  # 所有 IPC handlers 注册
│   │   ├── store.ts    # JSON 文件读写（userData 目录）
│   │   ├── app-store.ts     # electron-store 设置管理
│   │   └── safe-storage.ts  # Keychain API Keys 存储
│   ├── preload/        # Preload 脚本
│   │   └── index.ts    # contextBridge 暴露 window.api
│   ├── renderer/       # React 前端（从 web/ 迁移）
│   │   ├── app.tsx     # 路由定义
│   │   ├── pages/      # 页面组件
│   │   ├── components/ # UI 组件
│   │   └── hooks/      # IPC 数据 hooks
│   └── shared/         # main/preload/renderer 共享类型
│       ├── ipc-channels.ts  # Channel 常量
│       └── ipc-types.ts     # 响应类型定义
├── electron.vite.config.ts
├── package.json
└── tsconfig.*.json
```

---

## 9. 风险评估与应对

| 风险 | 影响 | 应对方案 |
|------|------|---------|
| Native module（better-sqlite3）跨平台编译 | 打包失败 | 暂不引入，用 JSON 文件 |
| Claude Agent SDK 在 Electron main 中运行兼容性 | Agent 执行失败 | 先做 PoC 验证，fallback 到子进程 |
| MCP Server 子进程路径问题 | 打包后找不到 MCP 服务 | 使用 `app.getAppPath()` + 相对路径 |
| Tailwind CSS 4 + Vite 在 Electron renderer 中 HMR | 样式不更新 | 使用 `@tailwindcss/vite` 插件 |
| shadcn/ui 组件依赖 Next.js 特性 | 组件渲染异常 | 逐个排查，替换 Next.js 相关导入 |
| 打包体积过大（Electron + Node modules） | 安装包 > 200MB | 使用 asar 归档 + 排除开发依赖 |
| API Keys 安全存储跨平台兼容 | 加密不可用 | safeStorage fallback 到明文 + 警告 |

---

## 10. 工作量估算

| 任务 | 预估工作内容 | 文件数 |
|------|-------------|--------|
| Task #3: 骨架搭建 | electron-vite 初始化、React 路由迁移、Tailwind/shadcn 配置、HMR 验证 | ~15 |
| Task #4: IPC 通信层 | 30+ IPC channel 定义、handlers 实现、preload API、renderer hooks、SSE→IPC 事件 | ~8 |
| Task #5: 数据存储 | electron-store 设置、JSON 文件迁移、Keychain API Keys、种子数据初始化 | ~5 |
| 后续: 页面逐个迁移 | Dashboard/Tasks/Contents/Approvals/Context/Settings/TeamStudio | ~20+ |
| 后续: Agent 执行集成 | executor 迁移到 main process、stream 事件推送、结果保存 | ~5 |

---

## 11. 待 Researcher 调研确认的问题

1. **electron-vite vs electron-forge**：哪个更适合本项目（React 19 + Tailwind CSS 4 + pnpm workspace）？
2. **Electron 版本选择**：最新稳定版还是 LTS？对 Node.js 版本要求？
3. **自动更新方案**：electron-updater 还是 Squirrel？是否影响骨架设计？
4. **代码签名**：macOS notarization + Windows code signing 的流程和成本？
5. **打包体积优化**：有哪些最佳实践可以减小分发包大小？
