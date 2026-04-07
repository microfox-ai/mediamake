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

// ─── Session ──────────────────────────────────────────────────────────────────

/** Rich metadata stored alongside a user message for rendering inline chips. */
export interface MessageMeta {
  segments: RichSegment[];
  attachments: Record<string, ContextAttachment>;
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

export type RightPanelView = 'chat' | 'history';
