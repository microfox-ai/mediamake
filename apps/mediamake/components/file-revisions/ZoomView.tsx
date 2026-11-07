'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FolderSearchIcon,
  LockIcon,
  Maximize2Icon,
  MoveHorizontalIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  SmartphoneIcon,
  StarIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react';
import { absolutePath, copyPath, revealOrCopy } from '@/lib/file-revisions/reveal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Hint, isTextField } from '@/components/revisions/keyboard';
import { clock } from '@/lib/file-revisions/revision-file';
import type { ImageAction, ImageComment } from '@/lib/file-revisions/types';
import { ActionMarks, Badges, Still, useFormat } from './FileGrid';
import { playable, selectActiveRevision, useFileRevisionsStore } from './store';

const LOUPE = 260;
const LOUPE_ZOOM = 3;

/** Waits until a seek lands, so a snapshot shows the frame the comment is about. */
const seekTo = (media: HTMLMediaElement, t: number) =>
  Math.abs(media.currentTime - t) < 0.04
    ? Promise.resolve()
    : new Promise<void>(resolve => {
        media.addEventListener('seeked', () => resolve(), { once: true });
        media.currentTime = t;
      });

/** Play/pause, the time, a scrubber with each pinned comment's time on it, and mute. */
function PlayerBar({ media, pins, onSeek }: { media: HTMLMediaElement | null; pins: ImageComment[]; onSeek: (c: ImageComment) => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!media) return;
    const rerender = () => setTick(t => t + 1);
    const events = ['timeupdate', 'play', 'pause', 'durationchange', 'volumechange', 'loadedmetadata', 'seeked'];
    for (const ev of events) media.addEventListener(ev, rerender);
    return () => {
      for (const ev of events) media.removeEventListener(ev, rerender);
    };
  }, [media]);
  const duration = media && Number.isFinite(media.duration) ? media.duration : 0;
  const time = media?.currentTime ?? 0;
  const paused = media?.paused ?? true;
  const button = 'shrink-0 rounded p-1.5 hover:bg-white/10';
  return (
    <div className="flex w-full max-w-4xl shrink-0 items-center gap-2" onClick={e => e.stopPropagation()}>
      <Hint label={paused ? 'Play' : 'Pause'} keys="Space">
        <button type="button" className={button} onClick={() => (media?.paused ? void media.play() : media?.pause())}>
          {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
        </button>
      </Hint>
      <span className="w-24 shrink-0 text-xs tabular-nums text-white/70">
        {clock(time)} / {clock(duration)}
      </span>
      <div className="relative flex h-6 min-w-0 flex-1 items-center">
        <input
          type="range"
          aria-label="Time"
          min={0}
          max={duration || 1}
          step={0.01}
          value={time}
          onChange={e => media && (media.currentTime = Number(e.target.value))}
          className="w-full accent-amber-400"
        />
        {duration > 0 &&
          pins
            .filter(c => c.pin?.t !== undefined)
            .map(c => (
              <Hint key={c.id} label={`${c.id} at ${clock(c.pin!.t!)}: ${c.text}`}>
                <button
                  type="button"
                  aria-label={`Go to ${c.id}`}
                  onClick={() => onSeek(c)}
                  className={cn('absolute top-0 h-2 w-1.5 -translate-x-1/2 rounded-sm', c.status === 'done' ? 'bg-emerald-400' : 'bg-amber-400')}
                  style={{ left: `${(c.pin!.t! / duration) * 100}%` }}
                />
              </Hint>
            ))}
      </div>
      <Hint label={media?.muted ? 'Unmute' : 'Mute'} keys="M">
        <button type="button" className={button} onClick={() => media && (media.muted = !media.muted)}>
          {media?.muted ? <VolumeXIcon className="size-4" /> : <Volume2Icon className="size-4" />}
        </button>
      </Hint>
    </div>
  );
}

/** How far the picture can be zoomed, as a multiple of its fitted size. */
const MAX_ZOOM = 8;
/** The gap kept around the fitted picture. */
const GUTTER = 16;

type View = { z: number; x: number; y: number };
const FIT: View = { z: 1, x: 0, y: 0 };

type ZoomGroup = { key: string; name: string; label: string; ids: string[] };

