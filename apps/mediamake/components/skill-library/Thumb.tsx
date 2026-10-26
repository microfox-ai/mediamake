'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { fileAt } from '@/lib/skill-library/scan';
import { humanize } from '@/lib/skill-library/model';
import type { FileRef } from '@/lib/skill-library/types';
import { useSkillLibraryStore } from './store';

/*
 * Images are read from the folder on demand and kept as object URLs for the
 * current scan; a rescan (new generation) reads them again and frees the old ones.
 */
const urls = new Map<string, Promise<string | null>>();
let cachedGeneration = -1;

function urlFor(ref: FileRef, generation: number): Promise<string | null> {
  if (generation !== cachedGeneration) {
    const old = [...urls.values()];
    urls.clear();
    cachedGeneration = generation;
    // free the previous scan's URLs once anything still showing them has re-rendered
    setTimeout(() => old.forEach(p => void p.then(u => u && URL.revokeObjectURL(u))), 5000);
  }
  let p = urls.get(ref.key);
  if (!p) {
    p = fileAt(ref.dir, ref.file).then(f => (f ? URL.createObjectURL(f) : null));
    urls.set(ref.key, p);
  }
  return p;
}

export function useFileUrl(ref: FileRef | null | undefined): string | null {
  const generation = useSkillLibraryStore(s => s.generation);
  const [url, setUrl] = useState<{ key: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!ref) return;
    let live = true;
    void urlFor(ref, generation).then(u => live && setUrl({ key: `${generation}:${ref.key}`, url: u }));
    return () => {
      live = false;
    };
  }, [ref, generation]);
  return ref && url?.key === `${generation}:${ref.key}` ? url.url : null;
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

export function Thumb({
  image,
  preview,
  seed,
  title,
  label,
  className,
  compact,
  playing,
}: {
  image: FileRef | null;
  preview?: FileRef | null;
  seed: string;
  title?: string;
  label?: string;
  className?: string;
  compact?: boolean;
  /** Play the preview loop (on hover). */
  playing?: boolean;
}) {
  const url = useFileUrl(image);
  const videoUrl = useFileUrl(playing ? preview : null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {url && url !== failedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- object URL of a local file
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} onError={() => setFailedUrl(url)} />
      ) : (
        <GeneratedThumb seed={seed} title={title ?? humanize(seed)} label={label} compact={compact} />
      )}
      {videoUrl && <video src={videoUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />}
    </div>
  );
}
