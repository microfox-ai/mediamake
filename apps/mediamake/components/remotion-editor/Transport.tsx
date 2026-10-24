'use client';

import { useRef } from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/revisions/keyboard';
import { player, useEditor } from './store';

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};

/** Play controls, the current lyric, and a scrubber with the song's sections and edit markers. */
export function Transport() {
  const frame = useEditor(s => s.frame);
  const playing = useEditor(s => s.playing);
  const duration = useEditor(s => s.durationInFrames);
  const fps = useEditor(s => s.compiled?.project.fps ?? 30);
  const manifest = useEditor(s => s.manifest);
  const elements = useEditor(s => s.edits.elements);
  const selectedId = useEditor(s => s.selectedId);
  const barRef = useRef<HTMLDivElement>(null);

  const t = frame / fps;
  const total = duration / fps;
  const line = manifest?.lyrics.find(l => t >= l.start && t <= l.end + 0.3);

  const seekAt = (clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    const f = Math.round(((clientX - r.left) / r.width) * (duration - 1));
    player.current?.seekTo(Math.min(duration - 1, Math.max(0, f)));
  };

  return (
    <div className="flex h-full flex-col border-t bg-background">
      <div className="flex h-9 shrink-0 items-center gap-2 px-2">
        <Hint label={playing ? 'Pause' : 'Play'} keys="Space">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={!manifest}
            onClick={() => player.current?.toggle()}
          >
            {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          </Button>
        </Hint>
        <span className="text-xs tabular-nums">
          {fmt(t)} <span className="text-muted-foreground">/ {fmt(total)}</span>
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">frame {frame}</span>
        <span className="ml-3 min-w-0 flex-1 truncate text-xs italic text-muted-foreground">
          {line?.text}
        </span>
      </div>
      <div
        ref={barRef}
        className="relative mx-2 mb-2 min-h-0 flex-1 cursor-pointer select-none overflow-hidden rounded bg-muted/40"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          player.current?.pause();
          seekAt(e.clientX);
        }}
        onPointerMove={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e.clientX);
        }}
      >
        {manifest?.sections.map((s, i) => (
          <div
            key={`${s.label}-${i}`}
            className="absolute inset-y-0 border-l border-border/60 px-1 pt-0.5 text-[10px] text-muted-foreground"
            style={{ left: `${(s.from / total) * 100}%`, width: `${((s.to - s.from) / total) * 100}%` }}
          >
            <span className="block truncate">{s.label}</span>
          </div>
        ))}
        {Object.entries(elements).map(([id, e]) =>
          e.at === undefined ? null : (
            <div
              key={id}
              title={e.label ?? id}
              className={`absolute bottom-1 h-2 w-1 -translate-x-1/2 rounded-sm ${id === selectedId ? 'bg-sky-400' : 'bg-primary/70'}`}
              style={{ left: `${(e.at / total) * 100}%` }}
            />
          ),
        )}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-red-500"
          style={{ left: `${(frame / Math.max(1, duration - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
