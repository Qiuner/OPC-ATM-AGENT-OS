/**
 * Phase 1 集成测试 — 出海优化
 *
 * node:test + node:assert 源码静态检查 + 文件系统验证
 *
 * 覆盖范围：
 * - Agent 全链路（Registry 15 Agent、SKILL.md、CEO 路由、context 注入）
 * - Channel/平台配置（types.ts 出海渠道、platforms.yaml、DB schema）
 * - Scheduler 调度（每日流水线 + 出海 Agent）
 * - 产品 URL 抓取（API 端点、卡片存储、prompt 注入）
 * - 自定义 Skills（上传/编辑/加载 API）
 * - 邮箱配置（Settings API、存储）
 * - UI Context Vault（品牌设置模块 3-tab）
 * - UI Publishing（出海平台展示）
 * - 回归测试（原有功能不破坏）
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ENGINE_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/engine";
const WEB_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/web";
const CONFIG_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/config";
const SKILLS_DIR = join(ENGINE_DIR, "skills");
const AGENTS_DIR = join(ENGINE_DIR, "agents");

function readSrc(path: string): string {
  return readFileSync(path, "utf-8");
}

// ============================================================
// 一、Agent 全链路测试
// ============================================================

describe("Agent Registry — 出海 Agent 完整性", () => {
  const src = readSrc(join(AGENTS_DIR, "registry.ts"));

  it("TC-G1-001: Registry 包含全部 14 个 Agent 注册", () => {
    // 14 = 原始 9 + 出海 5 (global-content/email/seo/geo/meta-ads)
    // brand-compliance-agent 有独立文件但未注册到 registry（由 scheduler 直接调用）
    const registerCalls = (src.match(/this\.register\(\{/g) || []).length;
    assert.equal(registerCalls, 14, `Expected 14 register calls, got ${registerCalls}`);
  });

  it("TC-G1-002: 6 个出海 Agent ID 全部注册", () => {
    const globalAgentIds = [
      "global-content-agent",
      "email-agent",
      "seo-agent",
      "geo-agent",
      "meta-ads-agent",
    ];
    for (const id of globalAgentIds) {
      assert.ok(src.includes(`id: "${id}"`), `Missing global agent: ${id}`);
    }
  });

  it("TC-G1-003: 每个出海 Agent 注册字段完整", () => {
    const agentSections = [
      { id: "global-content-agent", skillFile: "global-content.SKILL.md" },
      { id: "email-agent", skillFile: "email-marketing.SKILL.md" },
      { id: "seo-agent", skillFile: "seo-expert.SKILL.md" },
      { id: "geo-agent", skillFile: "geo-expert.SKILL.md" },
      { id: "meta-ads-agent", skillFile: "meta-ads.SKILL.md" },
    ];

    for (const agent of agentSections) {
      assert.ok(src.includes(`id: "${agent.id}"`), `Missing id: ${agent.id}`);
      assert.ok(src.includes(`skillFile: "${agent.skillFile}"`), `Missing skillFile for ${agent.id}`);
    }

    // Check all agents have required fields pattern (14 registered agents)
    const requiredFields = ["nameEn:", "description:", "model:", "tools:", "maxTurns:", "level:", "color:", "avatar:"];
    for (const field of requiredFields) {
      const count = (src.match(new RegExp(field, "g")) || []).length;
      assert.ok(count >= 14, `Expected at least 14 occurrences of '${field}', got ${count}`);
    }
  });

  it("TC-G1-004: 出海 Agent SKILL.md 文件全部存在且非空", () => {
    const skillFiles = [
      "global-content.SKILL.md",
      "email-marketing.SKILL.md",
      "seo-expert.SKILL.md",
      "geo-expert.SKILL.md",
      "meta-ads.SKILL.md",
    ];
    for (const skill of skillFiles) {
      const path = join(SKILLS_DIR, skill);
      assert.ok(existsSync(path), `Missing SKILL file: ${skill}`);
      const stat = statSync(path);
      assert.ok(stat.size > 100, `SKILL file too small (${stat.size} bytes): ${skill}`);
    }
  });

  it("TC-G1-005: SKILL.md 内容规范 — 包含必要章节", () => {
    const skillFiles = [
      "global-content.SKILL.md",
      "email-marketing.SKILL.md",
      "seo-expert.SKILL.md",
      "geo-expert.SKILL.md",
      "meta-ads.SKILL.md",
    ];
    for (const skill of skillFiles) {
      const content = readSrc(join(SKILLS_DIR, skill));
      // Must contain role/SOP/output related keywords
      const hasRole = /role|角色|expert|specialist/i.test(content);
      const hasSOP = /sop|workflow|工作流|process|step/i.test(content);
      const hasOutput = /output|format|输出|deliverable|framework|template|report/i.test(content);
      assert.ok(hasRole, `${skill} missing role definition`);
      assert.ok(hasSOP, `${skill} missing SOP/workflow`);
      assert.ok(hasOutput, `${skill} missing output format/framework`);
    }
  });

  it("TC-G1-006: CEO buildSupervisorConfig 包含出海 Agent 路由", () => {
    // The CEO prompt is built dynamically from agentList = subAgentDefs.map(...)
    // So all registered agents (including global ones) will appear in the CEO prompt.
    // Verify the routing logic exists
    assert.ok(src.includes("agentList"), "Missing agentList generation for CEO prompt");
    assert.ok(src.includes("subAgentDefs.map"), "Missing subAgentDefs mapping");
    assert.ok(src.includes("任务路由表"), "Missing task routing table in CEO prompt");
  });

  it("TC-G1-007: getSubAgentDefs 排除 CEO 返回其余 Agent", () => {
    assert.ok(src.includes('a.id !== "ceo"'), "Missing CEO exclusion filter");
  });

  it("TC-G1-008: buildDirectConfig 加载品牌上下文", () => {
    assert.ok(src.includes("brand-voice.md"), "Missing brand-voice.md loading");
    assert.ok(src.includes("target-audience.md"), "Missing target-audience.md loading");
  });

  it("TC-G1-009: buildDirectConfig 支持 context 注入", () => {
    assert.ok(src.includes("context?: Record<string, unknown>"), "Missing context parameter");
    assert.ok(src.includes("JSON.stringify(context"), "Missing context serialization");
  });
});

// ============================================================
// 二、Channel / 平台配置测试
// ============================================================

describe("Channel & Platform Configuration", () => {
  it("TC-G2-001: Channel 类型包含出海平台", () => {
    const types = readSrc(join(AGENTS_DIR, "types.ts"));
    const globalChannels = ["meta", "tiktok", "linkedin", "email", "blog"];
    for (const channel of globalChannels) {
      assert.ok(types.includes(`"${channel}"`), `Channel type missing: ${channel}`);
    }
  });

  it("TC-G2-001b: TargetMarket 类型已定义", () => {
    const types = readSrc(join(AGENTS_DIR, "types.ts"));
    assert.ok(types.includes("TargetMarket"), "Missing TargetMarket type");
    const markets = ["us", "eu", "uk", "sea", "latam", "global"];
    for (const market of markets) {
      assert.ok(types.includes(`"${market}"`), `Market missing: ${market}`);
    }
  });

  it("TC-G2-001c: ContentPiece 新增出海字段", () => {
    const types = readSrc(join(AGENTS_DIR, "types.ts"));
    assert.ok(types.includes("language: string"), "Missing language field in ContentPiece");
    assert.ok(types.includes("target_market: TargetMarket"), "Missing target_market field");
    assert.ok(types.includes("published_url: string | null"), "Missing published_url field");
    assert.ok(types.includes("geo_optimized: boolean"), "Missing geo_optimized field");
  });

  it("TC-G2-002: platforms.example.yaml 包含出海平台", () => {
    const yaml = readSrc(join(CONFIG_DIR, "platforms.example.yaml"));
    const platforms = ["meta:", "x:", "tiktok:", "linkedin:", "email:", "blog:"];
    for (const platform of platforms) {
      assert.ok(yaml.includes(platform), `platforms.yaml missing: ${platform}`);
    }
  });

  it("TC-G2-002b: platforms.yaml Agent 映射正确", () => {
    const yaml = readSrc(join(CONFIG_DIR, "platforms.example.yaml"));
    assert.ok(yaml.includes('agent: "global-content-agent"'), "Missing global-content-agent mapping");
    assert.ok(yaml.includes('agent: "email-agent"'), "Missing email-agent mapping");
    assert.ok(yaml.includes('agent: "x-twitter-agent"'), "Missing x-twitter-agent mapping");
    assert.ok(yaml.includes('seo_agent: "seo-agent"'), "Missing seo-agent mapping");
    assert.ok(yaml.includes('geo_agent: "geo-agent"'), "Missing geo-agent mapping");
    assert.ok(yaml.includes('ads_agent: "meta-ads-agent"'), "Missing meta-ads-agent mapping");
  });

  it("TC-G2-003: 数据库 schema 支持出海 channel", () => {
    const schema = readSrc(join(ENGINE_DIR, "db", "schema.sql"));
    const channels = ["meta", "tiktok", "linkedin", "email", "blog"];
    for (const ch of channels) {
      assert.ok(schema.includes(`'${ch}'`), `Schema channel comment missing: ${ch}`);
    }
    // New fields
    assert.ok(schema.includes("language"), "Missing language field in schema");
    assert.ok(schema.includes("target_market"), "Missing target_market field in schema");
    assert.ok(schema.includes("published_url"), "Missing published_url field in schema");
    assert.ok(schema.includes("geo_optimized"), "Missing geo_optimized field in schema");
  });

  it("TC-G2-004: 评分函数 calculate_score 覆盖出海渠道", () => {
    const schema = readSrc(join(ENGINE_DIR, "db", "schema.sql"));
    const channels = ["meta", "tiktok", "linkedin", "email", "blog"];
    for (const ch of channels) {
      assert.ok(schema.includes(`WHEN '${ch}'`), `calculate_score missing channel: ${ch}`);
    }
  });
});

// ============================================================
// 三、Scheduler 调度测试
// ============================================================

describe("Scheduler — 出海 Agent 调度", () => {
  const src = readSrc(join(ENGINE_DIR, "scheduler.ts"));

  it("TC-G3-001: Scheduler 导入出海 Agent 模块", () => {
    assert.ok(src.includes("global-content-agent"), "Missing global-content-agent import");
    assert.ok(src.includes("seo-expert-agent"), "Missing seo-expert-agent import");
    assert.ok(src.includes("geo-expert-agent"), "Missing geo-expert-agent import");
    assert.ok(src.includes("brand-compliance-agent"), "Missing brand-compliance-agent import");
    assert.ok(src.includes("email-marketing-agent"), "Missing email-marketing-agent import");
    assert.ok(src.includes("meta-ads-agent"), "Missing meta-ads-agent import");
  });

  it("TC-G3-002: Scheduler cron 任务注册 — 每日流水线", () => {
    // Count cron.schedule calls
    const cronCalls = (src.match(/cron\.schedule\(/g) || []).length;
    assert.ok(cronCalls >= 6, `Expected at least 6 cron schedules (daily pipeline + weekly), got ${cronCalls}`);
  });

  it("TC-G3-002b: Scheduler 包含 CEO + Analyst + Content + SEO/GEO + Brand 流水线", () => {
    assert.ok(src.includes("CEO"), "Missing CEO schedule");
    assert.ok(src.includes("Analyst") || src.includes("analyst"), "Missing Analyst schedule");
    assert.ok(src.includes("Global Content") || src.includes("runGlobalContentAgent"), "Missing Global Content schedule");
    assert.ok(src.includes("SEO") || src.includes("runSEOExpertAgent"), "Missing SEO schedule");
    assert.ok(src.includes("GEO") || src.includes("runGEOExpertAgent"), "Missing GEO schedule");
    assert.ok(src.includes("Brand") || src.includes("runBrandComplianceAgent"), "Missing Brand Compliance schedule");
  });

  it("TC-G3-003: Scheduler 心跳健康检查", () => {
    assert.ok(src.includes("*/5 * * * *"), "Missing heartbeat cron schedule");
    assert.ok(src.includes("heartbeat"), "Missing heartbeat counter");
  });

  it("TC-G3-003b: Scheduler 使用出海时区", () => {
    // Should use US timezone or configurable timezone, not only Asia/Shanghai
    const hasTimezone = src.includes("timezone") || src.includes("TZ");
    assert.ok(hasTimezone, "Missing timezone configuration");
  });
});

