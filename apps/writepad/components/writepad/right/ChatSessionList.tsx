'use client';

import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatSession } from './types';

interface ChatSessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onDelete: (sessionId: string) => void;
}

export function ChatSessionList({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
}: ChatSessionListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-medium text-muted-foreground">Chat History</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 rounded bg-violet-600 px-2 py-1 text-[10px] text-white transition-colors hover:bg-violet-500"
        >
          <Plus size={11} />
          New
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground/40">
            <MessageSquare size={24} className="mb-2 opacity-40" />
            <p className="text-xs">No conversations yet.</p>
            <p className="mt-0.5 text-[10px]">Start one with the button above.</p>
          </div>
        )}
        {sessions
          .slice()
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((session) => {
            const isActive = session.id === activeSessionId;
            const lastMsg = session.messages[session.messages.length - 1];
            const lastText = lastMsg?.parts?.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined;
            const preview = lastText ? lastText.text.slice(0, 60) : 'No messages yet';

            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(session.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(session.id)}
                className={cn(
                  'group flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-left transition-colors',
                  isActive ? 'bg-primary/15' : 'hover:bg-accent',
                )}
              >
                <MessageSquare
                  size={13}
                  className={cn('mt-0.5 shrink-0', isActive ? 'text-violet-500 dark:text-violet-400' : 'text-muted-foreground/50')}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-[12px] font-medium', isActive ? 'text-foreground' : 'text-foreground/70')}>
                    {session.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground/50">{preview}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground/40">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                  className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground/30 opacity-0 transition-colors hover:text-destructive group-hover:opacity-100"
                  title="Delete conversation"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
