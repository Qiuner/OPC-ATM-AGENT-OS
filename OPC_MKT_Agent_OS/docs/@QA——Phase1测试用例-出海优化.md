# Phase 1 集成测试用例 — 出海优化

- **完成时间**: 2026-03-24
- **参与人员**: @QA
- **测试框架**: node:test + node:assert (源码静态检查 + 文件系统验证)
- **测试文件**: `tests/phase1-global-integration.test.ts`

---

## 一、Agent 全链路测试

### TC-G1-001: Registry 包含全部 15 个 Agent 注册
- **前置条件**: engine/agents/registry.ts 已更新
- **测试步骤**: 计算 `this.register({` 出现次数
- **预期结果**: 15 次（原 9 + 新增 6: global-content/email/seo/geo/brand-compliance/meta-ads）
- **优先级**: P0
- **类型**: 功能

### TC-G1-002: 6 个出海 Agent ID 全部注册
- **前置条件**: registry.ts 包含新 Agent 定义
- **测试步骤**: 检查 registry.ts 包含以下 id 字符串
- **预期结果**: `global-content-agent`, `email-agent`, `seo-agent`, `geo-agent`, `brand-compliance-agent`(或原 brand-reviewer 升级), `meta-ads-agent` 全部存在
- **优先级**: P0
- **类型**: 功能

### TC-G1-003: 每个出海 Agent 注册字段完整
- **前置条件**: registry.ts 包含新 Agent
- **测试步骤**: 对每个新 Agent 检查必需字段: id, name, nameEn, description, skillFile, model, tools, maxTurns, level, color, avatar
- **预期结果**: 所有字段都存在且非空
- **优先级**: P0
- **类型**: 功能

### TC-G1-004: 出海 Agent SKILL.md 文件全部存在
- **前置条件**: engine/skills/ 目录已更新
- **测试步骤**: 检查以下文件存在: `global-content.SKILL.md`, `email-marketing.SKILL.md`, `seo-expert.SKILL.md`, `geo-expert.SKILL.md`, `meta-ads.SKILL.md`
- **预期结果**: 全部文件存在且非空（>100 字符）
- **优先级**: P0
- **类型**: 功能

### TC-G1-005: SKILL.md 内容规范 — 包含必要章节
- **前置条件**: SKILL.md 文件存在
- **测试步骤**: 对每个 SKILL.md 检查是否包含: 角色定义、SOP/工作流程、输出格式
- **预期结果**: 每个文件至少包含 "角色" 或 "Role"、"SOP" 或 "工作流" 或 "Workflow"、"输出" 或 "Output" 关键词
- **优先级**: P1
- **类型**: 功能

### TC-G1-006: CEO buildSupervisorConfig 任务路由表包含出海 Agent
- **前置条件**: registry.ts buildSupervisorConfig 已更新
- **测试步骤**: 检查 CEO prompt 中任务路由表是否引用出海 Agent
- **预期结果**: registry.ts 包含出海相关的 Agent 路由条目（global-content-agent, email-agent, seo-agent, geo-agent, meta-ads-agent）
- **优先级**: P0
- **类型**: 功能

### TC-G1-007: getSubAgentDefs 返回除 CEO 外所有 Agent
- **前置条件**: registry.ts getSubAgentDefs 方法存在
- **测试步骤**: 检查过滤逻辑 `a.id !== "ceo"`
- **预期结果**: 过滤条件正确，排除 CEO 返回其余全部 Agent
- **优先级**: P0
- **类型**: 功能

### TC-G1-008: buildDirectConfig 加载品牌上下文
- **前置条件**: registry.ts buildDirectConfig 方法存在
- **测试步骤**: 检查是否加载 brand-voice.md 和 target-audience.md
- **预期结果**: 方法中包含 `brand-voice.md` 和 `target-audience.md` 路径引用
- **优先级**: P1
- **类型**: 功能

### TC-G1-009: buildDirectConfig 支持 context 注入
- **前置条件**: buildDirectConfig 接受 context 参数
- **测试步骤**: 检查 context 参数被序列化到 prompt 中
- **预期结果**: 包含 `JSON.stringify(context` 逻辑
- **优先级**: P0
- **类型**: 功能

---

## 二、Channel / 平台配置测试

