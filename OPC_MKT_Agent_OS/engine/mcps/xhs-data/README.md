# 小红书数据 MCP Server

对接小红书数据采集和内容发布 API。

## 工具列表

| 工具 | 说明 |
|------|------|
| `xhs_get_note_metrics` | 获取单篇笔记数据指标 |
| `xhs_batch_get_metrics` | 批量获取笔记数据（最多 50 篇） |
| `xhs_get_trending_topics` | 获取热搜话题和趋势关键词 |
| `xhs_search_notes` | 搜索笔记（关键词+排序） |
| `xhs_get_user_profile` | 获取用户主页信息 |
| `xhs_get_user_notes` | 获取用户笔记列表 |
| `xhs_publish_note` | 发布笔记（需 Cookie） |

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `XHS_API_URL` | 否 | 数据 API 地址，默认使用 mock |
| `XHS_API_KEY` | 否 | API 密钥，无 key 时返回 mock 数据 |
| `XHS_COOKIE` | 否 | 小红书登录 Cookie，发布笔记时需要 |

## 运行

```bash
npx tsx engine/mcps/xhs-data/index.ts
```

由 Claude Agent SDK 通过 `mcpServers` 配置自动管理。
