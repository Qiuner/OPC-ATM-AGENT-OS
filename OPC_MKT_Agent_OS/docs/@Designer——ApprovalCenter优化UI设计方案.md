# [@Designer] Approval Center 优化 UI 设计方案

**完成时间:** 2026-03-24
**参与人员:** @Designer (UI设计师)
**关联任务:** T1.5-01

---

## 1. 设计概述

在现有 Approval Center 页面基础上新增 3 个核心模块：

1. **Pipeline Status Bar** — 页面顶部横向流水线状态条
2. **审批模式切换** — Header 右侧 Auto/Manual 切换
3. **列表交互优化** — hover 快速操作 + 批量删除 + 删除确认

---

## 2. 整体布局 (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│  Approval Center (H1)          [Auto ◯ Manual] 审批模式切换     │
│                                Score >= 7 auto-approved          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Pipeline Status Bar ────────────────────────────────────┐  │
│  │ [生成中]→[平台适配]→[AI审核]→[待审批]→[已通过]→[发布中]→[已发布] │  │
│  │   2       1         3       5        8        2        12  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├─ Tabs (全部 / 待审核 / 已通过 / 已退回) ── [全选待审] ─────────┤
│  已选 3 项  [批量通过] [批量拒绝] [批量删除]                     │
│                                                                 │
│  ┌─ List (40%) ──────────┐  ┌─ Preview (60%) ──────────────┐  │
│  │ □ ● 小红书种草 #12     │  │  [Platform] [AI生成] [风险]   │  │
│  │   春季推广 · P0 · 2h  │  │                               │  │
│  │   ─── hover 时显示 ──→│  │  标题                         │  │
│  │   [✓ approve] [✗ reject] [🗑 delete] │  │  内容正文...    │  │
│  │                        │  │                               │  │
│  │ □ ● 抖音脚本 #8       │  │  标签...                      │  │
│  │   品牌曝光 · P1 · 3h  │  │                               │  │
│  │                        │  │  风险/安全检测                 │  │
│  │ □ ● X 推文 #5          │  │                               │  │
│  │   内容营销 · P2 · 5h  │  │  审批记录                     │  │
│  └────────────────────────┘  │                               │  │
│                               │  [退回修改] [通过]            │  │
│                               └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 模块 1: Pipeline Status Bar

### 3.1 位置与容器

位于 Header 下方、Tab 筛选器上方。

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 容器背景 | rgba(255,255,255,0.02) | `bg-white/[0.02]` |
| 边框 | rgba(255,255,255,0.08) | `style={{ border: '1px solid rgba(255,255,255,0.08)' }}` |
| 圆角 | 12px | `rounded-xl` |
| 内边距 | 16px 水平, 14px 垂直 | `px-4 py-3.5` |
| 布局 | 横向 flex, 阶段之间箭头连接 | `flex items-center` |

### 3.2 Pipeline 阶段定义

```typescript
interface PipelineStage {
  key: string;
  label: string;
  count: number;
  color: string;        // 图标/文字颜色
  bgColor: string;      // 背景色
  isActive: boolean;     // 当前高亮阶段
}

const PIPELINE_STAGES = [
  { key: "generating",    label: "生成中",   icon: Loader2Icon },
  { key: "adapting",      label: "平台适配", icon: LayoutGridIcon },
  { key: "ai-review",     label: "AI审核",   icon: BrainIcon },
  { key: "pending",       label: "待审批",   icon: ClockIcon },
  { key: "approved",      label: "已通过",   icon: CheckCircleIcon },
  { key: "publishing",    label: "发布中",   icon: SendIcon },
  { key: "published",     label: "已发布",   icon: CheckCheck },
];
```

### 3.3 单个阶段样式

**正常态:**

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 容器 | 可点击，圆角 8px | `rounded-lg px-3 py-2 cursor-pointer transition-all` |
| 背景 | 透明 | `bg-transparent` |
| Hover | rgba(255,255,255,0.04) | `hover:bg-white/[0.04]` |
| 图标 | 16px, rgba(255,255,255,0.3) | `size-4` + style |
| 标签文字 | 12px, rgba(255,255,255,0.4) | `text-xs` + style |
| 数量 Badge | 圆形，rgba(255,255,255,0.06) 背景 | 见下 |

