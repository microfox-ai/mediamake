'use client';

import { useEffect, useRef, useState } from 'react';
import { frameAt } from '@/lib/revisions/frames';
import {
  MARK_COLORS,
  MARK_TOOLS,
  drawMarks,
  drawSpot,
  isFreehand,
  isMeaningfulMark,
  roundFraction,
} from '@/lib/revisions/marks';
import type { Mark, PointComment, Spot } from '@/lib/revisions/types';
import { cn } from '@/lib/utils';
import {
  getVideoElement,
  selectActiveRevision,
  selectFps,
  useRevisionsStore,
  type MarkupTool,
} from './store';

/*
 * Drawing on the frame, the spot and the magnifier, over the video's picture.
 * One canvas the size of the picture shows the marks waiting for the next
 * comment (faded when the playhead is on another frame), the mark being
 * drawn, and, when nothing is being drawn, the marks of the highlighted
 * comment on its own frame. It takes the pointer only while a tool or the
 * magnifier is on; otherwise a click still plays and pauses the video.
 */

/** The magnifier: its size on screen, and how much it enlarges the picture as shown. */
const LOUPE = 240;
const LOUPE_ZOOM = 3;
/** A freehand stroke keeps a point every few screen pixels. */
const MIN_STEP_PX = 2;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where the picture sits in the <video> box: object-contain letterboxes it. */
function pictureRect(el: HTMLVideoElement): Rect | null {
  const vw = el.videoWidth;
  const vh = el.videoHeight;
  const bw = el.clientWidth;
  const bh = el.clientHeight;
  if (!vw || !vh || !bw || !bh) return null;
  const scale = Math.min(bw / vw, bh / vh);
  const width = vw * scale;
  const height = vh * scale;
  return {
    left: el.offsetLeft + (bw - width) / 2,
    top: el.offsetTop + (bh - height) / 2,
    width,
    height,
  };
}

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a &&
    !!b &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5);

function usePictureRect(videoUrl: string | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    const el = getVideoElement();
    if (!el || !videoUrl) {
      setRect(null);
      return;
    }
    const update = () =>
      setRect(prev => {
        const next = pictureRect(el);
        return sameRect(prev, next) ? prev : next;
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener('loadedmetadata', update);
    // a stream can change its frame size
    el.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      el.removeEventListener('loadedmetadata', update);
      el.removeEventListener('resize', update);
    };
  }, [videoUrl]);
  return rect;
}

/** drawImage of a region that may run past the source's edges: only the part inside is drawn. */
function drawRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  [srcW, srcH]: [number, number],
  [sx, sy, sw, sh]: [number, number, number, number],
  [dw, dh]: [number, number],
) {
  const x0 = Math.max(0, sx);
  const y0 = Math.max(0, sy);
  const x1 = Math.min(srcW, sx + sw);
  const y1 = Math.min(srcH, sy + sh);
  if (x1 <= x0 || y1 <= y0) return;
  const kx = dw / sw;
  const ky = dh / sh;
  ctx.drawImage(
    source,
    x0,
    y0,
    x1 - x0,
    y1 - y0,
    (x0 - sx) * kx,
    (y0 - sy) * ky,
    (x1 - x0) * kx,
    (y1 - y0) * ky,
  );
}

type StoreState = ReturnType<typeof useRevisionsStore.getState>;

/** The highlighted comment, when it has marks or a spot to show. */
function shownComment(s: StoreState): PointComment | null {
  if (!s.highlightCommentId) return null;
  const c = selectActiveRevision(s)?.comments.find(
    c => c.id === s.highlightCommentId,
  );
  return c?.kind === 'point' && (c.drawing?.length || c.spot) ? c : null;
}

/** What a click does: the tool, or with only the magnifier on, the spot. */
const activeTool = (s: Pick<StoreState, 'tool' | 'loupe'>): MarkupTool | null =>
  s.tool ?? (s.loupe ? 'spot' : null);

interface Draft {
  pointerId: number;
  mark: Mark | null;
  spot: Spot | null;
  /** Last kept point of a freehand stroke, in screen pixels. */
  last: [number, number];
}

