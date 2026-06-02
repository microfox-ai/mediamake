'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, History, X, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import { ChatSession } from './ChatSession';
import { ChatSessionList } from './ChatSessionList';
import { WordGenerationsPanel } from './WordGenerationsPanel';
import type {
  ChatSession as ChatSessionType,
  AIChange,
  ContextAttachment,
  MessageMeta,
  ProjectFile,
  RightPanelView,
  SelectionContext,
} from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateTempId() {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 40 ? t.slice(0, 38) + '…' : t || 'New Chat';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  projectId: string;
  activeChatId: string | null;
  onActiveChatChange: (id: string | null) => void;
  pendingContext: SelectionContext | null;
  onContextConsumed: () => void;
  getAllFiles: () => ProjectFile[];
  getFileContent: (fileId: string) => string;
  /** Set a file's full draft content (used for safe-revert of AI changes). */
  setFileContent: (fileId: string, content: string) => Promise<void>;
  changeStatuses: Record<string, 'applied' | 'declined'>;
  onApplyChange: (change: AIChange) => void;
  onDeclineChange: (change: AIChange) => void;
  /** Called after AI finishes a response — re-fetches files to pick up AI-created files. */
  onFilesChanged: () => Promise<void>;
  activeFileId: string | null;
  activeFileName: string | null;
  allBranches?: string[];
  currentBranch?: string;
  /** File IDs with unsaved in-memory edits — forwarded to ChatSession for revert safety. */
  unsavedIds?: Set<string>;
  /** Apply a batch of file snapshot updates to local state — forwarded to ChatSession. */
  onApplyFileSnapshot?: (updates: Array<{ fileId: string; snapshot: { fileId: string; name: string; type: 'file' | 'folder'; parentId: string | null; content: string; order: number } | null }>) => Promise<void>;
  /** Called when the active chat session starts or stops streaming. */
  onChatStreamingChange?: (isStreaming: boolean) => void;
}

