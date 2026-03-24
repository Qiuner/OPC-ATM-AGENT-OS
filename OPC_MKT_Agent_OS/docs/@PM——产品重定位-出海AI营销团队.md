# OPC MKT Agent OS — 产品重定位方案

> 完成时间：2026-03-24
> 参与人员：PM、用户

---

## 一、定位转变

| | 旧定位 | 新定位 |
|---|--------|--------|
| **一句话** | AI 营销自动化平台 | **你的 AI 出海营销团队** |
| **英文** | AI Marketing Automation | **AI Marketing Team for Global Brands** |
| **目标市场** | 国内（小红书/抖音） | 出海（Meta/X/TikTok/LinkedIn/Email） |
| **目标用户** | 泛营销人员 | 跨境电商卖家、出海 DTC 品牌、Solo Founder |
| **核心价值** | 生成营销内容 | **自动管理海外全渠道营销，像拥有 5 人营销团队** |

---

## 二、目标用户

### 首要人群（Phase 1）

**跨境电商独立站卖家 + 出海 Solo Founder**

- 痛点：1-3 人团队，管不过来 5+ 海外平台
- 预算：月均营销 ¥5K-50K，愿为效率工具付费
- 决策链：老板即用户，试用→付费快
- 聚集地：出海笔记、即刻、V2EX、品玩、跨境知道

### 次要人群（Phase 2）

- 出海 DTC 品牌营销团队
- 出海 SaaS 公司增长团队
- MCN/代运营公司（服务出海客户）

---

## 三、Agent 团队重构

### 3.1 新角色定义

| Agent | 旧角色 | 新角色 | 核心能力 |
|-------|--------|--------|---------|
| **CEO** | 营销总监 | **出海营销总监** | 多渠道策略制定、任务拆分、ROI 分析 |
| **Content Agent** | XHS 创作专家 | **Global Content Creator** | 英文营销内容生成（Meta/X/TikTok/Blog/Email） |
| **Ads Agent** | _(新增)_ | **Paid Ads Manager** | Meta Ads + Google Ads 自动投放、预算分配、A/B 测试 |
| **Social Agent** | Growth Agent | **Social Media Manager** | X/LinkedIn/TikTok 日常运营、互动、增长策略 |
| **Analyst** | 数据分析师 | **Performance Analyst** | 全渠道数据汇总、ROI 报告、内容优化建议 |
| **Brand Reviewer** | 品牌风控 | **Brand & Compliance** | 品牌一致性审查 + 各平台合规检查 |

### 3.2 工作流程

```
每日自动循环（Scheduler 驱动）：

06:00  Analyst 回收昨日全渠道数据 → 生成日报
07:00  CEO 根据日报 + 周计划 → 制定今日任务
08:00  Content Agent 生成今日内容（按平台适配）
09:00  Brand Reviewer 审核内容
10:00  Social Agent 发布到 X/LinkedIn/TikTok
10:30  Ads Agent 更新 Meta/Google 广告素材和预算
18:00  Analyst 中间回收数据 → 实时优化建议
22:00  CEO 生成今日总结 → 准备明日计划
```

---

## 四、平台集成优先级

### P0 — 必须（MVP）

| 平台 | API | 能力 | 说明 |
|------|-----|------|------|
| **Meta Ads** | Marketing API | 创建广告 + 投放 + 数据回收 | 出海品牌 60-80% 预算 |
| **X (Twitter)** | v2 API | 发推 + 回复 + 分析 | 品牌曝光核心渠道 |
| **Email** | SendGrid API | 发送营销邮件 + 自动化序列 | 转化率最高渠道 |

### P1 — 重要

| 平台 | API | 能力 |
|------|-----|------|
| **TikTok** | Marketing API | 视频发布 + 广告投放 |
| **LinkedIn** | Marketing API | B2B 内容发布 + Lead Gen |
| **Google Ads** | Ads API | 搜索广告 + Shopping Ads |

### P2 — 增值

| 平台 | API | 能力 |
|------|-----|------|
| Shopify | Admin API | 产品数据同步、促销联动 |
| Google Analytics | GA4 API | 网站流量分析 |
| Stripe | API | 营收数据关联 |

---

## 五、技术架构调整

### 5.1 Agent SOP 改造

```
engine/skills/
├── global-content.SKILL.md      # 英文多平台内容生成 SOP（替换 xhs.SKILL.md）
├── meta-ads.SKILL.md            # Meta Ads 投放 SOP（新增）
├── social-manager.SKILL.md      # 社交媒体运营 SOP（替换 growth.SKILL.md）
├── email-marketing.SKILL.md     # Email 营销 SOP（新增）
├── performance-analyst.SKILL.md # 数据分析 SOP（替换 analyst.SKILL.md）
├── brand-compliance.SKILL.md    # 品牌合规 SOP（更新）
└── ceo-global.SKILL.md          # 出海营销总监 SOP（更新）
```

### 5.2 MCP 服务集成

```
engine/mcps/
├── meta-ads/          # Meta Marketing API 封装
├── x-twitter/         # X API v2 封装
├── sendgrid/          # Email 发送服务
├── tiktok-marketing/  # TikTok Marketing API
├── linkedin/          # LinkedIn Marketing API
└── analytics/         # Google Analytics 数据回收
```

### 5.3 数据模型扩展

```typescript
// 新增字段
interface Content {
  // ...existing
  platform: 'meta' | 'x' | 'tiktok' | 'linkedin' | 'email' | 'blog';
  language: 'en' | 'zh';        // 内容语言
  published_url?: string;        // 发布后的链接
  ad_set_id?: string;           // 关联的广告组
}

interface Campaign {
  // ...existing
  channels: string[];           // 投放渠道
  budget: number;               // 总预算
  budget_allocation: Record<string, number>; // 按渠道分配
  target_markets: string[];     // 目标市场（US/EU/SEA...）
}
```

---

## 六、定价方案

| 版本 | 价格 | 包含 |
|------|------|------|
| **Starter** | ¥299/月 | 1 个平台 + 内容生成 + 每日 1 次自动执行 |
| **Pro** | ¥699/月 | 3 个平台 + 自动投放 + 数据分析 + 每日 3 次 |
| **Team** | ¥1,499/月 | 全平台 + 数据飞轮 + 自定义 Agent + 无限执行 |
| **Enterprise** | 定制 | 多品牌管理 + 专属部署 + API 接入 |

---

## 七、Go-to-Market 计划

### Phase 1: MVP 验证（2 周）

1. 接入 Meta Ads + X API
2. 英文内容 Agent 上线
3. 定时执行循环跑通
4. 在出海社群找 5 个种子用户试用

### Phase 2: 产品打磨（1 个月）

1. 数据飞轮闭环
2. Email 营销集成
3. Dashboard 展示 ROI
4. Landing Page + 定价页

### Phase 3: 增长（持续）

1. 内容营销（用自己的产品做自己的出海营销）
2. Product Hunt Launch
3. 出海社群推广
4. KOL 合作

---

## 八、与 Polsia 的差异化壁垒

| 维度 | Polsia | 我们 |
|------|--------|------|
| **定位** | 运营整个公司（太泛） | 聚焦出海营销（深且专） |
| **界面** | 英文 | 中文（出海团队友好） |
| **营销深度** | 通用内容生成 | 平台级 SOP（Meta Ads 有专门优化逻辑） |
| **内容审核** | 几乎没有 | Brand & Compliance Agent 专门审核 |
| **数据分析** | 基础 | 跨渠道 ROI 归因 |
| **价格** | $49/月 | ¥299 起（更亲民） |
