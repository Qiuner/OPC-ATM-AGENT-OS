import {
  useState,
  useRef,
  useEffect,
  useCallback,
  lazy,
  Suspense,
  type KeyboardEvent,
} from "react";
import {
  Send,
  Trash2,
  Users,
  MessageSquare,
  Monitor,
  Power,
  PowerOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Terminal,
  Square,
  RotateCcw,
  Settings,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getApi } from "@/lib/ipc";
import { PixelAgentSVG, type MarketingAgentId, type PixelAgentStatus } from "@/components/features/agent-monitor/pixel-agents";

// Lazy-load Monitor view
const TeamModeView = lazy(() => import("./team-studio-monitor"));

// ==========================================
// Constants
// ==========================================

const AGENT_CHAT_BASE = "http://localhost:3001";

const SDK_AGENT_IDS = ["ceo", "xhs-agent", "growth-agent", "brand-reviewer"];

interface AgentDef {
  id: string;
  label: string;
  labelCn: string;
  color: string;
  initial: string;
  bio: string;
  capabilities: string[];
  level: string;
  systemPrompt: string;
}

const AGENTS: AgentDef[] = [
  {
    id: "ceo",
    label: "CEO",
    labelCn: "CEO 营销总监",
    color: "#e74c3c",
    initial: "CEO",
    bio: "营销团队总指挥，负责需求拆解、子 Agent 调度与质量终审",
    capabilities: ["任务拆解", "多 Agent 编排", "质量把控", "流程调度"],
    level: "Orchestrator",
    systemPrompt: `你是 Marketing Agent OS 的 CEO Agent，营销团队负责人。
你管理 3 个子 Agent：xhs-agent（小红书创作）、growth-agent（增长策略）、brand-reviewer（品牌审查）。
标准工作流：分析需求 → Growth 选题 → XHS 创作 → Brand Reviewer 审查 → 你终审交付。
你不直接创作内容，而是拆解任务、调度子 Agent、把控质量。用中文回复。`,
  },
  {
    id: "xhs-agent",
    label: "XHS",
    labelCn: "小红书创作专家",
    color: "#ff2442",
    initial: "XHS",
    bio: "顶级小红书内容创作者，按 SOP 产出高质量种草笔记",
    capabilities: [
      "爆款标题",
      "种草文案",
      "CTA 设计",
      "标签策略",
      "配图建议",
    ],
    level: "Specialist",
    systemPrompt: `你是一位顶级小红书营销内容创作专家。
按 SOP 撰写内容（标题→正文→CTA→标签→配图建议），直接输出笔记内容。用中文创作。`,
  },
  {
    id: "growth-agent",
    label: "Growth",
    labelCn: "增长营销专家",
    color: "#00cec9",
    initial: "G",
    bio: "增长黑客，精通选题研究、热点捕捉与数据驱动的发布策略",
    capabilities: [
      "选题研究",
      "热点捕捉",
      "竞品分析",
      "发布策略",
      "数据复盘",
    ],
    level: "Specialist",
    systemPrompt: `你是一位增长营销专家，精通小红书平台运营。
负责选题研究、热点捕捉、竞品爆款分析、发布时间策略、数据复盘。
接地气，用真实案例和数据说话。给出可立即执行的选题方案。中文沟通。`,
  },
  {
    id: "brand-reviewer",
    label: "Reviewer",
    labelCn: "品牌风控审查",
    color: "#a855f7",
    initial: "BR",
    bio: "品牌守护者，逐项审查内容合规性与品牌调性一致性",
    capabilities: [
      "文案审查",
      "调性检测",
      "敏感词过滤",
      "合规校验",
      "风险评估",
    ],
    level: "Reviewer",
    systemPrompt: `你是品牌风控审查专家。
审查范围：文案内容、品牌调性一致性、配图建议、敏感词/风险内容、平台合规性。
对照品牌调性和受众画像逐项检查，输出审查报告（通过/需修改/拒绝 + 修改建议）。中文沟通。`,
  },
];

const AGENT_MAP = new Map(AGENTS.map((a) => [a.id, a]));

const AGENT_COLORS: Record<
  string,
  { color: string; avatar: string; name: string }
> = {
  ceo: { color: "#e74c3c", avatar: "CEO", name: "CEO" },
  "xhs-agent": { color: "#ff2442", avatar: "XHS", name: "XHS Agent" },
  "analyst-agent": { color: "#3498db", avatar: "AN", name: "Analyst" },
  "growth-agent": { color: "#00cec9", avatar: "G", name: "Growth" },
  "brand-reviewer": { color: "#a855f7", avatar: "BR", name: "Reviewer" },
  "podcast-agent": { color: "#e17055", avatar: "POD", name: "Podcast" },
  "global-content-agent": { color: "#10b981", avatar: "GC", name: "Global Content" },
  "meta-ads-agent": { color: "#1877f2", avatar: "MA", name: "Meta Ads" },
  "email-agent": { color: "#f59e0b", avatar: "EM", name: "Email" },
  "seo-agent": { color: "#059669", avatar: "SEO", name: "SEO" },
  "geo-agent": { color: "#7c3aed", avatar: "GEO", name: "GEO" },
  "x-twitter-agent": { color: "#1da1f2", avatar: "X", name: "X/Twitter" },
  "visual-gen-agent": { color: "#fd79a8", avatar: "VIS", name: "Visual" },
  "strategist-agent": { color: "#6c5ce7", avatar: "STR", name: "Strategist" },
};

const TOOL_LABELS: Record<string, string> = {
  xhs_check_login: "🔐 检查登录",
  xhs_login: "🔐 扫码登录",
  xhs_search_top_posts: "🔍 搜索竞品笔记",
  xhs_get_post_detail: "📊 分析笔记详情",
  xhs_publish_note: "📤 发布笔记",
  xhs_get_note_metrics: "📈 获取笔记数据",
  xhs_search_notes: "🔍 搜索笔记",
  Read: "📖 读取文件",
  Write: "✏️ 写入文件",
  WebSearch: "🌐 搜索网络",
  Glob: "📂 查找文件",
  generate_image: "🎨 AI 生成图片",
};

type ChannelId = "all" | string;
type TabId = "execute" | "chat" | "monitor";
type ExecMode = "single" | "orchestrator";

// ==========================================
// Execute mode types
// ==========================================

type TaskStatus = "waiting" | "running" | "done" | "error";

interface ExecTask {
  id: string;
  agentId: string;
  description: string;
  status: TaskStatus;
  progress: number;
  currentTool?: string;
  toolCallCount: number;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  content: string;
}

interface ExecLogEntry {
  id: string;
  timestamp: number;
  agentId: string;
  type: "info" | "tool" | "result" | "error" | "communication";
  message: string;
}

interface ExecState {
  isRunning: boolean;
  startedAt?: number;
  prompt: string;
  tasks: ExecTask[];
  logs: ExecLogEntry[];
  result: string;
}

const INITIAL_EXEC: ExecState = {
  isRunning: false,
  prompt: "",
  tasks: [],
  logs: [],
  result: "",
};

// ==========================================
// Orchestrator mode types
// ==========================================

interface SubAgentState {
  agentId: string;
  name: string;
  status: "idle" | "running" | "done" | "error";
  task?: string;
  output?: string;
  startTime?: number;
  endTime?: number;
}

interface OrchestratorState {
  isRunning: boolean;
  ceoStatus: "idle" | "planning" | "executing" | "reviewing" | "done" | "error";
  prompt?: string;
  plan?: string;
  subAgents: SubAgentState[];
  progress: { done: number; total: number; running: string[] };
  finalResult?: string;
  error?: string;
}

const INITIAL_ORCHESTRATOR: OrchestratorState = {
  isRunning: false,
  ceoStatus: "idle",
  subAgents: [],
  progress: { done: 0, total: 0, running: [] },
};

