# Phase 1.5 PRD — 审批中心优化与内容流水线可视化

> 完成时间：2026-03-24
> 参与人员：@PM（需求分析 & 任务拆解）
> 优先级：**紧急** — 优先于 Phase 2

---

## 1. 背景与目标

### 背景
Phase 1（出海适配）已完成并通过验收。老板使用后反馈 3 个核心体验问题：
1. 内容从生成到发布的端到端流程不清晰，用户无法直观看到当前状态
2. Approval Center 只有手动审批，缺少自动审批能力（Brand Reviewer Agent 审核通过的应自动放行）
3. Approval Center 交互效率不够（缺少删除、批量操作不够顺畅）

### 目标
- 用户能在一个视图中看到内容从生成 → 审核 → 发布的完整流水线状态
- 支持自动审批（Agent 评分 >= 7 分自动通过）+ 手动审批双模式，可在 Settings 切换
- Approval Center 交互体验达到生产级标准（全选、批量操作、删除）

### 成功指标
- 流水线状态一目了然，用户无需切换多个页面
- 自动审批模式下，低风险内容零人工干预即可发布
- 批量操作支持 50+ 条记录无卡顿

---

## 2. 用户故事

**US-1**：作为营销团队负责人，我希望在 Approval Center 看到内容从生成到发布的完整流水线状态，以便随时掌握每条内容的进度。

**US-2**：作为营销团队负责人，我希望 Brand Reviewer Agent 评分高的内容自动通过审核，无需每条手动点击，以便将精力集中在需要人工判断的内容上。

**US-3**：作为营销团队负责人，我希望能批量选择内容进行通过/拒绝/删除操作，以便高效处理大量待审内容。

---

## 3. 功能规格

### 3.1 内容流水线状态可视化（Pipeline Status Bar）

**位置**：Approval Center 页面顶部，Tab 栏上方

**流程阶段**：
```
生成中(Generating) → 平台适配(Adapting) → AI审核(Reviewing) → 待审批(Pending) → 已通过(Approved) → 发布中(Publishing) → 已发布(Published)
```

**实现方式**：
- 横向 Pipeline 状态条，每个阶段显示当前该状态的内容数量
- 点击某个阶段可以筛选该阶段的内容
- 当前阶段高亮，已完成阶段有完成标记
- 每条内容在列表中也显示所处的 Pipeline 阶段标签

**数据来源**：
- 复用现有 Content 的 `status` 字段（draft → review → approved → published）
- 扩展增加 `pipeline_stage` 概念，映射关系：
  - `draft` → "生成中" / "平台适配"
  - `review` → "AI审核" / "待审批"
  - `approved` → "已通过" / "发布中"
  - `published` → "已发布"

### 3.2 自动审批 + 手动审批双模式

**审批模式**：
- **Auto（自动审批）**：Brand Reviewer Agent 评分 >= 7 分的内容自动标记为 approved，直接进入发布队列。评分 < 7 分或标记为高风险的内容保留为 pending，等待人工审批。
- **Manual（手动审批）**：所有内容都需要人工审批（当前行为）。

**模式切换**：
- Settings API 新增 `approval` 字段：`{ mode: "auto" | "manual", autoThreshold: 7 }`
- Approval Center 页面 Header 区域新增模式切换开关（Toggle Switch）
- 切换时弹出确认提示

**自动审批逻辑**：
- Content 的 metadata 中新增 `brandScore` 字段（number, 1-10）
- 当 `mode === "auto"` 且 `brandScore >= autoThreshold` 且无风险标记 → 自动 approved
- 自动审批的记录 `reviewer` 标记为 `"brand-reviewer-agent"`

### 3.3 Approval Center 交互优化

**3.3.1 删除功能**：
- 列表中每条记录增加删除按钮（trash icon）
- 删除前确认对话框
- 批量删除：选中多条后点击"批量删除"
- 删除调用 `DELETE /api/contents/[id]` API

**3.3.2 全选优化**：
- 当前已有"全选待审"checkbox — 保留
- 新增：Header 区域在有选中项时显示选中数量 + 批量操作栏（已有，优化交互）
- 批量操作栏增加"批量删除"按钮