### TC-G2-001: Channel 类型包含出海平台
- **前置条件**: engine/agents/types.ts 已更新
- **测试步骤**: 检查 Channel 类型定义是否包含出海平台
- **预期结果**: Channel 类型包含 `meta` | `linkedin` | `tiktok` | `blog` | `email` 等出海渠道（或保持灵活的 string 类型）
- **优先级**: P1
- **类型**: 功能

### TC-G2-002: platforms.yaml 包含出海平台
- **前置条件**: config/platforms.yaml 已创建或 platforms.example.yaml 已更新
- **测试步骤**: 检查 yaml 文件中是否包含出海平台定义
- **预期结果**: 包含 `meta`/`facebook`, `linkedin`, `tiktok`, `blog`, `email` 等平台配置
- **优先级**: P1
- **类型**: 功能

### TC-G2-003: 数据库 schema 支持出海 channel
- **前置条件**: engine/db/schema.sql 已更新
- **测试步骤**: 检查 content_pieces 表 channel 字段注释是否包含出海渠道
- **预期结果**: channel 字段注释或 CHECK 约束包含出海平台选项
- **优先级**: P1
- **类型**: 功能

### TC-G2-004: 评分函数 calculate_score 覆盖出海渠道
- **前置条件**: schema.sql calculate_score 函数已更新
- **测试步骤**: 检查 CASE 语句是否包含新渠道的评分逻辑
- **预期结果**: 包含 `meta`/`linkedin`/`blog`/`email` 等渠道的评分公式（或统一的通用评分）
- **优先级**: P2
- **类型**: 功能

---

## 三、Scheduler 调度测试

### TC-G3-001: Scheduler 导入新 Agent 模块
- **前置条件**: engine/scheduler.ts 已更新
- **测试步骤**: 检查 scheduler.ts 是否包含新 Agent 的 import 或动态引用
- **预期结果**: 包含出海 Agent 的调度逻辑（直接 import 或通过 registry 动态调度）
- **优先级**: P0
- **类型**: 功能

### TC-G3-002: Scheduler cron 任务注册正确
- **前置条件**: scheduler.ts cron.schedule 调用
- **测试步骤**: 检查 cron.schedule 调用数量和时间配置
- **预期结果**: 至少包含 CEO(每日)、Analyst(每周) + 出海 Agent 相关调度（可能通过 CEO 统一编排）
- **优先级**: P1
- **类型**: 功能

### TC-G3-003: Scheduler 健康检查心跳
- **前置条件**: scheduler.ts 包含心跳逻辑
- **测试步骤**: 检查 heartbeat 定时任务存在
- **预期结果**: 包含 `*/5 * * * *` 心跳调度
- **优先级**: P2
- **类型**: 回归

---

## 四、用户上下文配置测试 — 产品 URL 抓取

### TC-G4-001: Context API POST — 创建产品卡片端点
- **前置条件**: web/src/app/api/context/route.ts 存在
- **测试步骤**: 检查 POST 方法导出，接受 type/title/content/metadata 参数
- **预期结果**: POST handler 存在，参数校验包含 type/title/content 必填检查
- **优先级**: P0
- **类型**: 功能

### TC-G4-002: 产品 URL 抓取 API 端点存在
- **前置条件**: 新增产品 URL 抓取 API（如 /api/context/scrape 或 /api/context/fetch-url）
- **测试步骤**: 检查是否存在 URL 抓取相关的 API route
- **预期结果**: 存在接受 URL 参数、调用抓取逻辑、返回产品信息的 API 端点
- **优先级**: P0
- **类型**: 功能

### TC-G4-003: 产品卡片存入 context-assets
- **前置条件**: 抓取成功后调用 createContextAsset
- **测试步骤**: 检查抓取逻辑中是否调用 context-assets store 的写入方法
- **预期结果**: 产品卡片以 type="product" 存入 context-assets，metadata 包含源 URL
- **优先级**: P0
- **类型**: 功能

### TC-G4-004: 产品卡片在 Agent prompt 注入
- **前置条件**: buildDirectConfig / buildSupervisorConfig 加载产品上下文
- **测试步骤**: 检查 Agent 配置构建时是否加载 context-assets 中的产品信息
- **预期结果**: prompt 构建逻辑包含产品上下文注入（通过 context 参数或直接读取 context-assets）
- **优先级**: P0
- **类型**: 功能

---

## 五、用户上下文配置测试 — 自定义 Skills 导入

