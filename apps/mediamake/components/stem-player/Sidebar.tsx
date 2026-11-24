'use client';

import { useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CopyIcon, FolderOpenIcon, HistoryIcon, LinkIcon, LoaderIcon, RefreshCwIcon, StarIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/revisions/keyboard';
import { cn } from '@/lib/utils';
import { currentKey, isReviewable, levelOf, selectActiveRevision, trimOf, useStemStore, type Row } from './store';

/*
 * The sidebar is the navigation: the folders the user opened, as a tree, and the tracks in them.
 * What is selected here is what is heard. Rows never take the keyboard's focus, so Space always
 * plays and the arrow keys always move the selection (the workspace handles the keys).
 */

const INDENT = 10;

const length = (s: number | undefined) => (typeof s === 'number' ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');

function FolderRow({ row }: { row: Extract<Row, { kind: 'folder' }> }) {
  const folder = useStemStore(s => s.folders[row.key]);
  const root = useStemStore(s => (folder && !folder.parent ? s.roots.find(r => r.id === folder.root) : undefined));
  const current = useStemStore(s => currentKey(s) === row.key);
  const toggleFolder = useStemStore(s => s.toggleFolder);
  const closeRoot = useStemStore(s => s.closeRoot);
  if (!folder) return null;
  const open = folder.expanded && folder.state === 'open';
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;
  return (
    <div
      role="treeitem"
      aria-expanded={open}
      aria-selected={false}
      title={root?.absPath ?? folder.name}
      onClick={() => void toggleFolder(row.key)}
      style={{ paddingLeft: 6 + row.depth * INDENT }}
      className={cn('group flex h-7 cursor-pointer select-none items-center gap-1 rounded pr-1 text-xs hover:bg-muted/60', !folder.parent && 'font-semibold', current && 'text-foreground', !current && folder.parent && 'text-muted-foreground')}
    >
      {folder.state === 'loading' ? <LoaderIcon className="size-3.5 shrink-0 animate-spin" /> : <Chevron className="size-3.5 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{folder.name}</span>
      {folder.state === 'error' && <TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" />}
      {isReviewable(folder) && <span className="shrink-0 rounded bg-muted px-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">versions</span>}
      {folder.state === 'open' && folder.tracks.length > 0 && <span className="shrink-0 font-mono text-[10px] font-normal tabular-nums text-muted-foreground">{folder.tracks.length}</span>}
      {root && (
        <Hint label={`Close ${folder.name} (nothing is deleted)`} side="right">
          <button
            type="button"
            tabIndex={-1}
            onClick={e => {
              e.stopPropagation();
              void closeRoot(root.id);
            }}
            className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:block"
          >
            <XIcon className="size-3.5" />
          </button>
        </Hint>
      )}
    </div>
  );
}

function TrackRow({ row }: { row: Extract<Row, { kind: 'track' }> }) {
  const track = useStemStore(s => s.tracks[row.uid]);
  const selected = useStemStore(s => s.sel.selected.includes(row.uid));
  const focused = useStemStore(s => s.sel.focus === row.uid);
  const heard = useStemStore(s => s.playing && s.heard.includes(row.uid));
  const reviewable = useStemStore(s => isReviewable(track && s.folders[track.folder]));
  const inReview = useStemStore(s => !!track && s.review === track.folder);
  const siblings = useStemStore(s => (track ? (s.folders[track.folder]?.tracks.length ?? 0) : 0));
  const revision = useStemStore(selectActiveRevision);
  const trim = useStemStore(s => trimOf(s, row.uid));
  const clickTrack = useStemStore(s => s.clickTrack);
  const toggleAction = useStemStore(s => s.toggleAction);
  if (!track) return null;
  const isFinal = inReview && !!revision?.final.includes(track.id);
  const dropped = inReview && !!revision?.drop.includes(track.id);
  // notes on this track (a note on all of them is not counted on each)
  const notes = inReview ? (revision?.comments.filter(c => c.images.includes(track.id) && (siblings < 2 || c.images.length < siblings)).length ?? 0) : 0;
  const level = reviewable ? levelOf(track) : null;
  return (
    <div
      role="option"
      aria-selected={selected}
      data-uid={row.uid}
      title={`${track.file}${track.also.length ? ` (also as ${track.also.join(', ')})` : ''}${track.info?.note ? `\n${track.info.note}` : ''}`}
      // a Shift-click selects a range of tracks, not their text
      onMouseDown={e => e.preventDefault()}
      onClick={e => clickTrack(row.uid, { toggle: e.metaKey || e.ctrlKey, range: e.shiftKey })}
      style={{ paddingLeft: 6 + row.depth * INDENT }}
      className={cn(
        'group relative flex h-7 cursor-pointer select-none items-center gap-1.5 rounded pr-1.5 text-xs',
        selected ? 'bg-amber-400/15 text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        focused && 'ring-1 ring-inset ring-amber-400/70',
        dropped && 'opacity-50',
      )}
    >
      <span className={cn('flex size-3.5 shrink-0 items-center justify-center', selected ? 'text-amber-400' : 'text-transparent')}>
        {track.status === 'loading' && selected ? <LoaderIcon className="size-3 animate-spin" /> : <span className={cn('size-1.5 rounded-full bg-current', heard && 'animate-pulse')} />}
      </span>
      <span className={cn('min-w-0 flex-1 truncate', dropped && 'line-through')}>{track.label}</span>
      {isFinal && <span className="shrink-0 rounded bg-amber-400 px-1 text-[9px] font-bold text-black">FINAL</span>}
      {notes > 0 && (
        <span className="shrink-0 rounded-full border px-1 text-[9px]" title={`${notes} note${notes === 1 ? '' : 's'} on it`}>
          {notes} ✎
        </span>
      )}
      {track.status === 'error' && <TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" />}
      {level && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground" title={level.from === 'sidecar' ? "From the folder's remaster.json" : 'Measured here (ITU-R BS.1770)'}>
          {level.lufs.toFixed(1)}
          {trim <= -0.05 && <span className="text-amber-400"> {trim.toFixed(1)}</span>}
        </span>
      )}
      {reviewable && (
        <span className="hidden shrink-0 items-center group-hover:flex">
          <button type="button" tabIndex={-1} title={isFinal ? 'Unmark as the final' : 'This is the one: the final'} onClick={e => (e.stopPropagation(), void toggleAction('final', track.id))} className={cn('rounded p-0.5 hover:bg-muted', isFinal ? 'text-amber-400' : 'hover:text-foreground')}>
            <StarIcon className={cn('size-3.5', isFinal && 'fill-current')} />
          </button>
          <button type="button" tabIndex={-1} title={dropped ? 'Undrop' : 'Drop: not this one'} onClick={e => (e.stopPropagation(), void toggleAction('drop', track.id))} className={cn('rounded p-0.5 hover:bg-muted', dropped ? 'text-destructive' : 'hover:text-foreground')}>
            <XIcon className="size-3.5" />
          </button>
        </span>
      )}
      <span className={cn('w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground', reviewable && 'group-hover:hidden')}>
        {track.status === 'loading' && !selected ? <LoaderIcon className="ml-auto size-3 animate-spin opacity-60" /> : length(track.length)}
      </span>
    </div>
  );
}

function PendingLink() {
  const pendingJob = useStemStore(s => s.pendingJob);
  const known = useStemStore(s => s.known);
  const pickRoot = useStemStore(s => s.pickRoot);
  const openKnown = useStemStore(s => s.openKnown);
  if (!pendingJob) return null;
  // folders opened before that the browser wants a click for again: the link's folder may be under one
  const asleep = known.filter(k => !k.granted);
  return (
    <div className="space-y-1.5 border-b bg-amber-400/10 p-2 text-xs">
      <p className="flex items-start gap-1.5">
        <LinkIcon className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
        <span className="min-w-0 break-words">
          This link is for <b>{pendingJob}</b>. Open that folder once (or a folder above it, to cover later links too).
        </span>
      </p>
      <Button size="sm" variant="outline" className="h-7 w-full text-xs" onClick={() => void pickRoot()}>
        Open its folder
      </Button>
      {asleep.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          or allow one opened before:
          {asleep.slice(0, 6).map(k => (
            <button key={k.id} type="button" tabIndex={-1} onClick={() => void openKnown(k.id)} className="rounded border px-1.5 py-px hover:bg-muted hover:text-foreground">
              {k.name}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

/** Folders given to this page before: a click opens one again. A link is looked up under them without opening them. */
function OpenedBefore() {
  const known = useStemStore(s => s.known);
  const roots = useStemStore(s => s.roots);
  const openKnown = useStemStore(s => s.openKnown);
  const forgetKnown = useStemStore(s => s.forgetKnown);
  const shut = known.filter(k => !roots.some(r => r.known === k.id));
  if (!shut.length) return null;
  return (
    <div className="p-1">
      <div className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <HistoryIcon className="size-3" /> Opened before
      </div>
      {shut.slice(0, 20).map(k => (
        <div key={k.id} onClick={() => void openKnown(k.id)} title={`Open ${k.name}`} className="group flex h-7 cursor-pointer items-center gap-1 rounded px-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
          <span className="min-w-0 flex-1 truncate">{k.name}</span>
          <button type="button" tabIndex={-1} title="Forget this folder (nothing is deleted)" onClick={e => (e.stopPropagation(), void forgetKnown(k.id))} className="hidden rounded p-0.5 hover:bg-muted group-hover:block">
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Sidebar() {
  const rows = useStemStore(s => s.rows);
  const focus = useStemStore(s => s.sel.focus);
  const count = useStemStore(s => s.sel.selected.length);
  const pickRoot = useStemStore(s => s.pickRoot);
  const copySelection = useStemStore(s => s.copySelection);
  const refreshTree = useStemStore(s => s.refreshTree);
  const refreshing = useStemStore(s => s.refreshing);
  const any = useStemStore(s => s.roots.length > 0);
  const listRef = useRef<HTMLDivElement>(null);

  // the arrow keys can walk off the visible part of the list: keep the focused track in view
  useEffect(() => {
    if (!focus) return;
    listRef.current?.querySelector(`[data-uid="${CSS.escape(focus)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-2">
        <Button size="sm" variant="outline" className="h-7 min-w-0 flex-1 justify-start gap-1.5 text-xs" onClick={() => void pickRoot()}>
          <FolderOpenIcon className="size-3.5 shrink-0" /> <span className="truncate">Open folder</span>
        </Button>
        {any && (
          <Hint label="Read the folders again: new, removed and replaced files" keys="R" side="bottom">
            <Button size="sm" variant="ghost" className="h-7 shrink-0 px-1.5" disabled={refreshing} onClick={() => void refreshTree()}>
              <RefreshCwIcon className={cn('size-3.5', refreshing && 'animate-spin')} />
            </Button>
          </Hint>
        )}
        {count > 1 && (
          <span className="shrink-0 whitespace-nowrap rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400" title={`${count} tracks are selected: they play together`}>
            {count} together
          </span>
        )}
        {count > 0 && (
          <Hint label={count > 1 ? `Copy these ${count} tracks, to paste into Claude and say what you want done` : 'Copy this track, to paste into Claude and say what you want done'} keys="Mod C" side="bottom">
            <Button size="sm" variant="ghost" className="h-7 shrink-0 gap-1 px-1.5 text-xs" onClick={() => void copySelection()}>
              <CopyIcon className="size-3.5" /> Copy
            </Button>
          </Hint>
        )}
      </div>
      <PendingLink />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div ref={listRef} role="listbox" aria-multiselectable aria-label="Folders and tracks" className="space-y-px p-1">
          {rows.map(row => (row.kind === 'folder' ? <FolderRow key={`f:${row.key}`} row={row} /> : <TrackRow key={`t:${row.uid}`} row={row} />))}
        </div>
        <OpenedBefore />
      </div>
    </div>
  );
}
