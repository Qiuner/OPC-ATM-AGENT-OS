/**
 * Marketing Agent OS — 定时调度器
 *
 * 启动方式：
 *   npx tsx scheduler.ts          # 前台运行
 *   npx tsx watch scheduler.ts    # 开发模式（热重载）
 */

import "dotenv/config";
import cron from "node-cron";

console.log("═══════════════════════════════════════════");
console.log("  Marketing Agent OS — 调度器启动");
console.log(`  时间: ${new Date().toLocaleString("zh-CN")}`);
console.log("═══════════════════════════════════════════\n");

// ============================================================
// CEO Agent：每天早上 9 点运行
// ============================================================
cron.schedule(
  "0 9 * * *",
  async () => {
    console.log(`\n[Scheduler] ${new Date().toLocaleString("zh-CN")} — 触发 CEO 日常编排`);
    try {
      const { runCEOAgent } = await import("./agents/ceo.js");
      await runCEOAgent();
    } catch (err) {
      console.error("[Scheduler] CEO 编排失败:", err);
    }
  },
  { timezone: "Asia/Shanghai" }
);
console.log("[Scheduler] ✓ CEO Agent — 每日 09:00 (Asia/Shanghai)");

// ============================================================
// Analyst Agent：每周一早上 8 点运行（飞轮）
// ============================================================
cron.schedule(
  "0 8 * * 1",
  async () => {
    console.log(`\n[Scheduler] ${new Date().toLocaleString("zh-CN")} — 触发 Analyst 飞轮分析`);
    try {
      const { runAnalystAgent } = await import("./agents/analyst-agent.js");
      await runAnalystAgent();
    } catch (err) {
      console.error("[Scheduler] Analyst 分析失败:", err);
    }
  },
  { timezone: "Asia/Shanghai" }
);
console.log("[Scheduler] ✓ Analyst Agent — 每周一 08:00 (Asia/Shanghai)");

// ============================================================
// 健康检查：每 5 分钟输出心跳
// ============================================================
let heartbeat = 0;
cron.schedule("*/5 * * * *", () => {
  heartbeat++;
  if (heartbeat % 12 === 0) {
    // 每小时输出一次
    console.log(`[Scheduler] 💓 运行中 — ${new Date().toLocaleString("zh-CN")} — 已运行 ${heartbeat * 5} 分钟`);
  }
});

console.log("\n[Scheduler] 所有定时任务已注册，等待触发...");
console.log("[Scheduler] 手动测试：npx tsx agents/ceo.ts \"你的指令\"\n");
