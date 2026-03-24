# OPC MKT Agent OS — 产品优化方案（出海 AI 营销团队）

> 完成时间：2026-03-24
> 参与人员：@PM、@Researcher
> 版本：v2.0（基于竞品调研更新）
> 依赖文档：
> - `@PM——产品重定位-出海AI营销团队.md`
> - `@Researcher——出海营销工具竞品调研.md`

---

## 一、市场机会与竞争定位

### 1.1 市场机会（基于 @Researcher 调研）

| 维度 | 数据 | 启示 |
|------|------|------|
| **出海独立站市场** | 2025 年预计 5.5 万亿元，年增 30%+ | 用户基数快速增长 |
| **AI 营销市场** | 2028 年预计超 3 万亿元 | AI 替代人工营销是确定性趋势 |
| **GEO 市场** | $8.86 亿 → $73 亿（2031），AI 搜索流量年增 527% | GEO 是蓝海，先发优势明显 |
| **工具碎片化** | 出海商家需组合 5-10 个工具，月支出 $300-1,500+ | 一站式整合有强烈需求 |
| **竞争空白** | "功能深度高 + 出海适配度高"象限几乎为空 | 我们的核心切入点 |

### 1.2 竞争定位矩阵

```
        功能深度高
           |
  HubSpot  |  Jasper        ← 功能强但不服务出海
  Sprout   |  Copy.ai
  SEMrush  |
  ─────────┼────────────── 出海适配度
           |
  Buffer   |  ★ OPC MKT Agent OS ★
  Later    |  Navos (刚起步)
  蚁小二   |  店匠/SHOPLINE (仅建站)
           |
        功能深度低
```

**我们的定位：右上象限 —— 高功能深度 + 高出海适配度的 AI 营销操作系统。**

### 1.3 核心差异化壁垒

| # | 差异化点 | 对比竞品 | 壁垒强度 |
|---|----------|----------|----------|
| 1 | **Multi-Agent 营销团队**：模拟 5 人专业团队（策略/内容/投放/分析/合规） | Jasper/Copy.ai 仅单一 AI 助手 | 强 — 需要 Agent 编排技术 + 营销领域 SOP |
| 2 | **中国出海品牌专属**：中文界面 + 理解出海商家痛点 + 平台适配 | 海外工具无中文、国内工具无出海深度 | 中 — 产品+运营层面，需持续迭代 |
| 3 | **SEO + GEO 一体化**：传统搜索优化 + AI 搜索引擎品牌可见性 | SEO 和 GEO 目前是割裂工具链 | 强 — 市场空白，技术整合有门槛 |
| 4 | **数据飞轮自进化**：跨渠道数据回收 → Winning Patterns → 内容自动优化 | 竞品多为静态工具，不具备学习能力 | 强 — 数据积累有先发优势 |
| 5 | **成本优势**：一站式替代 5-10 个工具，节省 60-80% 营销工具支出 | 用户当前 $300-1,500+/月 | 中 — 价格层面 |

---

## 二、现状评估

### 2.1 已有能力（资产盘点）

| 层级 | 已具备 | 状态 |
|------|--------|------|
| **Agent Skills** | 13 个 Skill 定义（含 global-content、meta-ads、email-marketing、seo-expert、geo-expert、x-twitter） | Skill 文件就绪，但部分缺少 Agent 代码实现 |
| **Agent 代码** | 8 个 Agent 实现（ceo、analyst、strategist、x-twitter、xhs、podcast、visual-gen、bridge） | 缺 global-content、meta-ads、email、seo、geo、brand-reviewer 等 Agent 代码 |
| **Team Engine** | claude-bridge.ts + team-engine.ts（基于 Claude CLI 的 Team 编排） | 可用，已验证 |
| **Scheduler** | node-cron 调度器，CEO 每日 9:00、Analyst 每周一 8:00 | 仅 2 个任务，远不够每日循环 |
| **MCP 服务** | creatorflow、podcast-tts、shared、xhs-data | 全部为国内平台，缺少出海 API |
| **数据库** | PostgreSQL schema（content_pieces、performance_metrics、winning_patterns、task_queue） | 已有基础，需扩展出海字段 |
| **Web UI** | 9 个页面（analytics、approval、campaigns、context-vault、creatorflow、publishing、task-board、team-studio、workbench） | 框架完整，需适配出海场景 |
| **平台配置** | platforms.example.yaml | 内容仍为国内平台（xhs/douyin/shipinhao），需改为出海平台 |

