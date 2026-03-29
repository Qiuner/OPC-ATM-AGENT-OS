'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight, Download, Github, ChevronDown,
  Zap, LayoutDashboard, Send, BarChart3,
  CheckCircle, Database, MessageSquare,
} from 'lucide-react';
import { PixelAgentSVG, type MarketingAgentId } from './pixel-agents';

/* ============================================================
   PIXEL AVATAR WRAPPER — uses project's vinyl-toy SVG characters
   ============================================================ */
/* Agent name → SVG agent ID mapping */
const AGENT_SVG_ID: Record<string, MarketingAgentId> = {
  CEO: 'ceo', XHS: 'xhs-agent', Growth: 'growth-agent', Visual: 'visual-agent',
  Global: 'global-content-agent', 'Meta Ads': 'meta-ads-agent', Email: 'email-agent',
  SEO: 'seo-expert-agent', GEO: 'geo-expert-agent', X: 'x-twitter-agent',
  Strategist: 'strategist-agent', Podcast: 'podcast-agent', Analyst: 'analyst-agent',
  Brand: 'brand-reviewer',
};

/* ============================================================
   CSS
   ============================================================ */
const css = `
  @keyframes marquee-left { from{transform:translateX(0)}to{transform:translateX(-50%)} }
  @keyframes marquee-right { from{transform:translateX(-50%)}to{transform:translateX(0)} }
  @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)} }
  @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:.4} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  @keyframes fade-up { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }

  .marquee-row:hover .marquee-track { animation-play-state:paused }
  .marquee-mask {
    mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);
    -webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);
  }
  .gradient-text {
    background:linear-gradient(135deg,#00f0ff 0%,#a855f7 50%,#f59e0b 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  }

  /* Cotify-style glass card */
  .glass-card {
    background: rgba(255,255,255,0.02);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06);
    transition: all 0.3s ease;
  }
  .glass-card:hover {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.12);
    box-shadow: 0 0 60px -15px rgba(0,240,255,0.08);
  }

  /* Gradient border card */
  .gradient-border-card {
    position: relative;
    background: rgba(255,255,255,0.02);
    border-radius: 16px;
    overflow: hidden;
  }
  .gradient-border-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(0,240,255,0.15), rgba(168,85,247,0.08), rgba(245,158,11,0.05));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  .gradient-border-card:hover::before {
    background: linear-gradient(135deg, rgba(0,240,255,0.35), rgba(168,85,247,0.2), rgba(245,158,11,0.15));
  }

  /* Cotify sticky stack cards */
  .features-stack { position: relative; padding-bottom: 120px; }
  .stack-card {
    position: sticky; top: 100px;
    width: 100%; min-height: 420px;
    background: rgba(15,15,20,0.85);
    backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 40px;
    margin-bottom: 120px;
    display: grid; grid-template-columns: 1fr 1fr;
    align-items: center; gap: 56px; padding: 56px 64px;
    transition: box-shadow 0.3s, border-color 0.3s;
  }
  @media (max-width: 768px) {
    .stack-card { grid-template-columns: 1fr; padding: 32px; min-height: auto; margin-bottom: 60px; border-radius: 24px; }
  }
  /* Cotify-style: gradient bg + colored border + dual shadow */
  .stack-card.glow-cyan {
    border-color: rgba(0,240,255,0.35);
    background: linear-gradient(135deg, rgba(0,240,255,0.16) 0%, rgba(0,240,255,0.05) 40%, rgba(15,15,20,0.9) 80%);
    box-shadow: inset 0 1px 0 rgba(0,240,255,0.15), 0 0 80px rgba(0,240,255,0.06);
  }
  .stack-card.glow-violet {
    border-color: rgba(168,85,247,0.35);
    background: linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.05) 40%, rgba(15,15,20,0.9) 80%);
    box-shadow: inset 0 1px 0 rgba(168,85,247,0.15), 0 0 80px rgba(168,85,247,0.06);
  }
  .stack-card.glow-amber {
    border-color: rgba(245,158,11,0.35);
    background: linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0.05) 40%, rgba(15,15,20,0.9) 80%);
    box-shadow: inset 0 1px 0 rgba(245,158,11,0.15), 0 0 80px rgba(245,158,11,0.06);
  }
  .stack-card.glow-green {
    border-color: rgba(52,211,153,0.35);
    background: linear-gradient(135deg, rgba(52,211,153,0.16) 0%, rgba(52,211,153,0.05) 40%, rgba(15,15,20,0.9) 80%);
    box-shadow: inset 0 1px 0 rgba(52,211,153,0.15), 0 0 80px rgba(52,211,153,0.06);
  }
  .stack-card.glow-rose {
    border-color: rgba(244,63,94,0.35);
    background: linear-gradient(135deg, rgba(244,63,94,0.16) 0%, rgba(244,63,94,0.05) 40%, rgba(15,15,20,0.9) 80%);
    box-shadow: inset 0 1px 0 rgba(244,63,94,0.15), 0 0 80px rgba(244,63,94,0.06);
  }
  .stack-card.glow-blue {
    border-color: rgba(59,130,246,0.35);
    background: linear-gradient(135deg, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0.05) 40%, rgba(15,15,20,0.9) 80%);
    box-shadow: inset 0 1px 0 rgba(59,130,246,0.15), 0 0 80px rgba(59,130,246,0.06);
  }

  /* Glow dot */
  .glow-dot {
    width: 10px; height: 10px; border-radius: 50%;
    box-shadow: 0 0 12px 2px currentColor;
  }

  /* Section divider */
  .section-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(0,240,255,0.15), rgba(168,85,247,0.1), transparent);
  }
`;

