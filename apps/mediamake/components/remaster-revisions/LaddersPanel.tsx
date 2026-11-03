'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AudioLinesIcon, FolderOpenIcon, FolderTreeIcon, HistoryIcon, LoaderIcon, PlusIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { useRemasterStore } from './store';

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

function LadderRow({ title, sub, active, onOpen, extra }: { title: string; sub?: string; active: boolean; onOpen: () => void; extra?: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => e.key === 'Enter' && onOpen()}
      className={cn('group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-muted', active && 'bg-muted font-medium')}
    >
      <AudioLinesIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        {sub && <span className="block truncate text-[10px] text-muted-foreground">{sub}</span>}
      </span>
      {extra}
    </div>
  );
}

export function LaddersPanel() {
  const job = useRemasterStore(s => s.job);
  const sources = useRemasterStore(s => s.sources);
  const recent = useRemasterStore(s => s.recent);
  const pendingJob = useRemasterStore(s => s.pendingJob);
  const pickJob = useRemasterStore(s => s.pickJob);
  const openJob = useRemasterStore(s => s.openJob);
  const openRecent = useRemasterStore(s => s.openRecent);
  const forget = useRemasterStore(s => s.forgetRecent);
  const addSource = useRemasterStore(s => s.addSource);
  const reconnectSource = useRemasterStore(s => s.reconnectSource);
  const removeSource = useRemasterStore(s => s.removeSource);
  const rescanSources = useRemasterStore(s => s.rescanSources);
  const openPath = useRemasterStore(s => s.openPath);
  const [path, setPath] = useState('');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <Hint label="Pick a ladder folder (remaster/v1) or a folder above it (Downloads, a channel, a song) to list every ladder in it">
          <Button size="sm" className="w-full" onClick={() => void pickJob()}>
            <FolderOpenIcon className="size-4" /> Open a folder
          </Button>
        </Hint>
        {pendingJob && (
          <p className="mt-2 text-xs text-muted-foreground">
            The link asks for <code className="break-all">{pendingJob}</code>: open its folder, or a folder above it, once.
          </p>
        )}
        <Hint label="While the app runs on this computer (the local dev server) a ladder opens by its path; on the deployed app, open the folder instead">
          <Input
            value={path}
            onChange={e => setPath(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && path.trim()) void openPath(path).then(() => setPath(''));
            }}
            placeholder="…or paste a ladder's path, Enter"
            className="mt-2 h-7 text-xs"
          />
        </Hint>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <SectionTitle
          action={
            <span className="flex gap-1">
              <IconAction label="Rescan sources" onClick={() => void rescanSources()}>
                <RefreshCwIcon className="size-3.5" />
              </IconAction>
              <IconAction label="Add a source folder (e.g. Downloads or a channel folder)" onClick={() => void addSource()}>
                <PlusIcon className="size-3.5" />
              </IconAction>
            </span>
          }
        >
          Sources
        </SectionTitle>
        {!sources.length && <p className="px-3 pb-2 text-xs text-muted-foreground">Add your Downloads (or a channel folder) once: every song's remaster/v&lt;N&gt; ladder in it is listed on each visit.</p>}
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
              {source.ladders.map(l => (
                <LadderRow key={l.path} title={l.song ? `${l.song} · ${l.name}` : l.name} sub={l.path} active={job?.path === l.path} onOpen={() => void openJob(l.handle, l.path)} />
              ))}
              {source.status === 'ready' && !source.ladders.length && <p className="px-2 text-xs text-muted-foreground">No ladders yet</p>}
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
            <LadderRow
              key={entry.id}
              title={entry.name.split('/').slice(-3).join('/')}
              active={(job?.path ?? job?.name) === entry.name}
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