### 2.2 核心缺口

| # | 缺口 | 影响 | 优先级 |
|---|------|------|--------|
| G1 | Agent 代码缺失：global-content、email、seo、geo、brand-reviewer 等 Skill 有定义但无 Agent 代码 | 新 Agent 无法被调度执行 | P0 |
| G2 | 出海平台 API 集成为零（Meta API、X API v2、SendGrid、TikTok、LinkedIn） | Agent 只能生成内容，无法发布 | P0 |
| G3 | Scheduler 不完整：仅 CEO+Analyst，缺少出海全链路每日循环 | 无法自主运行 | P0 |
| G4 | 数据飞轮断裂：缺少平台数据回收 → 指标更新 → 学习优化闭环 | Agent 无法自我进化 | P1 |
| G5 | Landing Page 缺失：无产品官网 | 无法获客 | P1 |
| G6 | 平台配置未更新：platforms.yaml 仍为国内平台 | 与出海定位不匹配 | P0 |
| G7 | 数据库 schema 缺出海特有字段（language、target_market、platform 枚举扩展） | 数据模型不支持 | P1 |

---

## 三、核心策略

### 3.1 内容先行，效果驱动

```
Phase 1: Agent 全员就绪 + 免费内容能力打通（SEO/GEO/Social/Email）
    ↓ 商家看到免费渠道效果
Phase 2: 平台 API 集成 + 实际发布能力
    ↓ 内容能发出去，效果可追踪
Phase 3: 数据飞轮闭环 + ROI 归因
    ↓ 数据飞轮跑通，ROI 可量化
Phase 4: Landing Page + 获客 + GTM
    ↓ 用自己的产品做自己的出海营销
Phase 5: 商业化 + 规模化
```

### 3.2 策略逻辑

**为什么内容先行？**（基于调研数据支撑）

1. **成本优势**：SEO/GEO/X 发帖/Email 是免费/低成本渠道，出海商家痛点之一就是"营销 ROI 难衡量"，免费渠道先见效
2. **GEO 先发优势**：AI 搜索流量年增 527%，大多数中小企业尚未启动 GEO，现在做可以抢占 AI 搜索引擎品牌可见性
3. **降低试用门槛**：先让商家免费用内容生成能力，体验 Agent 团队价值，再引入付费投放
4. **Navos 等竞品刚起步**：2026 年入局仍有先发优势，但窗口期有限，必须快速出活

---

## 四、定价策略（基于调研更新）

### 4.1 竞品定价参考

| 竞品组合 | 用户当前支出 | 覆盖能力 |
|----------|-------------|----------|
| Buffer($6/渠道x5) + Jasper($69) + Mailchimp($20) + Ahrefs($129) | ~$250/月 | 社媒+内容+Email+SEO |
| Hootsuite($99) + Copy.ai($29) + SendGrid($20) + SEMrush($140) | ~$290/月 | 社媒+内容+Email+SEO |
| Sprout Social($199) + Jasper($69) + Klaviyo($45) + Surfer($99) | ~$410/月 | 企业级社媒+内容+Email+SEO |

### 4.2 OPC 定价方案（美元定价，对标国际市场）

| 层级 | 目标用户 | 价格 | 包含能力 | 对标竞品总价 | 节省比例 |
|------|----------|------|----------|-------------|----------|
| **Starter** | 个人卖家/初创品牌 | **$49/月** | 3 平台 + 内容生成 + SEO 基础 + 每日 1 次 Agent 执行 | ~$250/月 | 80% |
| **Growth** | 成长期品牌 | **$149/月** | 全平台 + 内容+投放 + SEO+GEO + 数据分析 + 每日 3 次 | ~$350/月 | 57% |
| **Enterprise** | 规模化品牌/代理商 | **$399/月** | 全功能 + 数据飞轮 + 自定义 Agent + 无限执行 + 多品牌 | ~$600+/月 | 33%+ |

**定价逻辑：**
- Starter 定价低于竞品组合的最便宜单品（$49 < Buffer+AI 工具起步价），极低门槛拉新
- Growth 是核心盈利档，功能覆盖替代 3-4 个工具，性价比突出
- Enterprise 提供完整能力 + 自定义，对标 Sprout Social + Jasper 但聚焦出海场景

---

## 五、Phase 拆解

---

