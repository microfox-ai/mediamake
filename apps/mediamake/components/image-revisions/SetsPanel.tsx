'use client';

import { formatDistanceToNow } from 'date-fns';
import { FolderOpenIcon, FolderTreeIcon, HistoryIcon, ImagesIcon, LoaderIcon, PlusIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { useImageRevisionsStore } from './store';

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex h-7 items-center justify-between gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {action}
    </div>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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

function JobRow({ name, title, active, onOpen, extra }: { name: string; title?: string; active: boolean; onOpen: () => void; extra?: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => e.key === 'Enter' && onOpen()}
      className={cn('group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-muted', active && 'bg-muted font-medium')}
    >
      <ImagesIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title ?? name}</span>
        {title && <span className="block truncate text-[10px] text-muted-foreground">{name}</span>}
      </span>
      {extra}
    </div>
  );
}

export function SetsPanel() {
  const job = useImageRevisionsStore(s => s.job);
  const sources = useImageRevisionsStore(s => s.sources);
  const recent = useImageRevisionsStore(s => s.recent);
  const pickJob = useImageRevisionsStore(s => s.pickJob);
  const openJob = useImageRevisionsStore(s => s.openJob);
  const openRecent = useImageRevisionsStore(s => s.openRecent);
  const forget = useImageRevisionsStore(s => s.forgetRecent);
  const addSource = useImageRevisionsStore(s => s.addSource);
  const reconnectSource = useImageRevisionsStore(s => s.reconnectSource);
  const removeSource = useImageRevisionsStore(s => s.removeSource);
  const rescanSources = useImageRevisionsStore(s => s.rescanSources);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <Hint label="Pick any folder of images, or apps/lyrics_videos/out to list every thumbnail and poster set">
          <Button size="sm" className="w-full" onClick={() => void pickJob()}>
            <FolderOpenIcon className="size-4" /> Open images
          </Button>
        </Hint>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <SectionTitle
          action={
            <span className="flex gap-1">
              <IconAction label="Rescan sources" onClick={() => void rescanSources()}>
                <RefreshCwIcon className="size-3.5" />
              </IconAction>
              <IconAction label="Add a source folder (e.g. apps/lyrics_videos/out)" onClick={() => void addSource()}>
                <PlusIcon className="size-3.5" />
              </IconAction>
            </span>
          }
        >
          Sources
        </SectionTitle>
        {!sources.length && (
          <p className="px-3 pb-2 text-xs text-muted-foreground">
            Add <code>apps/lyrics_videos/out</code> once: every image set in it (folders with an index.json) is listed on each visit.
          </p>
        )}
        {sources.map(source => (
          <div key={source.id} className="pb-1">
            <div className="group flex items-center gap-1.5 px-3 py-1 text-xs font-medium">
              <FolderTreeIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{source.name}</span>
              {source.status === 'scanning' && <LoaderIcon className="size-3 animate-spin text-muted-foreground" />}
              <span className="ml-auto opacity-0 group-hover:opacity-100">
                <IconAction label="Remove this source" onClick={() => void removeSource(source.id)}>
                  <XIcon className="size-3.5" />
                </IconAction>
              </span>
            </div>
            {source.status === 'needs-permission' && (
              <Button variant="outline" size="sm" className="mx-3 mb-1 h-6 text-xs" onClick={() => void reconnectSource(source.id)}>
                Reconnect
              </Button>
            )}
            {source.status === 'error' && <p className="px-3 text-xs text-destructive">Could not read this folder</p>}
            <div className="px-1">
              {source.jobs.map(j => (
                <JobRow key={j.path} name={j.name} title={j.title} active={job?.name === j.name} onOpen={() => void openJob(j.handle)} />
              ))}
              {source.status === 'ready' && !source.jobs.length && <p className="px-2 text-xs text-muted-foreground">No jobs yet</p>}
            </div>
          </div>
        ))}
        <SectionTitle>
          <span className="flex items-center gap-1">
            <HistoryIcon className="size-3" /> Recent
          </span>
        </SectionTitle>
        <div className="px-1 pb-2">
          {!recent.length && <p className="px-2 text-xs text-muted-foreground">Nothing opened yet</p>}
          {recent.map(entry => (
            <JobRow
              key={entry.id}
              name={entry.name}
              active={job?.name === entry.name}
              onOpen={() => void openRecent(entry)}
              extra={
                <>
                  <span className="shrink-0 text-[10px] text-muted-foreground group-hover:hidden">{formatDistanceToNow(entry.openedAt)}</span>
                  <span className="hidden group-hover:inline">
                    <IconAction label="Forget" onClick={() => void forget(entry.id)}>
                      <XIcon className="size-3.5" />
                    </IconAction>
                  </span>
                </>
              }
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
