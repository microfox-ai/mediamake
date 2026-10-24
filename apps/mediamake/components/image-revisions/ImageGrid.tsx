'use client';

import { CheckIcon, FolderOpenIcon, FolderSearchIcon, LockIcon, MessageSquareIcon, SmartphoneIcon, StarIcon, XIcon, ZoomInIcon } from 'lucide-react';
import { absolutePath, revealOrCopy } from '@/lib/image-revisions/reveal';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { formatOf } from '@/lib/image-revisions/types';
import { selectActiveRevision, useImageRevisionsStore } from './store';

/** Thumbnails, posters or any image set: aspect, small preview size, final count. */
export const useFormat = () => formatOf(useImageRevisionsStore(s => s.job?.index));


export function Badges({ id, compact }: { id: string; compact?: boolean }) {
  const revision = useImageRevisionsStore(selectActiveRevision);
  const index = useImageRevisionsStore(s => s.job?.index);
  const comments = revision?.comments.filter(c => c.images.includes(id)).length ?? 0;
  const chip = 'inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold';
  return (
    <span className="flex flex-wrap items-center gap-1">
      {revision?.final.includes(id) && (
        <span className={cn(chip, 'bg-amber-400 text-black')}>
          <StarIcon className="size-3" /> {compact ? '' : revision.final.length > 1 ? 'A/B' : index?.kind === 'poster' ? 'Cover' : 'Final'}
        </span>
      )}
      {revision?.keep.includes(id) && (
        <span className={cn(chip, 'bg-emerald-500 text-black')}>
          <LockIcon className="size-3" /> {compact ? '' : 'Keep'}
        </span>
      )}
      {revision?.drop.includes(id) && (
        <span className={cn(chip, 'bg-muted-foreground/30')}>
          <XIcon className="size-3" /> {compact ? '' : 'Drop'}
        </span>
      )}
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
  const render = useImageRevisionsStore(s => s.renders[id]);
  const selected = useImageRevisionsStore(s => s.selection.includes(id));
  const dropped = useImageRevisionsStore(s => selectActiveRevision(s)?.drop.includes(id) ?? false);
  const click = useImageRevisionsStore(s => s.click);
  const openZoom = useImageRevisionsStore(s => s.openZoom);
  const index = useImageRevisionsStore(s => s.job?.index);
  // a set of one size shares its shape; a mixed set shows each image's own
  const format = useFormat();
  const aspect = format.aspect ?? (render?.size ? `${render.size[0]} / ${render.size[1]}` : '4 / 3');
  return (
    <div style={{ width }} className="shrink-0">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Image ${id}`}
        onClick={e => click(id, { shift: e.shiftKey, only: e.altKey })}
        style={{ aspectRatio: aspect }}
        onDoubleClick={() => {
          click(id, { only: true });
          openZoom(id);
        }}
        className={cn(
          'group relative block w-full overflow-hidden rounded-md bg-muted outline-none ring-offset-2 ring-offset-background transition',
          selected ? 'ring-[3px] ring-primary' : 'hover:ring-2 hover:ring-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        {render ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={render.url} alt={id} draggable={false} className={cn('size-full object-cover', dropped && 'opacity-35 grayscale')} />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-muted-foreground">no render</span>
        )}
        <span
          className={cn(
            'absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 transition',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/70 bg-black/30 opacity-0 group-hover:opacity-100',
          )}
        >
          {selected && <CheckIcon className="size-3.5" />}
        </span>
        <span className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <Hint label={absolutePath(index) ? 'Show in Finder (copies the path when it can\'t)' : 'Copy the folder name (no path recorded)'}>
            <span
              role="button"
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
            <Badges id={id} compact={width < 200} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const support = useImageRevisionsStore(s => s.support);
  const pendingJob = useImageRevisionsStore(s => s.pendingJob);
  const pickJob = useImageRevisionsStore(s => s.pickJob);
  const sources = useImageRevisionsStore(s => s.sources);
  if (support === 'browser' || support === 'insecure') {
    return (
      <p className="max-w-md text-sm text-muted-foreground">
        {support === 'browser' ? 'This page needs Chrome, Edge, Arc or Brave: it reads and writes folders on this computer.' : 'Open this page over https or on localhost.'}
      </p>
    );
  }
  return (
    <div className="max-w-md space-y-3 text-center">
      <h2 className="text-lg font-semibold">Review images</h2>
      <p className="text-sm text-muted-foreground">
        Open any folder of images, or <code>apps/lyrics_videos/out</code> (every thumbnail and poster set in it is listed). Select some, then pick finals, keep, drop or
        comment. Everything saves next to the renders as a revision Claude reads.
      </p>
      {pendingJob && (
        <p className="text-sm">
          The link asks for <b>{pendingJob}</b>:{' '}
          {sources.some(s => s.status === 'needs-permission') ? 'reconnect its source on the left, or open it.' : 'open its folder.'}
        </p>
      )}
      <Button onClick={() => void pickJob()}>
        <FolderOpenIcon className="size-4" /> Open images
      </Button>
    </div>
  );
}

export function ImageGrid() {
  const job = useImageRevisionsStore(s => s.job);
  const tile = useImageRevisionsStore(s => s.tile);
  const setTile = useImageRevisionsStore(s => s.setTile);
  const selection = useImageRevisionsStore(s => s.selection);
  const selectAll = useImageRevisionsStore(s => s.selectAll);
  const clearSelection = useImageRevisionsStore(s => s.clearSelection);
  const openZoom = useImageRevisionsStore(s => s.openZoom);
  const format = useFormat();

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
        <span className="hidden truncate text-muted-foreground 2xl:inline">Click to select several · ⇧ click a range · double-click to zoom</span>
        <div className="ml-auto flex items-center gap-2">
          <Hint label={format.smallHint}>
            <Button variant={tile === format.small ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setTile(tile === format.small ? 300 : format.small)}>
              <SmartphoneIcon className="size-3.5" /> {format.smallLabel}
            </Button>
          </Hint>
          <Slider className="w-28" min={160} max={640} step={2} value={[tile]} onValueChange={([v]) => setTile(v)} aria-label="Tile size" />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          {job.index.styles.map(style => (
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
  );
}
