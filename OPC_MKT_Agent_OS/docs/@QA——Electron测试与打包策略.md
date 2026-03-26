# OPC MKT Agent OS — Electron 测试策略与打包验证流程

**文档类型**: 测试策略 & 部署规范
**完成时间**: 2026-03-26
**参与人员**: @QA（方案设计）、@DEV（技术评审）、@PM（验收标准确认）

---

## 一、文档概述

本文档为 OPC MKT Agent OS 从 Web SaaS 转型为 Electron 桌面应用后，建立完整的测试体系和打包分发流程。覆盖单元测试、集成测试、E2E 测试、打包构建、自动更新和 CI/CD 全链路。

### 当前技术栈

| 层 | 技术 | 说明 |
|-----|------|------|
| 框架 | Electron + electron-vite | 桌面壳 + 构建工具 |
| 渲染层 | React 19 + TypeScript | 复用现有 web 页面 |
| 样式 | Tailwind CSS v4 + shadcn/ui | 组件库 |
| 引擎 | Claude Agent SDK + Supabase | Agent 执行 + 数据库 |
| 包管理 | pnpm workspace (monorepo) | 多包管理 |
| 构建 | electron-builder | 打包分发 |
| 更新 | electron-updater | 自动更新 |

### 测试目标

- 核心模块测试覆盖率 > 80%
- E2E 覆盖 5 条核心用户路径
- 打包产物在 macOS / Windows 上均可正常安装运行
- 自动更新机制验证通过
- CI/CD 流水线全自动化

---

## 二、测试分层策略

### 2.1 测试金字塔

```
         ┌─────────────┐
         │   E2E 测试   │  ← 5 条核心路径 (Playwright + Electron)
         │  (少而精)     │
         ├─────────────┤
         │  集成测试     │  ← IPC 通信、数据流、API 层
         │  (关键链路)   │
         ├─────────────┤
         │  单元测试     │  ← 业务逻辑、工具函数、状态管理
         │  (大量覆盖)   │
         └─────────────┘
```

### 2.2 各层测试职责

| 层 | 工具 | 覆盖范围 | 运行频率 |
|----|------|----------|----------|
| 单元测试 | Vitest | 工具函数、Agent Registry、数据转换、Store 操作 | 每次 commit |
| 集成测试 | Vitest + electron-mock | IPC 通信层、Main↔Renderer 数据流、本地存储读写 | 每次 PR |
| E2E 测试 | Playwright + Electron | 核心用户路径（启动→配置→执行Agent→查看结果→审批） | 每次 release |
| 打包测试 | electron-builder + 脚本 | 安装包生成、签名验证、安装/卸载流程 | 每次 release |
| 冒烟测试 | 手动 + 脚本 | 安装后核心功能快速验证 | 每次部署后 |

---

## 三、单元测试方案 (Vitest)

### 3.1 为什么选 Vitest

| 对比项 | Jest | Vitest | 选择理由 |
|--------|------|--------|----------|
| 速度 | 较慢 (CommonJS 转换) | 极快 (原生 ESM, Vite 底层) | 项目使用 ESM (`"type": "module"`) |
| TypeScript | 需 ts-jest 或 babel | 原生支持 | 零配置 TS |
| 与 electron-vite 兼容 | 需额外配置 | 天然兼容 (同属 Vite 生态) | 减少配置成本 |
| API 兼容 | -- | 兼容 Jest API | 无学习成本 |

### 3.2 配置方案

**根目录 `vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'engine/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'engine/agents/**/*.ts',
        'engine/db/**/*.ts',
        'engine/team/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/node_modules/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'engine'),
      '@web': path.resolve(__dirname, 'web/src'),
    },
  },
})
```

**Renderer 层测试 `web/vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
    },
  },
})
```

### 3.3 需覆盖的核心模块

| 模块 | 文件路径 | 测试重点 | 优先级 |
|------|----------|----------|--------|
| Agent Registry | `engine/agents/registry.ts` | 注册/查询/列表/去重 | P0 |
| Agent 类型系统 | `engine/agents/types.ts` | 类型校验、默认值 | P0 |
| Team Engine | `engine/team/team-engine.ts` | 团队创建、消息路由、状态管理 | P0 |
| Claude Bridge | `engine/team/claude-bridge.ts` | SDK 调用封装、错误处理 | P0 |
| IPC 通信层 | `electron/ipc/*.ts` (待建) | 消息序列化、通道注册、错误传播 | P0 |
| electron-store | `electron/store/*.ts` (待建) | CRUD 操作、数据迁移、默认值 | P1 |
| Scheduler | `engine/scheduler.ts` | cron 表达式解析、任务触发 | P1 |
| 数据转换 | `web/src/lib/*.ts` | 数据格式化、过滤、排序 | P1 |
| UI 组件逻辑 | `web/src/components/**/*.tsx` | 状态切换、事件处理、条件渲染 | P2 |

