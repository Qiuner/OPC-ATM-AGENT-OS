'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface CommandInputProps {
  onSubmit: (message: string) => void;
  isRunning: boolean;
}

export function CommandInput({ onSubmit, isRunning }: CommandInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span
        className="text-[14px] font-bold shrink-0"
        style={{ color: '#a78bfa', fontFamily: 'var(--font-geist-mono)' }}
      >
        $
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入需求，如「帮我做一期 AI 工具播客」..."
        disabled={isRunning}
        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none disabled:opacity-50"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isRunning}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-30"
        style={{
          background: value.trim() && !isRunning ? 'rgba(167,139,250,0.15)' : 'transparent',
          color: '#a78bfa',
        }}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
