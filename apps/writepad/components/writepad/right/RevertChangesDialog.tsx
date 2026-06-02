'use client';

/**
 * RevertChangesDialog
 *
 * Confirmation dialog shown when the user clicks Retry or Revert on a chat
 * message that produced AI file changes. Lets them choose between:
 *   - Revert files + do chat action (full undo)
 *   - Keep files + do chat action (just truncate the chat)
 *   - Cancel (do nothing)
 *
 * Files that have been manually edited since the AI applied them are listed
 * separately as "skipped" — they CANNOT be safely reverted regardless of which
 * option the user picks (we never clobber manual edits).
 */

import {
  X,
  RotateCcw,
  Undo2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Trash2,
  FilePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RevertChangesDialogProps {
  /** Which chat-action triggered this dialog. */
  kind: 'retry' | 'revert';
  /** Files whose current content matches the AI's after-state — safe to revert. */
  revertable: Array<{ fileName: string }>;
  /** Files that were manually edited since AI applied — cannot be safely reverted. */
  manualEdits: Array<{ fileName: string; reason: string }>;
  /** Files already at pre-AI state (informational). */
  alreadyClean: string[];
  /** Files created by AI after the send — will be deleted on revert. */
  toDelete?: Array<{ fileName: string }>;
  /** Files deleted by AI after the send — will be restored on revert. */
  toRestore?: Array<{ fileName: string }>;
  onConfirmWithRevert: () => void;
  onConfirmKeepFiles: () => void;
  onCancel: () => void;
}

export function RevertChangesDialog({
  kind,
  revertable,
  manualEdits,
  alreadyClean,
  toDelete = [],
  toRestore = [],
  onConfirmWithRevert,
  onConfirmKeepFiles,
  onCancel,
}: RevertChangesDialogProps) {
  const actionLabel = kind === 'retry' ? 'Retry' : 'Revert';
  const ActionIcon = kind === 'retry' ? RotateCcw : Undo2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl mx-4">
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ActionIcon size={14} className="text-violet-400" />
            <span className="text-[12px] font-medium text-foreground">
              {actionLabel} — also revert AI file changes?
            </span>
          </div>
          <button
            onClick={onCancel}
            className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="space-y-3 p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {toDelete.length > 0 || toRestore.length > 0
              ? 'This restores project files to exactly the state they were in when you sent this message.'
              : 'This message and the responses after it produced AI-applied file changes.'}
            {' '}Choose whether to undo those file changes too, or keep them as-is.
          </p>

          {/* Revertable */}
          {revertable.length > 0 && (
            <section className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                <Undo2 size={10} />
                Will revert ({revertable.length})
              </p>
              <ul className="space-y-1">
                {revertable.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                    <FileText size={10} className="shrink-0 text-violet-400/60" />
                    <span className="truncate font-mono">{f.fileName}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Files to delete (AI-created) */}
          {toDelete.length > 0 && (
            <section className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                <Trash2 size={10} />
                Will delete — AI created ({toDelete.length})
              </p>
              <ul className="space-y-1">
                {toDelete.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                    <FileText size={10} className="shrink-0 text-rose-400/60" />
                    <span className="truncate font-mono line-through decoration-rose-400/50">{f.fileName}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Files to restore (AI-deleted) */}
          {toRestore.length > 0 && (
            <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <FilePlus size={10} />
                Will restore — AI deleted ({toRestore.length})
              </p>
              <ul className="space-y-1">
                {toRestore.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                    <FileText size={10} className="shrink-0 text-emerald-400/60" />
                    <span className="truncate font-mono">{f.fileName}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Manual edits — skipped no matter what */}
          {manualEdits.length > 0 && (
            <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                <AlertTriangle size={10} />
                Will keep — has your manual edits ({manualEdits.length})
              </p>
              <ul className="space-y-1">
                {manualEdits.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                    <FileText size={10} className="shrink-0 text-amber-400/60" />
                    <span className="truncate font-mono">{f.fileName}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] leading-relaxed text-amber-300/70">
                These files have changed since the AI applied to them — they won&rsquo;t be
                touched, regardless of your choice.
              </p>
            </section>
          )}

          {/* Already clean — informational */}
          {alreadyClean.length > 0 && (
            <section className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                <CheckCircle2 size={10} />
                Already at pre-AI state ({alreadyClean.length})
              </p>
              <ul className="space-y-1">
                {alreadyClean.map((name, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                    <FileText size={10} className="shrink-0 text-muted-foreground/40" />
                    <span className="truncate font-mono">{name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onConfirmKeepFiles}
            className="gap-1.5"
          >
            <ActionIcon size={11} />
            {actionLabel} only
          </Button>
          <Button
            size="sm"
            onClick={onConfirmWithRevert}
            disabled={revertable.length === 0 && toDelete.length === 0 && toRestore.length === 0}
            className="gap-1.5 bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-50"
            title={
              revertable.length === 0 && toDelete.length === 0 && toRestore.length === 0
                ? 'No files can be safely reverted'
                : `${actionLabel} and revert files`
            }
          >
            <Undo2 size={11} />
            {actionLabel} & revert files
          </Button>
        </div>
      </div>
    </div>
  );
}
