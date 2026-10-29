/**
 * A "rotate your phone" short (make-video-music-remix-shorts, mode 'rotate'): a vertical hook, then the
 * finished 16:9 edit as it is, turned 90° so it fills the 9:16 frame. The viewer turns the phone to watch
 * it full screen; nothing is cropped or enlarged. Everything runs in song time.
 *
 * The countdown hook (hook.count, the user's design, 2026-10-28): the edit plays from the short's first
 * frame in a 16:9 band across the middle, with its own sound, the stretch's build. Above the band, three
 * start lights come on one per count while a big 3 · 2 · 1 lands with a clunk; below it, ROTATE YOUR PHONE
 * and a phone turning. Lights out on hook.turn: the band turns 90° slowly (users can't turn a phone fast),
 * growing to fill the frame, and the turn completes on hook.hit, the stretch's hit, where the edit goes
 * hyper with a flash and a jolt.
 *
 * The centre countdown (hook.style 'center', the user's design after that, s10–): a black frame and the
 * edit's sound alone. ROTATE YOUR PHONE / IN 5 SECS in the middle; the words drift away and only the 5
 * stays, growing into the counter; 4; at 3 the start lights appear and come on one per count; at 2 the
 * counter and lights float up; at 1 the video fades in, in the band; at 0 the lights go out and the band
 * turns slowly, landing on the hit. (hook.count holds the five counts.)
 *
 * The first version (hook.lights, s04–s06): the film's start lights in the band over the hook's own
 * sounds, then the edit from `start`, turned in 0.6 s. Kept so those shorts still render as they were.
 */
import React from 'react';
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import type { SceneProps } from '../kit/contract';
import { measure, useFontsReady } from './measure';
import type { RemixTheme } from './Remix';
import { StartLights } from './gfx/StartLights';

/** shorts/<id>/short.json `hook` (written by `npm run shorts -- <slug> make … --mode=rotate`) */
export type RotateHook = {
  /** song seconds the short starts at (the hook's first frame) */
  from: number;
  /** the countdown: song seconds each number lands on (3 · 2 · 1, or 5 … 1 for 'center'); the band turns
   *  from `turn` to `hit` (song seconds) */
  count?: number[];
  /** 'band' (default): the edit in the band throughout, the count above it; 'center': the count alone in
   *  the middle over the edit's sound, the video fading in at 1 */
  style?: 'band' | 'center';
  /** 'center': the counter, lights and phone stay in the middle until 0 and the video only appears at the
   *  turn — viewers turned the phone the moment the counter floated up at 2. With `from` before count[0],
   *  the call is up from `from` and its number lands as the counter on count[0] */
  stay?: boolean;
  turn?: number;
  hit?: number;
  /** first version: beat indices the film's start lights come on in the band, all out on `out` */
  lights?: number[];
  out?: number;
  /** the hook's sounds: files in derived/sfx/, at song seconds */
  sfx: { file: string; at: number; gain: number }[];
};

export type RotateShortProps = {
  slug: string;
  /** the finished 16:9 edit under the project folder, in song time (derived/final-16x9.mp4) */
  video: string;
  /** its frame size */
  size: [number, number];
  /** song seconds: the edit's first frame in the short (first version: lights out); the short ends at `end` */
  start: number;
  end: number;
  hook: RotateHook;
  theme: RemixTheme;
  /** white-on-transparent logo above the band (the edit's title logo) */
  logo?: string;
  text?: string;
};