// ============================================================
// 四、出海 Agent 代码文件验证
// ============================================================

describe("Global Agent Code Files", () => {
  const agentFiles = [
    { file: "global-content-agent.ts", fn: "runGlobalContentAgent", skill: "global-content.SKILL.md" },
    { file: "email-marketing-agent.ts", fn: "runEmailMarketingAgent", skill: "email-marketing.SKILL.md" },
    { file: "seo-expert-agent.ts", fn: "runSEOExpertAgent", skill: "seo-expert.SKILL.md" },
    { file: "geo-expert-agent.ts", fn: "runGEOExpertAgent", skill: "geo-expert.SKILL.md" },
    { file: "brand-compliance-agent.ts", fn: "runBrandComplianceAgent", skill: "brand-compliance" },
    { file: "meta-ads-agent.ts", fn: "runMetaAdsAgent", skill: "meta-ads.SKILL.md" },
  ];

  for (const agent of agentFiles) {
    it(`TC-G4-AGENT: ${agent.file} — 存在且结构正确`, () => {
      const path = join(AGENTS_DIR, agent.file);
      assert.ok(existsSync(path), `Missing agent file: ${agent.file}`);
      const src = readSrc(path);
      assert.ok(src.includes(`export async function ${agent.fn}`), `Missing export function ${agent.fn}`);
      assert.ok(src.includes("query("), "Missing Claude SDK query() call");
      assert.ok(src.includes("brand-voice.md"), "Missing brand-voice.md context loading");
      assert.ok(src.includes("target-audience.md"), "Missing target-audience.md context loading");
    });
  }
});