export function ChatPanel({
  projectId,
  activeChatId,
  onActiveChatChange,
  pendingContext,
  onContextConsumed,
  getAllFiles,
  getFileContent,
  setFileContent,
  changeStatuses,
  onApplyChange,
  onDeclineChange,
  onFilesChanged,
  activeFileId,
  activeFileName,
  allBranches = [],
  currentBranch = '',
  unsavedIds = new Set(),
  onApplyFileSnapshot = async () => {},
  onChatStreamingChange,
}: ChatPanelProps) {
  const [sessions, setSessions] = useState<ChatSessionType[]>([]);
  const sessionsRef = useRef<ChatSessionType[]>([]);
  sessionsRef.current = sessions;
  /** Chat IDs that already had a lazy GET (or were created empty) — avoids refetch loop when messages stay []. */
  const messagesHydratedRef = useRef<Set<string>>(new Set());
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [view, setView] = useState<RightPanelView>('chat');

  useEffect(() => {
    messagesHydratedRef.current.clear();
  }, [projectId]);

  // ── Load sessions from DB on mount / project change ───────────────────────

  useEffect(() => {
    if (!projectId) return;
    setLoadingSessions(true);
    fetch(`/api/projects/${projectId}/chats`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; title: string; createdAt: string; updatedAt: string }>) => {
        const loaded: ChatSessionType[] = (data ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          messages: [],      // messages loaded lazily on first open
          messageMeta: {},
          createdAt: new Date(s.createdAt).getTime(),
          updatedAt: new Date(s.updatedAt).getTime(),
        }));
        setSessions(loaded);

        // Resolve which session to open as the active tab
        let resolvedId: string | null = null;
        if (activeChatId && loaded.some((s) => s.id === activeChatId)) {
          resolvedId = activeChatId;
        } else if (loaded.length > 0) {
          resolvedId = loaded[0].id;
          onActiveChatChange(resolvedId);
        } else {
          onActiveChatChange(null);
        }
        // Only open the active tab on load — other sessions are accessible via history
        if (resolvedId) setOpenTabIds([resolvedId]);
      })
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Lazy-load messages for the active session ─────────────────────────────
  // sessions is in the dep array because activeChatId may already be set (from
  // localStorage) when the component mounts, before sessions have been fetched.
  // Without sessions as a dep, the effect exits early (session not found) and
  // never re-runs once sessions arrive since activeChatId hasn't changed.

  useEffect(() => {
    if (!activeChatId || !projectId) return;
    if (messagesHydratedRef.current.has(activeChatId)) return;
    const session = sessions.find((s) => s.id === activeChatId);
    if (!session) return;

    messagesHydratedRef.current.add(activeChatId);

    fetch(`/api/projects/${projectId}/chats/${activeChatId}`)
      .then((r) => r.json())
      .then((data: { messages?: unknown[]; messageMeta?: Record<string, unknown> }) => {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeChatId
              ? {
                  ...s,
                  messages: (data.messages ?? []) as UIMessage[],
                  messageMeta: (data.messageMeta ?? {}) as Record<string, MessageMeta>,
                }
              : s,
          ),
        );
      })
      .catch((err) => {
        messagesHydratedRef.current.delete(activeChatId);
        console.error(err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, projectId, sessions]);

  // Derive active session from state
  const activeSession = sessions.find((s) => s.id === activeChatId) ?? null;

  // Convert pending context to attachment
  const pendingAttachment: ContextAttachment | null =
    pendingContext && pendingContext.fileId
      ? {
          id: generateTempId(),
          fileId: pendingContext.fileId,
          fileName: pendingContext.file,
          startLine: pendingContext.startLine ?? 1,
          endLine: pendingContext.endLine ?? 1,
          content: pendingContext.text,
        }
      : null;

  // ── Session management ────────────────────────────────────────────────────

  const createNewSession = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat' }),
    });
    const { id } = await res.json() as { id: string };
    messagesHydratedRef.current.add(id);
    const newSession: ChatSessionType = {
      id,
      title: 'New Chat',
      messages: [],
      messageMeta: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onActiveChatChange(id);
    setView('chat');
  }, [projectId, onActiveChatChange]);

  /** Close a tab without deleting the session — it stays in history. */
  const closeTab = useCallback(
    (sessionId: string) => {
      const next = openTabIds.filter((id) => id !== sessionId);
      setOpenTabIds(next);
      if (activeChatId === sessionId) {
        onActiveChatChange(next[next.length - 1] ?? null);
      }
    },
    [openTabIds, activeChatId, onActiveChatChange],
  );

  /**
   * Fork a slice of an existing chat into a new session.
   * - targetUserId undefined → fork for the current user (opens new tab).
   * - targetUserId provided → fork for another project member (no tab opened).
   */
  const handleForkSession = useCallback(
    async (
      messages: UIMessage[],
      messageMeta: Record<string, MessageMeta>,
      title: string,
      targetUserId?: string,
    ) => {
      const res = await fetch(`/api/projects/${projectId}/chats/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, messages, messageMeta, targetUserId }),
      });
      if (!res.ok) { console.error('[ChatPanel] fork failed', await res.text()); return; }
      const { id } = await res.json() as { id: string };

      if (!targetUserId) {
        // Self-fork: add to local state and open tab
        messagesHydratedRef.current.add(id);
        const newSession: ChatSessionType = {
          id,
          title,
          messages,
          messageMeta,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        onActiveChatChange(id);
        setView('chat');
      }
      // For shares to other users we do nothing locally — they will see it in their chat history
    },
    [projectId, onActiveChatChange],
  );

  /** Permanently delete a session from DB and remove from all state. */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      await fetch(`/api/projects/${projectId}/chats/${sessionId}`, { method: 'DELETE' }).catch(
        console.error,
      );
      messagesHydratedRef.current.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      const next = openTabIds.filter((id) => id !== sessionId);
      setOpenTabIds(next);
      if (activeChatId === sessionId) {
        onActiveChatChange(next[next.length - 1] ?? null);
      }
    },
    [projectId, openTabIds, activeChatId, onActiveChatChange],
  );

  /** Open a session tab (from history) and switch to it. */
  const switchToSession = useCallback(
    (sessionId: string) => {
      setOpenTabIds((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
      onActiveChatChange(sessionId);
      setView('chat');
    },
    [onActiveChatChange],
  );

  // ── Persist messages after each AI turn ───────────────────────────────────

  const handleMessagesUpdate = useCallback(
    async (sessionId: string, messages: UIMessage[], meta: Record<string, MessageMeta>) => {
      // Derive title without touching sessions state (read from ref to stay stable)
      const session = sessionsRef.current.find((s) => s.id === sessionId);
      const firstUser = messages.find((m) => m.role === 'user');
      const firstUserText =
        (firstUser?.parts?.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined)
          ?.text ?? '';
      const title =
        session?.title === 'New Chat' && firstUserText ? deriveTitle(firstUserText) : session?.title;

      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages, messageMeta: meta, ...(title ? { title } : {}), updatedAt: Date.now() }
            : s,
        ),
      );

      // Persist to DB — fire-and-forget
      fetch(`/api/projects/${projectId}/chats/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, messageMeta: meta, ...(title ? { title } : {}) }),
      }).catch(console.error);

      // Refresh project files so AI-created files appear in the explorer
      onFilesChanged().catch(console.error);
    },
    [projectId, onFilesChanged],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Tab bar */}
      <div className="flex shrink-0 flex-col border-b border-border">
        <div className="flex items-center overflow-x-auto bg-muted">
          {loadingSessions ? (
            <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground">
              <Loader2 size={11} className="animate-spin" />
              <span>Loading chats…</span>
            </div>
          ) : (
            sessions
              .filter((s) => openTabIds.includes(s.id))
              .sort((a, b) => openTabIds.indexOf(a.id) - openTabIds.indexOf(b.id))
              .map((session) => {
                const isActive = session.id === activeChatId && view === 'chat';
                return (
                  <div
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => switchToSession(session.id)}
                    onKeyDown={(e) => e.key === 'Enter' && switchToSession(session.id)}
                    className={cn(
                      'group flex shrink-0 items-center gap-1.5 border-r border-border px-2.5 py-2 text-[11px] transition-colors cursor-pointer',
                      isActive
                        ? 'border-t border-t-violet-500 bg-card text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <MessageSquare size={11} className="shrink-0" />
                    <span className="max-w-[90px] truncate">{session.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(session.id);
                      }}
                      className="ml-0.5 rounded p-0.5 opacity-0 text-muted-foreground/50 transition-all hover:text-foreground group-hover:opacity-100"
                      title="Close tab"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })
          )}

          <div className="ml-auto flex shrink-0 items-center gap-0.5 px-1.5">
            <button
              onClick={createNewSession}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="New chat"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={() => setView((v) => (v === 'history' ? 'chat' : 'history'))}
              className={cn(
                'rounded p-1 transition-colors',
                view === 'history'
                  ? 'text-violet-500 dark:text-violet-400'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="Chat history"
            >
              <History size={13} />
            </button>
            <button
              onClick={() => setView((v) => (v === 'generations' ? 'chat' : 'generations'))}
              className={cn(
                'rounded p-1 transition-colors',
                view === 'generations'
                  ? 'text-violet-500 dark:text-violet-400'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="Word generations"
            >
              <Sparkles size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {view === 'generations' ? (
          <WordGenerationsPanel
            projectId={projectId}
            activeFileId={activeFileId}
            activeFileName={activeFileName}
          />
        ) : view === 'history' ? (
          <ChatSessionList
            sessions={sessions}
            activeSessionId={activeChatId ?? ''}
            onSelect={switchToSession}
            onNew={createNewSession}
            onDelete={deleteSession}
          />
        ) : !activeSession ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground/50">
            {loadingSessions ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <p className="text-sm">{sessions.length > 0 ? 'No open chats' : 'No chats yet'}</p>
                <div className="flex items-center gap-2">
                  {sessions.length > 0 && (
                    <button
                      onClick={() => setView('history')}
                      className="flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[11px] hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <History size={11} />
                      History
                    </button>
                  )}
                  <button
                    onClick={createNewSession}
                    className="flex items-center gap-1 rounded border border-violet-500/30 px-2.5 py-1 text-[11px] text-violet-500 dark:text-violet-400 hover:bg-violet-500/10 transition-colors"
                  >
                    <Plus size={11} />
                    New Chat
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          // key forces remount (fresh useChat) when switching sessions
          <ChatSession
            key={activeSession.id}
            projectId={projectId}
            session={activeSession}
            pendingAttachment={pendingAttachment}
            onAttachmentConsumed={onContextConsumed}
            onMessagesUpdate={handleMessagesUpdate}
            getAllFiles={getAllFiles}
            getFileContent={getFileContent}
            setFileContent={setFileContent}
            changeStatuses={changeStatuses}
            onApplyChange={onApplyChange}
            onDeclineChange={onDeclineChange}
            allBranches={allBranches}
            currentBranch={currentBranch}
            unsavedFileIds={unsavedIds}
            onApplyFileSnapshot={onApplyFileSnapshot}
            onForkSession={handleForkSession}
            onChatStreamingChange={onChatStreamingChange}
          />
        )}
      </div>
    </div>
  );
}