// ==========================================
// Chat mode types
// ==========================================

interface StudioMessage {
  id: string;
  role: "user" | "agent" | "system";
  agentId?: string;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWelcomeMessages(): StudioMessage[] {
  const now = new Date();
  return [
    {
      id: createId(),
      role: "system",
      content:
        "欢迎来到 OPC Team Studio — 使用「执行模式」下达任务，或切换到「团队对话」自由对话",
      timestamp: now,
    },
  ];
}

// ==========================================
// Stream helpers
// ==========================================

function buildConversationHistory(
  messages: StudioMessage[],
  limit = 20
): string {
  return messages
    .slice(-limit)
    .map((m) => {
      if (m.role === "system") return "";
      if (m.role === "user") return `User: ${m.content}`;
      const agent = m.agentId ? AGENT_MAP.get(m.agentId) : null;
      return `${agent?.label ?? "Agent"}: ${m.content}`;
    })
    .filter(Boolean)
    .join("\n");
}

async function streamAgentMessage(
  agentId: string,
  systemPrompt: string,
  conversationHistory: string,
  userMessage: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const isSDK = SDK_AGENT_IDS.includes(agentId);
  const endpoint = isSDK ? "/api/chat-sdk" : "/api/chat";

  try {
    const res = await fetch(`${AGENT_CHAT_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt,
        conversationHistory,
        userMessage,
        agentName: agentId,
      }),
    });

    if (!res.ok) {
      onError(`Agent 服务错误: ${res.status} ${res.statusText}`);
      onDone();
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("无法获取响应流");
      onDone();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6)) as {
            text?: string;
            error?: string;
            done?: boolean;
          };
          if (data.done) {
            onDone();
            return;
          }
          if (data.error) onError(data.error);
          if (data.text) onChunk(data.text);
        } catch {
          /* skip */
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
    onDone();
  }
}

// ==========================================
// Simple Agent Avatar (replaces PixelAgentSVG)
// ==========================================

/** Map team-studio agentIds to pixel-agents agentIds (some differ) */
const PIXEL_AGENT_ID_MAP: Record<string, MarketingAgentId> = {
  'ceo': 'ceo',
  'xhs-agent': 'xhs-agent',
  'growth-agent': 'growth-agent',
  'brand-reviewer': 'brand-reviewer',
  'analyst-agent': 'analyst-agent',
  'podcast-agent': 'podcast-agent',
  'global-content-agent': 'global-content-agent',
  'meta-ads-agent': 'meta-ads-agent',
  'email-agent': 'email-agent',
  'seo-agent': 'seo-expert-agent',
  'geo-agent': 'geo-expert-agent',
  'x-twitter-agent': 'x-twitter-agent',
  'visual-gen-agent': 'visual-agent',
  'strategist-agent': 'strategist-agent',
};

function AgentAvatar({
  agentId,
  size = "sm",
  online,
}: {
  agentId: string;
  size?: "sm" | "md";
  online?: boolean;
}) {
  const pixelId = PIXEL_AGENT_ID_MAP[agentId];
  const dim = size === "md" ? 36 : 28;
  const status: PixelAgentStatus = online === false ? 'offline' : 'online';

  if (pixelId) {
    return (
      <div className="shrink-0" style={{ width: dim, height: dim }}>
        <PixelAgentSVG
          agentId={pixelId}
          status={status}
          style={{ width: dim, height: dim }}
        />
      </div>
    );
  }

  // Fallback for unknown agents
  const colors = AGENT_COLORS[agentId] ?? { color: "#888", avatar: "?", name: "Unknown" };
  const dimClass = size === "md" ? "w-9 h-9" : "w-7 h-7";
  const textSize = size === "md" ? "text-xs" : "text-[10px]";
  return (
    <div
      className={`${dimClass} rounded-lg flex items-center justify-center shrink-0 font-bold ${textSize}`}
      style={{
        background: `${colors.color}20`,
        border: `1px solid ${colors.color}40`,
        color: colors.color,
        opacity: online === false ? 0.4 : 1,
      }}
    >
      {colors.avatar}
    </div>
  );
}

// ==========================================
// Agent Info Bar (right panel top)
// ==========================================

function AgentInfoBar({
  agent,
  settingsOpen,
  onToggleSettings,
}: {
  agent: AgentDef;
  settingsOpen: boolean;
  onToggleSettings: () => void;
}) {
  const colors = AGENT_COLORS[agent.id] ?? { color: "#888", avatar: "?", name: "Unknown" };
  return (
    <div
      className="px-4 py-3 shrink-0"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <AgentAvatar agentId={agent.id} size="md" online />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: colors.color }}>
              {agent.labelCn}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: `${colors.color}15`,
                color: colors.color,
                border: `1px solid ${colors.color}30`,
              }}
            >
              {agent.level}
            </span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
            {agent.bio}
          </p>
        </div>
        <button
          onClick={onToggleSettings}
          className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: settingsOpen ? "#a78bfa" : "var(--muted-foreground)" }}
          title="Agent 设置"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      {/* Skill Tags */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {agent.capabilities.map((cap) => (
          <span
            key={cap}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(167,139,250,0.08)",
              color: "#a78bfa",
              border: "1px solid rgba(167,139,250,0.15)",
            }}
          >
            {cap}
          </span>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Agent Settings Panel (expandable)
// ==========================================

function AgentSettingsPanel({
  agent,
  onClose,
}: {
  agent: AgentDef;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState(agent.systemPrompt);

  return (
    <div
      className="px-4 py-4 space-y-4 shrink-0 overflow-y-auto max-h-[50vh]"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--muted)",
      }}
    >
      {/* System Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            System Prompt
          </label>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
            style={{ color: "#a78bfa" }}
          >
            <ChevronUp className="h-3 w-3" />
            收起
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          className="w-full rounded-lg p-3 text-sm resize-none outline-none font-mono leading-relaxed"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>
      {/* Skills / Capabilities */}
      <div>
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Skills / 工具
        </label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{
                background: "rgba(167,139,250,0.1)",
                color: "#a78bfa",
                border: "1px solid rgba(167,139,250,0.2)",
              }}
            >
              {cap}
            </span>
          ))}
          <button
            className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-white/5"
            style={{
              border: "1px dashed var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            + 添加
          </button>
        </div>
      </div>
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          恢复默认
        </button>
        <button
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: "rgba(167,139,250,0.15)",
            color: "#a78bfa",
            border: "1px solid rgba(167,139,250,0.3)",
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Channel List Sidebar
// ==========================================

/** All available agents for single-agent mode (excluding CEO) */
const ALL_SINGLE_AGENTS: AgentDef[] = [
  ...AGENTS,
  // Additional agents not in the original 4
  {
    id: "analyst-agent", label: "Analyst", labelCn: "数据飞轮分析师", color: "#3498db", initial: "AN",
    bio: "分析内容表现数据，提炼胜出模式", capabilities: ["数据分析", "模式提炼"], level: "Specialist",
    systemPrompt: "",
  },
  {
    id: "podcast-agent", label: "Podcast", labelCn: "播客制作专家", color: "#e17055", initial: "POD",
    bio: "生成播客脚本、对话式音频内容", capabilities: ["播客脚本", "音频内容"], level: "Specialist",
    systemPrompt: "",
  },
  {
    id: "global-content-agent", label: "Content", labelCn: "全球内容创作", color: "#10b981", initial: "GC",
    bio: "英文多平台营销内容创作", capabilities: ["英文内容", "多平台"], level: "Specialist",
    systemPrompt: "",
  },
  {
    id: "x-twitter-agent", label: "X", labelCn: "X/Twitter 创作", color: "#1da1f2", initial: "X",
    bio: "生成高互动率的推文和 Thread", capabilities: ["推文", "Thread"], level: "Specialist",
    systemPrompt: "",
  },
  {
    id: "seo-agent", label: "SEO", labelCn: "SEO 专家", color: "#059669", initial: "SEO",
    bio: "关键词研究、内容 SEO 优化", capabilities: ["SEO", "关键词"], level: "Specialist",
    systemPrompt: "",
  },
  {
    id: "visual-gen-agent", label: "Visual", labelCn: "视觉内容生成", color: "#fd79a8", initial: "VIS",
    bio: "AI 图片生成 + 营销视觉创作", capabilities: ["图片生成", "视觉设计"], level: "Specialist",
    systemPrompt: "",
  },
  {
    id: "strategist-agent", label: "Strategist", labelCn: "营销策略师", color: "#6c5ce7", initial: "STR",
    bio: "制定营销策略、内容战略", capabilities: ["策略规划", "渠道规划"], level: "Specialist",
    systemPrompt: "",
  },
].filter((a) => a.id !== "ceo");

function ChannelList({
  activeChannel,
  onSelect,
  teamLaunched,
  execMode,
  orchSubAgents,
  orchCeoStatus,
  activeTab,
  onTabChange,
  onExecModeChange,
  singleAgentRunning,
  onLaunchTeam,
}: {
  activeChannel: ChannelId;
  onSelect: (id: ChannelId) => void;
  teamLaunched: boolean;
  execMode: "single" | "orchestrator";
  orchSubAgents: Array<{ agentId: string; status: string }>;
  orchCeoStatus: string;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onExecModeChange: (mode: "single" | "orchestrator") => void;
  singleAgentRunning: string | null; // agentId of currently running single agent
  onLaunchTeam: () => void;
}) {
  const isOrchMode = execMode === "orchestrator";
  const displayAgents = isOrchMode ? AGENTS : ALL_SINGLE_AGENTS;
  const orchStatusMap = new Map(orchSubAgents.map((sa) => [sa.agentId, sa.status]));

  function getAgentStatus(agentId: string): "online" | "busy" | "done" | "offline" {
    if (isOrchMode) {
      if (agentId === "ceo") {
        if (!teamLaunched) return "offline";
        if (["planning", "executing", "reviewing"].includes(orchCeoStatus)) return "busy";
        if (orchCeoStatus === "done") return "done";
        return "online"; // CEO 启动后待命
      }
      // 子 Agent：只有被 CEO 计划选中或正在执行的才上线
      const subStatus = orchStatusMap.get(agentId);
      if (subStatus === "running") return "busy";
      if (subStatus === "done") return "done";
      if (subStatus === "error") return "offline";
      // 未被 CEO 选中的子 Agent 保持 offline（不再因 teamLaunched 就全部变绿）
      return "offline";
    }
    // 单 Agent 模式：正在执行的 Agent 亮，其他灰色
    if (singleAgentRunning === agentId) return "busy";
    return "offline";
  }

  const statusDotColor: Record<string, string> = {
    online: "#22c55e",
    busy: "#ef4444",
    done: "#22d3ee",
    offline: "var(--muted-foreground)",
  };

  return (
    <div
      className="flex flex-col w-64 shrink-0"
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Mode Switch: 单Agent / CEO编排 */}
      <div className="px-3 pt-3 pb-1">
        <div
          className="flex rounded-lg p-0.5"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          {(["single", "orchestrator"] as const).map((mode) => {
            const modeColor = mode === "single" ? "#22d3ee" : "#e74c3c";
            // CEO 编排运行中时禁止切到单 Agent
            const disabled = mode === "single" && orchCeoStatus !== "idle" && orchCeoStatus !== "done" && orchCeoStatus !== "error" && teamLaunched;
            return (
              <button
                key={mode}
                onClick={() => !disabled && onExecModeChange(mode)}
                disabled={disabled}
                className={cn(
                  "flex-1 text-xs py-1.5 rounded-md font-medium transition-all duration-200",
                  disabled
                    ? "opacity-30 cursor-not-allowed"
                    : execMode === mode
                      ? "text-foreground"
                      : "text-[var(--muted-foreground)] hover:text-foreground/70 cursor-pointer"
                )}
                style={
                  execMode === mode
                    ? { background: `${modeColor}15`, color: modeColor, boxShadow: `inset 0 0 0 1px ${modeColor}30` }
                    : {}
                }
                title={disabled ? "CEO 编排执行中，无法切换" : ""}
              >
                {mode === "single" ? "单 Agent" : "CEO 编排"}
              </button>
            );
          })}
        </div>
      </div>

      {/* View Tabs: 执行 / 对话 / 监控 */}
      <div className="px-3 py-1">
        <div className="flex gap-0.5">
          {([
            { id: "execute" as TabId, icon: Terminal, label: "执行" },
            { id: "chat" as TabId, icon: MessageSquare, label: "对话" },
            { id: "monitor" as TabId, icon: Monitor, label: "监控" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200",
                activeTab === id
                  ? "text-foreground"
                  : "text-[var(--muted-foreground)] hover:text-foreground/70 hover:bg-white/[0.03]"
              )}
              style={
                activeTab === id
                  ? { background: "rgba(167,139,250,0.08)", color: "#a78bfa" }
                  : {}
              }
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 my-1" style={{ borderTop: "1px solid var(--border)" }} />

      {/* Section Title */}
      <div className="px-4 py-1.5">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {isOrchMode ? "执行队列" : "选择 Agent"}
        </h3>
      </div>

      {/* Agent List */}
      <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-1">
        {displayAgents.map((agent) => {
          const isActive = activeChannel === agent.id;
          const status = getAgentStatus(agent.id);
          const isOffline = status === "offline";
          return (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className={cn(
                "flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer",
                isActive
                  ? "font-medium text-foreground"
                  : "dark:hover:bg-white/[0.03] hover:bg-black/[0.03]"
              )}
              style={{
                ...(isActive
                  ? { background: "rgba(167,139,250,0.08)" }
                  : { color: "var(--muted-foreground)" }),
                opacity: isOffline && isOrchMode ? 0.35 : 1,
              }}
            >
              <AgentAvatar agentId={agent.id} online={!isOffline} />
              <span className="flex-1 text-left truncate">{agent.labelCn}</span>
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${status === "busy" ? "animate-pulse" : ""}`}
                style={{ background: statusDotColor[status] || "var(--muted-foreground)" }}
              />
            </button>
          );
        })}
      </nav>

      {/* Footer: Status */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: teamLaunched ? "#22c55e" : "var(--muted-foreground)" }}
          />
          {isOrchMode
            ? teamLaunched
              ? `CEO 编排 · ${orchSubAgents.length > 0 ? `${orchSubAgents.filter(s => s.status === "done").length}/${orchSubAgents.length} 完成` : "等待指令"}`
              : "未启动"
            : `${displayAgents.length} 个 Agent 可用`}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Chat Bubbles
