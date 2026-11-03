'use client';

import { useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon, Repeat2Icon, RewindIcon, Volume2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { clock } from '@/lib/file-revisions/revision-file';
import type { LoopRange } from '@/lib/remaster-revisions/types';
import { getPlayer, selectActiveRevision, useLevelOf, useLevelSpread, useRemasterStore, useVersions } from './store';

/*
 * The song's timeline: the active version's waveform, the playhead every version shares, the loop
 * range (drag to choose one), the moments notes were pinned to, and the transport under it.
 */

const COLORS = {
  wave: 'rgba(161, 161, 170, 0.7)',
  played: '#fbbf24',
  loop: 'rgba(251, 191, 36, 0.14)',
  loopEdge: 'rgba(251, 191, 36, 0.8)',
  playhead: '#ffffff',
  pin: '#60a5fa',
};

/** The playhead's position, refreshed every frame while playing. */
export function usePosition(): number {
  const playing = useRemasterStore(s => s.playing);
  const loop = useRemasterStore(s => s.loop);
  const looping = useRemasterStore(s => s.looping);
  const ready = useRemasterStore(s => s.ready);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setPos(getPlayer()?.position() ?? 0);
      if (playing) frame = requestAnimationFrame(tick);
    };
    tick();
    // frames stop in a hidden tab; the song doesn't, so keep the readout roughly right there too
    const fallback = playing ? setInterval(tick, 250) : undefined;
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(fallback);
    };
  }, [playing, loop, looping, ready]);
  return pos;
}

function niceStep(duration: number, width: number): number {
  const target = duration / Math.max(1, width / 90);
  for (const step of [1, 2, 5, 10, 15, 30, 60, 120, 300, 600]) if (step >= target) return step;
  return 600;
}

function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const active = useRemasterStore(s => s.active);
  const peaks = useRemasterStore(s => (s.active ? s.peaks[s.active] : undefined));
  const duration = useRemasterStore(s => s.duration);
  const loop = useRemasterStore(s => s.loop);
  const looping = useRemasterStore(s => s.looping);
  const revision = useRemasterStore(selectActiveRevision);
  const seek = useRemasterStore(s => s.seek);
  const setLoop = useRemasterStore(s => s.setLoop);
  const pos = usePosition();
  const [drag, setDrag] = useState<LoopRange | null>(null);
  const dragRef = useRef<{ startX: number; startT: number; moved: boolean } | null>(null);
  const HEIGHT = 150;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pins = (revision?.comments ?? []).filter(c => c.pin?.t !== undefined && (!active || c.pin!.image === active)).map(c => c.pin!.t!);
  const pinsKey = pins.join(',');

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
    const x = (t: number) => (duration ? (t / duration) * width : 0);
    const range = drag ?? loop;
    if (range) {
      ctx.fillStyle = looping || drag ? COLORS.loop : 'rgba(161,161,170,0.08)';
      ctx.fillRect(x(range.start), 0, Math.max(1, x(range.end) - x(range.start)), HEIGHT);
      ctx.fillStyle = looping || drag ? COLORS.loopEdge : 'rgba(161,161,170,0.5)';
      ctx.fillRect(x(range.start), 0, 1, HEIGHT);
      ctx.fillRect(x(range.end) - 1, 0, 1, HEIGHT);
    }
    const mid = HEIGHT / 2;
    if (peaks) {
      const n = peaks.length;
      const playedX = x(pos);
      for (let i = 0; i < width; i++) {
        const from = Math.floor((i / width) * n);
        const to = Math.max(from + 1, Math.floor(((i + 1) / width) * n));
        let p = 0;
        for (let j = from; j < to; j++) if (peaks[j] > p) p = peaks[j];
        const h = Math.max(1, p * (HEIGHT / 2 - 6));
        ctx.fillStyle = i < playedX ? COLORS.played : COLORS.wave;
        ctx.fillRect(i, mid - h, 1, h * 2);
      }
    } else {
      ctx.fillStyle = COLORS.wave;
      ctx.fillRect(0, mid, width, 1);
    }
    ctx.fillStyle = COLORS.pin;
    for (const t of pinsKey ? pinsKey.split(',').map(Number) : []) {
      const px = x(t);
      ctx.beginPath();
      ctx.moveTo(px - 5, 0);
      ctx.lineTo(px + 5, 0);
      ctx.lineTo(px, 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = COLORS.playhead;
    ctx.fillRect(Math.round(x(pos)) - 0.5, 0, 1.5, HEIGHT);
    // the ruler
    ctx.fillStyle = 'rgba(161,161,170,0.9)';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'bottom';
    const step = niceStep(duration, width);
    for (let t = 0; t < duration; t += step) {
      const px = x(t);
      ctx.fillRect(px, HEIGHT - 6, 1, 6);
      if (px + 30 < width) ctx.fillText(clock(t).replace(/\.\d$/, ''), px + 3, HEIGHT - 1);
    }
  }, [width, peaks, duration, loop, looping, pos, drag, pinsKey]); // pins is derived from pinsKey

  const timeAt = (clientX: number) => {
    const rect = boxRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };

  return (
    <div
      ref={boxRef}
      className="relative w-full cursor-crosshair select-none overflow-hidden rounded-md bg-zinc-950"
      style={{ height: HEIGHT }}
      onPointerDown={e => {
        if (!duration || e.button !== 0) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
        if (d.moved) {
          const t = timeAt(e.clientX);
          const range = { start: Math.min(d.startT, t), end: Math.max(d.startT, t) };
          setDrag(null);
          if (range.end - range.start >= 0.2) {
            setLoop(range);
            seek(range.start);
          }
        } else seek(d.startT);
      }}
      onDoubleClick={() => setLoop(null)}
    >
      <canvas ref={canvasRef} style={{ width, height: HEIGHT }} className="block" />
      {!duration && <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">The waveform shows once a version is decoded</div>}
    </div>
  );
}