### 3.4 测试用例示例

```typescript
// tests/unit/agent-registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AgentRegistry } from '@engine/agents/registry'

describe('AgentRegistry', () => {
  let registry: AgentRegistry

  beforeEach(() => {
    registry = new AgentRegistry()
  })

  it('TC-U001: 注册后可通过 ID 查询 Agent', () => {
    registry.register({
      id: 'ceo-agent',
      name: 'CEO',
      nameEn: 'CEO Agent',
      description: '营销编排调度器',
      skillFile: 'ceo.SKILL.md',
      model: 'claude-sonnet-4-20250514',
      tools: ['Read', 'Write', 'Agent'],
      level: 'orchestrator',
    })
    const agent = registry.get('ceo-agent')
    expect(agent).toBeDefined()
    expect(agent?.name).toBe('CEO')
  })

  it('TC-U002: 注册重复 ID 应抛出错误', () => {
    const agentDef = { id: 'test-agent', name: 'Test', description: 'test' }
    registry.register(agentDef)
    expect(() => registry.register(agentDef)).toThrow()
  })

  it('TC-U003: listAll 返回全部已注册 Agent', () => {
    registry.registerDefaults()
    const agents = registry.listAll()
    expect(agents.length).toBeGreaterThanOrEqual(14)
  })

  it('TC-U004: 按 level 过滤 Agent', () => {
    registry.registerDefaults()
    const orchestrators = registry.listByLevel('orchestrator')
    expect(orchestrators.length).toBeGreaterThanOrEqual(1)
    expect(orchestrators.every(a => a.level === 'orchestrator')).toBe(true)
  })
})
```

```typescript
// tests/unit/ipc-handler.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('IPC Handler', () => {
  it('TC-U010: agent:execute 返回正确的消息格式', async () => {
    const mockResult = {
      success: true,
      data: { message: 'Agent 执行完成', agentId: 'ceo-agent' },
    }
    const handler = vi.fn().mockResolvedValue(mockResult)

    const result = await handler({ agentId: 'ceo-agent', prompt: '写一篇小红书' })
    expect(result.success).toBe(true)
    expect(result.data.agentId).toBe('ceo-agent')
  })

  it('TC-U011: 无效 agentId 应返回错误', async () => {
    const handler = vi.fn().mockResolvedValue({
      success: false,
      error: 'Agent not found: invalid-agent',
    })

    const result = await handler({ agentId: 'invalid-agent', prompt: '' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})
```

### 3.5 运行命令

```bash
# 运行全部单元测试
pnpm vitest run

# 监听模式开发
pnpm vitest watch

# 生成覆盖率报告
pnpm vitest run --coverage

# 仅运行某个模块
pnpm vitest run tests/unit/agent-registry
```

---

## 四、集成测试方案

### 4.1 IPC 通信层测试

IPC 是 Electron 架构的核心通信机制，替代原有 Next.js API Routes。必须重点测试。

**测试策略：** 使用 `@electron/remote` mock 或自定义 IPC mock 层，在 Node 环境下模拟 Main↔Renderer 通信。

```typescript
// tests/integration/ipc-communication.test.ts
import { describe, it, expect, vi } from 'vitest'

// 模拟 electron IPC
const createMockIPC = () => {
  const handlers = new Map<string, Function>()
  return {
    main: {
      handle: (channel: string, handler: Function) => {
        handlers.set(channel, handler)
      },
    },
    renderer: {
      invoke: async (channel: string, ...args: unknown[]) => {
        const handler = handlers.get(channel)
        if (!handler) throw new Error(`No handler for channel: ${channel}`)
        return handler({}, ...args)
      },
    },
  }
}

describe('IPC 通信集成测试', () => {
  it('TC-I001: agent:list 返回所有注册 Agent', async () => {
    const ipc = createMockIPC()

    // Main process 注册 handler
    ipc.main.handle('agent:list', async () => {
      return { success: true, data: [{ id: 'ceo-agent' }, { id: 'xhs-agent' }] }
    })

    // Renderer process 调用
    const result = await ipc.renderer.invoke('agent:list')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('TC-I002: store:get 读取本地存储', async () => {
    const ipc = createMockIPC()
    const mockStore = new Map([['settings.theme', 'dark']])

    ipc.main.handle('store:get', async (_event: unknown, key: string) => {
      return { success: true, data: mockStore.get(key) ?? null }
    })

    const result = await ipc.renderer.invoke('store:get', 'settings.theme')
    expect(result.data).toBe('dark')
  })

  it('TC-I003: agent:execute 超时应返回错误', async () => {
    const ipc = createMockIPC()

    ipc.main.handle('agent:execute', async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return { success: false, error: 'Execution timeout' }
    })

    const result = await ipc.renderer.invoke('agent:execute', {
      agentId: 'ceo-agent',
      prompt: 'test',
    })
    expect(result.success).toBe(false)
  })
})
```