### Phase 1：Agent 全员就绪 + 内容生成链路 + 用户上下文配置（2 周）

**目标：** 所有出海 Agent 代码实现完毕，用户可自助配置品牌上下文（产品卡片/自定义 Skills/邮箱），Agent 团队基于用户上下文自动生成英文多平台营销内容。

**里程碑：**
1. 用户输入产品 URL → 系统抓取生成产品卡片 → 存入 Context Vault
2. 输入品牌 brief + 产品卡片上下文 → Agent 团队自动生成 X 帖子 + Blog + Email + SEO/GEO 建议
3. 用户可上传自定义 Skill，Agent 执行时自动加载

**为什么 SEO+GEO Agent 在 Phase 1？** 调研显示 GEO 市场年增 527% 且竞品空白，SEO+GEO 一体化是我们的核心差异化之一，必须从第一天就建立能力。

#### 任务清单

**A. 用户上下文配置（新增）**

| Task | 名称 | 优先级 | 负责人 | 预计时间 | 依赖 | 验收标准 |
|------|------|--------|--------|----------|------|----------|
| T1-A | Context Vault「品牌设置」模块 UI 设计 | P0 | @Designer | 1 天 | 无 | 输出设计方案：产品 URL 抓取区 + 自定义 Skills 区 + 邮箱配置区，匹配现有暗色主题 |
| T1-B | 产品 URL 抓取生成产品卡片 | P0 | @DEV | 2 天 | T1-A | 输入 URL → 自动抓取 → 生成结构化产品卡片（名称/描述/价格/图片）→ 存入 context-assets.json (type='product') → Agent 执行时自动注入 prompt |
| T1-C | 自定义 Skills 导入 | P0 | @DEV | 1.5 天 | T1-A | 上传 .md 文件 → 存入 engine/skills/custom/ → 在线编辑 → Agent 执行时自动加载 custom skills |
| T1-D | 邮箱配置 | P1 | @DEV | 0.5 天 | T1-A | 配置发件人邮箱/别名 → 存入 settings → Email Agent 读取配置 |

**B. Agent 代码补齐**

| Task | 名称 | 优先级 | 负责人 | 预计时间 | 依赖 | 验收标准 |
|------|------|--------|--------|----------|------|----------|
| T1-01 | ~~出海工具市场调研~~ | ~~P0~~ | ~~@Researcher~~ | -- | -- | **已完成** → `@Researcher——出海营销工具竞品调研.md` |
| T1-02 | 补齐 Agent 代码：global-content-agent.ts | P0 | @DEV | 2 天 | 无 | Agent 可独立执行，生成英文多平台内容（X/Blog/LinkedIn/TikTok 格式），输出存入 content_pieces |
| T1-03 | 补齐 Agent 代码：email-marketing-agent.ts | P0 | @DEV | 1.5 天 | 无 | Agent 可生成 Email 序列（Welcome/Nurture/Promo/Cart Abandonment），存入数据库 |
| T1-04 | 补齐 Agent 代码：seo-expert-agent.ts | P0 | @DEV | 1.5 天 | 无 | Agent 可分析关键词、生成 SEO 建议、优化 meta 标签、生成 SEO 友好内容 |
| T1-05 | 补齐 Agent 代码：geo-expert-agent.ts | **P0** | @DEV | 1.5 天 | 无 | Agent 可生成 GEO 优化建议（AI 搜索引擎友好内容、品牌可见性策略、结构化数据优化） |
| T1-06 | 补齐 Agent 代码：brand-compliance-agent.ts | P1 | @DEV | 1 天 | 无 | Agent 可审核内容的品牌一致性和各平台合规性（广告法/隐私法规） |
| T1-07 | 补齐 Agent 代码：meta-ads-agent.ts | P1 | @DEV | 1 天 | 无 | Agent 可生成广告文案、受众建议、预算分配方案（Phase 2 接 API 后真正执行） |

**C. 基础设施**

| Task | 名称 | 优先级 | 负责人 | 预计时间 | 依赖 | 验收标准 |
|------|------|--------|--------|----------|------|----------|
| T1-08 | 更新平台配置 platforms.yaml | P0 | @DEV | 0.5 天 | 无 | 替换为出海平台（meta/x/tiktok/linkedin/email/blog），保留国内平台但标记为 legacy |
| T1-09 | 数据库 schema 扩展 | P0 | @DEV | 1 天 | 无 | content_pieces 增加 language/target_market/published_url 字段；evaluate_score 函数覆盖出海渠道 |
| T1-10 | Scheduler 扩展为出海内容生成链路 | P0 | @DEV | 1.5 天 | T1-02~07 | 每日循环：Analyst 日报 → CEO 编排 → Content 生成 → SEO/GEO 优化 → Brand Review |
| T1-11 | CEO Agent SOP 更新为出海营销总监 | P0 | @DEV | 1 天 | T1-08 | CEO 按出海平台特性拆分任务，调度新 Agent，支持多市场策略 |