/* ============================================================
   DATA
   ============================================================ */
const rotatingWords = [
  { zh: '写内容', en: 'Write Content' },
  { zh: '做策略', en: 'Plan Strategy' },
  { zh: '发平台', en: 'Auto Publish' },
  { zh: '追数据', en: 'Track Metrics' },
  { zh: '优化迭代', en: 'Learn & Improve' },
];

const screens = [
  { title: 'Team Studio', desc: '多 Agent 实时协作，CEO 自动分配任务给专业 Agent，像素风可视化监控', color: '#00f0ff', emoji: '🎯' },
  { title: 'Dashboard', desc: '营销全局数据一览，任务进度、内容状态、活跃活动实时追踪', color: '#a855f7', emoji: '📊' },
  { title: 'Publishing Hub', desc: '多平台一键发布，小红书/X/Meta/微信格式自适配，定时发布', color: '#f59e0b', emoji: '🚀' },
  { title: 'Analytics', desc: '数据驱动分析，Top 内容模式提取，Analyst Agent 自动生成洞察', color: '#34d399', emoji: '🧠' },
];

const useCases = [
  { title: '一人公司', subtitle: 'Solo Creator', desc: '一个人也能做出团队级营销，14 个 AI Agent 就是你的虚拟团队', color: '#00f0ff', num: '01' },
  { title: '初创团队', subtitle: 'Startup Team', desc: '用 AI Agent 替代 3-5 人营销团队，将预算花在刀刃上', color: '#a855f7', num: '02' },
  { title: '跨境出海', subtitle: 'Go Global', desc: '中英双语内容自动生成，Meta/X/TikTok/LinkedIn 全球覆盖', color: '#f59e0b', num: '03' },
  { title: '内容矩阵', subtitle: 'Content Matrix', desc: '小红书+抖音+微信+X 全渠道同步管理，一套内容多端分发', color: '#f43f5e', num: '04' },
];

const features = [
  { title: 'Multi-Agent 协作', desc: 'CEO 负责任务拆解和质量控制，13 个专业 Agent 分工执行。从选题到发布，全链路自动协调，无需人工分配。', color: '#00f0ff', glow: 'glow-cyan' },
  { title: 'Context Vault', desc: '一次配置品牌调性、目标受众、产品信息，所有 Agent 自动共享上下文。确保每一条内容都符合品牌一致性。', color: '#a855f7', glow: 'glow-violet' },
  { title: '全平台自动发布', desc: '小红书支持 QR 扫码登录 + Playwright 自动发布。X/Meta/微信通过 API 直连，定时发布覆盖全球时区。', color: '#f59e0b', glow: 'glow-amber' },
  { title: '审批工作流', desc: 'Brand Reviewer 自动初审：品牌合规检查、敏感词过滤、品调一致性评分。人工终审一键确认，效率提升 10 倍。', color: '#34d399', glow: 'glow-green' },
  { title: '数据飞轮', desc: 'Analyst Agent 每周自动分析 Top 20% 高互动内容，提取爆款模式并更新 SKILL.md，Agent 能力持续进化。', color: '#f43f5e', glow: 'glow-rose' },
  { title: 'MCP 工具生态', desc: '8+ MCP Server 提供小红书数据抓取、AI 图像生成、竞品分析、播客 TTS 等专业能力，按需扩展。', color: '#3b82f6', glow: 'glow-blue' },
];

const agents = [
  { name: 'CEO', role: '总指挥', desc: '任务拆解·质量控制·Agent 调度', color: '#e74c3c', tier: 'orchestrator' as const },
  { name: 'XHS', role: '小红书', desc: '选题·文案·自动发布', color: '#ff2442', tier: 'specialist' as const },
  { name: 'Growth', role: '增长', desc: '趋势捕捉·竞品分析', color: '#00cec9', tier: 'specialist' as const },
  { name: 'Visual', role: '视觉', desc: 'AI 图像·10种风格', color: '#e17055', tier: 'specialist' as const },
  { name: 'Global', role: '全球', desc: '英文内容·多平台', color: '#0984e3', tier: 'specialist' as const },
  { name: 'Meta Ads', role: '广告', desc: 'FB/IG·ROAS 优化', color: '#6c5ce7', tier: 'specialist' as const },
  { name: 'Email', role: '邮件', desc: '自动化·A/B 测试', color: '#fdcb6e', tier: 'specialist' as const },
  { name: 'SEO', role: '搜索', desc: '关键词·技术 SEO', color: '#00b894', tier: 'specialist' as const },
  { name: 'GEO', role: 'AI搜索', desc: 'ChatGPT 可见性', color: '#00f0ff', tier: 'specialist' as const },
  { name: 'X', role: '推特', desc: '病毒推文·双语', color: '#1da1f2', tier: 'specialist' as const },
  { name: 'Strategist', role: '策略', desc: '营销规划·日历', color: '#a29bfe', tier: 'specialist' as const },
  { name: 'Podcast', role: '播客', desc: '脚本·音频内容', color: '#fab1a0', tier: 'specialist' as const },
  { name: 'Analyst', role: '分析', desc: '数据·模式提取', color: '#55efc4', tier: 'specialist' as const },
  { name: 'Brand', role: '品牌审查', desc: '合规·风险评估', color: '#a855f7', tier: 'reviewer' as const },
];

