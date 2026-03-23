# CreatorFlow API Reference

> Base URL: `http://localhost:3000`
> All endpoints return JSON. Error format: `{ "error": "message" }`

---

## 1. Material Management (素材管理)

### ⭐ List Materials
```
GET /api/materials?status={status}&search={keyword}
```
- status: `unprocessed` | `scripted` | `published` | `all`
- search: keyword filter (title/content/tags)

### ⭐ Create Material
```
POST /api/materials
{
  "title": "素材标题",
  "source": "来源平台",
  "source_url": "https://...",
  "tags": ["tag1", "tag2"],
  "content": "素材正文内容",
  "status": "unprocessed"
}
```

### Get / Update / Delete Material
```
GET    /api/materials/{id}
PUT    /api/materials/{id}    Body: partial Material fields
DELETE /api/materials/{id}
```

### ⭐ Import from URL (Universal Scraper)
```
POST /api/materials/import-url
{
  "url": "https://any-platform-link",
  "mode": "preview",           // "preview" returns data without saving; omit to import directly
  "transcribe": true           // optional: transcribe video audio (XHS video notes)
}
```
Supports: Xiaohongshu, WeChat, Bilibili, YouTube, Douyin, Twitter/X, any webpage (Jina Reader fallback).

### Import from Xiaohongshu Note
```
POST /api/materials/import-xhs
{
  "url": "https://www.xiaohongshu.com/explore/xxx",
  "transcribe": true    // optional
}
```

### Scrape Web Page (Simple)
```
POST /api/scrape
{ "url": "https://example.com/article" }
```
Returns: `{ title, content, url }`

### Search Trending Notes (from synced competitors)
```
GET /api/materials/search-trending?keyword=xxx&sort=engagement&note_type=all
```
- sort: `engagement` | `latest`
- note_type: `all` | `video` | `image`

### Import Trending Note as Material
```
POST /api/materials/search-trending
{ "internal_id": "cnote_xxx" }
// or
{ "note_id": "abc123...", "xsec_token": "xxx", "title": "note title" }
```

---

## 2. Script Management (脚本管理)

### ⭐ List Scripts
```
GET /api/scripts?status={status}&type={type}&material_id={id}
```
- status: `draft` | `ready` | `recorded` | `published` | `all`
- type: `干货效率型` | `痛点共鸣型` | `悬念反转型` | `对比冲击型` | `热点借势型` | `all`

### ⭐ Create Script
```
POST /api/scripts
{
  "title": "脚本标题",
  "type": "干货效率型",
  "material_id": "mat_xxx",
  "status": "draft",
  "estimated_duration": 30,
  "framework": "框架名称",
  "hook_type": "开头类型",
  "sections": [
    { "name": "开头", "color": "hook", "timeHint": "0-5s", "content": "..." },
    { "name": "价值", "color": "value", "timeHint": "5-20s", "content": "..." },
    { "name": "核心", "color": "core", "timeHint": "20-50s", "content": "..." },
    { "name": "结尾", "color": "end", "timeHint": "50-60s", "content": "..." }
  ],
  "comment_text": "评论区置顶文案"
}
```

### Get / Update / Delete Script
```
GET    /api/scripts/{id}
PUT    /api/scripts/{id}    Body: partial Script fields
DELETE /api/scripts/{id}
```

### Script Breakdown (Scrape + AI Analyze XHS Note)
```
POST /api/scripts/breakdown
{
  "url": "https://www.xiaohongshu.com/explore/xxx",
  "transcribe_audio": true
}
```
Returns: `{ note, analysis: { summary, framework }, audio_transcript }`

---

## 3. AI Capabilities (AI 能力)

### ⭐ Generate Scripts from Material
```
POST /api/ai/generate
{
  "materialId": "mat_xxx",
  "frameworkId": "fw_xxx"        // optional: use specific framework
}
// or provide content directly:
{
  "title": "标题",
  "content": "正文",
  "frameworkId": "fw_xxx"
}
```
Returns: array of `AIScriptOption` (multiple script options)