### TC-G5-001: Skills 上传 API 端点存在
- **前置条件**: 新增 Skills 上传/管理 API
- **测试步骤**: 检查是否存在 /api/context/skills 或类似端点
- **预期结果**: 存在接受 .md 文件内容的 API 端点
- **优先级**: P0
- **类型**: 功能

### TC-G5-002: 自定义 Skill 存入 custom 目录
- **前置条件**: engine/skills/custom/ 目录存在
- **测试步骤**: 检查目录是否存在，上传逻辑是否写入该目录
- **预期结果**: engine/skills/custom/ 目录存在，自定义 Skill 文件保存到此目录
- **优先级**: P0
- **类型**: 功能

### TC-G5-003: Agent 可加载自定义 Skill
- **前置条件**: registry 或 Agent 配置支持自定义 Skill 加载
- **测试步骤**: 检查 buildDirectConfig 或 Agent 初始化逻辑是否查找 custom/ 目录
- **预期结果**: Skill 加载逻辑支持从 custom/ 目录读取用户上传的 .md 文件
- **优先级**: P0
- **类型**: 功能

### TC-G5-004: 在线编辑 Skill — 保存成功
- **前置条件**: UI 提供 Skill 在线编辑功能
- **测试步骤**: 检查是否存在 PUT/PATCH 端点用于更新 Skill 内容
- **预期结果**: 存在更新 API，保存后文件内容正确更新
- **优先级**: P1
- **类型**: 功能

---

## 六、用户上下文配置测试 — 邮箱配置

### TC-G6-001: 邮箱配置 API 端点存在
- **前置条件**: 新增邮箱配置 API（如 /api/config 或 /api/context 扩展）
- **测试步骤**: 检查是否存在邮箱配置的读写端点
- **预期结果**: 存在保存和读取邮箱地址/别名的 API
- **优先级**: P0
- **类型**: 功能

### TC-G6-002: 邮箱配置正确存储
- **前置条件**: 邮箱配置 API 工作正常
- **测试步骤**: 检查邮箱配置存储位置（context-assets 或独立 config 文件）
- **预期结果**: 邮箱地址和别名信息被持久化存储
- **优先级**: P0
- **类型**: 功能

### TC-G6-003: Email Agent 可读取邮箱配置
- **前置条件**: email-agent 存在且 context 注入正常
- **测试步骤**: 检查 Email Agent 的 buildDirectConfig 或 prompt 构建逻辑是否包含邮箱配置读取
- **预期结果**: Email Agent 运行时可获取用户配置的发件邮箱信息
- **优先级**: P1
- **类型**: 功能

---

## 七、UI 测试 — Context Vault 品牌设置模块

### TC-G7-001: Context Vault 页面渲染正常
- **前置条件**: web/src/app/context-vault/page.tsx 存在
- **测试步骤**: 检查页面组件导出、基本结构完整
- **预期结果**: default export 存在，包含 "Context Vault" 标题
- **优先级**: P0
- **类型**: UI

### TC-G7-002: Context Vault 品牌设置 Tab 存在
- **前置条件**: page.tsx 包含 tab 系统
- **测试步骤**: 检查是否包含品牌设置相关的 tab 或分区（URL 抓取/Skills 管理/邮箱配置）
- **预期结果**: 存在品牌设置入口（可能是独立 tab 或 Section），支持 URL 抓取、Skills、邮箱三个模块
- **优先级**: P0
- **类型**: UI

### TC-G7-003: URL 抓取 UI 组件
- **前置条件**: 品牌设置模块包含 URL 抓取功能
- **测试步骤**: 检查是否有 URL 输入框、抓取按钮、产品卡片预览
- **预期结果**: 包含 input[type=url] 或 placeholder 含 "URL"、抓取/获取按钮
- **优先级**: P0
- **类型**: UI

### TC-G7-004: Skills 管理 UI 组件
- **前置条件**: 品牌设置模块包含 Skills 管理
- **测试步骤**: 检查是否有 Skill 列表、上传按钮、编辑器
- **预期结果**: 包含 Skills 相关的 UI 元素（列表展示、上传入口、编辑功能）
- **优先级**: P0
- **类型**: UI

### TC-G7-005: 邮箱配置 UI 组件
- **前置条件**: 品牌设置模块包含邮箱配置
- **测试步骤**: 检查是否有邮箱输入框、保存按钮
- **预期结果**: 包含 email 输入相关 UI（input type=email 或 placeholder 含邮箱/email）
- **优先级**: P0
- **类型**: UI