const testimonialRows = [
  [
    { text: '一个人管理 5 个平台的内容，ATM OS 让我从每天 4 小时的手动发布中解放出来了。', handle: '@creator_lisa', role: '独立创作者' },
    { text: '小红书自动发布太惊艳了，QR 扫码登录后完全自动化，再也不用复制粘贴。', handle: '@media_ops', role: '自媒体运营' },
    { text: 'Context Vault 的概念很棒，配置一次品牌信息，所有 Agent 都能理解品牌调性。', handle: '@brand_chen', role: 'DTC 品牌主理人' },
    { text: '14 个 Agent 各司其职，比我用过的任何 AI 工具都更体系化、更专业。', handle: '@cmo_zhang', role: '营销总监' },
  ],
  [
    { text: '数据飞轮是杀手锏——Analyst Agent 自动学习爆款模式，内容质量周周在提升。', handle: '@content_biz', role: '内容创业者' },
    { text: '跨境出海用 Global Content Agent 生成英文内容，质量超预期，省了翻译成本。', handle: '@cross_border', role: '跨境电商' },
    { text: '审批流让 AI 和人的协作很顺畅，不是纯自动化，而是有温度的人机协同。', handle: '@brand_mgr', role: '品牌经理' },
    { text: 'CEO Agent 的任务拆解能力太强了，给个方向就能分解给各专业 Agent 执行。', handle: '@ai_dev_sun', role: 'AI 开发者' },
  ],
  [
    { text: 'MCP 工具生态扩展 Agent 能力，架构非常优雅，Claude Agent SDK 用得很好。', handle: '@fullstack_y', role: '全栈工程师' },
    { text: '黑客松项目能做到这种完成度：14 Agent + 多平台发布 + 数据闭环，impressive。', handle: '@judge_01', role: '黑客松评委' },
    { text: '终于有人把营销自动化做成了 OS 级别，不是单点工具，而是完整工作流。', handle: '@growth_lead', role: '增长负责人' },
    { text: 'Team Studio 的像素风 Agent Monitor 特别有趣，实时看 Agent 协作很有沉浸感。', handle: '@designer_q', role: 'UI 设计师' },
  ],
];

const techItems = [
  { name: 'Electron', desc: 'macOS 桌面端' },
  { name: 'React 19', desc: '前端框架' },
  { name: 'Next.js 16', desc: 'Web 应用' },
  { name: 'TypeScript', desc: '类型安全' },
  { name: 'Claude SDK', desc: 'AI Agent 引擎' },
  { name: 'Supabase', desc: 'PostgreSQL' },
  { name: 'Playwright', desc: '自动化发布' },
  { name: 'MCP', desc: '8+ 工具服务' },
  { name: 'Tailwind', desc: '原子化样式' },
  { name: 'node-cron', desc: '定时调度' },
];

/* ============================================================
   SECTION TITLE
   ============================================================ */
function SectionTitle({ title, subtitle, gradient }: { title: string; subtitle: string; gradient?: boolean }) {
  return (
    <div className="text-center mb-16">
      <h2 className={`text-3xl md:text-5xl font-extrabold ${gradient ? 'gradient-text' : 'text-white'}`} style={{ letterSpacing: '-0.04em' }}>{title}</h2>
      <p className="text-gray-500 mt-3 text-lg">{subtitle}</p>
    </div>
  );
}

/* ============================================================
   NAV
   ============================================================ */
function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/landing/logo.png" alt="ATM OS" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg text-white">ATM OS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#showcase" className="hover:text-white transition-colors">产品</a>
          <a href="#features" className="hover:text-white transition-colors">功能</a>
          <a href="#agents" className="hover:text-white transition-colors">Agent 团队</a>
          <a href="#workflow" className="hover:text-white transition-colors">工作流</a>
          <a href="#tech" className="hover:text-white transition-colors">技术栈</a>
        </div>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors">
          <Github className="w-4 h-4" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </nav>
  );
}

/* ============================================================
   S1: HERO — with AI-generated background
   ============================================================ */