const inOut = Easing.inOut(Easing.cubic);
const sineInOut = Easing.inOut(Easing.sin);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** a phone turning from upright onto its side, with an arrow round it (the viewer's move: clockwise),
 *  holding there, then fading and coming back upright for the next turn — it never turns back, which reads as
 *  "turn to upright" (the user: "start from vertical and end at horizontal"); one turn per `period` seconds
 *  (a count, in the centre countdown), upright before t 0 */
const PhoneTurn: React.FC<{ t: number; color: string; accent: string; size: number; period?: number }> = ({ t, color, accent, size, period = 1.6 }) => {
  const p = t < 0 ? 0 : (t % period) / period;
  const turn = p < 0.88 ? inOut(clamp01(p / 0.5)) : 0;
  const on = p < 0.78 ? 1 : p < 0.88 ? 1 - (p - 0.78) / 0.1 : (p - 0.88) / 0.12;
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ overflow: 'visible' }}>
      <path d="M 4.5 -51.8 A 52 52 0 0 1 50.2 -13.5" fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" />
      <path d="M 41.8 -20.6 L 50.2 -13.5 L 54 -23.8" fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <g transform={`rotate(${90 * turn})`} opacity={on}>
        <rect x={-19} y={-34} width={38} height={68} rx={7} fill="none" stroke={color} strokeWidth={4} />
        <rect x={-6} y={-29} width={12} height={2.5} rx={1.2} fill={color} />
        <rect x={-13} y={-23} width={26} height={44} rx={2} fill={color} opacity={0.18} />
      </g>
    </svg>
  );
};

