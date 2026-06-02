'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddCommentDialogProps {
  lineNumber: number;
  lineContent: string;
  onSubmit: (text: string) => Promise<void>;
  onClose: () => void;
}

export function AddCommentDialog({
  lineNumber,
  lineContent,
  onSubmit,
  onClose,
}: AddCommentDialogProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-amber-400" />
            <span className="text-[12px] font-medium text-foreground">
              Comment on line {lineNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Line preview */}
          {lineContent && (
            <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-amber-400/60 mb-0.5">
                Line {lineNumber}
              </p>
              <p className="truncate font-mono text-[11px] text-foreground/60">
                {lineContent}
              </p>
            </div>
          )}

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Leave a comment…"
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-amber-400/50 transition-colors"
          />

          <p className="text-[9px] text-muted-foreground/40">
            Ctrl+Enter to submit · Escape to cancel
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || saving}
            className="gap-1.5 bg-amber-500 hover:bg-amber-400 text-white"
          >
            <MessageSquare size={12} />
            {saving ? 'Saving…' : 'Add Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
