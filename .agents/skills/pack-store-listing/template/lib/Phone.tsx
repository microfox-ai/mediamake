import React from 'react';
import { AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import { FPS, type Placed, TAKES_DIR, TRANSITION } from './plan';

/*
 * The phone: an iPhone-sized screen (443 x 960 points, the takes at 2x) playing the cut, the iOS status
 * bar and home indicator drawn over it, in a dark frame with the Dynamic Island, as on the store
 * screenshots. Screen changes animate like iOS: a push slides in from the right over the last frame,
 * a sheet rises from the bottom and drops away again, a new scene crossfades.
 */

export const SCREEN = { w: 443, h: 960, radius: 56, bezel: 10 };
export const DEVICE = { w: SCREEN.w + SCREEN.bezel * 2, h: SCREEN.h + SCREEN.bezel * 2 };
const INK = '#0a0a0b';

const src = (take: string) => staticFile(`${TAKES_DIR}/${take}.mp4`);

/** One clip's video at a frame of its own (frozen there, so every frame is exact). */
const ClipFrame: React.FC<{ clip: Placed; at: number }> = ({ clip, at }) => (
  <Freeze frame={Math.max(0, Math.min(clip.frames - 1, at))}>
    <OffthreadVideo
      src={src(clip.take)}
      trimBefore={Math.round(clip.from * FPS)}
      playbackRate={clip.speed ?? 1}
      muted
      style={{ width: SCREEN.w, height: SCREEN.h, display: 'block' }}
    />
  </Freeze>
);

const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** What the screen shows at a frame: the current clip, and during its entrance the one before. */
const ScreenContent: React.FC<{ placed: Placed[] }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const last = placed[placed.length - 1];
  const i = Math.max(0, placed.findIndex((c) => frame >= c.start && frame < c.start + c.frames));
  const cur = frame >= last.start + last.frames ? last : placed[i];
  const local = frame - cur.start;
  const prev = placed[cur.index - 1];
  const enter = cur.enter ?? 'cut';
  const span = Math.round(TRANSITION[enter] * FPS);
  const p = prev && span && local < span ? ease(local / span) : 1;
  const full: React.CSSProperties = { position: 'absolute', inset: 0 };

  if (p >= 1 || !prev) return <div style={full}><ClipFrame clip={cur} at={local} /></div>;

  const before = <ClipFrame clip={prev} at={prev.frames - 1} />;
  const now = <ClipFrame clip={cur} at={local} />;
  const dim = (o: number) => <div style={{ ...full, background: `rgba(0,0,0,${o})` }} />;

  if (enter === 'push')
    return (
      <>
        <div style={{ ...full, transform: `translateX(${-30 * p}%)` }}>{before}{dim(0.35 * p)}</div>
        <div style={{ ...full, transform: `translateX(${100 * (1 - p)}%)`, boxShadow: '-12px 0 30px rgba(0,0,0,0.45)' }}>{now}</div>
      </>
    );
  if (enter === 'sheetUp')
    return (
      <>
        <div style={full}>{before}{dim(0.45 * p)}</div>
        <div style={{ ...full, transform: `translateY(${100 * (1 - p)}%)`, borderRadius: 18, overflow: 'hidden' }}>{now}</div>
      </>
    );
  if (enter === 'sheetDown')
    return (
      <>
        <div style={full}>{now}{dim(0.45 * (1 - p))}</div>
        <div style={{ ...full, transform: `translateY(${100 * p}%)`, borderRadius: 18, overflow: 'hidden' }}>{before}</div>
      </>
    );
  // fade
  return (
    <>
      <div style={full}>{now}</div>
      <div style={{ ...full, opacity: 1 - p }}>{before}</div>
    </>
  );
};

const StatusBar: React.FC = () => (
  <div
    style={{
      position: 'absolute', left: 0, right: 0, top: 0, height: 56, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '4px 36px 0 52px', boxSizing: 'border-box', color: '#fff',
      font: "600 17px -apple-system, 'SF Pro Text', system-ui, sans-serif", letterSpacing: -0.2,
    }}>
    <span>9:41</span>
    <span style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      <svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3.2" height="4" rx="1" fill="#fff" /><rect x="5" y="5.5" width="3.2" height="6.5" rx="1" fill="#fff" /><rect x="10" y="3" width="3.2" height="9" rx="1" fill="#fff" /><rect x="15" y="0" width="3.2" height="12" rx="1" fill="#fff" /></svg>
      <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.3c2.4 0 4.6.9 6.2 2.5l1.2-1.2C14 1.7 11.4.6 8.5.6S3 1.7 1.1 3.6l1.2 1.2C3.9 3.2 6.1 2.3 8.5 2.3zm0 3.4c1.5 0 2.8.6 3.8 1.5l1.2-1.2C12.2 4.8 10.4 4 8.5 4S4.8 4.8 3.5 6l1.2 1.2c1-.9 2.3-1.5 3.8-1.5zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.2 7 9.7c.4-.4.9-.6 1.5-.6z" fill="#fff" /></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="#fff" strokeOpacity=".4" fill="none" /><rect x="2" y="2" width="20" height="9" rx="2.5" fill="#fff" /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="#fff" fillOpacity=".4" /></svg>
    </span>
  </div>
);

/** The screen alone (443 x 960), for layouts that frame it themselves. */
export const Screen: React.FC<{ placed: Placed[]; island?: boolean }> = ({ placed, island = true }) => (
  <div style={{ position: 'relative', width: SCREEN.w, height: SCREEN.h, borderRadius: SCREEN.radius, overflow: 'hidden', background: INK }}>
    <ScreenContent placed={placed} />
    <StatusBar />
    {island ? <div style={{ position: 'absolute', top: 11, left: '50%', width: 126, height: 37, marginLeft: -63, borderRadius: 19, background: '#000' }} /> : null}
    <div style={{ position: 'absolute', left: '50%', bottom: 8, width: 140, height: 5, marginLeft: -70, borderRadius: 3, background: '#fff' }} />
  </div>
);

/** The phone at a scale, its top-left at (x, y). */
export const Phone: React.FC<{ placed: Placed[]; x: number; y: number; scale: number; shadow?: string }> = ({ placed, x, y, scale, shadow }) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, width: DEVICE.w, height: DEVICE.h, transform: `scale(${scale})`, transformOrigin: 'top left',
      borderRadius: SCREEN.radius + SCREEN.bezel, background: '#1c1c1f', padding: SCREEN.bezel, boxSizing: 'border-box',
      boxShadow: `inset 0 0 0 1.5px #3a3a3e, ${shadow ?? '0 30px 80px rgba(20,18,12,0.28), 0 8px 24px rgba(20,18,12,0.18)'}`,
    }}>
    <Screen placed={placed} />
  </div>
);

export const frameOf = (seconds: number) => Math.round(seconds * FPS);
export const fadeIn = (frame: number, at: number, len: number) =>
  interpolate(frame, [at, at + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
export { AbsoluteFill };