**3.3.3 列表交互优化**：
- 列表项增加快速操作按钮（approve / reject / delete），hover 时显示
- 无需点开详情即可快速操作
- 操作按钮：绿色勾（approve）、红色叉（reject）、灰色垃圾桶（delete）

---

## 4. 数据结构变更

### Settings 扩展
```typescript
interface Settings {
  email?: { ... };  // 已有
  approval?: {
    mode: "auto" | "manual";  // 审批模式
    autoThreshold: number;     // 自动通过阈值，默认 7
  };
}
```

### Content metadata 扩展
```typescript
// content.metadata 新增字段
{
  brandScore?: number;      // Brand Reviewer 评分 1-10
  riskCheck?: string | {    // 已有
    passed?: boolean;
    warnings?: string[];
  };
  pipelineStage?: string;   // 流水线阶段标识
}
```

### API 变更
- `DELETE /api/contents/[id]` — 新增删除接口
- `PUT /api/settings` — 已有，用于保存 approval 配置
- `POST /api/contents/[id]/auto-approve` — 新增，自动审批触发接口

---

## 5. UI/UX 要求

### 5.1 Pipeline Status Bar
- 位置：页面顶部，"Approval Center" 标题下方
- 样式：横向步骤条，每步骤间有连接线
- 活跃阶段使用 purple 渐变高亮，其余阶段使用 rgba(255,255,255,0.1)
- 每个阶段显示数字 badge

### 5.2 审批模式切换
- 位置：Header 右侧区域
- 组件：Toggle Switch + 标签 "Auto" / "Manual"
- Auto 模式时显示阈值（如 "Score >= 7 auto-approved"）
- 切换确认弹窗

### 5.3 列表项快速操作
- hover 时在右侧滑出操作按钮
- 操作按钮紧凑，不影响列表布局
- 删除按钮用 trash icon，颜色 rgba(255,255,255,0.25)，hover 变红

### 5.4 保持现有暗色主题
- 背景 #0a0a0f
- 主色 purple 渐变 #a78bfa → #7c3aed
- 强调色 cyan #22d3ee
- 边框 rgba(255,255,255,0.08)

---

## 6. 验收标准（AC）

- [ ] AC1: Approval Center 顶部展示 Pipeline Status Bar，显示各阶段内容数量，点击可筛选
- [ ] AC2: Settings 支持 approval mode 配置（auto/manual），前端可切换
- [ ] AC3: Auto 模式下，brandScore >= 阈值 且无风险的内容自动标记 approved
- [ ] AC4: 列表支持快速操作（hover 显示 approve/reject/delete 按钮），无需进入详情
- [ ] AC5: 支持批量删除功能
- [ ] AC6: 删除操作有确认对话框
- [ ] AC7: 所有功能与现有暗色主题一致，构建通过
- [ ] AC8: Mock 数据包含不同 Pipeline 阶段和 brandScore 的内容

---

## 7. 任务拆解

| Task ID | 任务 | 负责人 | 优先级 | 依赖 | 预估 |
|---------|------|--------|--------|------|------|
| T1.5-01 | Approval Center 优化 UI 设计方案 | @Designer | P0 | 无 | - |
| T1.5-02 | Settings API 扩展（approval 配置） | @DEV | P0 | 无 | - |
| T1.5-03 | DELETE /api/contents/[id] 接口 | @DEV | P0 | 无 | - |
| T1.5-04 | Pipeline Status Bar 组件开发 | @DEV | P0 | T1.5-01 | - |
| T1.5-05 | 审批模式切换 UI + 逻辑 | @DEV | P0 | T1.5-01, T1.5-02 | - |
| T1.5-06 | 列表快速操作 + 删除功能 | @DEV | P0 | T1.5-01, T1.5-03 | - |
| T1.5-07 | Mock 数据更新（Pipeline 阶段 + brandScore） | @DEV | P0 | T1.5-04 | - |
| T1.5-08 | 测试 + 设计走查 | @QA + @Designer | P0 | T1.5-04~07 | - |
