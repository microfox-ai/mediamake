'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PlayIcon, RepeatIcon, TextCursorInputIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clock, lanesOf, lineOf } from '@/lib/transcript-cleaner/transcript';
import type { TWord } from '@/lib/transcript-cleaner/types';
import { followStart, MIN_WORD, useTranscriptStore, type TimeChange } from './store';
import { isLong, RewriteInput, useRevisionWords, WordMenu } from './WordMenu';

/*
 * A few seconds of the song, zoomed in: the waveform, the playhead, and every word as a block at its time. Drag a
 * word's edges to change its start or end, its middle to move it (⇧ moves the rest of its line with it); a word may
 * run over its neighbours (several voices, a choir), and words that overlap stack in lanes. Right-click a word for its
 * menu. Drag the empty part or scroll to look around; ⌘/Ctrl-scroll zooms. Moved words show their old place as a
 * dashed outline; long words (maybe stretched across a gap) are striped amber.
 *
 * Drag on the waveform (or ⇧-drag anywhere off the words) to select a stretch of the song: play it, loop it, or mark it
 * as words missing (sung there, but the transcript shows none). Marked stretches stay as violet bands.
 */

const LANES_TOP = 6;
const WAVE_HEIGHT = 94;
/** Lane height by how many lanes the song needs: two lanes of room always, so the first overlap doesn't move anything. */
const laneHeight = (lanes: number) => (lanes <= 2 ? 30 : lanes === 3 ? 24 : 20);
const LONG_STRIPES = 'repeating-linear-gradient(135deg, rgba(251,191,36,0.22) 0 6px, rgba(251,191,36,0.06) 6px 12px)';

const COLORS = {
  wave: 'rgba(161, 161, 170, 0.55)',
  played: 'rgba(251, 191, 36, 0.75)',
  grid: 'rgba(161, 161, 170, 0.12)',
  ruler: 'rgba(161, 161, 170, 0.9)',
  playhead: '#ffffff',
  mark: '#ef4444',
};

type Mode = 'start' | 'end' | 'move';

interface Drag {
  mode: Mode;
  i: number;
  x0: number;
  pps: number;
  /** The words that move, with their times when the drag began. */
  group: { i: number; start: number; end: number }[];
  /** How far the drag may go, in seconds (move), or the edge's bounds (start/end). */
  lo: number;
  hi: number;
  moved: boolean;
}

function tickStep(span: number): number {
  if (span <= 5) return 0.5;
  if (span <= 12) return 1;
  if (span <= 20) return 2;
  return 5;
}