### ⭐ Generate Publish Content
```
POST /api/ai/publish
{
  "scriptId": "scr_xxx",
  "platform": "xiaohongshu"      // "xiaohongshu" | "douyin" | "shipinhao"
}
```
Returns: `{ titles: string[], content, tags, comment, tips }`

### AI Review (Analyze Published Videos Performance)
```
POST /api/ai/review
{
  "items": [{ title, views, likes, comments, ... }]
}
```

### Match Framework to Material
```
POST /api/ai/match-framework
{ "materialId": "mat_xxx" }
```

### Check Script Quality
```
POST /api/ai/check-script
{
  "sections": [{ name, content, ... }],
  "estimatedDuration": 30
}
```
Returns: `{ results, rules }` (checklist pass/fail)

### Optimize Script
```
POST /api/ai/optimize-script
{
  "sections": [{ name, content, ... }],
  "commentText": "评论文案",
  "failedRules": ["rule1", "rule2"],
  "estimatedDuration": 30
}
```

---

## 4. Competitor Analysis (竞品分析)

### ⭐ List Competitors
```
GET /api/competitors
```

### ⭐ Add Competitor
```
POST /api/competitors
{ "url": "https://www.xiaohongshu.com/user/profile/xxx" }
// or short link:
{ "url": "https://xhslink.com/xxx" }
// or user ID:
{ "user_id": "64a1b2c3d4e5f6..." }
```

### Remove Competitor
```
DELETE /api/competitors?id=xxx
```

### ⭐ Sync Competitor Data
```
POST /api/competitors/sync
{ "competitor_id": "comp_xxx" }     // sync one; omit to sync all
```

### List Competitor Notes
```
GET /api/competitors/notes?competitor_id=comp_xxx
```

### Fetch Note Detail (Content + Transcript)
```
POST /api/competitors/notes
{ "id": "cnote_xxx" }
```

### ⭐ AI Analyze a Note
```
POST /api/competitors/analyze
{
  "id": "cnote_xxx",
  "transcribe_audio": true
}
```
Returns: `{ analysis: { summary, framework } }`

### Get Top Notes (by engagement)
```
POST /api/competitors/top-notes
{ "competitor_id": "comp_xxx" }
```
Returns: `{ top_notes: [...], total }`

### ⭐ Summarize Multiple Notes
```
POST /api/competitors/summarize
{
  "competitor_id": "comp_xxx",
  "note_ids": ["cnote_1", "cnote_2", "cnote_3"]
}
```
Returns: `{ summary }` (cross-note pattern analysis)

### Test XHS Cookie
```
POST /api/competitors/test
```
Returns: `{ success: true }` or error

---

## 5. Publish Management (发布管理)

### List Publish Records
```
GET /api/publish
```

### Create Publish Record
```
POST /api/publish
{
  "script_id": "scr_xxx",
  "material_id": "mat_xxx",
  "recording_duration": 0,
  "video_path": null,
  "platforms": {
    "xiaohongshu": {
      "titles": ["标题1", "标题2"],
      "selectedTitle": 0,
      "content": "正文",
      "tags": ["tag1"],
      "comment": "评论置顶",
      "tips": "",
      "status": "ready",
      "published_at": null
    }
  }
}
```

### Get / Update Publish Record
```
GET /api/publish/{id}
PUT /api/publish/{id}    Body: partial fields (auto-updates script status on publish)
```

### Prepare XHS Publish Task (for automation)
```
POST /api/publish/xhs/prepare
{
  "scriptId": "scr_xxx",
  "publishRecordId": "pub_xxx",
  "requireConfirm": true
}
```
Returns: `{ payload: { title, content, hashtags, comment }, taskText }`

### ⭐ Auto-Draft to XHS (via OpenClaw browser automation)
```
POST /api/publish/xhs/auto-draft
{
  "scriptId": "scr_xxx",
  "publishRecordId": "pub_xxx"
}
```
Requires: Chrome with XHS creator publish page attached via OpenClaw browser relay.