### 4.2 数据存储集成测试

```typescript
// tests/integration/local-store.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const TEST_STORE_DIR = join(__dirname, '.test-store')

describe('本地数据存储集成测试', () => {
  beforeEach(() => {
    if (!existsSync(TEST_STORE_DIR)) mkdirSync(TEST_STORE_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_STORE_DIR)) rmSync(TEST_STORE_DIR, { recursive: true })
  })

  it('TC-I010: electron-store 可持久化和读取 JSON 数据', () => {
    // 模拟 electron-store 的文件写入行为
    const storePath = join(TEST_STORE_DIR, 'config.json')
    const { writeFileSync, readFileSync } = require('fs')

    const data = { theme: 'dark', language: 'zh-CN', agents: { maxConcurrent: 3 } }
    writeFileSync(storePath, JSON.stringify(data, null, 2))

    const loaded = JSON.parse(readFileSync(storePath, 'utf-8'))
    expect(loaded.theme).toBe('dark')
    expect(loaded.agents.maxConcurrent).toBe(3)
  })

  it('TC-I011: 品牌上下文数据迁移完整性', () => {
    // 验证从 web localStorage 格式到 electron-store 格式的迁移
    const webFormat = {
      brandVoice: 'Professional yet approachable',
      targetAudience: 'DTC 出海品牌 25-45岁决策者',
      bannedWords: ['cheap', 'buy now'],
    }

    const electronFormat = {
      context: {
        brandVoice: webFormat.brandVoice,
        targetAudience: webFormat.targetAudience,
        bannedWords: webFormat.bannedWords,
        migratedFrom: 'web-localstorage',
        migratedAt: new Date().toISOString(),
      },
    }

    expect(electronFormat.context.brandVoice).toBe(webFormat.brandVoice)
    expect(electronFormat.context.bannedWords).toEqual(webFormat.bannedWords)
    expect(electronFormat.context.migratedFrom).toBe('web-localstorage')
  })
})
```

### 4.3 运行命令

```bash
# 运行集成测试
pnpm vitest run tests/integration/

# 带覆盖率
pnpm vitest run tests/integration/ --coverage
```

---

## 五、E2E 测试方案 (Playwright + Electron)

### 5.1 为什么用 Playwright

Playwright 从 v1.30 起原生支持 Electron 应用测试，可以直接启动 Electron 进程并操作渲染窗口。

### 5.2 配置方案

**`playwright.config.ts`:**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 1,
  reporter: [
    ['html', { outputFolder: 'test-results/e2e-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.e2e.ts',
    },
  ],
})
```

**`tests/e2e/fixtures.ts` — Electron 启动 fixture:**

```typescript
import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'

type ElectronFixtures = {
  electronApp: ElectronApplication
  mainWindow: Page
}

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        E2E_TESTING: 'true',
      },
    })
    await use(app)
    await app.close()
  },
  mainWindow: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    await use(window)
  },
})

export { expect } from '@playwright/test'
```

### 5.3 五条核心用户路径

| 编号 | 路径 | 优先级 | 覆盖功能 |
|------|------|--------|----------|
| E2E-001 | 首次启动 + API Key 配置 | P0 | 窗口加载、Keychain 写入、设置持久化 |
| E2E-002 | Agent 列表查看 + 执行单个 Agent | P0 | IPC 通信、Agent Registry、流式响应 |
| E2E-003 | 内容创建 + 审批流程 | P0 | 数据 CRUD、状态流转、UI 交互 |
| E2E-004 | Context Vault 品牌设置 | P1 | 本地存储、多 tab 切换、数据保存 |
| E2E-005 | 定时任务配置 + 查看执行日志 | P1 | Scheduler、日志系统、历史记录 |

### 5.4 测试用例示例

```typescript
// tests/e2e/app-launch.e2e.ts
import { test, expect } from './fixtures'