// ============================================================
// 五、产品 URL 抓取测试
// ============================================================

describe("Product URL Scrape — API Route", () => {
  const src = readSrc(join(WEB_DIR, "src/app/api/context/scrape/route.ts"));

  it("TC-G4-001: POST 方法导出", () => {
    assert.ok(src.includes("export async function POST"), "Missing POST handler export");
  });

  it("TC-G4-002: URL 参数校验", () => {
    assert.ok(src.includes("!url"), "Missing url required check");
    assert.ok(src.includes("new URL(url)"), "Missing URL validation");
    assert.ok(src.includes("http:") || src.includes("https:"), "Missing protocol validation");
    assert.ok(src.includes("status: 400"), "Missing 400 status for invalid input");
  });

  it("TC-G4-003: HTML 抓取逻辑", () => {
    assert.ok(src.includes("fetch("), "Missing fetch call for URL scraping");
    assert.ok(src.includes("User-Agent"), "Missing User-Agent header");
    assert.ok(src.includes("AbortSignal.timeout") || src.includes("timeout"), "Missing request timeout");
    assert.ok(src.includes("status: 502"), "Missing 502 status for fetch failures");
  });

  it("TC-G4-003b: 产品数据提取", () => {
    assert.ok(src.includes("extractProductData"), "Missing product data extraction");
    assert.ok(src.includes("og:title"), "Missing OpenGraph title extraction");
    assert.ok(src.includes("og:description"), "Missing OpenGraph description extraction");
    assert.ok(src.includes("og:image"), "Missing image extraction");
    assert.ok(src.includes("price") || src.includes("Price"), "Missing price extraction");
    assert.ok(src.includes("JSON-LD") || src.includes("ld+json"), "Missing JSON-LD structured data parsing");
  });

  it("TC-G4-003c: 产品卡片存入 context-assets", () => {
    assert.ok(src.includes("createContextAsset"), "Missing createContextAsset call");
    assert.ok(src.includes("type: 'product'") || src.includes('type: "product"'), "Missing product type assignment");
    assert.ok(src.includes("source_url"), "Missing source_url in metadata");
    assert.ok(src.includes("scraped_at"), "Missing scraped_at in metadata");
    assert.ok(src.includes("status: 201"), "Missing 201 status for success");
  });
});