---

## 6. Video & Upload

### Upload Video
```
POST /api/upload/video
Content-Type: multipart/form-data
Body: video (file, max 500MB)
```
Returns: `{ filename, path, size }`

### Serve Video
```
GET /api/videos?file=video_xxx.mp4
```

---

## 7. Feed Subscriptions (信息流订阅)

### List Feed Accounts
```
GET /api/feed/accounts
```

### Add Feed Account
```
POST /api/feed/accounts
{ "platform": "twitter", "username": "elonmusk" }
```
Platforms: `twitter` | `weibo` | `bilibili`

### Remove Feed Account
```
DELETE /api/feed/accounts/{id}
```

### List Feed Items
```
GET /api/feed?accountId=xxx
```

### Sync Feed
```
POST /api/feed/sync
{ "accountId": "xxx", "since": "2024-01-01T00:00:00Z" }
```

### Import Feed Item as Material
```
POST /api/feed/import
{ "feedItemId": "feed_xxx" }
```

### Auto-Sync Schedule (macOS launchd)
```
GET  /api/feed/schedule
POST /api/feed/schedule
{ "enabled": true, "hour": 9, "minute": 30 }
```

---

## 8. Framework Library (框架库)

### List Frameworks
```
GET /api/frameworks
```

### Save Framework
```
POST /api/frameworks
{
  "name": "问题引入→产品演示→效果对比→CTA",
  "source_note_title": "原始笔记标题",
  "source_competitor": "竞品账号",
  "hook_pattern": "痛点提问式",
  "hook_example": "你是不是也遇到过...",
  "sections": [
    { "name": "问题引入", "purpose": "引起共鸣", "timeHint": "3-5s", "example": "..." }
  ],
  "key_techniques": ["对比", "数据"],
  "estimated_duration": 30,
  "tags": ["效率", "工具"]
}
```

### Delete Framework
```
DELETE /api/frameworks?id=fw_xxx
```

---

## 9. Schedule (排期日历)

### List Schedule Items
```
GET /api/schedule?from=2024-01-01&to=2024-01-31
```

### Create Schedule Item
```
POST /api/schedule
{
  "script_id": "scr_xxx",
  "date": "2024-03-15",
  "type": "draft",          // "draft" | "record" | "publish"
  "note": "备注"
}
```

### Update / Delete Schedule Item
```
PUT    /api/schedule    Body: { id, date?, type?, note? }
DELETE /api/schedule?id=sch_xxx
```

---

## 10. My Account (我的小红书)

### Get Cached Account Data
```
GET /api/my-account
```

### Sync XHS Account Data
```
POST /api/my-account
```
Requires XHS creator cookies configured in settings.

### Sync XHS Review Data
```
POST /api/review/sync-xhs
```

---

## 11. Agent Chat (AI 助手)

### List Sessions
```
GET /api/agent/sessions
```

### Create Session
```
POST /api/agent/sessions
{ "title": "会话标题" }
```

### Delete Session
```
DELETE /api/agent/sessions?id=as_xxx
```

### Get Messages
```
GET /api/agent/messages?session_id=as_xxx
```

### ⭐ Chat with Agent
```
POST /api/agent/chat
{
  "session_id": "as_xxx",       // optional, auto-creates if missing
  "message": "帮我分析这个竞品账号",
  "action": {                   // optional, triggers specific task
    "type": "analyze_competitor",
    "competitor_id": "comp_xxx"
  }
}
```
Action types:
- `analyze_competitor` — needs `competitor_id`
- `analyze_note` — needs `note_id`, optional `transcribe_audio`
- `analyze_note_url` — needs `note_url`, optional `transcribe_audio`

Returns: `{ session_id, reply, task, messages }`

### List Agent Tasks
```
GET /api/agent/tasks?session_id=as_xxx&related_page=/competitors&limit=10
```

---

## 12. Multi-Agent Studio