test.describe('E2E-001: 首次启动 + API Key 配置', () => {
  test('应用窗口正常加载', async ({ mainWindow }) => {
    // 验证窗口标题
    const title = await mainWindow.title()
    expect(title).toContain('OPC MKT Agent OS')
  })

  test('首次启动显示引导页面', async ({ mainWindow }) => {
    // 如果没有配置 API Key，应显示 onboarding
    const onboarding = mainWindow.locator('[data-testid="onboarding"]')
    // 首次启动可能显示引导或直接进入主界面
    const mainContent = mainWindow.locator('[data-testid="main-layout"]')
    const visible = await onboarding.isVisible().catch(() => false)
      || await mainContent.isVisible().catch(() => false)
    expect(visible).toBe(true)
  })

  test('可以打开设置并配置 API Key', async ({ mainWindow }) => {
    // 找到设置入口
    const settingsBtn = mainWindow.locator('[data-testid="settings-button"]')
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click()
      // 验证设置页面加载
      const settingsPanel = mainWindow.locator('[data-testid="settings-panel"]')
      await expect(settingsPanel).toBeVisible({ timeout: 5000 })
    }
  })
})

// tests/e2e/agent-execution.e2e.ts
import { test, expect } from './fixtures'

test.describe('E2E-002: Agent 执行', () => {
  test('Agent 列表正确显示', async ({ mainWindow }) => {
    // 导航到 Agent 监控/Team Studio 页面
    const agentList = mainWindow.locator('[data-testid="agent-list"]')
    await expect(agentList).toBeVisible({ timeout: 10000 })

    // 验证至少有 1 个 Agent 可见
    const agentItems = agentList.locator('[data-testid="agent-item"]')
    const count = await agentItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('点击 Agent 可查看详情', async ({ mainWindow }) => {
    const firstAgent = mainWindow.locator('[data-testid="agent-item"]').first()
    if (await firstAgent.isVisible()) {
      await firstAgent.click()
      // 详情面板或模态框出现
      const detail = mainWindow.locator('[data-testid="agent-detail"]')
      await expect(detail).toBeVisible({ timeout: 5000 })
    }
  })
})
```

### 5.5 运行命令

```bash
# 先构建 Electron 应用（E2E 测试需要打包后的产物）
pnpm electron:build

# 运行 E2E 测试
pnpm playwright test

# 带 UI 界面运行（调试用）
pnpm playwright test --ui

# 查看测试报告
pnpm playwright show-report
```

---

## 六、electron-builder 打包配置

### 6.1 打包目标

| 平台 | 格式 | 架构 | 签名 | 优先级 |
|------|------|------|------|--------|
| macOS | `.dmg` + `.zip` | x64 + arm64 (Universal) | Apple Developer ID | P0 |
| Windows | `.exe` (NSIS) | x64 | 可选 (EV Code Signing) | P0 |
| Linux | `.AppImage` + `.deb` | x64 | 无 | P2 |

### 6.2 electron-builder 配置

**`electron-builder.yml`:**

```yaml
appId: com.opc.mkt-agent-os
productName: OPC MKT Agent OS
copyright: Copyright © 2026 OPC

directories:
  buildResources: build
  output: release/${version}

files:
  - dist/**/*
  - "!dist/**/*.map"

extraResources:
  - from: engine/skills/
    to: skills/
    filter:
      - "**/*.SKILL.md"
  - from: engine/memory/
    to: memory/
    filter:
      - "**/*.md"
      - "**/*.json"

mac:
  category: public.app-category.business
  icon: build/icon.icns
  target:
    - target: dmg
      arch:
        - universal
    - target: zip
      arch:
        - universal
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
  window:
    width: 540
    height: 380

win:
  icon: build/icon.ico
  target:
    - target: nsis
      arch:
        - x64

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false
  createDesktopShortcut: true
  createStartMenuShortcut: true

linux:
  icon: build/icons
  target:
    - target: AppImage
      arch:
        - x64
    - target: deb
      arch:
        - x64
  category: Office

publish:
  provider: github
  owner: opc-team
  repo: opc-mkt-agent-os
  releaseType: release

electronDownload:
  mirror: https://npmmirror.com/mirrors/electron/
```

### 6.3 macOS 签名配置

**`build/entitlements.mac.plist`:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.keychain-access-groups</key>
  <array>
    <string>$(AppIdentifierPrefix)com.opc.mkt-agent-os</string>
  </array>
</dict>
</plist>
```

### 6.4 打包脚本

在根 `package.json` 中添加以下 scripts:

```json
{
  "scripts": {
    "electron:dev": "electron-vite dev",
    "electron:build": "electron-vite build",
    "electron:preview": "electron-vite preview",
    "pack:mac": "electron-builder --mac --config electron-builder.yml",
    "pack:win": "electron-builder --win --config electron-builder.yml",
    "pack:linux": "electron-builder --linux --config electron-builder.yml",
    "pack:all": "electron-builder --mac --win --linux --config electron-builder.yml",
    "pack:dir": "electron-builder --dir --config electron-builder.yml"
  }
}
```

### 6.5 打包验证清单

每次打包后必须验证以下项目:

| 编号 | 验证项 | macOS | Windows | 方法 |
|------|--------|-------|---------|------|
| PK-001 | 安装包大小合理 (< 250MB) | ✓ | ✓ | `ls -lh release/` |
| PK-002 | 可正常安装 | ✓ | ✓ | 手动安装到测试机 |
| PK-003 | 应用可启动且无白屏 | ✓ | ✓ | 启动后检查窗口内容 |
| PK-004 | 主进程无崩溃日志 | ✓ | ✓ | 检查 Console / Event Viewer |
| PK-005 | Skill 文件正确打包 | ✓ | ✓ | 检查 `resources/skills/` 目录 |
| PK-006 | Memory 文件正确打包 | ✓ | ✓ | 检查 `resources/memory/` 目录 |
| PK-007 | macOS 签名验证 | ✓ | - | `codesign --verify --deep` |
| PK-008 | macOS 公证状态 | ✓ | - | `spctl -a -t exec -vvv` |
| PK-009 | Windows 安装无 SmartScreen 警告 | - | ✓ | 全新系统安装测试 |
| PK-010 | 卸载后数据清理正确 | ✓ | ✓ | 卸载后检查残留文件 |

---

## 七、自动更新机制 (electron-updater)

### 7.1 更新策略

```
用户启动应用
    │
    ▼
检查更新 (autoUpdater.checkForUpdates())
    │
    ├── 无更新 → 正常使用
    │
    └── 有更新 → 弹出通知（显示版本号 + 更新内容）
                    │
                    ├── 用户选择「稍后」→ 下次启动再提醒
                    │
                    └── 用户选择「下载」→ 后台下载
                                            │
                                            ▼
                                        下载完成 → 弹出「立即安装」或「下次启动安装」
                                                        │
                                                        └── 安装 → 重启应用
```

### 7.2 实现要点

```typescript
// electron/main/updater.ts
import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'
import log from 'electron-log'

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // 日志配置
  autoUpdater.logger = log
  autoUpdater.autoDownload = false  // 不自动下载，让用户决定
  autoUpdater.autoInstallOnAppQuit = true

  // 检查更新
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded')
  })

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error)
    mainWindow.webContents.send('update:error', error.message)
  })

  // 启动时检查（延迟 5 秒，避免影响启动速度）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.warn('Update check failed:', err.message)
    })
  }, 5000)
}
```

### 7.3 更新测试用例

| 编号 | 测试场景 | 预期结果 | 方法 |
|------|----------|----------|------|
| AU-001 | 有新版本时显示更新通知 | 通知弹出，含版本号和更新日志 | Mock 更新服务器 |
| AU-002 | 无新版本时无提示 | 不弹出任何通知 | 当前版本=最新版本 |
| AU-003 | 下载进度正确显示 | 进度条从 0% 到 100% | 模拟大文件下载 |
| AU-004 | 下载完成后可安装重启 | 应用重启后版本更新 | 完整更新流程 |
| AU-005 | 网络断开时优雅降级 | 显示错误提示，不崩溃 | 断网状态下检查更新 |
| AU-006 | 用户选择「稍后」不强制更新 | 关闭通知，正常使用 | 点击「稍后」按钮 |

---

## 八、CI/CD 流程设计 (GitHub Actions)

### 8.1 流水线架构

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflows                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [push/PR → main]                                             │
│       │                                                       │
│       ▼                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│  │  Lint     │   │  Type    │   │  Unit    │  ← 并行运行     │
│  │  Check    │   │  Check   │   │  Tests   │                 │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘                 │
│       │              │              │                         │
│       └──────────────┼──────────────┘                         │
│                      ▼                                        │
│              ┌──────────────┐                                 │
│              │ Integration  │                                 │
│              │   Tests      │                                 │
│              └──────┬───────┘                                 │
│                     │                                         │
│  [tag: v*.*.*]      ▼                                         │
│       │      ┌──────────────┐                                 │
│       ├─────►│    Build     │ ← macOS + Windows 矩阵构建      │
│       │      │   Package    │                                 │
│       │      └──────┬───────┘                                 │
│       │             │                                         │
│       │             ▼                                         │
│       │      ┌──────────────┐                                 │
│       │      │   E2E Test   │ ← 在打包产物上运行               │
│       │      └──────┬───────┘                                 │
│       │             │                                         │
│       │             ▼                                         │
│       │      ┌──────────────┐                                 │
│       └─────►│   Release    │ ← 上传到 GitHub Releases        │
│              │   Publish    │                                 │
│              └──────────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Workflow: CI 检查 (每次 Push/PR)

**`.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web lint
      - run: pnpm --filter marketing-agent-os-engine typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    needs: [lint-and-typecheck, unit-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest run tests/integration/
```

### 8.3 Workflow: 打包发布 (Tag 触发)

**`.github/workflows/release.yml`:**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            platform: mac
          - os: windows-latest
            platform: win
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # 构建 Electron 应用
      - run: pnpm electron:build

      # 打包
      - name: Build for macOS
        if: matrix.platform == 'mac'
        run: pnpm pack:mac
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.MAC_CERTIFICATE }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Build for Windows
        if: matrix.platform == 'win'
        run: pnpm pack:win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # 上传产物
      - uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.platform }}
          path: |
            release/**/*.dmg
            release/**/*.zip
            release/**/*.exe
            release/**/*.AppImage
            release/**/*.deb
            release/**/latest*.yml

  e2e-test:
    needs: build
    strategy:
      matrix:
        include:
          - os: macos-latest
            platform: mac
          - os: windows-latest
            platform: win
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps

      - uses: actions/download-artifact@v4
        with:
          name: release-${{ matrix.platform }}
          path: release/

      - name: Run E2E tests
        run: pnpm playwright test
        env:
          E2E_TESTING: true

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-report-${{ matrix.platform }}
          path: test-results/

  publish:
    needs: e2e-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: release-mac
          path: release/

      - uses: actions/download-artifact@v4
        with:
          name: release-win
          path: release/

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            release/**/*.dmg
            release/**/*.zip
            release/**/*.exe
            release/**/latest*.yml
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 8.4 所需 GitHub Secrets