**高亮态（当前阶段 / 选中筛选）:**

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 背景 | 紫色渐变 `rgba(167,139,250,0.10)` | `style={{ background: 'rgba(167,139,250,0.10)' }}` |
| 边框 | rgba(167,139,250,0.20) | `style={{ border: '1px solid rgba(167,139,250,0.20)' }}` |
| 图标 | #a78bfa | `text-[#a78bfa]` |
| 标签文字 | white | `text-white font-medium` |
| 数量 Badge | 紫色背景 | `bg-[#a78bfa]/20 text-[#a78bfa]` |

**特殊阶段颜色:**
- "待审批" 阶段数量 > 0 时 Badge 用 amber: `bg-amber-500/20 text-amber-400`
- "已通过" / "已发布" 用 cyan: `bg-[#22d3ee]/20 text-[#22d3ee]`

### 3.4 箭头连接器

```tsx
// 阶段之间的箭头
<div className="flex items-center mx-1">
  <div className="w-4 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
  <ChevronRightIcon className="size-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
</div>
```

### 3.5 完整 JSX 参考

```tsx
<div
  className="flex items-center rounded-xl px-4 py-3.5 overflow-x-auto"
  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
>
  {stages.map((stage, idx) => (
    <React.Fragment key={stage.key}>
      <button
        onClick={() => handleStageFilter(stage.key)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all shrink-0 ${
          activeStage === stage.key
            ? 'font-medium'
            : 'hover:bg-white/[0.04]'
        }`}
        style={activeStage === stage.key ? {
          background: 'rgba(167,139,250,0.10)',
          border: '1px solid rgba(167,139,250,0.20)',
        } : {}}
      >
        <stage.icon
          className={`size-4 ${activeStage === stage.key ? 'text-[#a78bfa]' : ''}`}
          style={activeStage !== stage.key ? { color: 'rgba(255,255,255,0.3)' } : undefined}
        />
        <span
          className={`text-xs ${activeStage === stage.key ? 'text-white' : ''}`}
          style={activeStage !== stage.key ? { color: 'rgba(255,255,255,0.4)' } : undefined}
        >
          {stage.label}
        </span>
        <span
          className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
            activeStage === stage.key
              ? 'bg-[#a78bfa]/20 text-[#a78bfa]'
              : stage.key === 'pending' && stage.count > 0
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-white/[0.06] text-white/40'
          }`}
        >
          {stage.count}
        </span>
      </button>
      {/* Arrow connector (except after last) */}
      {idx < stages.length - 1 && (
        <div className="flex items-center mx-1 shrink-0">
          <div className="w-4 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <ChevronRightIcon className="size-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
        </div>
      )}
    </React.Fragment>
  ))}
</div>
```

### 3.6 交互行为

- **点击阶段**: 筛选列表显示该阶段的内容，高亮选中阶段
- **再次点击**: 取消筛选，显示全部
- **实时更新**: 数量 Badge 随审批操作实时变化
- **响应式**: 小屏幕下可横向滚动 (`overflow-x-auto`)

---

## 4. 模块 2: 审批模式切换

### 4.1 位置

Header 右侧，与标题同行。

### 4.2 组件结构

```
[Approval Center]                    [Auto ○━━ Manual]
                                     Score >= 7 auto-approved
```

### 4.3 Toggle Switch 样式

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| Switch 容器 | 圆角药丸形 | `rounded-full` |
| 宽度 | 44px | `w-11` |
| 高度 | 24px | `h-6` |
| Auto 态背景 | #a78bfa (紫色) | `bg-[#a78bfa]` |
| Manual 态背景 | rgba(255,255,255,0.15) | `bg-white/15` |
| 滑块 | 白色圆形 20px | `size-5 rounded-full bg-white` |
| 过渡 | 200ms | `transition-all duration-200` |

### 4.4 完整 JSX 参考

```tsx
<div className="flex items-center gap-3">
  {/* Mode labels */}
  <div className="flex items-center gap-2">
    <span
      className={`text-xs font-medium ${approvalMode === 'auto' ? 'text-[#a78bfa]' : ''}`}
      style={approvalMode !== 'auto' ? { color: 'rgba(255,255,255,0.3)' } : undefined}
    >
      Auto
    </span>

    {/* Toggle Switch */}
    <button
      onClick={() => setShowModeConfirm(true)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
        approvalMode === 'auto' ? 'bg-[#a78bfa]' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
          approvalMode === 'manual' ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>

    <span
      className={`text-xs font-medium ${approvalMode === 'manual' ? 'text-white' : ''}`}
      style={approvalMode !== 'manual' ? { color: 'rgba(255,255,255,0.3)' } : undefined}
    >
      Manual
    </span>
  </div>

  {/* Threshold info (only in Auto mode) */}
  {approvalMode === 'auto' && (
    <span
      className="text-[11px] rounded-md px-2 py-0.5"
      style={{ background: 'rgba(167,139,250,0.08)', color: '#a78bfa' }}
    >
      Score &ge; 7 auto-approved
    </span>
  )}
</div>
```