// ==========================================

function SystemBubble({ msg }: { msg: StudioMessage }) {
  return (
    <div className="flex justify-center py-2">
      <span
        className="text-xs px-3 py-1 rounded-full"
        style={{
          color: "var(--muted-foreground)",
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        {msg.content}
      </span>
    </div>
  );
}

function UserBubble({ msg }: { msg: StudioMessage }) {
  return (
    <div className="flex justify-end px-4 py-1.5">
      <div className="max-w-[70%]">
        <div
          className="rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-white"
          style={{
            background:
              "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(124,58,237,0.15))",
            border: "1px solid rgba(167,139,250,0.2)",
          }}
        >
          {msg.content}
        </div>
        <div
          className="text-[10px] mt-0.5 text-right"
          style={{ color: "var(--muted-foreground)" }}
        >
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

function AgentBubble({ msg }: { msg: StudioMessage }) {
  const agent = msg.agentId ? AGENT_MAP.get(msg.agentId) : null;
  const agentColor = agent?.color ?? "#888";

  return (
    <div className="flex gap-2.5 px-4 py-1.5">
      <AgentAvatar agentId={msg.agentId ?? ""} online />
      <div className="max-w-[70%] min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-xs font-semibold"
            style={{ color: agentColor }}
          >
            {agent?.label ?? "Agent"}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {formatTime(msg.timestamp)}
          </span>
        </div>
        <div
          className="rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: "var(--muted)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          {msg.content}
          {msg.isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm bg-white/50" />
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Execute Mode Status Icon
// ==========================================

function StatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case "waiting":
      return (
        <Clock
          className="h-4 w-4"
          style={{ color: "var(--muted-foreground)" }}
        />
      );
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-[#a78bfa]" />;
    case "done":
      return <CheckCircle className="h-4 w-4 text-[#22d3ee]" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-400" />;
  }
}

// ==========================================
// Main Component
// ==========================================

export function TeamStudioPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("execute");
  const [activeChannel, setActiveChannel] = useState<ChannelId>("all");
  const [teamLaunched, setTeamLaunched] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<StudioMessage[]>(
    getWelcomeMessages()
  );
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Execute state
  const [exec, setExec] = useState<ExecState>(INITIAL_EXEC);
  const [execInput, setExecInput] = useState("");
  const execAbortRef = useRef<AbortController | null>(null);
  const execCleanupRef = useRef<(() => void) | null>(null);
  // Track execution origin: 'local' = started from this window, 'remote' = from popover/other
  const execOriginRef = useRef<'local' | 'remote' | null>(null);
  const [execAgentId, setExecAgentId] = useState<string>("xhs-agent");
  // hasSession: main 进程是否已有此 agent 的 sessionId（切换页面后仍保持）
  const [hasSession, setHasSession] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Orchestrator (CEO Multi-Agent) state
  const [execMode, setExecMode] = useState<ExecMode>("single");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orch, setOrch] = useState<OrchestratorState>(INITIAL_ORCHESTRATOR);
  const [orchInput, setOrchInput] = useState("");

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exec.logs]);

  // Check if main process has an active session for this agent
  useEffect(() => {
    const api = getApi();
    if (api?.agent?.getSession) {
      api.agent.getSession(execAgentId).then((res) => {
        setHasSession(!!(res.data as { sessionId?: string } | null)?.sessionId);
      }).catch(() => setHasSession(false));
    }
  }, [execAgentId]);

  // Sync team launch state from persisted agent list + health check
  useEffect(() => {
    (async () => {
      // Check persisted team agents (dock pet state)
      if (window.api?.team) {
        try {
          const teamRes = await window.api.team.getAgents()
          if (teamRes.success && teamRes.data && teamRes.data.length > 0) {
            setTeamLaunched(true)
            return
          }
        } catch { /* fall through */ }
      }
      // Fallback: check agent server health
      try {
        const res = await fetch(`${AGENT_CHAT_BASE}/api/health`);
        if (res.ok) setTeamLaunched(true);
      } catch {
        setTeamLaunched(false);
      }
    })();

    // Listen for team changes from dock pet / other windows
    if (window.api?.team) {
      const unsub = window.api.team.onAgentsChanged((ids) => {
        setTeamLaunched(ids.length > 0)
      })
      return unsub
    }
  }, []);

  // Listen for chat messages from dock pet popover
  useEffect(() => {
    if (!window.api?.chatSync) return
    const unsub = window.api.chatSync.onMessage((msg) => {
      const newMsg: StudioMessage = {
        id: createId(),
        role: msg.role === 'user' ? 'user' : 'agent',
        agentId: msg.role !== 'user' ? msg.agentId : undefined,
        content: msg.content,
        timestamp: new Date(),
      }
      setMessages((prev) => {
        // Avoid duplicate if we just sent this message
        const last = prev[prev.length - 1]
        if (last && last.role === newMsg.role && last.content === msg.content) return prev
        return [...prev, newMsg]
      })
    })
    return unsub
  }, [])

  // Listen for remote agent executions (from dock pet popover → execute mode)
  useEffect(() => {
    if (!window.api?.chatSync) return;
    const api = getApi();
    if (!api) return;

    let remoteCleanup: (() => void) | null = null;

    const unsub = window.api.chatSync.onMessage((msg) => {
      // Only handle exec-mode user messages (not chat-mode)
      if (msg.role !== 'user' || msg.mode !== 'exec') return;
      // If we're already tracking an execution (local or remote), ignore
      if (execOriginRef.current) return;

      const targetAgentId = msg.agentId;
      const agent = AGENT_MAP.get(targetAgentId);
      const agentLabel = agent?.labelCn || targetAgentId;

      // Mark as remote execution
      execOriginRef.current = 'remote';
      setExecAgentId(targetAgentId);
      setActiveTab('execute');

      setExec({
        isRunning: true,
        startedAt: Date.now(),
        prompt: msg.content,
        tasks: [{
          id: createId(),
          agentId: targetAgentId,
          description: `${agentLabel} 执行中...`,
          status: 'running' as TaskStatus,
          progress: 0,
          toolCallCount: 0,
          content: '',
        }],
        logs: [{
          id: createId(),
          timestamp: Date.now(),
          agentId: targetAgentId,
          type: 'info' as const,
          message: `[Dock Pet] 开始执行: ${msg.content}`,
        }],
        result: '',
      });

      // Set up stream listeners for the remote execution
      let resultContent = '';
      let toolCount = 0;

      const unsubChunk = api.agent.onStreamChunk((raw: unknown) => {
        const event = (raw ?? {}) as Record<string, unknown>;
        if (event.type === 'text' && event.content) {
          resultContent += event.content as string;
          setExec((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.agentId === targetAgentId
                ? { ...t, content: resultContent, progress: Math.min(90, t.progress + 2) }
                : t
            ),
          }));
        }
        if (event.type === 'tool_use') {
          toolCount++;
          const toolName = (event.tool as string) || '';
          setExec((prev) => ({
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.agentId === targetAgentId
                ? { ...t, currentTool: toolName, toolCallCount: toolCount }
                : t
            ),
            logs: [...prev.logs, {
              id: createId(),
              timestamp: Date.now(),
              agentId: targetAgentId,
              type: 'tool' as const,
              message: `${TOOL_LABELS[toolName] || toolName}${event.toolInput ? ` → ${(event.toolInput as string).slice(0, 120)}` : ''}`,
            }],
          }));
        }
        if (event.type === 'tool_result') {
          setExec((prev) => ({
            ...prev,
            logs: [...prev.logs, {
              id: createId(),
              timestamp: Date.now(),
              agentId: targetAgentId,
              type: 'result' as const,
              message: `✅ ${((event.content as string) || '').slice(0, 200)}`,
            }],
          }));
        }
        if (event.type === 'error') {
          setExec((prev) => ({
            ...prev,
            logs: [...prev.logs, {
              id: createId(),
              timestamp: Date.now(),
              agentId: targetAgentId,
              type: 'error' as const,
              message: (event.message as string) || 'Unknown error',
            }],
          }));
        }
      });

      const cleanup = () => {
        unsubChunk();
        unsubEnd();
        unsubError();
        execOriginRef.current = null;
        remoteCleanup = null;
      };

      const unsubEnd = api.agent.onStreamEnd(() => {
        cleanup();
        setExec((prev) => ({
          ...prev,
          isRunning: false,
          result: resultContent,
          tasks: prev.tasks.map((t) =>
            t.agentId === targetAgentId
              ? { ...t, status: 'done' as TaskStatus, progress: 100, currentTool: undefined, finishedAt: Date.now() }
              : t
          ),
          logs: [...prev.logs, {
            id: createId(),
            timestamp: Date.now(),
            agentId: targetAgentId,
            type: 'result' as const,
            message: `执行完成 (${toolCount} 次工具调用)`,
          }],
        }));
      });

      const unsubError = api.agent.onStreamError((rawErr: unknown) => {
        const err = (rawErr ?? {}) as Record<string, unknown>;
        cleanup();
        setExec((prev) => ({
          ...prev,
          isRunning: false,
          tasks: prev.tasks.map((t) =>
            t.agentId === targetAgentId
              ? { ...t, status: 'error' as TaskStatus, error: (err.message as string) || 'Stream error', finishedAt: Date.now() }
              : t
          ),
          logs: [...prev.logs, {
            id: createId(),
            timestamp: Date.now(),
            agentId: targetAgentId,
            type: 'error' as const,
            message: (err.message as string) || 'Stream error',
          }],
        }));
      });

      remoteCleanup = cleanup;
      execCleanupRef.current = cleanup;
    });

    return () => {
      unsub();
      remoteCleanup?.();
    };
  }, []);

  // Listen for orchestrator events (CEO Multi-Agent)
  useEffect(() => {
    const api = getApi();
    if (!api?.orchestrator) return;

    const unsubPlan = api.orchestrator.onPlan((data) => {
      setOrch((prev) => ({ ...prev, plan: data.plan, ceoStatus: "planning" }));
    });

    const unsubSubStart = api.orchestrator.onSubStart((data) => {
      setOrch((prev) => ({
        ...prev,
        ceoStatus: "executing",
        subAgents: [
          ...prev.subAgents,
          {
            agentId: data.agentId,
            name: data.name,
            status: "running",
            task: data.task,
            startTime: Date.now(),
          },
        ],
      }));
    });

    const unsubSubDone = api.orchestrator.onSubDone((data) => {
      setOrch((prev) => ({
        ...prev,
        subAgents: prev.subAgents.map((sa) =>
          sa.agentId === data.agentId
            ? { ...sa, status: "done", output: data.result, endTime: Date.now() }
            : sa
        ),
      }));
    });

    const unsubSubError = api.orchestrator.onSubError((data) => {
      setOrch((prev) => ({
        ...prev,
        subAgents: prev.subAgents.map((sa) =>
          sa.agentId === data.agentId ? { ...sa, status: "error" } : sa
        ),
        error: data.error,
      }));
    });

    const unsubProgress = api.orchestrator.onProgress((data) => {
      setOrch((prev) => ({
        ...prev,
        progress: { done: data.done, total: data.total, running: data.running },
      }));
    });

    const unsubResult = api.orchestrator.onResult((data) => {
      setOrch((prev) => ({
        ...prev,
        isRunning: false,
        ceoStatus: "done",
        finalResult: data.result,
      }));
    });

    const unsubError = api.orchestrator.onError((data) => {
      setOrch((prev) => ({
        ...prev,
        isRunning: false,
        ceoStatus: "error",
        error: data.message,
      }));
    });

    const unsubStatus = api.orchestrator.onStatusChange((data) => {
      setOrch((prev) => ({
        ...prev,
        ceoStatus: data.status as OrchestratorState["ceoStatus"],
      }));
    });

    return () => {
      unsubPlan();
      unsubSubStart();
      unsubSubDone();
      unsubSubError();
      unsubProgress();
      unsubResult();
      unsubError();
      unsubStatus();
    };
  }, []);

  // ---------- Chat handlers ----------
  const handleSendChat = useCallback(async () => {
    if (!inputValue.trim() || sending) return;

    const userMsg: StudioMessage = {
      id: createId(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);

    const targetAgentId =
      activeChannel === "all" ? "ceo" : activeChannel;

    // Broadcast user message to popover
    window.api?.chatSync?.send({ agentId: targetAgentId, role: 'user', content: userMsg.content })
    const agent = AGENT_MAP.get(targetAgentId);
    if (!agent) {
      setSending(false);
      return;
    }

    const agentMsgId = createId();
    const agentMsg: StudioMessage = {
      id: agentMsgId,
      role: "agent",
      agentId: targetAgentId,
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, agentMsg]);

    await streamAgentMessage(
      targetAgentId,
      agent.systemPrompt,
      buildConversationHistory(messages),
      userMsg.content,
      (text) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? { ...m, content: m.content + text }
              : m
          )
        );
      },
      () => {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === agentMsgId ? { ...m, isStreaming: false } : m
          )
          // Broadcast completed response to popover
          const finalMsg = updated.find((m) => m.id === agentMsgId)
          if (finalMsg?.content) {
            window.api?.chatSync?.send({ agentId: targetAgentId, role: 'assistant', content: finalMsg.content })
          }
          return updated
        });
        setSending(false);

        // Save to contents via IPC
        const api = getApi();
        if (api) {
          const finalMsg = messages.find((m) => m.id === agentMsgId);
          if (finalMsg && finalMsg.content) {
            api.agent
              .saveResult({
                agentType: targetAgentId,
                status: "success",
                data: {
                  title: `${agent.label} Response`,
                  body: finalMsg.content,
                  platform: "xhs",
                },
              })
              .catch(() => {
                /* silent */
              });
          }
        }
      },
      (error) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content:
                    m.content + `\n\n[Error: ${error}]`,
                  isStreaming: false,
                }
              : m
          )
        );
        setSending(false);
      }
    );
  }, [inputValue, sending, activeChannel, messages]);

  const handleChatKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // ---------- Execute handlers ----------
  const handleExecute = useCallback(async () => {
    if (!execInput.trim() || exec.isRunning) return;

    const prompt = execInput.trim();
    setExecInput("");

    const targetAgentId = execAgentId;
    const agent = AGENT_MAP.get(targetAgentId);
    const agentLabel = agent?.labelCn || targetAgentId;

    // Mark as local execution and broadcast to popover
    execOriginRef.current = 'local';
    window.api?.chatSync?.send({ agentId: targetAgentId, role: 'user', content: prompt, mode: 'exec' });

    setExec((prev) => ({
      isRunning: true,
      startedAt: Date.now(),
      prompt,
      tasks: [
        {
          id: createId(),
          agentId: targetAgentId,
          description: `${agentLabel} 执行中...`,
          status: "running",
          progress: 0,
          toolCallCount: 0,
          content: "",
        },
      ],
      // 恢复会话时保留之前的 logs，用分隔线标记
      logs: [
        ...(hasSession ? prev.logs : []),
        ...(hasSession ? [{
          id: createId(),
          timestamp: Date.now(),
          agentId: targetAgentId,
          type: "info" as const,
          message: `── 继续对话 ──`,
        }] : []),
        {
          id: createId(),
          timestamp: Date.now(),
          agentId: targetAgentId,
          type: "info" as const,
          message: `开始执行: ${prompt}`,
        },
      ],
      result: "",
    }));

    const api = getApi();

    if (api) {
      // ── IPC path — spawn claude CLI with full MCP tool support ──
      let resultContent = "";
      let toolCount = 0;

      const unsubChunk = api.agent.onStreamChunk(
        (raw: unknown) => {
          const event = (raw ?? {}) as Record<string, unknown>;
          if (event.type === "text" && event.content) {
            resultContent += event.content as string;
            setExec((prev) => ({
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.agentId === targetAgentId
                  ? {
                      ...t,
                      content: resultContent,
                      progress: Math.min(90, t.progress + 2),
                    }
                  : t
              ),
            }));
          }
          if (event.type === "tool_use") {
            toolCount++;
            const toolName = (event.tool as string) || "";
            setExec((prev) => ({
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.agentId === targetAgentId
                  ? {
                      ...t,
                      currentTool: toolName,
                      toolCallCount: toolCount,
                    }
                  : t
              ),
              logs: [
                ...prev.logs,
                {
                  id: createId(),
                  timestamp: Date.now(),
                  agentId: targetAgentId,
                  type: "tool" as const,
                  message: `${TOOL_LABELS[toolName] || toolName}${event.toolInput ? ` → ${(event.toolInput as string).slice(0, 120)}` : ""}`,
                },
              ],
            }));
          }
          if (event.type === "tool_result") {
            setExec((prev) => ({
              ...prev,
              logs: [
                ...prev.logs,
                {
                  id: createId(),
                  timestamp: Date.now(),
                  agentId: targetAgentId,
                  type: "result" as const,
                  message: `✅ ${((event.content as string) || "").slice(0, 200)}`,
                },
              ],
            }));
          }
          if (event.type === "error") {
            setExec((prev) => ({
              ...prev,
              logs: [
                ...prev.logs,
                {
                  id: createId(),
                  timestamp: Date.now(),
                  agentId: targetAgentId,
                  type: "error" as const,
                  message:
                    (event.message as string) || "Unknown error",
                },
              ],
            }));
          }
        }
      );

      const cleanup = () => {
        unsubChunk();
        unsubEnd();
        unsubError();
        execCleanupRef.current = null;
      };

      const unsubEnd = api.agent.onStreamEnd(() => {
        cleanup();
        execOriginRef.current = null;
        // Broadcast final result to popover
        if (resultContent) {
          window.api?.chatSync?.send({ agentId: targetAgentId, role: 'assistant', content: resultContent, mode: 'exec' });
        }
        setExec((prev) => ({
          ...prev,
          isRunning: false,
          result: resultContent,
          tasks: prev.tasks.map((t) =>
            t.agentId === targetAgentId
              ? {
                  ...t,
                  status: "done" as TaskStatus,
                  progress: 100,
                  currentTool: undefined,
                  finishedAt: Date.now(),
                }
              : t
          ),
          logs: [
            ...prev.logs,
            {
              id: createId(),
              timestamp: Date.now(),
              agentId: targetAgentId,
              type: "result" as const,
              message: `执行完成 (${toolCount} 次工具调用)`,
            },
          ],
        }));
      });

      const unsubError = api.agent.onStreamError(
        (rawErr: unknown) => {
          const err = (rawErr ?? {}) as Record<string, unknown>;
          cleanup();
          execOriginRef.current = null;
          setExec((prev) => ({
            ...prev,
            isRunning: false,
            tasks: prev.tasks.map((t) =>
              t.agentId === targetAgentId
                ? {
                    ...t,
                    status: "error" as TaskStatus,
                    error:
                      (err.message as string) || "Stream error",
                    finishedAt: Date.now(),
                  }
                : t
            ),
            logs: [
              ...prev.logs,
              {
                id: createId(),
                timestamp: Date.now(),
                agentId: targetAgentId,
                type: "error" as const,
                message:
                  (err.message as string) || "Stream error",
              },
            ],
          }));
        }
      );

      execCleanupRef.current = cleanup;

      try {
        // sessionId 由 main 进程自动管理（agentSessions Map）
        const res = await api.agent.execute({
          agentId: targetAgentId,
          message: prompt,
          mode: "direct",
        });
        if (res.success) {
          setHasSession(true);
        }
        if (!res.success) {
          cleanup();
          setExec((prev) => ({
            ...prev,
            isRunning: false,
            tasks: prev.tasks.map((t) => ({
              ...t,
              status: "error" as TaskStatus,
              error: res.error || "Execution failed",
            })),
          }));
        }
      } catch {
        // Error handled by stream error listener
      }
    } else {
      // ── HTTP fallback (when running outside Electron) ──
      try {
        const fallbackAgent =
          AGENT_MAP.get(targetAgentId) || AGENT_MAP.get("ceo");
        if (!fallbackAgent) return;

        let resultContent = "";

        await streamAgentMessage(
          targetAgentId,
          fallbackAgent.systemPrompt,
          "",
          prompt,
          (text) => {
            resultContent += text;
            setExec((prev) => ({
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.agentId === targetAgentId
                  ? { ...t, content: resultContent, progress: 50 }
                  : t
              ),
            }));
          },
          () => {
            setExec((prev) => ({
              ...prev,
              isRunning: false,
              tasks: prev.tasks.map((t) =>
                t.agentId === targetAgentId
                  ? {
                      ...t,
                      status: "done" as TaskStatus,
                      progress: 100,
                      finishedAt: Date.now(),
                    }
                  : t
              ),
              result: resultContent,
              logs: [
                ...prev.logs,
                {
                  id: createId(),
                  timestamp: Date.now(),
                  agentId: targetAgentId,
                  type: "result" as const,
                  message: "执行完成",
                },
              ],
            }));
          },
          (error) => {
            setExec((prev) => ({
              ...prev,
              isRunning: false,
              tasks: prev.tasks.map((t) =>
                t.agentId === targetAgentId
                  ? {
                      ...t,
                      status: "error" as TaskStatus,
                      error,
                      finishedAt: Date.now(),
                    }
                  : t
              ),
              logs: [
                ...prev.logs,
                {
                  id: createId(),
                  timestamp: Date.now(),
                  agentId: targetAgentId,
                  type: "error" as const,
                  message: error,
                },
              ],
            }));
          }
        );
      } catch {
        setExec((prev) => ({
          ...prev,
          isRunning: false,
          tasks: prev.tasks.map((t) => ({
            ...t,
            status: "error" as TaskStatus,
            error: "Agent 服务不可用",
          })),
        }));
      }
    }
  }, [execInput, exec.isRunning, execAgentId]);

  const handleStopExec = () => {
    const api = getApi();
    if (api) {
      api.agent.abort();
    }
    execAbortRef.current?.abort();
    execCleanupRef.current?.();
    execCleanupRef.current = null;
    execOriginRef.current = null;
    setExec((prev) => ({ ...prev, isRunning: false }));
  };

  // ---------- Orchestrator (CEO Multi-Agent) handlers ----------
  const handleOrchestratorExecute = useCallback(async () => {
    if (!orchInput.trim() || orch.isRunning) return;

    const prompt = orchInput.trim();
    setOrchInput("");

    // Auto-launch team if not already launched
    if (!teamLaunched) {
      setTeamLaunched(true);
      if (window.api?.team) {
        window.api.team.setAgents(["ceo"]);
      }
    }

    // Reset orchestrator state
    setOrch({
      isRunning: true,
      ceoStatus: "planning",
      prompt,
      subAgents: [],
      progress: { done: 0, total: 0, running: [] },
    });

    const api = getApi();
    if (!api?.orchestrator) {
      setOrch((prev) => ({
        ...prev,
        isRunning: false,
        ceoStatus: "error",
        error: "Orchestrator API not available",
      }));
      return;
    }

    try {
      const res = await api.orchestrator.execute({ prompt });
      if (!res.success) {
        setOrch((prev) => ({
          ...prev,
          isRunning: false,
          ceoStatus: "error",
          error: res.error || "Execution failed",
        }));
      }
    } catch (err) {
      setOrch((prev) => ({
        ...prev,
        isRunning: false,
        ceoStatus: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [orchInput, orch.isRunning]);

  const handleStopOrchestrator = () => {
    const api = getApi();
    if (api?.orchestrator) {
      api.orchestrator.abort();
    }
    setOrch((prev) => ({ ...prev, isRunning: false, ceoStatus: "idle" }));
  };

  return (
    <div
      className="flex h-full -m-6"
      style={{ background: "var(--background)" }}
    >
      {/* Channel List */}
      <ChannelList
        activeChannel={activeChannel}
        onSelect={(id) => {
          setActiveChannel(id);
          setSettingsOpen(false);
          if (execMode === "single" && id !== "all") {
            setExecAgentId(id);
          }
        }}
        teamLaunched={teamLaunched}
        execMode={execMode}
        orchSubAgents={orch.subAgents}
        orchCeoStatus={orch.ceoStatus}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExecModeChange={(mode) => {
          setExecMode(mode);
          setActiveChannel("all");
          setSettingsOpen(false);
        }}
        singleAgentRunning={execMode === "single" && exec.isRunning ? execAgentId : null}
        onLaunchTeam={() => {
          const next = !teamLaunched;
          setTeamLaunched(next);
          if (window.api?.team) {
            window.api.team.setAgents(next ? ["ceo"] : []);
          }
          if (next) {
            setActiveTab("execute");
            setExecMode("orchestrator");
          }
        }}
      />

      {/* Main Area — border color reflects execution mode */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{
          borderTop: execMode === "orchestrator"
            ? "2px solid rgba(231,76,60,0.3)"
            : "2px solid rgba(34,211,238,0.3)",
        }}
      >
        {/* Top Bar — CEO mode banner OR Agent info bar */}
        {execMode === "orchestrator" && (!activeChannel || activeChannel === "all" || activeChannel === "ceo") ? (
          /* CEO 编排模式默认 banner */
          <div
            className="px-4 py-3 shrink-0 flex items-center gap-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <AgentAvatar agentId="ceo" size="md" online={teamLaunched} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "#e74c3c" }}>
                  CEO 编排模式
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(231,76,60,0.1)",
                    color: "#e74c3c",
                    border: "1px solid rgba(231,76,60,0.2)",
                  }}
                >
                  {orch.ceoStatus === "idle" && "待命"}
                  {orch.ceoStatus === "planning" && "分析中"}
                  {orch.ceoStatus === "executing" && "执行中"}
                  {orch.ceoStatus === "reviewing" && "审核中"}
                  {orch.ceoStatus === "done" && "已完成"}
                  {orch.ceoStatus === "error" && "出错"}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                输入任务，CEO 将自动分析需求并调度子 Agent 协作完成
              </p>
            </div>
            {/* 启动/关闭团队按钮 */}
            <button
              onClick={() => {
                const next = !teamLaunched;
                setTeamLaunched(next);
                if (window.api?.team) {
                  window.api.team.setAgents(next ? ["ceo"] : []);
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
                teamLaunched
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-[#22d3ee] hover:bg-[#22d3ee]/10"
              )}
              style={{
                border: teamLaunched
                  ? "1px solid rgba(239,68,68,0.2)"
                  : "1px solid rgba(34,211,238,0.2)",
              }}
            >
              {teamLaunched ? (
                <><PowerOff className="h-3.5 w-3.5" /> 关闭</>
              ) : (
                <><Power className="h-3.5 w-3.5" /> 启动团队</>
              )}
            </button>
          </div>
        ) : activeChannel && activeChannel !== "all" ? (
          /* 选中具体 Agent 时显示 Agent 信息栏 */
          (() => {
            const allAgents = [...AGENTS, ...ALL_SINGLE_AGENTS];
            const selectedAgent = allAgents.find((a) => a.id === activeChannel);
            if (!selectedAgent) return null;
            return (
              <>
                <AgentInfoBar
                  agent={selectedAgent}
                  settingsOpen={settingsOpen}
                  onToggleSettings={() => setSettingsOpen((v) => !v)}
                />
                {settingsOpen && (
                  <AgentSettingsPanel
                    agent={selectedAgent}
                    onClose={() => setSettingsOpen(false)}
                  />
                )}
              </>
            );
          })()
        ) : null}

        {/* Execute Mode */}
        {activeTab === "execute" && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Single Agent Mode */}
            {execMode === "single" && (
              <>
                {/* Task/Logs area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {exec.tasks.length === 0 && !exec.result && (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Zap
                        className="h-12 w-12"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                      <p
                        className="text-sm text-center"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        选择 Agent 并输入任务 — 通过 IPC
                        执行，支持 MCP 工具（搜索、分析、发布）
                      </p>
                    </div>
                  )}

              {/* Task Cards */}
              {exec.tasks.map((task) => {
                const ac =
                  AGENT_COLORS[task.agentId] ?? AGENT_COLORS.ceo;
                return (
                  <div
                    key={task.id}
                    className="rounded-xl p-4 space-y-3"
                    style={{
                      background: "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <AgentAvatar
                        agentId={task.agentId}
                        online
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: ac.color }}
                          >
                            {ac.name}
                          </span>
                          <StatusIcon status={task.status} />
                        </div>
                        <p
                          className="text-xs"
                          style={{
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {task.description}
                        </p>
                      </div>
                      {task.status === "running" && (
                        <div className="flex items-center gap-2 shrink-0">
                          {task.currentTool && (
                            <span
                              className="text-xs"
                              style={{
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {TOOL_LABELS[task.currentTool] ||
                                task.currentTool}
                            </span>
                          )}
                          <span className="text-xs tabular-nums text-[#a78bfa]">
                            {task.progress}%
                          </span>
                          {task.toolCallCount > 0 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                background:
                                  "rgba(167,139,250,0.1)",
                                color: "#a78bfa",
                              }}
                            >
                              {task.toolCallCount} tools
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {task.content && (
                      <div
                        className="rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto"
                        style={{
                          background: "var(--muted)",
                          border:
                            "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                      >
                        {task.content}
                        {task.status === "running" && (
                          <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm bg-white/50" />
                        )}
                      </div>
                    )}

                    {task.error && (
                      <div
                        className="rounded-lg p-3 text-sm text-red-400"
                        style={{
                          background: "rgba(239,68,68,0.08)",
                          border:
                            "1px solid rgba(239,68,68,0.15)",
                        }}
                      >
                        {task.error}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Logs */}
              {exec.logs.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Logs
                  </h4>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto font-mono text-xs">
                    {exec.logs.map((log) => {
                      const ac =
                        AGENT_COLORS[log.agentId] ??
                        AGENT_COLORS.ceo;
                      return (
                        <div
                          key={log.id}
                          className="flex gap-2"
                        >
                          <span
                            style={{
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {new Date(
                              log.timestamp
                            ).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span style={{ color: ac.color }}>
                            [{ac.name}]
                          </span>
                          <span
                            style={{
                              color:
                                log.type === "error"
                                  ? "#f87171"
                                  : "var(--muted-foreground)",
                            }}
                          >
                            {log.message}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Execute Input */}
            <div
              className="px-4 py-3 shrink-0"
              style={{
                borderTop: "1px solid var(--border)",
                background: "var(--muted)",
              }}
            >
              <div className="flex gap-2">
                <textarea
                  value={execInput}
                  onChange={(e) => setExecInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleExecute();
                    }
                  }}
                  placeholder={hasSession ? `继续对话... (上下文已保持)` : `向 ${AGENT_MAP.get(execAgentId)?.labelCn || execAgentId} 下达任务...`}
                  rows={1}
                  className="flex-1 rounded-lg px-3 py-2 text-sm resize-none outline-none"
                  style={{
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  disabled={exec.isRunning}
                />
                {exec.isRunning ? (
                  <button
                    onClick={handleStopExec}
                    className="flex items-center justify-center size-9 rounded-lg shrink-0 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    style={{
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleExecute}
                    disabled={!execInput.trim()}
                    className="flex items-center justify-center size-9 rounded-lg shrink-0 transition-colors disabled:opacity-30"
                    style={{
                      background:
                        "linear-gradient(135deg, #a78bfa, #7c3aed)",
                    }}
                  >
                    <Send className="h-4 w-4 text-white" />
                  </button>
                )}
                <button
                  onClick={() => { setExec(INITIAL_EXEC); setHasSession(false); getApi()?.agent?.clearSession(execAgentId); }}
                  className="flex items-center justify-center size-9 rounded-lg shrink-0 hover:bg-white/5 transition-colors"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                  title="新对话（清除上下文）"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Orchestrator Mode */}
        {execMode === "orchestrator" && (
          <>
            {/* Orchestrator Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!orch.isRunning && orch.subAgents.length === 0 && !orch.finalResult && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Users className="h-12 w-12" style={{ color: "var(--muted-foreground)" }} />
                  <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
                    CEO 自动编排模式 — 输入任务，CEO 将自动调度多个 Agent 协作完成
                  </p>
                </div>
              )}

              {/* CEO Status */}
              {orch.isRunning && (
                <div className="rounded-xl p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <AgentAvatar agentId="ceo" online />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: AGENT_COLORS.ceo.color }}>
                          CEO 营销总监
                        </span>
                        <Loader2 className="h-4 w-4 animate-spin text-[#a78bfa]" />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {orch.ceoStatus === "planning" && "正在分析需求并制定执行计划..."}
                        {orch.ceoStatus === "executing" && "正在调度子 Agent 执行任务..."}
                        {orch.ceoStatus === "reviewing" && "正在审核子 Agent 产出..."}
                        {orch.ceoStatus === "done" && "任务完成"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Plan */}
              {orch.plan && (
                <div className="rounded-xl p-4" style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#a78bfa" }}>
                    执行计划
                  </h4>
                  <pre className="text-xs whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                    {orch.plan}
                  </pre>
                </div>
              )}

              {/* Sub Agents */}
              {orch.subAgents.map((sa) => {
                const ac = AGENT_COLORS[sa.agentId] ?? { color: "#888", avatar: "?", name: sa.name };
                return (
                  <div
                    key={sa.agentId}
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <AgentAvatar agentId={sa.agentId} online={sa.status === "running"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: ac.color }}>
                            {ac.name}
                          </span>
                          {sa.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-[#a78bfa]" />}
                          {sa.status === "done" && <CheckCircle className="h-4 w-4 text-[#22d3ee]" />}
                          {sa.status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{sa.task}</p>
                      </div>
                    </div>
                    {sa.output && (() => {
                      // Clean output: remove line-number prefixes (e.g. "1→") and file read artifacts
                      const cleaned = sa.output
                        .replace(/^\d+→/gm, '')
                        .replace(/^[\s\S]*?(#|##|###|\*\*)/m, '$1') // skip to first markdown heading or bold
                        .trim();
                      const summary = cleaned.length > 200 ? cleaned.slice(0, 200) + '...' : cleaned;
                      return (
                        <div
                          className="rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto"
                          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                        >
                          {summary}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Progress */}
              {orch.progress.total > 0 && (
                <div className="rounded-xl p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--muted-foreground)]">执行进度</span>
                    <span className="text-xs font-medium">
                      {orch.progress.done} / {orch.progress.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full bg-[#a78bfa] transition-all duration-300"
                      style={{ width: `${(orch.progress.done / orch.progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Final Result — extract final content and render cleanly */}
              {orch.finalResult && (() => {
                // Try to extract the final note content (after "最终稿" or "正文" marker)
                const raw = orch.finalResult;
                let finalContent = raw;
                // Look for the actual content section
                const markers = ['### 最终稿', '**正文：**', '**正文:**', '## 最终交付', '### 最终内容'];
                for (const marker of markers) {
                  const idx = raw.indexOf(marker);
                  if (idx !== -1) {
                    finalContent = raw.slice(idx);
                    break;
                  }
                }
                // Clean up line-number prefixes if present
                finalContent = finalContent.replace(/^\d+→/gm, '').trim();

                return (
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(34,211,238,0.3)" }}>
                    {/* Header */}
                    <div
                      className="px-4 py-3 flex items-center justify-between"
                      style={{ background: "rgba(34,211,238,0.08)", borderBottom: "1px solid rgba(34,211,238,0.15)" }}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-[#22d3ee]" />
                        <h4 className="text-sm font-semibold" style={{ color: "#22d3ee" }}>
                          最终交付
                        </h4>
                      </div>
                    </div>
                    {/* Content */}
                    <div
                      className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto"
                      style={{ color: "var(--foreground)" }}
                    >
                      {finalContent}
                    </div>
                    {/* Action buttons */}
                    <div
                      className="px-4 py-3 flex items-center justify-end gap-3"
                      style={{ borderTop: "1px solid var(--border)", background: "var(--muted)" }}
                    >
                      <button
                        onClick={() => {
                          setOrchInput("请根据以上反馈修改优化内容");
                          setOrch((prev) => ({ ...prev, ceoStatus: "idle", finalResult: undefined }));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                        style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        重新修改
                      </button>
                      <button
                        onClick={async () => {
                          const api = getApi();
                          if (!api) return;
                          // Save final delivery to Approval Center
                          const content = finalContent;
                          const taskPrompt = orch.prompt || "CEO 编排任务";
                          const title = content.match(/\*\*标题[：:]\s*\*\*\s*(.+)/)?.[1]
                            || content.match(/^#+\s*(.+)/m)?.[1]
                            || taskPrompt.slice(0, 80);
                          const res = await api.agent.saveResult({
                            mode: "orchestrator",
                            agentId: "ceo",
                            prompt: taskPrompt,
                            result: content,
                            title: title.slice(0, 100),
                            platform: "xiaohongshu",
                          });
                          if (res.success) {
                            navigate("/approval");
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: "rgba(34,211,238,0.15)",
                          color: "#22d3ee",
                          border: "1px solid rgba(34,211,238,0.3)",
                        }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        准备推送
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Error */}
              {orch.error && (
                <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{orch.error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Orchestrator Input */}
            <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--muted)" }}>
              <div className="flex gap-2">
                <textarea
                  value={orchInput}
                  onChange={(e) => setOrchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleOrchestratorExecute();
                    }
                  }}
                  placeholder="输入任务，CEO 将自动安排多个 Agent 协作完成..."
                  rows={1}
                  className="flex-1 rounded-lg px-3 py-2 text-sm resize-none outline-none"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  disabled={orch.isRunning}
                />
                {orch.isRunning ? (
                  <button
                    onClick={handleStopOrchestrator}
                    className="flex items-center justify-center size-9 rounded-lg shrink-0 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    style={{ border: "1px solid rgba(239,68,68,0.3)" }}
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleOrchestratorExecute}
                    disabled={!orchInput.trim()}
                    className="flex items-center justify-center size-9 rounded-lg shrink-0 transition-colors disabled:opacity-30"
                    style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
                  >
                    <Send className="h-4 w-4 text-white" />
                  </button>
                )}
                <button
                  onClick={() => setOrch(INITIAL_ORCHESTRATOR)}
                  className="flex items-center justify-center size-9 rounded-lg shrink-0 hover:bg-white/5 transition-colors"
                  style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                  title="重置"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* Chat Mode */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4">
              {messages.map((msg) => {
                if (msg.role === "system")
                  return <SystemBubble key={msg.id} msg={msg} />;
                if (msg.role === "user")
                  return <UserBubble key={msg.id} msg={msg} />;
                return <AgentBubble key={msg.id} msg={msg} />;
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div
              className="px-4 py-3 shrink-0"
              style={{
                borderTop: "1px solid var(--border)",
                background: "var(--muted)",
              }}
            >
              <div className="flex gap-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder={
                    activeChannel === "all"
                      ? "向全员发送消息..."
                      : `与 ${AGENT_MAP.get(activeChannel)?.labelCn ?? ""} 对话...`
                  }
                  rows={1}
                  className="flex-1 rounded-lg px-3 py-2 text-sm resize-none outline-none"
                  style={{
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  disabled={sending}
                />
                <button
                  onClick={handleSendChat}
                  disabled={!inputValue.trim() || sending}
                  className="flex items-center justify-center size-9 rounded-lg shrink-0 transition-colors disabled:opacity-30"
                  style={{
                    background:
                      "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  }}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </button>
                <button
                  onClick={() => setMessages(getWelcomeMessages())}
                  className="flex items-center justify-center size-9 rounded-lg shrink-0 hover:bg-white/5 transition-colors"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                  title="清除对话"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "monitor" && (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-foreground/20" />
              </div>
            }
          >
            <TeamModeView />
          </Suspense>
        )}
      </div>
    </div>
  );
}
