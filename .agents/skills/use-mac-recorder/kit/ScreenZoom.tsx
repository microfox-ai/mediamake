/**
 * ScreenZoom: a mac-recorder recording played through its edit plan (plan-edit.mjs): the trimmed and sped-up
 * segments in order, a smooth zoom and pan on the clicks, the recording framed on a background with round
 * corners, and, when the video has no cursor of its own, a drawn cursor with a ripple on each click.
 * Step captions come from the markers when the plan has `captions: true`.
 *
 * Copy this file into a project's video/ folder. It needs only remotion:
 *
 *   import plan from '../input/edit.json';
 *   <ScreenZoom src={staticFile(`${SLUG}/input/recording.mov`)} plan={plan as EditPlan} />
 *
 * The composition's length is the plan's `duration` (seconds) at the composition's fps.
 */
import React from 'react';
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';

export type ZoomKey = { t: number; scale: number; x: number; y: number };
export type EditPlan = {
  schema: string;
  source: { width: number; height: number; duration: number };
  fps: number;
  duration: number;
  segments: { from: number; to: number; speed: number; why?: string }[];
  zoom: ZoomKey[];
  clicks: { t: number; x: number; y: number }[];
  cursor: number[][];
  drawCursor: boolean;
  captions?: boolean;
  markers: { t: number; name: string; note?: string; out: number | null }[];
};

export type ScreenZoomProps = {
  src: string;
  plan: EditPlan;
  /** CSS background around the recording. */
  background?: string;
  /** Space around the recording at 1×, as a fraction of the frame. */
  padding?: number;
  /** Corner radius of the recording, in output pixels at 1×. */
  radius?: number;
  /** Cursor height in the recording's pixels (a Retina recording's own cursor is about 50). */
  cursorSize?: number;
  /** Rings on clicks (default: when the cursor is drawn). */
  ripples?: boolean;
  rippleColor?: string;
  /** Captions from the markers (default: the plan's `captions`). */
  captions?: boolean;
  captionFont?: string;
  /** Sound of the recording at normal speed (sped-up stretches are always muted). */
  volume?: number;
};

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** The recording's moment shown at the edit's time t (seconds). */
export const toSource = (segs: EditPlan['segments'], t: number) => {
  let at = 0;
  for (const s of segs) {
    const len = (s.to - s.from) / s.speed;
    if (t <= at + len) return s.from + (t - at) * s.speed;
    at += len;
  }
  return segs.length ? segs[segs.length - 1].to : 0;
};

/** The view at a moment of the recording: scale and centre, eased between keys (scale in log space). */
export const viewAt = (keys: ZoomKey[], s: number): ZoomKey => {
  if (!keys.length) return { t: s, scale: 1, x: 0, y: 0 };
  if (s <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (s <= b.t) {
      const p = b.t > a.t ? easeInOut((s - a.t) / (b.t - a.t)) : 1;
      return {
        t: s,
        scale: Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * p),
        x: a.x + (b.x - a.x) * p,
        y: a.y + (b.y - a.y) * p,
      };
    }
  }
  return keys[keys.length - 1];
};

