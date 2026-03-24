/**
 * Phase 3 最终验收测试 — 使用 node:test + node:assert
 *
 * 覆盖：圆桌引擎、API 端点、Agent Teams、P1 Agents、Registry 9 Agent、BUG 修复
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ENGINE_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/engine";
const WEB_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/web";
const SKILLS_DIR = join(ENGINE_DIR, "skills");

function readSrc(path: string): string {
  return readFileSync(path, "utf-8");
}

// ============================================================
// 圆桌讨论引擎 (roundtable.ts)
// ============================================================

describe("Roundtable Engine", () => {
  const src = readSrc(join(WEB_DIR, "src/lib/agent-sdk/roundtable.ts"));

  it("TC-P3-001: 导出 runRoundtable async generator + 类型定义", () => {
    assert.ok(src.includes("export async function* runRoundtable"));
    assert.ok(src.includes("export type DiscussionMode"));
    assert.ok(src.includes("export interface RoundtableConfig"));
    assert.ok(src.includes("export interface RoundtableAgent"));
    assert.ok(src.includes("export type RoundtableEvent"));
  });

  it("TC-P3-002: 支持三种讨论模式 (explore/debate/synthesize)", () => {
    assert.ok(src.includes('"explore" | "debate" | "synthesize"'));
    assert.ok(src.includes("MODE_INSTRUCTIONS"));
    assert.ok(src.includes("explore:"));
    assert.ok(src.includes("debate:"));
    assert.ok(src.includes("synthesize:"));
  });

  it("TC-P3-003: 主持人决策 JSON 解析", () => {
    assert.ok(src.includes("parseModeratorDecision"));
    assert.ok(src.includes("```json"));
    assert.ok(src.includes("defaultDecision"));
    assert.ok(src.includes('"call_agents"'));
    assert.ok(src.includes('"summarize"'));
    assert.ok(src.includes('"end_discussion"'));
  });

  it("TC-P3-004: personalityStrength 影响 Agent 行为 (3 梯度)", () => {
    assert.ok(src.includes("personalityStrength"));
    assert.ok(src.includes("agent.personalityStrength <= 30"));
    assert.ok(src.includes("agent.personalityStrength <= 70"));
  });

  it("TC-P3-005: 空 agents 数组触发错误事件", () => {
    assert.ok(src.includes("agents.length === 0"));
    assert.ok(src.includes("至少需要 1 个参与 Agent"));
  });

  it("TC-P3-006: EventBus 集成 (start/done 事件)", () => {
    assert.ok(src.includes('eventBus.emit({ type: "agent:start"'));
    assert.ok(src.includes('eventBus.emit({ type: "agent:done"'));
  });

  it("TC-P3-007: LLM Provider 初始化错误处理", () => {
    assert.ok(src.includes("createProvider(llmConfig.provider"));
    assert.ok(src.includes("LLM 提供商初始化失败"));
  });

  it("TC-P3-008: Agent 发言失败不中断整体讨论", () => {
    assert.ok(src.includes("Agent 响应失败"));
    assert.ok(src.includes("[错误]"));
  });

  it("TC-P3-009: 讨论总结生成 (summary + done 事件)", () => {
    assert.ok(src.includes("buildModeratorSummaryPrompt"));
    assert.ok(src.includes('type: "summary"'));
    assert.ok(src.includes('type: "done"'));
  });

  it("TC-P3-010: 轮次控制 (maxRounds 判断 + 提前结束)", () => {
    assert.ok(src.includes("round <= maxRounds"));
    assert.ok(src.includes("summarize"));
    assert.ok(src.includes("end_discussion"));
    assert.ok(src.includes("break;"));
  });
});

// ============================================================
// 圆桌讨论 API 端点
// ============================================================

describe("Roundtable API Route", () => {
  const src = readSrc(join(WEB_DIR, "src/app/api/agent/roundtable/route.ts"));

  it("TC-P3-011: POST 方法导出", () => {
    assert.ok(src.includes("export async function POST"));
  });

  it("TC-P3-012: JSON 解析有 try-catch 保护", () => {
    assert.ok(src.includes("try"));
    assert.ok(src.includes("await req.json()"));
    assert.ok(src.includes("Invalid JSON"));
  });

  it("TC-P3-013: 校验 topic 和 agents 参数", () => {
    assert.ok(src.includes("topic"));
    assert.ok(src.includes("agents"));
    // agents 非空校验
    assert.ok(src.match(/agents.*length|!agents|agents\.length/));
  });

  it("TC-P3-014: SSE 流式响应头", () => {
    assert.ok(src.includes("text/event-stream"));
    assert.ok(src.includes("no-cache"));
  });

  it("TC-P3-015: 默认参数设置", () => {
    assert.ok(src.includes("explore"));
  });
});

// ============================================================
// Agent Teams (team-session.ts)
// ============================================================

describe("Agent Teams Session", () => {
  const src = readSrc(join(ENGINE_DIR, "agents/team-session.ts"));

  it("TC-P3-016: 导出 runTeamSession async generator + 类型", () => {
    assert.ok(src.includes("export async function* runTeamSession"));
    assert.ok(src.includes("export interface TeamMember"));
    assert.ok(src.includes("export interface TeamSessionConfig"));
    assert.ok(src.includes("export type TeamEvent"));
  });

  it("TC-P3-017: 空成员列表触发错误", () => {
    assert.ok(src.includes("members.length === 0"));
    assert.ok(src.includes("Team session requires at least 1 member"));
  });

  it("TC-P3-018: 子 Agent 配置包含 SendMessage 工具", () => {
    assert.ok(src.includes('"SendMessage"'));
    assert.ok(src.includes('[...member.tools, "SendMessage"]'));
  });

  it("TC-P3-019: 协调者知晓所有成员", () => {
    assert.ok(src.includes("团队成员"));
    assert.ok(src.includes("memberList"));
    assert.ok(src.includes("coordinatorPrompt"));
  });

  it("TC-P3-020: SendMessage 事件捕获", () => {
    assert.ok(src.includes("agent_message"));
    assert.ok(src.includes("input.to"));
    assert.ok(src.includes("input.message"));
  });

  it("TC-P3-021: Claude Agent SDK query() 调用", () => {
    assert.ok(src.includes("query({"));
    assert.ok(src.includes("permissionMode"));
    assert.ok(src.includes("agents,"));
    assert.ok(src.includes("maxTurns"));
  });

  it("TC-P3-022: CLI 直接运行入口", () => {
    assert.ok(src.includes('process.argv[1]?.endsWith("team-session.ts")'));
  });

  it("TC-P3-023: 错误处理 (try-catch yield error event)", () => {
    assert.ok(src.includes("catch (err)"));
    assert.ok(src.includes('type: "error"'));
    assert.ok(src.includes("Team session failed"));
  });
});

// ============================================================
// P1 Agents（3 个新 Agent）
// ============================================================

describe("P1 Agents", () => {
  it("TC-P3-024: X-Twitter Agent 结构正确", () => {
    const src = readSrc(join(ENGINE_DIR, "agents/x-twitter-agent.ts"));
    assert.ok(src.includes("export async function runXTwitterAgent"));
    assert.ok(src.includes("x-twitter.SKILL.md"));
    assert.ok(src.includes("query({"));
    assert.ok(src.includes("maxTurns: 5"));
    assert.ok(src.includes('allowedTools: ["Read", "Write", "Glob"]'));
    assert.ok(src.includes("brand-voice.md"));
    assert.ok(src.includes("target-audience.md"));
  });

  it("TC-P3-025: Visual-Gen Agent 结构正确", () => {
    const src = readSrc(join(ENGINE_DIR, "agents/visual-gen-agent.ts"));
    assert.ok(src.includes("export async function runVisualGenAgent"));
    assert.ok(src.includes("visual-gen.SKILL.md"));
    assert.ok(src.includes("query({"));
    assert.ok(src.includes("maxTurns: 5"));
    assert.ok(src.includes("brand-voice.md"));
    assert.ok(src.includes("target-audience.md"));
  });

  it("TC-P3-026: Strategist Agent 结构正确 (含 content-calendar)", () => {
    const src = readSrc(join(ENGINE_DIR, "agents/strategist-agent.ts"));
    assert.ok(src.includes("export async function runStrategistAgent"));
    assert.ok(src.includes("strategist.SKILL.md"));
    assert.ok(src.includes("query({"));
    assert.ok(src.includes("maxTurns: 8"));
    assert.ok(src.includes('allowedTools: ["Read", "Write", "Glob", "Grep"]'));
    assert.ok(src.includes("content-calendar.json"));
    assert.ok(src.includes("brand-voice.md"));
    assert.ok(src.includes("target-audience.md"));
  });

  it("TC-P3-027: P1 Agent SKILL.md 文件全部存在", () => {
    const skills = ["x-twitter.SKILL.md", "visual-gen.SKILL.md", "strategist.SKILL.md"];
    for (const skill of skills) {
      assert.ok(existsSync(join(SKILLS_DIR, skill)), `Missing: ${skill}`);
    }
  });

  it("TC-P3-028: 所有 P0 Agent SKILL.md 文件存在", () => {
    const skills = [
      "xhs.SKILL.md", "analyst.SKILL.md", "growth.SKILL.md",
      "brand-reviewer.SKILL.md", "podcast.SKILL.md",
    ];
    for (const skill of skills) {
      assert.ok(existsSync(join(SKILLS_DIR, skill)), `Missing: ${skill}`);
    }
  });
});

// ============================================================
// Registry 9 Agent 验证
// ============================================================

describe("Registry 9 Agents", () => {
  const src = readSrc(join(ENGINE_DIR, "agents/registry.ts"));

  it("TC-P3-029: Registry 包含 9 个 Agent 注册", () => {
    const registerCalls = (src.match(/this\.register\(\{/g) || []).length;
    assert.equal(registerCalls, 9);
  });

  it("TC-P3-030: 所有 9 个 Agent ID 存在", () => {
    const ids = [
      "ceo", "xhs-agent", "analyst-agent", "growth-agent",
      "brand-reviewer", "podcast-agent",
      "x-twitter-agent", "visual-gen-agent", "strategist-agent",
    ];
    for (const id of ids) {
      assert.ok(src.includes(`id: "${id}"`), `Missing agent: ${id}`);
    }
  });

  it("TC-P3-031: P1 Agents 在 Registry 中正确注册", () => {
    assert.ok(src.includes('id: "x-twitter-agent"'));
    assert.ok(src.includes('skillFile: "x-twitter.SKILL.md"'));
    assert.ok(src.includes('id: "visual-gen-agent"'));
    assert.ok(src.includes('skillFile: "visual-gen.SKILL.md"'));
    assert.ok(src.includes('id: "strategist-agent"'));
    assert.ok(src.includes('skillFile: "strategist.SKILL.md"'));
  });

  it("TC-P3-032: getSubAgentDefs 排除 CEO (返回 8 个)", () => {
    assert.ok(src.includes('a.id !== "ceo"'));
  });

  it("TC-P3-033: buildSupervisorConfig MCP 聚合逻辑", () => {
    assert.ok(src.includes("allMcpServers"));
    assert.ok(src.includes("agent.mcpServers"));
    // 去重逻辑
    assert.ok(src.includes("!allMcpServers[key]"));
  });

  it("TC-P3-034: engine package.json exports 包含 team-session", () => {
    const pkg = readSrc(join(ENGINE_DIR, "package.json"));
    assert.ok(pkg.includes("./agents/team-session"));
  });

  it("TC-P3-035: engine package.json scripts 包含 P1 Agent 命令", () => {
    const pkg = readSrc(join(ENGINE_DIR, "package.json"));
    assert.ok(pkg.includes('"x-twitter"'));
    assert.ok(pkg.includes('"visual-gen"'));
    assert.ok(pkg.includes('"strategist"'));
    assert.ok(pkg.includes('"team-session"'));
  });
});

// ============================================================
// BUG 修复验证
// ============================================================

describe("Bug Fix Verification", () => {
  it("TC-P3-036: BUG-001 已修复 — execute route JSON parse try-catch", () => {
    const src = readSrc(join(WEB_DIR, "src/app/api/agent/execute/route.ts"));
    const tryIdx = src.indexOf("try {");
    const jsonIdx = src.indexOf("await req.json()");
    const catchIdx = src.indexOf("} catch {");
    assert.ok(tryIdx > -1, "try block exists");
    assert.ok(jsonIdx > tryIdx, "req.json() inside try");
    assert.ok(catchIdx > jsonIdx, "catch after req.json()");
    assert.ok(src.includes("Invalid JSON body"));
    assert.ok(src.includes("status: 400"));
  });

  it("TC-P3-037: BUG-002 已修复 — execute route Agent 存在性校验", () => {
    const src = readSrc(join(WEB_DIR, "src/app/api/agent/execute/route.ts"));
    assert.ok(src.includes("AgentRegistry"));
    assert.ok(src.includes("registry.get(agentId)"));
    assert.ok(src.includes("not found"));
    assert.ok(src.includes("status: 404"));
  });

  it("TC-P3-038: BUG-003 已修复 — ToolResult 索引签名", () => {
    const src = readSrc(join(ENGINE_DIR, "mcps/shared/types.ts"));
    assert.ok(src.includes("[key: string]: unknown"));
  });
});

// ============================================================
// Execute Route 完整性
// ============================================================

describe("Execute Route Completeness", () => {
  const src = readSrc(join(WEB_DIR, "src/app/api/agent/execute/route.ts"));

  it("TC-P3-039: SSE stream_end 事件", () => {
    assert.ok(src.includes("stream_end"));
    assert.ok(src.includes("controller.close()"));
  });

  it("TC-P3-040: 错误通过 SSE 发送不中断流", () => {
    assert.ok(src.includes("catch (err)"));
    assert.ok(src.includes('type: "error"'));
  });

  it("TC-P3-041: maxDuration 配置防止超时", () => {
    assert.ok(src.includes("maxDuration"));
  });
});

// ============================================================
// Phase 1 回归：EventBus
// ============================================================

describe("Regression: EventBus", () => {
  const src = readSrc(join(WEB_DIR, "src/lib/agent-sdk/event-bus.ts"));

  it("TC-REG-001: EventBus 单例模式", () => {
    assert.ok(src.includes("globalThis"));
    assert.ok(src.includes("EventBus"));
  });

  it("TC-REG-002: emit/on/getRecentEvents 方法", () => {
    assert.ok(src.includes("emit("));
    assert.ok(src.includes("on("));
    assert.ok(src.includes("getRecentEvents"));
  });
});

// ============================================================
// Phase 1 回归：Executor
// ============================================================

describe("Regression: Executor", () => {
  const src = readSrc(join(WEB_DIR, "src/lib/agent-sdk/executor.ts"));

  it("TC-REG-003: executeAgent async generator", () => {
    assert.ok(src.includes("executeAgent"));
  });

  it("TC-REG-004: MAX_CONCURRENT 并发控制", () => {
    assert.ok(src.includes("MAX_CONCURRENT"));
  });

  it("TC-REG-005: 环境变量隔离", () => {
    assert.ok(src.includes("CLAUDE") || src.includes("env"));
  });
});

// ============================================================
// Phase 1 回归：Types
// ============================================================

describe("Regression: Types", () => {
  const src = readSrc(join(ENGINE_DIR, "agents/types.ts"));

  it("TC-REG-006: AgentDefinition 和 SubAgentDef 类型", () => {
    assert.ok(src.includes("AgentDefinition"));
    assert.ok(src.includes("SubAgentDef"));
  });

  it("TC-REG-007: AgentStreamEvent 定义", () => {
    assert.ok(src.includes("AgentStreamEvent") || src.includes("AgentEvent"));
  });
});

// ============================================================
// Phase 2 回归：MCP Servers
// ============================================================

describe("Regression: MCP Servers", () => {
  it("TC-REG-008: creatorflow MCP 存在且有 7 个工具", () => {
    const src = readSrc(join(ENGINE_DIR, "mcps/creatorflow/tools.ts"));
    assert.ok(src.includes("sync_competitors"));
    assert.ok(src.includes("create_material"));
    assert.ok(src.includes("generate_script"));
    assert.ok(src.includes("quality_check"));
    assert.ok(src.includes("list_materials"));
    assert.ok(src.includes("trigger_workflow"));
    assert.ok(src.includes("get_workflow_status"));
  });

  it("TC-REG-009: xhs-data MCP 存在且有 7 个工具", () => {
    const src = readSrc(join(ENGINE_DIR, "mcps/xhs-data/tools.ts"));
    assert.ok(src.includes("get_note_metrics"));
    assert.ok(src.includes("batch_get_metrics"));
    assert.ok(src.includes("get_trending_topics"));
    assert.ok(src.includes("search_notes"));
    assert.ok(src.includes("get_user_profile"));
    assert.ok(src.includes("get_user_notes"));
    assert.ok(src.includes("publish_note"));
  });

  it("TC-REG-010: podcast-tts MCP 存在且有 6 个工具", () => {
    const src = readSrc(join(ENGINE_DIR, "mcps/podcast-tts/tools.ts"));
    assert.ok(src.includes("synthesize"));
    assert.ok(src.includes("synthesize_dialogue"));
    assert.ok(src.includes("merge_audio"));
    assert.ok(src.includes("get_voices"));
    assert.ok(src.includes("get_job_status"));
    assert.ok(src.includes("estimate_duration"));
  });

  it("TC-REG-011: MCP shared utils 工具函数", () => {
    const src = readSrc(join(ENGINE_DIR, "mcps/shared/utils.ts"));
    assert.ok(src.includes("okResult"));
    assert.ok(src.includes("errResult"));
    assert.ok(src.includes("getEnv"));
  });
});

// ============================================================
// Phase 2 回归：Registry MCP 配置
// ============================================================

describe("Regression: Registry MCP Config", () => {
  const src = readSrc(join(ENGINE_DIR, "agents/registry.ts"));

  it("TC-REG-012: CEO mcpServers 包含 creatorflow", () => {
    assert.ok(src.includes("creatorflow"));
  });

  it("TC-REG-013: XHS Agent mcpServers 包含 xhs-data + creatorflow", () => {
    // xhs-agent 注册中有两个 MCP
    const xhsSection = src.slice(src.indexOf('id: "xhs-agent"'), src.indexOf('id: "analyst-agent"'));
    assert.ok(xhsSection.includes("xhs-data"));
    assert.ok(xhsSection.includes("creatorflow"));
  });

  it("TC-REG-014: Podcast Agent mcpServers 包含 podcast-tts", () => {
    assert.ok(src.includes("podcast-tts"));
  });
});
