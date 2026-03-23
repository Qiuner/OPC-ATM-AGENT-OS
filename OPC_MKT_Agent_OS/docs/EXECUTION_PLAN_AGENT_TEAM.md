# EXECUTION PLAN - Claude Code Agent Team

基于：
1) `docs/PRD_OPC_MKT_Agent_OS.md`
2) 开源编排框架 `paperclipai/paperclip`

目标：在 14 天内交付可演示、可运行的 MVP：
- Context Vault
- 多 Agent 工作流（Strategist/Writer/Publisher）
- 审核中心（人工把关）
- 发布包导出（多平台格式）
- 老板可视化看板（基础版）

---

## 0. 总体技术策略

- **Paperclip 作为控制平面**：任务编排、Agent调度、审计与治理
- **OPC 业务层独立实现**：营销上下文、内容模板、平台适配、指标模型
- **先手动发布后自动发布**：MVP 阶段不做全自动外发，降低平台风控风险

---

## 1. 团队分工（建议 5 个 Agent）

### A. Architect Agent
- 负责整体架构、模块边界、接口契约
- 输出：架构图、模块依赖图、技术决策记录（ADR）

### B. Backend Agent
- 负责 API、数据库、任务状态流转、导出服务
- 输出：后端服务 + 数据表 + OpenAPI 文档

### C. Frontend Agent
- 负责 Dashboard / Task Board / Approval Center
- 输出：可用管理后台

### D. AI Workflow Agent
- 负责 Strategist/Writer/Publisher 的 Prompt 与执行链路
- 输出：多 Agent 产出质量可控流程

### E. QA + Ops Agent
- 负责测试、验收脚本、部署脚本、日志监控
- 输出：测试报告 + 一键启动部署说明

---

## 2. 迭代计划（14天）

## Sprint 1（D1-D4）：底座搭建 + 最小闭环

### 任务
1. 拉起 Paperclip 本地环境
2. 新建 OPC 业务服务（可独立 Node/FastAPI）
3. 建立最小数据模型（users/workspaces/context_assets/campaigns/tasks/contents/approvals）
4. 打通工作流：
   - 导入上下文
   - 生成周计划（Strategist）
   - 生成草稿（Writer）
   - 导出发布包（Publisher）

### 验收
- CLI 或 API 可一键跑通闭环
- 输出 `marketing_plan.md` + `content_pack.json`

---

## Sprint 2（D5-D9）：审核中心 + 看板 + 风控规则

### 任务
1. 实现 Task Board（状态流转）
2. 实现 Approval Center（通过/退回/备注）
3. 增加内容风险检查（敏感表达规则）
4. 接入 Paperclip 任务状态同步（task/agent_runs）

### 验收
- 未审核内容不能进入发布队列
- 每条内容有完整审计日志（谁生成、谁改、谁审）

---

## Sprint 3（D10-D14）：多平台格式化 + 复盘报告 + Demo

### 任务
1. 平台适配模板（XHS/抖音/视频号/X/即刻）
2. 指标回填与周报生成
3. 老板仪表盘（目标达成、产出、待审、表现）
4. 全链路演示脚本（从Campaign创建到周报）

### 验收
- 生成 7 天内容计划 + 5 平台发布草稿
- 生成可读周报（高表现主题/下周建议）

---

## 3. 模块拆解（可直接建任务）

## 3.1 Backend 任务
- [ ] DB migration（Postgres）
- [ ] Context API：import/list/update/version
- [ ] Campaign API：create/get/list
- [ ] Agent Run API：run/status/logs
- [ ] Content API：list/update/version
- [ ] Approval API：approve/reject
- [ ] Publish Export API：json/md
- [ ] Metrics API：bulk upload + weekly report

## 3.2 Frontend 任务
- [ ] Dashboard 页面
- [ ] Context Vault 页面
- [ ] Campaign 页面
- [ ] Task Board 页面
- [ ] Approval Center 页面
- [ ] Publishing Hub 页面
- [ ] Analytics 页面

## 3.3 AI Workflow 任务
- [ ] Strategist Prompt v1（输出周节奏）
- [ ] Writer Prompt v1（平台化改写）
- [ ] Publisher Formatter（平台格式规则）
- [ ] Risk Filter（禁用词/夸大承诺）
- [ ] Prompt 评估样本集（10条基准）

---

## 4. 与 Paperclip 的集成方式

## 4.1 建议集成边界
- Paperclip 管：
  - agent 生命周期
  - 调度与任务编排
  - 审计与预算治理
- OPC 服务管：
  - 营销业务数据模型
  - 平台内容模板
  - 发布包导出
  - KPI 和复盘逻辑

## 4.2 集成模式
- OPC 服务通过 API 被 Paperclip 的 agent 调用
- 每次 agent run 回写：task_id / run_id / output_ref / status
- 审核结果回写到任务系统，触发下一节点

---

## 5. 质量标准（DoD）

每个任务必须满足：
1. 有单元测试或最小验收脚本
2. 有日志和错误码
3. 有输入输出样例
4. 能在 staging 环境复现
5. 更新对应文档（API/流程图）

---

## 6. 风险控制

1. 平台封禁风险：
- MVP 禁止自动外发，采用“导出 + 人工发布”

2. 内容合规风险：
- 上线前必须通过风险规则 + 人工审核

3. 成本失控风险：
- 设定 agent budget + 每日调用上限

4. 架构耦合风险：
- 保留 `OrchestrationAdapter` 抽象层，避免绑定单一框架

---

## 7. 每日站会模板（给 Agent Team）

- 昨天完成：
- 今天计划：
- 阻塞项：
- 需要 Owner 决策：
- 风险提示：

---

## 8. 交付件清单（第14天）

1. 可运行系统（本地/测试环境）
2. 演示账号与样例数据
3. API 文档 + 架构文档
4. 操作手册（老板视角 / 运营视角）
5. 下阶段路线图（自动发布、深度归因、插件化）

---

## 9. 给 Claude Code Agent Team 的启动指令（可直接贴）

你们将基于 `paperclipai/paperclip` + `PRD_OPC_MKT_Agent_OS.md` 开发 OPC 营销操作系统 MVP。

硬约束：
1) 先闭环，后完善；先手动发布，后自动发布。
2) 审核中心必须优先级最高（任何内容无审核不得发布）。
3) 所有 Agent 运行必须可追踪、可重放、可审计。
4) 每 2 天提交一次可演示版本（不是只交代码）。
5) 不做与 MVP 无关的过度工程。

第一阶段（48小时）必须交付：
- 可跑通 `context -> plan -> drafts -> export_pack` 的端到端流程
- 最小 API 与最小前端页面（可查看结果）
- 任务拆解与下阶段工期评估