**D. 测试与 UI**

| Task | 名称 | 优先级 | 负责人 | 预计时间 | 依赖 | 验收标准 |
|------|------|--------|--------|----------|------|----------|
| T1-12 | 集成测试：全链路 | P0 | @QA | 2 天 | T1-A~11 | Agent 全链路 + 用户上下文配置 + 产品卡片注入 prompt 全部通过 |
| T1-13 | UI 适配：Dashboard/Publishing 展示出海内容 | P1 | @Designer + @DEV | 2 天 | T1-09 | 页面正确展示英文内容、出海平台标签、多语言切换 |

**产出物：**
- 7 个新/更新 Agent 代码文件
- Context Vault 品牌设置模块（产品卡片抓取 + 自定义 Skills + 邮箱配置）
- 更新后的 platforms.yaml、schema.sql、scheduler.ts、CEO SOP
- Phase 1 测试报告

---

### Phase 2：平台 API 集成 — 内容发布能力（2-3 周）

**目标：** Agent 生成的内容能实际发布到海外平台。按"内容先行"原则，优先接入免费/低成本内容渠道。

**里程碑：** Agent 生成内容 → 品牌审核通过 → 自动发布到 X + 发送 Email，状态回写数据库。

**优先级排序（基于调研）：**
1. **X (Twitter)** — 品牌曝光核心渠道，API 申请相对简单
2. **Email (SendGrid)** — 转化率最高渠道，API 无审核
3. **LinkedIn** — B2B 出海品牌核心渠道
4. **Meta Ads** — 出海品牌 60-80% 预算（Phase 2 后半段，API 审核需时间）
5. **TikTok** — 视觉内容渠道（可后移）

#### 任务清单

| Task | 名称 | 优先级 | 负责人 | 预计时间 | 依赖 | 验收标准 |
|------|------|--------|--------|----------|------|----------|
| T2-01 | MCP 服务：X (Twitter) API v2 集成 | P0 | @DEV | 3 天 | Phase 1 | 支持发推/回复/mentions/推文数据；速率限制处理 |
| T2-02 | MCP 服务：SendGrid Email API 集成 | P0 | @DEV | 2 天 | Phase 1 | 支持单封/批量邮件、模板管理、投递状态回调 |
| T2-03 | MCP 服务：LinkedIn Marketing API 集成 | P1 | @DEV | 2 天 | Phase 1 | 支持发布文章/帖子、公司页管理 |
| T2-04 | MCP 服务：Meta Marketing API 集成 | P1 | @DEV | 4 天 | Phase 1 | 创建广告系列/广告组/广告、预算管理、数据回收 |
| T2-05 | MCP 服务：TikTok Marketing API 集成 | P2 | @DEV | 3 天 | Phase 1 | 视频发布、广告投放 |
| T2-06 | 发布流程引擎：审批 → 发布 → 状态回写 | P0 | @DEV | 2 天 | T2-01,02 | Approval Center 审批通过 → 自动调用 MCP 发布 → approved → published |
| T2-07 | Webhook 接收层：平台回调数据写入 | P0 | @DEV | 1.5 天 | T2-01,02 | X/SendGrid/Meta webhook → performance_metrics |
| T2-08 | 安全层：API Key 管理 + OAuth 流程 | P0 | @DEV | 2 天 | 无 | 环境变量管理 API Key；Meta/X OAuth 授权流程 |
| T2-09 | UI：平台连接管理页面（Settings） | P1 | @Designer + @DEV | 2 天 | T2-08 | 用户配置各平台 API Key / OAuth 授权，连接状态可视 |
| T2-10 | UI：Publishing 页面升级 — 发布状态追踪 | P1 | @Designer + @DEV | 1.5 天 | T2-06 | 展示每条内容的发布状态、平台链接、发布时间、互动数据 |
| T2-11 | 集成测试：内容发布全链路 | P0 | @QA | 2 天 | T2-06,07 | 审批 → X 发布成功 → Email 发送成功 → 状态回写正确 |
| T2-12 | 设计走查 | P1 | @Designer | 1 天 | T2-09,10 | UI 实现与设计方案一致 |

