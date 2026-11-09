/**
 * The 'cue' rotate hook (make-video-music-remix-shorts, the default from 2026-11-02), after the opening of
 * the noahanima "dracula" reel: the film's own stand-in for the phone (a coffin there; gfx/cues) appears
 * upright in the vertical frame, does a beat of its character, and tips onto its side, clockwise (the
 * viewer's move). The plea appears beside it already turned — set in the landscape stage, the frame turned
 * 90° counter-clockwise, so a viewer who has turned the phone reads it upright — then the title card and
 * the stretch's 16:9 edit play in that stage from the hit on. Nothing turns in the frame after the cue: a
 * viewer can turn the phone at any moment and everything is already the right way up for them.
 *
 * Timeline (song seconds, short.json `hook`): `from` the cue pops in (or fades up over `fadeIn` seconds) →
 * `tip` it tips over → the plea pops in line by line → `pleaTo` the cue and plea go → `title.from` the
 * title card in the stage, slamming in on beat `title.hit` → `hit` (the stretch's hit) the edit, with a
 * flash and a jolt. The backdrop wears the film's texture (`texture`). The edit's sound starts at `songIn`
 * and swells in over `songFade` (kingpinxdeadpool 2026-11-02: "the song starting confuses the user … let
 * the song start only after the rotation, until then a slow minimal fade and some sound fx"): until then
 * only the hook's own sounds play.
 */