function Transport() {
  const ready = useRemasterStore(s => s.ready);
  const playing = useRemasterStore(s => s.playing);
  const duration = useRemasterStore(s => s.duration);
  const loop = useRemasterStore(s => s.loop);
  const looping = useRemasterStore(s => s.looping);
  const matched = useRemasterStore(s => s.matched);
  const volume = useRemasterStore(s => s.volume);
  const togglePlay = useRemasterStore(s => s.togglePlay);
  const seek = useRemasterStore(s => s.seek);
  const nudge = useRemasterStore(s => s.nudge);
  const setLoop = useRemasterStore(s => s.setLoop);
  const setLooping = useRemasterStore(s => s.setLooping);
  const setMatched = useRemasterStore(s => s.setMatched);
  const setVolume = useRemasterStore(s => s.setVolume);
  const spread = useLevelSpread();
  const quietest = useLevelOf(spread?.quietest ?? null);
  const versions = useVersions();
  const labelOf = (id: string) => versions.find(v => v.id === id)?.label ?? id;
  const pos = usePosition();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Hint label="Back to the start" keys="Home">
        <Button variant="ghost" size="sm" className="h-8 px-2" disabled={!ready} onClick={() => seek(0)}>
          <RewindIcon className="size-4" />
        </Button>
      </Hint>
      <Hint label={playing ? 'Pause' : 'Play'} keys="Space">
        <Button size="sm" className="h-8 w-20" disabled={!ready} onClick={() => togglePlay()}>
          {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />} {playing ? 'Pause' : 'Play'}
        </Button>
      </Hint>
      <span className="font-mono text-sm tabular-nums">
        {clock(pos)} <span className="text-muted-foreground">/ {clock(duration)}</span>
      </span>
      <span className="flex gap-0.5">
        <Hint label="5 s back (⇧: 1 s)" keys="←">
          <Button variant="ghost" size="sm" className="h-7 px-1.5 font-mono text-xs" disabled={!ready} onClick={() => nudge(-5)}>
            −5s
          </Button>
        </Hint>
        <Hint label="5 s ahead (⇧: 1 s)" keys="→">
          <Button variant="ghost" size="sm" className="h-7 px-1.5 font-mono text-xs" disabled={!ready} onClick={() => nudge(5)}>
            +5s
          </Button>
        </Hint>
      </span>
      <span className="flex items-center gap-1.5">
        <Hint label={loop ? (looping ? 'Stop looping (the range stays)' : 'Loop the range') : 'Drag on the timeline to choose a range to loop ([ and ] set its edges at the playhead)'} keys="L">
          <Button variant={looping ? 'default' : 'outline'} size="sm" className={cn('h-7 gap-1 px-2 text-xs', !loop && 'text-muted-foreground')} disabled={!loop} onClick={() => setLooping(!looping)}>
            <Repeat2Icon className="size-3.5" /> Loop{loop ? ` ${clock(loop.start)}–${clock(loop.end)}` : ''}
          </Button>
        </Hint>
        {loop && (
          <Hint label="Clear the range" keys="Esc">
            <button type="button" className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setLoop(null)}>
              <XIcon className="size-3.5" />
            </button>
          </Hint>
        )}
      </span>
      <span className="ml-auto flex items-center gap-4">
        <Hint
          label={
            spread
              ? `Turn every version down to the quietest (${labelOf(spread.quietest)}, ${quietest ? quietest.lufs.toFixed(1) : '?'} LUFS) so you judge the sound, not the volume`
              : 'Needs the loudness of at least two versions'
          }
          keys="M"
        >
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Switch checked={matched} disabled={!spread} onCheckedChange={setMatched} />
            Match levels
          </label>
        </Hint>
        <span className="flex w-28 items-center gap-1.5">
          <Volume2Icon className="size-3.5 text-muted-foreground" />
          <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={([v]) => setVolume(v)} aria-label="Volume" />
        </span>
      </span>
    </div>
  );
}

export function Timeline() {
  return (
    <div className="space-y-2">
      <Waveform />
      <Transport />
    </div>
  );
}
