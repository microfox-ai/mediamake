'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  CloudUpload,
  HardDrive,
  Layers,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from '@/components/session-provider';
import { cn } from '@/lib/utils';
import { localIdFromMediaFileId, type LocalMediaFile } from '@/lib/local-media/media-file';
import { useLocalMedia } from './local-media-provider';

export type StorageFilterValue = 'all' | 'cloud' | 'local';

type AnyMediaFile = { _id?: unknown; storage?: string; localStatus?: string; cloudUrl?: string; fileName?: string };

export function asLocalFile(file: AnyMediaFile | null | undefined): LocalMediaFile | null {
  return file && file.storage === 'local' ? (file as unknown as LocalMediaFile) : null;
}

/** Small "Local" pill shown on every local item. */
export function LocalMediaBadge({ file, className }: { file: AnyMediaFile; className?: string }) {
  const local = asLocalFile(file);
  if (!local) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-sky-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <HardDrive className="h-3 w-3" />
          Local
          {local.cloudUrl && <Cloud className="h-3 w-3 opacity-80" />}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        <p className="font-medium">On this computer only</p>
        <p className="text-xs opacity-80">
          {local.localRelativePath ?? local.fileName} · works in the editor and Browser render, not AWS.
          {local.cloudUrl ? ' A cloud copy also exists.' : ''}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Covers a local card whose file can't be read, with the one fix. */
export function LocalStatusOverlay({ file, compact = false }: { file: AnyMediaFile; compact?: boolean }) {
  const local = asLocalFile(file);
  const { reconnect, relink } = useLocalMedia();
  const [busy, setBusy] = useState(false);
  if (!local || (local.localStatus !== 'missing' && local.localStatus !== 'needs-permission')) return null;
  const missing = local.localStatus === 'missing';

  const act = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      if (missing) {
        const id = localIdFromMediaFileId(local._id);
        if (id && (await relink(id))) toast.success(`Relinked ${local.fileName}`);
      } else {
        const { stillBlocked } = await reconnect();
        if (stillBlocked > 0) toast.info('Some files still need access — click Reconnect again.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That didn’t work');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/65 p-3 text-center text-white backdrop-blur-[2px]',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {missing ? (
        <AlertTriangle className="h-5 w-5 text-amber-300" />
      ) : (
        <Lock className="h-5 w-5 text-sky-200" />
      )}
      {!compact && (
        <p className="text-xs font-medium leading-tight">
          {missing ? 'File moved or deleted' : 'Access needed after restart'}
        </p>
      )}
      <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs" onClick={act} disabled={busy}>
        {busy ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : missing ? (
          <Link2 className="mr-1 h-3 w-3" />
        ) : (
          <RotateCw className="mr-1 h-3 w-3" />
        )}
        {missing ? 'Relink' : 'Reconnect'}
      </Button>
    </div>
  );
}

/** Upload one local item with progress in a toast. */
export function useUploadLocalToCloud(onUploaded?: () => void) {
  const session = useSession();
  const { uploadToCloud } = useLocalMedia();
  return async (file: LocalMediaFile) => {
    const id = localIdFromMediaFileId(file._id);
    if (!id) return;
    const name = file.fileName ?? 'file';
    const toastId = toast.loading(`Uploading ${name}…`);
    try {
      await uploadToCloud([id], {
        clientId: session?.clientId,
        onProgress: ({ loaded, total }) =>
          toast.loading(`Uploading ${name}… ${total ? Math.round((loaded / total) * 100) : 0}%`, { id: toastId }),
      });
      toast.success(`${name} is now in the cloud too`, {
        id: toastId,
        description: 'The local item stays. AWS renders can use the cloud copy.',
      });
      onUploaded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed', { id: toastId });
    }
  };
}