export function WordTimeline() {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const song = useTranscriptStore(s => s.song);
  const words = useTranscriptStore(s => s.words);
  const time = useTranscriptStore(s => s.time);
  const span = useTranscriptStore(s => s.span);
  const viewStart = useTranscriptStore(s => s.viewStart);
  const selected = useTranscriptStore(s => s.selected);
  const editing = useTranscriptStore(s => (s.editing?.where === 'timeline' ? s.editing.i : null));
  const revision = useTranscriptStore(s => s.revision);
  const { marked, moved, rewritten, relined } = useRevisionWords();
  const { lane, count } = useMemo(() => lanesOf(words), [words]);
  const lanes = Math.max(2, count);
  const LANE = laneHeight(lanes);
  const WAVE_TOP = LANES_TOP + LANE * lanes + 8;
  const HEIGHT = WAVE_TOP + WAVE_HEIGHT;
  const dragRef = useRef<Drag | null>(null);
  const panRef = useRef<{ x0: number; v0: number; moved: boolean } | null>(null);
  const rangeRef = useRef<{ x0: number; t0: number; moved: boolean } | null>(null);
  const range = useTranscriptStore(s => s.range);
  const looping = useTranscriptStore(s => s.looping);
  const missing = revision?.missingRanges ?? [];
  const [live, setLive] = useState<{ i: number; start: number; end: number } | null>(null);

  const duration = song?.duration ?? 0;
  const v0 = viewStart ?? followStart(time, span);
  const pps = width ? width / span : 1;
  const x = (t: number) => (t - v0) * pps;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, []);

  // scroll pans, ⌘/Ctrl-scroll (and a trackpad pinch) zooms; needs a listener that may cancel the page's scroll
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      const s = useTranscriptStore.getState();
      if (!s.song) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        s.zoom(e.deltaY > 0 ? 1 : -1);
        return;
      }
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const start = s.viewStart ?? followStart(s.time, s.span);
      const w = box.clientWidth || 1;
      s.setViewStart(Math.max(0, Math.min(Math.max(0, (s.song.duration || 0) - s.span), start + (d / w) * s.span)));
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  const marksKey = (revision?.marks ?? []).map(m => m.at).join(',');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);
    // the grid and the ruler
    const step = tickStep(span);
    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'bottom';
    for (let t = Math.ceil(v0 / step) * step; t <= v0 + span; t += step) {
      const px = Math.round(x(t)) + 0.5;
      ctx.fillStyle = COLORS.grid;
      ctx.fillRect(px, 0, 1, HEIGHT - 12);
      ctx.fillStyle = COLORS.ruler;
      ctx.fillRect(px, HEIGHT - 5, 1, 5);
      const whole = Math.abs(t - Math.round(t)) < 1e-6;
      if (whole || span <= 5) ctx.fillText(clock(t, whole ? 0 : 1), px + 3, HEIGHT - 1);
    }
    // the waveform under the words
    const peaks = song?.peaks;
    const top = WAVE_TOP;
    const h = HEIGHT - 14 - top;
    const mid = top + h / 2;
    if (peaks) {
      const perSec = peaks.length / (duration || 1);
      for (let i = 0; i < width; i++) {
        const t0 = v0 + i / pps;
        const t1 = t0 + 1 / pps;
        if (t0 < 0 || t0 > duration) continue;
        const from = Math.floor(t0 * perSec);
        const to = Math.max(from + 1, Math.ceil(t1 * perSec));
        let p = 0;
        for (let j = from; j < to && j < peaks.length; j++) if (peaks[j] > p) p = peaks[j];
        const ph = Math.max(1, p * (h / 2));
        ctx.fillStyle = t0 < time ? COLORS.played : COLORS.wave;
        ctx.fillRect(i, mid - ph, 1, ph * 2);
      }
    } else {
      ctx.fillStyle = COLORS.wave;
      ctx.fillRect(0, mid, width, 1);
    }
    // the marks
    ctx.fillStyle = COLORS.mark;
    for (const t of marksKey ? marksKey.split(',').map(Number) : []) {
      const px = x(t);
      if (px < -6 || px > width + 6) continue;
      ctx.beginPath();
      ctx.moveTo(px - 5, HEIGHT - 12);
      ctx.lineTo(px + 5, HEIGHT - 12);
      ctx.lineTo(px, HEIGHT - 19);
      ctx.closePath();
      ctx.fill();
    }
    // the playhead
    ctx.fillStyle = COLORS.playhead;
    ctx.fillRect(Math.round(x(time)) - 0.5, 0, 1.5, HEIGHT);
  }, [width, song?.peaks, duration, v0, span, time, marksKey, HEIGHT, WAVE_TOP]); // x and pps follow from v0, span and width

  const visible = words.filter(w => w.end >= v0 - 0.5 && w.start <= v0 + span + 0.5);

  /** Where a drag of word i may go: anywhere in the song (words may overlap: voices, a choir), never shorter than MIN_WORD. */
  const beginDrag = (e: React.PointerEvent, w: TWord, mode: Mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const s = useTranscriptStore.getState();
    if (s.viewStart === null) s.setViewStart(v0);
    s.selectWord(w.i);
    const ripple = mode === 'move' && e.shiftKey;
    const all = s.words;
    let group = [{ i: w.i, start: w.start, end: w.end }];
    if (ripple) {
      const line = lineOf(s.lines, w);
      group = (line?.words ?? [w]).filter(x => x.i >= w.i).map(x => ({ i: x.i, start: all[x.i].start, end: all[x.i].end }));
    }
    const total = s.song?.duration || Infinity;
    let lo: number;
    let hi: number;
    if (mode === 'start') {
      lo = 0;
      hi = w.end - MIN_WORD;
    } else if (mode === 'end') {
      lo = w.start + MIN_WORD;
      hi = total;
    } else {
      // how far the group may shift (seconds, negative = earlier)
      lo = -Math.min(...group.map(g => g.start));
      hi = total - Math.max(...group.map(g => g.end));
    }
    dragRef.current = { mode, i: w.i, x0: e.clientX, pps, group, lo, hi, moved: false };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) < 3) return;
    d.moved = true;
    const dt = (e.clientX - d.x0) / d.pps;
    const g = d.group[0];
    let changes: TimeChange[];
    if (d.mode === 'start') changes = [{ i: g.i, start: Math.max(d.lo, Math.min(d.hi, g.start + dt)), end: g.end }];
    else if (d.mode === 'end') changes = [{ i: g.i, start: g.start, end: Math.max(d.lo, Math.min(d.hi, g.end + dt)) }];
    else {
      const shift = Math.max(d.lo, Math.min(d.hi, dt));
      changes = d.group.map(x => ({ i: x.i, start: x.start + shift, end: x.end + shift }));
    }
    useTranscriptStore.getState().setTimes(changes);
    const first = changes.find(c => c.i === d.i)!;
    setLive({ i: d.i, start: first.start, end: first.end });
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setLive(null);
    if (d && !d.moved) {
      const s = useTranscriptStore.getState();
      const w = s.words[d.i];
      if (w) s.seek(w.start);
    }
  };

  const timeAt = (clientX: number) => {
    const rect = boxRef.current!.getBoundingClientRect();
    return v0 + (clientX - rect.left) / pps;
  };

  return (
    <div
      ref={boxRef}
      className="relative w-full select-none overflow-hidden rounded-md bg-zinc-950"
      style={{ height: HEIGHT }}
      onPointerDown={e => {
        if (e.button !== 0 || !song) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        // the waveform (or ⇧ anywhere) selects a stretch; the empty lanes pan
        const y = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top;
        if (e.shiftKey || y >= WAVE_TOP - 4) rangeRef.current = { x0: e.clientX, t0: timeAt(e.clientX), moved: false };
        else panRef.current = { x0: e.clientX, v0, moved: false };
      }}
      onPointerMove={e => {
        if (dragRef.current) return onDragMove(e);
        const r = rangeRef.current;
        if (r) {
          if (!r.moved && Math.abs(e.clientX - r.x0) < 3) return;
          r.moved = true;
          const s = useTranscriptStore.getState();
          if (s.viewStart === null) s.setViewStart(v0);
          if (s.selected !== null) s.selectWord(null);
          s.setRange({ start: r.t0, end: timeAt(e.clientX) });
          return;
        }
        const p = panRef.current;
        if (!p) return;
        if (!p.moved && Math.abs(e.clientX - p.x0) < 4) return;
        p.moved = true;
        useTranscriptStore.getState().setViewStart(p.v0 - (e.clientX - p.x0) / pps);
      }}
      onPointerUp={e => {
        if (dragRef.current) return endDrag();
        const r = rangeRef.current;
        rangeRef.current = null;
        if (r) {
          if (!r.moved) {
            const s = useTranscriptStore.getState();
            s.selectWord(null);
            s.setRange(null);
            s.seek(timeAt(e.clientX));
          }
          return;
        }
        const p = panRef.current;
        panRef.current = null;
        if (p && !p.moved) {
          const s = useTranscriptStore.getState();
          s.selectWord(null);
          s.seek(timeAt(e.clientX));
        }
      }}
    >
      <canvas ref={canvasRef} style={{ width, height: HEIGHT }} className="pointer-events-none absolute inset-0 block" />
      {/* the waveform strip: drag here to select a stretch */}
      <div className="absolute inset-x-0 bottom-0 cursor-crosshair" style={{ top: WAVE_TOP - 4 }} title="Drag to select a stretch of the song (⇧-drag works anywhere) · click: play from there" />
      {/* stretches marked as words missing */}
      {missing
        .filter(m => m.end >= v0 && m.start <= v0 + span)
        .map(m => {
          const left = x(m.start);
          const w = Math.max(2, (m.end - m.start) * pps);
          const label = m.words?.trim() || m.note.trim() || 'words missing';
          return (
            <div key={m.id} className="pointer-events-none absolute inset-y-0 border-x border-dashed border-violet-400/80 bg-violet-500/15" style={{ left, width: w }}>
              <button
                className="pointer-events-auto absolute max-w-[calc(100%-4px)] truncate rounded bg-violet-600/90 px-1 py-0.5 text-[10px] leading-none text-white hover:bg-violet-500"
                style={{ top: WAVE_TOP + 2, left: Math.max(2, -left + 2) }}
                title={`Words missing ${m.start.toFixed(2)}–${m.end.toFixed(2)} s: ${label} · click to play it`}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => {
                  const s = useTranscriptStore.getState();
                  s.setFocusMark(m.id);
                  s.playRange(m.start, m.end);
                }}
              >
                {label}
              </button>
            </div>
          );
        })}
      {/* the selected stretch, and what to do with it */}
      {range && range.end >= v0 && range.start <= v0 + span && (
        <div className="pointer-events-none absolute inset-y-0 z-10 border-x border-sky-300 bg-sky-400/15" style={{ left: x(range.start), width: Math.max(2, (range.end - range.start) * pps) }}>
          <div
            className="pointer-events-auto absolute flex items-center gap-0.5 whitespace-nowrap rounded bg-zinc-900/95 p-0.5 text-[10px] text-zinc-100 shadow ring-1 ring-sky-400/50"
            style={{ top: WAVE_TOP + 2, left: Math.max(0, -x(range.start)) }}
            onPointerDown={e => e.stopPropagation()}
          >
            <span className="px-1 font-mono text-sky-200">{(range.end - range.start).toFixed(1)} s</span>
            <button className="flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-zinc-700" title="Play the stretch (P)" onClick={() => useTranscriptStore.getState().playSelection()}>
              <PlayIcon className="size-3" />
            </button>
            <button
              className={cn('flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-zinc-700', looping && 'bg-sky-500/40')}
              title={looping ? 'Stop looping (L)' : 'Loop the stretch (L)'}
              onClick={() => useTranscriptStore.getState().playSelection(true)}
            >
              <RepeatIcon className="size-3" />
            </button>
            <button
              className="flex items-center gap-0.5 rounded bg-violet-600/90 px-1 py-0.5 text-white hover:bg-violet-500"
              title="Mark it: words are sung here that the transcript lacks (M)"
              onClick={() => useTranscriptStore.getState().addMissingRange()}
            >
              <TextCursorInputIcon className="size-3" /> Words missing
            </button>
            <button className="rounded px-1 py-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100" title="Clear the selection (Esc)" onClick={() => useTranscriptStore.getState().setRange(null)}>
              <XIcon className="size-3" />
            </button>
          </div>
        </div>
      )}
      {/* where moved words were; drags on a word bubble their moves here (the word captures the pointer) */}
      {visible
        .filter(w => moved.has(w.i) && song?.original[w.i])
        .map(w => {
          const o = song!.original[w.i];
          return (
            <div
              key={`was-${w.i}`}
              className="pointer-events-none absolute rounded border border-dashed border-sky-400/50"
              style={{ left: x(o.start), width: Math.max(2, (o.end - o.start) * pps), top: LANES_TOP + (lane.get(w.i) ?? 0) * LANE, height: LANE - 4 }}
            />
          );
        })}
      {visible.map(w => {
        const left = x(w.start);
        const wpx = Math.max(3, (w.end - w.start) * pps);
        const top = LANES_TOP + (lane.get(w.i) ?? 0) * LANE;
        if (editing === w.i)
          return (
            <div key={w.i} className="absolute z-20" style={{ left, top, height: LANE - 4 }}>
              <RewriteInput w={w} className="h-full text-xs" />
            </div>
          );
        const now = !w.deleted && w.start <= time && time < w.end;
        const unconfirmed = w.verified && w.verified !== 'heard';
        const long = isLong(w);
        const was = song?.base[w.i]?.text;
        return (
          <WordMenu key={w.i} w={w} where="timeline">
            <div
              className={cn(
                'group absolute flex items-center overflow-hidden rounded border text-[11px] leading-none',
                moved.has(w.i) ? 'border-sky-400 bg-sky-500/30 text-sky-50' : unconfirmed ? 'border-dashed border-orange-400/80 bg-orange-500/15 text-orange-100' : 'border-zinc-600 bg-zinc-800/90 text-zinc-100',
                long && 'border-amber-400/90',
                relined.has(w.i) && 'border-violet-400',
                rewritten.has(w.i) && 'border-emerald-400 text-emerald-100',
                now && 'bg-amber-400/40 text-white',
                w.deleted && 'border-dashed border-red-500/80 bg-red-500/10 text-red-200/70 line-through opacity-70',
                selected === w.i && 'ring-2 ring-sky-300',
                marked.has(w.i) && 'border-red-500',
              )}
              style={{ left, width: wpx, top, height: LANE - 4, cursor: 'grab', ...(long && !now ? { backgroundImage: LONG_STRIPES } : {}) }}
              title={[
                `#${w.i} "${w.text}" ${w.start.toFixed(3)}–${w.end.toFixed(3)} s`,
                rewritten.has(w.i) && was ? `was "${was}"` : '',
                w.deleted ? 'to delete' : '',
                long ? `${(w.end - w.start).toFixed(1)} s long: may run into a gap (right-click to trim)` : '',
                'drag the edges or the middle (⇧ moves the rest of the line) · right-click: menu',
              ]
                .filter(Boolean)
                .join(' · ')}
              onPointerDown={e => beginDrag(e, w, 'move')}
              onDoubleClick={e => {
                e.stopPropagation();
                useTranscriptStore.getState().playRange(w.start - 0.15, w.end + 0.15);
              }}
            >
              <span className="pointer-events-none truncate px-1.5">{w.text}</span>
              {long && wpx > 70 && <span className="pointer-events-none ml-auto shrink-0 pr-1.5 font-mono text-[9px] text-amber-300">{(w.end - w.start).toFixed(1)} s</span>}
              {/* the edges */}
              <span
                className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-white/0 hover:bg-white/40 group-hover:bg-white/15"
                onPointerDown={e => beginDrag(e, w, 'start')}
              />
              <span
                className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-white/0 hover:bg-white/40 group-hover:bg-white/15"
                onPointerDown={e => beginDrag(e, w, 'end')}
              />
            </div>
          </WordMenu>
        );
      })}
      {live && (
        <div className="pointer-events-none absolute right-2 top-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-sky-200">
          {live.start.toFixed(3)}–{live.end.toFixed(3)} s
        </div>
      )}
      {!song?.peaks && song?.url && <div className="pointer-events-none absolute bottom-4 left-2 text-[10px] text-zinc-500">Decoding the waveform…</div>}
    </div>
  );
}
