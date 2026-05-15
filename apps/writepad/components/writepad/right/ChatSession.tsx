'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { AlertCircle, X, GitBranch, GitFork, Share2, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import { RichChatInput } from './RichChatInput';
import { RevertChangesDialog } from './RevertChangesDialog';
import type {
  ChatSession as ChatSessionType,
  AIChange,
  AppliedFileChange,
  ContextAttachment,
  ProjectFile,
  RichSegment,
  MessageMeta,
  ChatMode,
  MediaAttachment,
  ChatContextRef,
} from './types';
import { DEFAULT_MODEL_ID } from '@/lib/ai-models';
import { useProjectAgentsStore } from '@/lib/stores/projectAgentsStore';

interface FileSnapshotUpdate {
  fileId: string;
  snapshot: {
    fileId: string;
    name: string;
    type: 'file' | 'folder';
    parentId: string | null;
    content: string;
    order: number;
  } | null;
}

interface ChatSessionProps {
  projectId: string;
  session: ChatSessionType;
  pendingAttachment: ContextAttachment | null;
  onAttachmentConsumed: () => void;
  onMessagesUpdate: (sessionId: string, messages: UIMessage[], meta: Record<string, MessageMeta>) => void;
  getAllFiles: () => ProjectFile[];
  getFileContent: (fileId: string) => string;
  /** Set a file's full draft content (used for safe-revert of AI changes). */
  setFileContent: (fileId: string, content: string) => Promise<void>;
  /** External status map for all AI changes — drives AIChangeBlock display. */
  changeStatuses: Record<string, 'applied' | 'declined'>;
  onApplyChange: (change: AIChange) => void;
  onDeclineChange: (change: AIChange) => void;
  allBranches: string[];
  currentBranch: string;
  /** File IDs that have unsaved in-memory edits — must not be overwritten during revert. */
  unsavedFileIds: Set<string>;
  /** Apply a batch of file create/update/delete operations to local state. */
  onApplyFileSnapshot: (updates: FileSnapshotUpdate[]) => Promise<void>;
  /** Fork a slice of this chat into a new session. targetUserId=undefined → fork for self. */
  onForkSession: (
    messages: UIMessage[],
    messageMeta: Record<string, MessageMeta>,
    title: string,
    targetUserId?: string,
  ) => Promise<void>;
  /** Called whenever the chat streaming state changes — lets parent track building status. */
  onChatStreamingChange?: (isStreaming: boolean) => void;
}

