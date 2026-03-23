# @QA — 测试方案：Agent Monitor 功能验收

**完成时间**：2026-03-11
**参与人员**：@QA（测试专员）
**关联任务**：Task #5
**被测功能**：Agent Monitor — Team Studio 新增 Monitor Tab，像素风办公室展示 5 个 Agent 状态

---

## 一、当前状态说明

> ⚠️ **测试阻塞**：前置开发任务 #1（UI设计）、#3（后端API）、#4（前端页面）均未完成。
> 本文件为预写测试方案，等实现完成后执行验收。

---

## 二、验收标准（AC）清单

依据任务描述，共 5 个 AC：

| AC# | 验收项 | 描述 |
|-----|--------|------|
| AC1 | 5 个 Agent 卡片展示 | Monitor 视图中能看到 PM/Researcher/Designer/DEV/QA 5 个像素风 Agent 角色 |
| AC2 | API 状态推送 | 后端 SSE 推送能实时更新 Agent 状态（offline/idle/working/error） |
| AC3 | 流式输出展示 | Agent 工作时，工作内容/思考过程能流式展示在对应卡片 |
| AC4 | 响应式适配 | mobile(375px) / tablet(768px) / desktop(1280px) 均正常显示 |
| AC5 | 与 Team Studio 风格一致 | 配色、字体、圆角、间距与现有 Team Studio 页面保持一致 |

---

## 三、测试用例

### TC-001：5 个 Agent 卡片展示
- **前置条件**：进入 /team-studio，切换到 Monitor Tab
- **测试步骤**：
  1. 打开 http://localhost:3000/team-studio
  2. 点击页面顶部 "Monitor" Tab
  3. 确认页面展示像素风办公室
  4. 数 Agent 卡片/像素小人数量
- **预期结果**：展示 5 个 Agent（PM / Researcher / Designer / DEV / QA），每个有角色标识
- **优先级**：P0
- **类型**：功能

### TC-002：Agent 状态初始化
- **前置条件**：进入 Monitor Tab
- **测试步骤**：
  1. 观察初始状态下 5 个 Agent 状态
  2. 调用 `GET /api/agent-monitor/agents` 确认响应
- **预期结果**：API 返回 5 个 Agent 的状态对象，包含 id/name/status/position 字段；UI 显示对应状态图标
- **优先级**：P0
- **类型**：功能

### TC-003：API 状态推送（SSE）
- **前置条件**：Monitor 视图已打开
- **测试步骤**：
  1. 打开浏览器 Network 面板，筛选 EventStream
  2. 确认 `/api/agent-monitor/stream` SSE 连接已建立
  3. 调用 `POST /api/agent-monitor/status` 推送状态变更（如 dev: working）
  4. 观察 Monitor 视图 DEV Agent 状态是否实时变化
- **预期结果**：状态变更在 ≤1s 内反映到 UI；连接断开后能自动重连
- **优先级**：P0
- **类型**：功能 + 性能

### TC-004：流式输出展示
- **前置条件**：某 Agent 处于 working 状态
- **测试步骤**：
  1. 触发 Team Studio 发送任务
  2. 切换到 Monitor Tab
  3. 观察 working 状态的 Agent 卡片
- **预期结果**：卡片显示实时流式文字（打字机效果或滚动输出），内容与 Chat 视图一致
- **优先级**：P1
- **类型**：功能

### TC-005：响应式适配 - Mobile (375px)
- **前置条件**：Chrome DevTools，Device: iPhone SE (375px)
- **测试步骤**：
  1. 设置视口 375px 宽度
  2. 打开 Monitor Tab
  3. 检查 5 个 Agent 卡片是否可见，不溢出、不遮挡
  4. 检查 Tab 切换按钮是否可点击
- **预期结果**：布局自适应，卡片纵向排列或网格缩小，无横向滚动条，操作可用
- **优先级**：P1
- **类型**：功能 + UI

### TC-006：响应式适配 - Tablet (768px)
- **前置条件**：Chrome DevTools，视口 768px
- **测试步骤**：同 TC-005
- **预期结果**：2-3 列网格，Agent 卡片完整显示
- **优先级**：P1
- **类型**：UI