/** Dropdown entries for a local item (inside a DropdownMenuContent). */
export function LocalMediaMenuItems({
  file,
  onCloudChanged,
}: {
  file: LocalMediaFile;
  onCloudChanged?: () => void;
}) {
  const { relink, remove } = useLocalMedia();
  const upload = useUploadLocalToCloud(onCloudChanged);
  const id = localIdFromMediaFileId(file._id);
  if (!id) return null;

  return (
    <>
      <DropdownMenuSeparator />
      {file.cloudUrl ? (
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard.writeText(file.cloudUrl!).then(() => toast.success('Cloud link copied'));
          }}
        >
          <Cloud className="mr-2 h-4 w-4" />
          Copy cloud link
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          disabled={file.localStatus !== 'ready'}
          onClick={(e) => {
            e.stopPropagation();
            void upload(file);
          }}
        >
          <CloudUpload className="mr-2 h-4 w-4" />
          Upload to cloud
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          void relink(id)
            .then((ok) => ok && toast.success(`Relinked ${file.fileName}`))
            .catch((err) => toast.error(err instanceof Error ? err.message : 'Relink failed'));
        }}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Relink to another file…
      </DropdownMenuItem>
      <DropdownMenuItem
        className="text-red-600"
        onClick={(e) => {
          e.stopPropagation();
          if (
            confirm(
              `Remove “${file.fileName}” from your library?\n\nThe file on your computer is not touched. Timelines using it will show it as missing.`,
            )
          ) {
            void remove([id]).then(() => toast.success('Removed from library'));
          }
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Remove from library
      </DropdownMenuItem>
    </>
  );
}

/** Library-level problems: access lost after a restart, missing files, reload needed. */
export function LocalMediaBanner({ className }: { className?: string }) {
  const { needsPermissionCount, missingCount, workerState, reconnect } = useLocalMedia();
  const [busy, setBusy] = useState(false);

  if (workerState === 'needs-reload') {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm', className)}>
        <RefreshCw className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="flex-1">Reload the page to finish turning on local media.</span>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
  if (needsPermissionCount === 0 && missingCount === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-sm', className)}>
      <HardDrive className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
      <span className="flex-1 min-w-[200px]">
        {needsPermissionCount > 0 && (
          <>
            <strong className="font-medium">{needsPermissionCount} local file{needsPermissionCount === 1 ? '' : 's'}</strong>{' '}
            need{needsPermissionCount === 1 ? 's' : ''} access again (Chrome asks after a restart).{' '}
          </>
        )}
        {missingCount > 0 && (
          <span className="text-muted-foreground">
            {missingCount} file{missingCount === 1 ? ' was' : 's were'} moved or deleted — relink from the card.
          </span>
        )}
      </span>
      {needsPermissionCount > 0 && (
        <Button
          size="sm"
          onClick={async () => {
            setBusy(true);
            try {
              const { stillBlocked } = await reconnect();
              if (stillBlocked > 0) toast.info('Some folders still need access — click Reconnect again.');
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
        >
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCw className="mr-1.5 h-3.5 w-3.5" />}
          Reconnect
        </Button>
      )}
    </div>
  );
}

/** All · Cloud · Local segmented control. */
export function StorageFilter({
  value,
  onChange,
  localCount,
}: {
  value: StorageFilterValue;
  onChange: (value: StorageFilterValue) => void;
  localCount: number;
}) {
  const options: { value: StorageFilterValue; label: string; icon: typeof Layers; hint: string }[] = [
    { value: 'all', label: 'All', icon: Layers, hint: 'Cloud and local media' },
    { value: 'cloud', label: 'Cloud', icon: Cloud, hint: 'Uploaded media — works everywhere, including AWS' },
    { value: 'local', label: 'Local', icon: HardDrive, hint: 'Files on this computer — browser render only' },
  ];
  return (
    <div role="radiogroup" aria-label="Storage" className="inline-flex h-9 items-center rounded-md border bg-muted/40 p-0.5">
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(option.value)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-all',
                  selected
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', selected && option.value === 'local' && 'text-sky-500')} />
                {option.label}
                {option.value === 'local' && localCount > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px] tabular-nums',
                      selected ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : 'bg-muted-foreground/15',
                    )}
                  >
                    {localCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{option.hint}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
