# Podcast TTS MCP Server

对接 TTS 服务，为播客 Agent 提供音频合成能力。

## 工具列表

| 工具 | 说明 |
|------|------|
| `tts_synthesize` | 单段文字转语音 |
| `tts_synthesize_dialogue` | 多角色对话转语音（对谈/圆桌式） |
| `tts_merge_audio` | 合并多段音频（支持背景音乐） |
| `tts_get_voices` | 获取可用声音列表 |
| `tts_get_job_status` | 查询合成任务状态 |
| `tts_estimate_duration` | 估算文本朗读时长 |

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `TTS_API_URL` | 否 | TTS 服务地址，默认使用 mock |
| `TTS_API_KEY` | 否 | API 密钥，无 key 时返回 mock 数据 |

## 运行

```bash
npx tsx engine/mcps/podcast-tts/index.ts
```

由 Claude Agent SDK 通过 `mcpServers` 配置自动管理。