**产出物：**
- 3-5 个 MCP 服务模块（engine/mcps/x-twitter/、sendgrid/、linkedin/、meta-ads/ 等）
- 发布流程引擎 + Webhook 接收端
- 平台连接管理 UI + Publishing 升级
- 测试报告

---

### Phase 3：数据飞轮 + Dashboard 升级（2 周）

**目标：** 建立"发布 → 数据回收 → 分析 → 学习 → 优化"的自动化闭环。这是核心壁垒 — 让 Agent 团队越来越聪明。

**里程碑：** Analyst Agent 每日自动回收各平台数据，生成跨渠道 ROI 报告；Content Agent 基于 Winning Patterns 自动优化下一轮内容质量。

**调研支撑：** 竞品（Buffer/Hootsuite/Jasper）多为静态工具，不具备数据驱动的自学习能力。这是我们的技术壁垒。

#### 任务清单

| Task | 名称 | 优先级 | 负责人 | 预计时间 | 依赖 | 验收标准 |
|------|------|--------|--------|----------|------|----------|
| T3-01 | 数据回收服务：各平台指标定时拉取 | P0 | @DEV | 3 天 | Phase 2 MCP | X/Meta/SendGrid/LinkedIn 数据每日自动拉取，写入 performance_metrics |
| T3-02 | Analyst Agent 升级：跨渠道 ROI 归因 | P0 | @DEV | 2 天 | T3-01 | 按渠道/Campaign/内容类型/目标市场维度计算 ROI，输出结构化报告 |
| T3-03 | Winning Patterns 自动提炼 | P0 | @DEV | 2 天 | T3-02 | Analyst 自动识别 Top 20% 内容共性特征（hook_type/emotion/format/timing），更新 winning_patterns 表 |
| T3-04 | Content Agent 反馈注入 | P0 | @DEV | 1.5 天 | T3-03 | Content Agent 生成前查询 winning_patterns 并应用到新内容 |
| T3-05 | GEO 可见性追踪 | P1 | @DEV | 2 天 | T3-01 | 追踪品牌在 ChatGPT/Perplexity/Gemini 搜索结果中的引用率 |
| T3-06 | 评分函数更新：覆盖所有出海渠道 | P1 | @DEV | 1 天 | T3-01 | calculate_score 函数支持 meta/x/tiktok/linkedin/email/blog |
| T3-07 | Dashboard 改版：出海数据总览 | P0 | @Designer + @DEV | 3 天 | T3-02 | 跨渠道数据概览 + 趋势图 + ROI 排名 + Agent 活动日志 + GEO 可见性 |
| T3-08 | Analytics 页面升级：渠道详情 + 内容排名 | P1 | @Designer + @DEV | 2 天 | T3-01 | 按渠道查看详细指标，内容表现排行，胜出模式可视化 |
| T3-09 | Scheduler 完善为完整每日循环 | P0 | @DEV | 1 天 | T3-01~04 | 06:00 数据回收 → 07:00 CEO → 08:00 Content → ... → 22:00 日总结 |
| T3-10 | 集成测试：飞轮闭环验证 | P0 | @QA | 2 天 | T3-04 | 连续运行 3 天，验证数据回收→分析→模式提炼→内容优化链路正常 |
| T3-11 | 设计走查 | P1 | @Designer | 1 天 | T3-07,08 | Dashboard/Analytics 实现与设计一致 |

**产出物：**
- 数据回收服务 + GEO 可见性追踪
- 升级后的 Analyst Agent + 飞轮闭环
- 新版 Dashboard + Analytics UI
- 测试报告

---

### Phase 4：Landing Page + GTM 准备（2 周）

**目标：** 产品官网上线，准备获客链路，为 Product Hunt Launch 做准备。

**里程碑：** 用户通过 Landing Page 了解产品 → 注册试用 → 配置品牌 → 平台授权 → 体验 Agent 团队自动营销。

**Landing Page 核心卖点（基于调研提炼）：**
1. "你的 AI 出海营销团队" — 5 个 AI Agent 替代 5 人团队
2. "一个平台，替代 5-10 个工具" — 解决工具碎片化痛点
3. "SEO + GEO 双引擎" — 传统搜索 + AI 搜索全覆盖
4. "越用越聪明" — 数据飞轮自进化
5. "省 60% 营销工具支出" — 从 $300+/月 → $49/月起

