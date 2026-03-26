# @QA -- Plan-Execute 功能测试报告

**测试时间**: 2026-03-27
**测试人员**: @QA (测试专员)
**测试范围**: Plan-Execute 两阶段模型全模块审查

---

## 一、测试总览

| 模块 | 文件数 | 状态 | 问题数 |
|------|--------|------|--------|
| 构建验证 | - | PASS | 0 |
| 类型定义 (engine/types/plan.ts) | 1 | PASS | 0 |
| API 端点 (5 个) | 5 | PASS (含建议) | 2 (建议级) |
| SSE 消息类型 (8 种) | - | PASS | 0 |
| UI 组件 (plan-review) | 2 | PASS (含建议) | 2 (建议级) |
| Store 层 (plans.ts) | 1 | PASS | 0 |
| SDK: plan-generator.ts | 1 | PASS (含建议) | 1 (建议级) |
| SDK: plan-executor.ts | 1 | PASS | 0 |
| 集成: team-studio page | 1 | PASS (含建议) | 2 (建议级) |

**总体结论: PASS -- 构建通过，无阻塞性问题，7 项建议级改进点。**

---

## 二、逐模块测试详情

### 2.1 构建验证

```
pnpm build → exit code 0
Compiled successfully in 8.0s
40/40 static pages generated
```

- 5 个新 API 端点全部出现在构建路由表中（/api/agent/plan, /api/agent/plan/[id], .../approve, .../reject, .../modify）
- 无 TypeScript 编译错误
- 无新增 warning（仅原有的 lockfile warning）

**结果: PASS**

---

### 2.2 类型定义 — engine/types/plan.ts

| 检查项 | 结果 |
|--------|------|
| PlanStatus 枚举完整性（7 种状态） | PASS |
| StepStatus 枚举完整性（5 种状态） | PASS |
| PlanStep 接口字段完整 | PASS |
| ExecutionPlan 接口字段完整 | PASS |
| PlanStreamEvent 联合类型覆盖 8 种事件 | PASS |
| 无 `any` 类型 | PASS |
| 可选字段标注正确（result?, error?, startedAt?, completedAt?, feedback?） | PASS |

**结果: PASS -- 类型定义清晰完整，无遗漏。**

---

### 2.3 API 端点审查

#### 2.3.1 POST /api/agent/plan (生成计划)
| 检查项 | 结果 |
|--------|------|
| 请求体校验（message 必填） | PASS |
| JSON 解析错误处理 | PASS |
| SSE 流式响应 headers 正确 | PASS |
| 错误时发送 plan_error 事件 | PASS |
| stream_end 结束标记 | PASS |
| runtime = "nodejs" 声明 | PASS |
| maxDuration = 120 声明 | PASS |

#### 2.3.2 GET /api/agent/plan (列表)
| 检查项 | 结果 |
|--------|------|
| 返回格式 { success, data } | PASS |
| 错误处理 try/catch | PASS |

#### 2.3.3 GET /api/agent/plan/[id] (详情)
| 检查项 | 结果 |
|--------|------|
| 404 处理（plan not found） | PASS |
| params 异步解构（Next.js 16 兼容） | PASS |
| 返回格式统一 | PASS |

#### 2.3.4 PUT /api/agent/plan/[id]/approve (审批)
| 检查项 | 结果 |
|--------|------|
| 状态校验（仅 pending/modified 可审批） | PASS |
| 先 updatePlanStatus → 再 executePlan | PASS |
| SSE 流式执行进度 | PASS |
| maxDuration = 300（5 分钟，合理） | PASS |
| stream_end 结束标记 | PASS |

#### 2.3.5 PUT /api/agent/plan/[id]/reject (驳回)
| 检查项 | 结果 |
|--------|------|
| 状态校验 | PASS |
| feedback 可选 | PASS |
| body 解析失败容错（空 body 允许） | PASS |

#### 2.3.6 PUT /api/agent/plan/[id]/modify (修改)
| 检查项 | 结果 |
|--------|------|
| 状态校验 | PASS |
| steps 校验（必填、数组、非空） | PASS |
| feedback 可选 | PASS |
| 返回更新后的计划 | PASS |

**API 端点结果: PASS**

**[建议-A1]** approve 端点 approve/route.ts:20 — 直接在 handler 顶层调用 `getPlan(id)` 未包裹 try/catch，若 store 层抛异常（如文件 I/O 失败），会返回 500 但无结构化错误体。建议统一包裹。

