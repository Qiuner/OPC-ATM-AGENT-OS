# PRD - OPC_MKT_Agent_OS

## 0. 文档信息
- 版本：v0.1
- 日期：2026-03-10
- 产品负责人：Jayden / 湾区虾哥
- 目标读者：Claude Code Agent Team（产品/后端/前端/AI工程/运维）

---

## 1. 产品愿景
打造一套**老板可观测、可审计、可复盘**的多 Agent 营销操作系统（OS）。

系统面向一人公司和小团队：
- 把“产品、经验、内容、案例”沉淀为统一上下文资产
- 由多 Agent 协同生成营销策略和多平台内容
- 由人工审核后分发到各平台
- 回收数据并自动给出下一轮优化建议

一句话定位：
**让老板看得见执行过程、控得住内容风险、拿得到营销结果。**

---

## 2. 用户与角色

### 2.1 目标用户
1. 一人公司创始人（Founder-Operator）
2. 企业老板（个人IP+企业品牌双驱动）
3. 小型内容营销团队（2~10人）

### 2.2 角色权限
1. Owner（老板）
   - 查看全局仪表盘
   - 审批高风险内容
   - 查看所有Agent日志与ROI
2. Marketing Manager（运营负责人）
   - 创建Campaign
   - 分配任务、审核内容
3. Editor/Creator（编辑/内容执行）
   - 修改内容、提交审核、发布
4. Agent（系统内智能体）
   - 在授权范围读取上下文与生成内容
5. Auditor（审计/合规）
   - 只读日志、操作轨迹

---

## 3. 核心问题与目标

### 3.1 当前痛点
- 平台流量分散，内容与案例资产没有统一沉淀
- 内容生产靠人拍脑袋，节奏不稳定、质量波动大
- 老板看不到“谁做了什么、为什么这样做、效果如何”
- 内容发布存在合规风险（夸大承诺、敏感词、违规表达）

### 3.2 产品目标（MVP）
- T+14天内可跑通“策略→内容→审核→发布→复盘”闭环
- 单次可生成 7 天跨平台内容计划
- 内容必须经过人工审核后进入发布环节
- 老板可在看板看到任务状态、产出数量、基础结果指标

### 3.3 非目标（MVP阶段不做）
- 全自动无人审核发布
- 深度广告投放优化（出价策略、自动投放）
- 复杂CRM成交归因（先做轻量线索归因）

---

## 4. 功能范围

## 4.1 模块A：Context Vault（上下文资产库）
### 目标
统一管理可复用营销上下文，避免每次从零开始。

### 功能
- 产品资产管理：卖点、价格、FAQ、案例、证明材料
- 品牌资产管理：品牌语气、禁用词、视觉规范
- 受众资产管理：人群画像、常见问题、反对意见
- 内容资产管理：历史帖子、爆款模板、失败样本

### 验收标准
- 支持JSON导入导出
- 每条资产有版本号与更新时间

## 4.2 模块B：Agent Studio（Agent编排）
### Agent清单（MVP）
1. Strategist Agent：输出周计划/活动策略
2. Writer Agent：输出多平台草稿
3. Publisher Agent：输出发布队列（先人工发布）
4. Analyst Agent：输出基础复盘（可选MVP+）

### 验收标准
- 一键执行工作流：context -> plan -> drafts -> publish_pack
- 每个Agent产出留痕（输入/输出/时间/状态）

## 4.3 模块C：Task Board（执行看板）
### 功能
- 状态流转：Backlog / Draft / Review / Approved / Scheduled / Published
- 每个任务显示：负责人、截止时间、平台、优先级、风险等级

### 验收标准
- 支持筛选（平台、状态、负责人）
- 每个任务都有完整操作日志

## 4.4 模块D：Approval Center（审核中心）
### 功能
- 对比草稿版本（Agent原稿 vs 人工修改）
- 审核操作：通过/退回/备注
- 敏感表达规则检测（如“保证收益”）

### 验收标准
- 未审核内容不可进入发布队列
- 审核动作可追踪到人

## 4.5 模块E：Publishing Hub（发布中心）
### 功能
- 多平台格式化导出：XHS/抖音/视频号/X/即刻
- 输出“待发布包”（标题、正文、标签、素材需求、CTA）
- 可设置发布时间建议

### 验收标准
- 至少支持JSON/Markdown双格式导出

## 4.6 模块F：Analytics（基础复盘）
### 功能（MVP轻量）
- 手动回填指标：曝光、互动、私信、线索
- 自动生成“下周优化建议”

### 验收标准
- 每周可生成1份复盘报告

---

## 5. 关键用户流程

### 5.1 典型流程（老板视角）
1. 录入品牌和产品上下文
2. 发起“7天增长活动”
3. Agent生成策略和内容草稿
4. 运营审核并修改
5. 导出发布包并执行发布
6. 回填数据并查看复盘