#### 任务清单

| Task | 名称 | 优先级 | 负责人 | 预计时间 | 依赖 | 验收标准 |
|------|------|--------|--------|----------|------|----------|
| T4-01 | Landing Page 竞品调研 | P0 | @Researcher | 2 天 | 无 | 分析 5+ 出海/营销工具 LP 设计、文案结构、转化策略 |
| T4-02 | Landing Page 文案策划 | P0 | @PM | 2 天 | T4-01 | Hero 文案 + 5 大卖点 + How It Works + 定价表 + Social Proof + CTA |
| T4-03 | Landing Page UI 设计方案 | P0 | @Designer | 3 天 | T4-02 | 完整页面设计（响应式），暗色科技感风格 |
| T4-04 | Landing Page 开发 | P0 | @DEV | 4 天 | T4-03 确认 | Next.js SSG，Lighthouse > 90，SEO 完整（meta/OG/JSON-LD） |
| T4-05 | Onboarding 流程设计与开发 | P1 | @Designer + @DEV | 4 天 | T4-04 | 注册 → 品牌信息 → 平台授权 → 首次 Agent 执行引导 |
| T4-06 | 定价页面 + Stripe 集成 | P1 | @DEV | 2 天 | T4-04 | 3 档定价（$49/$149/$399），Stripe Checkout（先 Test Mode） |
| T4-07 | SEO 基础设施 | P1 | @DEV | 1 天 | T4-04 | sitemap.xml、robots.txt、结构化数据、OG 图片 |
| T4-08 | 部署上线（Vercel） | P0 | @QA | 1 天 | T4-04 | 生产环境可访问，HTTPS/CDN 正常，域名配置 |
| T4-09 | 全量测试 + 设计走查 | P0 | @QA + @Designer | 2 天 | T4-04~06 | 功能 + 设计走查 + 性能 + SEO 检查全部通过 |
| T4-10 | Product Hunt 准备材料 | P2 | @PM + @Researcher | 2 天 | T4-08 | Tagline + Description + 截图 + Demo GIF/视频脚本 |

**产出物：**
- Landing Page（含定价、Onboarding）
- Stripe 集成
- Product Hunt 准备材料
- 部署报告

---

### Phase 5：增长 + 商业化 + 持续迭代（持续）

**目标：** Dogfooding + 种子用户 + PMF 验证 + Product Hunt Launch。

#### 关键举措

| 举措 | 负责人 | 目标 | 基于调研的策略 |
|------|--------|------|---------------|
| **Dogfooding** | @PM + 全团队 | 用 OPC Agent OS 管理自身出海营销 | 在 X/LinkedIn 发布出海营销 tips，自证效果 |
| **种子用户招募** | @PM | 10 个种子用户 | 出海笔记、即刻、V2EX、跨境知道社群精准投放 |
| **Product Hunt Launch** | @PM + @Researcher | Top 5 of the day | 准备 Maker Story，强调"中国出海品牌专属" |
| **内容营销** | Agent 自主 | 每周 5 篇 Blog + 每日 X/LinkedIn | 聚焦 "出海营销 + AI Agent" 长尾关键词 |
| **GEO 自营** | SEO + GEO Agent | 品牌在 AI 搜索中可见 | 用自己的 GEO Agent 优化自己在 ChatGPT/Perplexity 中的品牌可见性 |
| **KOL 合作** | @PM | 3-5 个出海领域 KOL | 出海圈博主试用体验 + 联合内容 |
| **P2 平台集成** | @DEV | 按需求优先级 | Shopify/GA4/Google Ads（根据种子用户反馈排序） |

---

## 六、技术架构演进路线

### 6.1 Agent 层