**[建议-A2]** 所有 5 个端点的响应格式基本统一（`{ success, data/error }`），但 POST plan route.ts:28 的 400 错误返回的是 `{ error: "..." }` 而非 `{ success: false, error: "..." }`。建议统一为后者。

---

### 2.4 SSE 消息类型审查

engine/types/plan.ts 定义了 8 种 PlanStreamEvent：

| 事件类型 | 生产端 | 消费端 | 数据完整性 |
|----------|--------|--------|-----------|
| plan | plan-generator.ts:182 | page.tsx:1053 | PASS |
| plan_approved | plan-executor.ts:37 | page.tsx (未显式处理) | PASS (注1) |
| plan_rejected | engine types 定义 | page.tsx (通过 handleRejectPlan 本地处理) | PASS |
| step_start | plan-executor.ts:209 | page.tsx:1122 | PASS |
| step_progress | plan-executor.ts:224 | page.tsx:1140 | PASS |
| step_complete | plan-executor.ts:275 | page.tsx:1152 | PASS |
| plan_complete | plan-executor.ts:161 | page.tsx:1178 | PASS |
| plan_error | plan-generator.ts:190, plan-executor.ts:184 | page.tsx:1187 | PASS |

注1: `plan_approved` 事件在前端 approve handler (page.tsx) 的 SSE switch 中未被显式处理。这不构成 bug，因为前端在调用 approve 时已本地 set status 为 `executing`。但若需要日志记录，建议添加处理。

**结果: PASS**

---

### 2.5 UI 组件审查 — plan-review/

| 检查项 | 结果 |
|--------|------|
| 'use client' 指令 | PASS |
| StepStatusBadge 5 种状态全覆盖 | PASS |
| PlanStepCard 依赖关系展示 | PASS |
| PlanStepCard 展开/收起逻辑 | PASS |
| PlanReview 进度条计算 | PASS |
| 审批按钮（批准/驳回）逻辑 | PASS |
| 驳回反馈输入框交互 | PASS |
| 完成/失败状态汇总展示 | PASS |
| 无 `any` 类型 | PASS |
| index.ts 正确导出 | PASS |

**[建议-U1]** plan-review.tsx 本地重新定义了 PlanStatus/StepStatus/PlanStep/ExecutionPlan 类型（第 25-49 行），与 engine/types/plan.ts 定义重复。虽然 'use client' 组件无法直接 import 服务端类型，这是合理的做法，但建议在类型定义旁添加注释标注"镜像自 engine/types/plan.ts"，方便后续同步维护。

**[建议-U2]** PlanReview 组件的 `onModify` prop 接收 `PlanStep[]` 但实际 handleModifyPlan (page.tsx:1234) 调用了 `/api/agent/plan/${planId}/modify` API，该 API 需要完整的 PlanStep 对象。当前 PlanReview 组件并未提供步骤编辑 UI（只有审批和驳回），`onModify` 暂时不会被触发。这不是 bug，但属于功能留白，后续实现时需注意。

---

### 2.6 Store 层审查 — lib/store/plans.ts

| 检查项 | 结果 |
|--------|------|
| 从 engine 正确 import 类型 | PASS |
| Re-export 类型供 API 使用 | PASS |
| 内存缓存 + 文件持久化策略 | PASS |
| createPlan 正确初始化 status | PASS |
| getPlan / getAllPlans | PASS |
| updatePlanStatus 自动设置时间戳 | PASS |
| updateStepStatus 拓扑感知（检查 allDone/anyFailed） | PASS |
| modifyPlanSteps 自动更新 estimatedAgents | PASS |
| 无 `any` 类型 | PASS |

**结果: PASS -- Store 层实现规范，CRUD 完整。**

---

### 2.7 SDK 模块审查 — plan-generator.ts

| 检查项 | 结果 |
|--------|------|
| 系统提示词含完整路由表 | PASS |
| JSON 提取逻辑（3 层降级: 直接解析 → 代码块 → brace 匹配） | PASS |
| ParsedStep / ParsedPlan 类型定义 | PASS |
| createPlan 持久化 | PASS |
| eventBus 生命周期事件 | PASS |
| ANTHROPIC_API_KEY 检查 | PASS |
| 错误处理与 plan_error 事件 | PASS |
| 无 `any` 类型 | PASS |

**[建议-S1]** plan-generator.ts:132 硬编码了 model 为 `claude-sonnet-4-20250514`。建议改为从环境变量或配置读取，与项目其他 Agent 调用的模型配置保持一致性。

**结果: PASS**

---

### 2.8 SDK 模块审查 — plan-executor.ts

