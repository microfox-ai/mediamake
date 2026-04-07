'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
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

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: session.id,
    messages: session.messages,
    transport,
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
      if (!plainText.trim() && Object.keys(attachments).length === 0) return;
      pendingMetaRef.current = { segments, attachments };
      hasInteractedRef.current = true;

      const files = getAllFiles();

      // Find .writepad/rules.md — locate the .writepad folder, then find rules.md inside it
      const writepadFolder = files.find(
        (f) => f.type === 'folder' && f.fileName.toLowerCase() === '.writepad' && f.parentId === null,
      );
      const rulesFile = writepadFolder
        ? files.find(
            (f) => f.type === 'file' && f.fileName.toLowerCase() === 'rules.md' && f.parentId === writepadFolder.fileId,
          )
        : undefined;

      sendMessage(
        { text: buildPromptText(segments, attachments) },
        {
          body: {
            attachments: Object.values(attachments),
            files,
            writepadRules: rulesFile?.content ?? null,
            projectId,
            chatId: session.id,
          },
        },
      );
    },
    [sendMessage, getAllFiles, projectId],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
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

      <RichChatInput
        pendingAttachment={pendingAttachment}
        onAttachmentConsumed={onAttachmentConsumed}
        isLoading={isLoading}
        onStop={stop}
        onSend={handleSend}
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