### TC-G7-006: 暗色主题匹配
- **前置条件**: 所有新增/修改的 UI 组件
- **测试步骤**: 检查组件样式是否使用暗色主题配色（bg-[#xxx]/xx, text-white 等）
- **预期结果**: 无亮色背景出现（如 bg-white、bg-gray-100），使用项目暗色配色方案
- **优先级**: P1
- **类型**: UI

---

## 八、UI 测试 — Dashboard / Publishing 出海内容

### TC-G8-001: Publishing 页面支持出海平台
- **前置条件**: web/src/app/publishing/page.tsx 已更新
- **测试步骤**: 检查平台列表是否包含出海平台（Meta/LinkedIn/TikTok/Blog/Email）
- **预期结果**: 平台列表或标签中包含出海平台选项
- **优先级**: P1
- **类型**: UI

### TC-G8-002: Publishing 展示英文内容
- **前置条件**: 出海 Agent 生成英文内容
- **测试步骤**: 检查内容卡片是否支持展示英文标题和正文
- **预期结果**: 无中文专属的截断/格式逻辑导致英文内容显示异常
- **优先级**: P1
- **类型**: UI

### TC-G8-003: Contents API 支持出海平台过滤
- **前置条件**: web/src/app/api/contents/route.ts 存在
- **测试步骤**: 检查 GET API 是否支持按 platform 过滤
- **预期结果**: 支持 `?platform=meta` 等出海平台参数过滤
- **优先级**: P1
- **类型**: 功能

---

## 九、回归测试

### TC-REG-001: 原有 9 个 Agent 注册未被破坏
- **前置条件**: registry.ts 更新后
- **测试步骤**: 检查原有 Agent ID 仍然存在
- **预期结果**: ceo, xhs-agent, analyst-agent, growth-agent, brand-reviewer, podcast-agent, x-twitter-agent, visual-gen-agent, strategist-agent 全部存在
- **优先级**: P0
- **类型**: 回归

### TC-REG-002: 原有 P0 SKILL.md 文件完整
- **前置条件**: skills/ 目录更新后
- **测试步骤**: 检查原有 SKILL.md 文件存在
- **预期结果**: xhs.SKILL.md, analyst.SKILL.md, growth.SKILL.md, brand-reviewer.SKILL.md, podcast.SKILL.md, x-twitter.SKILL.md, visual-gen.SKILL.md, strategist.SKILL.md 全部存在
- **优先级**: P0
- **类型**: 回归

### TC-REG-003: EventBus 单例 + emit/on 未被破坏
- **前置条件**: web/src/lib/agent-sdk/event-bus.ts
- **测试步骤**: 检查 globalThis、emit、on、getRecentEvents
- **预期结果**: 全部方法存在
- **优先级**: P0
- **类型**: 回归

### TC-REG-004: MCP Servers 配置未被破坏
- **前置条件**: registry.ts MCP 配置
- **测试步骤**: 检查 creatorflow、xhs-data、podcast-tts MCP 配置仍然存在
- **预期结果**: 三个 MCP Server 配置完整
- **优先级**: P0
- **类型**: 回归

### TC-REG-005: engine package.json exports 完整
- **前置条件**: engine/package.json
- **测试步骤**: 检查 exports 字段
- **预期结果**: 包含 registry、types、team-session 等必要 exports
- **优先级**: P1
- **类型**: 回归

### TC-REG-006: Web 构建通过
- **前置条件**: 所有代码变更完成
- **测试步骤**: 执行 `pnpm --filter web build`
- **预期结果**: 构建成功，无 TypeScript 或构建错误
- **优先级**: P0
- **类型**: 回归

---

## 测试汇总

| 类别 | 用例数 | P0 | P1 | P2 |
|------|--------|----|----|-----|
| Agent 全链路 | 9 | 7 | 2 | 0 |
| Channel/平台 | 4 | 0 | 3 | 1 |
| Scheduler 调度 | 3 | 1 | 1 | 1 |
| 产品 URL 抓取 | 4 | 4 | 0 | 0 |
| 自定义 Skills | 4 | 3 | 1 | 0 |
| 邮箱配置 | 3 | 2 | 1 | 0 |
| UI Context Vault | 6 | 4 | 2 | 0 |
| UI Dashboard/Publishing | 3 | 0 | 3 | 0 |
| 回归测试 | 6 | 4 | 1 | 0 |
| **总计** | **42** | **25** | **14** | **2** |
