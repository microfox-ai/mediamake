'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  ExternalLink,
  HardDrive,
  HelpCircle,
  Loader2,
  Lock,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLocalMedia } from '@/components/local-media/local-media-provider';
import { useSession } from '@/components/session-provider';
import { cn } from '@/lib/utils';
import { replaceLocalMediaUrls, type LocalMediaRef } from '@/lib/local-media/urls';
import type { LocalMediaStatus } from '@/lib/local-media/types';
import { formatBytes } from './render-stats';

type RefState = LocalMediaStatus | 'unknown';

const STATE_META: Record<RefState, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  ready: { label: 'Ready', tone: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  checking: { label: 'Checking', tone: 'text-muted-foreground', icon: Loader2 },
  'needs-permission': { label: 'Needs access', tone: 'text-amber-600 dark:text-amber-400', icon: Lock },
  missing: { label: 'Missing on disk', tone: 'text-destructive', icon: AlertTriangle },
  unknown: { label: 'Not in this browser', tone: 'text-destructive', icon: HelpCircle },
};

/** Problems with the timeline's local files that would break any render. */
export function useLocalRefProblems(refs: LocalMediaRef[]) {
  const { statuses, getRecord } = useLocalMedia();
  return useMemo(() => {
    const states = refs.map((ref) => ({
      ref,
      state: (getRecord(ref.id) ? statuses[ref.id] ?? 'checking' : 'unknown') as RefState,
    }));
    return {
      states,
      needsAccess: states.filter((s) => s.state === 'needs-permission').length,
      missing: states.filter((s) => s.state === 'missing').length,
      unknown: states.filter((s) => s.state === 'unknown').length,
      checking: states.filter((s) => s.state === 'checking').length,
    };
  }, [refs, statuses, getRecord]);
}

/**
 * Shown in the render modal when the timeline references files on this
 * computer: explains why AWS is off, surfaces files that would break the
 * render, and offers to upload them so AWS can be used for this render.
 */
export function LocalMediaRenderNotice({
  refs,
  inputProps,
  onUseCloudCopies,
}: {
  refs: LocalMediaRef[];
  inputProps: string;
  /** Called with inputProps whose local URLs now point at cloud copies. */
  onUseCloudCopies: (nextInputProps: string) => void;
}) {
  const session = useSession();
  const { reconnect, getRecord, uploadToCloud } = useLocalMedia();
  const problems = useLocalRefProblems(refs);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<null | 'reconnect' | 'upload'>(null);
  const [upload, setUpload] = useState<{ loaded: number; total: number; name: string; index: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const alreadyInCloud = refs.filter((ref) => getRecord(ref.id)?.cloud).length;
  const toUpload = refs.length - alreadyInCloud;
  const uploadBytes = refs.reduce((sum, ref) => {
    const record = getRecord(ref.id);
    return sum + (record && !record.cloud ? record.size : 0);
  }, 0);
  const blocked = problems.missing + problems.unknown > 0;
  const canUpload = !blocked && problems.needsAccess === 0 && problems.checking === 0;

  const handleReconnect = async () => {
    setBusy('reconnect');
    try {
      const { stillBlocked } = await reconnect();
      if (stillBlocked > 0) toast.info('Some files still need access — click Reconnect again.');
    } finally {
      setBusy(null);
    }
  };

  const handleUpload = async () => {
    const abort = new AbortController();
    abortRef.current = abort;
    setBusy('upload');
    try {
      const copies = await uploadToCloud(
        refs.map((r) => r.id),
        {
          clientId: session?.clientId,
          signal: abort.signal,
          onProgress: ({ loaded, total, currentName, index }) =>
            setUpload({ loaded, total, name: currentName, index }),
        },
      );
      const replacements = new Map([...copies].map(([id, copy]) => [id, copy.url]));
      onUseCloudCopies(replaceLocalMediaUrls(inputProps, replacements));
      toast.success(
        toUpload > 0
          ? `Uploaded ${toUpload} file${toUpload === 1 ? '' : 's'} — AWS Lambda is ready`
          : 'Using the cloud copies — AWS Lambda is ready',
        { description: 'Only this render uses the cloud copies; your timeline still points at your local files.' },
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      }
    } finally {
      abortRef.current = null;
      setBusy(null);
      setUpload(null);
    }
  };

  const visible = expanded ? problems.states : problems.states.slice(0, 3);

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <HardDrive className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">
            This timeline uses {refs.length} file{refs.length === 1 ? '' : 's'} from this computer
          </p>
          <p className="text-xs text-muted-foreground">
            {blocked
              ? 'Some files can’t be found here, so no render method will work until they are relinked in the Media library.'
              : 'AWS Lambda can’t reach files on your computer, so it’s turned off. Render in the browser, or upload these files to use AWS.'}
          </p>
        </div>
      </div>

      <ul className="space-y-1">
        {visible.map(({ ref, state }) => {
          const meta = STATE_META[state];
          const Icon = meta.icon;
          const record = getRecord(ref.id);
          return (
            <li key={ref.id} className="flex items-center gap-2 rounded-md bg-background/60 px-2.5 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate" title={record?.relativePath ?? ref.fileName}>
                {record?.name ?? ref.fileName ?? ref.id}
              </span>
              {record && <span className="shrink-0 tabular-nums text-muted-foreground">{formatBytes(record.size)}</span>}
              {record?.cloud && (
                <span className="shrink-0 inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                  <CloudUpload className="h-3 w-3" /> In cloud
                </span>
              )}
              <span className={cn('shrink-0 inline-flex items-center gap-1', meta.tone)}>
                <Icon className={cn('h-3 w-3', state === 'checking' && 'animate-spin')} />
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
      {problems.states.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Show fewer' : `Show all ${problems.states.length}`}
        </button>
      )}

      {busy === 'upload' && upload && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span className="truncate">
              Uploading {upload.name} ({upload.index + 1}/{refs.length})
            </span>
            <span className="shrink-0">
              {formatBytes(upload.loaded)} of {formatBytes(upload.total)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
              style={{ width: `${upload.total ? (upload.loaded / upload.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {problems.needsAccess > 0 && (
          <Button size="sm" variant="outline" onClick={handleReconnect} disabled={busy !== null}>
            {busy === 'reconnect' ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Reconnect access
          </Button>
        )}
        {blocked ? (
          <Button size="sm" variant="secondary" asChild>
            <a href="/media" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open Media library
            </a>
          </Button>
        ) : busy === 'upload' ? (
          <Button size="sm" variant="ghost" onClick={() => abortRef.current?.abort()}>
            Stop upload
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={handleUpload} disabled={!canUpload || busy !== null}>
            <CloudUpload className="mr-1.5 h-3.5 w-3.5" />
            {toUpload > 0
              ? `Upload ${toUpload} file${toUpload === 1 ? '' : 's'} (${formatBytes(uploadBytes)}) & use AWS`
              : 'Use cloud copies & AWS'}
          </Button>
        )}
      </div>
    </div>
  );
}