/** The set's groups with the files of this zoom in each, in the zoom's order; files in no group are put together. */
function groupsOf(styles: { id: string; name: string; variants: { id: string }[] }[], ids: string[]): ZoomGroup[] {
  const groups: ZoomGroup[] = [];
  const placed = new Set<string>();
  for (const style of styles) {
    const own = new Set(style.variants.map(v => v.id));
    const in_ = ids.filter(i => own.has(i) && !placed.has(i));
    in_.forEach(i => placed.add(i));
    if (in_.length) groups.push({ key: style.id, name: style.name, label: style.id === 'all' || style.id === style.name ? style.name : `${style.id} ${style.name}`, ids: in_ });
  }
  const rest = ids.filter(i => !placed.has(i));
  if (rest.length) groups.push({ key: '__rest', name: 'Other', label: 'Other', ids: rest });
  return groups;
}

/** The last part of an ID (`2-storyboard-pages/board-1` → `board-1`), for labels with little room. */
const shortId = (id: string) => id.split('/').filter(Boolean).pop() ?? id;

/**
 * Full-window view of one file at a time, for catching small mistakes:
 * the picture fills the window and zooms (wheel or pinch, + / − / 0, W to fill the width, drag to pan),
 * a magnifier follows the pointer, a feed-size copy shows how it reads small,
 * and clicking the picture pins a comment to that spot (saved with a zoomed crop).
 * Videos and audio play here; a comment pinned on them keeps the time, and on a
 * video the frame it was paused on.
 */