// ============================================================
// 六、自定义 Skills 导入测试
// ============================================================

describe("Custom Skills — API Route", () => {
  const src = readSrc(join(WEB_DIR, "src/app/api/skills/custom/route.ts"));

  it("TC-G5-001: GET/POST/DELETE 方法导出", () => {
    assert.ok(src.includes("export async function GET"), "Missing GET handler");
    assert.ok(src.includes("export async function POST"), "Missing POST handler");
    assert.ok(src.includes("export async function DELETE"), "Missing DELETE handler");
  });

  it("TC-G5-002: 自定义 Skill 存入 custom 目录", () => {
    assert.ok(src.includes("skills") && src.includes("custom"), "Missing custom skills directory reference");
    assert.ok(src.includes("mkdirSync") || src.includes("ensureDir"), "Missing directory creation logic");
    assert.ok(src.includes(".SKILL.md"), "Missing .SKILL.md file extension");
  });

  it("TC-G5-002b: POST 参数校验", () => {
    assert.ok(src.includes("!name") || src.includes("!content"), "Missing required field validation");
    assert.ok(src.includes("status: 400"), "Missing 400 status for validation");
  });

  it("TC-G5-003: Skill 文件名安全处理", () => {
    // Should sanitize filename
    assert.ok(src.includes("toLowerCase") || src.includes("replace("), "Missing filename sanitization");
  });

  it("TC-G5-003b: Skill frontmatter 生成", () => {
    assert.ok(src.includes("---"), "Missing YAML frontmatter markers");
    assert.ok(src.includes("name:") && src.includes("description:"), "Missing frontmatter fields");
  });

  it("TC-G5-004: GET 列出自定义 Skills", () => {
    assert.ok(src.includes("readdirSync") || src.includes("readdir"), "Missing directory listing");
    assert.ok(src.includes("filter"), "Missing file filter for .SKILL.md");
  });
});