export function ChatSession({
  projectId,
  session,
  pendingAttachment,
  onAttachmentConsumed,
  onMessagesUpdate,
  getAllFiles,
  getFileContent,
  setFileContent,
  changeStatuses,
  onApplyChange,
  onDeclineChange,
  allBranches,
  currentBranch,
  unsavedFileIds,
  onApplyFileSnapshot,
  onForkSession,
  onChatStreamingChange,
}: ChatSessionProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageMetaRef = useRef<Record<string, MessageMeta>>(session.messageMeta ?? {});
  const pendingMetaRef = useRef<MessageMeta | null>(null);
  const debug = process.env.NODE_ENV !== 'production';
  // Session-wide accessible branches (user adds via @branch in input)
  const [contextBranches, setContextBranches] = useState<string[]>([]);

  // ── Model & web-search state (persisted per component lifetime) ───────────
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('local:writing-assistant');
  const [chatMode, setChatMode] = useState<ChatMode>('agent');
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

  // Retry-with-tweaks: pre-fill input with original message content + restore config
  const [retryTweaks, setRetryTweaks] = useState<{
    messageId: string;
    text: string;
    chatMode: ChatMode;
    agentId: string;
    modelId: string;
  } | null>(null);

  // Share dialog state
  const [shareDialog, setShareDialog] = useState<{
    forkedMsgs: UIMessage[];
    forkedMeta: Record<string, MessageMeta>;
    title: string;
    members: Array<{ clientId: string; role: string }>;
    sharing: string | null; // clientId currently being shared to
    shared: string | null;  // clientId successfully shared to (for success flash)
  } | null>(null);

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

  // Notify parent when streaming state changes (used for plan-file "Building…" status)
  useEffect(() => {
    onChatStreamingChange?.(isLoading);
  }, [isLoading, onChatStreamingChange]);

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
    (
      segments: RichSegment[],
      plainText: string,
      attachments: Record<string, ContextAttachment>,
      mediaAttachments: Record<string, MediaAttachment>,
      chatContexts: Record<string, ChatContextRef>,
    ) => {
      if (!canUseChat) return;
      const hasContent = plainText.trim() || Object.keys(attachments).length > 0 || Object.keys(mediaAttachments).length > 0 || Object.keys(chatContexts).length > 0;
      if (!hasContent) return;
      const fileStateAtSend = getAllFiles()
        .filter((f) => f.type === 'file')
        .map((f) => ({
          fileId: f.fileId,
          name: f.fileName,
          type: f.type as 'file' | 'folder',
          parentId: f.parentId,
          content: f.content,
        }));
      pendingMetaRef.current = { segments, attachments, mediaAttachments, chatContexts, chatMode, agentId: selectedAgentId, modelId: selectedModelId, fileStateAtSend };
      hasInteractedRef.current = true;

      sendMessage(
        { text: buildPromptText(segments, attachments) },
        {
          body: {
            attachments: Object.values(attachments),
            mediaAttachments: Object.values(mediaAttachments),
            chatContextIds: Object.values(chatContexts).map((c) => c.chatId),
            projectId,
            chatId: session.id,
            modelId: selectedModelId,
            agentId: selectedAgentId,
            webSearch: webSearchEnabled,
            contextBranches,
            chatMode,
          },
        },
      );
      if (debug) {
        console.log('[writepad chat] sendMessage', {
          sessionId: session.id,
          modelId: selectedModelId,
          webSearch: webSearchEnabled,
          chatMode,
          textLength: plainText.length,
          attachmentCount: Object.keys(attachments).length,
          mediaCount: Object.keys(mediaAttachments).length,
          chatContextCount: Object.keys(chatContexts).length,
        });
      }
    },
    [canUseChat, debug, sendMessage, getAllFiles, projectId, selectedModelId, selectedAgentId, session.id, webSearchEnabled, contextBranches, chatMode],
  );

  // ── Confirmation dialog state for retry/revert ───────────────────────────
  // When the user clicks Retry or Revert and there are AI-applied file
  // changes that could be reverted, we show a dialog asking what to do.
  // The pending action is stored here while the dialog is open.
  const [revertConfirm, setRevertConfirm] = useState<{
    kind: 'retry' | 'revert';
    messageId: string;
    revertable: RevertCandidate[];
    manualEdits: Array<{ fileName: string; reason: string }>;
    alreadyClean: string[];
    /** When true, use snapshot-based revert (fileStateAtSend path). */
    useSnapshot: boolean;
    /** Files created by AI after the send — will be deleted on revert. */
    toDelete: Array<{ fileId: string; fileName: string }>;
    /** Files deleted by AI after the send — will be restored on revert. */
    toRestore: Array<{
      fileId: string; fileName: string;
      name: string; type: 'file' | 'folder';
      parentId: string | null; content: string;
    }>;
  } | null>(null);

  // ── AI change apply (with snapshot capture) ───────────────────────────────
  // Wraps the parent's onApplyChange to capture a before/after content
  // snapshot of the file, keyed by the assistant message id that produced
  // this change. The snapshot lives in messageMeta.appliedFileChanges and
  // lets us safely revert these changes later (only when the file's current
  // content still matches the captured "after" content — i.e. the user
  // hasn't manually edited the file since).

  const captureSnapshotAndApply = useCallback(
    (change: AIChange, ownerMessageId: string) => {
      // 1. Snapshot BEFORE
      const contentBefore = getFileContent(change.fileId);

      // 2. Apply the change via the parent's handler. This is synchronous —
      //    project.applyAIDraftEdit updates state synchronously inside React.
      onApplyChange(change);

      // 3. Snapshot AFTER (in a microtask so React has flushed the apply)
      Promise.resolve().then(() => {
        const contentAfter = getFileContent(change.fileId);
        // If nothing changed, don't bother recording — there's nothing to revert.
        if (contentBefore === contentAfter) return;

        const entry: AppliedFileChange = {
          id: `${change.changeId}:${Date.now()}`,
          fileId: change.fileId,
          fileName: change.fileName,
          changeId: change.changeId,
          contentBefore,
          contentAfter,
          appliedAt: Date.now(),
        };

        const prevMeta = messageMetaRef.current[ownerMessageId] ?? {
          segments: [],
          attachments: {},
        };
        const updatedMeta: MessageMeta = {
          ...prevMeta,
          appliedFileChanges: [...(prevMeta.appliedFileChanges ?? []), entry],
        };
        messageMetaRef.current = {
          ...messageMetaRef.current,
          [ownerMessageId]: updatedMeta,
        };
        // Persist the updated meta so it survives reload.
        onMessagesUpdate(session.id, messages, messageMetaRef.current);
      });
    },
    [getFileContent, onApplyChange, onMessagesUpdate, session.id, messages],
  );

  // ── Safe revert: analyze + apply (split for confirm-dialog flow) ──────────
  /**
   * Analyze (without applying) what would happen if we reverted AI file changes
   * across the given messages. The resulting plan is shown in the confirmation
   * dialog so the user can decide whether to revert files alongside the
   * chat-message retry/revert.
   *
   * Categories:
   *   - revertable  → file's current content matches the AI's `contentAfter`,
   *                   safe to revert (current → contentBefore)
   *   - manualEdits → file was edited manually since AI applied; reverting
   *                   would clobber that work, so skip
   *   - alreadyClean → file is already at contentBefore (e.g. user manually
   *                    reverted earlier or accepted then declined)
   */
  interface RevertCandidate {
    fileId: string;
    fileName: string;
    earliestBefore: string;
    latestAfter: string;
    parentId?: string | null;
    fileType?: 'file' | 'folder';
  }

  const analyzeRevertableFileChanges = useCallback(
    (
      msgIds: string[],
    ): {
      revertable: RevertCandidate[];
      manualEdits: Array<{ fileName: string; reason: string }>;
      alreadyClean: string[];
    } => {
      const allEntries: AppliedFileChange[] = [];
      for (const id of msgIds) {
        const meta = messageMetaRef.current[id];
        if (meta?.appliedFileChanges?.length) allEntries.push(...meta.appliedFileChanges);
      }
      if (allEntries.length === 0) {
        return { revertable: [], manualEdits: [], alreadyClean: [] };
      }

      // Group by fileId. For each file we want:
      //   - earliestBefore = state before any of these changes (revert target)
      //   - latestAfter    = state we expect the file to currently match
      const byFile = new Map<
        string,
        {
          fileName: string;
          earliestBefore: string;
          latestAfter: string;
          earliestAt: number;
          latestAt: number;
        }
      >();
      for (const e of allEntries) {
        const cur = byFile.get(e.fileId);
        if (!cur) {
          byFile.set(e.fileId, {
            fileName: e.fileName,
            earliestBefore: e.contentBefore,
            latestAfter: e.contentAfter,
            earliestAt: e.appliedAt,
            latestAt: e.appliedAt,
          });
          continue;
        }
        if (e.appliedAt < cur.earliestAt) {
          cur.earliestBefore = e.contentBefore;
          cur.earliestAt = e.appliedAt;
        }
        if (e.appliedAt > cur.latestAt) {
          cur.latestAfter = e.contentAfter;
          cur.latestAt = e.appliedAt;
        }
      }

      const revertable: RevertCandidate[] = [];
      const manualEdits: Array<{ fileName: string; reason: string }> = [];
      const alreadyClean: string[] = [];

      for (const [fileId, info] of byFile) {
        const current = getFileContent(fileId);
        if (current === info.earliestBefore) {
          alreadyClean.push(info.fileName);
        } else if (current === info.latestAfter) {
          revertable.push({
            fileId,
            fileName: info.fileName,
            earliestBefore: info.earliestBefore,
            latestAfter: info.latestAfter,
          });
        } else {
          manualEdits.push({
            fileName: info.fileName,
            reason: 'has manual edits since AI changes',
          });
        }
      }

      return { revertable, manualEdits, alreadyClean };
    },
    [getFileContent],
  );

  /**
   * Snapshot-based revert analysis. When the user message has `fileStateAtSend`,
   * compare it against the current file list to determine what the AI changed.
   * Falls back to `analyzeRevertableFileChanges` if no snapshot exists.
   */
  const analyzeSnapshotRevert = useCallback(
    (
      userMsgId: string,
      droppedMsgIds: string[],
    ): {
      useSnapshot: boolean;
      revertable: RevertCandidate[];
      manualEdits: Array<{ fileName: string; reason: string }>;
      alreadyClean: string[];
      toDelete: Array<{ fileId: string; fileName: string }>;
      toRestore: Array<{ fileId: string; fileName: string; name: string; type: 'file' | 'folder'; parentId: string | null; content: string }>;
    } => {
      const meta = messageMetaRef.current[userMsgId];
      const snapshot = meta?.fileStateAtSend;

      if (!snapshot) {
        const old = analyzeRevertableFileChanges(droppedMsgIds);
        return { useSnapshot: false, ...old, toDelete: [], toRestore: [] };
      }

      const currentFiles = getAllFiles().filter((f) => f.type === 'file');
      const snapshotMap = new Map(snapshot.map((f) => [f.fileId, f]));
      const currentMap = new Map(currentFiles.map((f) => [f.fileId, f]));

      const revertable: RevertCandidate[] = [];
      const manualEdits: Array<{ fileName: string; reason: string }> = [];
      const alreadyClean: string[] = [];
      const toDelete: Array<{ fileId: string; fileName: string }> = [];
      const toRestore: Array<{ fileId: string; fileName: string; name: string; type: 'file' | 'folder'; parentId: string | null; content: string }> = [];

      for (const [fileId, snapFile] of snapshotMap) {
        const current = currentMap.get(fileId);
        if (!current) {
          toRestore.push({ fileId, fileName: snapFile.name, name: snapFile.name, type: snapFile.type, parentId: snapFile.parentId, content: snapFile.content });
          continue;
        }
        const currentContent = getFileContent(fileId);
        if (currentContent === snapFile.content) {
          alreadyClean.push(snapFile.name);
        } else if (unsavedFileIds.has(fileId)) {
          manualEdits.push({ fileName: snapFile.name, reason: 'has unsaved edits' });
        } else {
          revertable.push({ fileId, fileName: snapFile.name, earliestBefore: snapFile.content, latestAfter: currentContent, parentId: snapFile.parentId, fileType: snapFile.type });
        }
      }

      for (const [fileId, curFile] of currentMap) {
        if (!snapshotMap.has(fileId)) {
          if (unsavedFileIds.has(fileId)) {
            manualEdits.push({ fileName: curFile.fileName, reason: 'created after message was sent' });
          } else {
            toDelete.push({ fileId, fileName: curFile.fileName });
          }
        }
      }

      return { useSnapshot: true, revertable, manualEdits, alreadyClean, toDelete, toRestore };
    },
    [getAllFiles, getFileContent, unsavedFileIds, analyzeRevertableFileChanges],
  );

  /** Apply a previously-analysed revert plan. Returns names of files written. */
  const applyRevert = useCallback(
    async (
      candidates: RevertCandidate[],
    ): Promise<{ reverted: string[]; failed: Array<{ fileName: string; reason: string }> }> => {
      const reverted: string[] = [];
      const failed: Array<{ fileName: string; reason: string }> = [];
      for (const c of candidates) {
        try {
          await setFileContent(c.fileId, c.earliestBefore);
          reverted.push(c.fileName);
        } catch (e: any) {
          failed.push({
            fileName: c.fileName,
            reason: e?.message ?? 'failed to write file',
          });
        }
      }
      return { reverted, failed };
    },
    [setFileContent],
  );

  // ── Message action handlers ───────────────────────────────────────────────

  /**
   * Internal: do the actual chat-state mutation (truncate + re-send) for retry.
   * Called from handleRetry directly when there are no file changes to confirm,
   * or from the dialog "confirm" handler after the user has decided.
   */
  const performRetry = useCallback(
    (messageId: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      const msg = messages[idx];
      if (msg.role !== 'user') return;

      const truncated = messages.slice(0, idx);
      const oldMeta = messageMetaRef.current[messageId];

      // Restore original chat config from stored meta
      if (oldMeta?.chatMode && ['ask', 'agent', 'auto', 'plan'].includes(oldMeta.chatMode)) {
        setChatMode(oldMeta.chatMode as ChatMode);
      }
      if (oldMeta?.agentId) setSelectedAgentId(oldMeta.agentId);
      if (oldMeta?.modelId) setSelectedModelId(oldMeta.modelId);

      // Clean up meta for the removed tail
      const newMeta: Record<string, MessageMeta> = {};
      truncated.forEach((m) => { if (messageMetaRef.current[m.id]) newMeta[m.id] = messageMetaRef.current[m.id]; });
      messageMetaRef.current = newMeta;

      if (oldMeta) pendingMetaRef.current = oldMeta;
      hasInteractedRef.current = true;
      setMessages(truncated);
      onMessagesUpdate(session.id, truncated, newMeta);

      const retryChatMode = (oldMeta?.chatMode as ChatMode | undefined) ?? chatMode;
      const retryAgentId = oldMeta?.agentId ?? selectedAgentId;
      const retryModelId = oldMeta?.modelId ?? selectedModelId;
      const promptText = oldMeta
        ? buildPromptText(oldMeta.segments, oldMeta.attachments)
        : (msg.parts?.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined)?.text ?? '';
      const attachments = oldMeta ? Object.values(oldMeta.attachments) : [];
      const replayMedia = oldMeta?.mediaAttachments ? Object.values(oldMeta.mediaAttachments) : [];
      const replayChatIds = oldMeta?.chatContexts ? Object.values(oldMeta.chatContexts).map((c) => c.chatId) : [];

      sendMessage(
        { text: promptText },
        { body: { attachments, mediaAttachments: replayMedia, chatContextIds: replayChatIds, projectId, chatId: session.id, modelId: retryModelId, agentId: retryAgentId, webSearch: webSearchEnabled, contextBranches, chatMode: retryChatMode } },
      );
    },
    [messages, setMessages, sendMessage, projectId, session.id, selectedModelId, selectedAgentId, webSearchEnabled, contextBranches, chatMode, onMessagesUpdate],
  );

  /**
   * Public handler for the Retry button. If this user message produced AI
   * file changes (or any later messages did), opens a confirmation dialog
   * asking whether to also revert those file changes. Otherwise just retries
   * immediately.
   */
  const handleRetry = useCallback(
    (messageId: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      const msg = messages[idx];
      if (msg.role !== 'user') return;

      const droppedMsgIds = messages.slice(idx).map((m) => m.id);
      const analysis = analyzeSnapshotRevert(messageId, droppedMsgIds);

      const hasAnyChanges =
        analysis.revertable.length > 0 ||
        analysis.manualEdits.length > 0 ||
        analysis.toDelete.length > 0 ||
        analysis.toRestore.length > 0;

      if (!hasAnyChanges) {
        performRetry(messageId);
        return;
      }

      setRevertConfirm({ kind: 'retry', messageId, ...analysis });
    },
    [messages, analyzeSnapshotRevert, performRetry],
  );

  /** Retry with tweaks: restores original config and pre-fills input for user to edit before resending. */
  const handleRetryWithTweaks = useCallback(
    (messageId: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      const msg = messages[idx];
      if (msg.role !== 'user') return;
      const oldMeta = messageMetaRef.current[messageId];
      const text = oldMeta
        ? buildPromptText(oldMeta.segments, oldMeta.attachments)
        : (msg.parts?.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined)?.text ?? '';
      const tweakMode = (oldMeta?.chatMode as ChatMode | undefined) ?? chatMode;
      const tweakAgentId = oldMeta?.agentId ?? selectedAgentId;
      const tweakModelId = oldMeta?.modelId ?? selectedModelId;
      setRetryTweaks({ messageId, text, chatMode: tweakMode, agentId: tweakAgentId, modelId: tweakModelId });
    },
    [messages, chatMode, selectedAgentId, selectedModelId],
  );

  /** Build this plan: sends an agent-mode request to execute the latest .writepad/plans/ file. */
  const handleBuildPlan = useCallback(() => {
    const allFiles = getAllFiles();
    const writepadFolder = allFiles.find(
      (f) => f.type === 'folder' && f.fileName.toLowerCase() === '.writepad' && !f.parentId,
    );
    const plansFolder = writepadFolder
      ? allFiles.find(
          (f) => f.type === 'folder' && f.fileName.toLowerCase() === 'plans' && f.parentId === writepadFolder.fileId,
        )
      : undefined;
    const planFiles = plansFolder
      ? allFiles.filter((f) => f.type === 'file' && f.parentId === plansFolder.fileId)
      : [];
    const latestPlan = planFiles[planFiles.length - 1];

    const prompt = latestPlan
      ? `Execute the plan in .writepad/plans/${latestPlan.fileName}. Work through each unchecked task systematically. After completing each task, update the plan file to mark it as done with \`- [x]\`.`
      : `Execute the plan tasks listed in .writepad/plans/. Work through each unchecked task systematically, marking each as done with \`- [x]\` when complete.`;

    setChatMode('agent');
    hasInteractedRef.current = true;
    const newMeta: MessageMeta = {
      segments: [{ type: 'text', text: prompt }],
      attachments: {},
      chatMode: 'agent',
      agentId: selectedAgentId,
      modelId: selectedModelId,
    };
    pendingMetaRef.current = newMeta;
    sendMessage(
      { text: prompt },
      { body: { attachments: [], mediaAttachments: [], chatContextIds: [], projectId, chatId: session.id, modelId: selectedModelId, agentId: selectedAgentId, webSearch: webSearchEnabled, contextBranches, chatMode: 'agent' } },
    );
  }, [getAllFiles, sendMessage, projectId, session.id, selectedAgentId, selectedModelId, webSearchEnabled, contextBranches]);

  // Listen for build-plan trigger from the editor pane plan banner
  // NOTE: must be after handleBuildPlan is defined (const is not hoisted)
  useEffect(() => {
    const handler = () => handleBuildPlan();
    window.addEventListener('writepad:build-plan', handler);
    return () => window.removeEventListener('writepad:build-plan', handler);
  }, [handleBuildPlan]);

  /** Internal: truncate the chat at this message id (no file revert). */
  const performRevert = useCallback(
    (messageId: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;

      const truncated = messages.slice(0, idx);
      const newMeta: Record<string, MessageMeta> = {};
      truncated.forEach((m) => { if (messageMetaRef.current[m.id]) newMeta[m.id] = messageMetaRef.current[m.id]; });
      messageMetaRef.current = newMeta;

      hasInteractedRef.current = true;
      setMessages(truncated);
      onMessagesUpdate(session.id, truncated, newMeta);
    },
    [messages, setMessages, session.id, onMessagesUpdate],
  );

  /**
   * Public handler for the Revert button. Like handleRetry, opens a
   * confirmation dialog when AI file changes exist; otherwise truncates
   * the chat immediately.
   */
  const handleRevert = useCallback(
    (messageId: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;

      const droppedMsgIds = messages.slice(idx).map((m) => m.id);
      const analysis = analyzeSnapshotRevert(messageId, droppedMsgIds);

      const hasAnyChanges =
        analysis.revertable.length > 0 ||
        analysis.manualEdits.length > 0 ||
        analysis.toDelete.length > 0 ||
        analysis.toRestore.length > 0;

      if (!hasAnyChanges) {
        performRevert(messageId);
        return;
      }
      setRevertConfirm({ kind: 'revert', messageId, ...analysis });
    },
    [messages, analyzeSnapshotRevert, performRevert],
  );

  /** Dialog: user chose to revert file changes alongside the chat action. */
  const handleConfirmWithRevert = useCallback(async () => {
    const pending = revertConfirm;
    if (!pending) return;
    setRevertConfirm(null);

    if (pending.useSnapshot) {
      const updates: FileSnapshotUpdate[] = [];
      for (const c of pending.revertable) {
        updates.push({ fileId: c.fileId, snapshot: { fileId: c.fileId, name: c.fileName, type: c.fileType ?? 'file', parentId: c.parentId ?? null, content: c.earliestBefore, order: 0 } });
      }
      for (const f of pending.toRestore) {
        updates.push({ fileId: f.fileId, snapshot: { fileId: f.fileId, name: f.name, type: f.type, parentId: f.parentId, content: f.content, order: 0 } });
      }
      for (const f of pending.toDelete) {
        updates.push({ fileId: f.fileId, snapshot: null });
      }
      if (updates.length > 0) await onApplyFileSnapshot(updates);
    } else {
      if (pending.revertable.length > 0) await applyRevert(pending.revertable);
    }

    if (pending.kind === 'retry') performRetry(pending.messageId);
    else performRevert(pending.messageId);
  }, [revertConfirm, onApplyFileSnapshot, applyRevert, performRetry, performRevert]);

  /** Dialog: user chose to keep file changes as-is and only do the chat action. */
  const handleConfirmKeepFiles = useCallback(() => {
    const pending = revertConfirm;
    if (!pending) return;
    setRevertConfirm(null);
    if (pending.kind === 'retry') performRetry(pending.messageId);
    else performRevert(pending.messageId);
  }, [revertConfirm, performRetry, performRevert]);

  /** Dialog: user cancelled — leave everything untouched. */
  const handleCancelRevert = useCallback(() => {
    setRevertConfirm(null);
  }, []);

  const buildForkSlice = useCallback(
    (messageId: string): { forkedMsgs: UIMessage[]; forkedMeta: Record<string, MessageMeta>; title: string } | null => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return null;
      const forkedMsgs = messages.slice(0, idx + 1);
      const forkedMeta: Record<string, MessageMeta> = {};
      forkedMsgs.forEach((m) => { if (messageMetaRef.current[m.id]) forkedMeta[m.id] = messageMetaRef.current[m.id]; });
      const firstUser = forkedMsgs.find((m) => m.role === 'user');
      const firstText = (firstUser?.parts?.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined)?.text ?? '';
      const base = firstText.trim().slice(0, 38) || 'Chat';
      return { forkedMsgs, forkedMeta, title: `${base}… (fork)` };
    },
    [messages],
  );

  const handleFork = useCallback(
    async (messageId: string) => {
      const slice = buildForkSlice(messageId);
      if (!slice) return;
      await onForkSession(slice.forkedMsgs, slice.forkedMeta, slice.title, undefined);
    },
    [buildForkSlice, onForkSession],
  );

  const handleShare = useCallback(
    async (messageId: string) => {
      const slice = buildForkSlice(messageId);
      if (!slice) return;
      // Fetch project members to present picker
      const res = await fetch(`/api/projects/${projectId}/members`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json() as { ownerId: string; members: Array<{ clientId: string; role: string }> };
      const members = [
        { clientId: data.ownerId, role: 'owner' },
        ...data.members,
      ];
      setShareDialog({ ...slice, members, sharing: null, shared: null });
    },
    [buildForkSlice, projectId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Confirmation dialog — shown when retry/revert would touch AI-applied files */}
      {revertConfirm && (
        <RevertChangesDialog
          kind={revertConfirm.kind}
          revertable={revertConfirm.revertable.map((c) => ({ fileName: c.fileName }))}
          manualEdits={revertConfirm.manualEdits}
          alreadyClean={revertConfirm.alreadyClean}
          toDelete={revertConfirm.toDelete.map((f) => ({ fileName: f.fileName }))}
          toRestore={revertConfirm.toRestore.map((f) => ({ fileName: f.fileName }))}
          onConfirmWithRevert={handleConfirmWithRevert}
          onConfirmKeepFiles={handleConfirmKeepFiles}
          onCancel={handleCancelRevert}
        />
      )}
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

        {messages.map((msg, msgIdx) => {
          // For AI messages: find preceding user message to get its mode
          const precedingMeta = msg.role === 'assistant'
            ? (() => {
                for (let i = msgIdx - 1; i >= 0; i--) {
                  if (messages[i].role === 'user') return messageMetaRef.current[messages[i].id];
                }
                return undefined;
              })()
            : undefined;
          return (
            <ChatMessage
              key={msg.id}
              message={msg}
              meta={messageMetaRef.current[msg.id]}
              isHistorical={historicalMsgIds.current.has(msg.id)}
              changeStatuses={changeStatuses}
              // Wrap apply so we capture a before/after snapshot keyed by
              // this assistant message's id — used by safe-revert later.
              onApplyChange={(change) => captureSnapshotAndApply(change, msg.id)}
              onDeclineChange={onDeclineChange}
              isStreaming={isLoading}
              onRetry={msg.role === 'user' ? () => handleRetry(msg.id) : undefined}
              onRetryWithTweaks={msg.role === 'user' ? () => handleRetryWithTweaks(msg.id) : undefined}
              onRevert={() => handleRevert(msg.id)}
              onFork={() => handleFork(msg.id)}
              onShare={() => handleShare(msg.id)}
              precedingChatMode={precedingMeta?.chatMode}
              onBuildPlan={msg.role === 'assistant' && precedingMeta?.chatMode === 'plan' ? handleBuildPlan : undefined}
            />
          );
        })}

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

      {/* Branch context pills */}
      {contextBranches.length > 0 && (
        <div className="shrink-0 border-t border-border/60 px-2 py-1.5 flex items-center gap-1 flex-wrap">
          <GitBranch size={10} className="text-muted-foreground/50 shrink-0" />
          <span className="text-[9px] text-muted-foreground/50 mr-0.5">Branches:</span>
          <span className="rounded border border-muted-foreground/20 bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground/70">
            {currentBranch} (current)
          </span>
          {contextBranches.map((b) => (
            <span
              key={b}
              className="flex items-center gap-0.5 rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-300"
            >
              {b}
              <button
                onClick={() => setContextBranches((prev) => prev.filter((x) => x !== b))}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Share dialog overlay */}
      {shareDialog && (
        <div className="shrink-0 border-t border-violet-500/30 bg-violet-500/5 px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Share2 size={11} className="text-violet-400" />
              <span className="text-[11px] font-medium text-foreground/80">Share chat fork</span>
            </div>
            <button onClick={() => setShareDialog(null)} className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors">
              <X size={12} />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mb-2">
            Creates a copy of this conversation (up to the selected message) in the chosen member&apos;s chat history.
          </p>
          <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
            {shareDialog.members.map((m) => {
              const isShared = shareDialog.shared === m.clientId;
              const isSharing = shareDialog.sharing === m.clientId;
              return (
                <button
                  key={m.clientId}
                  disabled={!!shareDialog.sharing}
                  onClick={async () => {
                    setShareDialog((d) => d ? { ...d, sharing: m.clientId } : null);
                    await onForkSession(shareDialog.forkedMsgs, shareDialog.forkedMeta, shareDialog.title, m.clientId);
                    setShareDialog((d) => d ? { ...d, sharing: null, shared: m.clientId } : null);
                    setTimeout(() => setShareDialog(null), 1200);
                  }}
                  className="flex items-center justify-between rounded border border-border/60 bg-muted/30 px-2 py-1.5 text-left text-[10px] hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Users size={9} className="shrink-0 text-muted-foreground/50" />
                    <span className="truncate text-foreground/70 font-mono">{m.clientId.slice(0, 16)}…</span>
                    <span className={cn('shrink-0 rounded px-1 py-0.5 text-[8px]', m.role === 'owner' ? 'bg-violet-500/15 text-violet-400' : 'bg-muted text-muted-foreground/60')}>{m.role}</span>
                  </div>
                  {isShared && <Check size={10} className="shrink-0 text-emerald-500" />}
                  {isSharing && <span className="shrink-0 text-[9px] text-violet-400 animate-pulse">Sending…</span>}
                  {!isShared && !isSharing && <GitFork size={9} className="shrink-0 text-muted-foreground/40" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Retry-with-tweaks bar — appears above input when user clicks "Retry with tweaks" */}
      {retryTweaks && (
        <RetryTweaksBar
          tweaks={retryTweaks}
          agentOptions={agentOptions}
          onCancel={() => setRetryTweaks(null)}
          onSend={(text, mode, agentId, modelId) => {
            setRetryTweaks(null);
            setChatMode(mode);
            setSelectedAgentId(agentId);
            setSelectedModelId(modelId);
            // Truncate messages up to (not including) the original message
            const idx = messages.findIndex((m) => m.id === retryTweaks.messageId);
            if (idx !== -1) {
              const truncated = messages.slice(0, idx);
              const newMeta: Record<string, MessageMeta> = {};
              truncated.forEach((m) => { if (messageMetaRef.current[m.id]) newMeta[m.id] = messageMetaRef.current[m.id]; });
              messageMetaRef.current = newMeta;
              setMessages(truncated);
              onMessagesUpdate(session.id, truncated, newMeta);
            }
            const newPendingMeta: MessageMeta = {
              segments: [{ type: 'text', text }],
              attachments: {},
              chatMode: mode,
              agentId,
              modelId,
            };
            pendingMetaRef.current = newPendingMeta;
            hasInteractedRef.current = true;
            sendMessage(
              { text },
              { body: { attachments: [], mediaAttachments: [], chatContextIds: [], projectId, chatId: session.id, modelId, agentId, webSearch: webSearchEnabled, contextBranches, chatMode: mode } },
            );
          }}
        />
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
        chatMode={chatMode}
        onModeChange={setChatMode}
        canUseChat={canUseChat}
        projectId={projectId}
        currentSessionId={session.id}
        getAllFiles={getAllFiles}
        getFileContent={getFileContent}
        allBranches={allBranches}
        currentBranch={currentBranch}
        contextBranches={contextBranches}
        onBranchAdd={(b) => setContextBranches((prev) => prev.includes(b) ? prev : [...prev, b])}
      />
    </div>
  );
}

// ── RetryTweaksBar ────────────────────────────────────────────────────────────

const CHAT_MODE_OPTIONS: { value: ChatMode; label: string }[] = [
  { value: 'ask', label: 'Ask' },
  { value: 'agent', label: 'Agent' },
  { value: 'auto', label: 'Auto' },
  { value: 'plan', label: 'Plan' },
];

function RetryTweaksBar({
  tweaks,
  agentOptions,
  onCancel,
  onSend,
}: {
  tweaks: { text: string; chatMode: ChatMode; agentId: string; modelId: string };
  agentOptions: Array<{ id: string; label: string }>;
  onCancel: () => void;
  onSend: (text: string, mode: ChatMode, agentId: string, modelId: string) => void;
}) {
  const [text, setText] = useState(tweaks.text);
  const [mode, setMode] = useState<ChatMode>(tweaks.chatMode);
  const [agentId, setAgentId] = useState(tweaks.agentId);

  return (
    <div className="shrink-0 border-t border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-amber-400">Retry with tweaks</span>
        <button onClick={onCancel} className="text-muted-foreground/50 hover:text-foreground transition-colors"><X size={12} /></button>
      </div>
      <textarea
        className="w-full resize-none rounded border border-border bg-muted/30 px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-amber-500/50 min-h-[56px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ChatMode)}
          className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-foreground outline-none"
        >
          {CHAT_MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {mode === 'agent' || mode === 'auto' ? (
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-foreground outline-none max-w-[120px] truncate"
          >
            {agentOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        ) : null}
        <button
          onClick={() => text.trim() && onSend(text.trim(), mode, agentId, tweaks.modelId)}
          disabled={!text.trim()}
          className="ml-auto rounded bg-amber-500/80 px-3 py-1 text-[10px] font-medium text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
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
