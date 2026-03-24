'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  MessageSquare,
  Search,
  PenTool,
  Video,
  FileText,
  Mic,
  Send,
  BarChart3,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ChevronLeft,
  MousePointer2,
  Globe,
  Route,
  Headphones,
  Square,
  Clock,
  Users,
  Monitor,
  Rocket,
  GitMerge,
} from 'lucide-react';
import type { WorkflowRun, WorkflowStepRecord, ContentType, StepStatus } from '@/types/workflow';

// =============================================================================
// Step icon mapping
// =============================================================================

const STEP_ICONS: Record<string, typeof MessageSquare> = {
  receive: MessageSquare,
  analyze: Search,
  collect: Globe,
  route: Route,
  generate: PenTool,
  intervention: MousePointer2,
  publish: Send,
  track: BarChart3,
  complete: CheckCircle2,
  // Team workflow steps
  launch_team: Rocket,
  sync_task: Send,
  team_working: Users,
  review: GitMerge,
};

function getStepIcon(stepId: string) {
  return STEP_ICONS[stepId] ?? MessageSquare;
}

// =============================================================================
// CreatorFlow port (from health endpoint)
// =============================================================================

const CREATORFLOW_PORT = '3002';

function getToolLink(ct: ContentType) {
  switch (ct) {
    case 'video':
      return { label: '打开脚本工作台', url: '/creatorflow', external: false };
    case 'article':
      return { label: '打开编辑器', url: '/creatorflow', external: false };
    case 'podcast':
      return { label: '播客工作台', url: '/creatorflow', external: false };
    case 'team':
      return { label: 'Team Studio', url: '/team-studio', external: false };
    default:
      return { label: '查看内容详情', url: '/publishing', external: false };
  }
}

// =============================================================================
// Step target positions for cursor animation
// =============================================================================

function getStepTargetPos(stepId: string, contentType: ContentType): { x: number; y: number } {
  // Team workflow: try to find Team Studio UI elements
  if (contentType === 'team') {
    const teamSelectors: Record<string, string> = {
      receive: '[data-nav="dashboard"]',
      analyze: '[data-nav="dashboard"]',
      launch_team: '[data-team-launch]',
      sync_task: '[data-team-input]',
      team_working: '[data-team-monitor]',
      review: '[data-team-monitor]',
      complete: '[data-nav="dashboard"]',
    };
    const sel = teamSelectors[stepId];
    if (sel) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    // Team fallback positions
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const teamFallbacks: Record<string, { x: number; y: number }> = {
      receive: { x: w / 2, y: h / 2 },
      analyze: { x: 120, y: 140 },
      launch_team: { x: w - 120, y: 48 },      // Top right header area (Launch button)
      sync_task: { x: w * 0.5, y: h - 60 },     // Bottom center (chat input)
      team_working: { x: w * 0.5, y: h * 0.4 }, // Center (monitor area)
      review: { x: w * 0.5, y: h * 0.3 },       // Center upper
      complete: { x: w - 40, y: h - 40 },
    };
    return teamFallbacks[stepId] ?? { x: w / 2, y: h / 2 };
  }

  // Try to find real sidebar element positions
  const sidebarSelectors: Record<string, string> = {
    receive: '[data-nav="dashboard"]',
    analyze: '[data-nav="dashboard"]',
    collect: '[data-nav="context-vault"]',
    route: '[data-nav="team-studio"]',
    generate: '[data-nav="creatorflow"]',
    intervention: '[data-nav="creatorflow"]',
    publish: '[data-nav="publishing"]',
    track: '[data-nav="analytics"]',
    complete: '[data-nav="dashboard"]',
  };

  const selector = sidebarSelectors[stepId];
  if (selector) {
    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }

  // Fallback positions
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  const fallbacks: Record<string, { x: number; y: number }> = {
    receive: { x: w / 2, y: h / 2 },
    analyze: { x: 120, y: 140 },
    collect: { x: 120, y: 228 },
    route: { x: 120, y: 184 },
    generate: { x: w * 0.55, y: h * 0.4 },
    intervention: { x: w / 2, y: h / 2 },
    publish: { x: 120, y: 316 },
    track: { x: 120, y: 404 },
    complete: { x: w - 40, y: h - 40 },
  };
  return fallbacks[stepId] ?? { x: w / 2, y: h / 2 };
}

// =============================================================================
// Step → page route mapping (auto-navigate when cursor moves)
// =============================================================================

const STEP_ROUTES: Record<string, string> = {
  receive: '/',
  analyze: '/',
  collect: '/context-vault',
  route: '/team-studio',
  generate: '/creatorflow',
  intervention: '/creatorflow',
  coze_tts: '/creatorflow',
  publish: '/publishing',
  track: '/analytics',
  complete: '/',
  // Team workflow steps
  launch_team: '/team-studio',
  sync_task: '/team-studio',
  team_working: '/team-studio',
  review: '/team-studio',
};

// =============================================================================
// Status color helpers
// =============================================================================

