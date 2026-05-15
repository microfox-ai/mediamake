import type { UIMessage } from 'ai';
import type { SelectionContext } from '../middle/types';

export type { SelectionContext };

// ─── Project files (sent to AI for read/search tools) ────────────────────────

export interface ProjectFile {
  fileId: string;
  fileName: string;
  content: string;
  type: 'file' | 'folder';
  parentId: string | null;
}

// ─── Context Attachments ──────────────────────────────────────────────────────

/** A snippet of file content attached inline in a chat message. */
export interface ContextAttachment {
  id: string;
  fileId: string;
  fileName: string;
  startLine: number;
  endLine: number;
  content: string;
}

/** One segment of a rich user message — plain text or an inline attachment chip. */
export type RichSegment =
  | { type: 'text'; text: string }
  | { type: 'attachment'; attachmentId: string };

// ─── AI-proposed changes ──────────────────────────────────────────────────────

export type AIChangeTool = 'edit_lines' | 'insert_lines' | 'delete_lines';

export interface AIChange {
  changeId: string;
  tool: AIChangeTool;
  fileId: string;
  fileName: string;
  /** 1-indexed inclusive. For insert_lines this is the afterLine number. */
  startLine: number;
  endLine: number;
  /** Lines being removed (empty for insert_lines). */
  originalLines: string[];
  /** Lines being added (empty for delete_lines). */
  newLines: string[];
  description: string;
}

// ─── Per-message file change history ─────────────────────────────────────────

/**
 * One file edit that was applied via this message's AI changes. Captured at
 * apply time so retry/revert can safely reverse the change later — but ONLY
 * when the file's current content still matches `contentAfter` (otherwise the
 * user has made manual edits since and we don't want to clobber them).
 */
export interface AppliedFileChange {
  /** Unique key per applied change — typically `${changeId}:${appliedAt}`. */
  id: string;
  fileId: string;
  fileName: string;
  /** AIChange.changeId — lets us correlate to the source AI change. */
  changeId: string;
  /** Full file content snapshot just BEFORE the change was applied. */
  contentBefore: string;
  /** Full file content snapshot just AFTER the change was applied. */
  contentAfter: string;
  /** Apply timestamp (ms epoch). Earlier first when reverting. */
  appliedAt: number;
}

// ─── Session ──────────────────────────────────────────────────────────────────

/** Rich metadata stored alongside a user message for rendering inline chips. */
export interface MessageMeta {
  segments: RichSegment[];
  attachments: Record<string, ContextAttachment>;
  mediaAttachments?: Record<string, MediaAttachment>;
  chatContexts?: Record<string, ChatContextRef>;
  /** Chat config at the time of sending — used to restore settings on retry. */
  chatMode?: string;
  agentId?: string;
  modelId?: string;
  /**
   * AI-driven file changes applied as a result of this assistant message
   * (or the user message that prompted it). Captured at apply time so that
   * retry/revert can safely reverse them.
   */
  appliedFileChanges?: AppliedFileChange[];
  /**
   * Snapshot of all project file states captured the moment the user sent this
   * message.  Used by chat revert so we can restore the exact pre-send state —
   * including files created or deleted by the AI, not just XML-edit-tag changes.
   */
  fileStateAtSend?: Array<{
    fileId: string;
    name: string;
    type: 'file' | 'folder';
    parentId: string | null;
    content: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  /** AI SDK UIMessage array — survives session switches. */
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
  /** messageId → rich segment data for user messages. */
  messageMeta: Record<string, MessageMeta>;
}

export type RightPanelView = 'chat' | 'history' | 'generations';

/** Chat interaction mode. */
export type ChatMode = 'ask' | 'agent' | 'auto' | 'plan';

// ─── Media & chat-context attachments ─────────────────────────────────────────

/** A mediamake media file attached to a chat message for AI analysis. */
export interface MediaAttachment {
  id: string;
  mediaId: string;
  filePath: string;
  fileName: string;
  contentType: string;      // 'image' | 'video' | 'audio' | 'document'
  contentMimeType: string;  // 'image/jpeg' etc.
}

/** A reference to a past chat session attached for AI context. */
export interface ChatContextRef {
  id: string;
  chatId: string;
  chatTitle: string;
}

// ─── Word Generations ─────────────────────────────────────────────────────────

export interface WordHelperEntry {
  helperType: string;
  suggestions: string[];
  chosenSuggestion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WordFileRef {
  fileId: string;
  filePath: string;
}

/** One doc per (projectId, word) — unique word across all helpers. */
export interface WordGeneration {
  id: string;
  projectId: string;
  word: string;
  /** All files where this word was looked up */
  files: WordFileRef[];
  entries: WordHelperEntry[];
  createdAt: string;
  updatedAt: string;
}
