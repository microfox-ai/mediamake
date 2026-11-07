'use client';

import { useRef, useState } from 'react';
import { CheckIcon, FolderOpenIcon, FolderSearchIcon, LockIcon, MessageSquareIcon, MusicIcon, PlayIcon, SmartphoneIcon, StarIcon, XIcon, ZoomInIcon } from 'lucide-react';
import { absolutePath, revealOrCopy } from '@/lib/file-revisions/reveal';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { formatOf } from '@/lib/file-revisions/types';
import { keptIds, playable, selectActiveRevision, useFileRevisionsStore, type Render } from './store';

/** Thumbnails, posters or any set of files: aspect, small preview size, final count. */
export const useFormat = () => formatOf(useFileRevisionsStore(s => s.job?.index));

/** The picture of a file: the image (or a video's still), a video's own frame, or its name for audio with no still. */
export function Still({ render, alt, className }: { render: Render; alt: string; className?: string }) {
  if (render.kind === 'video') return <video src={`${render.url}#t=0.1`} muted playsInline preload="metadata" className={className} />;
  if (render.kind === 'audio')
    return (
      <span className={cn('flex flex-col items-center justify-center gap-1 bg-muted p-2 text-center text-[11px] text-muted-foreground', className)}>
        <MusicIcon className="size-6" />
        {alt}
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={render.url} alt={alt} draggable={false} className={className} />;
}

/** Set when a drag drew a box, so the click that ends it doesn't also select. */
let boxed = false;


/** The marks a file carries in this revision, most decisive first. */
export function marksOf(revision: { final: string[]; keep: string[]; drop: string[] } | null | undefined, id: string) {
  return (['final', 'keep', 'drop'] as const).filter(a => revision?.[a].includes(id));
}

const MARK = {
  final: { icon: StarIcon, className: 'bg-amber-400 text-black', label: 'Final' },
  keep: { icon: LockIcon, className: 'bg-emerald-500 text-black', label: 'Kept' },
  drop: { icon: XIcon, className: 'bg-rose-600 text-white', label: 'Dropped' },
} as const;

/**
 * Final, kept or dropped, as icons on the picture itself, so what was decided reads at a glance.
 * `sm` for a filmstrip, `md` for a grid tile (with words when there is room), `lg` for the zoom view.
 */
export function ActionMarks({ id, size = 'md', words, className }: { id: string; size?: 'sm' | 'md' | 'lg'; words?: boolean; className?: string }) {
  const revision = useFileRevisionsStore(selectActiveRevision);
  const index = useFileRevisionsStore(s => s.job?.index);
  const marks = marksOf(revision, id);
  if (!marks.length) return null;
  const box = { sm: 'size-4', md: words ? 'h-6 px-1.5 gap-1' : 'size-6', lg: 'h-8 px-3 gap-1.5' }[size];
  const icon = { sm: 'size-2.5', md: 'size-3.5', lg: 'size-4' }[size];
  return (
    <span className={cn('pointer-events-none flex items-center gap-1', className)}>
      {marks.map(m => {
        const { icon: Icon, className: tone } = MARK[m];
        const label = m === 'final' && index?.kind === 'poster' ? 'Cover' : MARK[m].label;
        return (
          <span key={m} title={label} aria-label={label} className={cn('flex shrink-0 items-center justify-center rounded-full font-bold shadow-md ring-2 ring-black/40', box, tone, size === 'lg' ? 'text-sm' : 'text-[11px]')}>
            <Icon className={cn(icon, 'shrink-0')} strokeWidth={3} />
            {(size === 'lg' || words) && <span>{label}</span>}
          </span>
        );
      })}
    </span>
  );
}

export function Badges({ id }: { id: string }) {
  const revision = useFileRevisionsStore(selectActiveRevision);
  const index = useFileRevisionsStore(s => s.job?.index);
  const comments = revision?.comments.filter(c => c.images.includes(id)).length ?? 0;
  const chip = 'inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold';
  return (
    <span className="flex flex-wrap items-center gap-1">
      {/* final, keep and drop are marked on the picture itself (ActionMarks) */}
      {comments > 0 && (
        <span className={cn(chip, 'bg-sky-500/20 text-sky-300')}>
          <MessageSquareIcon className="size-3" /> {comments}
        </span>
      )}
      {index?.kept?.includes(id) && (
        <Hint label="Locked by the workflow (kept as it is)">
          <span className={cn(chip, 'border border-emerald-500/60 text-emerald-400')}>kept</span>
        </Hint>
      )}
      {index?.picked?.includes(id) && (
        <Hint label="Delivered as final by the workflow">
          <span className={cn(chip, 'border border-amber-400/60 text-amber-300')}>in final/</span>
        </Hint>
      )}
    </span>
  );
}

function Tile({ id, file, note, width }: { id: string; file: string; note?: string; width: number }) {
  const render = useFileRevisionsStore(s => s.renders[id]);
  const selected = useFileRevisionsStore(s => s.selection.includes(id));
  const dropped = useFileRevisionsStore(s => selectActiveRevision(s)?.drop.includes(id) ?? false);
  const click = useFileRevisionsStore(s => s.click);
  const openZoom = useFileRevisionsStore(s => s.openZoom);
  const index = useFileRevisionsStore(s => s.job?.index);
  // once something is selected, a plain click adds or removes a file instead of opening it
  const selecting = useFileRevisionsStore(s => s.selection.length > 0);
  // a set of one size shares its shape; a mixed set shows each image's own
  const format = useFormat();
  const aspect = format.aspect ?? (render?.size ? `${render.size[0]} / ${render.size[1]}` : '4 / 3');
  const plays = playable(render);
  return (
    <div style={{ width }} className="shrink-0">
      <button
        type="button"
        data-tile={id}
        aria-pressed={selected}
        aria-label={`${plays ? (plays.kind === 'video' ? 'Video' : 'Audio') : 'Image'} ${id}`}
        onClick={e => {
          if (boxed) return;
          e.stopPropagation();
          // a click opens the file; ⌘ or ⇧ click, the circle, or any click while selecting, selects
          if (e.shiftKey || e.metaKey || e.ctrlKey) click(id, { shift: e.shiftKey, toggle: true });
          else if (selecting) click(id, { toggle: true });
          else openZoom(id);
        }}
        style={{ aspectRatio: aspect }}
        className={cn(
          'group relative block w-full overflow-hidden rounded-md bg-muted outline-none ring-offset-2 ring-offset-background transition',
          selected ? 'ring-[3px] ring-primary' : 'hover:ring-2 hover:ring-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        {render ? (
          <Still render={render} alt={id} className={cn('size-full object-cover', dropped && 'opacity-35 grayscale')} />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-muted-foreground">no render</span>
        )}
        <ActionMarks id={id} words={width >= 200} className="absolute bottom-1.5 left-1.5" />
        {plays && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 p-1 text-white">
            {plays.kind === 'video' ? <PlayIcon className="size-3" /> : <MusicIcon className="size-3" />}
          </span>
        )}
        <span
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${id}`}
          data-no-box
          onClick={e => {
            if (boxed) return;
            e.stopPropagation();
            click(id, { shift: e.shiftKey, toggle: true });
          }}
          className={cn(
            'absolute left-1 top-1 flex size-7 cursor-pointer items-center justify-center rounded-full transition',
            !selected && !selecting && 'opacity-0 group-hover:opacity-100',
          )}
        >
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full border-2 transition',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/80 bg-black/40 hover:border-white hover:bg-black/60',
            )}
          >
            {selected && <CheckIcon className="size-3.5" />}
          </span>
        </span>
        <span className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <Hint label={absolutePath(index) ? 'Show in Finder (copies the path when it can\'t)' : 'Copy the folder name (no path recorded)'}>
            <span
              role="button"
              data-no-box
              aria-label={`Show ${id} in Finder`}
              className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
              onClick={e => {
                e.stopPropagation();
                void revealOrCopy(absolutePath(index, file), index?.job ?? id);
              }}
            >
              <FolderSearchIcon className="size-3.5" />
            </span>
          </Hint>
          <span
            role="button"
            data-no-box
            aria-label={`Zoom in on ${id}`}
            className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
            onClick={e => {
              e.stopPropagation();
              openZoom(id);
            }}
          >
            <ZoomInIcon className="size-3.5" />
          </span>
        </span>
      </button>
      <div className="mt-1 flex items-start gap-1.5">
        <span className="rounded bg-amber-400 px-1.5 text-xs font-extrabold text-black">{id}</span>
        <div className="min-w-0 flex-1">
          {width >= 200 && note && <div className="truncate text-xs text-muted-foreground">{note}</div>}
          <div className="mt-0.5">
            <Badges id={id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const support = useFileRevisionsStore(s => s.support);
  const pendingJob = useFileRevisionsStore(s => s.pendingJob);
  const pickJob = useFileRevisionsStore(s => s.pickJob);
  const sources = useFileRevisionsStore(s => s.sources);
  if (support === 'browser' || support === 'insecure') {
    return (
      <p className="max-w-md text-sm text-muted-foreground">
        {support === 'browser' ? 'This page needs Chrome, Edge, Arc or Brave: it reads and writes folders on this computer.' : 'Open this page over https or on localhost.'}
      </p>
    );
  }
  return (
    <div className="max-w-md space-y-3 text-center">
      <h2 className="text-lg font-semibold">Review files</h2>
      <p className="text-sm text-muted-foreground">
        Open any folder of images, videos or audio, or <code>apps/lyrics_videos/out</code> (every thumbnail and poster set in it is listed). Select some, then pick
        finals, keep, drop or comment. Everything saves next to the files as a revision Claude reads.
      </p>
      {pendingJob && (
        <p className="text-sm">
          The link asks for <b>{pendingJob}</b>:{' '}
          {sources.some(s => s.status === 'needs-permission') ? 'reconnect its source on the left, or open it.' : 'open its folder.'}
        </p>
      )}
      <Button onClick={() => void pickJob()}>
        <FolderOpenIcon className="size-4" /> Open a folder
      </Button>
    </div>
  );
}

export function FileGrid() {
  const job = useFileRevisionsStore(s => s.job);
  const tile = useFileRevisionsStore(s => s.tile);
  const setTile = useFileRevisionsStore(s => s.setTile);
  const selection = useFileRevisionsStore(s => s.selection);
  const selectAll = useFileRevisionsStore(s => s.selectAll);
  const clearSelection = useFileRevisionsStore(s => s.clearSelection);
  const openZoom = useFileRevisionsStore(s => s.openZoom);
  const format = useFormat();
  const keepMode = useFileRevisionsStore(s => s.keepMode);
  const toggleKeepMode = useFileRevisionsStore(s => s.toggleKeepMode);
  const kept = keptIds(useFileRevisionsStore(selectActiveRevision));
  const contentRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  /** Drag a box over tiles to select them (⇧ or ⌘ adds them to the selection); near an edge it scrolls. */
  const startBox = (e: React.MouseEvent) => {
    const content = contentRef.current;
    const viewport = content?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (e.button !== 0 || !content || !viewport || (e.target as HTMLElement).closest('[data-no-box],[data-slot="scroll-area-scrollbar"]')) return;
    const store = useFileRevisionsStore.getState();
    const base = e.shiftKey || e.metaKey || e.ctrlKey ? store.selection : [];
    const tiles = [...content.querySelectorAll<HTMLElement>('[data-tile]')];
    const at = (x: number, y: number) => {
      const r = content.getBoundingClientRect();
      return { x: x - r.left, y: y - r.top };
    };
    const start = at(e.clientX, e.clientY);
    let pointer = { x: e.clientX, y: e.clientY };
    let active = false;
    let frame = 0;
    const update = () => {
      const r = content.getBoundingClientRect();
      const now = at(pointer.x, pointer.y);
      if (!active && Math.hypot(now.x - start.x, now.y - start.y) < 6) return;
      active = true;
      const b = { x: Math.min(start.x, now.x), y: Math.min(start.y, now.y), w: Math.abs(now.x - start.x), h: Math.abs(now.y - start.y) };
      setBox(b);
      const hits = tiles
        .filter(t => {
          const tr = t.getBoundingClientRect();
          const x = tr.left - r.left;
          const y = tr.top - r.top;
          return x < b.x + b.w && x + tr.width > b.x && y < b.y + b.h && y + tr.height > b.y;
        })
        .map(t => t.dataset.tile!);
      store.setSelection(hits, base);
    };
    const tick = () => {
      const vr = viewport.getBoundingClientRect();
      const edge = 40;
      const dy = pointer.y < vr.top + edge ? pointer.y - vr.top - edge : pointer.y > vr.bottom - edge ? pointer.y - vr.bottom + edge : 0;
      if (active && dy) {
        viewport.scrollTop += Math.max(-30, Math.min(30, dy / 2));
        update();
      }
      frame = requestAnimationFrame(tick);
    };
    const move = (ev: MouseEvent) => {
      pointer = { x: ev.clientX, y: ev.clientY };
      update();
    };
    const up = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setBox(null);
      if (!active) return;
      // the click that ends the drag selects nothing more
      boxed = true;
      setTimeout(() => (boxed = false));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    frame = requestAnimationFrame(tick);
  };

  if (!job) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap border-b px-3 text-xs">
        <span className="font-medium tabular-nums">{selection.length ? `${selection.length} selected` : 'Nothing selected'}</span>
        <Hint label="Select all" keys="Mod A">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={selectAll}>
            All
          </Button>
        </Hint>
        <Hint label="Clear the selection" keys="Esc">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={!selection.length} onClick={clearSelection}>
            None
          </Button>
        </Hint>
        <Hint label="Zoom in on the selection (or everything)" keys="Space">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => openZoom()}>
            <ZoomInIcon className="size-3.5" /> Zoom
          </Button>
        </Hint>
        <span className="hidden truncate text-muted-foreground 2xl:inline">Click to open · the circle, ⌘ click or a box to select · ⇧ click a range · while selecting, a click adds</span>
        <div className="ml-auto flex items-center gap-2">
          <Hint label="Keep Mode: show only what is kept or final" keys="P">
            <Button variant={keepMode ? 'default' : 'ghost'} size="sm" className={cn('h-7 px-2 text-xs', keepMode && 'bg-emerald-500 text-black hover:bg-emerald-400')} onClick={toggleKeepMode}>
              <LockIcon className="size-3.5" /> Keep Mode{keepMode ? ` · ${kept.size}` : ''}
            </Button>
          </Hint>
          <Hint label={format.smallHint}>
            <Button variant={tile === format.small ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setTile(tile === format.small ? 300 : format.small)}>
              <SmartphoneIcon className="size-3.5" /> {format.smallLabel}
            </Button>
          </Hint>
          <Slider className="w-28" min={160} max={640} step={2} value={[tile]} onValueChange={([v]) => setTile(v)} aria-label="Tile size" />
        </div>
      </div>
      <div
        className="min-h-0 flex-1 select-none"
        onMouseDown={startBox}
        onClick={e => {
          // a click on empty space clears the selection, as in Finder
          if (!boxed && !(e.target as HTMLElement).closest('[data-slot="scroll-area-scrollbar"]')) clearSelection();
        }}
        onContextMenu={e => {
          // Ctrl-click on a Mac opens the context menu instead of clicking: treat it as ⌘ click
          if (!e.ctrlKey) return;
          e.preventDefault();
          const id = (e.target as HTMLElement).closest<HTMLElement>('[data-tile]')?.dataset.tile;
          if (id) useFileRevisionsStore.getState().click(id, { shift: e.shiftKey, toggle: true });
        }}
      >
        <ScrollArea className="h-full">
          <div ref={contentRef} className="relative space-y-6 p-4">
            {box && <div className="pointer-events-none absolute z-10 rounded-sm border border-primary bg-primary/15" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
            {keepMode && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs">
                <LockIcon className="size-3.5 text-emerald-500" />
                <span>
                  <b>Keep Mode</b>: showing the {kept.size} kept or final {kept.size === 1 ? 'file' : format.noun}.
                </span>
                <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={toggleKeepMode}>
                  Show all (P)
                </Button>
              </div>
            )}
            {job.index.styles
              .map(style => (keepMode ? { ...style, variants: style.variants.filter(v => kept.has(v.id)) } : style))
              .filter(style => style.variants.length)
              .map(style => (
              <section key={style.id}>
                <h3 className="mb-2 text-sm font-semibold">
                  {/* a one-group set made from a folder has nothing to label */}
                  {style.id !== 'all' && <span className="text-amber-400">{style.id}</span>} {style.name}
                  {style.idea && <span className="font-normal text-muted-foreground"> · {style.idea}</span>}
                </h3>
                <div className="flex flex-wrap gap-4">
                  {style.variants.map(v => (
                    <Tile key={v.id} id={v.id} file={v.file} note={v.note} width={tile} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
