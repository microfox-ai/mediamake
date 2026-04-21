'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { AlertCircle, X } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { RichChatInput } from './RichChatInput';
import type {
  ChatSession as ChatSessionType,
  AIChange,
  ContextAttachment,
  ProjectFile,
  RichSegment,
  MessageMeta,
} from './types';
import { DEFAULT_MODEL_ID } from '@/lib/ai-models';
import { useProjectAgentsStore } from '@/lib/stores/projectAgentsStore';

interface ChatSessionProps {
  projectId: string;
  session: ChatSessionType;
  pendingAttachment: ContextAttachment | null;
  onAttachmentConsumed: () => void;
  onMessagesUpdate: (sessionId: string, messages: UIMessage[], meta: Record<string, MessageMeta>) => void;
  getAllFiles: () => ProjectFile[];
  getFileContent: (fileId: string) => string;
  /** External status map for all AI changes — drives AIChangeBlock display. */
  changeStatuses: Record<string, 'applied' | 'declined'>;
  onApplyChange: (change: AIChange) => void;
  onDeclineChange: (change: AIChange) => void;
}

export function ChatSession({
  projectId,
  session,
  pendingAttachment,
  onAttachmentConsumed,
  onMessagesUpdate,
  getAllFiles,
  getFileContent,
  changeStatuses,
  onApplyChange,
  onDeclineChange,
}: ChatSessionProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageMetaRef = useRef<Record<string, MessageMeta>>(session.messageMeta ?? {});
  const pendingMetaRef = useRef<MessageMeta | null>(null);
  const debug = process.env.NODE_ENV !== 'production';

  // ── Model & web-search state (persisted per component lifetime) ───────────
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('local:writing-assistant');
  const projectData = useProjectAgentsStore((s) => s.byProjectId[projectId]);
  const fetchAgents = useProjectAgentsStore((s) => s.fetchAgents);
  const canUseChat = projectData?.canEdit ?? true;
  const agentOptions = useMemo(() => {
    const local = (projectData?.localAgents ?? []).map((a) => ({
      id: `local:${a.id}`,
      label: `Local · ${a.name}`,
    }));
    const project = (projectData?.projectAgents ?? []).map((a) => ({
      id: `project:${a.id}`,
      label: `Project · ${a.name}`,
    }));
    const merged = [...local, ...project];
    return merged.length > 0
      ? merged
      : [{ id: 'local:writing-assistant', label: 'Local · Writing Assistant' }];
  }, [projectData]);

  // Guard: only persist messages after the user has actually sent a message.
  // Without this, the component fires onMessagesUpdate on mount with whatever
  // messages happen to be in state (could be [] during lazy-load), wiping the DB.
  const hasInteractedRef = useRef(false);

  // Track message IDs that were loaded from DB (not freshly streamed).
  // AIChangeBlocks for historical messages must NOT auto-apply — the edits
  // are already in the files (or were already reverted by the user).
  const historicalMsgIds = useRef<Set<string>>(
    new Set(session.messages.map((m) => m.id)),
  );

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/studio/chat/agent/editor' }),
    [],
  );

  const { messages, sendMessage, status, stop, setMessages, error, clearError } = useChat({
    id: session.id,
    messages: session.messages,
    transport,
    onError: (e) => {
      console.error('[writepad chat] useChat error', {
        sessionId: session.id,
        message: e.message,
        error: e,
      });
    },
    onFinish: ({ finishReason, isError, isAbort }) => {
      if (!debug) return;
      console.log('[writepad chat] stream finished', {
        sessionId: session.id,
        finishReason,
        isError,
        isAbort,
      });
    },
  });
  const isLoading = status === 'submitted' || status === 'streaming';

  // On session switch: reset guards and mark all initial messages as historical.
  useEffect(() => {
    hasInteractedRef.current = false;
    messageMetaRef.current = session.messageMeta ?? {};
    historicalMsgIds.current = new Set(session.messages.map((m) => m.id));
    setMessages(session.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // Scroll to bottom immediately (no animation) when switching sessions or on
  // first load — deferred slightly so React has time to paint the messages.
  useEffect(() => {
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    }, 80);
    return () => clearTimeout(t);
  }, [session.id]);

  // When lazy-loaded messages arrive from ChatPanel, inject them into useChat
  // and mark them all as historical (they came from DB, not from streaming).
  useEffect(() => {
    if (!hasInteractedRef.current && session.messages.length > 0) {
      messageMetaRef.current = session.messageMeta ?? {};
      session.messages.forEach((m) => historicalMsgIds.current.add(m.id));
      setMessages(session.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.messages]);

  useEffect(() => {
    fetchAgents(projectId).catch(() => {});
  }, [fetchAgents, projectId]);

  useEffect(() => {
    if (!agentOptions.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(agentOptions[0]?.id ?? 'local:writing-assistant');
    }
  }, [agentOptions, selectedAgentId]);

  useEffect(() => {
    if (error) {
      if (debug) {
        console.error('[writepad chat] rendered error state', {
          sessionId: session.id,
          message: error.message,
        });
      }
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debug, error, session.id]);

  useEffect(() => {
    if (!debug) return;
    const last = messages[messages.length - 1];
    const parts = last?.parts?.map((p) => p.type) ?? [];
    console.log('[writepad chat] state', {
      sessionId: session.id,
      status,
      messageCount: messages.length,
      lastRole: last?.role,
      lastPartTypes: parts,
    });
  }, [debug, messages, session.id, status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (pendingMetaRef.current) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUser && !messageMetaRef.current[lastUser.id]) {
        messageMetaRef.current = { ...messageMetaRef.current, [lastUser.id]: pendingMetaRef.current };
        pendingMetaRef.current = null;
      }
    }
  }, [messages]);

  // Only persist after actual user interaction (not on mount / lazy-load sync).
  useEffect(() => {
    if (!isLoading && hasInteractedRef.current) {
      onMessagesUpdate(session.id, messages, messageMetaRef.current);
    }
  }, [isLoading, messages, session.id, onMessagesUpdate]);

  const handleSend = useCallback(
    (segments: RichSegment[], plainText: string, attachments: Record<string, ContextAttachment>) => {
      if (!canUseChat) return;
      if (!plainText.trim() && Object.keys(attachments).length === 0) return;
      pendingMetaRef.current = { segments, attachments };
      hasInteractedRef.current = true;

      sendMessage(
        { text: buildPromptText(segments, attachments) },
        {
          body: {
            attachments: Object.values(attachments),
            projectId,
            chatId: session.id,
            modelId: selectedModelId,
            agentId: selectedAgentId,
            webSearch: webSearchEnabled,
          },
        },
      );
      if (debug) {
        console.log('[writepad chat] sendMessage', {
          sessionId: session.id,
          modelId: selectedModelId,
          webSearch: webSearchEnabled,
          textLength: plainText.length,
          attachmentCount: Object.keys(attachments).length,
        });
      }
    },
    [canUseChat, debug, sendMessage, projectId, selectedModelId, selectedAgentId, session.id, webSearchEnabled],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground/50">
            <p className="text-sm">New conversation</p>
            <p className="mt-1 text-xs leading-relaxed">
              Select text in the editor and press{' '}
              <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                Ctrl+L
              </kbd>{' '}
              to attach it inline. Ask anything.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            meta={messageMetaRef.current[msg.id]}
            isHistorical={historicalMsgIds.current.has(msg.id)}
            changeStatuses={changeStatuses}
            onApplyChange={onApplyChange}
            onDeclineChange={onDeclineChange}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-1.5 pl-1 text-[11px] text-violet-400/60">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-violet-400/50 animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
            <span>Thinking…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error != null && (
        <div
          role="alert"
          className="shrink-0 border-t border-red-500/25 bg-red-500/10 px-3 py-2.5"
        >
          <div className="flex gap-2">
            <AlertCircle
              className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-red-700 dark:text-red-300">
                Assistant could not complete this reply
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-red-600/90 dark:text-red-400/90">
                {formatChatError(error)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => clearError()}
              className="shrink-0 rounded p-1 text-red-600/70 transition-colors hover:bg-red-500/15 hover:text-red-700 dark:text-red-400/70 dark:hover:text-red-300"
              title="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <RichChatInput
        pendingAttachment={pendingAttachment}
        onAttachmentConsumed={onAttachmentConsumed}
        isLoading={isLoading}
        onStop={stop}
        onSend={handleSend}
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        selectedAgentId={selectedAgentId}
        onAgentChange={setSelectedAgentId}
        agentOptions={agentOptions}
        webSearchEnabled={webSearchEnabled}
        onWebSearchToggle={() => setWebSearchEnabled((v) => !v)}
        canUseChat={canUseChat}
      />
    </div>
  );
}

function buildPromptText(segments: RichSegment[], attachments: Record<string, ContextAttachment>): string {
  return segments
    .map((s) => {
      if (s.type === 'text') return s.text;
      const a = attachments[s.attachmentId];
      return a ? `[${a.fileName}:L${a.startLine}-${a.endLine}]` : '[context]';
    })
    .join('');
}

/** User-visible text from useChat / fetch / AI SDK errors (including nested retry/API errors). */
function formatChatError(err: Error): string {
  const msg = err.message?.trim();
  if (!msg) return 'Something went wrong. Try again in a moment.';

  const any = err as Error & {
    lastError?: { message?: string };
    cause?: unknown;
    data?: { error?: { message?: string } };
  };

  const fromLast = typeof any.lastError?.message === 'string' ? any.lastError.message.trim() : '';
  if (fromLast && !msg.includes(fromLast)) {
    return `${msg}\n\n${fromLast}`;
  }

  const fromData = typeof any.data?.error?.message === 'string' ? any.data.error.message.trim() : '';
  if (fromData && !msg.includes(fromData)) {
    return `${msg}\n\n${fromData}`;
  }

  if (any.cause instanceof Error && any.cause.message && !msg.includes(any.cause.message)) {
    return `${msg}\n\n${any.cause.message}`;
  }

  return msg;
}
