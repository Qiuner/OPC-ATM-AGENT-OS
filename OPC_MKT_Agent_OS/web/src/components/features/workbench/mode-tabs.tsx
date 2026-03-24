'use client';

import { cn } from '@/lib/utils';
import type { WorkbenchMode } from './types';

interface ModeTabsProps {
  activeMode: WorkbenchMode;
  onModeChange: (mode: WorkbenchMode) => void;
}

const tabs: { id: WorkbenchMode; label: string }[] = [
  { id: 'execute', label: '执行模式' },
  { id: 'cocreate', label: '共创模式' },
];

export function ModeTabs({ activeMode, onModeChange }: ModeTabsProps) {
  return (
    <div
      className="flex items-center gap-1 px-4 h-11 shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {tabs.map(tab => {
        const isActive = activeMode === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onModeChange(tab.id)}
            className={cn(
              'px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer relative',
              isActive
                ? 'text-white'
                : 'text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]'
            )}
          >
            {tab.label}
            {isActive && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ background: '#a78bfa' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