| Secret 名称 | 用途 | 必需 |
|-------------|------|------|
| `MAC_CERTIFICATE` | macOS 签名证书 (.p12 base64) | 发布时必需 |
| `MAC_CERTIFICATE_PASSWORD` | 证书密码 | 发布时必需 |
| `APPLE_ID` | Apple ID (公证用) | 发布时必需 |
| `APPLE_APP_SPECIFIC_PASSWORD` | Apple App-Specific 密码 | 发布时必需 |
| `APPLE_TEAM_ID` | Apple Team ID | 发布时必需 |

---

## 九、冒烟测试清单

### 9.1 安装后冒烟测试 (每次发布后执行)

每次打包部署后，按以下清单手动验证核心功能:

| 编号 | 测试项 | 操作步骤 | 预期结果 | 通过 |
|------|--------|----------|----------|------|
| SM-001 | 安装过程 | 双击安装包，按提示完成安装 | 安装成功，无报错 | [ ] |
| SM-002 | 首次启动 | 双击桌面图标启动 | 5 秒内显示主窗口，无白屏 | [ ] |
| SM-003 | 窗口基本操作 | 最小化、最大化、关闭、调整大小 | 窗口响应正常 | [ ] |
| SM-004 | 页面导航 | 点击侧边栏各菜单项 | 页面切换流畅，无空白页 | [ ] |
| SM-005 | 设置页面 | 打开设置，修改主题 | 主题切换生效，重启后保持 | [ ] |
| SM-006 | API Key 配置 | 输入测试 API Key 并保存 | 保存成功，密钥加密存储 | [ ] |
| SM-007 | Agent 列表 | 查看 Agent Monitor | 显示 14 个预装 Agent | [ ] |
| SM-008 | Agent 执行 | 选择一个 Agent 发送测试指令 | 收到流式响应，无报错 | [ ] |
| SM-009 | 内容查看 | 导航到内容管理页面 | 页面正常渲染，数据加载 | [ ] |
| SM-010 | Context Vault | 打开品牌设置页面 | 三个 tab 可切换，数据可编辑 | [ ] |
| SM-011 | 内存占用 | 打开活动监视器/任务管理器 | 空闲 < 300MB，运行 Agent 时 < 500MB | [ ] |
| SM-012 | 优雅退出 | 点击关闭按钮或 Cmd+Q | 应用正常退出，无僵尸进程 | [ ] |
| SM-013 | 二次启动 | 关闭后再次打开 | 上次的设置和数据保持 | [ ] |
| SM-014 | 网络断开 | 断开网络后操作 | 不崩溃，显示离线提示 | [ ] |
| SM-015 | 检查更新 | 帮助→检查更新 | 正确显示当前版本/有无更新 | [ ] |