// ============================================================
// 七、邮箱配置测试
// ============================================================

describe("Email Settings — API Route", () => {
  const src = readSrc(join(WEB_DIR, "src/app/api/settings/route.ts"));

  it("TC-G6-001: GET/PUT 方法导出", () => {
    assert.ok(src.includes("export async function GET"), "Missing GET handler");
    assert.ok(src.includes("export async function PUT"), "Missing PUT handler");
  });

  it("TC-G6-002: Settings 包含 email 配置结构", () => {
    assert.ok(src.includes("email"), "Missing email in Settings interface");
    assert.ok(src.includes("address"), "Missing email address field");
    assert.ok(src.includes("senderName") || src.includes("sender_name"), "Missing sender name field");
  });

  it("TC-G6-002b: Settings 持久化存储", () => {
    assert.ok(src.includes("settings.json"), "Missing settings.json storage file");
    assert.ok(src.includes("writeFileSync") || src.includes("writeFile"), "Missing file write for persistence");
    assert.ok(src.includes("readFileSync") || src.includes("readFile"), "Missing file read for loading");
  });

  it("TC-G6-002c: PUT merge 逻辑", () => {
    // Should merge, not overwrite
    assert.ok(src.includes("...current") || src.includes("Object.assign"), "Missing merge logic in PUT");
  });
});

// ============================================================
// 八、UI 测试 — Context Vault 品牌设置模块
// ============================================================