### 4.5 模式切换确认弹窗

使用现有 shadcn Dialog 组件。

```tsx
<Dialog open={showModeConfirm} onOpenChange={setShowModeConfirm}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>
        切换审批模式
      </DialogTitle>
      <DialogDescription>
        {approvalMode === 'auto'
          ? '切换为手动模式后，所有内容需要人工审批才能发布。确认切换？'
          : '切换为自动模式后，AI 评分 ≥ 7 的内容将自动通过审批。确认切换？'}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <button
        onClick={() => setShowModeConfirm(false)}
        className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
        style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
      >
        取消
      </button>
      <button
        onClick={() => {
          setApprovalMode(approvalMode === 'auto' ? 'manual' : 'auto');
          setShowModeConfirm(false);
          toast.success(`已切换为${approvalMode === 'auto' ? '手动' : '自动'}审批模式`);
        }}
        className="h-9 rounded-lg px-4 text-sm font-medium text-white transition-colors"
        style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}
      >
        确认切换
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4.6 状态数据

```typescript
type ApprovalMode = 'auto' | 'manual';

// State
const [approvalMode, setApprovalMode] = useState<ApprovalMode>('manual');
const [showModeConfirm, setShowModeConfirm] = useState(false);
```

---

## 5. 模块 3: 列表交互优化

### 5.1 Hover 快速操作按钮

当鼠标 hover 到列表项时，右侧显示快速操作按钮组。

**触发条件:** 仅 `decision === "pending"` 的项目显示快速操作。

```tsx
<div className="group relative">
  {/* 现有列表项内容 */}
  ...

  {/* Hover 快速操作 — 仅 pending 项目 */}
  {item.decision === 'pending' && (
    <div
      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <button
        onClick={(e) => { e.stopPropagation(); openDialog('approve', item.id); }}
        className="flex items-center justify-center size-7 rounded-md transition-colors hover:bg-[#22d3ee]/10"
        title="Approve"
      >
        <CheckIcon className="size-4 text-[#22d3ee]" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); openDialog('reject', item.id); }}
        className="flex items-center justify-center size-7 rounded-md transition-colors hover:bg-red-500/10"
        title="Reject"
      >
        <XIcon className="size-4 text-red-400" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); openDeleteConfirm(item.id); }}
        className="flex items-center justify-center size-7 rounded-md transition-colors hover:bg-red-500/10"
        title="Delete"
      >
        <Trash2Icon className="size-3.5 text-red-400" />
      </button>
    </div>
  )}
</div>
```

**按钮样式:**

| 按钮 | 图标 | 颜色 | Hover 背景 |
|------|------|------|-----------|
| Approve | CheckIcon | #22d3ee | `hover:bg-[#22d3ee]/10` |
| Reject | XIcon | red-400 | `hover:bg-red-500/10` |
| Delete | Trash2Icon | red-400 | `hover:bg-red-500/10` |

按钮尺寸: `size-7` (28px)，圆角 `rounded-md`。

### 5.2 批量操作栏增加「批量删除」

在现有批量操作栏（已选 N 项 + 批量通过 + 批量拒绝）后增加「批量删除」按钮。

```tsx
{checkedPendingCount > 0 && (
  <div className="flex items-center gap-2">
    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
      已选 {checkedPendingCount} 项
    </span>
    {/* 现有按钮 */}
    <button className="h-8 rounded-lg bg-[#22d3ee] px-3 text-xs font-medium text-black hover:bg-[#22d3ee]/80 transition-colors">
      批量通过
    </button>
    <button
      className="h-8 rounded-lg px-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
      style={{ border: '1px solid rgba(239,68,68,0.3)' }}
    >
      批量拒绝
    </button>
    {/* 新增：批量删除 */}
    <button
      onClick={() => openBulkDeleteConfirm()}
      className="h-8 rounded-lg px-3 text-xs font-medium transition-colors hover:bg-red-500/10"
      style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <Trash2Icon className="size-3 mr-1 inline" />
      批量删除
    </button>
  </div>
)}
```

**批量删除按钮样式:** 比批量拒绝更低调 — 灰色文字 + 灰色边框，hover 时变红色背景。

### 5.3 删除确认对话框

使用现有 shadcn Dialog 组件，风格与 approve/reject Dialog 一致。

```tsx
<Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle className="text-red-400">
        确认删除
      </DialogTitle>
      <DialogDescription>
        {deleteConfirm?.type === 'single'
          ? `确认删除「${deleteConfirm.title}」？此操作不可撤销。`
          : `确认删除 ${deleteConfirm?.count} 项内容？此操作不可撤销。`}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <button
        onClick={() => setDeleteConfirm(null)}
        className="h-9 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-white/5"
        style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
      >
        取消
      </button>
      <button
        onClick={handleConfirmDelete}
        className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        确认删除
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**删除确认弹窗特点:**
- 标题用红色 `text-red-400` 强调危险操作
- 确认按钮用红色 `bg-red-600 hover:bg-red-700`
- 明确提示「此操作不可撤销」

### 5.4 删除状态管理

```typescript
interface DeleteConfirmState {
  type: 'single' | 'bulk';
  ids: string[];
  title?: string;   // 单个删除时显示标题
  count?: number;    // 批量删除时显示数量
}

const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);