function getStatusColor(status: StepStatus): string {
  switch (status) {
    case 'completed': return '#22c55e';
    case 'running': return '#a78bfa';
    case 'waiting_intervention': return '#fbbf24';
    case 'failed': return '#f87171';
    default: return 'rgba(255,255,255,0.1)';
  }
}

const ctColor: Record<ContentType, string> = {
  video: '#f472b6',
  article: '#22d3ee',
  podcast: '#fbbf24',
  social: '#a78bfa',
  team: '#22c55e',
};

// =============================================================================
// Component
// =============================================================================
// Sound effects (Web Audio API — no external files needed)
// =============================================================================

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
}

type SfxType = 'step' | 'start' | 'complete' | 'intervention' | 'error';

function playSfx(type: SfxType) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.15, now);

    switch (type) {
      case 'start': // 上升双音 — 工作流启动
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.stop(now + 0.25);
        break;

      case 'step': // 轻快短音 — 步骤切换
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.stop(now + 0.12);
        break;

      case 'intervention': // 两声提示音 — 等待确认
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.setValueAtTime(0.001, now + 0.12);
        gain.gain.setValueAtTime(0.15, now + 0.2);
        osc.frequency.setValueAtTime(784, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.stop(now + 0.35);
        break;

      case 'complete': // 上升三音和弦 — 完成
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);        // C5
        osc.frequency.setValueAtTime(659, now + 0.12); // E5
        osc.frequency.setValueAtTime(784, now + 0.24); // G5
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.stop(now + 0.5);
        break;

      case 'error': // 下降音 — 失败
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.08, now);
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.stop(now + 0.3);
        break;
    }

    osc.start(now);
  } catch {
    // Audio not available — silent fallback
  }
}

// =============================================================================