function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setWordIndex(i => (i + 1) % rotatingWords.length), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px]" style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.07) 0%, rgba(168,85,247,0.04) 40%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card text-sm text-gray-300 mb-8" style={{ animation: 'fade-up 0.6s ease-out' }}>
          <span className="glow-dot" style={{ color: '#00f0ff' }} />
          Agent-to-Marketing &middot; 24/7 人机协同
        </div>

        {/* ATM hero: left text + right OS */}
        <div className="flex items-end gap-6 md:gap-10 text-left max-w-5xl mx-auto" style={{ animation: 'fade-up 0.8s ease-out' }}>
          {/* Left: Agent To Marketing */}
          <h1 className="font-extrabold leading-[0.92]" style={{ letterSpacing: '-0.05em', fontSize: 'clamp(44px, 7vw, 88px)' }}>
            <div><span className="gradient-text">A</span><span className="text-white">gent,</span></div>
            <div><span className="gradient-text">T</span><span className="text-white">o</span></div>
            <div><span className="gradient-text">M</span><span className="text-white">arketing</span></div>
          </h1>
          {/* Right: OS aligned to bottom */}
          <span className="gradient-text font-extrabold leading-none shrink-0" style={{ fontSize: 'clamp(60px, 9vw, 120px)', letterSpacing: '-0.06em' }}>OS</span>
        </div>

        {/* Subtitle */}
        <div className="mt-8 text-xl md:text-2xl lg:text-3xl font-semibold text-white/90 text-left max-w-5xl mx-auto" style={{ animation: 'fade-up 1s ease-out' }}>
          <span>1个平台让 AI营销团队 24/7 </span>
          <span className="inline-block h-[1.2em] overflow-hidden align-bottom relative" style={{ width: '4em', verticalAlign: 'bottom' }}>
            <span className="block transition-transform duration-700 ease-in-out absolute left-0 w-full" style={{ transform: `translateY(-${wordIndex * 1.2}em)` }}>
              {rotatingWords.map((w, i) => (
                <span key={i} className="block gradient-text font-bold" style={{ height: '1.2em', lineHeight: '1.2em' }}>{w.zh}</span>
              ))}
            </span>
          </span>
        </div>

        <p className="mt-6 text-base md:text-lg text-gray-400 max-w-5xl mx-auto leading-relaxed text-left" style={{ animation: 'fade-up 1.2s ease-out' }}>
          14 个专业 AI Agent &middot; 5+ 平台自动发布 &middot; 数据驱动持续优化
        </p>

        {/* CTAs — pill style */}
        <div className="mt-10 flex flex-col sm:flex-row items-start max-w-5xl mx-auto gap-4" style={{ animation: 'fade-up 1.4s ease-out' }}>
          <button className="group px-8 py-3.5 rounded-full bg-white text-black font-semibold text-base hover:scale-105 hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all flex items-center gap-2">
            <Download className="w-5 h-5" />
            下载 macOS 版
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-3.5 rounded-full glass-card text-white font-semibold text-base flex items-center gap-2">
            <Github className="w-5 h-5" />
            查看源码
          </button>
        </div>

        {/* App Mockup */}
        <div className="mt-16 max-w-4xl mx-auto" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <div className="gradient-border-card" style={{ boxShadow: '0 0 80px -20px rgba(0,240,255,0.12)' }}>
            {/* macOS title bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0c0c14]/80 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="text-xs text-gray-500 ml-2 font-mono">ATM OS — Team Studio</span>
            </div>
            <div className="flex h-[280px] md:h-[360px]">
              {/* Sidebar */}
              <div className="w-12 md:w-14 bg-[#08080e] border-r border-white/5 flex flex-col items-center py-4 gap-4">
                <div className="w-7 h-7 rounded-lg bg-cyan-400/10 flex items-center justify-center ring-1 ring-cyan-400/30"><Zap className="w-3.5 h-3.5 text-cyan-400" /></div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"><LayoutDashboard className="w-3.5 h-3.5 text-gray-600" /></div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"><Database className="w-3.5 h-3.5 text-gray-600" /></div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"><CheckCircle className="w-3.5 h-3.5 text-gray-600" /></div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"><Send className="w-3.5 h-3.5 text-gray-600" /></div>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"><BarChart3 className="w-3.5 h-3.5 text-gray-600" /></div>
              </div>
              {/* Agent panel */}
              <div className="w-44 md:w-52 bg-[#0a0a12] border-r border-white/5 p-3 hidden sm:block">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Agents Online</p>
                {[
                  { n: 'CEO Agent', c: '#e74c3c', s: 'busy' },
                  { n: 'XHS Agent', c: '#ff2442', s: 'online' },
                  { n: 'Growth Agent', c: '#00cec9', s: 'online' },
                  { n: 'Brand Reviewer', c: '#a855f7', s: 'idle' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-white/[0.03]">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: a.c }}>{a.n[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 truncate">{a.n}</p>
                      <p className="text-[10px] text-gray-600">{a.s}</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.s === 'busy' ? '#f59e0b' : a.s === 'online' ? '#34d399' : '#6b7280', animation: a.s === 'busy' ? 'pulse-dot 1.5s infinite' : 'none' }} />
                  </div>
                ))}
              </div>
              {/* Chat */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  {[
                    { c: '#e74c3c', n: 'C', t: '收到任务：「生成小红书 AI 教程系列内容」\n正在拆解为 3 个子任务分配给 XHS Agent...' },
                    { c: '#ff2442', n: 'X', t: '已完成竞品分析，发现 3 个高互动选题方向 ✅\n正在生成第 1 篇笔记草稿...' },
                    { c: '#00cec9', n: 'G', t: '趋势分析完成：#AI工具 热度 ↑42%，建议优先发布' },
                  ].map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5" style={{ background: m.c }}>{m.n}</div>
                      <div className="glass-card rounded-xl rounded-tl-none px-3 py-2 max-w-[80%]">
                        {m.t.split('\n').map((line, j) => <p key={j} className="text-xs text-white/70">{line}</p>)}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center text-[10px] text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ animation: 'pulse-dot 1s infinite' }} />
                    Brand Reviewer 正在审核内容合规性...
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 glass-card rounded-xl px-3 py-2.5">
                    <span className="text-xs text-gray-600 flex-1">输入指令或选择 Agent...</span>
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 flex items-center justify-center"><ArrowRight className="w-3 h-3 text-white" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 animate-bounce"><ChevronDown className="w-6 h-6 text-gray-600 mx-auto" /></div>
      </div>
    </section>
  );
}

/* ============================================================
   S2: BEFORE / AFTER — cotify exact structure
   grid: 0.8fr 1.2fr, min-height 600px, border-radius 48px, padding 48px
   ============================================================ */
function BeforeAfterSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionTitle title="重塑你的营销工作流" subtitle="从手动操作到 AI 自动化" />
        <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-8 mt-8">
          {/* Before — narrower */}
          <div className="flex flex-col rounded-[32px] md:rounded-[48px] p-8 md:p-12" style={{ background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.06)', minHeight: '520px' }}>
            <span className="inline-block self-start px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 mb-6">使用 ATM OS 前</span>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">手动操作，疲于奔命</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">在多平台营销中，你不得不手动写内容、逐个发布、凭感觉选题，在各平台间反复切换，效率低下。</p>
            {/* Terminal mockup */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#111115] p-5 mb-auto">
              <div className="space-y-4 font-mono text-xs">
                {[
                  { name: '小红书', color: '#ff2442', w: '75%' },
                  { name: '微信', color: '#f59e0b', w: '45%' },
                  { name: '抖音', color: '#3b82f6', w: '30%' },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-gray-500 w-12 shrink-0">{p.name}</span>
                    <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: p.w, background: `linear-gradient(90deg, ${p.color}, ${p.color}60)` }} />
                    </div>
                  </div>
                ))}
                <p className="text-gray-600 pt-1">$ 手动复制粘贴中...</p>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-white/5">
              <div>
                <p className="text-3xl font-bold text-red-400">~3h</p>
                <p className="text-xs text-gray-500 mt-1">每日手动耗时</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-400">&lt;5%</p>
                <p className="text-xs text-gray-500 mt-1">爆款命中率</p>
              </div>
            </div>
          </div>

          {/* After — wider, with gradient bg */}
          <div className="flex flex-col rounded-[32px] md:rounded-[48px] p-8 md:p-12" style={{ background: 'radial-gradient(ellipse at 70% 20%, rgba(0,240,255,0.06), rgba(168,85,247,0.04) 50%, #0c0c10 80%)', border: '1px solid rgba(0,240,255,0.1)', minHeight: '520px' }}>
            <span className="inline-block self-start px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-6">使用 ATM OS 后</span>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">AI 接管，你只需确认</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">ATM OS 成为你的营销代理。14 个 Agent 自动选题、生成、审批、发布，你只需专注产品和策略。</p>
            {/* Living orb */}
            <div className="flex-1 flex flex-col items-center justify-center mb-auto">
              <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, rgba(0,240,255,0.3), rgba(168,85,247,0.15) 60%, transparent)', boxShadow: '0 0 60px rgba(0,240,255,0.2)', animation: 'pulse-dot 3s ease-in-out infinite' }}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400/50 to-violet-400/40" />
              </div>
              <p className="text-cyan-400 text-sm font-medium mt-6">&ldquo;3 篇笔记已发布，等待数据回收&rdquo;</p>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-white/5">
              <div>
                <p className="text-3xl font-bold text-cyan-400">0</p>
                <p className="text-xs text-gray-500 mt-1">手动操作</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-cyan-400">24/7</p>
                <p className="text-xs text-gray-500 mt-1">自动运行</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-cyan-400">↑300%</p>
                <p className="text-xs text-gray-500 mt-1">内容产出</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   S3: PRODUCT SHOWCASE — glass cards
   ============================================================ */
