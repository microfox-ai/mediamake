'use client';

import { useRef } from 'react';
import { Send, X, FileText } from 'lucide-react';
import type { SelectionContext } from './types';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  pendingContext: SelectionContext | null;
  onClearContext: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  pendingContext,
  onClearContext,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = value.trim().length > 0 || pendingContext !== null;

  return (
    <div className="shrink-0 border-t border-border p-2">
      {/* Attached context chip */}
      {pendingContext && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-1.5">
          <FileText size={11} className="shrink-0 text-violet-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-violet-300">
              {pendingContext.file}
              <span className="ml-1 text-violet-400/60">:{pendingContext.lines}</span>
            </p>
            <p className="truncate font-mono text-[10px] text-white/35">
              {pendingContext.text}
            </p>
          </div>
          <button
            onClick={onClearContext}
            className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
            title="Remove context"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            pendingContext
              ? 'Ask about this selection…'
              : 'Ask anything… (Ctrl+L to attach selection)'
          }
          rows={2}
          className="flex-1 resize-none rounded-md border border-border bg-muted px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/50 leading-relaxed"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:opacity-30"
          title="Send (Enter)"
        >
          <Send size={14} />
        </button>
      </div>
      <p className="mt-1 text-center text-[9px] text-muted-foreground/40">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