### Get / Update Studio Config
```
GET /api/studio/config
PUT /api/studio/config    Body: StudioConfig fields
```

### ⭐ Run Studio Workflow
```
POST /api/studio/workflow
{
  "goal": "写一条关于AI效率工具的小红书笔记",
  "platform": "xiaohongshu"     // "xiaohongshu" | "shipinhao" | "all"
}
```

### Studio Chat Rooms
```
GET  /api/studio/chat/rooms
POST /api/studio/chat/rooms     { "title": "聊天室" }
```

### Studio Chat Messages
```
GET /api/studio/chat/messages?room_id=xxx
```

### Studio Chat Send
```
POST /api/studio/chat/send
{
  "room_id": "xxx",
  "message": "写一个开头",
  "mention_agent_id": "agent_1"   // optional
}
```

### Studio File Read
```
GET /api/studio/file?path=data/output/xxx.md
```

---

## 13. Settings & Checklist

### Get / Update Settings
```
GET /api/settings
PUT /api/settings    Body: partial AppSettings fields
```
Note: secret fields return masked values (`****xxxx`); sending masked values back will NOT overwrite.

### Checklist Rules
```
GET /api/checklist-rules
PUT /api/checklist-rules    Body: ["rule1", "rule2", ...]
```

---

## Typical Workflows

### Workflow 1: Competitor Research -> Script Creation
```bash
# 1. Add a competitor
curl -X POST http://localhost:3000/api/competitors \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.xiaohongshu.com/user/profile/xxxxx"}'

# 2. Sync their notes
curl -X POST http://localhost:3000/api/competitors/sync \
  -H 'Content-Type: application/json' \
  -d '{"competitor_id":"comp_xxx"}'

# 3. Get top performing notes
curl -X POST http://localhost:3000/api/competitors/top-notes \
  -H 'Content-Type: application/json' \
  -d '{"competitor_id":"comp_xxx"}'

# 4. Analyze a top note
curl -X POST http://localhost:3000/api/competitors/analyze \
  -H 'Content-Type: application/json' \
  -d '{"id":"cnote_xxx","transcribe_audio":true}'

# 5. Import as material
curl -X POST http://localhost:3000/api/materials/search-trending \
  -H 'Content-Type: application/json' \
  -d '{"internal_id":"cnote_xxx"}'

# 6. Generate scripts from material
curl -X POST http://localhost:3000/api/ai/generate \
  -H 'Content-Type: application/json' \
  -d '{"materialId":"mat_xxx"}'
```

### Workflow 2: URL -> Material -> Script -> Publish Content
```bash
# 1. Import any URL as material
curl -X POST http://localhost:3000/api/materials/import-url \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/article"}'

# 2. Generate scripts
curl -X POST http://localhost:3000/api/ai/generate \
  -H 'Content-Type: application/json' \
  -d '{"materialId":"mat_xxx"}'

# 3. Save chosen script
curl -X POST http://localhost:3000/api/scripts \
  -H 'Content-Type: application/json' \
  -d '{ ... script data ... }'

# 4. Generate platform-specific publish content
curl -X POST http://localhost:3000/api/ai/publish \
  -H 'Content-Type: application/json' \
  -d '{"scriptId":"scr_xxx","platform":"xiaohongshu"}'

# 5. Create publish record and auto-draft
curl -X POST http://localhost:3000/api/publish \
  -H 'Content-Type: application/json' \
  -d '{"script_id":"scr_xxx","platforms":{"xiaohongshu":{...}}}'

curl -X POST http://localhost:3000/api/publish/xhs/auto-draft \
  -H 'Content-Type: application/json' \
  -d '{"scriptId":"scr_xxx","publishRecordId":"pub_xxx"}'
```

### Workflow 3: Quick Script from XHS Note Link
```bash
# Scrape + AI breakdown in one call
curl -X POST http://localhost:3000/api/scripts/breakdown \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.xiaohongshu.com/explore/xxx","transcribe_audio":true}'
```
