'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLinkIcon, PlayIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryTile } from '@/lib/catalog/gallery';
import { onYouTubeThumbnailLoad, placeholderBackground, youtubeEmbedUrl } from '@/lib/catalog/video';

/**
 * The gallery of "Made with this" (see galleryTiles): one big stage, like a
 * store listing's first screenshot, and a strip of the others under it. The
 * trailer comes first as the big thumbnail and plays in place when pressed;
 * a picture is shown whole, an uploaded clip plays, and a production with
 * only a link is a titled tile that opens it.
 */
export function ProofGallery({ itemId, tiles }: { itemId: string; tiles: GalleryTile[] }) {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tile = tiles[Math.min(selected, tiles.length - 1)];
  if (!tile) return null;

  const pick = (i: number) => {
    setSelected(i);
    setPlaying(false);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <Stage key={tile.key} itemId={itemId} tile={tile} playing={playing} onPlay={() => setPlaying(true)} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {tile.trailer && <span className="rounded bg-foreground px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-background">Trailer</span>}
          <span className="font-medium">{tile.title}</span>
          {tile.href && (
            <a href={tile.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
              {tile.kind === 'youtube' ? 'On YouTube' : 'See it'} <ExternalLinkIcon className="size-3" />
            </a>
          )}
        </p>
        {tile.description && <p className="line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{tile.description}</p>}
      </div>

      {tiles.length > 1 && (
        <ul className="flex max-w-full snap-x gap-2 overflow-x-auto p-1" aria-label="Everything made with this">
          {tiles.map((entry, i) => (
            <li key={entry.key} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => pick(i)}
                aria-current={i === selected}
                title={entry.title}
                className={cn(
                  'relative block aspect-video w-32 overflow-hidden rounded-md border bg-muted outline-none ring-offset-1 ring-offset-card transition focus-visible:ring-2 focus-visible:ring-ring sm:w-40',
                  i === selected ? 'ring-2 ring-foreground' : 'opacity-80 hover:opacity-100',
                )}
              >
                <Poster itemId={itemId} tile={entry} small />
                {(entry.kind === 'youtube' || entry.kind === 'video') && (
                  <span className="absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white">
                    <PlayIcon className="size-2.5 fill-current" />
                  </span>
                )}
                {entry.trailer && <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Trailer</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What the big stage shows for one tile. */
function Stage({ itemId, tile, playing, onPlay }: { itemId: string; tile: GalleryTile; playing: boolean; onPlay: () => void }) {
  if (tile.kind === 'video' && tile.src) {
    return <video src={tile.src} poster={tile.poster} controls playsInline preload="metadata" className="absolute inset-0 size-full bg-black object-contain" />;
  }
  if (tile.kind === 'youtube' && tile.youtubeId) {
    if (playing) {
      return (
        <iframe
          src={`${youtubeEmbedUrl(tile.youtubeId)}&autoplay=1`}
          title={tile.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      );
    }
    return (
      <button type="button" onClick={onPlay} aria-label={`Play ${tile.title}`} className="group absolute inset-0 size-full">
        <Poster itemId={itemId} tile={tile} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/25">
          <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition group-hover:scale-105 sm:size-20">
            <PlayIcon className="size-7 translate-x-0.5 fill-current sm:size-9" />
          </span>
        </span>
      </button>
    );
  }
  if (tile.kind === 'image' && tile.src) {
    const picture = <Poster itemId={itemId} tile={tile} whole />;
    return tile.href ? (
      <a href={tile.href} target="_blank" rel="noreferrer" aria-label={`See ${tile.title}`} className="absolute inset-0">
        {picture}
      </a>
    ) : (
      picture
    );
  }
  return (
    <div className="absolute inset-0">
      <Poster itemId={itemId} tile={tile} />
      {tile.href && (
        <a
          href={tile.href}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-sm font-medium text-black shadow hover:bg-white"
        >
          See it <ExternalLinkIcon className="size-3.5" />
        </a>
      )}
    </div>
  );
}

/** A tile's picture, or its title on the item's colour when it has none. `whole` fits the picture instead of filling the frame. */
function Poster({ itemId, tile, small, whole }: { itemId: string; tile: GalleryTile; small?: boolean; whole?: boolean }) {
  const img = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);
  // a server-rendered thumbnail can finish loading before hydration, so its onLoad never runs
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth) onYouTubeThumbnailLoad({ currentTarget: img.current });
  }, [tile.poster]);
  if (tile.poster && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={img}
        src={tile.poster}
        alt={small ? '' : tile.title}
        loading={small ? 'lazy' : undefined}
        onLoad={onYouTubeThumbnailLoad}
        onError={() => setBroken(true)}
        className={cn('absolute inset-0 size-full', whole ? 'object-contain' : 'object-cover')}
      />
    );
  }
  return (
    <span className="absolute inset-0 flex items-center justify-center p-3 text-center" style={{ background: placeholderBackground(`${itemId}/${tile.key}`) }}>
      <span className={cn('line-clamp-3 break-words font-semibold leading-tight tracking-tight text-white drop-shadow-sm', small ? 'text-[11px]' : 'text-2xl sm:text-3xl')}>{tile.title}</span>
    </span>
  );
}
