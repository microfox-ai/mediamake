'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { cn } from '@/lib/utils';
import { qualityOf } from '@/lib/library/filter';
import { bytes, duration } from './format';
import { Thumb } from './Thumb';
import { useLibraryStore } from './store';

/** Which card the pointer rests on; its own tiny store so hovering never re-renders the grid. */
const useHover = create<{ id: string | null; rect: DOMRect | null }>(() => ({ id: null, rect: null }));
export const showHover = (id: string, rect: DOMRect) => useHover.setState({ id, rect });
export const hideHover = () => useHover.setState({ id: null, rect: null });

const W = 420;

/** A bigger look at a media card: its loop playing, or its picture, with the facts that matter for picking it. */
export function HoverPreview() {
  const { id, rect } = useHover();
  const item = useLibraryStore(s => (id ? s.library.item[id] : null));
  // the card moves away under a still pointer when the page scrolls: the preview would point at the wrong one
  useEffect(() => {
    if (!id) return;
    window.addEventListener('scroll', hideHover, true);
    window.addEventListener('blur', hideHover);
    return () => {
      window.removeEventListener('scroll', hideHover, true);
      window.removeEventListener('blur', hideHover);
    };
  }, [id]);
  if (!item || !rect) return null;
  const right = rect.right + 12 + W < window.innerWidth;
  const left = right ? rect.right + 12 : Math.max(8, rect.left - 12 - W);
  const top = Math.min(Math.max(8, rect.top - 20), window.innerHeight - 380);
  const wide = (item.width ?? 16) >= (item.height ?? 9);
  const facts = [qualityOf(item), item.width && item.height ? `${item.width}×${item.height}` : null, duration(item.duration), item.fps ? `${Math.round(item.fps)} fps` : null, item.hasAudio === false && item.kind === 'footage' ? 'no audio' : null, bytes(item.bytes)].filter(Boolean);
  return (
    <div className="pointer-events-none fixed z-50 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl" style={{ left, top, width: W }}>
      <Thumb image={item.thumb} preview={item.preview} playing seed={item.subject ?? item.kind} title={item.title} label={item.kind} fit="contain" className={cn('w-full bg-neutral-950', wide ? 'aspect-video' : 'aspect-[4/5]')} />
      <div className="space-y-1.5 p-3">
        <div className="text-sm font-semibold leading-tight">{item.title}</div>
        <div className="font-mono text-[11px] text-muted-foreground">{item.subject ? `${item.kind} · ${item.subject}` : item.kind}</div>
        <div className="text-xs text-muted-foreground">{facts.join(' · ')}</div>
        {item.tags.length > 0 && <div className="line-clamp-2 text-[11px] text-muted-foreground">#{item.tags.join(' #')}</div>}
        {item.source?.tool && <div className="truncate text-[11px] text-muted-foreground">from {item.source.tool}{item.source.title ? `: ${item.source.title}` : ''}</div>}
      </div>
    </div>
  );
}