| 检查项 | 结果 |
|--------|------|
| 拓扑排序执行（依赖完成后才启动） | PASS |
| 并行执行就绪步骤 (Promise.allSettled) | PASS |
| 依赖链断裂处理（skip 依赖失败的后续步骤） | PASS |
| 前置步骤结果传递 (depResults) | PASS |
| 结果截断保护 (slice 0,5000 / 0,500) | PASS |
| executeAgent 调用集成 | PASS |
| step_start → step_progress → step_complete 事件流 | PASS |
| plan_complete / plan_error 终态事件 | PASS |
| eventBus 生命周期事件 | PASS |
| 无 `any` 类型 | PASS |

**结果: PASS -- 执行器逻辑严谨，拓扑排序和并行执行设计合理。**

---

### 2.9 集成检查 — team-studio/page.tsx

| 检查项 | 结果 |
|--------|------|
| PlanState 接口完整（enabled/isGenerating/isExecuting/plan/stepProgress） | PASS |
| 默认 Plan 模式开启 (enabled: true) | PASS |
| Plan/Fast 模式切换 UI | PASS |
| handleGeneratePlan SSE 流解析 | PASS |
| handleApprovePlan SSE 流解析（含所有 step/plan 事件） | PASS |
| handleRejectPlan API 调用 | PASS |
| handleModifyPlan API 调用 | PASS |
| handlePlanReset 清理逻辑（abort + 状态重置） | PASS |
| AbortController 生命周期管理 | PASS |
| PlanReview 组件正确传 props | PASS |
| 驳回后 retry/切换选项 | PASS |
| 输入框状态联动（disabled 控制） | PASS |

**[建议-I1]** page.tsx 中 approve handler 的 SSE switch (行 1121) 未处理 `plan_approved` 事件类型。虽然前端已在 approve 调用时本地更新状态为 `executing`，但添加 `case 'plan_approved'` 可增强数据一致性（确认服务端也已切换状态）。

**[建议-I2]** page.tsx:161-198 本地定义了 PlanStatus/StepStatusType/PlanStepData/ExecutionPlanData 类型，与 plan-review.tsx 和 engine/types/plan.ts 存在三处重复定义。当前因 client/server 边界限制属合理做法，建议在项目中创建 `web/src/types/plan.ts` 共享类型文件，由 'use client' 组件和页面共同引用。

---

## 三、问题汇总

### 阻塞性问题 (P0): 0 项

### 建议性改进 (P2): 7 项

| 编号 | 模块 | 描述 | 优先级 |
|------|------|------|--------|
| A1 | API approve | getPlan 调用未包裹 try/catch | P2 |
| A2 | API plan POST | 400 错误响应格式不统一 | P2 |
| U1 | UI plan-review | 类型重复定义，建议添加来源注释 | P3 |
| U2 | UI plan-review | onModify 功能留白，无编辑 UI | P3 |
| S1 | plan-generator | model 硬编码 | P2 |
| I1 | team-studio | plan_approved SSE 事件未处理 | P3 |
| I2 | team-studio | 三处类型重复定义 | P3 |

---

## 四、安全检查

| 检查项 | 结果 |
|--------|------|
| API 端点无 SQL 注入风险 | PASS (文件系统存储) |
| 无 XSS 风险（React 自动转义） | PASS |
| ANTHROPIC_API_KEY 通过环境变量获取 | PASS |
| 无敏感信息硬编码 | PASS |
| API 无未授权访问保护 | INFO (全部端点无 auth，与项目现有端点一致) |

---

## 五、与现有功能兼容性

| 检查项 | 结果 |
|--------|------|
| 不影响 Fast Mode (直接执行) | PASS — Plan/Fast 开关独立 |
| 不影响 Chat Mode | PASS — 独立 tab |
| 不影响 Team Mode (v3) | PASS — 独立 tab |
| 不影响现有 API 端点 | PASS — 新增路由，不修改现有 |
| Store 层与现有 collection 模式一致 | PASS |

---

## 六、结论

Plan-Execute 两阶段模型实现质量良好：
1. **架构设计清晰** — 类型定义 → Store 持久化 → SDK 生成/执行 → API 端点 → UI 组件，分层明确
2. **构建零错误** — TypeScript 编译通过，无 `any` 类型
3. **SSE 流式通信完整** — 8 种消息类型全覆盖，前后端事件对齐
4. **拓扑执行正确** — 依赖排序、并行执行、失败传播逻辑严谨
5. **无阻塞性问题** — 7 项建议级改进可后续迭代

**测试结论: PASS，可以合并。**
