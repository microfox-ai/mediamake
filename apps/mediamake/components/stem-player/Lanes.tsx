'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderIcon } from 'lucide-react';
import { clock } from '@/lib/file-revisions/revision-file';
import type { LoopRange } from '@/lib/stem-player/types';
import { selectActiveRevision, usePlayhead, useStemStore } from './store';

/*
 * One waveform lane for each selected track, on one time line, with the playhead across all of
 * them. Click to seek, drag to choose a range to loop. The waveforms are drawn once (grey, and the
 * same in amber under a clip that follows the playhead), so nothing is redrawn while playing: the
 * playhead and the clip are moved straight in the DOM.
 */

const RULER = 16;
const laneHeight = (n: number) => (n <= 1 ? 140 : n <= 3 ? 84 : 52);

const COLORS = { wave: 'rgba(161, 161, 170, 0.7)', played: '#fbbf24', line: 'rgba(161, 161, 170, 0.18)', ruler: 'rgba(161, 161, 170, 0.9)', pin: '#60a5fa' };

function niceStep(duration: number, width: number): number {
  const target = duration / Math.max(1, width / 90);
  for (const step of [1, 2, 5, 10, 15, 30, 60, 120, 300, 600]) if (step >= target) return step;
  return 600;
}

interface Lane {
  uid: string;
  label: string;
  loading: boolean;
  failed: boolean;
  length: number;
  peaks?: Float32Array;
  pins: number[];
}