```
当前 (Phase 0)                    Phase 1 完成后
────────────────                   ────────────────
engine/agents/                     engine/agents/
├── ceo.ts                         ├── ceo.ts (更新为出海营销总监 SOP)
├── analyst-agent.ts               ├── analyst-agent.ts (更新出海指标)
├── strategist-agent.ts            ├── strategist-agent.ts
├── x-twitter-agent.ts             ├── x-twitter-agent.ts (更新英文内容)
├── xhs-agent.ts                   ├── xhs-agent.ts (保留，标记 legacy)
├── podcast-agent.ts               ├── podcast-agent.ts
├── visual-gen-agent.ts            ├── visual-gen-agent.ts
├── bridge.ts                      ├── bridge.ts
                                   ├── global-content-agent.ts  [新增] 英文多平台内容
                                   ├── email-marketing-agent.ts [新增] Email 序列
                                   ├── seo-expert-agent.ts      [新增] SEO 优化
                                   ├── geo-expert-agent.ts      [新增] GEO/AI搜索优化
                                   ├── brand-compliance-agent.ts [新增] 品牌合规
                                   └── meta-ads-agent.ts        [新增] 广告投放
```

### 6.2 MCP 层

```
当前 (Phase 0)                    Phase 2 完成后
────────────────                   ────────────────
engine/mcps/                       engine/mcps/
├── creatorflow/                   ├── creatorflow/ (保留)
├── podcast-tts/                   ├── podcast-tts/ (保留)
├── shared/                        ├── shared/
├── xhs-data/                      ├── xhs-data/ (标记 legacy)
                                   ├── x-twitter/     [新增] X API v2
                                   ├── sendgrid/      [新增] Email
                                   ├── linkedin/      [新增] LinkedIn API
                                   ├── meta-ads/      [新增] Meta Marketing API
                                   └── tiktok/        [P2] TikTok Marketing API
```

### 6.3 数据库演进

```sql
-- Phase 1: schema 扩展
ALTER TABLE content_pieces
  ADD COLUMN language TEXT DEFAULT 'en',
  ADD COLUMN target_market TEXT[],                 -- ['US','EU','SEA','LATAM']
  ADD COLUMN published_url TEXT,
  ADD COLUMN geo_optimized BOOLEAN DEFAULT FALSE;  -- GEO 优化标记

-- Phase 2: 广告投放表
CREATE TABLE ad_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT NOT NULL,          -- 'meta' | 'google' | 'tiktok'
  campaign_name   TEXT NOT NULL,
  budget_daily    DECIMAL(10,2),
  budget_total    DECIMAL(10,2),
  target_audience JSONB,
  target_markets  TEXT[],
  status          TEXT DEFAULT 'draft',
  external_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 3: GEO 可见性追踪表
CREATE TABLE geo_visibility (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name      TEXT NOT NULL,
  ai_engine       TEXT NOT NULL,          -- 'chatgpt' | 'perplexity' | 'gemini' | 'claude'
  query           TEXT NOT NULL,          -- 用户搜索词
  mentioned       BOOLEAN DEFAULT FALSE,  -- 是否被引用
  position        INTEGER,               -- 引用位置
  context         TEXT,                   -- 引用上下文
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.4 Scheduler 演进

```
当前：
  09:00 CEO（仅此一个日常任务）
  周一 08:00 Analyst

Phase 1 完成后（内容生成链路）：
  08:00 Analyst 回收数据 + 生成日报
  09:00 CEO 根据日报制定今日任务
  10:00 Content Agent 生成内容（按平台适配）
  10:30 SEO/GEO Agent 优化内容
  11:00 Brand Reviewer 审核
  → 结果存入数据库，等待发布或审批

Phase 3 完成后（完整每日循环）：
  06:00 Analyst 回收昨日全渠道数据 → 生成日报
  07:00 CEO 根据日报 + 周计划 → 制定今日任务
  08:00 Content Agent 生成今日内容
  08:30 SEO Agent 优化内容关键词 + meta
  09:00 GEO Agent 优化 AI 搜索友好度
  09:30 Brand Reviewer 审核内容
  10:00 Social Agent 发布到 X/LinkedIn
  10:30 Ads Agent 更新 Meta/Google 广告
  14:00 SEO Agent 检查关键词排名
  14:30 GEO Agent 检查 AI 搜索可见性
  18:00 Analyst 中间回收数据 → 实时优化建议
  22:00 CEO 生成今日总结 → 准备明日计划