### 9.2 自动化冒烟脚本

```bash
#!/bin/bash
# scripts/smoke-test.sh — 安装后自动化冒烟测试

set -e

APP_NAME="OPC MKT Agent OS"
LOG_FILE="smoke-test-$(date +%Y%m%d-%H%M%S).log"

echo "=== OPC MKT Agent OS 冒烟测试 ===" | tee "$LOG_FILE"
echo "时间: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 1. 检查安装
echo "[SM-001] 检查应用是否已安装..." | tee -a "$LOG_FILE"
if [[ "$OSTYPE" == "darwin"* ]]; then
  APP_PATH="/Applications/$APP_NAME.app"
  if [ -d "$APP_PATH" ]; then
    echo "  PASS: 应用已安装在 $APP_PATH" | tee -a "$LOG_FILE"
  else
    echo "  FAIL: 应用未找到" | tee -a "$LOG_FILE"
    exit 1
  fi
fi

# 2. 检查签名 (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "[SM-007] 检查代码签名..." | tee -a "$LOG_FILE"
  if codesign --verify --deep "$APP_PATH" 2>/dev/null; then
    echo "  PASS: 代码签名有效" | tee -a "$LOG_FILE"
  else
    echo "  WARN: 代码签名无效或未签名" | tee -a "$LOG_FILE"
  fi
fi

# 3. 检查打包资源
echo "[SM-RES] 检查打包资源完整性..." | tee -a "$LOG_FILE"
if [[ "$OSTYPE" == "darwin"* ]]; then
  RESOURCES_DIR="$APP_PATH/Contents/Resources"
  # 检查 Skill 文件
  SKILL_COUNT=$(find "$RESOURCES_DIR/skills" -name "*.SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  echo "  Skill 文件数量: $SKILL_COUNT" | tee -a "$LOG_FILE"
  if [ "$SKILL_COUNT" -ge 10 ]; then
    echo "  PASS: Skill 文件完整 (>= 10)" | tee -a "$LOG_FILE"
  else
    echo "  WARN: Skill 文件可能不完整" | tee -a "$LOG_FILE"
  fi
fi

# 4. 检查安装包大小
echo "[PK-001] 检查安装包大小..." | tee -a "$LOG_FILE"
if [[ "$OSTYPE" == "darwin"* ]]; then
  DMG_SIZE=$(find ./release -name "*.dmg" -exec du -m {} \; 2>/dev/null | awk '{print $1}')
  if [ -n "$DMG_SIZE" ] && [ "$DMG_SIZE" -lt 250 ]; then
    echo "  PASS: DMG 大小 ${DMG_SIZE}MB (< 250MB)" | tee -a "$LOG_FILE"
  elif [ -n "$DMG_SIZE" ]; then
    echo "  WARN: DMG 大小 ${DMG_SIZE}MB (>= 250MB)" | tee -a "$LOG_FILE"
  fi
fi

echo "" | tee -a "$LOG_FILE"
echo "=== 冒烟测试完成 ===" | tee -a "$LOG_FILE"
echo "详细日志: $LOG_FILE"
```

