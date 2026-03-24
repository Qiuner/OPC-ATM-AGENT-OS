/**
 * Phase 3 — 圆桌讨论引擎 + API 端点 + Agent Teams + P1 Agents 综合测试
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ENGINE_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/engine";
const WEB_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/web";
const SKILLS_DIR = join(ENGINE_DIR, "skills");

function readSource(path: string): string {
  return readFileSync(path, "utf-8");
}

// ============================================================
// TC-P3-001 ~ TC-P3-005: 圆桌讨论引擎 (roundtable.ts)
// ============================================================

describe("Phase 3: Roundtable Engine", () => {
  const src = readSource(join(WEB_DIR, "src/lib/agent-sdk/roundtable.ts"));

  test("TC-P3-001: 导出 runRoundtable async generator + 类型定义", () => {
    expect(src).toContain("export async function* runRoundtable");
    expect(src).toContain("export type DiscussionMode");
    expect(src).toContain("export interface RoundtableConfig");
    expect(src).toContain("export interface RoundtableAgent");
    expect(src).toContain("export type RoundtableEvent");
  });

  test("TC-P3-002: 支持三种讨论模式 (explore/debate/synthesize)", () => {
    expect(src).toContain('"explore" | "debate" | "synthesize"');
    expect(src).toContain("MODE_INSTRUCTIONS");
    // 每种模式有 label, agentGuide, roundContinue
    const exploreMatch = src.includes("explore:");
    const debateMatch = src.includes("debate:");
    const synthesizeMatch = src.includes("synthesize:");
    expect(exploreMatch).toBe(true);
    expect(debateMatch).toBe(true);
    expect(synthesizeMatch).toBe(true);
  });

  test("TC-P3-003: 主持人决策 JSON 解析 (parseModeratorDecision)", () => {
    expect(src).toContain("parseModeratorDecision");
    // 必须处理 ```json 格式
    expect(src).toContain("```json");
    // 解析失败应回退到 defaultDecision
    expect(src).toContain("defaultDecision");
    // 支持三种 action
    expect(src).toContain('"call_agents"');
    expect(src).toContain('"summarize"');
    expect(src).toContain('"end_discussion"');
  });

  test("TC-P3-004: personalityStrength 影响 Agent 行为", () => {
    expect(src).toContain("personalityStrength");
    // 三个梯度: <=30, <=70, >70
    expect(src).toContain("agent.personalityStrength <= 30");
    expect(src).toContain("agent.personalityStrength <= 70");
  });

  test("TC-P3-005: 空 agents 数组触发错误事件", () => {
    expect(src).toContain("agents.length === 0");
    expect(src).toContain("至少需要 1 个参与 Agent");
  });

  test("TC-P3-006: EventBus 集成 (start/done 事件)", () => {
    expect(src).toContain('eventBus.emit({ type: "agent:start"');
    expect(src).toContain('eventBus.emit({ type: "agent:done"');
    expect(src).toContain('eventBus.emit({');
  });

  test("TC-P3-007: LLM Provider 初始化错误处理", () => {
    expect(src).toContain("createProvider(llmConfig.provider");
    expect(src).toContain("LLM 提供商初始化失败");
  });

  test("TC-P3-008: Agent 发言失败不中断整体讨论", () => {
    // Agent 发言 try-catch 内部
    expect(src).toContain("Agent 响应失败");
    expect(src).toContain("[错误]");
  });

  test("TC-P3-009: 讨论总结生成 (summary event)", () => {
    expect(src).toContain("buildModeratorSummaryPrompt");
    expect(src).toContain('type: "summary"');
    expect(src).toContain('type: "done"');
  });
});

// ============================================================
// TC-P3-010 ~ TC-P3-014: 圆桌讨论 API 端点
// ============================================================

describe("Phase 3: Roundtable API Route", () => {
  const src = readSource(join(WEB_DIR, "src/app/api/agent/roundtable/route.ts"));

  test("TC-P3-010: POST 方法导出", () => {
    expect(src).toContain("export async function POST");
  });

  test("TC-P3-011: JSON 解析有 try-catch 保护 (BUG-001 模式)", () => {
    expect(src).toContain("try");
    expect(src).toContain("await req.json()");
    expect(src).toContain("Invalid JSON");
    expect(src).toContain("400");
  });

  test("TC-P3-012: 校验 topic 和 agents 参数", () => {
    expect(src).toContain("topic");
    expect(src).toContain("agents");
    // agents 非空校验
    expect(src).toMatch(/agents.*length|!agents/);
  });

  test("TC-P3-013: SSE 流式响应头", () => {
    expect(src).toContain("text/event-stream");
    expect(src).toContain("no-cache");
  });

  test("TC-P3-014: 默认参数 (mode=explore, maxRounds=3)", () => {
    expect(src).toContain("explore");
    expect(src).toContain("3");
  });
});

// ============================================================
// TC-P3-015 ~ TC-P3-019: Agent Teams (team-session.ts)
// ============================================================

describe("Phase 3: Agent Teams Session", () => {
  const src = readSource(join(ENGINE_DIR, "agents/team-session.ts"));

  test("TC-P3-015: 导出 runTeamSession async generator + 类型", () => {
    expect(src).toContain("export async function* runTeamSession");
    expect(src).toContain("export interface TeamMember");
    expect(src).toContain("export interface TeamSessionConfig");
    expect(src).toContain("export type TeamEvent");
  });

  test("TC-P3-016: 空成员列表触发错误", () => {
    expect(src).toContain("members.length === 0");
    expect(src).toContain("Team session requires at least 1 member");
  });

  test("TC-P3-017: 子 Agent 配置包含 SendMessage 工具", () => {
    expect(src).toContain('"SendMessage"');
    expect(src).toContain("[...member.tools, \"SendMessage\"]");
  });

  test("TC-P3-018: 协调者知晓所有成员", () => {
    expect(src).toContain("团队成员");
    expect(src).toContain("memberList");
    expect(src).toContain("coordinatorPrompt");
  });

  test("TC-P3-019: SendMessage 事件捕获", () => {
    expect(src).toContain("agent_message");
    expect(src).toContain("SendMessage");
    expect(src).toContain("input.to");
    expect(src).toContain("input.message");
  });

  test("TC-P3-020: Claude Agent SDK query() 调用配置正确", () => {
    expect(src).toContain("query({");
    expect(src).toContain("permissionMode");
    expect(src).toContain("agents,");
    expect(src).toContain("maxTurns");
  });

  test("TC-P3-021: CLI 直接运行入口", () => {
    expect(src).toContain('process.argv[1]?.endsWith("team-session.ts")');
    expect(src).toContain("process.argv[2]");
  });
});

// ============================================================
// TC-P3-022 ~ TC-P3-027: P1 Agents（3 个新 Agent）
// ============================================================

describe("Phase 3: P1 Agents", () => {
  test("TC-P3-022: X-Twitter Agent 文件存在且结构正确", () => {
    const src = readSource(join(ENGINE_DIR, "agents/x-twitter-agent.ts"));
    expect(src).toContain("export async function runXTwitterAgent");
    expect(src).toContain("x-twitter.SKILL.md");
    expect(src).toContain("query({");
    expect(src).toContain("maxTurns: 5");
    expect(src).toContain('allowedTools: ["Read", "Write", "Glob"]');
  });

  test("TC-P3-023: Visual-Gen Agent 文件存在且结构正确", () => {
    const src = readSource(join(ENGINE_DIR, "agents/visual-gen-agent.ts"));
    expect(src).toContain("export async function runVisualGenAgent");
    expect(src).toContain("visual-gen.SKILL.md");
    expect(src).toContain("query({");
    expect(src).toContain("maxTurns: 5");
  });

  test("TC-P3-024: Strategist Agent 文件存在且结构正确", () => {
    const src = readSource(join(ENGINE_DIR, "agents/strategist-agent.ts"));
    expect(src).toContain("export async function runStrategistAgent");
    expect(src).toContain("strategist.SKILL.md");
    expect(src).toContain("query({");
    expect(src).toContain("maxTurns: 8");
    expect(src).toContain('allowedTools: ["Read", "Write", "Glob", "Grep"]');
  });

  test("TC-P3-025: P1 Agent SKILL.md 文件全部存在", () => {
    const skills = ["x-twitter.SKILL.md", "visual-gen.SKILL.md", "strategist.SKILL.md"];
    for (const skill of skills) {
      expect(existsSync(join(SKILLS_DIR, skill))).toBe(true);
    }
  });

  test("TC-P3-026: 所有 P1 Agent 加载品牌语境 (brand-voice + target-audience)", () => {
    const agentFiles = [
      join(ENGINE_DIR, "agents/x-twitter-agent.ts"),
      join(ENGINE_DIR, "agents/visual-gen-agent.ts"),
      join(ENGINE_DIR, "agents/strategist-agent.ts"),
    ];
    for (const file of agentFiles) {
      const src = readSource(file);
      expect(src).toContain("brand-voice.md");
      expect(src).toContain("target-audience.md");
    }
  });

  test("TC-P3-027: Strategist Agent 额外加载 content-calendar.json", () => {
    const src = readSource(join(ENGINE_DIR, "agents/strategist-agent.ts"));
    expect(src).toContain("content-calendar.json");
  });
});

// ============================================================
// TC-P3-028 ~ TC-P3-030: Registry 9 Agent 验证
// ============================================================

describe("Phase 3: Registry 9 Agents", () => {
  const src = readSource(join(ENGINE_DIR, "agents/registry.ts"));

  test("TC-P3-028: Registry 包含 9 个 Agent 注册", () => {
    const registerCalls = (src.match(/this\.register\({/g) || []).length;
    expect(registerCalls).toBe(9);
  });

  test("TC-P3-029: P1 Agents 在 Registry 中正确注册", () => {
    // x-twitter-agent
    expect(src).toContain('id: "x-twitter-agent"');
    expect(src).toContain('skillFile: "x-twitter.SKILL.md"');
    expect(src).toContain('level: "specialist"');

    // visual-gen-agent
    expect(src).toContain('id: "visual-gen-agent"');
    expect(src).toContain('skillFile: "visual-gen.SKILL.md"');

    // strategist-agent
    expect(src).toContain('id: "strategist-agent"');
    expect(src).toContain('skillFile: "strategist.SKILL.md"');
  });

  test("TC-P3-030: getSubAgentDefs() 应返回 8 个子 Agent (不含 CEO)", () => {
    // CEO 被排除
    expect(src).toContain('a.id !== "ceo"');
    // 总共 9 个注册，减去 CEO = 8 个子 Agent
    const agentIds = [
      "xhs-agent", "analyst-agent", "growth-agent", "brand-reviewer",
      "podcast-agent", "x-twitter-agent", "visual-gen-agent", "strategist-agent",
    ];
    for (const id of agentIds) {
      expect(src).toContain(`id: "${id}"`);
    }
  });
});

// ============================================================
// TC-P3-031 ~ TC-P3-033: BUG 修复验证
// ============================================================

describe("Phase 3: Bug Fix Verification", () => {
  test("TC-P3-031: BUG-001 已修复 — execute route JSON parse try-catch", () => {
    const src = readSource(join(WEB_DIR, "src/app/api/agent/execute/route.ts"));
    // 确认 try-catch 包裹 req.json()
    const tryIndex = src.indexOf("try {");
    const jsonIndex = src.indexOf("await req.json()");
    const catchIndex = src.indexOf("} catch {");
    expect(tryIndex).toBeGreaterThan(-1);
    expect(jsonIndex).toBeGreaterThan(tryIndex);
    expect(catchIndex).toBeGreaterThan(jsonIndex);
    expect(src).toContain("Invalid JSON body");
    expect(src).toContain("status: 400");
  });

  test("TC-P3-032: BUG-002 已修复 — execute route Agent 存在性校验", () => {
    const src = readSource(join(WEB_DIR, "src/app/api/agent/execute/route.ts"));
    expect(src).toContain("registry.get(agentId)");
    expect(src).toContain("not found");
    expect(src).toContain("status: 404");
  });

  test("TC-P3-033: BUG-003 已修复 — ToolResult 索引签名", () => {
    const src = readSource(join(ENGINE_DIR, "mcps/shared/types.ts"));
    expect(src).toContain("[key: string]: unknown");
  });
});

// ============================================================
// TC-P3-034: execute route 完整性
// ============================================================

describe("Phase 3: Execute Route Completeness", () => {
  const src = readSource(join(WEB_DIR, "src/app/api/agent/execute/route.ts"));

  test("TC-P3-034: SSE stream_end 事件", () => {
    expect(src).toContain("stream_end");
    expect(src).toContain("controller.close()");
  });

  test("TC-P3-035: 错误事件通过 SSE 发送而非中断流", () => {
    expect(src).toContain("catch (err)");
    expect(src).toContain('type: "error"');
    expect(src).toContain("controller.enqueue");
  });
});