export function Lanes() {
  const selected = useStemStore(s => s.sel.selected);
  const tracks = useStemStore(s => s.tracks);
  const peaks = useStemStore(s => s.peaks);
  const review = useStemStore(s => s.review);
  const revision = useStemStore(selectActiveRevision);
  const duration = useStemStore(s => s.duration);
  const loop = useStemStore(s => s.loop);
  const looping = useStemStore(s => s.looping);
  const seek = useStemStore(s => s.seek);
  const setLoop = useStemStore(s => s.setLoop);
  const boxRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const playedRef = useRef<HTMLCanvasElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<LoopRange | null>(null);
  const dragRef = useRef<{ startX: number; startT: number; moved: boolean } | null>(null);

  const lanes: Lane[] = useMemo(
    () =>
      selected
        .map(uid => tracks[uid])
        .filter(Boolean)
        .map(t => ({
          uid: t.uid,
          label: t.label,
          loading: t.status === 'loading' || t.status === 'idle',
          failed: t.status === 'error',
          length: t.length ?? 0,
          peaks: peaks[t.uid],
          pins: review === t.folder ? (revision?.comments ?? []).filter(c => c.pin?.t !== undefined && c.images.includes(t.id)).map(c => c.pin!.t!) : [],
        })),
    [selected, tracks, peaks, review, revision],
  );
  const lane = laneHeight(lanes.length);
  const height = Math.max(1, lanes.length) * lane + RULER;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    const dpr = window.devicePixelRatio || 1;
    const paint = (canvas: HTMLCanvasElement | null, color: string, extras: boolean) => {
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const x = (t: number) => (duration ? (t / duration) * width : 0);
      lanes.forEach((l, i) => {
        const top = i * lane;
        const mid = top + lane / 2;
        if (extras && i > 0) {
          ctx.fillStyle = COLORS.line;
          ctx.fillRect(0, top, width, 1);
        }
        ctx.fillStyle = color;
        // a shorter track ends where it ends on the shared time line
        const span = l.peaks && duration ? Math.min(width, Math.round(x(l.length))) : 0;
        if (l.peaks && span > 0) {
          const n = l.peaks.length;
          for (let px = 0; px < span; px++) {
            const from = Math.floor((px / span) * n);
            const to = Math.max(from + 1, Math.floor(((px + 1) / span) * n));
            let p = 0;
            for (let j = from; j < to; j++) if (l.peaks[j] > p) p = l.peaks[j];
            const h = Math.max(0.5, p * (lane / 2 - 4));
            ctx.fillRect(px, mid - h, 1, h * 2);
          }
        } else if (extras) ctx.fillRect(0, mid, width, 1);
        if (extras) {
          ctx.fillStyle = COLORS.pin;
          for (const t of l.pins) {
            const px = x(t);
            ctx.beginPath();
            ctx.moveTo(px - 5, top);
            ctx.lineTo(px + 5, top);
            ctx.lineTo(px, top + 7);
            ctx.closePath();
            ctx.fill();
          }
        }
      });
      if (!extras || !duration) return;
      ctx.fillStyle = COLORS.ruler;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textBaseline = 'bottom';
      const step = niceStep(duration, width);
      for (let t = 0; t < duration; t += step) {
        const px = x(t);
        ctx.fillRect(px, height - 6, 1, 6);
        if (px + 30 < width) ctx.fillText(clock(t).replace(/\.\d$/, ''), px + 3, height - 1);
      }
    };
    paint(baseRef.current, COLORS.wave, true);
    paint(playedRef.current, COLORS.played, false);
  }, [width, height, lane, lanes, duration]);

  usePlayhead(
    useCallback(
      (pos: number, d: number) => {
        const px = d && width ? Math.min(width, (pos / d) * width) : 0;
        if (clipRef.current) clipRef.current.style.width = `${px}px`;
        if (headRef.current) headRef.current.style.transform = `translateX(${px}px)`;
      },
      [width],
    ),
  );

  const timeAt = (clientX: number) => {
    const rect = boxRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };
  const range = drag ?? loop;
  const pct = (t: number) => `${duration ? (t / duration) * 100 : 0}%`;

  return (
    <div className="max-h-[52vh] overflow-y-auto rounded-md bg-zinc-950">
      <div
        ref={boxRef}
        className="relative w-full cursor-crosshair select-none overflow-hidden"
        style={{ height }}
        onPointerDown={e => {
          if (!duration || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { startX: e.clientX, startT: timeAt(e.clientX), moved: false };
        }}
        onPointerMove={e => {
          const d = dragRef.current;
          if (!d) return;
          if (!d.moved && Math.abs(e.clientX - d.startX) < 4) return;
          d.moved = true;
          const t = timeAt(e.clientX);
          setDrag({ start: Math.min(d.startT, t), end: Math.max(d.startT, t) });
        }}
        onPointerUp={e => {
          const d = dragRef.current;
          dragRef.current = null;
          if (!d) return;
          if (!d.moved) return seek(d.startT);
          const t = timeAt(e.clientX);
          const picked = { start: Math.min(d.startT, t), end: Math.max(d.startT, t) };
          setDrag(null);
          if (picked.end - picked.start >= 0.2) {
            setLoop(picked);
            seek(picked.start);
          }
        }}
        onDoubleClick={() => setLoop(null)}
      >
        {range && (
          <div
            className={looping || drag ? 'absolute inset-y-0 border-x border-amber-400/80 bg-amber-400/15' : 'absolute inset-y-0 border-x border-zinc-400/50 bg-zinc-400/10'}
            style={{ left: pct(range.start), width: pct(range.end - range.start) }}
          />
        )}
        <canvas ref={baseRef} style={{ width, height }} className="absolute left-0 top-0 block" />
        <div ref={clipRef} className="absolute left-0 top-0 overflow-hidden" style={{ height, width: 0 }}>
          <canvas ref={playedRef} style={{ width, height }} className="block" />
        </div>
        <div ref={headRef} className="pointer-events-none absolute left-0 top-0 w-px bg-white" style={{ height, willChange: 'transform' }} />
        {lanes.map((l, i) => (
          <div key={l.uid} className="pointer-events-none absolute left-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-200" style={{ top: i * lane + 4 }}>
            <span className="rounded bg-black/50 px-1.5 py-px">{l.label}</span>
            {l.loading && <LoaderIcon className="size-3 animate-spin text-zinc-400" />}
            {l.failed && <span className="rounded bg-black/50 px-1.5 py-px text-red-400">could not be played</span>}
          </div>
        ))}
        {!lanes.length && <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Select a track in the sidebar to hear it</div>}
      </div>
    </div>
  );
}
