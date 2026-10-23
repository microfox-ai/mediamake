'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MaximizeIcon, XIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTime, timeOfCut } from '@/lib/revisions/frames';
import { shotAt } from '@/lib/revisions/map';
import type { RevisionComment, TimeRange, VideoMap } from '@/lib/revisions/types';
import { selectActiveRevision, selectDuration, selectFps, useRevisionsStore } from './store';

const RULER_H = 20;
const SECTION_H = 18;
const SHOT_H = 34;
const COMMENT_H = 22;
const MAX_PPS = 600;
/** Second press within this time and distance counts as a double-press. */
const DOUBLE_MS = 400;
const DOUBLE_PX = 8;

const sectionColor = (index: number, alpha: number) => `hsl(${(index * 67 + 200) % 360} 65% 50% / ${alpha})`;

function rulerStep(pps: number): number {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  return steps.find((s) => s * pps >= 64) ?? 600;
}

const Ruler = memo(function Ruler({ duration, pps, markers }: { duration: number; pps: number; markers: VideoMap['markers'] }) {
  const step = rulerStep(pps);
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-6; t += step) ticks.push(t);
  return (
    <div className="relative border-b bg-muted/40" style={{ height: RULER_H }}>
      {ticks.map((t) => (
        <div key={t} className="absolute top-0 h-full border-l border-foreground/20" style={{ left: t * pps }}>
          <span className="absolute left-1 top-0.5 text-[10px] leading-none text-muted-foreground tabular-nums">
            {formatTime(t).replace(/\.00$/, '')}
          </span>
        </div>
      ))}
      {markers.map((m) => (
        <div
          key={m.id}
          title={`${m.id}${m.label ? ` · ${m.label}` : ''} (${formatTime(m.time)})`}
          className="absolute bottom-0 h-2 w-0.5 bg-fuchsia-500"
          style={{ left: m.time * pps }}
        />
      ))}
    </div>
  );
});

