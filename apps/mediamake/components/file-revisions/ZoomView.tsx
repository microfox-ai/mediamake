'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FolderSearchIcon,
  LockIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  SmartphoneIcon,
  StarIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from 'lucide-react';
import { absolutePath, copyPath, revealOrCopy } from '@/lib/file-revisions/reveal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Hint, isTextField } from '@/components/revisions/keyboard';
import { clock } from '@/lib/file-revisions/revision-file';
import type { ImageAction, ImageComment } from '@/lib/file-revisions/types';
import { Badges, Still, useFormat } from './FileGrid';
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

/**
 * Full-window view of one file at a time, for catching small mistakes:
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
  const [feed, setFeed] = useState(true);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; t?: number } | null>(null);
  const format = useFormat();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    setDraft(null);
    setText('');
  }, [id]);

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
          if (!media) return;
          e.preventDefault();
          if (media.paused) void media.play();
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
          zoomStep(e.key === 'ArrowRight' ? 1 : -1);
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
  }, [zoom, id, draft, media, plays, closeZoom, zoomStep, toggleAction]);

  if (!zoom || !id) return null;

  const at = (e: React.MouseEvent) => {
    const r = (picture() ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  /** Click the picture: pin a comment there (a playing video or audio pauses, and the time is kept). */
  const pinAt = (e: React.MouseEvent) => {
    const spot = at(e);
    if (media) media.pause();
    setDraft({ ...spot, ...(media ? { t: media.currentTime } : {}) });
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white" role="dialog" aria-label={`Zoom on ${id}`}>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <span className="rounded bg-amber-400 px-2 text-sm font-extrabold text-black">{id}</span>
        <span className="min-w-0 truncate text-sm">
          {variant?.style}
          {variant?.note && <span className="text-white/60"> · {variant.note}</span>}
        </span>
        <span className="text-xs tabular-nums text-white/50">
          {zoom.index + 1} / {zoom.ids.length}
        </span>
        <Badges id={id} />
        <div className="ml-auto flex items-center gap-2">
          {actionButton('final', format.poster ? 'Cover (the one to upload)' : 'Final (pick for upload)', 'F', <StarIcon className="size-3.5" />, !!revision?.final.includes(id))}
          {actionButton('keep', 'Keep as it is', 'K', <LockIcon className="size-3.5" />, !!revision?.keep.includes(id))}
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
            <Hint label="Magnifier" keys="L" side="bottom">
              <Button size="sm" variant="ghost" className={cn('h-7 px-2 text-white hover:bg-white/10 hover:text-white', loupe && 'bg-white/15')} onClick={() => setLoupe(v => !v)}>
                <SearchIcon className="size-4" />
              </Button>
            </Hint>
          )}
          <Hint label="Feed-size preview" keys="V" side="bottom">
            <Button size="sm" variant="ghost" className={cn('h-7 px-2 text-white hover:bg-white/10 hover:text-white', feed && 'bg-white/15')} onClick={() => setFeed(v => !v)}>
              <SmartphoneIcon className="size-4" />
            </Button>
          </Hint>
          <Hint label="Close" keys="Esc" side="bottom">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-white hover:bg-white/10 hover:text-white" onClick={closeZoom}>
              <XIcon className="size-4" />
            </Button>
          </Hint>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-14 py-4">
        <button type="button" aria-label="Previous" onClick={() => zoomStep(-1)} className="absolute left-3 rounded-full bg-white/10 p-2 hover:bg-white/20">
          <ChevronLeftIcon className="size-5" />
        </button>
        <div
          className="relative max-h-full"
          style={{ aspectRatio: shape.aspect, height: `min(${plays ? '100% - 2.75rem' : '100%'}, calc((100vw - 8rem) / ${shape.ratio}))` }}
        >
          {render && plays?.kind === 'video' && (
            <video
              key={id}
              ref={setMedia}
              src={plays.url}
              poster={render.kind === 'image' ? render.url : undefined}
              playsInline
              preload="metadata"
              className="size-full cursor-crosshair select-none rounded bg-black object-contain"
              onClick={pinAt}
            />
          )}
          {render && plays?.kind === 'audio' && (
            <>
              <audio key={id} ref={setMedia} src={plays.url} preload="metadata" />
              {render.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img ref={imgRef} src={render.url} alt={id} draggable={false} className="size-full cursor-crosshair select-none rounded object-contain" onClick={pinAt} />
              ) : (
                <button type="button" className="flex size-full cursor-crosshair flex-col items-center justify-center gap-3 rounded bg-white/5 text-white/70" onClick={pinAt}>
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
              className={cn('size-full select-none rounded object-contain', loupe ? 'cursor-none' : 'cursor-crosshair')}
              onMouseMove={e => setPointer(at(e))}
              onMouseLeave={() => setPointer(null)}
              onClick={pinAt}
            />
          )}
          {plays?.kind !== 'audio' &&
            pins.map(c => (
              <Hint key={c.id} label={`${c.id}${c.pin?.t !== undefined ? ` at ${clock(c.pin.t)}` : ''}: ${c.text}`}>
                <span
                  className={cn('pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black text-[10px] font-bold', c.status === 'done' ? 'bg-emerald-400 text-black' : 'bg-amber-400 text-black', c.pin?.t !== undefined && 'cursor-pointer')}
                  style={{ left: `${c.pin!.x * 100}%`, top: `${c.pin!.y * 100}%` }}
                  onClick={() => seekPin(c)}
                >
                  {c.id.replace(/\D/g, '')}
                </span>
              </Hint>
            ))}
          {draft && <span className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-amber-400 shadow-[0_0_0_2px_black]" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }} />}
          {loupe && !plays && pointer && render && imgRef.current && (
            <span
              className="pointer-events-none absolute rounded-full border-2 border-white/80 shadow-2xl"
              style={{
                width: LOUPE,
                height: LOUPE,
                left: `calc(${pointer.x * 100}% - ${LOUPE / 2}px)`,
                top: `calc(${pointer.y * 100}% - ${LOUPE / 2}px)`,
                backgroundImage: `url(${render.url})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${imgRef.current.clientWidth * LOUPE_ZOOM}px ${imgRef.current.clientHeight * LOUPE_ZOOM}px`,
                backgroundPosition: `${LOUPE / 2 - pointer.x * imgRef.current.clientWidth * LOUPE_ZOOM}px ${LOUPE / 2 - pointer.y * imgRef.current.clientHeight * LOUPE_ZOOM}px`,
              }}
            />
          )}
          {draft && (
            <div
              className="absolute z-10 w-72 rounded-md border border-white/20 bg-neutral-900 p-2 shadow-xl"
              style={{ left: `clamp(0px, calc(${draft.x * 100}% - 9rem), calc(100% - 18rem))`, top: draft.y > 0.6 ? undefined : `calc(${draft.y * 100}% + 22px)`, bottom: draft.y > 0.6 ? `calc(${(1 - draft.y) * 100}% + 22px)` : undefined }}
              onClick={e => e.stopPropagation()}
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
        </div>
        {plays && <PlayerBar media={media} pins={pins} onSeek={seekPin} />}
        <button type="button" aria-label="Next" onClick={() => zoomStep(1)} className="absolute right-3 rounded-full bg-white/10 p-2 hover:bg-white/20">
          <ChevronRightIcon className="size-5" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {zoom.ids.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => useFileRevisionsStore.setState({ zoom: { ...zoom, index: i } })}
            className={cn('relative h-16 shrink-0 overflow-hidden rounded border-2', i === zoom.index ? 'border-amber-400' : 'border-transparent opacity-60 hover:opacity-100')}
            style={{ aspectRatio: format.aspect ?? (renders[t]?.size ? `${renders[t].size![0]} / ${renders[t].size![1]}` : '4 / 3') }}
          >
            {renders[t] && <Still render={renders[t]} alt={t} className="size-full object-cover" />}
            <span className="absolute bottom-0 left-0 bg-amber-400 px-1 text-[10px] font-bold text-black">{t}</span>
          </button>
        ))}
        </div>
        <span className="hidden shrink-0 pl-2 text-xs text-white/50 xl:block">
          Click the picture to pin a comment{plays ? ' · Space to play · ⇧ ← → 5 s' : ''} · ← → to move · Esc to close
        </span>
        {feed && render && !plays && (
          <Hint label={format.smallHint}>
            <div className="shrink-0">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-white/50">{format.smallLabel}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={render.url} alt="" style={{ width: format.small }} className="rounded-sm" />
            </div>
          </Hint>
        )}
      </div>
    </div>
  );
}
