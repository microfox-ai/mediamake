'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, CheckCircle, XCircle, RotateCcw, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectComment, CommentStatus } from '../commentTypes';

interface CommentsPanelProps {
  comments: ProjectComment[];
  onNavigate: (fileId: string, lineNumber: number) => void;
  onUpdateStatus: (commentId: string, status: CommentStatus) => void;
  onDelete: (commentId: string) => void;
}

type FilterStatus = 'all' | CommentStatus;

const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
];

function statusColor(status: CommentStatus) {
  if (status === 'open') return 'text-amber-400 bg-amber-400/10';
  if (status === 'resolved') return 'text-emerald-400 bg-emerald-400/10';
  return 'text-muted-foreground/50 bg-muted/40';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CommentsPanel({
  comments,
  onNavigate,
  onUpdateStatus,
  onDelete,
}: CommentsPanelProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return comments;
    return comments.filter((c) => c.status === filter);
  }, [comments, filter]);

  const counts = useMemo(() => ({
    all: comments.length,
    open: comments.filter((c) => c.status === 'open').length,
    resolved: comments.filter((c) => c.status === 'resolved').length,
    dismissed: comments.filter((c) => c.status === 'dismissed').length,
  }), [comments]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Filter tabs ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border/60 px-2 py-1.5 flex items-center gap-0.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
              filter === f.id
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground',
            )}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span className={cn(
                'rounded-full px-1 text-[9px]',
                filter === f.id ? 'bg-foreground/15' : 'bg-muted/60',
              )}>
                {counts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Comment list ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <MessageSquare size={24} className="text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground/40">
              {filter === 'all' ? 'No comments yet' : `No ${filter} comments`}
            </p>
            <p className="text-[10px] text-muted-foreground/30">
              Right-click any line in the editor to add a comment
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                confirmDelete={confirmDeleteId === comment.id}
                onNavigate={() => onNavigate(comment.fileId, comment.lineNumber)}
                onUpdateStatus={(s) => onUpdateStatus(comment.id, s)}
                onDeleteRequest={() => setConfirmDeleteId(comment.id)}
                onDeleteCancel={() => setConfirmDeleteId(null)}
                onDeleteConfirm={() => {
                  onDelete(comment.id);
                  setConfirmDeleteId(null);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comment card ──────────────────────────────────────────────────────────────

interface CommentCardProps {
  comment: ProjectComment;
  confirmDelete: boolean;
  onNavigate: () => void;
  onUpdateStatus: (s: CommentStatus) => void;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}

function CommentCard({
  comment,
  confirmDelete,
  onNavigate,
  onUpdateStatus,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: CommentCardProps) {
  return (
    <div className="group px-2 py-2.5 hover:bg-accent/30 transition-colors">
      {/* ── File + line ─────────────────────────────────────────── */}
      <button
        onClick={onNavigate}
        className="flex w-full items-center gap-1 mb-1.5 text-left"
        title="Jump to line"
      >
        <ChevronRight size={10} className="shrink-0 text-muted-foreground/30" />
        <span className="truncate text-[10px] text-violet-400/80 hover:text-violet-300 transition-colors">
          {comment.filePath}
        </span>
        <span className="shrink-0 text-[9px] text-muted-foreground/30">
          :{comment.lineNumber}
        </span>
      </button>

      {/* ── Line content preview ─────────────────────────────── */}
      {comment.lineContent && (
        <p className="mb-1.5 truncate rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/50">
          {comment.lineContent}
        </p>
      )}

      {/* ── Comment text ─────────────────────────────────────── */}
      <p className="mb-2 text-[11px] text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
        {comment.text}
      </p>

      {/* ── Meta row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-medium capitalize',
            statusColor(comment.status),
          )}>
            {comment.status}
          </span>
          <span className="text-[9px] text-muted-foreground/30">
            {formatDate(comment.createdAt)}
          </span>
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        {confirmDelete ? (
          <div className="flex items-center gap-1 text-[9px]">
            <span className="text-destructive/70">Delete?</span>
            <button
              onClick={onDeleteConfirm}
              className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive hover:bg-destructive/20 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={onDeleteCancel}
              className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground hover:bg-accent transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {comment.status !== 'resolved' && (
              <ActionBtn
                title="Mark resolved"
                onClick={() => onUpdateStatus('resolved')}
              >
                <CheckCircle size={12} className="text-emerald-400" />
              </ActionBtn>
            )}
            {comment.status !== 'dismissed' && (
              <ActionBtn
                title="Dismiss"
                onClick={() => onUpdateStatus('dismissed')}
              >
                <XCircle size={12} className="text-muted-foreground/50" />
              </ActionBtn>
            )}
            {comment.status !== 'open' && (
              <ActionBtn
                title="Reopen"
                onClick={() => onUpdateStatus('open')}
              >
                <RotateCcw size={12} className="text-amber-400" />
              </ActionBtn>
            )}
            <ActionBtn
              title="Delete comment"
              onClick={onDeleteRequest}
            >
              <Trash2 size={12} className="text-destructive/50" />
            </ActionBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-0.5 hover:bg-accent transition-colors"
    >
      {children}
    </button>
  );
}