export function MarkupLayer() {
  const videoUrl = useRevisionsStore(s => s.video?.url);
  const rect = usePictureRect(videoUrl);
  const tool = useRevisionsStore(s => s.tool);
  const loupe = useRevisionsStore(s => s.loupe);
  const markColor = useRevisionsStore(s => s.markColor);
  const active = activeTool({ tool, loupe });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const draft = useRef<Draft | null>(null);
  /** The pointer over the picture, in screen pixels from its corner. */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const schedulePaint = useRef<() => void>(() => undefined);

  // Everything is drawn from the store as it is now, at most once a frame.
  useEffect(() => {
    if (!rect) return;
    let request = 0;
    const paintMarks = (s: StoreState, r: Rect) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      const d = draft.current;
      // marks belong to one frame: a playing video shows none
      if (s.playing && !d) return;
      const frame = frameAt(s.currentTime, selectFps(s));
      const { sketch } = s;
      const comment = s.tool ? null : shownComment(s);
      if (sketch && sketch.frame === frame) {
        drawMarks(ctx, sketch.marks, w, h);
        if (sketch.spot && !d?.spot) drawSpot(ctx, sketch.spot, w, h);
      } else if (comment && comment.frame === frame) {
        drawMarks(ctx, comment.drawing ?? [], w, h);
        if (comment.spot) drawSpot(ctx, comment.spot, w, h);
      } else if (sketch) {
        // waiting for a comment, on another frame
        ctx.globalAlpha = 0.3;
        drawMarks(ctx, sketch.marks, w, h);
        if (sketch.spot) drawSpot(ctx, sketch.spot, w, h);
        ctx.globalAlpha = 1;
      }
      if (d?.mark) drawMarks(ctx, [d.mark], w, h);
      if (d?.spot) drawSpot(ctx, d.spot, w, h);
    };

    const paintLoupe = (s: StoreState, r: Rect) => {
      const canvas = loupeRef.current;
      const ctx = canvas?.getContext('2d');
      const el = getVideoElement();
      const p = pointer.current;
      if (!canvas || !ctx) return;
      if (!s.loupe || !p || !el?.videoWidth) {
        canvas.style.display = 'none';
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const size = Math.round(LOUPE * dpr);
      if (canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      canvas.style.display = 'block';
      canvas.style.transform = `translate(${p.x - LOUPE / 2}px, ${p.y - LOUPE / 2}px)`;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      // the picture around the pointer, LOUPE_ZOOM× its size on screen
      const span = LOUPE / LOUPE_ZOOM; // screen pixels the loupe covers
      const k = el.videoWidth / r.width; // video pixels per screen pixel
      drawRegion(
        ctx,
        el,
        [el.videoWidth, el.videoHeight],
        [(p.x - span / 2) * k, (p.y - span / 2) * k, span * k, span * k],
        [size, size],
      );
      // the marks, from their canvas
      const marks = canvasRef.current;
      if (marks?.width) {
        const m = marks.width / r.width;
        drawRegion(
          ctx,
          marks,
          [marks.width, marks.height],
          [(p.x - span / 2) * m, (p.y - span / 2) * m, span * m, span * m],
          [size, size],
        );
      }
      // where a click lands
      const c = size / 2;
      const arm = 9 * dpr;
      ctx.lineCap = 'round';
      for (const [width, color] of [
        [3 * dpr, 'rgba(0, 0, 0, 0.7)'],
        [1.25 * dpr, '#fff'],
      ] as const) {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(c - arm, c);
        ctx.lineTo(c + arm, c);
        ctx.moveTo(c, c - arm);
        ctx.lineTo(c, c + arm);
        ctx.stroke();
      }
    };

    const paint = () => {
      request = 0;
      const s = useRevisionsStore.getState();
      paintMarks(s, rect);
      paintLoupe(s, rect);
    };
    const schedule = () => {
      if (!request) request = requestAnimationFrame(paint);
    };
    schedulePaint.current = schedule;
    schedule();

    const unsubscribe = useRevisionsStore.subscribe(schedule);
    // a seek lands after the store moved the playhead: the magnifier shows the new frame
    const el = getVideoElement();
    el?.addEventListener('seeked', schedule);
    el?.addEventListener('loadeddata', schedule);
    return () => {
      unsubscribe();
      el?.removeEventListener('seeked', schedule);
      el?.removeEventListener('loadeddata', schedule);
      cancelAnimationFrame(request);
      schedulePaint.current = () => undefined;
    };
  }, [rect, videoUrl]);

  // A tool turned off mid-stroke drops the stroke.
  useEffect(() => {
    if (!active) {
      draft.current = null;
      pointer.current = null;
      schedulePaint.current();
    }
  }, [active]);

  if (!rect) return null;

  const at = (e: { clientX: number; clientY: number }, box: DOMRect) => {
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    return {
      px,
      py,
      x: roundFraction(px / box.width),
      y: roundFraction(py / box.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const store = useRevisionsStore.getState();
    const t = activeTool(store);
    if (!t || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    store.pause();
    const p = at(e, e.currentTarget.getBoundingClientRect());
    draft.current =
      t === 'spot'
        ? { pointerId: e.pointerId, mark: null, spot: p, last: [p.px, p.py] }
        : {
            pointerId: e.pointerId,
            spot: null,
            mark: {
              tool: t,
              color: store.markColor,
              points: isFreehand(t)
                ? [[p.x, p.y]]
                : [
                    [p.x, p.y],
                    [p.x, p.y],
                  ],
            },
            last: [p.px, p.py],
          };
    schedulePaint.current();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const p = at(e, box);
    pointer.current = { x: p.px, y: p.py };
    const d = draft.current;
    if (d && d.pointerId === e.pointerId) {
      if (d.spot) {
        d.spot = { x: p.x, y: p.y };
      } else if (d.mark && isFreehand(d.mark.tool)) {
        // every point the browser saw since the last event, for a smooth stroke
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
        for (const ev of events.length ? events : [e]) {
          const q = at(ev, box);
          if (Math.hypot(q.px - d.last[0], q.py - d.last[1]) < MIN_STEP_PX)
            continue;
          d.mark.points.push([q.x, q.y]);
          d.last = [q.px, q.py];
        }
      } else if (d.mark) {
        d.mark.points[1] = [p.x, p.y];
      }
    }
    schedulePaint.current();
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>, keep: boolean) => {
    const d = draft.current;
    if (!d || d.pointerId !== e.pointerId) return;
    draft.current = null;
    const store = useRevisionsStore.getState();
    if (keep && d.spot) store.setSpot({ x: d.spot.x, y: d.spot.y });
    else if (
      keep &&
      d.mark &&
      isMeaningfulMark(d.mark, rect.width / rect.height)
    )
      store.addMark(d.mark);
    schedulePaint.current();
  };

  const color = MARK_COLORS[markColor];
  return (
    <>
      <div
        className={cn(
          'absolute touch-none select-none',
          active ? 'pointer-events-auto' : 'pointer-events-none',
          loupe ? 'cursor-none' : active && 'cursor-crosshair',
        )}
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={e => finish(e, true)}
        onPointerCancel={e => finish(e, false)}
        onPointerLeave={() => {
          pointer.current = null;
          schedulePaint.current();
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        <canvas
          ref={loupeRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-white/80 shadow-2xl"
          style={{ width: LOUPE, height: LOUPE, display: 'none' }}
        />
      </div>
      {active && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex max-w-[90%] -translate-x-1/2 items-center gap-1.5 truncate rounded-full bg-black/75 px-3 py-1 text-[11px] text-white">
          {tool && tool !== 'spot' ? (
            <>
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: color.hex }}
              />
              <span className="truncate">
                {MARK_TOOLS[tool].label} · {color.label.toLowerCase()}:{' '}
                {color.meaning} · Esc to stop
              </span>
            </>
          ) : (
            <span className="truncate">
              {tool === 'spot'
                ? 'Click the spot the comment is about'
                : 'Magnifier: click to pin the spot · Z to close'}
            </span>
          )}
        </div>
      )}
    </>
  );
}
