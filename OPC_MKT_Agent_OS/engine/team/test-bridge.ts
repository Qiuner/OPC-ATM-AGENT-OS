/**
 * 快速测试 — 验证 Claude Bridge 能否正常调用 Claude CLI
 *
 * 运行: npx tsx team/test-bridge.ts
 */

import { ClaudeBridge } from "./claude-bridge.js";

async function main() {
  console.log("=== Claude Bridge Test ===\n");

  // 测试 1: 检查 claude CLI 是否可用
  console.log("[Test 1] 检查 Claude CLI...");
  const bridge = new ClaudeBridge();

  try {
    let eventCount = 0;
    let resultText = "";

    for await (const event of bridge.execute({
      prompt: "回复 'Hello from Claude Bridge!' 这一句话即可，不要多说。",
      maxBudgetUsd: 0.50,
      model: "haiku",
      timeoutMs: 30_000,
    })) {
      eventCount++;

      if (event.type === "result") {
        resultText = (event.result as string) || "";
        console.log(`  [result] ${resultText.slice(0, 200)}`);
        console.log(`  [cost] $${event.total_cost_usd}`);
        console.log(`  [duration] ${event.duration_ms}ms`);
      } else if (event.type === "error") {
        console.error(`  [error] ${event.result}`);
      } else {
        // stream-json 事件
        console.log(`  [${event.type}] ${JSON.stringify(event).slice(0, 150)}`);
      }
    }

    console.log(`\n  Total events: ${eventCount}`);
    console.log(`  Result: ${resultText ? "OK" : "EMPTY"}\n`);

    if (resultText) {
      console.log("[Test 1] ✅ PASSED — Claude CLI 可正常调用\n");
    } else {
      console.log("[Test 1] ❌ FAILED — 未获取到结果\n");
    }
  } catch (err) {
    console.error("[Test 1] ❌ FAILED —", err);
  }

  // 测试 2: 验证 stream-json 格式
  console.log("[Test 2] 测试 stream-json 事件流...");

  try {
    const events: string[] = [];

    for await (const event of bridge.execute({
      prompt: "列出 3 个水果名称，用编号列表。",
      maxBudgetUsd: 0.50,
      model: "haiku",
      timeoutMs: 30_000,
    })) {
      events.push(event.type);
    }

    console.log(`  Event types: ${events.join(", ")}`);
    console.log(`  Total: ${events.length} events`);

    if (events.length > 0) {
      console.log("[Test 2] ✅ PASSED — stream-json 事件流正常\n");
    } else {
      console.log("[Test 2] ❌ FAILED — 无事件产出\n");
    }
  } catch (err) {
    console.error("[Test 2] ❌ FAILED —", err);
  }

  console.log("=== Tests Complete ===");
}

main().catch(console.error);
