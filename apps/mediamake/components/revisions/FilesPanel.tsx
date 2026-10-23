'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  FileJsonIcon,
  FileVideoIcon,
  FolderIcon,
  FolderOpenIcon,
  HistoryIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { STATUS_LABEL } from '@/lib/revisions/revision-file';
import { useRevisionsStore } from './store';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex h-7 items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {action}
    </div>
  );
}

function CurrentVideoFiles() {
  const mapFile = useRevisionsStore((s) => s.mapFile);
  const mapError = useRevisionsStore((s) => s.mapError);
  const revisionIds = useRevisionsStore((s) => s.revisionIds);
  const revisions = useRevisionsStore((s) => s.revisions);
  const activeRevisionId = useRevisionsStore((s) => s.activeRevisionId);
  const openRevision = useRevisionsStore((s) => s.openRevision);

  return (
    <div className="ml-5 border-l pl-2">
      <div
        className={cn('flex items-center gap-1.5 py-0.5 text-xs', mapFile ? 'text-foreground' : 'text-muted-foreground')}
        title={mapError ?? undefined}
      >
        <FileJsonIcon className="size-3.5 shrink-0" />
        <span className="truncate">{mapFile ?? (mapError ? 'map unreadable' : 'no map.json')}</span>
      </div>
      {revisionIds.map((id) => {
        const revision = revisions[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => openRevision(id)}
            className={cn(
              'flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-muted',
              id === activeRevisionId && 'bg-muted font-medium',
            )}
          >
            <MessageSquareTextIcon className="size-3.5 shrink-0" />
            <span className="truncate">{revision?.title ?? id}</span>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {revision ? `${revision.comments.length} · ${STATUS_LABEL[revision.status]}` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FilesPanel() {
  const support = useRevisionsStore((s) => s.support);
  const folder = useRevisionsStore((s) => s.folder);
  const listing = useRevisionsStore((s) => s.listing);
  const video = useRevisionsStore((s) => s.video);
  const recent = useRevisionsStore((s) => s.recent);
  const openFolderPicker = useRevisionsStore((s) => s.openFolderPicker);
  const openVideoPicker = useRevisionsStore((s) => s.openVideoPicker);
  const openVideo = useRevisionsStore((s) => s.openVideo);
  const resumeRecent = useRevisionsStore((s) => s.resumeRecent);
  const forgetRecent = useRevisionsStore((s) => s.forgetRecent);
  const refreshFromDisk = useRevisionsStore((s) => s.refreshFromDisk);
  const disabled = !support?.supported;

  return (
    <div className="flex h-full min-w-0 flex-col border-r bg-background">
      <div className="flex gap-1.5 border-b p-2">
        <Button size="sm" variant="secondary" className="h-7 flex-1 text-xs" disabled={disabled} onClick={() => void openFolderPicker()}>
          <FolderOpenIcon className="size-3.5" /> Folder
        </Button>
        <Button size="sm" variant="secondary" className="h-7 flex-1 text-xs" disabled={disabled} onClick={() => void openVideoPicker()}>
          <FileVideoIcon className="size-3.5" /> Video
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {folder && listing && (
          <div className="pb-2">
            <SectionTitle
              action={
                <button type="button" title="Re-read the folder" onClick={() => void refreshFromDisk()} className="hover:text-foreground">
                  <RefreshCwIcon className="size-3" />
                </button>
              }
            >
              <span className="flex min-w-0 items-center gap-1 normal-case">
                <FolderIcon className="size-3.5 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </span>
            </SectionTitle>
            {listing.videos.length === 0 && <div className="px-3 text-xs text-muted-foreground">No videos here.</div>}
            {listing.videos.map((entry) => {
              const active = entry.name === video?.name;
              return (
                <div key={entry.name} className="px-1.5">
                  <button
                    type="button"
                    onClick={() => !active && void openVideo(entry.name)}
                    className={cn(
                      'flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left hover:bg-muted',
                      active && 'bg-muted',
                    )}
                  >
                    <FileVideoIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span className="min-w-0">
                      <span className={cn('block truncate text-xs', active && 'font-medium')}>{entry.name}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {formatSize(entry.size)} · {formatDistanceToNow(entry.lastModified, { addSuffix: true })}
                      </span>
                    </span>
                  </button>
                  {active && <CurrentVideoFiles />}
                </div>
              );
            })}
          </div>
        )}

        <SectionTitle>
          <span className="flex items-center gap-1">
            <HistoryIcon className="size-3.5" /> History
          </span>
        </SectionTitle>
        {recent.length === 0 && (
          <div className="px-3 pb-3 text-xs text-muted-foreground">Folders you open show up here.</div>
        )}
        {recent.map((entry) => {
          const current = folder && entry.folderName === folder.name && entry.video === video?.name;
          return (
            <div key={entry.id} className="group flex items-start gap-1 px-1.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => void resumeRecent(entry)}
                title={entry.sourcePath ?? entry.folderName}
                className={cn(
                  'flex min-w-0 flex-1 items-start gap-1.5 rounded px-1.5 py-1 text-left hover:bg-muted',
                  current && 'bg-muted/60',
                )}
              >
                <FolderIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-xs">{entry.video ?? entry.folderName}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {entry.folderName} · {formatDistanceToNow(entry.openedAt, { addSuffix: true })}
                  </span>
                </span>
              </button>
              <button
                type="button"
                title="Remove from history (files are untouched)"
                onClick={() => void forgetRecent(entry.id)}
                className="mt-1 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