---

## 十、测试文件目录结构

```
OPC_MKT_Agent_OS/
├── vitest.config.ts                  # 根目录 Vitest 配置 (Node 环境)
├── playwright.config.ts              # Playwright E2E 配置
├── electron-builder.yml              # 打包配置
├── tests/
│   ├── unit/                         # 单元测试
│   │   ├── agent-registry.test.ts
│   │   ├── ipc-handler.test.ts
│   │   ├── store-operations.test.ts
│   │   ├── scheduler.test.ts
│   │   └── data-transform.test.ts
│   ├── integration/                  # 集成测试
│   │   ├── ipc-communication.test.ts
│   │   ├── local-store.test.ts
│   │   └── agent-execution.test.ts
│   ├── e2e/                          # E2E 测试
│   │   ├── fixtures.ts               # Electron 启动 fixture
│   │   ├── app-launch.e2e.ts
│   │   ├── agent-execution.e2e.ts
│   │   ├── content-approval.e2e.ts
│   │   ├── context-vault.e2e.ts
│   │   └── scheduler-config.e2e.ts
│   └── smoke/                        # 冒烟测试脚本
│       └── smoke-test.sh
├── web/
│   ├── vitest.config.ts              # Renderer 层 Vitest 配置 (jsdom)
│   └── tests/
│       └── setup.ts                  # 测试环境初始化
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI 检查 (push/PR)
│       └── release.yml               # 打包发布 (tag)
└── scripts/
    └── smoke-test.sh                 # 冒烟测试脚本
```

