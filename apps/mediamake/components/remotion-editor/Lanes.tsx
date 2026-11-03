'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react';
import { Hint } from '@/components/revisions/keyboard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setLyricsOffset, setWordEdits } from '@/lib/remotion-editor/edits';
import {
  beatGrid,
  laneWords,
  lowerBound,
  subdivisions,
  type LaneWord,
} from '@/lib/remotion-editor/lanes';
import { player, useEditor } from './store';

/*
 * Beat and word lanes under the scrubber: a close-up of a few seconds around the playhead with the
 * bars and beats, the voice (or the mix) and the sung words. Dragging a word, or one of its edges,
 * retimes it; the change is saved in edits.json `words` and every render applies it. The video
 * re-renders once, on release. "All words" shifts every word (`lyricsOffset`).
 */

type Snap = 'voice' | 'beat' | 'half' | 'quarter' | 'off';
const SNAP_LABEL: Record<Snap, string> = {
  voice: 'Snap to the voice',
  beat: 'Snap to beats',
  half: 'Snap to ½ beats',
  quarter: 'Snap to ¼ beats',
  off: 'No snap',
};
const SNAP_KEY = 'remotion-editor:word-snap';
const SNAP_PX = 8;
const MIN_WORD = 0.03;
const EDGE_PX = 6;

type Times = { start: number; end: number };

type Drag = {
  pointerId: number;
  x0: number;
  mode: 'move' | 'start' | 'end';
  /** the word under the pointer */
  key: string;
  /** keys that move with it ('move' only) */
  moving: string[];
  preview: Record<string, Times>;
  moved: boolean;
};