function ProductShowcase() {
  return (
    <section id="showcase" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionTitle title="桌面端全功能体验" subtitle="macOS 原生应用，开箱即用" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {screens.map((s, i) => (
            <div key={i} className="gradient-border-card p-6 group hover:translate-y-[-2px] transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${s.color}10`, boxShadow: `0 0 24px -6px ${s.color}30` }}>
                  {s.emoji}
                </div>
                <h3 className="text-xl font-semibold text-white">{s.title}</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              {/* Shimmer bar */}
              <div className="mt-5 h-1 rounded-full overflow-hidden bg-white/[0.03]">
                <div className="h-full rounded-full" style={{ width: '70%', background: `linear-gradient(90deg, ${s.color}40, ${s.color}15)` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   S4: USE CASES — large numbered cards
   ============================================================ */
function UseCasesSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionTitle title="为谁而建" subtitle="适合有野心的营销人" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {useCases.map((uc, i) => (
            <div key={i} className="gradient-border-card p-6 group hover:translate-y-[-2px] transition-all duration-300">
              {/* Large number */}
              <span className="text-5xl font-black leading-none" style={{ color: `${uc.color}20` }}>{uc.num}</span>
              <h3 className="text-xl font-semibold text-white mt-3">{uc.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{uc.subtitle}</p>
              <p className="text-sm text-gray-400 mt-3 leading-relaxed">{uc.desc}</p>
              {/* Glow accent */}
              <div className="mt-4 flex items-center gap-2">
                <div className="glow-dot" style={{ color: uc.color }} />
                <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${uc.color}30, transparent)` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   S5: CORE FEATURES — cotify sticky cards with mockup visuals
   ============================================================ */
function CoreFeaturesSection() {
  const featureVisuals: Record<number, React.ReactNode> = {
    0: /* Multi-Agent Chat */ (
      <div className="rounded-2xl bg-[#0a0a10] border border-white/[0.06] p-4 w-full max-w-[280px]">
        <div className="space-y-2.5">
          {[{c:'#e74c3c',n:'CEO',t:'拆解任务 → 分配给 XHS Agent'},{c:'#ff2442',n:'XHS',t:'竞品分析完成，生成 3 篇草稿'},{c:'#00cec9',n:'Growth',t:'建议优先发 #AI工具 话题 ↑42%'}].map((m,i)=>(
            <div key={i} className="flex gap-2 items-start">
              <div className="w-5 h-5 rounded shrink-0 flex items-center justify-center text-[8px] font-bold text-white" style={{background:m.c,imageRendering:'pixelated'}}>{m.n[0]}</div>
              <p className="text-[11px] text-gray-400 leading-snug">{m.t}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    1: /* Context Vault Card */ (
      <div className="rounded-2xl bg-[#0a0a10] border border-white/[0.06] p-5 w-full max-w-[280px] text-center">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 mx-auto mb-3 flex items-center justify-center text-lg">📋</div>
        <p className="text-sm font-medium text-white">品牌知识库</p>
        <div className="mt-3 space-y-1.5">
          {['品牌调性: 专业·温暖·创新','目标受众: 25-35 创业者','产品: AI 营销 OS'].map((t,i)=>(
            <p key={i} className="text-[10px] text-gray-500 bg-white/[0.03] rounded-lg px-2 py-1">{t}</p>
          ))}
        </div>
      </div>
    ),
    2: /* Platform Status */ (
      <div className="rounded-2xl bg-[#0a0a10] border border-white/[0.06] p-4 w-full max-w-[280px]">
        <div className="space-y-2">
          {[{p:'小红书',s:'已发布',ok:true},{p:'X / Twitter',s:'定时 14:00',ok:false},{p:'微信公众号',s:'已发布',ok:true},{p:'Meta',s:'审核中',ok:false}].map((x,i)=>(
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
              <span className="text-xs text-gray-400">{x.p}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${x.ok?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-400'}`}>{x.s}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    3: /* Approval UI */ (
      <div className="rounded-2xl bg-[#0a0a10] border border-white/[0.06] p-4 w-full max-w-[280px]">
        <p className="text-xs text-gray-500 mb-3">Brand Reviewer 审核结果</p>
        <div className="space-y-2 mb-4">
          {['品牌一致性 ✅','敏感词检查 ✅','图片合规 ✅'].map((t,i)=>(<p key={i} className="text-[11px] text-emerald-400/80">{t}</p>))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs text-center font-medium">通过</div>
          <div className="flex-1 py-1.5 rounded-lg bg-white/[0.04] text-gray-500 text-xs text-center">修改</div>
        </div>
      </div>
    ),
    4: /* Learning Metrics */ (
      <div className="rounded-2xl bg-[#0a0a10] border border-white/[0.06] p-4 w-full max-w-[280px]">
        <p className="text-xs text-gray-500 mb-3">本周学习成果</p>
        <div className="grid grid-cols-2 gap-3">
          {[{v:'↑42%',l:'互动率提升'},{v:'Top 3',l:'爆款模式提取'},{v:'12 条',l:'SKILL 更新'},{v:'98%',l:'品牌一致性'}].map((m,i)=>(
            <div key={i} className="text-center">
              <p className="text-lg font-bold text-rose-400">{m.v}</p>
              <p className="text-[10px] text-gray-500">{m.l}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    5: /* MCP Plugins */ (
      <div className="rounded-2xl bg-[#0a0a10] border border-white/[0.06] p-4 w-full max-w-[280px]">
        <div className="grid grid-cols-4 gap-2">
          {['📸 图像','🔍 抓取','📊 竞品','🎙️ TTS','✍️ 文案','🌐 翻译','📈 SEO','🔗 API'].map((t,i)=>(
            <div key={i} className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <p className="text-sm">{t.split(' ')[0]}</p>
              <p className="text-[8px] text-gray-600 mt-0.5">{t.split(' ')[1]}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionTitle title="核心能力" subtitle="六大支柱，驱动营销自动化" />
        <div className="features-stack">
          {features.map((f, i) => (
            <div key={i} className={`stack-card ${f.glow}`}>
              <div>
                <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4" style={{ letterSpacing: '-0.03em' }}>{f.title}</h3>
                <p className="text-gray-400 leading-relaxed text-base">{f.desc}</p>
              </div>
              <div className="flex items-center justify-center">
                {featureVisuals[i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   S6: AGENT TEAM — pixel art + 3 categories
   ============================================================ */
function AgentTeamSection() {
  const px = (name: string) => {
    const id = AGENT_SVG_ID[name];
    if (!id) return <div className="w-8 h-8 rounded bg-gray-700" />;
    return <PixelAgentSVG agentId={id} status="online" className="w-10 h-14 shrink-0" />;
  };

  const categories = [
    {
      label: '📝 内容生产',
      sublabel: 'Content Creators',
      agents: agents.filter(a => ['XHS','Global','X','Email','Podcast'].includes(a.name)),
    },
    {
      label: '📊 策略增长',
      sublabel: 'Strategy & Growth',
      agents: agents.filter(a => ['Growth','Strategist','SEO','GEO','Meta Ads','Visual'].includes(a.name)),
    },
    {
      label: '🔍 数据智能',
      sublabel: 'Data & Intelligence',
      agents: agents.filter(a => ['Analyst'].includes(a.name)),
    },
  ];

  return (
    <section id="agents" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionTitle title="14 个 AI Agent，各司其职" subtitle="你的虚拟营销军团" />

        {/* CEO */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">ORCHESTRATOR</span>
            <span className="text-xs text-gray-600">总指挥层</span>
            <div className="section-divider flex-1" />
          </div>
          <div className="glass-card rounded-xl p-4 max-w-sm">
            <div className="flex items-center gap-3 mb-2">
              {px('CEO')}
              <div>
                <p className="text-sm font-semibold text-white">CEO Agent</p>
                <p className="text-[10px] text-gray-500">总指挥</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">任务拆解 · 质量控制 · Agent 调度 · 全局协调</p>
          </div>
        </div>

        {/* Specialist categories */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">SPECIALISTS</span>
            <span className="text-xs text-gray-600">专业执行层</span>
            <div className="section-divider flex-1" />
          </div>
          <div className="space-y-6">
            {categories.map((cat, ci) => (
              <div key={ci}>
                <p className="text-sm text-gray-400 mb-3">{cat.label} <span className="text-gray-600 text-xs ml-1">{cat.sublabel}</span></p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {cat.agents.map((agent, i) => (
                    <div key={i} className="glass-card rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {px(agent.name)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                          <p className="text-[10px] text-gray-500">{agent.role}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug">{agent.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviewer */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">REVIEWER</span>
            <span className="text-xs text-gray-600">品控审查层</span>
            <div className="section-divider flex-1" />
          </div>
          <div className="glass-card rounded-xl p-4 max-w-sm">
            <div className="flex items-center gap-3 mb-2">
              {px('Brand')}
              <div>
                <p className="text-sm font-semibold text-white">Brand Agent</p>
                <p className="text-[10px] text-gray-500">品牌审查</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">合规检查 · 风险评估 · 品调一致性 · 敏感词过滤</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   S7: WORKFLOW — circular flywheel with SVG arcs + flowing particles
   ============================================================ */
function WorkflowSection() {
  const nodes = [
    { title: '品牌知识库', color: '#a855f7', desc: '产品·品牌·受众' },
    { title: 'CEO 策略', color: '#00f0ff', desc: '拆解任务·分配 Agent' },
    { title: '内容生产', color: '#f59e0b', desc: '文案·图片·视频' },
    { title: '审批发布', color: '#34d399', desc: '品控·定时·多平台' },
    { title: '数据分析', color: '#f43f5e', desc: '互动·模式·洞察' },
  ];

  const R = 180, CX = 260, CY = 260, SVG = 520;
  const positions = nodes.map((_, i) => {
    const deg = -90 + i * 72;
    const rad = (deg * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad), deg };
  });
  const arcs = nodes.map((_, i) => {
    const f = positions[i], t = positions[(i + 1) % 5];
    return `M ${f.x} ${f.y} A ${R} ${R} 0 0 1 ${t.x} ${t.y}`;
  });

  const flywheelCSS = `
    @keyframes orbit-flow { 0%{offset-distance:0%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{offset-distance:100%;opacity:0} }
    @keyframes dash-flow { to{stroke-dashoffset:-40} }
    @keyframes orb-breathe { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.8} 50%{transform:translate(-50%,-50%) scale(1.15);opacity:1} }
    @keyframes orb-ring { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.3} 50%{transform:translate(-50%,-50%) scale(1.4);opacity:0} }
    .fw-particle { offset-distance:0%; animation:orbit-flow 3s linear infinite; }
  `;

  return (
    <section id="workflow" className="py-24 md:py-32 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: flywheelCSS }} />
      <div className="max-w-6xl mx-auto px-6">
        <SectionTitle title="数据飞轮，越转越强" subtitle="自我进化的营销引擎" />

        <div className="relative max-w-2xl mx-auto mt-8">
          <svg viewBox={`0 0 ${SVG} ${SVG}`} className="w-full h-auto">
            <defs>
              {arcs.map((d, i) => (
                <React.Fragment key={`d${i}`}>
                  <path id={`arc${i}`} d={d} fill="none" />
                  <linearGradient id={`g${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={nodes[i].color} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={nodes[(i+1)%5].color} stopOpacity="0.6" />
                  </linearGradient>
                </React.Fragment>
              ))}
              <filter id="pglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {/* Base arcs */}
            {arcs.map((d,i)=><path key={`ab${i}`} d={d} fill="none" stroke={`url(#g${i})`} strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>)}
            {/* Flowing dashes */}
            {arcs.map((d,i)=><path key={`ad${i}`} d={d} fill="none" stroke={nodes[i].color} strokeWidth="2" strokeLinecap="round" strokeDasharray="8 32" opacity="0.5" style={{animation:`dash-flow 2s linear infinite`,animationDelay:`${i*.4}s`}}/>)}
            {/* Particles */}
            {arcs.map((_,i)=>[0,1,2].map(p=><circle key={`p${i}${p}`} r="3.5" fill={nodes[i].color} filter="url(#pglow)" className="fw-particle" style={{offsetPath:`path("${arcs[i]}")`,animationDelay:`${i*.4+p*1}s`,animationDuration:'3s'} as React.CSSProperties}/>))}
            {/* Node halos + dots */}
            {positions.map((pos,i)=>(
              <React.Fragment key={`n${i}`}>
                <circle cx={pos.x} cy={pos.y} r="28" fill="none" stroke={nodes[i].color} strokeWidth="1" opacity="0.15"/>
                <circle cx={pos.x} cy={pos.y} r="20" fill={nodes[i].color} opacity="0.08"/>
                <circle cx={pos.x} cy={pos.y} r="10" fill={`${nodes[i].color}20`} stroke={nodes[i].color} strokeWidth="2"/>
                <circle cx={pos.x} cy={pos.y} r="4" fill={nodes[i].color}/>
              </React.Fragment>
            ))}
          </svg>

          {/* Center orb */}
          <div className="absolute" style={{top:`${(CY/SVG)*100}%`,left:`${(CX/SVG)*100}%`,transform:'translate(-50%,-50%)',width:100,height:100,pointerEvents:'none'}}>
            <div className="absolute top-1/2 left-1/2 w-full h-full rounded-full" style={{background:'radial-gradient(circle, rgba(168,85,247,0.15), rgba(0,240,255,0.1) 60%, transparent 80%)',animation:'orb-ring 4s ease-in-out infinite'}}/>
            <div className="absolute top-1/2 left-1/2 rounded-full" style={{width:64,height:64,background:'radial-gradient(circle at 40% 40%, rgba(168,85,247,0.5), rgba(0,240,255,0.3) 60%, rgba(15,15,20,0.8))',boxShadow:'0 0 40px rgba(168,85,247,0.2), 0 0 80px rgba(0,240,255,0.1)',animation:'orb-breathe 4s ease-in-out infinite'}}/>
            <div className="absolute top-1/2 left-1/2 text-center" style={{transform:'translate(-50%,-50%)',zIndex:10}}>
              <p className="text-[11px] font-bold text-white/90 whitespace-nowrap">持续进化</p>
              <p className="text-[8px] text-white/40 whitespace-nowrap mt-0.5">Self-Evolving</p>
            </div>
          </div>

          {/* Node labels */}
          {positions.map((pos,i)=>{
            const n=nodes[i];
            const isTop=pos.deg>=-120&&pos.deg<=-60;
            const isRight=pos.deg>-60&&pos.deg<60;
            const isLeft=pos.deg>150||pos.deg<-120;
            let tx='translate(-50%,-50%)';
            if(isTop) tx='translate(-50%,-140%)';
            else if(pos.deg>=120) tx='translate(-50%, 50%)';
            else if(isRight) tx='translate(35%,-50%)';
            else if(isLeft) tx='translate(-135%,-50%)';
            return(
              <div key={`l${i}`} className="absolute text-center" style={{top:`${(pos.y/SVG)*100}%`,left:`${(pos.x/SVG)*100}%`,transform:tx,pointerEvents:'none'}}>
                <p className="text-sm font-semibold text-white whitespace-nowrap" style={{textShadow:`0 0 12px ${n.color}40`}}>{n.title}</p>
                <p className="text-[10px] text-gray-500 whitespace-nowrap">{n.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Feedback loop */}
        <div className="mt-12">
          <div className="h-px mx-auto max-w-xl" style={{background:'linear-gradient(90deg, transparent, rgba(0,240,255,0.15), rgba(168,85,247,0.15), rgba(244,63,94,0.15), transparent)'}}/>
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="glass-card rounded-full px-5 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400" style={{animation:'pulse-dot 2s infinite'}}/>
              <span className="text-xs text-gray-400">
                <span style={{color:'#f43f5e'}}>Analyst</span>
                <span className="text-gray-600 mx-1.5">&rarr;</span>
                更新 SKILL.md
                <span className="text-gray-600 mx-1.5">&rarr;</span>
                <span style={{color:'#a855f7'}}>Agent 能力进化</span>
                <span className="text-gray-600 mx-1.5">&rarr;</span>
                <span style={{color:'#00f0ff'}}>下一轮更强</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   S8: TECH STACK — glass pills
   ============================================================ */
function TechStackSection() {
  return (
    <section id="tech" className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <SectionTitle title="技术架构" subtitle="现代技术栈，为性能而生" />
        <div className="flex flex-wrap justify-center gap-3">
          {techItems.map((t, i) => (
            <div key={i} className="glass-card rounded-full px-5 py-3 flex items-center gap-3 group hover:translate-y-[-1px] transition-all">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
              <span className="text-sm font-medium text-white">{t.name}</span>
              <span className="text-xs text-gray-500">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   S9: TESTIMONIALS MARQUEE — improved card design
   ============================================================ */
function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <SectionTitle title="用户怎么说" subtitle="来自营销人的真实反馈" gradient />
      </div>
      <div className="space-y-5">
        {testimonialRows.map((row, ri) => (
          <div key={ri} className="marquee-row overflow-hidden marquee-mask">
            <div className="flex gap-5 marquee-track" style={{ animation: `${ri % 2 === 0 ? 'marquee-left' : 'marquee-right'} ${35 + ri * 5}s linear infinite`, width: 'max-content' }}>
              {[...row, ...row, ...row, ...row].map((t, i) => (
                <div key={i} className="w-[320px] md:w-[380px] shrink-0 gradient-border-card p-5">
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                      {t.role[0]}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">{t.role}</p>
                      <p className="text-xs text-gray-600">{t.handle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   S10: FINAL CTA — cotify style (large rounded card + single white button)
   ============================================================ */
function FinalCTASection() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative rounded-[48px] md:rounded-[64px] overflow-hidden" style={{ background: '#0c0c12', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* BG glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[400px] h-[300px]" style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.06), transparent 70%)' }} />
            <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px]" style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.05), transparent 70%)' }} />
          </div>

          <div className="relative z-10 px-10 md:px-20 py-24 md:py-32">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.05]" style={{ letterSpacing: '-0.04em' }}>
              让营销永不停歇，<br />让增长自动发生
            </h2>
            <p className="mt-6 text-gray-400 text-base md:text-lg leading-relaxed max-w-xl">
              14 个 AI Agent 全天候运转，从选题到发布全链路自动化。<br />
              你只需专注产品和策略，营销交给 ATM OS。
            </p>
            <div className="mt-10">
              <button className="px-8 py-4 rounded-full bg-white text-black font-semibold text-lg hover:bg-gray-100 transition-colors">
                立即开启
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */
function FooterSection() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/landing/logo.png" alt="ATM OS" className="w-6 h-6 rounded-md" />
          <span className="text-sm text-gray-500">ATM OS &middot; Agent-to-Marketing Operating System</span>
        </div>
        <p className="text-xs text-gray-600">Built with Claude Agent SDK &middot; Hackathon 2026</p>
      </div>
    </footer>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
function LandingContent() {
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 50);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[10000] overflow-y-auto scroll-smooth" style={{ background: '#050508', color: '#fff' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Nav scrolled={scrolled} />
      <HeroSection />
      <div className="section-divider max-w-4xl mx-auto" />
      <BeforeAfterSection />
      <div className="section-divider max-w-4xl mx-auto" />
      <ProductShowcase />
      <div className="section-divider max-w-4xl mx-auto" />
      <UseCasesSection />
      <div className="section-divider max-w-4xl mx-auto" />
      <CoreFeaturesSection />
      <div className="section-divider max-w-4xl mx-auto" />
      <AgentTeamSection />
      <div className="section-divider max-w-4xl mx-auto" />
      <WorkflowSection />
      <div className="section-divider max-w-4xl mx-auto" />
      <TechStackSection />
      <div className="section-divider max-w-4xl mx-auto" />
      <TestimonialsSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<LandingContent />, document.body);
}