import React from 'react';
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import type { SceneProps } from '../kit/contract';
import { useFontsReady } from './measure';
import type { RemixTheme } from './Remix';
import type { RotateShortProps } from './RotateShort';
import { CUES } from './gfx/cues';
import { TitleCard } from './gfx/TitleCard';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const backOut = Easing.out(Easing.back(1.8));
const inOut = Easing.inOut(Easing.cubic);
/** the 'drops' texture (Quicksilver's kitchen): water hanging in slowed time, [x, y, size, drift] in 0–1 */
const DROPS = Array.from({ length: 46 }, (_, i) => [0, 1, 2, 3].map(k => Math.abs((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1)));

/** the plea, in the comic caption box (the theme's yellow, a black border, comic lettering) or plain */
const Plea: React.FC<{ lines: string[]; song: number; at: number; gap: number; theme: RemixTheme; plain?: boolean }> = ({ lines, song, at, gap, theme, plain }) => {
  const { colors, fonts } = theme;
  const ink = '#0b0b0b';
  const font = fonts.comic ?? fonts.punch;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      {lines.map((line, i) => {
        const p = clamp01((song - (at + i * gap)) / 0.22);
        const big = i === 0;
        const aside = /^\(.*\)$/.test(line);
        return (
          <div
            key={i}
            style={{
              transform: `scale(${0.4 + 0.6 * backOut(p)}) rotate(${(i % 2 ? 2.5 : -3) * (aside ? 1.4 : 1)}deg)`, opacity: p,
              padding: plain ? 0 : `${big ? 10 : 6}px ${big ? 34 : 24}px ${big ? 2 : 0}px`,
              background: plain || aside ? 'transparent' : big ? colors.acid : colors.bone,
              border: plain || aside ? undefined : `6px solid ${ink}`, boxShadow: plain || aside ? undefined : `10px 10px 0 ${ink}`,
              fontFamily: font, fontSize: big ? 150 : aside ? 54 : 78, lineHeight: 1, color: plain || aside ? colors.bone : ink,
              letterSpacing: '0.03em', whiteSpace: 'nowrap', textTransform: aside ? 'none' : 'uppercase',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

/**
 * the plea in Breaking Bad's lockup ('element'): the first line in the punch font with its symbols in
 * periodic-table boxes, written "[Na:11]" (the accent green, the atomic number top left, as in the show's
 * title), the call in the caption font's wide-tracked caps, the aside small; no tilt (a lab, not a comic)
 */
const ElementPlea: React.FC<{ lines: string[]; song: number; at: number; gap: number; theme: RemixTheme }> = ({ lines, song, at, gap, theme }) => {
  const { colors, fonts } = theme;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
      {lines.map((line, i) => {
        const p = clamp01((song - (at + i * gap)) / 0.22);
        const big = i === 0;
        const aside = /^\(.*\)$/.test(line);
        return (
          <div
            key={i}
            style={{
              transform: `scale(${0.85 + 0.15 * backOut(p)})`, opacity: aside ? 0.75 * p : p, color: colors.bone, whiteSpace: 'nowrap', lineHeight: 1,
              fontFamily: big ? fonts.punch : fonts.line, fontSize: big ? 136 : aside ? 38 : 50, letterSpacing: big ? '0.02em' : aside ? '0.08em' : '0.28em',
              textTransform: aside ? 'none' : 'uppercase', textShadow: '0 4px 24px rgba(0,0,0,0.6)',
            }}
          >
            {line.split(/(\[[A-Za-z]{1,2}:\d+\])/).filter(Boolean).map((part, k) => {
              const el = /^\[([A-Za-z]{1,2}):(\d+)\]$/.exec(part);
              if (!el) return <span key={k}>{part}</span>;
              return (
                <span
                  key={k}
                  style={{
                    position: 'relative', display: 'inline-block', padding: '0.06em 0.1em 0.02em', margin: '0 0.06em', background: colors.red, textTransform: 'none', textShadow: 'none',
                    boxShadow: `inset 0 0 0 0.022em color-mix(in srgb, ${colors.bone} 55%, transparent), 0 0.04em 0.3em rgba(0,0,0,0.45)`,
                  }}
                >
                  <span style={{ position: 'absolute', left: '0.1em', top: '0.08em', fontFamily: fonts.data, fontSize: '0.14em', letterSpacing: 0 }}>{el[2]}</span>
                  {el[1]}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** the 'smoke' texture (Breaking Bad's opening credits; the long edit's tension smoke): green chemical smoke
 *  rising round the edges of the frame, its middle clear for the stand-in */
const CueSmoke: React.FC<{ song: number; theme: RemixTheme; width: number; height: number; on: number }> = ({ song, theme, width, height, on }) => {
  const hex = theme.colors.red.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const rise = (song * 30) % height;
  return (
    <AbsoluteFill style={{ opacity: on, pointerEvents: 'none' }}>
      <svg width={width} height={height}>
        <defs>
          <filter id="cue-smoke" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0038" numOctaves={3} seed={7} />
            <feColorMatrix type="matrix" values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 1.3 0 0 0 -0.5`} />
          </filter>
          <radialGradient id="cue-smoke-grad" cx="50%" cy="38%" r="68%">
            <stop offset="48%" stopColor="#000" />
            <stop offset="100%" stopColor="#fff" />
          </radialGradient>
          <mask id="cue-smoke-mask">
            <rect width={width} height={height} fill="url(#cue-smoke-grad)" />
          </mask>
        </defs>
        <g mask="url(#cue-smoke-mask)" opacity={0.6} style={{ mixBlendMode: 'screen' }}>
          <rect x={0} y={0} width={width} height={height * 2} filter="url(#cue-smoke)" transform={`translate(0, ${-rise})`} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const RotateCue: React.FC<SceneProps<RotateShortProps>> = ({ manifest, slug, video, videoFrom = 0, size: [vw, vh], start, end, hook, theme, title }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ready = useFontsReady(theme.ready);
  const song = frame / fps;
  if (!ready) return null;
  const { colors } = theme;
  // one beat of the song where the cue plays
  const bl = manifest.beats.list;
  const bi = Math.max(0, Math.min(bl.length - 2, bl.findIndex(b => b.t >= hook.from)));
  const beat = bl[bi + 1].t - bl[bi].t;
  const tip = hook.tip ?? hook.from + beat * 2;
  const pleaTo = hook.pleaTo ?? start - beat * 6;
  const hit = hook.hit ?? start;
  // the stand-in: pops in, holds its beat, tips over clockwise with a little overshoot, goes with the plea
  const Cue = CUES[hook.cue ?? 'phone'] ?? CUES.phone;
  const fadeIn = hook.fadeIn ?? 0;
  const cueIn = fadeIn > 0 ? inOut(clamp01((song - hook.from) / fadeIn)) : clamp01((song - hook.from) / 0.35);
  const tipP = clamp01((song - tip) / 0.45);
  const angle = 90 * backOut(tipP);
  const cueOut = clamp01((song - pleaTo) / 0.3);
  const cueSize = height * 0.3;
  // the landscape stage: a 16:9 box turned counter-clockwise to fill the frame (against the viewer's turn)
  const s1 = Math.min(height / vw, width / vh);
  const stage: React.CSSProperties = { position: 'absolute', left: (width - vw) / 2, top: (height - vh) / 2, width: vw, height: vh, transform: `rotate(-90deg) scale(${s1})`, overflow: 'hidden' };
  // the hit: a white flash and a jolt as the edit comes in
  const since = song - hit;
  const flash = since >= 0 ? 0.6 * Math.max(0, 1 - since / 0.16) : 0;
  const jolt = since >= 0 ? Math.exp(-since * 9) : 0;
  const jx = Math.sin(song * 83) * 16 * jolt;
  const jy = Math.cos(song * 67) * 12 * jolt;
  // the video comes in on the cue's first frame (or later, where its file starts): a file that starts before the
  // short (the finished edit, from the song's 0) is trimmed with startFrom, since media placed before the window
  // rendered with no sound (kingpinxdeadpool s05, 2026-11-03)
  const fv = Math.round(videoFrom * fps);
  const f0 = Math.max(fv, Math.round(hook.from * fps));
  const titleOn = hook.title && title ? clamp01((song - hook.title.from) / 0.25) * (song < hit ? 1 : 0) : 0;
  const texture = hook.texture ?? 'halftone';
  // the edit's sound: silent until `songIn`, then a slow swell (squared, so it creeps in) over `songFade`
  const songIn = hook.songIn ?? hook.from;
  const songFade = hook.songFade ?? 0.3;
  const songUp = (t: number) => (hook.songIn === undefined ? clamp01((t - songIn) / songFade) : clamp01((t - songIn) / songFade) ** 2);
  return (
    <AbsoluteFill style={{ background: colors.ground, transform: jolt > 0.01 ? `translate(${jx}px, ${jy}px)` : undefined }}>
      {/* the film's texture under the cue and the title */}
      {song < hit && texture === 'halftone' && (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(color-mix(in srgb, ${colors.red} 28%, transparent) 28%, transparent 31%)`,
            backgroundSize: '22px 22px', backgroundPosition: `${(song * 9) % 22}px ${(song * 5) % 22}px`, opacity: 0.55 * (fadeIn > 0 ? cueIn : 1),
            maskImage: 'radial-gradient(ellipse at center, transparent 30%, black 95%)', WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 30%, black 95%)',
          }}
        />
      )}
      {song < hit && texture === 'smoke' && <CueSmoke song={song} theme={theme} width={width} height={height} on={fadeIn > 0 ? cueIn : 1} />}
      {song < hit && texture === 'film' && (
        <AbsoluteFill style={{ background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 2px, transparent 2px ${7 + (frame % 5)}px)`, opacity: 0.6 * (fadeIn > 0 ? cueIn : 1) }} />
      )}
      {song < hit && texture === 'drops' && (
        <AbsoluteFill
          style={{
            opacity: fadeIn > 0 ? cueIn : 1,
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 25%, black 85%)', WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 25%, black 85%)',
          }}
        >
          <svg width={width} height={height}>
            {DROPS.map(([x, y, r, v], i) => {
              const d = 6 + 16 * r;
              return (
                <g key={i} transform={`translate(${x * width + Math.sin(song * 0.4 + i) * 6}, ${(y * height + song * (8 + 18 * v)) % height})`} opacity={0.25 + 0.45 * r}>
                  <ellipse rx={d} ry={d * 1.2} fill={colors.cyan} fillOpacity={0.1} stroke={colors.bone} strokeOpacity={0.55} strokeWidth={1.6} />
                  <ellipse cx={-d * 0.35} cy={-d * 0.45} rx={d * 0.22} ry={d * 0.3} fill="white" opacity={0.85} />
                </g>
              );
            })}
          </svg>
        </AbsoluteFill>
      )}
      {/* the stand-in, in the frame's own orientation */}
      {cueIn > 0 && cueOut < 1 && (
        <div
          style={{
            position: 'absolute', left: width / 2, top: height * 0.33, transform: `translate(-50%, -50%) rotate(${angle}deg) scale(${(fadeIn > 0 ? 0.94 + 0.06 * cueIn : 0.5 + 0.5 * backOut(cueIn)) * (1 - 0.3 * cueOut)})`,
            opacity: cueIn * (1 - cueOut),
          }}
        >
          <Cue t={song - hook.from} tip={tipP} tipAt={tip - hook.from} angle={angle} beat={beat} size={cueSize} theme={theme} />
        </div>
      )}
      {/* the plea, already turned: it reads upright for a viewer who has turned the phone */}
      {song >= tip + 0.45 && cueOut < 1 && hook.plea && (
        <div style={stage}>
          <div style={{ position: 'absolute', left: vw * 0.04, top: 0, bottom: 0, width: vw * 0.58, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - cueOut }}>
            {hook.pleaStyle === 'element' ? (
              <ElementPlea lines={hook.plea} song={song} at={tip + 0.45} gap={beat * 0.5} theme={theme} />
            ) : (
              <Plea lines={hook.plea} song={song} at={tip + 0.45} gap={beat * 0.5} theme={theme} plain={hook.pleaStyle === 'plain'} />
            )}
          </div>
        </div>
      )}
      {/* the title card, turned */}
      {titleOn > 0 && hook.title && title && (
        <div style={{ ...stage, opacity: titleOn }}>
          <TitleCard slug={slug} manifest={manifest} theme={theme} w={vw} h={vh} cfg={{ ...title, hit: hook.title.hit }} song={song} from={hook.title.from} to={hit} />
        </div>
      )}
      {/* the stretch's 16:9 edit, turned; its sound from `songIn` (the cue's first frame by default) */}
      <div style={{ ...stage, opacity: song >= hit ? 1 : 0 }}>
        <Sequence from={f0} layout="none">
          <OffthreadVideo
            src={staticFile(`${slug}/${video}`)}
            startFrom={f0 - fv}
            volume={f => Math.max(0, Math.min(songUp((f0 + f) / fps), (end - (f0 + f) / fps) / 0.4))}
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