export function OpenClawAgent() {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [showCursor, setShowCursor] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [displayedThink, setDisplayedThink] = useState('');
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [pulseCount, setPulseCount] = useState(0);
  const [timelineHover, setTimelineHover] = useState(-1);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [historyRuns, setHistoryRuns] = useState<WorkflowRun[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleId = useRef(0);
  const prevStepIdx = useRef(-1);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Fire ripple at cursor position -----------------------------------------
  const fireRipple = useCallback((x: number, y: number) => {
    rippleId.current++;
    setRipple({ x, y, id: rippleId.current });
    setTimeout(() => setRipple(null), 600);
  }, []);

  // -- Typewriter for think text ----------------------------------------------
  const typewrite = useCallback((text: string) => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    setDisplayedThink('');
    let i = 0;
    typewriterRef.current = setInterval(() => {
      i++;
      setDisplayedThink(text.slice(0, i));
      if (i >= text.length && typewriterRef.current) clearInterval(typewriterRef.current);
    }, 25);
  }, []);

  // -- Replay completed steps quickly when catching up to an in-progress run --
  const replayingRef = useRef(false);

  const replayCompletedSteps = useCallback(async (workflowRun: WorkflowRun) => {
    if (replayingRef.current) return;
    replayingRef.current = true;

    const thinkTexts: Record<string, string> = {
      receive: '📨 收到指令，开始解析...',
      analyze: workflowRun.content_type === 'team' ? '🧠 识别为多 Agent 协作任务' : `🔍 分析内容类型: ${workflowRun.content_type}`,
      collect: '🌐 通过 CreatorFlow 万能爬取引擎抓取内容...',
      route: `🔀 路由到: ${workflowRun.command}`,
      generate: '✍️ 调用 CreatorFlow AI 生成内容...',
      coze_tts: '🎙️ 扣子空间 TTS 生成音频...',
      intervention: '⏸️ 等待确认 — 请在飞书中确认继续',
      publish: '📤 推送到发布平台...',
      track: '📊 创建数据追踪任务...',
      complete: '✅ 全部完成！',
      // Team workflow
      launch_team: '🚀 启动 Agent 团队 — CEO + XHS + Growth + Reviewer',
      sync_task: '💬 同步任务到 Team Studio 聊天...',
      team_working: '👥 Agent 团队协作中 — 切换到 Monitor 观察...',
      review: '📋 汇总各 Agent 产出，审核结果...',
    };

    setShowCursor(true);
    setShowOverlay(true);

    // Replay each completed step with a short delay (800ms per step)
    for (let i = 0; i <= workflowRun.current_step_index; i++) {
      const step = workflowRun.steps[i];
      if (!step) continue;

      // Navigate to the step's page
      const targetRoute = STEP_ROUTES[step.id];
      if (targetRoute && window.location.pathname !== targetRoute) {
        router.push(targetRoute);
      }

      // Move cursor
      await new Promise<void>(resolve => {
        setTimeout(() => {
          const pos = getStepTargetPos(step.id, workflowRun.content_type);
          setCursorPos(pos);
          setTimeout(() => fireRipple(pos.x, pos.y), 400);
          resolve();
        }, 200);
      });

      // Update think text
      typewrite(thinkTexts[step.id] ?? step.label);
      prevStepIdx.current = i;

      // Wait before next step (shorter for replay)
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    replayingRef.current = false;
  }, [fireRipple, typewrite, router]);

  // -- Poll workflow status ---------------------------------------------------
  const lastSeenRunId = useRef<string | null>(null);

  useEffect(() => {
    // Poll every 1.5s
    pollRef.current = setInterval(async () => {
      if (replayingRef.current) return; // Don't update during replay

      try {
        // Always check for the latest active run (not just the tracked one)
        const latestRes = await fetch('/api/openclaw/workflow-status');
        if (!latestRes.ok) return;
        const latestData = (await latestRes.json()) as { run: WorkflowRun | null };

        // Determine which run to display
        let data: { run: WorkflowRun | null } = latestData;

        // If we're tracking a specific run AND the latest is different, check if latest is newer
        if (activeRunId && latestData.run && latestData.run.id !== activeRunId) {
          const isLatestActive = latestData.run.status !== 'completed' && latestData.run.status !== 'failed';
          if (isLatestActive) {
            // A newer active run exists — switch to it
            data = latestData;
          } else {
            // Latest is terminal, check our tracked run
            const trackedRes = await fetch(`/api/openclaw/workflow-status?run_id=${activeRunId}`);
            if (trackedRes.ok) {
              data = (await trackedRes.json()) as { run: WorkflowRun | null };
            }
          }
        } else if (activeRunId && latestData.run?.id === activeRunId) {
          // Same run, use it directly
          data = latestData;
        }

        if (!data.run) return;

        // New workflow detected — auto-open panel and start tracking
        const isNew = data.run.id !== lastSeenRunId.current && data.run.id !== activeRunId;
        const isActive = data.run.status !== 'completed' && data.run.status !== 'failed';

        if (isNew && isActive) {
          lastSeenRunId.current = data.run.id;
          setActiveRunId(data.run.id);
          setPanelOpen(true);
          setPulseCount(p => p + 1);
          prevStepIdx.current = -1;
          setRun(data.run);
          playSfx('start');

          // If the run has already progressed past the first step, replay
          if (data.run.current_step_index > 0) {
            void replayCompletedSteps(data.run);
            return;
          }
        }

        // Only update state for tracked run
        if (data.run.id !== activeRunId && activeRunId) return;

        setRun(data.run);

        // Update cursor position based on current step
        const currentStep = data.run.steps[data.run.current_step_index];
        if (currentStep && data.run.status === 'running') {
          setShowCursor(true);
          setShowOverlay(true);

          // Move cursor and typewrite when step changes
          if (data.run.current_step_index !== prevStepIdx.current) {
            prevStepIdx.current = data.run.current_step_index;
            playSfx('step');

            // Auto-navigate to the page corresponding to this step
            const targetRoute = STEP_ROUTES[currentStep.id];
            if (targetRoute && window.location.pathname !== targetRoute) {
              router.push(targetRoute);
            }

            // Team workflow: dispatch custom events for Team Studio page interactions
            if (data.run.content_type === 'team') {
              setTimeout(() => {
                if (currentStep.id === 'launch_team') {
                  window.dispatchEvent(new CustomEvent('openclaw:team-action', { detail: { action: 'launch' } }));
                } else if (currentStep.id === 'sync_task') {
                  window.dispatchEvent(new CustomEvent('openclaw:team-action', {
                    detail: { action: 'sync_task', message: data.run!.original_message },
                  }));
                } else if (currentStep.id === 'team_working') {
                  window.dispatchEvent(new CustomEvent('openclaw:team-action', { detail: { action: 'monitor' } }));
                }
              }, 800);
            }

            // Wait a tick for page to render, then get position
            setTimeout(() => {
              const pos = getStepTargetPos(currentStep.id, data.run!.content_type);
              setCursorPos(pos);
              setTimeout(() => fireRipple(pos.x, pos.y), 700);
            }, 300);

            // Generate think text based on step
            const thinkTexts: Record<string, string> = {
              receive: '📨 收到指令，开始解析...',
              analyze: data.run.content_type === 'team' ? '🧠 识别为多 Agent 协作任务' : `🔍 分析内容类型: ${data.run.content_type}`,
              collect: '🌐 通过 CreatorFlow 万能爬取引擎抓取内容...',
              route: `🔀 路由到: ${data.run.command}`,
              generate: '✍️ 调用 CreatorFlow AI 生成内容...',
              coze_tts: '🎙️ 扣子空间 TTS 生成音频...',
              intervention: '⏸️ 等待确认 — 请在飞书中确认继续',
              publish: '📤 推送到发布平台...',
              track: '📊 创建数据追踪任务...',
              complete: '✅ 全部完成！',
              // Team workflow
              launch_team: '🚀 启动 Agent 团队 — CEO + XHS + Growth + Reviewer',
              sync_task: '💬 同步任务到 Team Studio 聊天...',
              team_working: '👥 Agent 团队协作中 — 切换到 Monitor 观察...',
              review: '📋 汇总各 Agent 产出，审核结果...',
            };
            typewrite(thinkTexts[currentStep.id] ?? currentStep.label);
          }
        } else if (data.run.status === 'paused_for_intervention') {
          setShowCursor(true);
          setShowOverlay(true);
          if (prevStepIdx.current !== data.run.current_step_index) {
            prevStepIdx.current = data.run.current_step_index;
            playSfx('intervention');
            const pos = getStepTargetPos('intervention', data.run.content_type);
            setCursorPos(pos);
            typewrite('⏸️ 等待飞书确认...');
          }
        } else if (data.run.status === 'completed') {
          setShowCursor(false);
          setShowOverlay(false);
          setDisplayedThink('');
          prevStepIdx.current = -1;
          setShowCompleteModal(true);
          playSfx('complete');
          // Refresh history in next tick
          setTimeout(() => { fetch('/api/openclaw/workflow-status?list').then(r => r.json()).then(d => setHistoryRuns(d.runs ?? [])).catch(() => {}); }, 500);
          // Stop polling — workflow is done
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        } else if (data.run.status === 'failed') {
          setShowCursor(false);
          setShowOverlay(false);
          setDisplayedThink('');
          prevStepIdx.current = -1;
          playSfx('error');
          setTimeout(() => { fetch('/api/openclaw/workflow-status?list').then(r => r.json()).then(d => setHistoryRuns(d.runs ?? [])).catch(() => {}); }, 500);
        }
      } catch {
        /* silent */
      }
    }, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeRunId, fireRipple, typewrite, replayCompletedSteps]);

  // -- Cleanup ----------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  // -- Fetch history runs when panel opens ------------------------------------
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/workflow-status?list');
      if (res.ok) {
        const data = await res.json() as { runs: WorkflowRun[] };
        setHistoryRuns(data.runs ?? []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (panelOpen) fetchHistory();
  }, [panelOpen, fetchHistory]);

  // -- Create and start workflow ----------------------------------------------
  const startWorkflow = useCallback(async (message: string, source: 'manual' | 'feishu' = 'manual') => {
    try {
      // 1. Create workflow run
      const createRes = await fetch('/api/openclaw/workflow-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          source,
          feishu_chat_id: 'oc_34b771771cb6dac5b305cf8ee4fe11ca',
        }),
      });
      const createData = (await createRes.json()) as { run: WorkflowRun };
      if (!createData.run) return;

      setActiveRunId(createData.run.id);
      setRun(createData.run);
      setPanelOpen(true);
      prevStepIdx.current = -1;

      // 2. Fire execution (fire and forget)
      void fetch('/api/openclaw/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: createData.run.id }),
      });
    } catch (err) {
      console.error('Failed to start workflow:', err);
    }
  }, []);

  // -- Handle local approve (for when user is at the computer) ----------------
  const handleLocalApprove = useCallback(async () => {
    if (!run) return;
    try {
      await fetch('/api/openclaw/intervention-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            value: { run_id: run.id, decision: 'approve' },
            tag: 'button',
          },
        }),
      });
    } catch (err) {
      console.error('Local approve failed:', err);
    }
  }, [run]);

  // -- Handle input submit ----------------------------------------------------
  const handleSubmit = () => {
    if (!inputValue.trim() || (run && run.status === 'running')) return;
    startWorkflow(inputValue);
    setInputValue('');
  };

  // -- Reset workflow ---------------------------------------------------------
  const resetWorkflow = () => {
    setActiveRunId(null);
    setRun(null);
    prevStepIdx.current = -1;
    setShowCursor(false);
    setShowOverlay(false);
    setDisplayedThink('');
  };

  // -- Stop workflow ----------------------------------------------------------
  const handleStopWorkflow = useCallback(async () => {
    if (!run) return;
    try {
      await fetch(`/api/openclaw/workflow-status?run_id=${run.id}`, { method: 'DELETE' });
      // Stop polling
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setShowCursor(false);
      setShowOverlay(false);
      // Refetch to get updated state
      const res = await fetch(`/api/openclaw/workflow-status?run_id=${run.id}`);
      const data = await res.json();
      if (data.run) setRun(data.run);
    } catch (err) {
      console.error('Stop workflow failed:', err);
    }
  }, [run]);

  // -- Derived state ----------------------------------------------------------
  const isRunning = run?.status === 'running';
  const isIntervention = run?.status === 'paused_for_intervention';
  const isComplete = run?.status === 'completed';
  const isFailed = run?.status === 'failed';
  const steps = run?.steps ?? [];
  const currentIdx = run?.current_step_index ?? -1;
  const contentType = run?.content_type ?? 'social';
  const toolLink = getToolLink(contentType);
  const waitingStep = steps.find(s => s.status === 'waiting_intervention');
  const isCozeWaiting = isIntervention && waitingStep?.id === 'coze_tts';
  const isScriptConfirm = isIntervention && !isCozeWaiting;

  return (
    <>
      {/* ================================================================== */}
      {/* LAYER 1 — Screen overlay (dimming + spotlight) */}
      {/* ================================================================== */}
      {showOverlay && (
        <div
          className="fixed inset-0 z-[60] transition-opacity duration-500"
          style={{
            background: `radial-gradient(300px circle at ${cursorPos.x}px ${cursorPos.y}px, transparent 0%, rgba(0,0,0,0.45) 100%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Exit workflow view button */}
      {(showCursor || showOverlay) && (
        <button
          onClick={() => {
            setShowCursor(false);
            setShowOverlay(false);
            setDisplayedThink('');
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[75] flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(10,10,15,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <X className="h-3 w-3" />
          退出工作流视角
        </button>
      )}

      {/* ================================================================== */}
      {/* LAYER 2 — Agent cursor (🦞) */}
      {/* ================================================================== */}
      {showCursor && (
        <>
          {/* Glow trail */}
          <div
            className="fixed z-[70] pointer-events-none transition-all duration-[800ms] ease-in-out"
            style={{
              left: cursorPos.x - 30, top: cursorPos.y - 30,
              width: 60, height: 60, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(167,139,250,0.25), transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
          {/* Cursor body */}
          <div
            className="fixed z-[71] pointer-events-none transition-all duration-[800ms] ease-in-out"
            style={{ left: cursorPos.x - 18, top: cursorPos.y - 18 }}
          >
            <div
              className="flex items-center justify-center rounded-full shadow-xl"
              style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
                boxShadow: '0 0 20px rgba(167,139,250,0.5), 0 0 40px rgba(34,211,238,0.3)',
              }}
            >
              <span className="text-lg select-none" style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }}>🦞</span>
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{
                background: isIntervention ? '#fbbf24' : '#22c55e',
                borderColor: '#0a0a0f',
              }}
            />
          </div>

          {/* LAYER 3 — Think bubble */}
          {displayedThink && (
            <div
              className="fixed z-[72] pointer-events-none transition-all duration-[800ms] ease-in-out"
              style={{
                left: Math.min(cursorPos.x + 28, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 320),
                top: Math.max(cursorPos.y - 50, 10),
              }}
            >
              <div
                className="relative rounded-xl px-3.5 py-2 max-w-[280px]"
                style={{
                  background: 'rgba(10,10,15,0.95)',
                  border: '1px solid rgba(167,139,250,0.3)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 15px rgba(167,139,250,0.1)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  className="absolute -left-1.5 top-4 h-3 w-3 rotate-45"
                  style={{ background: 'rgba(10,10,15,0.95)', borderLeft: '1px solid rgba(167,139,250,0.3)', borderBottom: '1px solid rgba(167,139,250,0.3)' }}
                />
                <p className="text-[12px] leading-relaxed text-white/80 font-mono">{displayedThink}<span className="animate-pulse">|</span></p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* LAYER 4 — Click ripple */}
      {/* ================================================================== */}
      {ripple && (
        <div
          key={ripple.id}
          className="fixed z-[69] pointer-events-none"
          style={{ left: ripple.x - 30, top: ripple.y - 30 }}
        >
          <div
            className="h-[60px] w-[60px] rounded-full animate-ping"
            style={{ background: 'rgba(167,139,250,0.3)', animationDuration: '0.6s', animationIterationCount: 1 }}
          />
        </div>
      )}

      {/* ================================================================== */}
      {/* LAYER 5 — Intervention modal */}
      {/* ================================================================== */}
      {/* Script confirmation modal */}
      {isScriptConfirm && run && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-auto">
          <div
            className="rounded-2xl p-6 max-w-md w-full mx-4"
            style={{
              background: 'rgba(10,10,15,0.97)',
              border: '1px solid rgba(251,191,36,0.3)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(251,191,36,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
                >
                  <span className="text-xl">🦞</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">等待确认</h3>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    飞书端已发送确认卡片，或在此直接确认
                  </p>
                </div>
              </div>
              <button
                onClick={handleStopWorkflow}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                title="停止工作流并关闭"
              >
                <X className="h-4 w-4 text-white/40 hover:text-white/70" />
              </button>
            </div>

            <div
              className="rounded-xl px-4 py-3 mb-4"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}
            >
              <p className="text-[13px] text-white/80">
                {run.generated_content
                  ? `脚本已生成（${run.generated_content.length} 字），请确认是否继续发布`
                  : '内容已准备就绪，请确认是否继续'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push(toolLink.url)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all hover:brightness-110"
                style={{
                  background: `${ctColor[contentType]}15`,
                  color: ctColor[contentType],
                  border: `1px solid ${ctColor[contentType]}30`,
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {toolLink.label}
              </button>
              <button
                onClick={handleLocalApprove}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all hover:brightness-110"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                确认继续
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coze TTS waiting modal */}
      {isCozeWaiting && run && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-auto">
          <div
            className="rounded-2xl p-6 max-w-md w-full mx-4"
            style={{
              background: 'rgba(10,10,15,0.97)',
              border: '1px solid rgba(167,139,250,0.3)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(167,139,250,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}
                >
                  <span className="text-xl">🎙️</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">扣子空间 TTS</h3>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    OpenClaw 正在操作扣子空间生成双人播客音频
                  </p>
                </div>
              </div>
              <button
                onClick={handleStopWorkflow}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                title="停止工作流并关闭"
              >
                <X className="h-4 w-4 text-white/40 hover:text-white/70" />
              </button>
            </div>

            <div
              className="rounded-xl px-4 py-3 mb-4"
              style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#a78bfa' }} />
                <p className="text-[13px] text-white/80">
                  等待音频生成中...
                </p>
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                OpenClaw 正在扣子空间输入脚本并生成音频，完成后会自动下载并同步到播客工作台
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push('/creatorflow')}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all hover:brightness-110"
                style={{
                  background: 'rgba(167,139,250,0.15)',
                  color: '#a78bfa',
                  border: '1px solid rgba(167,139,250,0.3)',
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                查看播客工作台
              </button>
              <button
                onClick={handleStopWorkflow}
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all hover:brightness-110"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(248,113,113,0.25)',
                }}
              >
                <Square className="h-3 w-3" fill="currentColor" />
                停止
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Completion record modal */}
      {/* ================================================================== */}
      {showCompleteModal && run && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCompleteModal(false); resetWorkflow(); }} />
          <div
            className="relative rounded-2xl p-6 max-w-lg w-full mx-4"
            style={{
              background: 'rgba(10,10,15,0.97)',
              border: '1px solid rgba(34,197,94,0.3)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(34,197,94,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <span className="text-xl">🦞</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">任务完成</h3>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    工作流已全部执行完毕
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowCompleteModal(false); resetWorkflow(); }}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            </div>

            {/* Work record */}
            <div
              className="rounded-xl px-4 py-3 mb-4 space-y-2.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Task info */}
              <div className="flex items-start gap-2">
                <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#22d3ee' }} />
                <div>
                  <p className="text-[10px] text-white/40">原始指令</p>
                  <p className="text-[12px] text-white/80 mt-0.5">{run.original_message}</p>
                </div>
              </div>

              {/* Content type */}
              <div className="flex items-start gap-2">
                <Route className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
                <div>
                  <p className="text-[10px] text-white/40">内容类型</p>
                  <p className="text-[12px] text-white/80 mt-0.5">
                    {{ podcast: '双人播客', video: '视频脚本', article: '文章', social: '社媒内容', team: '多Agent协作' }[run.content_type]}
                  </p>
                </div>
              </div>

              {/* Steps summary */}
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                <div>
                  <p className="text-[10px] text-white/40">执行步骤</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {run.steps.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px]"
                        style={{
                          background: s.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(248,113,113,0.1)',
                          color: s.status === 'completed' ? '#22c55e' : '#f87171',
                        }}
                      >
                        {s.status === 'completed' ? '✓' : '✗'} {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sync status */}
              {(() => {
                const rd = run.result_data as Record<string, unknown> | null;
                const synced = rd?.creatorflow_synced;
                const feishuSent = rd?.feishu_audio_sent;
                const title = rd?.podcast_title as string | undefined;
                return (
                  <>
                    {title && (
                      <div className="flex items-start gap-2">
                        <Headphones className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#fbbf24' }} />
                        <div>
                          <p className="text-[10px] text-white/40">播客标题</p>
                          <p className="text-[12px] text-white/80 mt-0.5">{title}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Send className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#60a5fa' }} />
                      <div>
                        <p className="text-[10px] text-white/40">同步状态</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px]" style={{ color: synced ? '#22c55e' : '#f87171' }}>
                            {synced ? '✓' : '✗'} CreatorFlow
                          </span>
                          <span className="text-[10px]" style={{ color: feishuSent ? '#22c55e' : '#f87171' }}>
                            {feishuSent ? '✓' : '✗'} 飞书
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Time */}
              <div className="flex items-start gap-2">
                <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: '#9898a0' }} />
                <div>
                  <p className="text-[10px] text-white/40">完成时间</p>
                  <p className="text-[12px] text-white/80 mt-0.5">
                    {new Date(run.updated_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {run.content_type === 'podcast' && (
                <button
                  onClick={() => { setShowCompleteModal(false); resetWorkflow(); router.push('/creatorflow'); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all hover:brightness-110"
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <Headphones className="h-3.5 w-3.5" />
                  前往播客工作台
                </button>
              )}
              {run.content_type === 'team' && (
                <button
                  onClick={() => { setShowCompleteModal(false); resetWorkflow(); router.push('/team-studio'); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all hover:brightness-110"
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  前往 Team Studio
                </button>
              )}
              <button
                onClick={() => { setShowCompleteModal(false); resetWorkflow(); }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all hover:brightness-110"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LAYER 6 — Right workspace panel */}
      {/* ================================================================== */}
      {panelOpen && (
        <div
          className="fixed top-0 right-0 z-[55] h-full flex flex-col transition-all duration-300"
          style={{
            width: 340,
            background: 'rgba(10,10,15,0.97)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🦞</span>
              <span className="text-[13px] font-semibold text-white">Agent Workspace</span>
              {isRunning && (
                <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                >
                  <Loader2 className="h-2 w-2 animate-spin" /> LIVE
                </span>
              )}
              {isIntervention && (
                <span className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                >
                  WAITING
                </span>
              )}
              {isComplete && (
                <span className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                >
                  DONE
                </span>
              )}
              {isFailed && (
                <span className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}
                >
                  FAILED
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(isRunning || isIntervention) && (
                <button
                  onClick={handleStopWorkflow}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors hover:bg-red-500/20"
                  style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                  title="停止工作流"
                >
                  <Square className="h-2.5 w-2.5" fill="currentColor" />
                  停止
                </button>
              )}
              <button onClick={() => setPanelOpen(false)} className="rounded-lg p-1 hover:bg-white/5">
                <X className="h-3.5 w-3.5 text-white/40" />
              </button>
            </div>
          </div>

          {/* Source info */}
          {run && (
            <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{
                  background: run.source === 'feishu' ? 'rgba(34,211,238,0.06)' : 'rgba(167,139,250,0.06)',
                  border: `1px solid ${run.source === 'feishu' ? 'rgba(34,211,238,0.12)' : 'rgba(167,139,250,0.12)'}`,
                }}
              >
                <MessageSquare className="h-3 w-3 flex-shrink-0" style={{ color: run.source === 'feishu' ? '#22d3ee' : '#a78bfa' }} />
                <span className="text-[10px]" style={{ color: run.source === 'feishu' ? '#22d3ee' : '#a78bfa' }}>
                  {run.source === 'feishu' ? '飞书' : '手动'}
                </span>
                <span className="text-[10px] text-white/60 truncate flex-1">{run.original_message}</span>
              </div>
            </div>
          )}

          {/* Steps timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="text-3xl mb-2">🦞</span>
                <p className="text-[12px] text-white/60 font-medium">OpenClaw 待命中</p>
                <p className="text-[10px] text-white/25 mt-1 max-w-[200px]">
                  输入指令或从飞书发送消息，龙虾会自动调用 CreatorFlow 工具执行
                </p>
              </div>
            ) : (
              steps.map((step: WorkflowStepRecord, i: number) => {
                const StepIcon = getStepIcon(step.id);
                const isCurrent = i === currentIdx;

                return (
                  <div
                    key={step.id}
                    className="flex gap-2.5 group"
                    onMouseEnter={() => setTimelineHover(i)}
                    onMouseLeave={() => setTimelineHover(-1)}
                  >
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full transition-all flex-shrink-0"
                        style={{
                          background: getStatusColor(step.status),
                          boxShadow: isCurrent ? `0 0 8px ${getStatusColor(step.status)}80` : 'none',
                        }}
                      />
                      {i < steps.length - 1 && (
                        <div className="w-px flex-1 min-h-[12px]"
                          style={{ background: step.status === 'completed' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)' }}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pb-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StepIcon className="h-3 w-3 flex-shrink-0" style={{ color: getStatusColor(step.status) }} />
                        <span className={`text-[11px] font-medium truncate ${
                          step.status === 'pending' ? 'text-white/20' : 'text-white'
                        }`}>
                          {step.label}
                        </span>
                        {step.status === 'running' && <Loader2 className="h-2.5 w-2.5 animate-spin text-purple-400 flex-shrink-0" />}
                      </div>
                      {/* Show result summary or step info */}
                      {(step.result_summary || step.status === 'running' || step.status === 'waiting_intervention' || timelineHover === i) && (
                        <p className="text-[10px] mt-0.5 leading-relaxed font-mono"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          {step.result_summary ?? (step.status === 'running' ? '执行中...' : step.status === 'waiting_intervention' ? '等待飞书确认...' : step.label)}
                        </p>
                      )}
                      {step.error && (
                        <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#f87171' }}>
                          {step.error}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Audio sync complete banner */}
            {run && steps.find(s => s.id === 'coze_tts' && s.status === 'completed') && (
              <div
                className="mt-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                  <span className="text-[12px] font-medium" style={{ color: '#22c55e' }}>
                    音频已同步到播客工作台
                  </span>
                </div>
                <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  双人播客音频已生成并保存到历史记录，可在播客工作台中在线播放
                </p>
                <button
                  onClick={() => router.push('/creatorflow')}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all hover:brightness-110"
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  <Headphones className="h-3 w-3" />
                  前往播客工作台收听
                </button>
              </div>
            )}

            {/* Generated content preview */}
            {run?.generated_content && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-medium text-white/40 mb-2 uppercase tracking-wider">生成内容预览</p>
                <div className="rounded-xl px-3 py-2.5 text-[10px] leading-relaxed font-mono max-h-[200px] overflow-y-auto"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {run.generated_content.split('\n').map((line: string, i: number) => (
                    <p key={i} className={line.startsWith('#') || line.startsWith('【') ? 'text-white/70 font-semibold' : ''}>
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Completion */}
            {isComplete && (
              <div className="rounded-xl px-3 py-2.5 mt-2"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}
              >
                <p className="text-[11px] font-medium" style={{ color: '#22c55e' }}>
                  ✅ 工作流完成 — 结果已推送飞书
                </p>
                <button
                  onClick={resetWorkflow}
                  className="mt-2 text-[10px] text-white/30 hover:text-white/60 underline"
                >
                  开始新任务
                </button>
              </div>
            )}

            {isFailed && (
              <div className="rounded-xl px-3 py-2.5 mt-2"
                style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)' }}
              >
                <p className="text-[11px] font-medium" style={{ color: '#f87171' }}>
                  ❌ 工作流失败
                </p>
                <button
                  onClick={resetWorkflow}
                  className="mt-2 text-[10px] text-white/30 hover:text-white/60 underline"
                >
                  重试
                </button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {steps.length > 0 && (
            <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1">
                {steps.map((step: WorkflowStepRecord) => (
                  <div
                    key={step.id}
                    className="flex-1 h-1.5 rounded-full transition-all"
                    title={step.label}
                    style={{
                      background: getStatusColor(step.status),
                      boxShadow: step.status === 'running' ? '0 0 6px rgba(167,139,250,0.4)' : 'none',
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-white/20">{run?.content_type}</span>
                <span className="text-[9px] text-white/20">
                  {steps.filter(s => s.status === 'completed').length}/{steps.length}
                </span>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="输入指令..."
                disabled={isRunning || isIntervention}
                className="flex-1 rounded-xl px-3 py-2 text-[11px] text-white placeholder-white/20 outline-none disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                onClick={handleSubmit}
                disabled={isRunning || isIntervention || !inputValue.trim()}
                className="rounded-xl px-3 py-2 transition-all disabled:opacity-30"
                style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}
              >
                <Send className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
              </button>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {['帮我做一条AI工具短视频', '写一篇Agent博客', '做一期AI播客', '团队协作写推文'].map((h) => (
                <button
                  key={h}
                  onClick={() => { if (!isRunning && !isIntervention) startWorkflow(h); }}
                  disabled={isRunning || isIntervention}
                  className="rounded-lg px-2 py-1 text-[9px] transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* History cards */}
          {historyRuns.length > 0 && (
            <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-[9px] text-white/25 uppercase tracking-wider py-2 px-1">历史工作流</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {historyRuns.map((hr) => {
                  const completed = hr.steps.filter(s => s.status === 'completed').length;
                  const total = hr.steps.length;
                  const rd = hr.result_data as Record<string, unknown> | null;
                  const title = rd?.podcast_title as string | undefined;
                  const statusColor = hr.status === 'completed' ? '#22c55e' : '#f87171';
                  const statusBg = hr.status === 'completed' ? 'rgba(34,197,94,0.06)' : 'rgba(248,113,113,0.06)';
                  const statusBorder = hr.status === 'completed' ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)';
                  const typeLabel: Record<string, string> = { podcast: '播客', video: '视频', article: '文章', social: '社媒' };

                  return (
                    <div
                      key={hr.id}
                      className="rounded-lg px-2.5 py-2 cursor-default transition-all hover:brightness-125"
                      style={{ background: statusBg, border: `1px solid ${statusBorder}` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10px]">{hr.status === 'completed' ? '✅' : '❌'}</span>
                          <span className="text-[10px] font-medium text-white/80 truncate">
                            {title || hr.original_message?.slice(0, 30) || '未命名任务'}
                          </span>
                        </div>
                        <span
                          className="text-[8px] rounded-full px-1.5 py-0.5 flex-shrink-0"
                          style={{ background: `${statusColor}15`, color: statusColor }}
                        >
                          {typeLabel[hr.content_type] || hr.content_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex gap-0.5">
                          {hr.steps.map((s) => (
                            <div
                              key={s.id}
                              className="h-1 w-3 rounded-full"
                              title={s.label}
                              style={{
                                background: s.status === 'completed' ? '#22c55e' : s.status === 'failed' ? '#f87171' : 'rgba(255,255,255,0.08)',
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[8px] text-white/20">
                          {completed}/{total} · {new Date(hr.updated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* Floating trigger */}
      {/* ================================================================== */}
      {!showCursor && (
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="fixed bottom-6 right-6 z-[56] flex items-center justify-center rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
            boxShadow: '0 0 30px rgba(167,139,250,0.3), 0 0 60px rgba(34,211,238,0.15)',
          }}
        >
          <span className="text-2xl">🦞</span>
          {pulseCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: '#ef4444' }}
            >
              {pulseCount}
            </span>
          )}
        </button>
      )}

      {/* Panel toggle edge */}
      {!panelOpen && run && (
        <button
          onClick={() => setPanelOpen(true)}
          className="fixed top-1/2 right-0 z-[55] -translate-y-1/2 rounded-l-lg px-1 py-3 transition-all hover:px-2"
          style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', borderRight: 'none' }}
        >
          <ChevronLeft className="h-4 w-4" style={{ color: '#a78bfa' }} />
        </button>
      )}
    </>
  );
}