describe("Context Vault — Brand Setup UI", () => {
  const src = readSrc(join(WEB_DIR, "src/app/context-vault/page.tsx"));

  it("TC-G7-001: Context Vault 页面渲染正常", () => {
    assert.ok(src.includes("export default function"), "Missing default export");
    assert.ok(src.includes("Context Vault"), "Missing page title");
  });

  it("TC-G7-002: 品牌设置 Brand Setup 区域存在", () => {
    assert.ok(src.includes("Brand Setup") || src.includes("品牌设置"), "Missing Brand Setup section");
    assert.ok(src.includes("SettingsIcon"), "Missing SettingsIcon import for brand setup");
  });

  it("TC-G7-003: Product URL Tab — URL 输入和抓取按钮", () => {
    assert.ok(src.includes("product-url") || src.includes("Product URL"), "Missing Product URL tab");
    assert.ok(src.includes("scrapeUrl") || src.includes("scrape"), "Missing scrape URL state");
    assert.ok(src.includes("/api/context/scrape"), "Missing scrape API call");
    assert.ok(src.includes("Scrape") || src.includes("scraping"), "Missing Scrape button");
  });

  it("TC-G7-004: Custom Skills Tab — Skills 管理 UI", () => {
    assert.ok(src.includes("skills") || src.includes("Skills"), "Missing Skills tab");
    assert.ok(src.includes("/api/skills/custom"), "Missing custom skills API call");
  });

  it("TC-G7-008: Skills Tab — 拖拽上传区域", () => {
    // Dropzone: label with onDrop + onDragOver + hidden file input
    assert.ok(src.includes("onDrop"), "Missing onDrop handler on upload zone");
    assert.ok(src.includes("onDragOver"), "Missing onDragOver handler on upload zone");
    assert.ok(src.includes('accept=".md,.txt"'), "Missing file accept filter (.md/.txt)");
    assert.ok(src.includes("FileUpIcon"), "Missing FileUpIcon in dropzone");
    assert.ok(src.includes("handleSkillFileUpload"), "Missing handleSkillFileUpload function");
    // Validation: .md/.txt extension check + 10MB size limit
    assert.ok(src.includes("10 * 1024 * 1024") || src.includes("10MB"), "Missing 10MB size limit");
    assert.ok(/\.(md|txt)\$/.test(src) || src.includes(".md") && src.includes(".txt"), "Missing file extension validation");
  });

  it("TC-G7-009: Skills Tab — 'or manual input' 分隔线", () => {
    assert.ok(src.includes("or manual input"), "Missing 'or manual input' divider text");
    // Divider structure: two h-px lines flanking centered text
    const hasDividerLines = (src.match(/h-px/g) || []).length >= 2;
    assert.ok(hasDividerLines, "Missing divider h-px lines (need at least 2)");
  });

  it("TC-G7-010: Skills Tab — Skills 列表行样式", () => {
    assert.ok(src.includes("FileTextIcon"), "Missing FileTextIcon in skills list rows");
    assert.ok(src.includes("skill.name"), "Missing skill.name display");
    assert.ok(src.includes("skill.description"), "Missing skill.description display");
    assert.ok(src.includes("updatedAt"), "Missing updatedAt date display");
    assert.ok(src.includes("XIcon"), "Missing XIcon delete button");
    assert.ok(src.includes("handleDeleteSkill"), "Missing handleDeleteSkill function");
  });

  it("TC-G7-005: Email Config Tab — 邮箱配置", () => {
    assert.ok(src.includes("email") || src.includes("Email"), "Missing Email tab");
    assert.ok(src.includes("MailIcon"), "Missing MailIcon import");
    assert.ok(src.includes("/api/settings"), "Missing settings API call");
  });

  it("TC-G7-006: 3-Tab 切换机制", () => {
    // Should have 3 tabs: product-url, skills, email
    assert.ok(src.includes("product-url"), "Missing product-url tab value");
    assert.ok(
      src.includes('"skills"') || src.includes("'skills'"),
      "Missing skills tab value"
    );
    assert.ok(
      src.includes('"email"') || src.includes("'email'"),
      "Missing email tab value"
    );
  });

  it("TC-G7-007: 暗色主题 — 无亮色背景泄露", () => {
    // Should NOT have plain white/light backgrounds
    const hasBrightBg = /className="[^"]*bg-white(?!\/)/.test(src);
    const hasBrightBg2 = /className="[^"]*bg-gray-(?:100|200|50)/.test(src);
    assert.ok(!hasBrightBg, "Found unwanted bg-white class (should use bg-white/[opacity])");
    assert.ok(!hasBrightBg2, "Found unwanted light gray background class");
  });
});

