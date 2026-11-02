'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { humanize } from '@/lib/library/model';
import { useLibraryStore } from './store';

/** True once the element has come near the viewport (and stays true): thumbnails load as they scroll in. */
export function useNearView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(entries => entries.some(e => e.isIntersecting) && setNear(true), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}

/** A URL for a `thumbs/…` path from the export, read through the current source; null until ready or when missing. */
export function useCatalogUrl(rel: string | null | undefined): string | null {
  const source = useLibraryStore(s => s.source);
  const generation = useLibraryStore(s => s.generation);
  const [url, setUrl] = useState<{ key: string; url: string | null } | null>(null);
  const key = `${generation}:${rel ?? ''}`;
  useEffect(() => {
    if (!rel || !source) return;
    let live = true;
    void source.urlFor(rel).then(u => live && setUrl({ key, url: u }));
    return () => {
      live = false;
    };
  }, [rel, source, key]);
  return rel && url?.key === key ? url.url : null;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A tile drawn from the name when there is no picture yet: same name, same colours. */
export function GeneratedThumb({ seed, title, label, className, compact }: { seed: string; title: string; label?: string; className?: string; compact?: boolean }) {
  const h = hash(seed) % 360;
  const h2 = (h + 35 + (hash(`${seed}!`) % 50)) % 360;
  return (
    <div
      className={cn('relative flex h-full w-full flex-col justify-between overflow-hidden p-3', className)}
      style={{
        background: `radial-gradient(120% 90% at 0% 0%, hsl(${h} 85% 93%) 0%, transparent 60%), radial-gradient(120% 120% at 100% 100%, hsl(${h2} 75% 84%) 0%, transparent 65%), hsl(${h} 40% 96%)`,
        color: `hsl(${h} 45% 22%)`,
      }}
      aria-hidden
    >
      {label && !compact && <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">{label}</span>}
      <span className={cn('mt-auto font-semibold leading-[1.05] tracking-tight', compact ? 'line-clamp-2 text-[11px]' : 'line-clamp-3 text-xl')}>{title.toLowerCase()}</span>
    </div>
  );
}

const VIDEO = /\.(mp4|webm|mov|m4v)$/i;

export function Thumb({
  image,
  preview,
  seed,
  title,
  label,
  className,
  compact,
  playing,
  fit = 'cover',
}: {
  /** A `thumbs/…` path from the export. */
  image?: string | null;
  /** A short loop in thumbs/, played while `playing`. */
  preview?: string | null;
  seed: string;
  title?: string;
  label?: string;
  className?: string;
  compact?: boolean;
  playing?: boolean;
  fit?: 'cover' | 'contain';
}) {
  const [ref, near] = useNearView<HTMLDivElement>();
  const url = useCatalogUrl(near ? image : null);
  const videoUrl = useCatalogUrl(playing && preview && VIDEO.test(preview) ? preview : null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-muted', className)}>
      {url && url !== failedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local file or the dev server's copy of one
        <img src={url} alt="" className={cn('h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover')} loading="lazy" draggable={false} onError={() => setFailedUrl(url)} />
      ) : (
        <GeneratedThumb seed={seed} title={title ?? humanize(seed)} label={label} compact={compact} />
      )}
      {videoUrl && <video src={videoUrl} autoPlay muted loop playsInline className={cn('absolute inset-0 h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover')} />}
    </div>
  );
}
