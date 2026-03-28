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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApi } from "@/lib/ipc";

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
  "analyst-agent": { color: "#22d3ee", avatar: "AN", name: "Analyst" },
  "growth-agent": { color: "#00cec9", avatar: "G", name: "Growth" },
  "brand-reviewer": { color: "#a855f7", avatar: "BR", name: "Reviewer" },
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

function AgentAvatar({
  agentId,
  size = "sm",
  online,
}: {
  agentId: string;
  size?: "sm" | "md";
  online?: boolean;
}) {
  const colors = AGENT_COLORS[agentId] ?? {
    color: "#888",
    avatar: "?",
    name: "Unknown",
  };
  const dim = size === "md" ? "w-9 h-9" : "w-7 h-7";
  const textSize = size === "md" ? "text-xs" : "text-[10px]";
  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center shrink-0 font-bold ${textSize}`}
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
// Channel List Sidebar
// ==========================================

function ChannelList({
  activeChannel,
  onSelect,
  teamLaunched,
}: {
  activeChannel: ChannelId;
  onSelect: (id: ChannelId) => void;
  teamLaunched: boolean;
}) {
  return (
    <div
      className="flex flex-col w-64 shrink-0"
      style={{
        background: "var(--sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3
          className="text-sm font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Agent Team
        </h3>
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: teamLaunched
              ? "#22c55e"
              : "var(--muted-foreground)",
            boxShadow: teamLaunched
              ? "0 0 6px rgba(34,197,94,0.4)"
              : "none",
          }}
        />
      </div>
      <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-1">
        <button
          onClick={() => onSelect("all")}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer",
            activeChannel === "all"
              ? "font-medium text-foreground"
              : "dark:hover:bg-white/[0.03] hover:bg-black/[0.03]"
          )}
          style={
            activeChannel === "all"
              ? { background: "rgba(167,139,250,0.08)" }
              : { color: "var(--muted-foreground)" }
          }
        >
          <Users className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">全员</span>
        </button>
        {AGENTS.map((agent) => {
          const isActive = activeChannel === agent.id;
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
              style={
                isActive
                  ? { background: "rgba(167,139,250,0.08)" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              <AgentAvatar
                agentId={agent.id}
                online={teamLaunched}
              />
              <span className="flex-1 text-left truncate">
                {agent.labelCn}
              </span>
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  background: teamLaunched
                    ? "#22c55e"
                    : "var(--muted-foreground)",
                }}
              />
            </button>
          );
        })}
      </nav>
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              background: teamLaunched
                ? "#22c55e"
                : "var(--muted-foreground)",
            }}
          />
          {teamLaunched
            ? `在线: ${AGENTS.length} 个 Agent`
            : "团队未启动"}
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
        setHasSession(!!res.data?.sessionId);
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

  return (
    <div
      className="flex h-full -m-6"
      style={{ background: "var(--background)" }}
    >
      {/* Channel List */}
      <ChannelList
        activeChannel={activeChannel}
        onSelect={setActiveChannel}
        teamLaunched={teamLaunched}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar */}
        <div
          className="flex items-center gap-1 px-4 py-2 shrink-0"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--muted)",
          }}
        >
          <button
            onClick={() => setActiveTab("execute")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === "execute"
                ? "bg-primary/10 text-foreground font-medium"
                : "text-foreground/40 hover:text-foreground/60"
            )}
            style={
              activeTab === "execute"
                ? { border: "1px solid rgba(167,139,250,0.2)" }
                : {}
            }
          >
            <Terminal className="h-3.5 w-3.5" />
            执行模式
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === "chat"
                ? "bg-primary/10 text-foreground font-medium"
                : "text-foreground/40 hover:text-foreground/60"
            )}
            style={
              activeTab === "chat"
                ? { border: "1px solid rgba(167,139,250,0.2)" }
                : {}
            }
          >
            <MessageSquare className="h-3.5 w-3.5" />
            团队对话
          </button>
          <button
            onClick={() => setActiveTab("monitor")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === "monitor"
                ? "bg-primary/10 text-foreground font-medium"
                : "text-foreground/40 hover:text-foreground/60"
            )}
            style={
              activeTab === "monitor"
                ? { border: "1px solid rgba(167,139,250,0.2)" }
                : {}
            }
          >
            <Monitor className="h-3.5 w-3.5" />
            Monitor
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const next = !teamLaunched
                setTeamLaunched(next)
                // Sync active agents to dock pet
                if (window.api?.team) {
                  const ids = next ? AGENTS.map(a => a.id) : []
                  window.api.team.setAgents(ids)
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
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
                <>
                  <PowerOff className="h-3.5 w-3.5" /> 关闭团队
                </>
              ) : (
                <>
                  <Power className="h-3.5 w-3.5" /> 启动团队
                </>
              )}
            </button>
          </div>
        </div>

        {/* Execute Mode */}
        {activeTab === "execute" && (
          <div className="flex-1 flex flex-col overflow-hidden">
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
                <select
                  value={execAgentId}
                  onChange={(e) => { setExecAgentId(e.target.value); setHasSession(false); }}
                  disabled={exec.isRunning}
                  className="rounded-lg px-2 py-2 text-sm outline-none shrink-0 cursor-pointer"
                  style={{
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    minWidth: "120px",
                  }}
                >
                  {AGENTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.labelCn}
                    </option>
                  ))}
                </select>
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