### 5.2 失败/异常流程
- 若敏感词触发 -> 进入风险队列，禁止发布
- 若Agent失败 -> 标记失败并允许重试
- 若内容质量不达标 -> 退回到Writer Agent二次生成

---

## 6. 数据模型（MVP最小表）

1. `users`
- id, role, name, email, created_at

2. `workspaces`
- id, name, owner_id, created_at

3. `context_assets`
- id, workspace_id, type(product/brand/audience/content), payload_json, version, updated_at

4. `campaigns`
- id, workspace_id, name, goal, start_date, end_date, status

5. `tasks`
- id, campaign_id, platform, topic, status, assignee_type(human/agent), assignee_id, due_at

6. `agent_runs`
- id, task_id, agent_name, input_ref, output_ref, status, started_at, ended_at, error

7. `contents`
- id, task_id, platform, title, body, cta, risk_score, version, status

8. `approvals`
- id, content_id, reviewer_id, action(approve/reject/revise), comment, created_at

9. `metrics`
- id, content_id, impressions, engagements, inquiries, leads, created_at

---

## 7. API（建议）

### Context
- `POST /api/context/import`
- `GET /api/context`
- `PUT /api/context/:id`

### Campaign
- `POST /api/campaigns`
- `GET /api/campaigns/:id`

### Agent
- `POST /api/agents/run`（触发策略/内容生成）
- `GET /api/agent-runs/:id`

### Content & Approval
- `GET /api/contents?status=review`
- `POST /api/contents/:id/approve`
- `POST /api/contents/:id/reject`

### Publish
- `POST /api/publish/export`

### Metrics
- `POST /api/metrics/bulk`
- `GET /api/reports/weekly`

---

## 8. UI信息架构（Web控制台）

1. Dashboard（老板首页）
- 本周目标达成率
- 内容产出总量
- 待审核数量
- 平台表现排行

2. Context Vault
- 产品库 / 案例库 / 语气规范 / 禁用词

3. Campaigns
- 活动列表与详情

4. Task Board
- 看板式状态管理

5. Approval Center
- 待审稿件、版本对比、风险提示

6. Publishing Hub
- 导出发布包、发布日历

7. Analytics
- 周报、月报、优化建议

---

## 9. 技术架构建议

### 9.1 技术栈（建议）
- 前端：Next.js + Tailwind + shadcn/ui
- 后端：FastAPI 或 NestJS
- 数据库：PostgreSQL
- 队列：Redis + Celery/BullMQ
- 对象存储：S3兼容
- LLM接入：OpenAI/Anthropic/Gemini（抽象Provider层）

### 9.2 Agent执行模型
- 事件驱动（CampaignCreated -> PlanGenerated -> DraftGenerated）
- 每个Agent独立可重试
- 所有中间产物落盘可追溯

### 9.3 安全与合规
- RBAC权限
- 内容审核前禁止外发
- 审计日志不可篡改（append-only）
- API key加密存储

---

## 10. 指标体系（MVP）

### 北极星指标
- 每周有效线索数（Qualified Leads / week）

### 过程指标
- Agent草稿通过率
- 从策略到发布的平均时长
- 每周内容产出量
- 平台互动率

### 结果指标
- 咨询量
- 成交线索数
- 单线索成本（人工+工具）

---

## 11. 里程碑计划

### Sprint 1（第1周）
- Context Vault
- Strategist + Writer + Publisher骨架
- CLI跑通一键生成

### Sprint 2（第2周）
- Task Board + Approval Center（简版）
- 导出发布包
- 周报生成

### Sprint 3（第3-4周，可选）
- Web控制台完善
- 指标回填自动化
- 多租户与权限细化

---

## 12. 验收标准（Definition of Done）
1. 可从上下文生成7天计划与多平台内容草稿
2. 所有内容必须有审核记录
3. 能导出可发布内容包（含CTA）
4. 老板仪表盘可查看进度与基础结果
5. 输出可复用的周复盘报告

---

## 13. 风险与应对
- 风险：内容质量不稳定
  - 应对：引入模板、few-shot、人工评分阈值
- 风险：平台规则变化
  - 应对：平台规则配置化，支持热更新
- 风险：过度自动化导致失控
  - 应对：强制审核、风险词拦截、发布白名单

---

## 14. 给 Claude Code Agent Team 的执行指令（建议）
1. 先按MVP做“可跑通闭环”，不要先做大而全
2. 保证所有Agent执行可重放、可追踪
3. 先完成“手动发布包导出”，再接自动发布API
4. UI优先做看板和审核，不要先做花哨营销页
5. 每个Sprint输出可演示版本与真实样例数据
