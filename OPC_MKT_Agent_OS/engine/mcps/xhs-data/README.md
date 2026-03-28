# 小红书数据 MCP Server

数据采集 + 真实搜索/详情抓取 + 真实发布（内置 Playwright 浏览器自动化）。

## 工具列表

| 工具 | 说明 | 数据源 |
|------|------|--------|
| `xhs_get_note_metrics` | 获取单篇笔记数据指标 | mock / API |
| `xhs_batch_get_metrics` | 批量获取笔记数据（最多 50 篇） | mock / API |
| `xhs_get_trending_topics` | 获取热搜话题和趋势关键词 | mock / API |
| `xhs_search_notes` | 搜索笔记（关键词+排序） | mock / API |
| `xhs_get_user_profile` | 获取用户主页信息 | mock / API |
| `xhs_get_user_notes` | 获取用户笔记列表 | mock / API |
| `xhs_search_top_posts` | 搜索热门笔记（真实数据） | Playwright |
| `xhs_get_post_detail` | 获取笔记详情+评论（真实数据） | Playwright |
| `xhs_check_login` | 检查小红书登录状态 | Playwright |
| `xhs_login` | QR 码扫码登录（弹出浏览器窗口） | Playwright |
| `xhs_publish_note` | 真实发布笔记 | Playwright |

## 端到端流程

1. 调用 `xhs_login` → 弹出浏览器 → 用小红书 App 扫码
2. 登录成功后 cookie 自动保存到 `~/.xhs-mcp/storage-state.json`
3. 调用 `xhs_search_top_posts` → 搜索竞品热门笔记（真实数据）
4. 调用 `xhs_get_post_detail` → 深度分析爆款内容和评论
5. 创作基于数据的内容
6. 调用 `xhs_publish_note` → 发布到小红书

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `XHS_API_URL` | 否 | 数据 API 地址，默认使用 mock |
| `XHS_API_KEY` | 否 | API 密钥，无 key 时返回 mock 数据 |

## 依赖

- `playwright` — 浏览器自动化（首次安装需 `npx playwright install chromium`）

## 运行

```bash
npx tsx engine/mcps/xhs-data/index.ts
```

由 Claude Agent SDK 通过 `mcpServers` 配置自动管理。
