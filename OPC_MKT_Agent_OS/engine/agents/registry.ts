/**
 * Agent Registry — 统一管理所有 Agent 的定义和配置
 *
 * 单例模式，web/ 和 engine/ 共享同一实例。
 * 提供两种 SDK 配置构建方法：
 * - buildDirectConfig()    — 单个 Agent 独立运行
 * - buildSupervisorConfig() — CEO 编排所有子 Agent
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition, MCPServerConfig, SubAgentDef } from "./types.js";

// 兼容 Turbopack：import.meta.dirname 可能 undefined
const __current_dir = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));

const ENGINE_DIR = join(__current_dir, "..");
const SKILLS_DIR = join(ENGINE_DIR, "skills");
const MEMORY_DIR = join(ENGINE_DIR, "memory");
const MCPS_DIR = join(ENGINE_DIR, "mcps");

async function loadFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentDefinition> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  // ============================================================
  // 注册默认 Agent（P0）
  // ============================================================

  private registerDefaults(): void {
    this.register({
      id: "ceo",
      name: "CEO 营销总监",
      nameEn: "CEO",
      description: "营销团队总指挥，需求拆解、子 Agent 调度与质量终审",
      skillFile: "",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob", "Grep", "Bash", "Agent"],
      mcpServers: {
        creatorflow: {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "creatorflow", "index.ts")],
        },
      },
      maxTurns: 30,
      level: "orchestrator",
      color: "#e74c3c",
      avatar: "CEO",
    });

    this.register({
      id: "xhs-agent",
      name: "小红书创作专家",
      nameEn: "XHS",
      description: "端到端小红书营销：搜索竞品→分析爆款→内容创作→审查→发布。支持真实数据抓取和自动发布。",
      skillFile: "xhs.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob", "WebSearch"],
      mcpServers: {
        "xhs-data": {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "xhs-data", "index.ts")],
        },
        creatorflow: {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "creatorflow", "index.ts")],
        },
        "image-gen": {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "image-gen", "index.ts")],
        },
      },
      maxTurns: 15,
      level: "specialist",
      color: "#ff2442",
      avatar: "XHS",
    });

    this.register({
      id: "analyst-agent",
      name: "数据飞轮分析师",
      nameEn: "Analyst",
      description: "分析内容表现数据，提炼胜出模式，更新 SKILL.md",
      skillFile: "analyst.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob", "Grep"],
      mcpServers: {
        "xhs-data": {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "xhs-data", "index.ts")],
        },
      },
      maxTurns: 10,
      level: "specialist",
      color: "#3498db",
      avatar: "AN",
    });

    this.register({
      id: "growth-agent",
      name: "增长营销专家",
      nameEn: "Growth",
      description: "选题研究、热点捕捉、竞品分析、发布策略",
      skillFile: "growth.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Glob", "Grep", "Bash"],
      mcpServers: {
        "xhs-data": {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "xhs-data", "index.ts")],
        },
      },
      maxTurns: 8,
      level: "specialist",
      color: "#00cec9",
      avatar: "G",
    });

    this.register({
      id: "brand-reviewer",
      name: "品牌风控审查",
      nameEn: "Reviewer",
      description: "审查内容合规性与品牌调性一致性",
      skillFile: "brand-reviewer.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Glob"],
      maxTurns: 3,
      level: "reviewer",
      color: "#a855f7",
      avatar: "BR",
    });

    this.register({
      id: "podcast-agent",
      name: "播客制作专家",
      nameEn: "Podcast",
      description: "生成播客脚本、对话式音频内容",
      skillFile: "podcast.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob"],
      mcpServers: {
        "podcast-tts": {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "podcast-tts", "index.ts")],
        },
      },
      maxTurns: 8,
      level: "specialist",
      color: "#e17055",
      avatar: "POD",
    });

    // ---- Global / 出海 Agents ----

    this.register({
      id: "global-content-agent",
      name: "全球内容创作",
      nameEn: "Content",
      description: "Generate English marketing content for Meta/X/TikTok/LinkedIn/Email/Blog",
      skillFile: "global-content.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob"],
      maxTurns: 8,
      level: "specialist",
      color: "#10b981",
      avatar: "GC",
    });

    this.register({
      id: "meta-ads-agent",
      name: "Meta 广告投手",
      nameEn: "Meta Ads",
      description: "Meta/Facebook/Instagram advertising — campaign creation, budget optimization, ROAS analysis",
      skillFile: "meta-ads.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob", "Bash"],
      maxTurns: 10,
      level: "specialist",
      color: "#1877f2",
      avatar: "MA",
    });

    this.register({
      id: "email-agent",
      name: "邮件营销专家",
      nameEn: "Email",
      description: "Email marketing automation — sequences, campaigns, A/B testing, deliverability",
      skillFile: "email-marketing.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob"],
      maxTurns: 6,
      level: "specialist",
      color: "#f59e0b",
      avatar: "EM",
    });

    this.register({
      id: "seo-agent",
      name: "SEO 专家",
      nameEn: "SEO",
      description: "Technical & content SEO — keyword research, on-page optimization, international SEO, link building strategy",
      skillFile: "seo-expert.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob", "Grep", "Bash"],
      maxTurns: 10,
      level: "specialist",
      color: "#059669",
      avatar: "SEO",
    });

    this.register({
      id: "geo-agent",
      name: "GEO 专家",
      nameEn: "GEO",
      description: "Generative Engine Optimization — optimize content for AI search engines (ChatGPT, Perplexity, Google AI Overview, Copilot)",
      skillFile: "geo-expert.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob", "Grep"],
      maxTurns: 8,
      level: "specialist",
      color: "#7c3aed",
      avatar: "GEO",
    });

    // ---- Platform-Specific Agents ----

    this.register({
      id: "x-twitter-agent",
      name: "X/Twitter 创作专家",
      nameEn: "X-Twitter",
      description: "生成高互动率的推文和 Thread，支持英文和中文",
      skillFile: "x-twitter.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob"],
      maxTurns: 5,
      level: "specialist",
      color: "#1da1f2",
      avatar: "X",
    });

    this.register({
      id: "visual-gen-agent",
      name: "视觉内容生成专家",
      nameEn: "Visual",
      description: "AI 图片生成 + 营销视觉创作。支持 OpenAI/Google/DashScope/Replicate 生图，封面/海报/配图/短视频脚本。",
      skillFile: "visual-gen.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob"],
      mcpServers: {
        "image-gen": {
          command: "npx",
          args: ["tsx", join(MCPS_DIR, "image-gen", "index.ts")],
        },
      },
      maxTurns: 10,
      level: "specialist",
      color: "#fd79a8",
      avatar: "VIS",
    });

    this.register({
      id: "strategist-agent",
      name: "营销策略师",
      nameEn: "Strategist",
      description: "制定营销策略、内容战略、渠道规划、增长目标拆解",
      skillFile: "strategist.SKILL.md",
      model: "claude-sonnet-4-20250514",
      tools: ["Read", "Write", "Glob", "Grep"],
      maxTurns: 8,
      level: "specialist",
      color: "#6c5ce7",
      avatar: "STR",
    });
  }

  // ============================================================
  // 注册 / 查询
  // ============================================================

  register(def: AgentDefinition): void {
    this.agents.set(def.id, def);
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  getByLevel(level: AgentDefinition["level"]): AgentDefinition[] {
    return this.getAll().filter((a) => a.level === level);
  }

  /** 获取除 CEO 外所有可作为子 Agent 的定义 */
  getSubAgentDefs(): AgentDefinition[] {
    return this.getAll().filter((a) => a.id !== "ceo");
  }

  // ============================================================
  // 构建 SDK query() 配置
  // ============================================================

  /**
   * 为单个 Agent 构建独立运行的 SDK query 配置
   */
  async buildDirectConfig(
    agentId: string,
    userMessage: string,
    context?: Record<string, unknown>,
  ): Promise<{ prompt: string; options: Record<string, unknown> }> {
    const agent = this.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const skill = agent.skillFile ? await loadFile(join(SKILLS_DIR, agent.skillFile)) : "";
    const brandVoice = await loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
    const audience = await loadFile(join(MEMORY_DIR, "context", "target-audience.md"));

    const systemParts = [
      `你是${agent.name}。${agent.description}`,
      skill && `## SOP\n${skill}`,
      brandVoice && `## 品牌调性\n${brandVoice}`,
      audience && `## 目标受众\n${audience}`,
      context && Object.keys(context).length > 0 && `## 上下文\n${JSON.stringify(context, null, 2)}`,
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    return {
      prompt: `${systemParts}\n\n---\n\nUser: ${userMessage}`,
      options: {
        model: agent.model,
        permissionMode: "acceptEdits",
        cwd: ENGINE_DIR,
        allowedTools: agent.tools,
        mcpServers: agent.mcpServers ?? {},
        maxTurns: agent.maxTurns,
      },
    };
  }

  /**
   * 为 CEO 构建 Supervisor 模式配置（带所有子 Agent 定义）
   */
  async buildSupervisorConfig(
    userMessage: string,
    context?: Record<string, unknown>,
  ): Promise<{ prompt: string; options: Record<string, unknown> }> {
    const ceo = this.get("ceo");
    if (!ceo) throw new Error("CEO agent not found");

    const subAgentDefs = this.getSubAgentDefs();
    const agents: Record<string, SubAgentDef> = {};

    for (const agent of subAgentDefs) {
      const skill = agent.skillFile ? await loadFile(join(SKILLS_DIR, agent.skillFile)) : "";
      const brandVoice = await loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
      const audience = await loadFile(join(MEMORY_DIR, "context", "target-audience.md"));

      agents[agent.id] = {
        description: agent.description,
        prompt: [
          `你是${agent.name}。${agent.description}`,
          skill && `## SOP\n${skill}`,
          brandVoice && `## 品牌调性\n${brandVoice}`,
          audience && `## 目标受众\n${audience}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        tools: agent.tools,
      };
    }

    const brandVoice = await loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
    const audience = await loadFile(join(MEMORY_DIR, "context", "target-audience.md"));
    const calendar = await loadFile(join(MEMORY_DIR, "content-calendar.json"));

    const agentList = subAgentDefs.map((a) => `- ${a.id}: ${a.description}`).join("\n");

    const ceoPrompt = `你是 CEO 营销总监，营销团队的编排者和决策者。

## 核心原则 — 必须委派，禁止自己创作
你是管理者，不是创作者。你的工作是：
1. 分析用户需求
2. 拆解为子任务
3. 用 Agent 工具调度对应的子 Agent 执行
4. 评审子 Agent 的产出质量
5. 汇总结果交付用户

**严禁**：你绝不能自己撰写小红书笔记、推文、播客脚本、视觉内容或任何营销文案。
所有内容创作任务必须通过调用 Agent 工具委派给对应的子 Agent。

## 可用团队成员
${agentList}

## 任务路由表
| 需求类型 | 目标 Agent |
|---------|-----------|
| 英文多平台内容（X/LinkedIn/Meta/Email/Blog） | global-content-agent |
| 推文/Twitter/Thread（英文） | x-twitter-agent |
| Meta/Facebook/Instagram 广告 | meta-ads-agent |
| Email 营销/序列 | email-agent |
| SEO 优化/关键词/内容策略 | seo-agent |
| GEO 优化/AI 搜索引擎优化 | geo-agent |
| 小红书笔记/种草内容 | xhs-agent |
| 播客/音频内容 | podcast-agent |
| 视觉内容/封面/海报 | visual-gen-agent |
| 营销策略/内容规划 | strategist-agent |
| 选题研究/热点分析/竞品 | growth-agent |
| 数据分析/内容复盘 | analyst-agent |
| 内容审查/品牌风控 | brand-reviewer |

## 标准工作流（必须严格执行）
1. 分析用户需求 → 确定使用哪个子 Agent
2. **立即调用 Agent 工具委派**，不要先自己写一遍再委派
3. 收到子 Agent 结果后 → 调度 brand-reviewer 审查
4. 审查通过 → 汇总结果交付用户
5. 审查不通过 → 要求子 Agent 修改（最多 2 轮）

## 绝对禁止
- ❌ 绝不自己写任何内容（推文、文章、邮件、广告文案等）
- ❌ 不要先写一个草稿再"让子 Agent 优化"
- ❌ 不要在汇报中问用户"需要我继续调度吗？"— 直接做完全部
- ❌ 不要只调度一个 Agent，如果任务涉及多个平台就调度多个

## 调度子 Agent 的方法
使用 Agent 工具调度子 Agent，调用格式：
- agent_name: 子 Agent 的 id（如 "xhs-agent"）
- prompt: 给子 Agent 的具体任务指令

## 任务分配规则
- 每个任务必须明确：目标、输入上下文、期望产出格式
- 传递品牌信息和受众画像给创作型 Agent
- 如果用户需求涉及多个内容类型，分别调度不同 Agent 并行执行
- 收到子 Agent 结果后评估质量，不达标则要求修改

## 品牌信息
${brandVoice}

## 目标受众
${audience}

## 内容日历
${calendar}

${context && Object.keys(context).length > 0 ? `## 上下文\n${JSON.stringify(context, null, 2)}\n\n` : ""}User: ${userMessage}`;

    // 聚合 CEO 自身 + 所有子 Agent 的 MCP Servers
    const allMcpServers: Record<string, MCPServerConfig> = {
      ...(ceo.mcpServers ?? {}),
    };
    for (const agent of subAgentDefs) {
      if (agent.mcpServers) {
        for (const [key, config] of Object.entries(agent.mcpServers)) {
          if (!allMcpServers[key]) {
            allMcpServers[key] = config;
          }
        }
      }
    }

    return {
      prompt: ceoPrompt,
      options: {
        model: ceo.model,
        permissionMode: "acceptEdits",
        cwd: ENGINE_DIR,
        allowedTools: ceo.tools,
        agents,
        mcpServers: allMcpServers,
        maxTurns: ceo.maxTurns,
      },
    };
  }
}
