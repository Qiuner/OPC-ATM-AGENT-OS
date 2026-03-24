'use client';

import { useState } from 'react';
import {
  ModeTabs,
  CommandInput,
  ExecutionPanel,
  ResultSummary,
  TerminalLog,
  useAgentExecution,
} from '@/components/features/workbench';
import type { WorkbenchMode } from '@/components/features/workbench';

export default function WorkbenchPage() {
  const [mode, setMode] = useState<WorkbenchMode>('execute');
  const { state, execute, stop, reset } = useAgentExecution();

  const allDone = state.tasks.length > 0 &&
    !state.isRunning &&
    state.tasks.every(t => t.status === 'done' || t.status === 'error');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mode tabs */}
      <ModeTabs activeMode={mode} onModeChange={setMode} />

      {mode === 'execute' ? (
        <>
          {/* Execution panel (task header + card grid) */}
          <ExecutionPanel state={state} onStop={stop} />

          {/* Result summary (shown when all tasks complete) */}
          {allDone && <ResultSummary state={state} onReset={reset} />}

          {/* Terminal log */}
          {state.logs.length > 0 && <TerminalLog logs={state.logs} />}

          {/* Command input */}
          <CommandInput
            onSubmit={(msg) => execute(msg)}
            isRunning={state.isRunning}
          />
        </>
      ) : (
        /* Co-creation mode placeholder */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              <span className="text-2xl" style={{ color: '#22d3ee' }}>&#x1F4AC;</span>
            </div>
            <p className="text-[14px] text-[rgba(255,255,255,0.4)]">
              共创模式 — 多 Agent 圆桌讨论
            </p>
            <p className="text-[12px] text-[rgba(255,255,255,0.2)]">
              即将上线，敬请期待
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