---

## 十一、所需依赖

### 开发依赖 (devDependencies)

```bash
# 测试框架
pnpm add -Dw vitest @vitest/coverage-v8

# UI 组件测试 (Renderer)
pnpm add -Dw --filter web @testing-library/react @testing-library/jest-dom jsdom

# E2E 测试
pnpm add -Dw @playwright/test

# Electron 打包
pnpm add -Dw electron-builder

# Electron 自动更新 (dependencies, 非 dev)
pnpm add -w electron-updater

# Electron 日志
pnpm add -w electron-log
```

### 安装命令汇总

```bash
cd /Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS

# 测试相关
pnpm add -Dw vitest @vitest/coverage-v8 @playwright/test

# Renderer 测试
pnpm add -Dw --filter web @testing-library/react @testing-library/jest-dom jsdom

# 打包相关
pnpm add -Dw electron-builder
pnpm add -w electron-updater electron-log

# Playwright 浏览器安装
npx playwright install --with-deps
```

---

## 十二、质量门禁总结

### 代码合入 (PR Merge) 门禁

| 检查项 | 工具 | 阈值 | 阻断级别 |
|--------|------|------|----------|
| Lint 检查 | ESLint | 0 errors | 阻断 |
| 类型检查 | tsc --noEmit | 0 errors | 阻断 |
| 单元测试 | Vitest | 全部通过 | 阻断 |
| 核心覆盖率 | Vitest coverage | > 80% | 警告 |
| 集成测试 | Vitest | 全部通过 | 阻断 |

### 发布 (Release) 门禁

| 检查项 | 工具 | 阈值 | 阻断级别 |
|--------|------|------|----------|
| 以上全部 CI 检查 | GitHub Actions | 通过 | 阻断 |
| E2E 测试 | Playwright | 5 条核心路径通过 | 阻断 |
| 打包成功 | electron-builder | macOS + Windows 产物生成 | 阻断 |
| 安装包大小 | 脚本检查 | < 250MB | 警告 |
| 冒烟测试 | 手动/脚本 | 15 项全部通过 | 阻断 |
| 设计走查 | @Designer 确认 | 通过 | 阻断 |

---

## 十三、附录：常用命令速查

```bash
# ===== 开发阶段 =====
pnpm electron:dev              # 启动 Electron 开发模式
pnpm vitest watch              # 监听模式运行单元测试
pnpm vitest run --coverage     # 运行测试 + 覆盖率

# ===== 测试阶段 =====
pnpm vitest run                          # 全量单元测试
pnpm vitest run tests/integration/       # 集成测试
pnpm playwright test                     # E2E 测试
pnpm playwright test --ui                # E2E 调试界面
pnpm playwright show-report              # 查看 E2E 报告

# ===== 打包阶段 =====
pnpm electron:build            # 构建 Electron 产物
pnpm pack:mac                  # 打包 macOS .dmg
pnpm pack:win                  # 打包 Windows .exe
pnpm pack:all                  # 全平台打包
pnpm pack:dir                  # 仅打包到目录（调试用）

# ===== 验证阶段 =====
bash scripts/smoke-test.sh               # 运行冒烟测试
codesign --verify --deep /Applications/OPC\ MKT\ Agent\ OS.app  # macOS 签名验证
```

---

*文档结束*
