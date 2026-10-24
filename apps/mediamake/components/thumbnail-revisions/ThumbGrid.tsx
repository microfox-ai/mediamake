'use client';

import { CheckIcon, FolderOpenIcon, LockIcon, MessageSquareIcon, SmartphoneIcon, StarIcon, XIcon, ZoomInIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { selectActiveRevision, useThumbRevisionsStore } from './store';

/** YouTube's feed shows thumbnails about this wide. */
export const FEED_WIDTH = 246;

export function Badges({ id, compact }: { id: string; compact?: boolean }) {
  const revision = useThumbRevisionsStore(selectActiveRevision);
  const index = useThumbRevisionsStore(s => s.job?.index);
  const comments = revision?.comments.filter(c => c.thumbs.includes(id)).length ?? 0;
  const chip = 'inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold';
  return (
    <span className="flex flex-wrap items-center gap-1">
      {revision?.final.includes(id) && (
        <span className={cn(chip, 'bg-amber-400 text-black')}>
          <StarIcon className="size-3" /> {compact ? '' : revision.final.length > 1 ? 'A/B' : 'Final'}
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
        <Hint label="Locked by Claude (thumbs keep)">
          <span className={cn(chip, 'border border-emerald-500/60 text-emerald-400')}>kept</span>
        </Hint>
      )}
      {index?.picked?.includes(id) && (
        <Hint label="Copied to final/ by Claude (thumbs pick)">
          <span className={cn(chip, 'border border-amber-400/60 text-amber-300')}>in final/</span>
        </Hint>
      )}
    </span>
  );
}

function Tile({ id, note, width }: { id: string; note?: string; width: number }) {
  const render = useThumbRevisionsStore(s => s.renders[id]);
  const selected = useThumbRevisionsStore(s => s.selection.includes(id));
  const dropped = useThumbRevisionsStore(s => selectActiveRevision(s)?.drop.includes(id) ?? false);
  const click = useThumbRevisionsStore(s => s.click);
  const openZoom = useThumbRevisionsStore(s => s.openZoom);
  return (
    <div style={{ width }} className="shrink-0">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Thumbnail ${id}`}
        onClick={e => click(id, { shift: e.shiftKey, only: e.altKey })}
        onDoubleClick={() => {
          click(id, { only: true });
          openZoom(id);
        }}
        className={cn(
          'group relative block aspect-video w-full overflow-hidden rounded-md bg-muted outline-none ring-offset-2 ring-offset-background transition',
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
        <span
          className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
          onClick={e => {
            e.stopPropagation();
            openZoom(id);
          }}
        >
          <ZoomInIcon className="size-3.5" />
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
  const support = useThumbRevisionsStore(s => s.support);
  const pendingJob = useThumbRevisionsStore(s => s.pendingJob);
  const pickJob = useThumbRevisionsStore(s => s.pickJob);
  const sources = useThumbRevisionsStore(s => s.sources);
  if (support === 'browser' || support === 'insecure') {
    return (
      <p className="max-w-md text-sm text-muted-foreground">
        {support === 'browser' ? 'This page needs Chrome, Edge, Arc or Brave: it reads and writes folders on this computer.' : 'Open this page over https or on localhost.'}
      </p>
    );
  }
  return (
    <div className="max-w-md space-y-3 text-center">
      <h2 className="text-lg font-semibold">Review thumbnails</h2>
      <p className="text-sm text-muted-foreground">
        Open a job folder (<code>apps/lyrics_videos/out/thumbnails/&lt;job&gt;</code>), select thumbnails, then pick finals, keep, drop or
        comment. Everything saves next to the renders as a revision Claude reads.
      </p>
      {pendingJob && (
        <p className="text-sm">
          The link asks for <b>{pendingJob}</b>:{' '}
          {sources.some(s => s.status === 'needs-permission') ? 'reconnect its source on the left, or open it.' : 'open its folder.'}
        </p>
      )}
      <Button onClick={() => void pickJob()}>
        <FolderOpenIcon className="size-4" /> Open thumbnails
      </Button>
    </div>
  );
}

export function ThumbGrid() {
  const job = useThumbRevisionsStore(s => s.job);
  const tile = useThumbRevisionsStore(s => s.tile);
  const setTile = useThumbRevisionsStore(s => s.setTile);
  const selection = useThumbRevisionsStore(s => s.selection);
  const selectAll = useThumbRevisionsStore(s => s.selectAll);
  const clearSelection = useThumbRevisionsStore(s => s.clearSelection);
  const openZoom = useThumbRevisionsStore(s => s.openZoom);

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
          <Hint label="Show them at YouTube's feed size">
            <Button variant={tile === FEED_WIDTH ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setTile(tile === FEED_WIDTH ? 300 : FEED_WIDTH)}>
              <SmartphoneIcon className="size-3.5" /> Feed size
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
                <span className="text-amber-400">{style.id}</span> {style.name}
                {style.idea && <span className="font-normal text-muted-foreground"> · {style.idea}</span>}
              </h3>
              <div className="flex flex-wrap gap-4">
                {style.variants.map(v => (
                  <Tile key={v.id} id={v.id} note={v.note} width={tile} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
