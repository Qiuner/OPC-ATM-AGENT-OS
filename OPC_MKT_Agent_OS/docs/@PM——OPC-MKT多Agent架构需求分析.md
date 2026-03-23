# OPC MKT Agent OS — 多Agent协作架构需求分析

> **完成时间**: 2026-03-20
> **参与人员**: @PM（需求分析）
> **文档版本**: v1.0
> **状态**: 待老板确认

---

## 1. 项目现状诊断

### 1.1 当前代码结构

| 模块 | 路径 | 状态 | 说明 |
|------|------|------|------|
| Python 原型 | `src/` | 静态展示 | 3 个 stub agent（planner/writer/publisher），硬编码模板，未接 LLM |
| Agent 引擎 | `engine/` | 可运行 | TypeScript，CEO / XHS / Analyst 三个 Agent，使用 Claude Agent SDK |
| Web 平台 | `web/` | 可运行 | Next.js 15，OpenClaw API Gateway（8 个端点），工作流状态机 |
| Agent Chat | `agent-chat/` | 可运行 | 独立对话 UI，预设心理学家/营销大师等知识型 Agent |

### 1.2 关键发现：系统已具备多Agent协作能力

**当前 Agent 是真正可运行的，不是静态展示。** 具体证据：

1. **engine/agents/** 目录包含完整的 Agent 实现：
   - `ceo.ts` — CEO Agent，负责决策和调度子 Agent
   - `xhs-agent.ts` — 小红书内容创作专家，加载 SKILL.md SOP
   - `analyst-agent.ts` — 数据飞轮引擎，分析 Top 20% 内容
   - `bridge.ts` — Agent 间通信桥接

2. **web/src/app/api/openclaw/** 是完整的 API Gateway：
   - `route.ts` — 指令接收 + 工作流编排
   - `callback/` — 飞书事件订阅回调
   - `execute/` — 步骤执行引擎
   - `intervention-callback/` — 人工审核回调
   - `workflow-status/` — 工作流状态查询

3. **已有 252+ 次工作流执行记录**，成功率 >90%

4. **src/ 下的 Python 原型是初期 PoC**，已被 engine/ 的 TypeScript 实现取代

### 1.3 当前架构模式

系统已实现 **Supervisor Pattern**（对标 Polsia）：

```
CEO Agent（编排调度器）
├── XHS Agent（小红书内容专家）
├── Analyst Agent（数据飞轮引擎）
└── [未来扩展位]
```

特点：
- CEO Agent 不写内容，只做决策和调度
- 子 Agent 可独立运行也可协同
- 通过 Claude Agent SDK 的 `agents` 参数调度
- 每个 Agent 有独立的 SKILL.md（活文档 SOP）

---

## 2. 用户期望 vs 现状差距分析

### 2.1 用户期望的工作模式

参考 Claude Code 的 agents team 模式 + Polsia 的 Supervisor Pattern：

```
用户下达需求
    ↓
CEO Agent 理解意图 → 拆解任务 → 分配给专业 Agent
    ↓
多个 Agent 并行/串行执行
    ↓
关键节点人工确认（Intervention）
    ↓
汇总交付 + 飞书通知
```

### 2.2 差距分析

| 维度 | 现状 | 期望 | 差距 |
|------|------|------|------|
| Agent 数量 | 3个（CEO/XHS/Analyst） | 7+ 个专业 Agent | 缺少图片、播客、Email、X/Twitter、视频等专业 Agent |
| 工作流触发 | 飞书消息 + API 调用 | 多入口（Web UI、飞书、API、CLI） | Web UI 缺乏直觉式的 Agent 调度界面 |
| Agent 间通信 | 通过 bridge.ts 基础通信 | 结构化结果传递 + 状态广播 | 缺少统一的事件总线和状态同步 |
| 可观测性 | API 层面的工作流状态 | 像 Polsia Live 一样的实时 Agent Monitor | agent-chat 有基础监控，但未与 engine 深度集成 |
| 内容类型 | 小红书为主 | 7 种内容类型（图片/推文/小红书/播客/Email/视频/自动化管线） | 需要扩展 Agent 和工具链 |
| 自动化管线 | 手动触发 → 执行 → 通知 | 基于用户工作流的自动化 Pipeline（定时/事件驱动） | scheduler.ts 存在但功能有限 |

---

## 3. 架构模式评估

### 3.1 三种候选架构

#### 方案 A：扁平 Agent 池（Flat Pool）

```
用户 → Router → Agent 1 / Agent 2 / Agent 3 ...
```

- 优点：简单直接，适合独立任务
- 缺点：Agent 间无协作能力，无法处理跨 Agent 的复合任务
- 适用场景：每个任务只需要一个 Agent 的简单情况
- **评估：不推荐** — 内容营销天然需要多步骤协作

#### 方案 B：Supervisor Pattern（层级调度）-- 推荐

```
CEO Agent（Supervisor）
├── Strategist Agent
├── XHS Agent
├── X/Twitter Agent
├── Podcast Agent
├── Image Agent
├── Email Agent
├── Video Agent
└── Analyst Agent
```

- 优点：
  - 与现有架构一致（CEO + XHS + Analyst 已跑通）
  - 新增 Agent 只需注册到 CEO 的调度列表
  - 每个 Agent 独立 SOP（SKILL.md），可独立迭代
  - 参考 Polsia 已验证的模式
- 缺点：
  - CEO Agent 是单点瓶颈
  - 所有任务都经过 CEO 增加延迟
- **评估：强烈推荐** — 与现有代码最一致，增量开发成本最低

#### 方案 C：混合模式（Supervisor + Agent-to-Agent）

```
CEO Agent（Supervisor）
├── Content Team（XHS Agent ↔ Image Agent 直接协作）
├── Distribution Team（Publisher Agent ↔ Email Agent 直接协作）
└── Analytics Team（Analyst Agent → CEO Agent 反馈）
```

- 优点：减少 CEO 瓶颈，支持 Agent 间直接协作
- 缺点：架构复杂度高，调试难度大
- **评估：中期目标** — MVP 先用方案 B，验证后再引入 Agent-to-Agent 通信

### 3.2 推荐方案：Supervisor Pattern（方案 B）

**理由：**
1. **现有代码已实现此模式** — CEO/XHS/Analyst 三角已跑通 252+ 次
2. **增量扩展最容易** — 新 Agent 只需：创建 .ts 文件 + 编写 SKILL.md + 注册到 CEO
3. **与 Polsia 模式对标** — 已被市场验证（Polsia 两周 $200K → $2M ARR）
4. **Claude Agent SDK 原生支持** — SDK 的 `agents` 参数天然支持子 Agent 调度
5. **人机协作边界清晰** — CEO 统一管理 Intervention 节点

---

## 4. 用户交互流程设计

### 4.1 核心用户旅程

```
Step 1: 用户输入需求（自然语言）
        "帮我做一期关于 AI 工具的播客，同时生成小红书配套笔记和 X 推文"
            ↓
Step 2: CEO Agent 意图识别 + 任务拆解
        → Task 1: collect_materials（Strategist Agent）
        → Task 2: generate_podcast（Podcast Agent）——依赖 Task 1
        → Task 3: generate_xhs_note（XHS Agent）——依赖 Task 1
        → Task 4: generate_tweet（X Agent）——依赖 Task 1
        → Task 5: generate_poster（Image Agent）——依赖 Task 3
            ↓
Step 3: 并行执行（Task 2/3/4 可并行，Task 5 等 Task 3 完成）
        实时状态推送到 Web Monitor + 飞书群
            ↓
Step 4: Intervention 节点
        播客脚本生成后 → 推送预览 → 用户确认/修改
        小红书笔记生成后 → 推送预览 → 用户确认/修改
            ↓
Step 5: 后续处理
        播客 → TTS 合成音频
        小红书 → 配图生成 → 格式化导出
        X → 格式化为 Thread
            ↓
Step 6: 汇总交付
        飞书通知 + Web Dashboard 汇总 + 内容资产入库
```

### 4.2 三种入口统一

| 入口 | 触发方式 | 处理路径 |
|------|----------|----------|
| 飞书群 | `/指令 参数=值` | callback → 解析 → POST /api/openclaw |
| Web UI | Agent Chat 输入框 | chat-engine → POST /api/openclaw |
| CLI | `npx tsx cli/run.ts <command>` | http-client → POST /api/openclaw |

三种入口最终汇聚到同一个 API Gateway，确保行为一致。

---

## 5. MVP Agent 优先级排序

使用 MoSCoW 法则，结合 ROI 分析：

### Must Have（P0 — MVP 必须有）

| # | Agent | 理由 | 现状 |
|---|-------|------|------|
| 1 | CEO Agent | 核心调度器，所有任务的入口 | 已实现 |
| 2 | XHS Agent | 小红书是创始人主要获客渠道，搜索流量占 65%+ | 已实现 |
| 3 | Analyst Agent | 数据飞轮是核心差异化，让系统越用越聪明 | 已实现 |
| 4 | Podcast Agent | 已有完整链路（脚本→TTS→音频），是 Demo 亮点 | 工作流已实现，Agent 封装待完善 |

### Should Have（P1 — 紧随其后）

| # | Agent | 理由 | 依赖 |
|---|-------|------|------|
| 5 | Image Agent | 海报/配图是内容分发的必备素材 | 需要对接图片生成 API（nano-banana-pro） |
| 6 | X/Twitter Agent | 全球化分发渠道，推文格式相对简单 | 需要 X API 集成 |
| 7 | Strategist Agent | 自动生成周计划/内容日历 | 依赖 Analyst 的数据输入 |

### Could Have（P2 — 有余力再做）

| # | Agent | 理由 | 依赖 |
|---|-------|------|------|
| 8 | Email Agent | Cold outreach 场景，ROI 高但实现复杂 | 需要邮件服务集成 |
| 9 | Video Agent | 短视频制作，技术门槛最高 | 需要视频编辑 API |

### Won't Have（MVP 不做）

| Agent | 理由 |
|-------|------|
| 全自动发布 Agent | 风险太高，MVP 保持人工发布 |
| 多租户管理 Agent | 当前单用户场景，后期再考虑 |
| A/B 测试 Agent | 需要足够数据积累 |

---

## 6. 风险评估

### 6.1 多 Agent 协作的复合错误率

**风险等级：高**

单个 Agent 成功率 ~90%（根据现有数据），多 Agent 串行时：
- 2 个 Agent 串行：90% x 90% = 81%
- 3 个 Agent 串行：90% x 90% x 90% = 72.9%
- 5 个 Agent 混合：预估整体成功率 ~65-70%

**应对策略：**
- 每个 Agent 独立可重试（已有 `error` 状态 + retry 机制）
- 任务级别的失败不影响其他并行任务
- CEO Agent 负责错误处理和降级决策
- 关键步骤设置超时阈值（参考现有 33s 生成时间）

### 6.2 Token 成本

**风险等级：中**

| 场景 | 预估 Token 消耗 | 预估成本 |
|------|-----------------|----------|
| 单个 XHS 笔记 | ~3K input + ~1K output | ~$0.01 |
| 一期播客脚本 | ~8K input + ~6K output | ~$0.05 |
| CEO 调度一次完整任务 | ~5K input + ~2K output | ~$0.03 |
| 一天完整营销（7 篇内容） | ~50K input + ~30K output | ~$0.30 |
| 一周运营 | ~350K input + ~210K output | ~$2.10 |

**应对策略：**
- CEO Agent 的调度 prompt 精简化，避免传递过多上下文
- 子 Agent 只接收必要的上下文（不传全量 Context Vault）
- 非创作类操作（发布、通知）走 API 而不走 LLM
- 设置每日 Token 预算上限，超出后降级到基础模式

### 6.3 用户体验

**风险等级：中**

多 Agent 协作的延迟叠加可能影响体验：
- 当前播客全链路 ~5 分钟（含人工确认时间）
- 多 Agent 并行任务预估 ~3-8 分钟

**应对策略：**
- 可并行的 Agent 任务并行执行（不串行等待）
- 实时进度推送（每个 Agent 的状态变更即时通知）
- "快速模式" vs "精细模式"：用户可选择跳过部分 Intervention

### 6.4 架构复杂度

**风险等级：低（因为增量构建）**

- 现有 CEO + XHS + Analyst 三角已稳定运行
- 新增 Agent 的模式是固定的（.ts 文件 + SKILL.md + 注册到 CEO）
- Claude Agent SDK 封装了底层复杂性
- 风险点在于 Agent 间的数据传递格式需要标准化

---

## 7. 技术约束与建议

### 7.1 保持不变的部分

- **Claude Agent SDK** 作为核心运行时（@Researcher 调研报告已确认）
- **Supervisor Pattern** 架构（CEO 调度子 Agent）
- **工作流状态机**（queued → running → paused_for_intervention → completed）
- **SKILL.md 活文档** 机制（Agent SOP 持续进化）
- **人机协同** 设计（AI 干活，人类拍板）

### 7.2 需要新增的部分

1. **Agent 注册中心** — 统一的 Agent 发现和注册机制，CEO 可动态查询可用 Agent
2. **标准化工具接口** — 每个 Agent 的工具调用走统一的 MCP 协议
3. **任务依赖图** — 支持 DAG（有向无环图）描述任务间依赖关系
4. **统一事件总线** — agent-chat 的 event-bus 与 engine 的事件系统打通
5. **Agent Monitor 升级** — 从基础状态查询升级为实时事件流推送

### 7.3 不建议做的

- 不要引入 LangChain/LangGraph — 增加不必要的架构复杂度
- 不要做多模型切换 — MVP 阶段集中在 Claude 生态
- 不要做全自动发布 — 保持人机协同的安全边界

---

## 8. 下一步行动建议

### Phase 1：巩固现有 + 标准化（1-2 天）

1. 将 Podcast 工作流封装为独立的 Podcast Agent（`engine/agents/podcast-agent.ts`）
2. 定义 Agent 注册协议（Agent Registry）
3. 标准化 Agent 间的数据传递格式（AgentInput / AgentOutput 类型）
4. 完善 CEO Agent 的任务拆解能力（支持并行任务）

### Phase 2：扩展 Agent 池（2-3 天）

5. 实现 Image Agent — 对接已有的 nano-banana-pro 图片生成
6. 实现 X/Twitter Agent — 推文/Thread 生成
7. 实现 Strategist Agent — 自动生成内容日历

### Phase 3：增强可观测性（1-2 天）

8. Agent Monitor 实时面板（对标 Polsia Live）
9. 统一事件总线（engine ↔ web ↔ agent-chat 三端打通）
10. Agent 运行日志持久化 + 可回溯

### Phase 4：自动化管线（2-3 天）

11. 基于 scheduler.ts 实现定时工作流
12. 事件驱动的 Pipeline（内容发布 → 数据回收 → 自动优化）
13. 工作流模板系统（用户自定义 Pipeline）

---

## 9. 决策待确认项

| # | 决策项 | PM 建议 | 需要老板确认 |
|---|--------|---------|-------------|
| 1 | 架构模式 | Supervisor Pattern（与现有一致） | 是否同意 |
| 2 | MVP Agent 范围 | P0: CEO + XHS + Analyst + Podcast（4个） | 是否需要调整优先级 |
| 3 | P1 Agent 范围 | Image + X/Twitter + Strategist（3个） | 确认时间节奏 |
| 4 | Agent Monitor | 对标 Polsia Live 做实时面板 | 优先级是否调高到 P0 |
| 5 | 自动化管线 | 放在 Phase 4，MVP 后做 | 是否提前 |

---

*[@PM] | 2026-03-20*
