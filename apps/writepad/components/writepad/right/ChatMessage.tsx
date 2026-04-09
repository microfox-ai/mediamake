'use client';

import type { UIMessage } from 'ai';
import {
  FilePlus,
  Trash2,
  Eye,
  Search,
  Loader2,
  FolderPlus,
  Check,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChangeBlock } from './AIChangeBlock';
import type { AIChange, MessageMeta, ContextAttachment } from './types';

interface ChatMessageProps {
  message: UIMessage;
  meta?: MessageMeta;
  isHistorical?: boolean;
  changeStatuses: Record<string, 'applied' | 'declined'>;
  onApplyChange: (change: AIChange) => void;
  onDeclineChange: (change: AIChange) => void;
}

export function ChatMessage({
  message,
  meta,
  isHistorical = false,
  changeStatuses,
  onApplyChange,
  onDeclineChange,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  function renderUserContent() {
    if (!meta?.segments?.length) {
      const textPart = message.parts?.find((p) => p.type === 'text');
      const text = textPart ? (textPart as { type: 'text'; text: string }).text : '';
      return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
    }
    return (
      <>
        {meta.segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{seg.text}</span>;
          }
          const att: ContextAttachment | undefined = meta.attachments[seg.attachmentId];
          if (!att) return null;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded border border-violet-500/30 bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300 mx-0.5 align-middle"
            >
              {att.fileName}:{att.startLine}–{att.endLine}
            </span>
          );
        })}
      </>
    );
  }

  function renderAssistantContent() {
    if (!message.parts?.length) return null;
    return (
      <div className="flex flex-col gap-1.5">
        {message.parts.map((part, i) => {
          if (part.type === 'step-start') return null;

          if (part.type === 'reasoning') {
            const r = part as { type: 'reasoning'; text: string };
            const t = r.text?.trim();
            if (!t) return null;
            return (
              <details
                key={i}
                className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground/90"
              >
                <summary className="cursor-pointer select-none font-medium text-muted-foreground">
                  Model reasoning
                </summary>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground/80">{r.text}</p>
              </details>
            );
          }

          if (part.type === 'text') {
            const text = (part as { type: 'text'; text: string }).text;
            if (!text) return null;
            return (
              <TextWithEdits
                key={i}
                text={text}
                isHistorical={isHistorical}
                changeStatuses={changeStatuses}
                onApplyChange={onApplyChange}
                onDeclineChange={onDeclineChange}
              />
            );
          }

          if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
            const toolName = part.type === 'dynamic-tool'
              ? (part as { toolName: string }).toolName
              : part.type.slice('tool-'.length);
            const p = part as {
              type: string;
              state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
              input?: unknown; output?: unknown;
            };
            return <ToolWidget key={i} toolName={toolName} state={p.state} input={p.input} output={p.output} />;
          }

          return null;
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'rounded-lg px-3 py-2',
          isUser
            ? 'max-w-[90%] bg-primary/20 text-[12px] text-foreground'
            : 'w-full bg-muted/60',
        )}
      >
        {isUser ? renderUserContent() : renderAssistantContent()}
      </div>
      <span className="text-[9px] text-muted-foreground/40">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ── Tool call widget ──────────────────────────────────────────────────────────

type ToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

function ToolWidget({
  toolName,
  state,
  input,
  output,
}: {
  toolName: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
}) {
  const isPending = state === 'input-streaming' || state === 'input-available';
  const isDone = state === 'output-available';
  const isError = state === 'output-error';
  const inp = (input ?? {}) as Record<string, unknown>;
  const out = (output ?? {}) as Record<string, unknown>;

  if (toolName === 'create_file') {
    const name = String(inp.name ?? out.fileName ?? '…');
    const isFolder = inp.type === 'folder' || out.type === 'folder';
    const Icon = isFolder ? FolderPlus : FilePlus;
    return (
      <div className={cn('flex items-center gap-2.5 rounded-md border px-3 py-2 text-[11px]',
        isDone ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border bg-muted/30',
      )}>
        <Icon size={13} className={cn('shrink-0', isDone ? 'text-emerald-500' : 'text-muted-foreground/50')} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground/80 truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground/60">{isFolder ? 'Folder' : 'File'}</p>
        </div>
        {isPending && <Loader2 size={11} className="animate-spin text-muted-foreground/40 shrink-0" />}
        {isDone && <span className="shrink-0 flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400"><Check size={9} /> Created</span>}
        {isError && <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-500">Failed</span>}
      </div>
    );
  }

  if (toolName === 'delete_file') {
    const name = String(out.fileName ?? inp.fileId ?? '…');
    return (
      <div className={cn('flex items-center gap-2.5 rounded-md border px-3 py-2 text-[11px]',
        isDone ? 'border-red-500/25 bg-red-500/5' : 'border-border bg-muted/30',
      )}>
        <Trash2 size={13} className={cn('shrink-0', isDone ? 'text-red-500' : 'text-muted-foreground/50')} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground/80 truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground/60">Deleted {String(out.deletedCount ?? '')} item{Number(out.deletedCount ?? 1) !== 1 ? 's' : ''}</p>
        </div>
        {isPending && <Loader2 size={11} className="animate-spin text-muted-foreground/40 shrink-0" />}
        {isDone && <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-500">Deleted</span>}
        {isError && <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-500">Failed</span>}
      </div>
    );
  }

  if (toolName === 'read_file') {
    const name = String(inp.fileId ?? out.fileName ?? '…');
    const displayName = String(out.fileName ?? name);
    const lines = out.lineCount != null ? `${out.lineCount} lines` : '';
    return (
      <div className="flex items-center gap-2 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-[11px]">
        <Eye size={11} className="shrink-0 text-muted-foreground/40" />
        <span className="flex-1 min-w-0 text-muted-foreground/70 truncate">Reading {displayName}{lines ? ` · ${lines}` : ''}</span>
        {isPending && <Loader2 size={10} className="animate-spin text-muted-foreground/30 shrink-0" />}
        {isDone && <Check size={10} className="text-muted-foreground/40 shrink-0" />}
      </div>
    );
  }

  if (toolName === 'search_file') {
    const query = String(inp.query ?? '…');
    const fileName = String(out.fileName ?? inp.fileId ?? '');
    const matchCount = out.matchCount != null ? Number(out.matchCount) : null;
    return (
      <div className="flex items-center gap-2 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-[11px]">
        <Search size={11} className="shrink-0 text-muted-foreground/40" />
        <span className="flex-1 min-w-0 text-muted-foreground/70 truncate">
          Search <em className="not-italic text-foreground/60">"{query}"</em>{fileName ? ` in ${fileName}` : ''}
        </span>
        {isPending && <Loader2 size={10} className="animate-spin text-muted-foreground/30 shrink-0" />}
        {isDone && matchCount !== null && (
          <span className="shrink-0 text-[10px] text-muted-foreground/50">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>
        )}
      </div>
    );
  }

  if (toolName === 'web_search') {
    const query = String(inp.query ?? out.query ?? '…');
    const sourceCount = out.sourceCount != null ? Number(out.sourceCount) : null;
    const summary =
      typeof out.summary === 'string' && out.summary.trim().length > 0
        ? out.summary.trim()
        : '';
    const preview = summary.length > 180 ? `${summary.slice(0, 177)}…` : summary;
    return (
      <div
        className={cn(
          'rounded-md border px-2.5 py-2 text-[11px]',
          isDone ? 'border-sky-500/25 bg-sky-500/5' : 'border-border bg-muted/20',
        )}
      >
        <div className="flex items-center gap-2">
          <Globe size={11} className="shrink-0 text-sky-500/70" />
          <span className="min-w-0 flex-1 truncate text-foreground/80">
            Web search: <em className="not-italic text-foreground">"{query}"</em>
          </span>
          {isPending && <Loader2 size={10} className="animate-spin text-muted-foreground/30 shrink-0" />}
          {isDone && sourceCount !== null && (
            <span className="shrink-0 text-[10px] text-muted-foreground/60">
              {sourceCount} source{sourceCount !== 1 ? 's' : ''}
            </span>
          )}
          {isError && (
            <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-500">
              Failed
            </span>
          )}
        </div>
        {isDone && preview && (
          <p className="mt-1.5 whitespace-pre-wrap text-[10px] leading-relaxed text-muted-foreground/80">
            {preview}
          </p>
        )}
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="flex items-center gap-2 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground/60">
      {isPending && <Loader2 size={10} className="animate-spin shrink-0" />}
      {isDone && <Check size={10} className="shrink-0" />}
      <span>{toolName.replace('_', ' ')}{isPending ? '…' : ''}</span>
    </div>
  );
}

// ── XML parser ────────────────────────────────────────────────────────────────

type TextSegment = { kind: 'text'; content: string };
type EditSegment = { kind: 'edit'; change: AIChange };
type Segment = TextSegment | EditSegment;

function parseEdits(text: string): Segment[] {
  const segments: Segment[] = [];
  const RE = /<(edit|insert|delete)(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = RE.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ kind: 'text', content: text.slice(last, match.index) });
    }
    const tag = match[1] as 'edit' | 'insert' | 'delete';
    const attrs = parseAttrs(match[2] ?? '');
    const change = buildChange(tag, attrs, match[3]);
    if (change) segments.push({ kind: 'edit', change });
    last = match.index + match[0].length;
  }

  if (last < text.length) segments.push({ kind: 'text', content: text.slice(last) });
  return segments;
}

function parseAttrs(str: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) out[m[1]] = m[2];
  return out;
}

function buildChange(
  tag: 'edit' | 'insert' | 'delete',
  attrs: Record<string, string>,
  innerContent?: string,
): AIChange | null {
  const { fileId, fileName, description = '' } = attrs;
  if (!fileId || !fileName) return null;
  // Deterministic ID — same edit in the same message always gets the same key
  // so AIChangeBlock never remounts across streaming re-renders.
  const changeId = `${fileId}:${tag}:${attrs.startLine ?? attrs.afterLine ?? 0}:${attrs.endLine ?? 0}:${fileName}`;
  const newContent = innerContent ? innerContent.replace(/^\n/, '').replace(/\n$/, '') : '';

  if (tag === 'insert') {
    const afterLine = Number(attrs.afterLine ?? 0);
    return { changeId, tool: 'insert_lines', fileId, fileName, startLine: afterLine, endLine: afterLine, originalLines: [], newLines: newContent.split('\n'), description };
  }
  if (tag === 'delete') {
    const startLine = Number(attrs.startLine ?? 1);
    const endLine = Number(attrs.endLine ?? startLine);
    return { changeId, tool: 'delete_lines', fileId, fileName, startLine, endLine, originalLines: [], newLines: [], description };
  }
  const startLine = Number(attrs.startLine ?? 1);
  const endLine = Number(attrs.endLine ?? startLine);
  return { changeId, tool: 'edit_lines', fileId, fileName, startLine, endLine, originalLines: [], newLines: newContent.split('\n'), description };
}

// ── TextWithEdits ─────────────────────────────────────────────────────────────

function TextWithEdits({
  text,
  isHistorical,
  changeStatuses,
  onApplyChange,
  onDeclineChange,
}: {
  text: string;
  isHistorical: boolean;
  changeStatuses: Record<string, 'applied' | 'declined'>;
  onApplyChange: (change: AIChange) => void;
  onDeclineChange: (change: AIChange) => void;
}) {
  const segments = parseEdits(text);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          const clean = seg.content.trim();
          if (!clean) return null;
          return (
            <p key={i} className="whitespace-pre-wrap text-[12px] text-foreground/80 leading-relaxed">
              {clean}
            </p>
          );
        }
        const status = changeStatuses[seg.change.changeId] ?? 'applied';
        return (
          <AIChangeBlock
            key={`${seg.change.changeId}-${i}`}
            change={seg.change}
            status={status}
            isHistorical={isHistorical}
            onApply={onApplyChange}
            onDecline={onDeclineChange}
          />
        );
      })}
    </>
  );
}
