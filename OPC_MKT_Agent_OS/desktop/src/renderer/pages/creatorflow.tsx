import { useState, useEffect } from "react";
import { Loader2, ExternalLink, RefreshCw, Headphones } from "lucide-react";

const CREATORFLOW_PORT = "3002";
const CREATORFLOW_URL = `http://localhost:${CREATORFLOW_PORT}`;
const COZE_SPACE_URL =
  "https://www.coze.cn/?skills=7587379252077805604&category=7524915324945252398";

export function CreatorFlowPage(): React.JSX.Element {
  const [status, setStatus] = useState<
    "checking" | "starting" | "ready" | "error"
  >("checking");
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    checkAndStart();
  }, []);

  async function checkAndStart() {
    setStatus("checking");
    try {
      // In Electron, directly check the local CreatorFlow server
      const res = await fetch(`${CREATORFLOW_URL}/`);
      if (res.ok) {
        setStatus("ready");
      } else {
        setStatus("error");
      }
    } catch {
      // Server not running — try polling
      setStatus("starting");
      pollUntilReady();
    }
  }

  async function pollUntilReady() {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2_000));
      try {
        const res = await fetch(`${CREATORFLOW_URL}/`);
        if (res.ok) {
          setStatus("ready");
          return;
        }
      } catch {
        // continue polling
      }
    }
    setStatus("error");
  }

  if (status === "checking" || status === "starting") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: "#ff6b35" }}
        />
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {status === "checking"
            ? "检测 CreatorFlow 状态..."
            : "正在等待 CreatorFlow 启动..."}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-sm" style={{ color: "rgba(248,113,113,0.8)" }}>
          CreatorFlow 未运行，请先启动 CreatorFlow 服务
        </p>
        <p
          className="text-xs font-mono"
          style={{ color: "var(--muted-foreground)" }}
        >
          cd engine/creatorflow && pnpm dev
        </p>
        <button
          onClick={checkAndStart}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{
            background: "rgba(255,107,53,0.15)",
            border: "1px solid rgba(255,107,53,0.3)",
          }}
        >
          <RefreshCw className="h-4 w-4" /> 重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--muted)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: "#4ade80" }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            CreatorFlow 运行中 — localhost:{CREATORFLOW_PORT}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={COZE_SPACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-90"
            style={{
              background: "rgba(99,91,255,0.15)",
              border: "1px solid rgba(99,91,255,0.3)",
              color: "rgba(99,91,255,0.9)",
            }}
            title="打开扣子空间 TTS"
          >
            <Headphones className="h-3.5 w-3.5" />
            扣子空间 TTS
          </a>
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
            title="刷新"
          >
            <RefreshCw
              className="h-3.5 w-3.5"
              style={{ color: "var(--muted-foreground)" }}
            />
          </button>
          <a
            href={CREATORFLOW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
            title="在新窗口打开"
          >
            <ExternalLink
              className="h-3.5 w-3.5"
              style={{ color: "var(--muted-foreground)" }}
            />
          </a>
        </div>
      </div>

      {/* iframe */}
      <iframe
        key={iframeKey}
        src={CREATORFLOW_URL}
        className="flex-1 w-full border-0"
        style={{ background: "#0a0a0b" }}
        title="CreatorFlow"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
