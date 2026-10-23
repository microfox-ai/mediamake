'use client';

import { useEffect, useRef } from 'react';
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  FileVideoIcon,
  FolderOpenIcon,
  FolderTreeIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  Repeat2Icon,
  StepBackIcon,
  StepForwardIcon,
  TriangleAlertIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { frameAt, formatTime, formatTimecode } from '@/lib/revisions/frames';
import { sectionAt, shotAt } from '@/lib/revisions/map';
import {
  getVideoElement,
  registerVideoElement,
  selectDuration,
  selectFps,
  useRevisionsStore,
} from './store';
import { Hint } from './keyboard';

/** Trackpad scroll distance per frame, and per second with ⇧. */
const WHEEL_PX_PER_FRAME = 12;
const WHEEL_PX_PER_SECOND = 40;
/** A single event this large is a mouse-wheel notch, not a trackpad. */
const WHEEL_NOTCH_PX = 50;

const COMMON_RATES = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60];

/** Median frame interval → the nearest common rate (or the raw value). */
function estimateFps(intervals: number[]): number | null {
  if (intervals.length < 12) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (!(median > 0)) return null;
  const raw = 1 / median;
  const nearest = COMMON_RATES.reduce((best, r) =>
    Math.abs(r - raw) < Math.abs(best - raw) ? r : best,
  );
  return Math.abs(nearest - raw) / raw < 0.03
    ? nearest
    : Math.round(raw * 100) / 100;
}