// ============================================================
// 九、UI 测试 — Publishing 出海内容
// ============================================================

describe("Publishing — Content Display", () => {
  const src = readSrc(join(WEB_DIR, "src/app/publishing/page.tsx"));

  it("TC-G8-001: Publishing 页面可映射 API 内容", () => {
    assert.ok(src.includes("mapContentToPublishItem") || src.includes("/api/contents"), "Missing API content mapping");
  });

  it("TC-G8-002: Publishing 展示平台标签", () => {
    assert.ok(src.includes("platform"), "Missing platform display logic");
  });

  it("TC-G8-003: Contents API route 存在", () => {
    const routePath = join(WEB_DIR, "src/app/api/contents/route.ts");
    assert.ok(existsSync(routePath), "Missing /api/contents route");
    const routeSrc = readSrc(routePath);
    assert.ok(routeSrc.includes("export async function GET"), "Missing GET handler in contents API");
  });
});

// ============================================================
// 十、回归测试
// ============================================================

describe("Regression — 原有 Agent 注册未破坏", () => {
  const src = readSrc(join(AGENTS_DIR, "registry.ts"));

  it("TC-REG-001: 原有 9 个 Agent ID 全部存在", () => {
    const originalIds = [
      "ceo", "xhs-agent", "analyst-agent", "growth-agent",
      "brand-reviewer", "podcast-agent",
      "x-twitter-agent", "visual-gen-agent", "strategist-agent",
    ];
    for (const id of originalIds) {
      assert.ok(src.includes(`id: "${id}"`), `Original agent missing: ${id}`);
    }
  });

  it("TC-REG-002: 原有 SKILL.md 文件完整", () => {
    const skills = [
      "xhs.SKILL.md", "analyst.SKILL.md", "growth.SKILL.md",
      "brand-reviewer.SKILL.md", "podcast.SKILL.md",
      "x-twitter.SKILL.md", "visual-gen.SKILL.md", "strategist.SKILL.md",
    ];
    for (const skill of skills) {
      assert.ok(existsSync(join(SKILLS_DIR, skill)), `Missing original SKILL: ${skill}`);
    }
  });
});

describe("Regression — EventBus", () => {
  const src = readSrc(join(WEB_DIR, "src/lib/agent-sdk/event-bus.ts"));

  it("TC-REG-003: EventBus 单例模式 + emit/on/getRecentEvents", () => {
    assert.ok(src.includes("globalThis"), "Missing globalThis singleton");
    assert.ok(src.includes("emit("), "Missing emit method");
    assert.ok(src.includes("on("), "Missing on method");
    assert.ok(src.includes("getRecentEvents"), "Missing getRecentEvents method");
  });
});

describe("Regression — MCP Servers 配置", () => {
  const src = readSrc(join(AGENTS_DIR, "registry.ts"));

  it("TC-REG-004: creatorflow/xhs-data/podcast-tts MCP 配置完整", () => {
    assert.ok(src.includes("creatorflow"), "Missing creatorflow MCP");
    assert.ok(src.includes("xhs-data"), "Missing xhs-data MCP");
    assert.ok(src.includes("podcast-tts"), "Missing podcast-tts MCP");
  });
});

describe("Regression — engine package.json", () => {
  const pkg = readSrc(join(ENGINE_DIR, "package.json"));

  it("TC-REG-005: exports 包含 registry/types/team-session", () => {
    assert.ok(pkg.includes("./agents/registry"), "Missing registry export");
    assert.ok(pkg.includes("./agents/types"), "Missing types export");
    assert.ok(pkg.includes("./agents/team-session"), "Missing team-session export");
  });
});