// 单个删除
const openDeleteConfirm = (id: string) => {
  const item = items.find((i) => i.id === id);
  setDeleteConfirm({ type: 'single', ids: [id], title: item?.title });
};

// 批量删除
const openBulkDeleteConfirm = () => {
  const ids = Array.from(checkedIds);
  if (ids.length === 0) return;
  setDeleteConfirm({ type: 'bulk', ids, count: ids.length });
};

// 执行删除
const handleConfirmDelete = async () => {
  if (!deleteConfirm) return;
  for (const id of deleteConfirm.ids) {
    try {
      await fetch(`/api/contents/${id}`, { method: 'DELETE' });
    } catch { /* skip */ }
  }
  setItems((prev) => prev.filter((i) => !deleteConfirm.ids.includes(i.id)));
  setCheckedIds((prev) => {
    const next = new Set(prev);
    deleteConfirm.ids.forEach((id) => next.delete(id));
    return next;
  });
  toast.success(`已删除 ${deleteConfirm.ids.length} 项`);
  setDeleteConfirm(null);
};
```

---

## 6. 配色方案

与现有 Approval Center 页面完全一致：

| 用途 | 色值 | 说明 |
|------|------|------|
| 主 accent | #a78bfa | 紫色，Toggle、Pipeline 高亮 |
| 渐变按钮 | #a78bfa → #7c3aed | 确认按钮 |
| 强调色 | #22d3ee | 通过、安全状态 |
| 待审核 | amber-400 (#fbbf24) | pending Badge |
| 危险 | red-500 (#ef4444) | 删除、退回、风险 |
| 边框 | rgba(255,255,255,0.08) | 统一 |
| Pipeline 高亮背景 | rgba(167,139,250,0.10) | 选中阶段 |
| Pipeline 高亮边框 | rgba(167,139,250,0.20) | 选中阶段边框 |

---

## 7. 响应式适配

| 断点 | 变化 |
|------|------|
| Desktop (>=1280px) | Pipeline 完整显示，审批模式切换完整显示 |
| Tablet (768-1279px) | Pipeline 可横向滚动 (`overflow-x-auto`)，阶段标签缩短 |
| Mobile (<768px) | Pipeline 缩为仅图标+数量，审批模式切换折叠到菜单中 |

---

## 8. 组件依赖

全部使用现有组件，无新增依赖：

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` — 已有
- lucide-react 图标: `Loader2Icon`, `LayoutGridIcon` (或 `GridIcon`), `BrainIcon` (或 `SparklesIcon`), `ClockIcon`, `CheckCircleIcon`, `SendIcon`, `CheckCheckIcon`, `ChevronRightIcon`, `CheckIcon`, `XIcon`, `Trash2Icon`
- `toast` from "sonner" — 已有

---

## 9. 改动文件清单

| 文件 | 改动内容 |
|------|---------|
| `web/src/app/approval/page.tsx` | 新增 Pipeline Status Bar、审批模式切换、hover 快速操作、批量删除、删除确认 Dialog |

**共 1 个文件需要改动，无新增文件，无新增依赖。**

---

> **设计方案完成，可直接交付 @DEV 开发。**