const Arrow: React.FC<{ size: number; pressed: boolean }> = ({ size, pressed }) => (
  <svg width={size * 0.72} height={size} viewBox="0 0 18 25" style={{ transform: `scale(${pressed ? 0.86 : 1})`, transformOrigin: '2px 2px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
    <path d="M2 2 L2 20 L6.6 15.8 L9.6 22.6 L12.7 21.2 L9.8 14.6 L15.8 14.6 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const ScreenZoom: React.FC<ScreenZoomProps> = ({
  src,
  plan,
  background = 'radial-gradient(120% 120% at 20% 10%, #2b3150 0%, #141726 55%, #0b0c12 100%)',
  padding = 0.05,
  radius = 18,
  cursorSize = 52,
  ripples,
  rippleColor = 'rgba(255,255,255,0.95)',
  captions,
  captionFont = 'Inter, -apple-system, "SF Pro Display", Helvetica, Arial, sans-serif',
  volume = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const s = toSource(plan.segments, t);
  const { width: SW, height: SH } = plan.source;

  // the recording fitted in the frame, inside the padding
  const k = Math.min((W * (1 - 2 * padding)) / SW, (H * (1 - 2 * padding)) / SH);
  const fw = SW * k;
  const fh = SH * k;
  const x0 = (W - fw) / 2;
  const y0 = (H - fh) / 2;

  // the view: centre on the focus, kept inside the recording once it fills the frame
  const v = viewAt(plan.zoom, s);
  const scale = Math.max(1, v.scale);
  const centre = (focus: number, start: number, size: number, half: number) =>
    size >= 2 * half ? Math.min(start + size - half, Math.max(start + half, focus)) : start + size / 2;
  const fx = centre(x0 + v.x * k, x0, fw, W / (2 * scale));
  const fy = centre(y0 + v.y * k, y0, fh, H / (2 * scale));
  const transform = `translate(${W / 2 - fx * scale}px, ${H / 2 - fy * scale}px) scale(${scale})`;

  // where each segment sits in the edit
  let at = 0;
  const parts = plan.segments.map((seg, i) => {
    const len = (seg.to - seg.from) / seg.speed;
    const from = Math.round(at * fps);
    at += len;
    const dur = Math.max(1, Math.round(at * fps) - from);
    return { seg, from, dur, key: i };
  });

  const showRipples = ripples ?? plan.drawCursor;
  const cursor = plan.drawCursor && plan.cursor.length ? plan.cursor[Math.min(plan.cursor.length - 1, Math.max(0, Math.round(s * plan.fps)))] : null;
  const pressed = plan.clicks.some(c => s >= c.t && s - c.t < 0.14);
  const withCaptions = captions ?? !!plan.captions;
  const steps = plan.markers.filter(m => m.out !== null);

  return (
    <AbsoluteFill style={{ background, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform, transformOrigin: '0 0' }}>
        <div
          style={{
            position: 'absolute', left: x0, top: y0, width: fw, height: fh, borderRadius: radius, overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)', background: '#000',
          }}
        >
          {parts.map(({ seg, from, dur, key }) => (
            <Sequence key={key} from={from} durationInFrames={dur} layout="none">
              <OffthreadVideo
                src={src}
                trimBefore={Math.round(seg.from * fps)}
                playbackRate={seg.speed}
                muted={seg.speed !== 1}
                volume={seg.speed === 1 ? volume : 0}
                style={{ width: fw, height: fh, display: 'block' }}
              />
            </Sequence>
          ))}
        </div>
        {showRipples &&
          plan.clicks
            .filter(c => s >= c.t && s - c.t < 0.55)
            .map((c, i) => {
              const p = (s - c.t) / 0.55;
              const r = (16 + 56 * easeInOut(Math.min(1, p * 1.3))) * k;
              return (
                <div
                  key={`r${i}`}
                  style={{
                    position: 'absolute', left: x0 + c.x * k - r, top: y0 + c.y * k - r, width: 2 * r, height: 2 * r, borderRadius: '50%',
                    border: `${Math.max(1.5, 4 * k)}px solid ${rippleColor}`, opacity: interpolate(p, [0, 0.15, 1], [0, 0.9, 0]),
                    boxShadow: '0 0 12px rgba(0,0,0,0.25)',
                  }}
                />
              );
            })}
        {cursor && (
          <div style={{ position: 'absolute', left: x0 + cursor[1] * k - 2 * ((cursorSize * k) / 25), top: y0 + cursor[2] * k - 2 * ((cursorSize * k) / 25) }}>
            <Arrow size={cursorSize * k} pressed={pressed} />
          </div>
        )}
      </AbsoluteFill>
      {withCaptions &&
        steps.map((m, i) => {
          const start = m.out as number;
          const end = Math.min(steps[i + 1]?.out ?? Infinity, start + 2.6);
          if (t < start - 0.05 || t > end) return null;
          const o = interpolate(t, [start, start + 0.25, end - 0.3, end], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const y = interpolate(t, [start, start + 0.3], [18, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div
              key={`c${i}`}
              style={{
                position: 'absolute', left: W * 0.04, bottom: H * 0.06, opacity: o, transform: `translateY(${y}px)`,
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 26px 14px 14px', borderRadius: 999,
                background: 'rgba(12,13,20,0.82)', color: '#fff', fontFamily: captionFont, fontSize: H * 0.032, fontWeight: 600,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: H * 0.05, height: H * 0.05, borderRadius: '50%', background: '#ff3b30', fontSize: H * 0.026 }}>
                {i + 1}
              </span>
              {m.name}
            </div>
          );
        })}
    </AbsoluteFill>
  );
};