function EmptyState() {
  const support = useRevisionsStore(s => s.support);
  const pending = useRevisionsStore(s => s.pending);
  const wanted = useRevisionsStore(s => s.wanted);
  const folder = useRevisionsStore(s => s.folder);
  const grantPending = useRevisionsStore(s => s.grantPending);
  const openWanted = useRevisionsStore(s => s.openWanted);
  const openFolderPicker = useRevisionsStore(s => s.openFolderPicker);
  const openVideoPicker = useRevisionsStore(s => s.openVideoPicker);
  const addSourcePicker = useRevisionsStore(s => s.addSourcePicker);
  const hasSources = useRevisionsStore(s => s.sources.length > 0);

  if (support && !support.supported) {
    return (
      <div className="max-w-sm text-center text-sm text-neutral-300">
        <TriangleAlertIcon className="mx-auto mb-3 size-6 text-amber-400" />
        {support.reason === 'insecure'
          ? 'Open this page over https or on localhost: browsers only allow folder access on secure pages.'
          : 'Reviewing local videos needs Chrome, Edge, Arc or Brave. This browser cannot open folders on your computer.'}
      </div>
    );
  }

  if (pending) {
    const label =
      pending.kind === 'folder'
        ? `Allow access to “${pending.handle.name}”${pending.videoName ? ` to review ${pending.videoName}` : ''}`
        : `Confirm the folder of ${pending.handle.name}`;
    return (
      <div className="max-w-sm text-center text-sm text-neutral-300">
        <p className="mb-4">
          {pending.kind === 'folder'
            ? 'Chrome needs one click to let this page read the video and save revisions next to it.'
            : 'Revisions are saved beside the video, so the page needs its folder. The picker opens there: just press Open.'}
        </p>
        <Button
          className="bg-white text-neutral-950 hover:bg-neutral-200"
          onClick={() => void grantPending()}
        >
          <FolderOpenIcon className="size-4" /> {label}
        </Button>
      </div>
    );
  }

  if (wanted) {
    return (
      <div className="max-w-sm text-center text-sm text-neutral-300">
        <p className="mb-4">
          This link asks for{' '}
          <span className="font-medium text-white">{wanted.folder}</span>
          {wanted.video && (
            <>
              {' / '}
              <span className="font-medium text-white">{wanted.video}</span>
            </>
          )}
          . Open that folder once; after that it is one click from History.
        </p>
        <Button
          className="bg-white text-neutral-950 hover:bg-neutral-200"
          onClick={() => void openWanted()}
        >
          <FolderOpenIcon className="size-4" /> Open {wanted.folder}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md text-center text-sm text-neutral-300">
      <p className="mb-1 text-base font-medium text-white">
        {folder ? 'Pick a video on the left' : 'Review a render'}
      </p>
      <p className="mb-5 text-neutral-400">
        Open the folder with the video. Its{' '}
        <code className="text-neutral-200">map.json</code> marks every shot;
        comments, stills and revision files are saved in the same folder for
        Claude to pick up.
      </p>
      <div className="flex justify-center gap-2">
        <Hint label="Open one folder with a video in it">
          <Button
            className="bg-white text-neutral-950 hover:bg-neutral-200"
            onClick={() => void openFolderPicker()}
          >
            <FolderOpenIcon className="size-4" /> Open folder
          </Button>
        </Hint>
        <Hint label="Open a video file (then confirm its folder)">
          <Button
            variant="ghost"
            className="bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => void openVideoPicker()}
          >
            <FileVideoIcon className="size-4" /> Open video
          </Button>
        </Hint>
      </div>
      {!hasSources && (
        <Hint label="Every project folder inside it is listed on each visit">
          <Button
            variant="link"
            className="mt-3 h-auto p-0 text-xs text-neutral-300"
            onClick={() => void addSourcePicker()}
          >
            <FolderTreeIcon className="size-3.5" /> Add a source folder (e.g.
            lyrics_videos/out) to list all projects
          </Button>
        </Hint>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        or drop a folder anywhere on this page
      </p>
    </div>
  );
}

function ShotOverlay() {
  const map = useRevisionsStore(s => s.map);
  const currentTime = useRevisionsStore(s => s.currentTime);
  const fps = useRevisionsStore(selectFps);
  const shot = shotAt(map, currentTime);
  const section = sectionAt(map, currentTime);
  return (
    <>
      {shot && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[70%] rounded bg-black/70 px-2 py-1 text-xs text-white">
          <span className="font-mono font-semibold text-amber-300">
            {shot.id}
          </span>
          {section && (
            <span className="ml-2 text-neutral-400">{section.label}</span>
          )}
          {shot.label && (
            <div className="truncate text-neutral-200">{shot.label}</div>
          )}
          {shot.lyric && (
            <div className="truncate italic text-neutral-400">
              “{shot.lyric}”
            </div>
          )}
        </div>
      )}
      <div className="pointer-events-none absolute right-3 top-3 rounded bg-black/70 px-2 py-1 text-right font-mono text-xs text-white tabular-nums">
        <div>{formatTimecode(currentTime, fps)}</div>
        <div className="text-neutral-400">f{frameAt(currentTime, fps)}</div>
      </div>
    </>
  );
}

function Transport() {
  const playing = useRevisionsStore(s => s.playing);
  const loop = useRevisionsStore(s => s.loop);
  const selection = useRevisionsStore(s => s.selection);
  const currentTime = useRevisionsStore(s => s.currentTime);
  const duration = useRevisionsStore(selectDuration);
  const togglePlay = useRevisionsStore(s => s.togglePlay);
  const stepFrames = useRevisionsStore(s => s.stepFrames);
  const jump = useRevisionsStore(s => s.jump);
  const toggleLoop = useRevisionsStore(s => s.toggleLoop);
  const videoUrl = useRevisionsStore(s => s.video?.url);
  const rate = useRevisionsStore(s => s.rate);
  const muted = useRevisionsStore(s => s.muted);
  const setRate = useRevisionsStore(s => s.setRate);
  const toggleMute = useRevisionsStore(s => s.toggleMute);

  // A new video element starts at 1× and unmuted.
  useEffect(() => {
    const el = getVideoElement();
    if (!el) return;
    el.playbackRate = rate;
    el.muted = muted;
  }, [rate, muted, videoUrl]);

  const iconButton =
    'h-7 w-7 p-0 text-neutral-200 hover:bg-white/10 hover:text-white';
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-t border-white/10 bg-neutral-950 px-2 text-neutral-200">
      <Hint label="Previous shot" keys="Mod ←">
        <Button
          variant="ghost"
          className={iconButton}
          onClick={() => jump(-1, 'shot')}
        >
          <ChevronFirstIcon className="size-4" />
        </Button>
      </Hint>
      <Hint label="Back one frame (or scroll up on the video)" keys="← or ,">
        <Button
          variant="ghost"
          className={iconButton}
          onClick={() => stepFrames(-1)}
        >
          <StepBackIcon className="size-4" />
        </Button>
      </Hint>
      <Hint label={playing ? 'Pause' : 'Play'} keys="Space · PlayAnywhere">
        <Button variant="ghost" className={iconButton} onClick={togglePlay}>
          {playing ? (
            <PauseIcon className="size-4" />
          ) : (
            <PlayIcon className="size-4" />
          )}
        </Button>
      </Hint>
      <Hint
        label="Forward one frame (or scroll down on the video)"
        keys="→ or ."
      >
        <Button
          variant="ghost"
          className={iconButton}
          onClick={() => stepFrames(1)}
        >
          <StepForwardIcon className="size-4" />
        </Button>
      </Hint>
      <Hint label="Next shot" keys="Mod →">
        <Button
          variant="ghost"
          className={iconButton}
          onClick={() => jump(1, 'shot')}
        >
          <ChevronLastIcon className="size-4" />
        </Button>
      </Hint>
      <Hint label="One second back / forward" keys="⇧ ← →">
        <span className="ml-2 font-mono text-xs tabular-nums">
          {formatTime(currentTime)}{' '}
          <span className="text-neutral-500">/ {formatTime(duration)}</span>
        </span>
      </Hint>
      <div className="ml-auto flex items-center gap-1">
        <Hint
          label={
            selection ? 'Loop the selection' : 'Loop (select a range first)'
          }
          keys="L"
        >
          <Button
            variant="ghost"
            className={cn(iconButton, loop && 'bg-white/15 text-amber-300')}
            onClick={toggleLoop}
          >
            <Repeat2Icon className="size-4" />
          </Button>
        </Hint>
        <Hint label="Playback speed">
          <select
            value={rate}
            onChange={e => setRate(Number(e.target.value))}
            className="h-7 rounded bg-transparent px-1 text-xs text-neutral-200 hover:bg-white/10"
          >
            {[0.25, 0.5, 1, 1.5, 2].map(r => (
              <option key={r} value={r} className="bg-neutral-900">
                {r}×
              </option>
            ))}
          </select>
        </Hint>
        <Hint label={muted ? 'Unmute' : 'Mute'} keys="M">
          <Button variant="ghost" className={iconButton} onClick={toggleMute}>
            {muted ? (
              <VolumeXIcon className="size-4" />
            ) : (
              <Volume2Icon className="size-4" />
            )}
          </Button>
        </Hint>
      </div>
    </div>
  );
}

export function VideoStage() {
  const video = useRevisionsStore(s => s.video);
  const videoChangedOnDisk = useRevisionsStore(s => s.videoChangedOnDisk);
  const openVideo = useRevisionsStore(s => s.openVideo);
  const ref = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Scrolling over the picture steps frame by frame (⇧ for whole seconds).
  // Native listener: React's onWheel is passive and cannot stop the page scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !video) return;
    let pending = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return; // pinch / browser zoom
      e.preventDefault();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      const unit = e.shiftKey ? WHEEL_PX_PER_SECOND : WHEEL_PX_PER_FRAME;
      let steps: number;
      if (
        e.deltaMode !== WheelEvent.DOM_DELTA_PIXEL ||
        Math.abs(delta) >= WHEEL_NOTCH_PX
      ) {
        // A mouse-wheel notch: exactly one step.
        steps = Math.sign(delta);
        pending = 0;
      } else {
        // Trackpad: many small deltas, accumulated into steps.
        pending += delta;
        steps = Math.trunc(pending / unit);
        pending -= steps * unit;
      }
      if (!steps) return;
      const store = useRevisionsStore.getState();
      if (e.shiftKey) {
        store.pause();
        store.seek(store.currentTime + steps);
      } else {
        store.stepFrames(steps);
      }
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [video]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !video) return;
    const store = useRevisionsStore.getState;
    let frameRequest = 0;
    let lastMediaTime = -1;
    let lastPresented = -1;
    const intervals: number[] = [];

    const onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
      const s = store();
      s.setCurrentTime(el.currentTime);
      if (!el.paused) {
        // Loop the selection.
        if (s.loop && s.selection && el.currentTime >= s.selection.to)
          s.seek(s.selection.from);
        // Measure fps from consecutive presented frames when the map has none.
        if (!s.map?.fps && !s.detectedFps) {
          const frames = meta.presentedFrames - lastPresented;
          if (
            lastMediaTime >= 0 &&
            frames === 1 &&
            meta.mediaTime > lastMediaTime
          ) {
            intervals.push(meta.mediaTime - lastMediaTime);
            const fps = estimateFps(intervals);
            if (fps) s.setDetectedFps(fps);
          }
        }
      }
      lastMediaTime = meta.mediaTime;
      lastPresented = meta.presentedFrames;
      frameRequest = el.requestVideoFrameCallback(onFrame);
    };
    frameRequest = el.requestVideoFrameCallback(onFrame);

    const sync = () => store().setCurrentTime(el.currentTime);
    const onPlay = () => store().setPlaying(true);
    const onPause = () => {
      store().setPlaying(false);
      sync();
    };
    const onMeta = () =>
      store().setVideoMeta({
        duration: el.duration,
        width: el.videoWidth,
        height: el.videoHeight,
      });
    el.addEventListener('seeking', sync);
    el.addEventListener('seeked', sync);
    el.addEventListener('timeupdate', sync);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onPause);
    el.addEventListener('loadedmetadata', onMeta);
    return () => {
      el.cancelVideoFrameCallback(frameRequest);
      el.removeEventListener('seeking', sync);
      el.removeEventListener('seeked', sync);
      el.removeEventListener('timeupdate', sync);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onPause);
      el.removeEventListener('loadedmetadata', onMeta);
    };
  }, [video?.url]);

  return (
    <div className="flex h-full min-w-0 flex-col bg-neutral-950">
      {video && videoChangedOnDisk && (
        <div className="flex items-center gap-2 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200">
          <TriangleAlertIcon className="size-3.5" />
          {video.name} changed on disk (re-rendered?). Comments made now still
          point at the old cut.
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto h-6 text-xs"
            onClick={() => void openVideo(video.name)}
          >
            <RefreshCwIcon className="size-3" /> Load new render
          </Button>
        </div>
      )}
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        {video ? (
          <>
            <video
              // A callback ref registers before any effect (Transport's included) runs.
              ref={el => {
                ref.current = el;
                registerVideoElement(el);
              }}
              key={video.url}
              src={video.url}
              playsInline
              preload="auto"
              className="h-full w-full object-contain"
              onClick={() => useRevisionsStore.getState().togglePlay()}
            />
            <ShotOverlay />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
      {video && <Transport />}
    </div>
  );
}