export function Lanes() {
  const manifest = useEditor(s => s.rawManifest);
  const wordEdits = useEditor(s => s.edits.words);
  const offset = useEditor(s => s.edits.lyricsOffset ?? 0);
  const fps = useEditor(s => s.compiled?.project.fps ?? 30);
  const durationInFrames = useEditor(s => s.durationInFrames);
  const change = useEditor(s => s.change);
  const total = Math.max(1, durationInFrames / fps);

  // a callback ref: the lanes mount after the manifest loads, not with the panel
  const [boxEl, setBoxEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState({ start: 0, span: 8 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [snap, setSnapState] = useState<Snap>('half');
  const [selected, setSelected] = useState<string[]>([]);
  const anchor = useRef<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  const words = useMemo(
    () => laneWords(manifest, wordEdits, offset),
    [manifest, wordEdits, offset],
  );
  const byKey = useMemo(() => new Map(words.map((w, i) => [w.key, i])), [words]);
  const { beats, downbeats } = useMemo(() => beatGrid(manifest), [manifest]);
  const voice = useMemo(
    () => (manifest?.onsets?.vocal ?? []).map(([t]) => t + offset),
    [manifest, offset],
  );
  const envelope = useMemo(() => {
    const env = manifest?.envelopes;
    const series = env?.series.vocal ?? env?.series.rms;
    if (env && series?.length) return { rate: env.fps, values: series, label: env.series.vocal ? 'voice' : 'mix' };
    const energy = manifest?.energy;
    return energy?.values.length ? { rate: energy.rate, values: energy.values, label: 'mix' } : null;
  }, [manifest]);

  // the snap the user picked last; the voice when the song has its onsets
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(SNAP_KEY);
    } catch {
      // storage blocked: keep the default
    }
    const options: Snap[] = voice.length ? ['voice', 'beat', 'half', 'quarter', 'off'] : ['beat', 'half', 'quarter', 'off'];
    setSnapState(options.includes(saved as Snap) ? (saved as Snap) : voice.length ? 'voice' : 'half');
  }, [voice.length]);
  const setSnap = (next: Snap) => {
    setSnapState(next);
    try {
      localStorage.setItem(SNAP_KEY, next);
    } catch {
      // per-browser convenience only
    }
  };

  useLayoutEffect(() => {
    if (!boxEl) return;
    setWidth(boxEl.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(boxEl);
    return () => observer.disconnect();
  }, [boxEl]);

  // follow the playhead: page along while playing, jump to it after a seek elsewhere
  useEffect(
    () =>
      useEditor.subscribe((s, prev) => {
        if (s.frame === prev.frame || dragRef.current) return;
        const t = s.frame / fps;
        const { start, span } = viewRef.current;
        if (s.playing ? t > start + span * 0.85 || t < start : t < start || t > start + span) {
          setView(v => ({ ...v, start: Math.max(0, t - v.span * (s.playing ? 0.1 : 0.3)) }));
        }
      }),
    [fps],
  );

  const pxPerSec = width > 0 ? width / view.span : 1;
  const xOf = (t: number) => (t - view.start) * pxPerSec;
  const tOf = (x: number) => view.start + x / pxPerSec;

  // wheel: zoom with ⌘/Ctrl at the pointer, otherwise scroll along the song
  useEffect(() => {
    const el = boxEl;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView(v => {
        const pps = r.width / v.span;
        if (e.ctrlKey || e.metaKey) {
          const at = v.start + (e.clientX - r.left) / pps;
          const span = Math.min(60, Math.max(1.5, v.span * Math.exp(e.deltaY * 0.002)));
          return { span, start: Math.max(0, at - ((e.clientX - r.left) / r.width) * span) };
        }
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        return { ...v, start: Math.min(Math.max(0, total - v.span * 0.5), Math.max(0, v.start + d / pps)) };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [boxEl, total]);

  const zoom = (factor: number) =>
    setView(v => {
      const t = useEditor.getState().frame / fps;
      const span = Math.min(60, Math.max(1.5, v.span * factor));
      return { span, start: Math.max(0, t - (t - v.start) * (span / v.span)) };
    });

  const snapTargets = (from: number, to: number): number[] => {
    if (snap === 'off') return [];
    if (snap === 'voice') return voice.slice(Math.max(0, lowerBound(voice, from) - 1), lowerBound(voice, to) + 1);
    return subdivisions(beats, from, to, snap === 'beat' ? 1 : snap === 'half' ? 2 : 4);
  };
  const snapTime = (t: number, free: boolean) => {
    if (free) return t;
    const reach = SNAP_PX / pxPerSec;
    let best = t;
    let dist = reach;
    for (const c of snapTargets(t - reach, t + reach)) {
      if (Math.abs(c - t) < dist) {
        dist = Math.abs(c - t);
        best = c;
      }
    }
    return best;
  };

  /** New times for the words a drag touches, the neighbours it trims included. */
  const dragTimes = (d: Drag, dx: number, free: boolean): Record<string, Times> => {
    const dt = dx / pxPerSec;
    const at = (key: string) => words[byKey.get(key)!];
    const w = at(d.key);
    const i = byKey.get(d.key)!;
    const out: Record<string, Times> = {};
    if (d.mode === 'start') {
      const prev = words[i - 1];
      const start = Math.min(w.end - MIN_WORD, Math.max(prev ? prev.start + MIN_WORD : 0, snapTime(w.start + dt, free)));
      out[w.key] = { start, end: w.end };
      if (prev && prev.end > start) out[prev.key] = { start: prev.start, end: start };
      return out;
    }
    if (d.mode === 'end') {
      const next = words[i + 1];
      const end = Math.max(w.start + MIN_WORD, Math.min(next ? next.end - MIN_WORD : total, snapTime(w.end + dt, free)));
      out[w.key] = { start: w.start, end };
      if (next && next.start < end) out[next.key] = { start: end, end: next.end };
      return out;
    }
    // move: the word under the pointer snaps, the rest of the selection keeps its distance
    const moving = new Set(d.moving);
    let delta = snapTime(w.start + dt, free) - w.start;
    for (const key of d.moving) {
      const k = byKey.get(key)!;
      const prev = words[k - 1];
      const next = words[k + 1];
      if (prev && !moving.has(prev.key)) delta = Math.max(delta, prev.start + MIN_WORD - words[k].start);
      else if (!prev) delta = Math.max(delta, -words[k].start);
      if (next && !moving.has(next.key)) delta = Math.min(delta, next.end - MIN_WORD - words[k].end);
      else if (!next) delta = Math.min(delta, total - words[k].end);
    }
    for (const key of d.moving) {
      const k = byKey.get(key)!;
      const m = words[k];
      const times = { start: m.start + delta, end: m.end + delta };
      out[key] = times;
      const prev = words[k - 1];
      const next = words[k + 1];
      if (prev && !moving.has(prev.key) && prev.end > times.start)
        out[prev.key] = { start: out[prev.key]?.start ?? prev.start, end: times.start };
      if (next && !moving.has(next.key) && next.start < times.end)
        out[next.key] = { start: times.end, end: out[next.key]?.end ?? next.end };
    }
    return out;
  };

  const commit = (times: Record<string, Times>) => {
    const patches = Object.fromEntries(
      Object.entries(times).map(([key, t]) => {
        const w = words[byKey.get(key)!];
        return [key, { start: t.start, end: t.end, text: w.text, was: w.raw }];
      }),
    );
    change(e => setWordEdits(e, patches));
  };

  const resetWords = (keys: string[]) =>
    change(e => setWordEdits(e, Object.fromEntries(keys.map(k => [k, undefined]))));

  const seek = (t: number) => {
    player.current?.pause();
    player.current?.seekTo(Math.max(0, Math.min(durationInFrames - 1, Math.round(t * fps))));
  };

  const onWordDown = (e: React.PointerEvent, w: LaneWord) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - r.left;
    const edge = Math.min(EDGE_PX, r.width / 3);
    const mode = x < edge ? 'start' : x > r.width - edge ? 'end' : 'move';
    let nextSelected = selected;
    if (e.shiftKey && anchor.current && byKey.has(anchor.current)) {
      const [a, b] = [byKey.get(anchor.current)!, byKey.get(w.key)!].sort((p, q) => p - q);
      nextSelected = words.slice(a, b + 1).map(x => x.key);
    } else if (e.metaKey || e.ctrlKey) {
      nextSelected = selected.includes(w.key) ? selected.filter(k => k !== w.key) : [...selected, w.key];
      anchor.current = w.key;
    } else if (!selected.includes(w.key)) {
      nextSelected = [w.key];
      anchor.current = w.key;
    }
    setSelected(nextSelected);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    player.current?.pause();
    setDrag({
      pointerId: e.pointerId,
      x0: e.clientX,
      mode,
      key: w.key,
      moving: mode === 'move' && nextSelected.includes(w.key) ? nextSelected : [w.key],
      preview: {},
      moved: false,
    });
  };

  const onWordMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) {
      // the cursor says what a drag from here does
      const el = e.currentTarget as HTMLElement;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const edge = Math.min(EDGE_PX, r.width / 3);
      el.style.cursor = x < edge || x > r.width - edge ? 'ew-resize' : 'grab';
      return;
    }
    if (d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 3) return;
    setDrag({ ...d, moved: true, preview: dragTimes(d, dx, e.altKey) });
  };

  const onWordUp = (e: React.PointerEvent, w: LaneWord) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setDrag(null);
    if (d.moved) commit(dragTimes(d, e.clientX - d.x0, e.altKey));
    else if (!(e.shiftKey || e.metaKey || e.ctrlKey)) {
      setSelected([w.key]);
      seek(w.start);
    }
  };

  const shown = (w: LaneWord): Times => drag?.preview[w.key] ?? w;
  const from = view.start;
  const to = view.start + view.span;
  const visible = words.filter(w => shown(w).end >= from && shown(w).start <= to);
  const one = selected.length === 1 ? words[byKey.get(selected[0]) ?? -1] : undefined;
  const editedCount = Object.keys(wordEdits ?? {}).length;

  // the grid in view
  const beatTicks = subdivisions(beats, from, to, pxPerSec * 0.5 > 40 ? 4 : pxPerSec * 0.5 > 20 ? 2 : 1);
  const bars = downbeats
    .map((t, i) => ({ t, n: i + 1 }))
    .filter(b => b.t >= from - 1 && b.t <= to);

  let envPath = '';
  if (envelope && width > 0) {
    const pts: string[] = [];
    for (let x = 0; x <= width; x += 2) {
      const v = envelope.values[Math.floor(tOf(x) * envelope.rate)] ?? 0;
      pts.push(`${x},${(1 - Math.min(1, v)) * 100}`);
    }
    envPath = `M0,100 L${pts.join(' L')} L${width},100 Z`;
  }

  if (!manifest) return null;
  const hasWords = words.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
      <div className="flex h-7 shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
        <span className="mr-1 font-medium text-foreground">Beats · words</span>
        <Hint label="Zoom out (⌘/Ctrl scroll on the lanes)">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => zoom(1.5)}>
            <MinusIcon className="size-3.5" />
          </Button>
        </Hint>
        <Hint label="Zoom in">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => zoom(1 / 1.5)}>
            <PlusIcon className="size-3.5" />
          </Button>
        </Hint>
        {hasWords && (
          <>
            <Select value={snap} onValueChange={v => setSnap(v as Snap)}>
              <SelectTrigger className="h-6 w-auto gap-1 border-none px-2 text-[11px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SNAP_LABEL) as Snap[])
                  .filter(k => k !== 'voice' || voice.length)
                  .map(k => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {SNAP_LABEL[k]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <OffsetInput
              ms={Math.round(offset * 1000)}
              onChange={ms => change(x => setLyricsOffset(x, ms / 1000), { coalesce: 'lyrics-offset' })}
            />
            {one && (
              <span className="ml-2 truncate tabular-nums">
                <span className="text-foreground">{one.text}</span> {shown(one).start.toFixed(3)}–{shown(one).end.toFixed(3)} s
                {one.edited && ` (was ${(one.raw.start + offset).toFixed(3)}–${(one.raw.end + offset).toFixed(3)})`}
              </span>
            )}
            {selected.length > 1 && <span className="ml-2">{selected.length} words</span>}
            <span className="ml-auto flex items-center gap-1">
              {selected.some(k => words[byKey.get(k) ?? -1]?.edited) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[11px]"
                  onClick={() => resetWords(selected)}
                >
                  <RotateCcwIcon className="size-3" /> Reset {selected.length > 1 ? 'these' : 'this'}
                </Button>
              )}
              {editedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => resetWords(Object.keys(wordEdits ?? {}))}
                >
                  Reset all {editedCount}
                </Button>
              )}
              <Hint label="Drag a word to move it, or an edge to retime it. Shift-click picks a run, ⌘/Ctrl-click adds one; drag them together. Alt: no snap. Double-click: back to the word's own time.">
                <span className="cursor-help px-1">?</span>
              </Hint>
            </span>
          </>
        )}
      </div>
      <div
        ref={setBoxEl}
        data-word-lanes
        className="relative min-h-[64px] flex-1 cursor-pointer select-none overflow-hidden rounded bg-muted/40"
        onPointerDown={e => {
          if (e.button !== 0) return;
          setSelected([]);
          const r = e.currentTarget.getBoundingClientRect();
          seek(tOf(e.clientX - r.left));
        }}
      >
        {/* ruler: bars and beats */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {beatTicks.map((t, i) => (
            <line key={i} x1={xOf(t)} x2={xOf(t)} y1={0} y2="100%" className="stroke-border" strokeWidth={1} />
          ))}
          {bars.map(b => (
            <line key={`b${b.n}`} x1={xOf(b.t)} x2={xOf(b.t)} y1={0} y2="100%" className="stroke-muted-foreground/50" strokeWidth={1} />
          ))}
          {manifest.sections
            .filter(s => s.from >= from && s.from <= to)
            .map((s, i) => (
              <line key={`s${i}`} x1={xOf(s.from)} x2={xOf(s.from)} y1={0} y2="100%" className="stroke-primary/60" strokeWidth={1.5} />
            ))}
        </svg>
        {bars.map(b => (
          <span
            key={`n${b.n}`}
            className="pointer-events-none absolute top-0 pl-0.5 text-[9px] tabular-nums text-muted-foreground"
            style={{ left: xOf(b.t) }}
          >
            {b.n}
          </span>
        ))}
        {manifest.sections
          .filter(s => s.from >= from - view.span && s.from <= to)
          .map((s, i) => (
            <span
              key={`l${i}`}
              className="pointer-events-none absolute top-0 pl-4 text-[9px] text-primary/80"
              style={{ left: Math.max(0, xOf(s.from)) }}
            >
              {s.label}
            </span>
          ))}
        {/* the voice (or the mix), and its onsets */}
        {envPath && (
          <svg
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full"
            viewBox={`0 0 ${Math.max(1, width)} 100`}
            preserveAspectRatio="none"
          >
            <path d={envPath} className="fill-sky-500/15" />
          </svg>
        )}
        {voice
          .filter(t => t >= from && t <= to)
          .map((t, i) => (
            <span
              key={`v${i}`}
              className="pointer-events-none absolute bottom-0 h-1.5 w-px bg-sky-500/70"
              style={{ left: xOf(t) }}
            />
          ))}
        {/* the sung words */}
        {visible.map(w => {
          const t = shown(w);
          const left = xOf(t.start);
          const wpx = Math.max(2, (t.end - t.start) * pxPerSec);
          const isSel = selected.includes(w.key);
          const unsure = w.conf !== undefined && w.conf < 0.5;
          return (
            <div
              key={w.key}
              data-word={w.key}
              title={`${w.text} · ${t.start.toFixed(3)}–${t.end.toFixed(3)} s${unsure ? ' · alignment unsure' : ''}`}
              className={`absolute bottom-3 top-4 overflow-hidden rounded-sm border px-1 text-[11px] leading-tight ${
                isSel
                  ? 'border-sky-500 bg-sky-500/25 text-foreground'
                  : w.edited
                    ? 'border-primary bg-primary/15 text-foreground'
                    : unsure
                      ? 'border-dashed border-amber-500 bg-background/80'
                      : 'border-border bg-background/80'
              }`}
              style={{ left, width: wpx }}
              onPointerDown={e => onWordDown(e, w)}
              onPointerMove={onWordMove}
              onPointerUp={e => onWordUp(e, w)}
              onPointerCancel={() => setDrag(null)}
              onDoubleClick={e => {
                e.stopPropagation();
                if (w.edited) resetWords([w.key]);
              }}
            >
              <span className="pointer-events-none block truncate">{w.text}</span>
            </div>
          );
        })}
        {!hasWords && (
          <span className="pointer-events-none absolute bottom-2 left-2 text-[11px] text-muted-foreground">
            No sung words in this project&apos;s manifest.
          </span>
        )}
        <LanePlayhead xOf={xOf} fps={fps} />
      </div>
    </div>
  );
}

/** Every word earlier or later, in ms; typing "-" or an empty box changes nothing until it is a number. */
function OffsetInput({ ms, onChange }: { ms: number; onChange: (ms: number) => void }) {
  const [text, setText] = useState(String(ms));
  useEffect(() => {
    setText(t => (Number(t) === ms ? t : String(ms)));
  }, [ms]);
  return (
    <Hint label="Moves every sung word: negative is earlier. Words you retimed keep their own times.">
      <label className="flex items-center gap-1">
        All words
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={e => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(Math.round(n));
          }}
          onBlur={() => setText(String(ms))}
          className="h-6 w-14 rounded border bg-background px-1 text-right tabular-nums text-foreground"
        />
        ms
      </label>
    </Hint>
  );
}

function LanePlayhead({ xOf, fps }: { xOf: (t: number) => number; fps: number }) {
  const frame = useEditor(s => s.frame);
  return (
    <div
      className="pointer-events-none absolute inset-y-0 w-px bg-red-500"
      style={{ left: xOf(frame / fps) }}
    />
  );
}