const Lanes = memo(function Lanes({
  map,
  pps,
  activeShotId,
}: {
  map: VideoMap | null;
  pps: number;
  activeShotId: string | null;
}) {
  const sectionIndex = useMemo(() => new Map(map?.sections.map((s, i) => [s.id, i]) ?? []), [map]);
  const sectionOf = (id?: string) => {
    if (!id || !map) return 0;
    if (sectionIndex.has(id)) return sectionIndex.get(id)!;
    const byLabel = map.sections.findIndex((s) => s.label === id);
    return byLabel === -1 ? 0 : byLabel;
  };

  if (!map) {
    return (
      <div
        className="flex items-center border-b px-3 text-xs text-muted-foreground"
        style={{ height: SECTION_H + SHOT_H }}
      >
        No map.json beside this video: shot IDs and markers show up here when there is one.
      </div>
    );
  }
  return (
    <>
      <div className="relative border-b" style={{ height: SECTION_H }}>
        {map.sections.map((section, i) => (
          <div
            key={section.id}
            title={`${section.label} (${formatTime(section.from)}–${formatTime(section.to)})`}
            className="absolute top-0 flex h-full items-center overflow-hidden border-r border-background px-1 text-[10px] font-medium"
            style={{ left: section.from * pps, width: (section.to - section.from) * pps, background: sectionColor(i, 0.28) }}
          >
            <span className="truncate">{section.label}</span>
          </div>
        ))}
      </div>
      <div className="relative border-b" style={{ height: SHOT_H }}>
        {map.shots.map((shot, i) => {
          const width = (shot.to - shot.from) * pps;
          const active = shot.id === activeShotId;
          return (
            <div
              key={`${shot.id}-${i}`}
              title={`${shot.id}${shot.label ? ` · ${shot.label}` : ''}${shot.lyric ? ` · “${shot.lyric}”` : ''} (${formatTime(shot.from)}–${formatTime(shot.to)})`}
              className={cn(
                'absolute top-0.5 bottom-0.5 overflow-hidden rounded-sm border px-1 text-[10px] leading-tight',
                active ? 'z-10 border-amber-500 ring-1 ring-amber-500' : 'border-background',
              )}
              style={{
                left: shot.from * pps,
                width: Math.max(width - 1, 1),
                background: sectionColor(sectionOf(shot.section), i % 2 ? 0.22 : 0.4),
              }}
            >
              {width > 22 && <div className="truncate font-mono font-semibold">{shot.id}</div>}
              {width > 110 && shot.label && <div className="truncate text-muted-foreground">{shot.label}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
});

const CommentLane = memo(function CommentLane({
  comments,
  pps,
  highlightId,
}: {
  comments: RevisionComment[];
  pps: number;
  highlightId: string | null;
}) {
  const focusComment = useRevisionsStore((s) => s.focusComment);
  return (
    <div className="relative border-b" style={{ height: COMMENT_H }}>
      {comments.map((c) => {
        const done = c.status === 'done';
        const highlighted = c.id === highlightId;
        const title = `${c.id}: ${c.text}`;
        const onPointerDown = (e: React.PointerEvent) => {
          e.stopPropagation();
          focusComment(c.id);
        };
        if (c.kind === 'range') {
          return (
            <div
              key={c.id}
              title={title}
              onPointerDown={onPointerDown}
              className={cn(
                'absolute top-1.5 h-2.5 cursor-pointer rounded-full',
                done ? 'bg-emerald-500/50' : 'bg-amber-500/70',
                highlighted && 'ring-2 ring-foreground',
              )}
              style={{ left: c.from * pps, width: Math.max((c.to - c.from) * pps, 4) }}
            />
          );
        }
        return (
          <div
            key={c.id}
            title={title}
            onPointerDown={onPointerDown}
            className={cn(
              'absolute top-1 size-3 -translate-x-1/2 cursor-pointer rounded-full border-2 border-background',
              done ? 'bg-emerald-500' : 'bg-amber-500',
              highlighted && 'ring-2 ring-foreground',
            )}
            style={{ left: c.time * pps }}
          />
        );
      })}
    </div>
  );
});

function Playhead({ pps }: { pps: number }) {
  const currentTime = useRevisionsStore((s) => s.currentTime);
  return (
    <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-red-500" style={{ left: currentTime * pps }}>
      <div className="absolute -left-1 top-0 size-2 rotate-45 bg-red-500" />
    </div>
  );
}

function SelectionOverlay({ selection, pps }: { selection: TimeRange; pps: number }) {
  return (
    <div
      className="absolute inset-y-0 z-10 border-x-2 border-sky-500 bg-sky-500/15"
      style={{ left: selection.from * pps, width: (selection.to - selection.from) * pps }}
    >
      <div data-edge="from" className="absolute inset-y-0 -left-1.5 w-3 cursor-ew-resize" />
      <div data-edge="to" className="absolute inset-y-0 -right-1.5 w-3 cursor-ew-resize" />
    </div>
  );
}

type Drag =
  | { mode: 'scrub' }
  | { mode: 'select'; anchor: number; startX: number; moved: boolean; double: boolean };

export function RevisionTimeline() {
  const video = useRevisionsStore((s) => s.video);
  const map = useRevisionsStore((s) => s.map);
  const duration = useRevisionsStore(selectDuration);
  const fps = useRevisionsStore(selectFps);
  const selection = useRevisionsStore((s) => s.selection);
  const playing = useRevisionsStore((s) => s.playing);
  const activeShotId = useRevisionsStore((s) => shotAt(s.map, s.currentTime)?.id ?? null);
  const revision = useRevisionsStore(selectActiveRevision);
  const highlightCommentId = useRevisionsStore((s) => s.highlightCommentId);
  const seek = useRevisionsStore((s) => s.seek);
  const setSelection = useRevisionsStore((s) => s.setSelection);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const lastDown = useRef({ at: -Infinity, x: 0 });
  const [viewWidth, setViewWidth] = useState(800);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setViewWidth(el.clientWidth));
    observer.observe(el);
    setViewWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [video?.url]);

  useEffect(() => setZoom(1), [video?.url]);

  const fitPps = duration > 0 ? Math.max(viewWidth - 16, 100) / duration : 50;
  const pps = Math.min(fitPps * zoom, MAX_PPS);
  const contentWidth = Math.max(duration * pps, viewWidth - 16);

  // Keep the playhead in view while playing and after jumps.
  useEffect(() => {
    return useRevisionsStore.subscribe((s, prev) => {
      if (s.currentTime === prev.currentTime || drag.current) return;
      const el = scrollerRef.current;
      if (!el) return;
      const x = s.currentTime * pps;
      if (x < el.scrollLeft + 8 || x > el.scrollLeft + el.clientWidth - 24) {
        el.scrollLeft = Math.max(0, x - el.clientWidth * 0.2);
      }
    });
  }, [pps]);

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      return Math.max(0, Math.min(duration, (clientX - rect.left) / pps));
    },
    [duration, pps],
  );

  const zoomAround = useCallback(
    (factor: number, clientX?: number) => {
      const el = scrollerRef.current;
      setZoom((z) => {
        const next = Math.max(1, Math.min(z * factor, MAX_PPS / fitPps));
        if (el) {
          const rect = el.getBoundingClientRect();
          const anchorX = clientX !== undefined ? clientX - rect.left : el.clientWidth / 2;
          const t = (el.scrollLeft + anchorX) / pps;
          requestAnimationFrame(() => {
            el.scrollLeft = Math.max(0, t * Math.min(fitPps * next, MAX_PPS) - anchorX);
          });
        }
        return next;
      });
    },
    [fitPps, pps],
  );

  // Native listener: React's onWheel is passive, so it cannot stop page zoom.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAround(Math.exp(-e.deltaY * 0.01), e.clientX);
      } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAround, video?.url]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !video) return;
    const t = timeAt(e.clientX);
    const isDouble = e.timeStamp - lastDown.current.at < DOUBLE_MS && Math.abs(e.clientX - lastDown.current.x) < DOUBLE_PX;
    lastDown.current = { at: e.timeStamp, x: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Give the keyboard back to the shortcuts, but keep a half-written comment focused.
    const focused = document.activeElement as HTMLElement | null;
    if (focused && focused.tagName !== 'TEXTAREA') focused.blur?.();

    const edge = (e.target as HTMLElement).closest<HTMLElement>('[data-edge]')?.dataset.edge;
    if (edge && selection) {
      const anchor = edge === 'from' ? selection.to : selection.from;
      drag.current = { mode: 'select', anchor, startX: e.clientX, moved: true, double: false };
      return;
    }
    if (e.shiftKey) {
      const { currentTime } = useRevisionsStore.getState();
      const anchor = selection
        ? Math.abs(t - selection.from) > Math.abs(t - selection.to)
          ? selection.from
          : selection.to
        : currentTime;
      drag.current = { mode: 'select', anchor, startX: e.clientX, moved: true, double: false };
      setSelection({ from: anchor, to: t });
      return;
    }
    if (isDouble) {
      drag.current = { mode: 'select', anchor: t, startX: e.clientX, moved: false, double: true };
      return;
    }
    drag.current = { mode: 'scrub' };
    if (selection && (t < selection.from || t > selection.to)) setSelection(null);
    seek(t);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const t = timeAt(e.clientX);
    if (d.mode === 'scrub') {
      seek(t);
      return;
    }
    if (!d.moved && Math.abs(e.clientX - d.startX) < 4) return;
    d.moved = true;
    setSelection({ from: d.anchor, to: t });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d || d.mode !== 'select') return;
    // The release point counts too: a fast drag may not report a move there.
    if (d.moved || Math.abs(e.clientX - d.startX) >= 4) {
      setSelection({ from: d.anchor, to: timeAt(e.clientX) });
      return;
    }
    if (!d.double) return;
    // Double-click without a drag selects the shot under the pointer.
    const shot = shotAt(map, timeAt(e.clientX));
    if (shot) {
      setSelection({ from: shot.from, to: shot.to });
      seek(timeOfCut(shot.from, fps));
    }
  };

  const comments = useMemo(() => revision?.comments ?? [], [revision]);

  if (!video) {
    return (
      <div className="flex h-full items-center justify-center border-t text-xs text-muted-foreground">
        The timeline shows up once a video is open.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-t bg-background">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b px-2 text-xs">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Zoom out (⌘/Ctrl + wheel)" onClick={() => zoomAround(1 / 1.6)}>
          <ZoomOutIcon className="size-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Zoom in (⌘/Ctrl + wheel)" onClick={() => zoomAround(1.6)}>
          <ZoomInIcon className="size-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Fit" onClick={() => setZoom(1)}>
          <MaximizeIcon className="size-3.5" />
        </Button>
        {selection ? (
          <span className="ml-2 flex items-center gap-1.5 rounded bg-sky-500/15 px-2 py-0.5 tabular-nums text-sky-700 dark:text-sky-300">
            Selection {formatTime(selection.from)} → {formatTime(selection.to)} · {(selection.to - selection.from).toFixed(2)} s ·{' '}
            {Math.round((selection.to - selection.from) * fps)} frames
            <button type="button" title="Clear (Esc)" onClick={() => setSelection(null)} className="rounded hover:bg-sky-500/20">
              <XIcon className="size-3" />
            </button>
          </span>
        ) : (
          <span className="ml-2 text-muted-foreground">
            Click to scrub · double-click + drag to select · double-click a shot to select it · ⌘/Ctrl ← → jump shots
          </span>
        )}
        {playing && <span className="ml-auto text-muted-foreground">playing</span>}
      </div>
      <div ref={scrollerRef} className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div
          ref={contentRef}
          className="relative mx-2 h-full touch-none select-none"
          style={{ width: contentWidth }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
        >
          <Ruler duration={duration} pps={pps} markers={map?.markers ?? []} />
          <Lanes map={map} pps={pps} activeShotId={activeShotId} />
          <CommentLane comments={comments} pps={pps} highlightId={highlightCommentId} />
          {selection && <SelectionOverlay selection={selection} pps={pps} />}
          <Playhead pps={pps} />
        </div>
      </div>
    </div>
  );
}