```

---

## 七、风险评估与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| Meta/X API 审核周期长（2-4 周） | 高 | Phase 2 延期 | Phase 1 启动时即提交 API 申请；先用 Sandbox 开发；准备审核所需隐私政策/使用说明文档 |
| 出海平台 API 限流 | 中 | 发布频率受限 | 实现速率限制器 + 指数退避重试；按平台限额调整 Scheduler 频率 |
| Agent 内容质量不稳定 | 中 | 用户体验差 | Brand Reviewer 兜底审核 + Approval Center 人工复审 + Winning Patterns 持续优化 Prompt |
| Navos 等竞品加速（窗口期有限） | 中 | 市场先发优势缩小 | Phase 1-2 快速执行（4-5 周），先用 SEO+GEO 差异化立足；Dogfooding 自证效果 |
| GEO 可见性追踪技术难度 | 中 | Phase 3 T3-05 延期 | 先支持 Perplexity（有 API），ChatGPT/Gemini 用网页抓取方案；后续切换到官方 API |
| 种子用户获取困难 | 中 | PMF 验证延迟 | 先 dogfooding 自证效果；用 Agent 在出海社群做内容营销（吃自己的狗粮） |

---

## 八、验收标准总览

| Phase | 核心验收条件 |
|-------|-------------|
| **Phase 1** | 所有出海 Agent 可执行；Scheduler 内容生成全链路跑通；输入品牌 brief → 4+ 平台内容 + SEO/GEO 建议存入数据库；UI 可查看 |
| **Phase 2** | X 发帖 + Email 发送走通；审批→发布→状态回写闭环正确；至少 3 个平台 MCP 通过测试 |
| **Phase 3** | 数据自动回收；Analyst ROI 报告可在 Dashboard 查看；Content Agent 基于 Winning Patterns 内容质量有可量化提升；GEO 可见性有追踪数据 |
| **Phase 4** | Landing Page Lighthouse > 90；Onboarding 可走通；Stripe 支付测试通过；SEO/OG 完整 |
| **Phase 5** | 10 个种子用户注册；Product Hunt 发布且 Top 5；至少 1 个付费转化 |

---

## 九、时间线总览

```
Week 1-2   ║ Phase 1: Agent 全员就绪 + 内容生成链路
           ║  ├─ @DEV: 补齐 7 个 Agent 代码 + Schema + Scheduler + CEO SOP
           ║  ├─ @Designer: Dashboard/Publishing UI 适配出海
           ║  ├─ @QA: 集成测试
           ║  └─ 并行：提交 Meta/X API 申请（为 Phase 2 提前准备）
           ║
Week 3-5   ║ Phase 2: 平台 API 集成 — 内容发布能力
           ║  ├─ @DEV: X API + SendGrid + LinkedIn + Meta API MCP 服务
           ║  ├─ @DEV: 发布引擎 + Webhook + OAuth
           ║  ├─ @Designer: 平台管理 + Publishing 升级
           ║  └─ @QA: 发布全链路测试
           ║
Week 6-7   ║ Phase 3: 数据飞轮 + Dashboard 升级
           ║  ├─ @DEV: 数据回收 + Analyst 升级 + 飞轮闭环 + GEO 追踪
           ║  ├─ @Designer: Dashboard 改版 + Analytics 升级
           ║  └─ @QA: 飞轮验证测试（连续 3 天运行）
           ║
Week 8-9   ║ Phase 4: Landing Page + GTM 准备
           ║  ├─ @Researcher: LP 竞品调研
           ║  ├─ @PM: 文案策划（5 大卖点 + 定价）
           ║  ├─ @Designer: LP 设计
           ║  ├─ @DEV: 开发 + Stripe + Onboarding
           ║  └─ @QA: 上线部署
           ║
Week 10+   ║ Phase 5: 增长 + 商业化（持续）
           ║  ├─ Dogfooding（用自己的产品做出海营销）
           ║  ├─ Product Hunt Launch
           ║  ├─ 种子用户 → PMF 验证
           ║  └─ 持续迭代（根据用户反馈排优先级）
```

---

## 十、立即行动项

T1-01 调研已完成。当前最优先启动：

| 序号 | 行动 | 负责人 | 备注 |
|------|------|--------|------|
| 1 | 补齐 7 个 Agent 代码（T1-02~T1-07） | @DEV | 核心路径，最高优先级 |
| 2 | 更新 platforms.yaml + schema.sql（T1-08~T1-09） | @DEV | 与 Agent 开发并行 |
| 3 | 提交 Meta/X API 开发者申请 | @DEV / @PM | 为 Phase 2 提前准备，审核需 2-4 周 |
| 4 | Dashboard/Publishing UI 出海适配方案 | @Designer | Phase 1 UI 部分 |
| 5 | Phase 1 测试用例准备 | @QA | 基于验收标准编写 |

**等用户确认本方案后，即可正式启动 Phase 1。**