/** a start light: a dark housing, its lamp red and glowing once lit */
const Lamp: React.FC<{ on: boolean; size: number; red: string }> = ({ on, size, red }) => (
  <div style={{ width: size * 1.2, height: size * 1.2, borderRadius: size * 0.22, background: '#0c0c0c', boxShadow: 'inset 0 0 0 2px #1d1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div
      style={{
        width: size * 0.82, height: size * 0.82, borderRadius: '50%',
        background: on ? `radial-gradient(circle at 40% 35%, #fff2ec 0%, ${red} 38%, #7a0d06 100%)` : 'radial-gradient(circle at 40% 35%, #2a0d0a 0%, #140605 100%)',
        boxShadow: on ? `0 0 ${size * 0.45}px ${red}, 0 0 ${size}px color-mix(in srgb, ${red} 55%, transparent)` : undefined,
      }}
    />
  </div>
);

/**
 * hook.style 'center': the countdown alone in the middle of the frame. The opening words are readable for
 * half of the 5; then all but the 5 drift away while the 5 grows into the counter. Each next number rolls
 * in; the lights appear at 3 (one more lit per count); at 2 the counter and lights float up and shrink to
 * make room for the band; all goes out at the turn. A phone turns from upright onto its side under the words,
 * then under the counter, once per count, until 2, where it rises with the counter and fades (the user's ask:
 * "show a phone rotating animation that suggests, until point 2 when it moves to top").
 * `stay`: nothing floats — the counter, lights and phone hold the middle until 0 and go with the turn; with
 * `words` (the call opening before count[0]) its number becomes the counter by count[0], first light on.
 */
const CenterCount: React.FC<{ song: number; count: number[]; turn: number; theme: RemixTheme; width: number; height: number; text: string; words?: number; stay?: boolean }> = ({ song, count, turn, theme, width, height, text, words, stay }) => {
  const { fonts, colors } = theme;
  const N = count.length;
  const [t5, t4] = count;
  const tAt = (n: number) => count[N - n]; // when number n lands
  const morph = words !== undefined ? Math.min(0.8, (t5 - words) * 0.4) : 0;
  const m = words !== undefined ? inOut(clamp01((song - (t5 - morph)) / morph)) : inOut(clamp01((song - (t5 + (t4 - t5) * 0.5)) / ((t4 - t5) * 0.42)));
  // the words as large as fit across 84 % of the frame (wide-spaced line font)
  const small = Math.min(width * 0.056, (width * 0.84) / Math.max(1, measure(text, fonts.line, 1, 0.2)));
  const big = height * 0.2;
  // where the 5 sits in "IN 5 SECS", line 2
  const w5 = measure(String(N), fonts.punch, small * 1.3, 0);
  const wIn = measure('IN', fonts.line, small, 0.2);
  const wSecs = measure('SECS', fonts.line, small, 0.2);
  const gap = small * 0.9;
  const left = (width - (wIn + gap + w5 + gap + wSecs)) / 2;
  const x5 = left + wIn + gap + w5 / 2;
  const y1 = height * 0.5 - small * 0.9;
  const y2 = height * 0.5 + small * 0.9;
  // the counter and lights float up at 2 (shrinking), clear of the band that fades in at 1
  const fl = N >= 2 && !stay ? inOut(clamp01((song - tAt(2)) / 0.7)) : 0;
  const gy = height * (0.5 - 0.265 * fl);
  const gs = 1 - 0.4 * fl;
  const gone = clamp01((song - turn) / 0.3);
  const n = count.filter(t => song >= t - 1e-3).length ? N + 1 - count.filter(t => song >= t - 1e-3).length : N;
  const enter = n < N ? inOut(clamp01((song - tAt(n)) / 0.28)) : 1;
  const numberStyle = (size: number): React.CSSProperties => ({
    position: 'absolute', left: width / 2, top: gy, fontFamily: fonts.punch, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap',
    color: colors.bone, textShadow: `0 0 ${(size * 0.12).toFixed(0)}px color-mix(in srgb, ${colors.red} 65%, transparent)`,
  });
  const lampSize = width * 0.09;
  const lit = song >= turn ? 0 : [3, 2, 1].filter(k => k <= N && song >= tAt(k) - 1e-3).length;
  const lampsOn = N >= 3 ? clamp01((song - tAt(3)) / 0.2) : 0;
  const word: React.CSSProperties = { position: 'absolute', fontFamily: fonts.line, fontSize: small, letterSpacing: '0.2em', color: colors.bone, whiteSpace: 'nowrap', transform: 'translate(-50%, -50%)' };
  // the phone: under line 2 while the words are up, under the counter after; rising and fading from 2
  const phone = width * 0.27;
  const phoneY = (y2 + small * 0.8 + phone * 0.6) * (1 - m) + (gy + (big * 0.55 + phone * 0.55) * gs) * m;
  const phoneOn = 1 - fl;
  // one turn per count, starting on each count from 4 on (from the first counter, after the call)
  const period = N >= 3 ? count[2] - count[1] : 1.2;
  const phoneFrom = words !== undefined ? count[0] : count[1] ?? count[0];
  return (
    <AbsoluteFill style={{ opacity: 1 - gone }}>
      {m < 1 && (
        <>
          <div style={{ ...word, left: width / 2, top: y1 - 60 * m, opacity: 1 - m, filter: m > 0.02 ? `blur(${(6 * m).toFixed(1)}px)` : undefined, marginLeft: '0.1em' }}>{text}</div>
          <div style={{ ...word, left: left + wIn / 2 - 90 * m, top: y2, opacity: 1 - m, filter: m > 0.02 ? `blur(${(6 * m).toFixed(1)}px)` : undefined }}>IN</div>
          <div style={{ ...word, left: left + wIn + gap + w5 + gap + wSecs / 2 + 90 * m, top: y2, opacity: 1 - m, filter: m > 0.02 ? `blur(${(6 * m).toFixed(1)}px)` : undefined }}>SECS</div>
        </>
      )}
      {n === N ? (
        // the 5 of the words, growing into the counter
        <div
          style={{
            ...numberStyle(small * 1.3 + (big - small * 1.3) * m),
            left: x5 + (width / 2 - x5) * m, top: y2 + (gy - y2) * m, transform: 'translate(-50%, -50%)',
            color: `color-mix(in srgb, ${colors.red} ${Math.round(100 * (1 - m))}%, ${colors.bone})`,
          }}
        >
          {N}
        </div>
      ) : (
        <>
          {enter < 1 && (
            <div style={{ ...numberStyle(big * gs), transform: `translate(-50%, -50%) translateY(${(-height * 0.06 * enter).toFixed(1)}px) scale(${1 - 0.3 * enter})`, opacity: 1 - enter }}>{n + 1}</div>
          )}
          <div style={{ ...numberStyle(big * gs), transform: `translate(-50%, -50%) scale(${(1.35 - 0.35 * enter) * (1 + 0.15 * gone)})`, opacity: enter }}>{n}</div>
        </>
      )}
      {phoneOn > 0.01 && (
        <div style={{ position: 'absolute', left: width / 2, top: phoneY - height * 0.04 * fl, transform: `translate(-50%, -50%) scale(${gs})`, opacity: phoneOn }}>
          <PhoneTurn t={song - phoneFrom} period={period} color={colors.bone} accent={colors.red} size={phone} />
        </div>
      )}
      {lampsOn > 0 && (
        <div style={{ position: 'absolute', left: width / 2, top: gy - big * gs * 0.62 - lampSize * gs * 0.75, transform: `translate(-50%, -50%) scale(${gs})`, display: 'flex', gap: lampSize * 0.35, opacity: lampsOn }}>
          {[0, 1, 2].map(k => <Lamp key={k} on={k < lit} size={lampSize} red={colors.red} />)}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const RotateShort: React.FC<SceneProps<RotateShortProps>> = ({ manifest, slug, video, size: [vw, vh], start, end, hook, theme, logo, text = 'ROTATE YOUR PHONE' }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ready = useFontsReady(theme.ready);
  const song = frame / fps;
  if (!ready) return null;
  const { colors, fonts } = theme;
  const countdown = !!hook.count && hook.turn !== undefined && hook.hit !== undefined;
  const center = countdown && hook.style === 'center';
  // when the band turns, and how: slowly over the build into the hit (countdown), or quickly at lights out
  const turnFrom = countdown ? hook.turn! : start;
  const turnTo = countdown ? hook.hit! : start + 0.6;
  const f0 = Math.round(start * fps);
  // the band: the frame's width, the video's shape; turned, the video's width runs down the frame's height
  const s0 = width / vw;
  const s1 = Math.min(height / vw, width / vh);
  const r = (countdown ? sineInOut : inOut)(clamp01((song - turnFrom) / (turnTo - turnFrom)));
  // counter-clockwise, against the viewer's clockwise turn of the phone (PhoneTurn): in the hand the picture
  // stays level as the phone turns, and lands upright
  const angle = -90 * r;
  const scale = s0 + (s1 - s0) * r;
  const blur = song > turnFrom && r < 1 ? (countdown ? 2.5 : 7) * Math.sin(Math.PI * r) : 0;
  const bandH = vh * s0;
  const bandTop = (height - bandH) / 2;
  // the hit: the turn lands and the edit goes hyper, a white flash and a jolt
  const since = countdown ? song - hook.hit! : -1;
  const flash = since >= 0 ? 0.6 * Math.max(0, 1 - since / 0.16) : 0;
  const jolt = since >= 0 ? Math.exp(-since * 9) : 0;
  const jx = Math.sin(song * 83) * 16 * jolt;
  const jy = Math.cos(song * 67) * 12 * jolt;
  // the hook's words leave as the band starts to turn
  const hookOn = center ? 1 - clamp01((song - turnFrom) / 0.4) : 1 - clamp01((song - turnFrom) / (countdown ? 0.35 : 0.18));
  // 'center': the video stays hidden (its sound plays) until 1, then fades in; `stay`: until 0, with the turn
  const bandOn = !center ? 1 : hook.stay ? clamp01((song - turnFrom) / 0.4) : clamp01((song - hook.count![hook.count!.length - 1]) / 0.5);
  const intro = clamp01((song - hook.from) / 0.1);
  // the countdown: which of 3 · 2 · 1 is up, and how far into its pop
  const counted = countdown ? hook.count!.filter(t => song >= t - 1e-3).length : 0;
  const lastCount = counted ? hook.count![counted - 1] : 0;
  const pop = counted ? clamp01((song - lastCount) / 0.16) : 0;
  const lampSize = width * 0.085;
  return (
    <AbsoluteFill style={{ background: colors.ground, transform: jolt > 0.01 ? `translate(${jx}px, ${jy}px)` : undefined }}>
      {hookOn > 0 && (
        <AbsoluteFill style={{ opacity: hookOn * intro }}>
          {center ? (
            <CenterCount
              song={song} count={hook.count!} turn={turnFrom} theme={theme} width={width} height={height} text={text}
              words={hook.from < hook.count![0] - 1e-3 ? hook.from : undefined} stay={hook.stay}
            />
          ) : countdown ? (
            <>
              {/* above the band: the logo, three start lights filling up, the number; below it: the call and the phone */}
              {logo && (
                <Img src={staticFile(`${slug}/${logo}`)} style={{ position: 'absolute', left: (width - width * 0.2) / 2, top: height * 0.085, width: width * 0.2, objectFit: 'contain' }} />
              )}
              <div style={{ position: 'absolute', left: 0, right: 0, top: height * 0.15, display: 'flex', justifyContent: 'center', gap: lampSize * 0.35 }}>
                {[0, 1, 2].map(k => <Lamp key={k} on={k < counted && song < turnFrom} size={lampSize} red={colors.red} />)}
              </div>
              {counted > 0 && song < turnFrom && (
                <div
                  style={{
                    position: 'absolute', left: 0, right: 0, top: bandTop - height * 0.015, transform: `translateY(-100%) scale(${1.3 - 0.3 * pop})`, transformOrigin: '50% 100%',
                    textAlign: 'center', fontFamily: fonts.punch, fontSize: height * 0.1, lineHeight: 1, color: colors.bone, opacity: 0.4 + 0.6 * pop,
                    textShadow: `0 0 ${(30 + 50 * (1 - pop)).toFixed(0)}px color-mix(in srgb, ${colors.red} 70%, transparent)`,
                  }}
                >
                  {4 - counted}
                </div>
              )}
              <div style={{ position: 'absolute', left: 0, right: 0, top: bandTop + bandH + height * 0.03, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: width * 0.02 }}>
                <PhoneTurn t={song - hook.from} color={colors.bone} accent={colors.red} size={width * 0.1} />
                <div style={{ fontFamily: fonts.line, fontSize: width * 0.036, letterSpacing: '0.26em', color: colors.bone, whiteSpace: 'nowrap' }}>{text}</div>
              </div>
            </>
          ) : (
            <>
              {/* first version, top to bottom: the logo, the phone turning, the band, the words */}
              {logo && (
                <Img src={staticFile(`${slug}/${logo}`)} style={{ position: 'absolute', left: (width - width * 0.28) / 2, top: bandTop - height * 0.235, width: width * 0.28, objectFit: 'contain' }} />
              )}
              <div style={{ position: 'absolute', left: 0, right: 0, top: bandTop - height * 0.135, display: 'flex', justifyContent: 'center' }}>
                <PhoneTurn t={song - hook.from} color={colors.bone} accent={colors.red} size={width * 0.17} />
              </div>
              <div style={{ position: 'absolute', left: 0, right: 0, top: bandTop + bandH + height * 0.035, textAlign: 'center', fontFamily: fonts.line, fontSize: width * 0.042, letterSpacing: '0.3em', marginRight: '-0.3em', color: colors.bone }}>
                {text}
              </div>
            </>
          )}
        </AbsoluteFill>
      )}
      {/* the band: the edit (first version: the start lights until lights out), turning */}
      <div
        style={{
          position: 'absolute', left: (width - vw) / 2, top: (height - vh) / 2, width: vw, height: vh, overflow: 'hidden', opacity: bandOn,
          transform: `rotate(${angle}deg) scale(${scale})`, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
          boxShadow: r < 1 ? `0 0 ${(60 * (1 - r)).toFixed(0)}px rgba(0,0,0,0.8)` : undefined,
        }}
      >
        {!countdown && song < start && hook.lights && hook.out !== undefined ? (
          <StartLights manifest={manifest} theme={theme} w={vw} h={vh} cfg={{ on: hook.lights, out: hook.out }} song={song} />
        ) : null}
        <Sequence from={f0} layout="none">
          <OffthreadVideo
            src={staticFile(`${slug}/${video}`)}
            startFrom={f0}
            // the edit's own mix, faded out over the short's last 0.4 s; 'center': faded in slowly from silence
            // to full at 0, the turn (squared, so it swells rather than jumps)
            volume={f => Math.max(0, Math.min(1, (end - start - f / fps) / 0.4, center ? clamp01((start + f / fps - hook.from) / (turnFrom - hook.from)) ** 2 : 1))}
            style={{ position: 'absolute', inset: 0, width: vw, height: vh }}
          />
        </Sequence>
      </div>
      {flash > 0.01 && <AbsoluteFill style={{ background: colors.bone, opacity: flash }} />}
      {hook.sfx.map((s, k) => (
        <Sequence key={k} from={Math.round(s.at * fps)} name={`hook ${s.file}`} layout="none">
          <Audio src={staticFile(`${slug}/derived/sfx/${s.file}.wav`)} volume={s.gain} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
