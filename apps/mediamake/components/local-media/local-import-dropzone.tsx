'use client';

import { useState } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLocalMedia, type LocalImportSelection } from './local-media-provider';
import { LocalImportDialog } from './local-import-dialog';

const UNSUPPORTED_COPY: Record<string, string> = {
  browser: 'Needs Chrome, Edge, Arc or another Chromium browser.',
  insecure: 'Needs a secure (https or localhost) page.',
  server: 'Loading…',
};

/** Underlined inline action, matching the Upload card's "click to upload". */
function LinkAction({
  children,
  onClick,
  disabled,
  busy,
  busyLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  busyLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

/**
 * "Use files from this computer": pick a folder or files (or drop them) and
 * reference them in place — nothing is uploaded.
 */
export function LocalImportDropzone({
  className,
  defaultTags,
  projects,
  defaultProjectId,
  onImported,
}: {
  className?: string;
  defaultTags?: string[];
  projects?: { id: string; displayName: string }[];
  defaultProjectId?: string | null;
  onImported?: (added: number) => void;
}) {
  const { support, chooseFolder, chooseFiles, selectionFromDrop } = useLocalMedia();
  const [selection, setSelection] = useState<LocalImportSelection | null>(null);
  const [busy, setBusy] = useState<null | 'folder' | 'files' | 'drop'>(null);
  const [dragging, setDragging] = useState(false);

  const run = async (
    kind: 'folder' | 'files' | 'drop',
    get: () => Promise<LocalImportSelection | null>,
  ) => {
    setBusy(kind);
    try {
      const next = await get();
      if (!next) return;
      if (next.candidates.length === 0) {
        toast.info('No video, audio or image files found there.');
        return;
      }
      setSelection(next);
    } catch (err) {
      console.error('[local-media] could not read the selection', err);
      toast.error(err instanceof Error ? err.message : 'Could not read those files');
    } finally {
      setBusy(null);
    }
  };

  const disabled = !support.supported || busy !== null;

  return (
    <>
      <div
        onDragOver={(e) => {
          if (!support.supported) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          if (!support.supported) return;
          e.preventDefault();
          setDragging(false);
          // Read handles synchronously — the DataTransfer empties after this.
          const pending = selectionFromDrop(e.dataTransfer);
          void run('drop', () => pending);
        }}
        className={cn(
          // Same shell as the sibling Upload / Index cards so the row lines up.
          'relative flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          !support.supported && 'opacity-70',
          className,
        )}
      >
        <HardDrive
          className={cn(
            'mx-auto mb-2 h-8 w-8',
            dragging ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <p className="text-sm font-medium mb-2">
          {dragging ? 'Drop to use from this computer' : 'Use files from this computer'}
        </p>
        {support.supported ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <LinkAction
              disabled={disabled}
              busy={busy === 'folder'}
              busyLabel="Scanning…"
              onClick={() => run('folder', () => chooseFolder())}
            >
              Choose folder
            </LinkAction>
            <LinkAction disabled={disabled} busy={busy === 'files'} onClick={() => run('files', chooseFiles)}>
              Choose files
            </LinkAction>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground mt-2">
          {support.supported
            ? 'No upload · browser render only'
            : UNSUPPORTED_COPY[support.reason] ?? 'Not available in this browser.'}
        </p>
        {busy === 'drop' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Reading dropped files…</span>
          </div>
        )}
      </div>

      <LocalImportDialog
        selection={selection}
        onClose={() => setSelection(null)}
        onImported={onImported}
        defaultTags={defaultTags}
        projects={projects}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