export function ZoomView() {
  const zoom = useFileRevisionsStore(s => s.zoom);
  const job = useFileRevisionsStore(s => s.job);
  const renders = useFileRevisionsStore(s => s.renders);
  const revision = useFileRevisionsStore(selectActiveRevision);
  const closeZoom = useFileRevisionsStore(s => s.closeZoom);
  const zoomStep = useFileRevisionsStore(s => s.zoomStep);
  const toggleAction = useFileRevisionsStore(s => s.toggleAction);
  const addComment = useFileRevisionsStore(s => s.addComment);
  const imgRef = useRef<HTMLImageElement>(null);
  const [media, setMedia] = useState<HTMLMediaElement | null>(null);
  const [loupe, setLoupe] = useState(true);
  const [feed, setFeed] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; t?: number } | null>(null);
  const format = useFormat();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  // the stage the picture fills, and how far it is zoomed and panned in it
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [viewState, setView] = useState<View>(FIT);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const [panning, setPanning] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const id = zoom ? zoom.ids[zoom.index] : null;
  const render = id ? renders[id] : undefined;
  const variant = job?.index.styles.flatMap(s => s.variants.map(v => ({ ...v, style: s.name }))).find(v => v.id === id);
  const plays = playable(render);
  // the picture a pin and the loupe work on: a video itself, or the image (an audio file's still)
  const picture = (): HTMLImageElement | HTMLVideoElement | null => (media instanceof HTMLVideoElement ? media : imgRef.current);
  // the set's shape, or this image's own when the set mixes shapes
  const shape = format.aspect
    ? { aspect: format.aspect, ratio: format.ratio! }
    : render?.size
      ? { aspect: `${render.size[0]} / ${render.size[1]}`, ratio: render.size[0] / render.size[1] }
      : { aspect: '4 / 3', ratio: 4 / 3 };
  const pins = (revision?.comments ?? []).filter(c => c.pin?.image === id);
  // the set's groups (sections), each holding the files of this zoom in order; a file in no group gets one of its own
  const groups = groupsOf(job?.index.styles ?? [], zoom?.ids ?? []);
  const groupAt = Math.max(0, groups.findIndex(g => id !== null && g.ids.includes(id)));
  const group = groups[groupAt];
  const go = (target: string | undefined) => {
    if (!zoom || !target) return;
    const i = zoom.ids.indexOf(target);
    if (i >= 0) useFileRevisionsStore.setState({ zoom: { ...zoom, index: i } });
  };
  /** ← →: the previous or next group (its first file). A set of one group steps through its files instead. */
  const stepGroup = (delta: number) => {
    if (groups.length < 2) return zoomStep(delta);
    go(groups[(groupAt + delta + groups.length) % groups.length].ids[0]);
  };
  /** ↑ ↓: the previous or next file in the group; past its end, into the next or previous group. */
  const stepInGroup = (delta: number) => {
    if (!group || !id) return;
    const at = group.ids.indexOf(id) + delta;
    if (at >= 0 && at < group.ids.length) return go(group.ids[at]);
    const next = groups[(groupAt + delta + groups.length) % groups.length];
    go(delta > 0 ? next.ids[0] : next.ids[next.ids.length - 1]);
  };

  // the picture's fitted size: as large as the stage allows, keeping its shape
  const boxW = Math.max(0, Math.min(stage.w - 2 * GUTTER, (stage.h - 2 * GUTTER) * shape.ratio));
  const boxH = boxW / shape.ratio;
  const fit = useRef({ boxW, boxH, stage });
  fit.current = { boxW, boxH, stage };

  const viewRef = useRef(FIT);
  viewRef.current = viewState;
  /** Moves the zoomed picture, never past its edges. */
  const panBy = (dx: number, dy: number) =>
    setView(v => {
      const { boxW: w, boxH: h, stage: s } = fit.current;
      const maxX = Math.max(0, (w * v.z - s.w) / 2);
      const maxY = Math.max(0, (h * v.z - s.h) / 2);
      return { ...v, x: Math.min(maxX, Math.max(-maxX, v.x + dx)), y: Math.min(maxY, Math.max(-maxY, v.y + dy)) };
    });
  /** Zooms until the picture fills the window's width, starting at its top (a tall page reads top to bottom). */
  const fitWidth = () => {
    const { boxW: w, boxH: h, stage: s } = fit.current;
    const z = Math.min(MAX_ZOOM, (s.w - 2 * GUTTER) / Math.max(1, w));
    if (z > 1.001) setView({ z, x: 0, y: Math.max(0, (h * z - s.h) / 2) });
  };
  /** Zooms to `z`, keeping the point `c` (from the stage's centre) where it is on screen. */
  const zoomAt = (z: number | ((z: number) => number), c = { x: 0, y: 0 }) =>
    setView(v => {
      const nz = Math.min(MAX_ZOOM, Math.max(1, typeof z === 'function' ? z(v.z) : z));
      const { boxW: w, boxH: h, stage: s } = fit.current;
      const clamp = (p: number, size: number, room: number) => {
        const max = Math.max(0, (size * nz - room) / 2);
        return Math.min(max, Math.max(-max, p));
      };
      return {
        z: nz,
        x: clamp(c.x - ((c.x - v.x) / v.z) * nz, w, s.w),
        y: clamp(c.y - ((c.y - v.y) / v.z) * nz, h, s.h),
      };
    });

  useEffect(() => {
    if (!stageEl) return;
    const measure = () => setStage({ w: stageEl.clientWidth, h: stageEl.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stageEl);
    // wheel or trackpad pinch zooms around the pointer (non-passive, so the page doesn't scroll)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = stageEl.getBoundingClientRect();
      const c = { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
      // pinch (or ⌘/Ctrl + wheel) zooms; a plain wheel zooms in from Fit, then scrolls around the zoomed picture
      if (e.ctrlKey || e.metaKey) zoomAt(z => z * Math.exp(-e.deltaY * 0.01), c);
      else if (viewRef.current.z > 1.001) panBy(-e.deltaX, -e.deltaY);
      else zoomAt(z => z * Math.exp(-e.deltaY * 0.002), c);
    };
    stageEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      stageEl.removeEventListener('wheel', onWheel);
    };
  }, [stageEl]);

  useEffect(() => {
    setDraft(null);
    setText('');
    setView(FIT);
    stripRef.current?.querySelector('[data-current=true]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [id]);

  // a resize keeps the zoom but re-centres, so the picture never drifts off the stage
  useEffect(() => setView(v => (v.z === 1 ? v : { ...v, x: 0, y: 0 })), [stage.w, stage.h]);

  const seekPin = (c: ImageComment) => {
    if (!media || c.pin?.t === undefined) return;
    media.pause();
    media.currentTime = c.pin.t;
  };

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTextField(e.target)) {
        if (e.key === 'Escape') {
          setDraft(null);
          (e.target as HTMLElement).blur();
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || !id) return;
      const act = (a: ImageAction) => void toggleAction(a, [id]);
      if (media && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        media.currentTime = Math.max(0, media.currentTime + (e.key === 'ArrowRight' ? 5 : -5));
        return;
      }
      switch (e.key) {
        case ' ':
          e.preventDefault();
          // a video or song plays; a picture is kept as it is
          if (!media) act('keep');
          else if (media.paused) void media.play();
          else media.pause();
          break;
        case 'm':
        case 'M':
          if (!media) return;
          media.muted = !media.muted;
          break;
        case 'Escape':
          if (draft) setDraft(null);
          else closeZoom();
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          stepGroup(e.key === 'ArrowRight' ? 1 : -1);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          e.preventDefault();
          stepInGroup(e.key === 'ArrowDown' ? 1 : -1);
          break;
        case '+':
        case '=':
          zoomAt(z => z * 1.5);
          break;
        case '-':
        case '_':
          zoomAt(z => z / 1.5);
          break;
        case '0':
          setView(FIT);
          break;
        case 'w':
        case 'W':
          fitWidth();
          break;
        case 'f':
        case 'F':
          act('final');
          break;
        case 'k':
        case 'K':
          act('keep');
          break;
        case 'd':
        case 'D':
          act('drop');
          break;
        case 'l':
        case 'L':
          if (plays) return;
          setLoupe(v => !v);
          break;
        case 'v':
        case 'V':
          setFeed(v => !v);
          break;
        default:
          return;
      }
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [zoom, id, draft, media, plays, closeZoom, zoomStep, toggleAction, groups, groupAt, group]);

  if (!zoom || !id) return null;
  const view = viewState;

  const zoomed = view.z > 1.001;
  /** Where a spot on the picture (0–1 across and down) is on the stage, in pixels. */
  const onStage = (p: { x: number; y: number }) => ({
    left: stage.w / 2 + view.x + (p.x - 0.5) * boxW * view.z,
    top: stage.h / 2 + view.y + (p.y - 0.5) * boxH * view.z,
  });
  const at = (e: React.MouseEvent) => {
    const r = (picture() ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  /** Click the picture: pin a comment there (a playing video or audio pauses, and the time is kept). A drag that panned doesn't pin. */
  const pinAt = (e: React.MouseEvent) => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    const spot = at(e);
    if (media) media.pause();
    setDraft({ ...spot, ...(media ? { t: media.currentTime } : {}) });
  };
  const onPointerDown = (e: React.PointerEvent) => {
    dragged.current = false;
    if (e.button !== 0 || !zoomed) return;
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !(e.buttons & 1)) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) setPanning(true);
    d.moved = true;
    dragged.current = true;
    const maxX = Math.max(0, (boxW * view.z - stage.w) / 2);
    const maxY = Math.max(0, (boxH * view.z - stage.h) / 2);
    setView(v => ({ ...v, x: Math.min(maxX, Math.max(-maxX, d.view.x + dx)), y: Math.min(maxY, Math.max(-maxY, d.view.y + dy)) }));
  };
  const endDrag = () => {
    drag.current = null;
    setPanning(false);
  };
  const submit = async () => {
    if (!draft || !text.trim() || busy) return;
    setBusy(true);
    if (media && draft.t !== undefined) await seekTo(media, draft.t);
    // the zoomed crop is written with it, which takes a moment
    const ok = await addComment(text, { pin: { image: id, ...draft }, image: (plays?.kind !== 'audio' && picture()) || undefined }).finally(() => setBusy(false));
    if (ok) {
      setDraft(null);
      setText('');
    }
  };
  const actionButton = (action: ImageAction, label: string, keys: string, icon: React.ReactNode, on: boolean) => (
    <Hint label={label} keys={keys} side="bottom">
      <Button size="sm" variant={on ? 'default' : 'outline'} className="h-7 gap-1 border-white/20 bg-transparent px-2 text-xs text-white data-[on=true]:bg-white data-[on=true]:text-black" data-on={on} onClick={() => void toggleAction(action, [id])}>
        {icon}
        {label.split(' ')[0]}
      </Button>
    </Hint>
  );
  const pictureCursor = zoomed ? (panning ? 'cursor-grabbing' : 'cursor-grab') : loupe && !plays ? 'cursor-none' : 'cursor-crosshair';
  const showLoupe = loupe && !plays && !zoomed && pointer && render && imgRef.current;
  const draftAt = draft && onStage(draft);
  const floating = 'rounded-full border border-white/10 bg-neutral-900/80 shadow-lg backdrop-blur';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white" role="dialog" aria-label={`Zoom on ${id}`}>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <span className="max-w-[40%] truncate rounded bg-amber-400 px-2 text-sm font-extrabold text-black" title={id}>
          {id}
        </span>
        <span className="min-w-0 truncate text-sm">
          {variant?.style}
          {variant?.note && <span className="text-white/60"> · {variant.note}</span>}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-white/50">
          {groups.length > 1 && group ? `${group.ids.indexOf(id) + 1} / ${group.ids.length} in ${group.label} · ` : ''}
          {zoom.index + 1} / {zoom.ids.length}
        </span>
        <Badges id={id} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actionButton('final', format.poster ? 'Cover (the one to upload)' : 'Final (pick for upload)', 'F', <StarIcon className="size-3.5" />, !!revision?.final.includes(id))}
          {actionButton('keep', 'Keep as it is', plays ? 'K' : 'Space', <LockIcon className="size-3.5" />, !!revision?.keep.includes(id))}
          {actionButton('drop', 'Drop', 'D', <XIcon className="size-3.5" />, !!revision?.drop.includes(id))}
          <span className="mx-1 h-5 w-px bg-white/20" />
          <Hint label="Show this file in Finder (copies the path when it can't)" side="bottom">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-white hover:bg-white/10 hover:text-white" onClick={() => void revealOrCopy(absolutePath(job?.index, variant?.media ?? variant?.file), job?.name ?? id)}>
              <FolderSearchIcon className="size-4" />
            </Button>
          </Hint>
          <Hint label="Copy this file's path" side="bottom">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-white hover:bg-white/10 hover:text-white" onClick={() => void copyPath(absolutePath(job?.index, variant?.media ?? variant?.file), job?.name ?? id)}>
              <CopyIcon className="size-4" />
            </Button>
          </Hint>
          {!plays && (
            <Hint label="Magnifier (when not zoomed)" keys="L" side="bottom">
              <Button size="sm" variant="ghost" className={cn('h-7 px-2 text-white hover:bg-white/10 hover:text-white', loupe && 'bg-white/15')} onClick={() => setLoupe(v => !v)}>
                <SearchIcon className="size-4" />
              </Button>
            </Hint>
          )}
          {!plays && (
            <Hint label={format.smallHint} keys="V" side="bottom">
              <Button size="sm" variant="ghost" className={cn('h-7 px-2 text-white hover:bg-white/10 hover:text-white', feed && 'bg-white/15')} onClick={() => setFeed(v => !v)}>
                <SmartphoneIcon className="size-4" />
              </Button>
            </Hint>
          )}
          <Hint label="Close" keys="Esc" side="bottom">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-white hover:bg-white/10 hover:text-white" onClick={closeZoom}>
              <XIcon className="size-4" />
            </Button>
          </Hint>
        </div>
      </div>

      <div
        ref={setStageEl}
        className="relative min-h-0 flex-1 touch-none overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: boxW,
            height: boxH,
            transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.z})`,
            transition: panning ? undefined : 'transform 80ms ease-out',
          }}
        >
          {render && plays?.kind === 'video' && (
            <video
              key={id}
              ref={setMedia}
              src={plays.url}
              poster={render.kind === 'image' ? render.url : undefined}
              playsInline
              preload="metadata"
              className={cn('size-full select-none bg-black object-contain', pictureCursor)}
              onClick={pinAt}
            />
          )}
          {render && plays?.kind === 'audio' && (
            <>
              <audio key={id} ref={setMedia} src={plays.url} preload="metadata" />
              {render.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img ref={imgRef} src={render.url} alt={id} draggable={false} className={cn('size-full select-none object-contain', pictureCursor)} onClick={pinAt} />
              ) : (
                <button type="button" className={cn('flex size-full flex-col items-center justify-center gap-3 rounded bg-white/5 text-white/70', pictureCursor)} onClick={pinAt}>
                  <MusicIcon className="size-12" />
                  <span className="max-w-[80%] truncate text-sm">{variant?.media ?? variant?.file}</span>
                </button>
              )}
            </>
          )}
          {render && !plays && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={render.url}
              alt={id}
              draggable={false}
              className={cn('size-full select-none object-contain', pictureCursor)}
              onMouseMove={e => setPointer(at(e))}
              onMouseLeave={() => setPointer(null)}
              onClick={pinAt}
            />
          )}
        </div>

        <ActionMarks id={id} size="lg" className="absolute left-3 top-3 z-20" />

        {/* pins, the loupe and the comment box sit over the picture at its zoom, but keep their own size */}
        {plays?.kind !== 'audio' &&
          pins.map(c => (
            <Hint key={c.id} label={`${c.id}${c.pin?.t !== undefined ? ` at ${clock(c.pin.t)}` : ''}: ${c.text}`}>
              <span
                className={cn('absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black text-[10px] font-bold', c.status === 'done' ? 'bg-emerald-400 text-black' : 'bg-amber-400 text-black', c.pin?.t !== undefined && 'cursor-pointer')}
                style={onStage(c.pin!)}
                onClick={() => seekPin(c)}
              >
                {c.id.replace(/\D/g, '')}
              </span>
            </Hint>
          ))}
        {draftAt && <span className="pointer-events-none absolute z-10 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-amber-400 shadow-[0_0_0_2px_black]" style={draftAt} />}
        {showLoupe && (
          <span
            className="pointer-events-none absolute z-10 rounded-full border-2 border-white/80 shadow-2xl"
            style={{
              width: LOUPE,
              height: LOUPE,
              left: onStage(pointer).left - LOUPE / 2,
              top: onStage(pointer).top - LOUPE / 2,
              backgroundImage: `url(${render.url})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${boxW * LOUPE_ZOOM}px ${boxH * LOUPE_ZOOM}px`,
              backgroundPosition: `${LOUPE / 2 - pointer.x * boxW * LOUPE_ZOOM}px ${LOUPE / 2 - pointer.y * boxH * LOUPE_ZOOM}px`,
            }}
          />
        )}
        {draft && draftAt && (
          <div
            className="absolute z-30 w-72 rounded-md border border-white/20 bg-neutral-900 p-2 shadow-xl"
            style={{
              left: Math.min(Math.max(8, draftAt.left - 144), stage.w - 296),
              top: draftAt.top > stage.h * 0.6 ? undefined : draftAt.top + 22,
              bottom: draftAt.top > stage.h * 0.6 ? stage.h - draftAt.top + 22 : undefined,
            }}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
          >
            <Textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={draft.t !== undefined ? `What's wrong at ${clock(draft.t)} on ${id}?` : `What's wrong at this spot on ${id}?`}
              className="min-h-16 border-white/20 bg-black text-sm text-white"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-white hover:bg-white/10 hover:text-white" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Hint label="Add the comment" keys="Mod Enter">
                <Button size="sm" className="h-7" disabled={!text.trim() || busy} onClick={() => void submit()}>
                  {busy ? 'Saving…' : 'Pin comment'}
                </Button>
              </Hint>
            </div>
          </div>
        )}

        <button type="button" aria-label="Previous file" title="Previous file (↑)" onClick={() => stepInGroup(-1)} onPointerDown={e => e.stopPropagation()} className={cn('absolute left-3 top-1/2 z-20 -translate-y-1/2 p-2 hover:bg-neutral-800', floating)}>
          <ChevronLeftIcon className="size-5" />
        </button>
        <button type="button" aria-label="Next file" title="Next file (↓)" onClick={() => stepInGroup(1)} onPointerDown={e => e.stopPropagation()} className={cn('absolute right-3 top-1/2 z-20 -translate-y-1/2 p-2 hover:bg-neutral-800', floating)}>
          <ChevronRightIcon className="size-5" />
        </button>

        <div className={cn('absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 p-1', floating)} onPointerDown={e => e.stopPropagation()}>
          <Hint label="Zoom out" keys="-">
            <button type="button" aria-label="Zoom out" disabled={!zoomed} className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-40" onClick={() => zoomAt(z => z / 1.5)}>
              <ZoomOutIcon className="size-4" />
            </button>
          </Hint>
          <Hint label={zoomed ? 'Fit to the window' : 'Zoom to 2×'} keys="0">
            <button type="button" className="w-14 rounded-full py-1 text-center text-xs tabular-nums hover:bg-white/10" onClick={() => (zoomed ? setView(FIT) : zoomAt(2))}>
              {zoomed ? `${view.z.toFixed(1)}×` : 'Fit'}
            </button>
          </Hint>
          <Hint label="Zoom in (or scroll / pinch on the picture)" keys="+">
            <button type="button" aria-label="Zoom in" disabled={view.z >= MAX_ZOOM} className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-40" onClick={() => zoomAt(z => z * 1.5)}>
              <ZoomInIcon className="size-4" />
            </button>
          </Hint>
          {boxW > 0 && boxW < stage.w - 2 * GUTTER - 1 && (
            <Hint label="Fill the window's width" keys="W">
              <button type="button" aria-label="Fill the window's width" className="rounded-full p-1.5 hover:bg-white/10" onClick={fitWidth}>
                <MoveHorizontalIcon className="size-4" />
              </button>
            </Hint>
          )}
          {zoomed && (
            <Hint label="Fit to the window" keys="0">
              <button type="button" aria-label="Fit to the window" className="rounded-full p-1.5 hover:bg-white/10" onClick={() => setView(FIT)}>
                <Maximize2Icon className="size-4" />
              </button>
            </Hint>
          )}
        </div>

        {feed && render && !plays && (
          <div className="absolute right-3 top-3 z-20 rounded-lg border border-white/10 bg-neutral-900/90 p-2 shadow-xl backdrop-blur" onPointerDown={e => e.stopPropagation()}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/60" title={format.smallHint}>
                {format.smallLabel}
              </span>
              <button type="button" aria-label="Hide the small preview" className="rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white" onClick={() => setFeed(false)}>
                <XIcon className="size-3" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={render.url} alt="" style={{ width: format.small }} className="rounded-sm" />
          </div>
        )}
      </div>

      {plays && (
        <div className="flex shrink-0 justify-center px-4 py-2">
          <PlayerBar media={media} pins={pins} onSeek={seekPin} />
        </div>
      )}

      <div className="flex shrink-0 flex-col border-t border-white/10">
        {groups.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto px-4 pt-2">
            <span className="mr-1 shrink-0 text-[10px] uppercase tracking-wide text-white/40">← → groups</span>
            {groups.map((g, i) => (
              <button
                key={g.key}
                type="button"
                title={g.name}
                onClick={() => go(g.ids.includes(id) ? id : g.ids[0])}
                className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs', i === groupAt ? 'bg-amber-400 font-semibold text-black' : 'text-white/70 hover:bg-white/10 hover:text-white')}
              >
                <span className="max-w-48 truncate">{g.label}</span>
                <span className={cn('tabular-nums', i === groupAt ? 'text-black/60' : 'text-white/40')}>{g.ids.length}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-4 px-4 py-2">
          <div ref={stripRef} className="flex min-w-0 flex-1 items-end gap-1.5 overflow-x-auto pb-1">
            {(group?.ids ?? zoom.ids).map(t => {
              const current = t === id;
              return (
                <button
                  key={t}
                  type="button"
                  title={t}
                  data-current={current}
                  onClick={() => go(t)}
                  className={cn('group flex w-16 shrink-0 flex-col gap-1 rounded-md p-1 text-left', current ? 'bg-white/10' : 'opacity-60 hover:bg-white/5 hover:opacity-100')}
                >
                  <span className={cn('relative flex h-12 w-full items-center justify-center overflow-hidden rounded bg-black ring-2', current ? 'ring-amber-400' : 'ring-transparent')}>
                    {renders[t] && <Still render={renders[t]} alt={t} className="max-h-full max-w-full object-contain" />}
                    <ActionMarks id={t} size="sm" className="absolute right-0.5 top-0.5" />
                  </span>
                  <span className={cn('block truncate text-[10px] leading-tight', current ? 'font-semibold text-amber-400' : 'text-white/70')}>{shortId(t)}</span>
                </button>
              );
            })}
          </div>
          <span className="hidden max-w-xs shrink-0 pb-2 text-right text-[11px] leading-snug text-white/40 xl:block">
            Click to comment · scroll to zoom · drag to move · W fill width · {groups.length > 1 ? '← → group · ↑ ↓ file' : '← → or ↑ ↓ file'}
            {plays ? ' · Space play · K keep · ⇧ ← → 5 s' : ' · Space keep'} · Esc close
          </span>
        </div>
      </div>
    </div>
  );
}