### TC-007：响应式适配 - Desktop (1280px)
- **前置条件**：正常桌面分辨率
- **测试步骤**：同 TC-005
- **预期结果**：5 个卡片横排或 5 列展示，像素风办公室背景完整
- **优先级**：P1
- **类型**：UI

### TC-008：与 Team Studio 风格一致性
- **前置条件**：同时打开 Chat Tab 和 Monitor Tab
- **测试步骤**：
  1. 对比 Tab 切换组件与现有页面 Tab 样式
  2. 检查字体大小、颜色变量（`--foreground`、`--background`、`--border`）
  3. 检查圆角（卡片应为 12px 左右）
  4. 切换暗色模式，确认 Monitor Tab 跟随切换
- **预期结果**：Monitor 视图在亮色/暗色下均与 Team Studio 整体风格一致，无明显色彩突兀
- **优先级**：P1
- **类型**：UI + 设计走查

### TC-009：错误状态展示
- **前置条件**：Monitor Tab 已打开
- **测试步骤**：
  1. 推送某 Agent status = "error"
  2. 观察对应 Agent 卡片变化
- **预期结果**：卡片显示错误标识（如红色边框/感叹号图标），不影响其他 Agent 展示
- **优先级**：P1
- **类型**：异常

### TC-010：SSE 断线重连
- **前置条件**：Monitor Tab 已打开，SSE 连接正常
- **测试步骤**：
  1. 在 Network 面板手动模拟离线
  2. 等待 3 秒后恢复网络
  3. 观察 SSE 是否自动重连
- **预期结果**：重连后状态恢复正常，不需要手动刷新
- **优先级**：P2
- **类型**：异常

---

## 四、API 验收测试（后端）

等 Task #3 完成后，使用 curl 验证以下端点：

```bash
# 1. 获取所有 Agent 状态
curl http://localhost:3000/api/agent-monitor/agents

# 预期响应：
# {
#   "success": true,
#   "data": [
#     { "id": "pm", "name": "PM", "status": "idle", "position": {...} },
#     { "id": "researcher", ... },
#     { "id": "designer", ... },
#     { "id": "dev", ... },
#     { "id": "qa", ... }
#   ]
# }

# 2. 推送状态更新
curl -X POST http://localhost:3000/api/agent-monitor/status \
  -H "Content-Type: application/json" \
  -d '{"agentId": "dev", "status": "working", "output": "正在编写组件..."}'

# 预期响应：{ "success": true }

# 3. 验证 SSE 推送
curl -N http://localhost:3000/api/agent-monitor/stream
# 预期：持续输出 data: {...} 格式的 SSE 事件
```

---

## 五、构建验证

```bash
cd /Users/jaydenworkplace/Desktop/OPC_MKT_Agent_OS/web
pnpm build
pnpm lint
```

预期：0 error，build 通过。

---

## 六、测试报告模板（待执行后填写）

```
## 测试报告 - Agent Monitor 功能
- 测试时间: ____-__-__
- 测试范围: Agent Monitor Tab、3 个 API 端点、响应式适配
- 总用例数: 10 | 通过: _ | 失败: _ | 跳过: _
- 覆盖率: N/A（无单元测试需求）

### 失败用例详情
| 用例ID | 描述 | 实际结果 | 严重程度 |

### 设计走查结果
| 页面 | 检查项 | 设计稿 | 实际实现 | 是否通过 |

### 部署检查清单
- [ ] 构建通过
- [ ] Lint 通过
- [ ] AC1-AC5 全部通过
- [ ] 设计走查通过（@Designer 确认）
```

---

## 七、阻塞说明

**当前无法执行**，原因：

- Task #1（UI 设计）in_progress
- Task #3（后端 API）in_progress，依赖 #1
- Task #4（前端实现）pending，依赖 #1 和 #3

**解除阻塞条件**：Task #4 完成并通知 @QA 后，立即执行上述测试用例。
