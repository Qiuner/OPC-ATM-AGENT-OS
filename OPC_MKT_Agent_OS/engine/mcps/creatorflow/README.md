# CreatorFlow MCP Server

对接 CreatorFlow API，为 Agent 提供内容管理工具。

## 工具列表

| 工具 | 说明 |
|------|------|
| `creatorflow_sync_competitors` | 同步竞品账号最新笔记 |
| `creatorflow_create_material` | 创建素材（标题+正文） |
| `creatorflow_generate_script` | 基于素材生成发布脚本 |
| `creatorflow_quality_check` | 内容质量检查与评分 |
| `creatorflow_list_materials` | 查询素材库 |
| `creatorflow_trigger_workflow` | 触发工作流 |
| `creatorflow_get_workflow_status` | 查询工作流状态 |

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `CREATORFLOW_API_URL` | 否 | API 根地址，默认使用 mock |
| `CREATORFLOW_API_KEY` | 否 | API 密钥，无 key 时返回 mock 数据 |

## 运行

```bash
npx tsx engine/mcps/creatorflow/index.ts
```

由 Claude Agent SDK 通过 `mcpServers` 配置自动管理，无需手动运行。
