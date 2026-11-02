'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileJsonIcon,
  FileVideoIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderTreeIcon,
  HistoryIcon,
  LoaderIcon,
  MessageSquareTextIcon,
  PlusIcon,
  RefreshCwIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { STATUS_LABEL } from '@/lib/revisions/revision-file';
import type { SourceFolder } from '@/lib/revisions/fs';
import { useRevisionsStore, type SourceState } from './store';
import { Hint } from './keyboard';
import { FIT_WIDTH } from './fit-width';

/**
 * A name cut in the middle when it doesn't fit, so its end stays readable:
 * renders of one song differ at the end (-v3, -half.mp4, .map.json).
 */
function MiddleTruncate({
  text,
  tail = 14,
  className,
}: {
  text: string;
  tail?: number;
  className?: string;
}) {
  const cut = Math.max(0, text.length - tail);
  return (
    <span className={cn('flex min-w-0', className)}>
      <span className="truncate">{text.slice(0, cut)}</span>
      <span className="shrink-0 whitespace-pre">{text.slice(cut)}</span>
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-7 items-center justify-between gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {action}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Hint label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={e => {
          e.stopPropagation();
          onClick();
        }}
        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {children}
      </button>
    </Hint>
  );
}

function CurrentVideoFiles() {
  const mapFile = useRevisionsStore(s => s.mapFile);
  const mapError = useRevisionsStore(s => s.mapError);
  const revisionIds = useRevisionsStore(s => s.revisionIds);
  const revisions = useRevisionsStore(s => s.revisions);
  const activeRevisionId = useRevisionsStore(s => s.activeRevisionId);
  const openRevision = useRevisionsStore(s => s.openRevision);

  return (
    <div className="ml-4 border-l pl-2">
      <Hint
        label={
          mapError ??
          (mapFile
            ? 'Shot map for this video'
            : 'No map beside this video: shots and IDs are off')
        }
        side="right"
      >
        <div
          className={cn(
            'flex items-center gap-1.5 py-0.5 text-xs',
            mapFile ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <FileJsonIcon className="size-3.5 shrink-0" />
          <MiddleTruncate
            text={mapFile ?? (mapError ? 'map unreadable' : 'no map.json')}
            tail={18}
          />
        </div>
      </Hint>
      {revisionIds.map(id => {
        const revision = revisions[id];
        return (
          <Hint key={id} label={`Open ${id}.json`} side="right">
            <button
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
                {revision
                  ? `${revision.comments.length} · ${STATUS_LABEL[revision.status]}`
                  : ''}
              </span>
            </button>
          </Hint>
        );
      })}
    </div>
  );
}

function VideoRow({
  name,
  size,
  lastModified,
  active,
  onOpen,
}: {
  name: string;
  size: number;
  lastModified: number;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !active && onOpen()}
      title={name}
      className={cn(
        'flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left hover:bg-muted',
        active && 'bg-muted',
      )}
    >
      <FileVideoIcon className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <MiddleTruncate
          text={name}
          tail={16}
          className={cn('text-xs', active && 'font-medium')}
        />
        <span className="block truncate text-[10px] text-muted-foreground">
          {formatSize(size)} ·{' '}
          {formatDistanceToNow(lastModified, { addSuffix: true })}
        </span>
      </span>
    </button>
  );
}

interface ProjectGroup {
  /** The project folder's path in the source ("" for videos at the top). */
  path: string;
  /** Its own videos, when it has any. */
  folder: SourceFolder | null;
  /** Folders inside it with videos (kept cuts: v1, v2…), by their path inside it. */
  nested: { name: string; folder: SourceFolder }[];
  total: number;
}

/** "my-song", "my-song/v1", "my-song/v2" → one project with two kept cuts under it. */
function groupFolders(folders: SourceFolder[]): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>();
  for (const folder of folders) {
    const [head, ...rest] = folder.path.split('/');
    const group = groups.get(head) ?? {
      path: head,
      folder: null,
      nested: [],
      total: 0,
    };
    if (rest.length) group.nested.push({ name: rest.join('/'), folder });
    else group.folder = folder;
    group.total += folder.videos.length;
    groups.set(head, group);
  }
  return [...groups.values()];
}

function FolderRow({
  label,
  count,
  open,
  current,
  title,
  onToggle,
}: {
  label: string;
  count: number;
  open: boolean;
  current: boolean;
  title: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:bg-muted"
    >
      {open ? (
        <ChevronDownIcon className="size-3 shrink-0" />
      ) : (
        <ChevronRightIcon className="size-3 shrink-0" />
      )}
      <FolderIcon
        className={cn(
          'size-3.5 shrink-0',
          current ? 'text-foreground' : 'text-muted-foreground',
        )}
      />
      <MiddleTruncate
        text={label}
        tail={12}
        className={cn('flex-1', current && 'font-medium')}
      />
      <span className="shrink-0 pl-1 text-[10px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </button>
  );
}

