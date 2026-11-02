'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import type { LiveProject } from '@/lib/revisions/live';
import { LiveMedia } from './live-media';
import { registerVideoElement, useRevisionsStore } from './store';

/*
 * The project playing live in the stage, where a render's <video> would be: a Remotion Player
 * fitted to the stage, driven by the revisions store through LiveMedia exactly like a video.
 */
export function LivePlayer({ live }: { live: LiveProject }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<LiveMedia | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const rate = useRevisionsStore(s => s.rate);
  const muted = useRevisionsStore(s => s.muted);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // One adapter per project; a recompile (code changed) updates it in place.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const m = new LiveMedia(live, el);
    registerVideoElement(m);
    setMedia(m);
    const store = useRevisionsStore.getState;
    const sync = () => {
      const s = store();
      s.setCurrentTime(m.currentTime);
      // loop the selection
      if (!m.paused && s.loop && s.selection && m.currentTime >= s.selection.to)
        s.seek(s.selection.from);
    };
    const onPlay = () => store().setPlaying(true);
    const onPause = () => {
      store().setPlaying(false);
      store().setCurrentTime(m.currentTime);
    };
    m.addEventListener('timeupdate', sync);
    m.addEventListener('seeked', sync);
    m.addEventListener('play', onPlay);
    m.addEventListener('pause', onPause);
    m.addEventListener('ended', onPause);
    store().setVideoMeta({
      duration: m.duration,
      width: m.videoWidth,
      height: m.videoHeight,
    });
    return () => {
      m.removeEventListener('timeupdate', sync);
      m.removeEventListener('seeked', sync);
      m.removeEventListener('play', onPlay);
      m.removeEventListener('pause', onPause);
      m.removeEventListener('ended', onPause);
      m.attach(null);
      registerVideoElement(null);
    };
    // the adapter belongs to the project; live changes for a recompile are handled below
  }, [live.slug]);

  useEffect(() => {
    media?.update(live);
  }, [media, live]);

  useEffect(() => {
    media?.attach(player);
  }, [media, player]);

  useEffect(() => {
    if (!player) return;
    if (muted) player.mute();
    else player.unmute();
  }, [player, muted]);

  const fit = useMemo(() => {
    if (!box.w || !box.h) return null;
    const s = Math.min(box.w / live.width, box.h / live.height);
    return { w: live.width * s, h: live.height * s };
  }, [box, live.width, live.height]);

  const inputProps = useMemo(
    () => ({ manifest: live.manifest, edits: live.edits }),
    [live.manifest, live.edits],
  );

  return (
    <div
      ref={boxRef}
      data-live-box
      className="flex h-full w-full items-center justify-center"
      onClick={() => useRevisionsStore.getState().togglePlay()}
    >
      {fit && (
        <div style={{ width: fit.w, height: fit.h }}>
          <Player
            // new code mounts a new Player; the store puts the playhead back
            key={`${live.codeTime}:${live.editsMtime}`}
            ref={setPlayer}
            component={live.Video}
            inputProps={inputProps}
            durationInFrames={live.durationInFrames}
            fps={live.fps}
            compositionWidth={live.width}
            compositionHeight={live.height}
            playbackRate={rate}
            style={{ width: '100%', height: '100%' }}
            acknowledgeRemotionLicense
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            errorFallback={({ error }) => (
              <div className="flex h-full items-center justify-center bg-black p-6 text-center text-sm text-red-300">
                {error.message}
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}
