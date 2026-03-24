/**
 * Marketing Agent OS — 定时调度器（出海版）
 *
 * 每日编排流水线：
 *   08:00  Analyst 日报 — 分析各渠道数据，更新胜出模式
 *   09:00  CEO 编排 — 读取分析结果，制定今日内容计划
 *   10:00  Content 生成 — 多平台内容批量创作
 *   10:30  SEO/GEO 优化 — 内容优化、meta 标签、AI 引用优化
 *   11:00  Brand Review — 品牌合规审查
 *
 * 启动方式：
 *   npx tsx scheduler.ts          # 前台运行
 *   npx tsx watch scheduler.ts    # 开发模式（热重载）
 */

import "dotenv/config";
import cron from "node-cron";

const TZ = "America/Los_Angeles"; // 出海默认 US Pacific Time

console.log("═══════════════════════════════════════════════════");
console.log("  Marketing Agent OS — Global Scheduler");
console.log(`  Started: ${new Date().toLocaleString("en-US", { timeZone: TZ })}`);
console.log(`  Timezone: ${TZ}`);
console.log("═══════════════════════════════════════════════════\n");

// ============================================================
// 08:00 — Analyst Agent 日报（数据飞轮）
// ============================================================
cron.schedule(
  "0 8 * * *",
  async () => {
    console.log(`\n[Scheduler] ${ts()} — Triggering Analyst daily report`);
    try {
      const { runAnalystAgent } = await import("./agents/analyst-agent.js");
      await runAnalystAgent();
    } catch (err) {
      console.error("[Scheduler] Analyst report failed:", err);
    }
  },
  { timezone: TZ }
);
console.log("[Scheduler] + Analyst Agent — Daily 08:00");

// ============================================================
// 09:00 — CEO Agent 出海营销编排
// ============================================================
cron.schedule(
  "0 9 * * *",
  async () => {
    console.log(`\n[Scheduler] ${ts()} — Triggering CEO daily orchestration`);
    try {
      const { runCEOAgent } = await import("./agents/ceo.js");
      await runCEOAgent();
    } catch (err) {
      console.error("[Scheduler] CEO orchestration failed:", err);
    }
  },
  { timezone: TZ }
);
console.log("[Scheduler] + CEO Agent — Daily 09:00");

// ============================================================
// 10:00 — Global Content 批量生成
// ============================================================
cron.schedule(
  "0 10 * * *",
  async () => {
    console.log(`\n[Scheduler] ${ts()} — Triggering Global Content generation`);
    try {
      const { runGlobalContentAgent } = await import("./agents/global-content-agent.js");
      await runGlobalContentAgent("Generate today's scheduled content based on the content calendar and CEO plan");
    } catch (err) {
      console.error("[Scheduler] Global Content generation failed:", err);
    }
  },
  { timezone: TZ }
);
console.log("[Scheduler] + Global Content Agent — Daily 10:00");

// ============================================================
// 10:30 — SEO/GEO 优化
// ============================================================
cron.schedule(
  "30 10 * * *",
  async () => {
    console.log(`\n[Scheduler] ${ts()} — Triggering SEO/GEO optimization`);
    try {
      const { runSEOExpertAgent } = await import("./agents/seo-expert-agent.js");
      await runSEOExpertAgent("Review and optimize today's generated content for SEO: meta tags, keywords, internal links");
    } catch (err) {
      console.error("[Scheduler] SEO optimization failed:", err);
    }

    try {
      const { runGEOExpertAgent } = await import("./agents/geo-expert-agent.js");
      await runGEOExpertAgent("Review today's content for GEO optimization: citation-worthiness, structured data, AI-friendly formatting");
    } catch (err) {
      console.error("[Scheduler] GEO optimization failed:", err);
    }
  },
  { timezone: TZ }
);
console.log("[Scheduler] + SEO/GEO Agents — Daily 10:30");

// ============================================================
// 11:00 — Brand Compliance Review
// ============================================================
cron.schedule(
  "0 11 * * *",
  async () => {
    console.log(`\n[Scheduler] ${ts()} — Triggering Brand Compliance review`);
    try {
      const { runBrandComplianceAgent } = await import("./agents/brand-compliance-agent.js");
      await runBrandComplianceAgent("Review all pending content from today's batch for brand compliance, audience fit, and platform policy adherence");
    } catch (err) {
      console.error("[Scheduler] Brand review failed:", err);
    }
  },
  { timezone: TZ }
);
console.log("[Scheduler] + Brand Compliance Agent — Daily 11:00");

// ============================================================
// Weekly: Email Campaigns (Monday 09:30)
// ============================================================
cron.schedule(
  "30 9 * * 1",
  async () => {
    console.log(`\n[Scheduler] ${ts()} — Triggering weekly Email campaign`);
    try {
      const { runEmailMarketingAgent } = await import("./agents/email-marketing-agent.js");
      await runEmailMarketingAgent("Create this week's newsletter email based on recent published content and upcoming promotions");
    } catch (err) {
      console.error("[Scheduler] Email campaign failed:", err);
    }
  },
  { timezone: TZ }
);
console.log("[Scheduler] + Email Agent — Weekly Monday 09:30");

// ============================================================
// Weekly: Meta Ads Review (Wednesday 10:00)
// ============================================================
cron.schedule(
  "0 10 * * 3",
  async () => {
    console.log(`\n[Scheduler] ${ts()} — Triggering Meta Ads weekly review`);
    try {
      const { runMetaAdsAgent } = await import("./agents/meta-ads-agent.js");
      await runMetaAdsAgent("Analyze this week's ad performance, pause underperformers, scale winners, and refresh creatives for top ad sets");
    } catch (err) {
      console.error("[Scheduler] Meta Ads review failed:", err);
    }
  },
  { timezone: TZ }
);
console.log("[Scheduler] + Meta Ads Agent — Weekly Wednesday 10:00");

// ============================================================
// 健康检查：每 5 分钟心跳
// ============================================================
let heartbeat = 0;
cron.schedule("*/5 * * * *", () => {
  heartbeat++;
  if (heartbeat % 12 === 0) {
    console.log(`[Scheduler] heartbeat — ${ts()} — uptime ${heartbeat * 5} min`);
  }
});

console.log("\n[Scheduler] All jobs registered. Waiting for triggers...");
console.log("[Scheduler] Manual test: npx tsx agents/ceo.ts \"your instruction\"\n");

// ============================================================
// Helper
// ============================================================
function ts(): string {
  return new Date().toLocaleString("en-US", { timeZone: TZ });
}