function SourceTree({ source }: { source: SourceState }) {
  const openedFrom = useRevisionsStore(s => s.openedFrom);
  const videoName = useRevisionsStore(s => s.video?.name);
  const connectSource = useRevisionsStore(s => s.connectSource);
  const rescanSource = useRevisionsStore(s => s.rescanSource);
  const removeSource = useRevisionsStore(s => s.removeSource);
  const openSourceVideo = useRevisionsStore(s => s.openSourceVideo);
  const [collapsed, setCollapsed] = useState(false);
  // Folders start closed, except the one being reviewed (and its project),
  // which stays open until it is closed by hand.
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const currentPath =
    openedFrom?.sourceId === source.id ? openedFrom.path : null;
  const total = source.folders.reduce((n, f) => n + f.videos.length, 0);
  const groups = groupFolders(source.folders);

  const holdsCurrent = (path: string) =>
    currentPath !== null &&
    (currentPath === path || currentPath.startsWith(`${path}/`));
  const isOpen = (path: string) =>
    holdsCurrent(path) ? !closed.has(path) : opened.has(path);
  const toggle = (path: string) => {
    const flip = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    };
    if (holdsCurrent(path)) setClosed(flip);
    else setOpened(flip);
  };

  const videoRows = (folder: SourceFolder) =>
    folder.videos.map(v => {
      const active = folder.path === currentPath && v.name === videoName;
      return (
        <div key={v.name}>
          <VideoRow
            name={v.name}
            size={v.size}
            lastModified={v.lastModified}
            active={active}
            onOpen={() => void openSourceVideo(source.id, folder.path, v.name)}
          />
          {active && <CurrentVideoFiles />}
        </div>
      );
    });

  return (
    <div className="px-1.5 pb-1">
      <div className="group flex items-center gap-1 rounded px-1 py-1 hover:bg-muted/60">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          {collapsed ? (
            <ChevronRightIcon className="size-3.5 shrink-0" />
          ) : (
            <ChevronDownIcon className="size-3.5 shrink-0" />
          )}
          <FolderTreeIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium">{source.name}</span>
          {source.status === 'ready' && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {total}
            </span>
          )}
          {source.status === 'scanning' && (
            <LoaderIcon className="size-3 shrink-0 animate-spin text-muted-foreground" />
          )}
        </button>
        <div className="flex opacity-0 group-hover:opacity-100">
          <IconAction
            label="Rescan for new renders"
            onClick={() => void rescanSource(source.id)}
          >
            <RefreshCwIcon className="size-3" />
          </IconAction>
          <IconAction
            label="Remove source (files are untouched)"
            onClick={() => void removeSource(source.id)}
          >
            <XIcon className="size-3" />
          </IconAction>
        </div>
      </div>
      {!collapsed && (
        <div className="ml-2">
          {source.status === 'needs-permission' && (
            <Hint
              label="Chrome asks once per visit unless you choose “Allow on every visit”"
              side="right"
            >
              <Button
                size="sm"
                variant="outline"
                className="my-1 h-6 w-full text-[11px]"
                onClick={() => void connectSource(source.id)}
              >
                Reconnect {source.name}
              </Button>
            </Hint>
          )}
          {source.status === 'missing' && (
            <div className="px-1 py-1 text-[11px] text-destructive">
              Folder moved or deleted.
            </div>
          )}
          {source.status === 'error' && (
            <div className="px-1 py-1 text-[11px] text-destructive">
              Could not read this folder.
            </div>
          )}
          {source.status === 'ready' && source.folders.length === 0 && (
            <div className="px-1 py-1 text-[11px] text-muted-foreground">
              No videos found.
            </div>
          )}
          {groups.map(group => {
            const open = isOpen(group.path);
            return (
              <div key={group.path}>
                <FolderRow
                  label={group.path || '(top level)'}
                  count={group.total}
                  open={open}
                  current={holdsCurrent(group.path)}
                  title={group.path || source.name}
                  onToggle={() => toggle(group.path)}
                />
                {open && (
                  <div className="ml-3">
                    {group.folder && videoRows(group.folder)}
                    {group.nested.map(({ name, folder }) => {
                      const nestedOpen = isOpen(folder.path);
                      return (
                        <div key={folder.path}>
                          <FolderRow
                            label={name}
                            count={folder.videos.length}
                            open={nestedOpen}
                            current={folder.path === currentPath}
                            title={folder.path}
                            onToggle={() => toggle(folder.path)}
                          />
                          {nestedOpen && (
                            <div className="ml-3">{videoRows(folder)}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FilesPanel() {
  const support = useRevisionsStore(s => s.support);
  const folder = useRevisionsStore(s => s.folder);
  const listing = useRevisionsStore(s => s.listing);
  const video = useRevisionsStore(s => s.video);
  const recent = useRevisionsStore(s => s.recent);
  const sources = useRevisionsStore(s => s.sources);
  const openedFrom = useRevisionsStore(s => s.openedFrom);
  const openFolderPicker = useRevisionsStore(s => s.openFolderPicker);
  const openVideoPicker = useRevisionsStore(s => s.openVideoPicker);
  const addSourcePicker = useRevisionsStore(s => s.addSourcePicker);
  const openVideo = useRevisionsStore(s => s.openVideo);
  const resumeRecent = useRevisionsStore(s => s.resumeRecent);
  const forgetRecent = useRevisionsStore(s => s.forgetRecent);
  const refreshFromDisk = useRevisionsStore(s => s.refreshFromDisk);
  const disabled = !support?.supported;

  return (
    <div className="flex h-full min-w-0 flex-col border-r bg-background">
      <div className="flex gap-1.5 border-b p-2">
        <Hint label="Open one folder with a video in it" side="bottom">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 flex-1 px-2 text-xs"
            disabled={disabled}
            onClick={() => void openFolderPicker()}
          >
            <FolderOpenIcon className="size-3.5" /> Folder
          </Button>
        </Hint>
        <Hint label="Open a video file (then confirm its folder)" side="bottom">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 flex-1 px-2 text-xs"
            disabled={disabled}
            onClick={() => void openVideoPicker()}
          >
            <FileVideoIcon className="size-3.5" /> Video
          </Button>
        </Hint>
      </div>
      <ScrollArea className={cn('min-h-0 flex-1', FIT_WIDTH)}>
        <SectionTitle
          action={
            <IconAction
              label="Add a source folder: every project folder inside it is listed on each visit"
              onClick={() => void addSourcePicker()}
            >
              <PlusIcon className="size-3.5" />
            </IconAction>
          }
        >
          <span className="flex items-center gap-1">
            <FolderTreeIcon className="size-3.5" /> Sources
          </span>
        </SectionTitle>
        {sources.length === 0 ? (
          <div className="px-3 pb-2">
            <Button
              size="sm"
              variant="outline"
              className="h-auto w-full whitespace-normal py-1.5 text-[11px]"
              disabled={disabled}
              onClick={() => void addSourcePicker()}
            >
              Add a source folder (e.g. lyrics_videos/out) to list every project
            </Button>
          </div>
        ) : (
          sources.map(source => <SourceTree key={source.id} source={source} />)
        )}

        {folder && listing && !openedFrom && (
          <div className="pb-2">
            <SectionTitle
              action={
                <IconAction
                  label="Re-read the folder"
                  onClick={() => void refreshFromDisk()}
                >
                  <RefreshCwIcon className="size-3" />
                </IconAction>
              }
            >
              <span className="flex min-w-0 items-center gap-1 normal-case">
                <FolderIcon className="size-3.5 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </span>
            </SectionTitle>
            {listing.videos.length === 0 && (
              <div className="px-3 text-xs text-muted-foreground">
                No videos here.
              </div>
            )}
            {listing.videos.map(entry => {
              const active = entry.name === video?.name;
              return (
                <div key={entry.name} className="px-1.5">
                  <VideoRow
                    name={entry.name}
                    size={entry.size}
                    lastModified={entry.lastModified}
                    active={active}
                    onOpen={() => void openVideo(entry.name)}
                  />
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
          <div className="px-3 pb-3 text-xs text-muted-foreground">
            Videos you open show up here.
          </div>
        )}
        {recent.map(entry => {
          const current =
            folder &&
            entry.folderName === folder.name &&
            entry.video === video?.name;
          return (
            <div key={entry.id} className="group flex items-start gap-1 px-1.5">
              <Hint
                label={
                  entry.sourcePath ?? `${entry.folderName}/${entry.video ?? ''}`
                }
                side="right"
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void resumeRecent(entry)}
                  className={cn(
                    'flex min-w-0 flex-1 items-start gap-1.5 rounded px-1.5 py-1 text-left hover:bg-muted',
                    current && 'bg-muted/60',
                  )}
                >
                  <FolderIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <MiddleTruncate
                      text={entry.video ?? entry.folderName}
                      tail={16}
                      className="text-xs"
                    />
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {entry.folderName} ·{' '}
                      {formatDistanceToNow(entry.openedAt, { addSuffix: true })}
                    </span>
                  </span>
                </button>
              </Hint>
              <div className="mt-1 opacity-0 group-hover:opacity-100">
                <IconAction
                  label="Remove from history (files are untouched)"
                  onClick={() => void forgetRecent(entry.id)}
                >
                  <XIcon className="size-3" />
                </IconAction>
              </div>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
