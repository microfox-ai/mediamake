/**
 * The anime music video renderer (make-anime-music-video skill): plays a project's cut list on the
 * song. Place it at 'all'.
 *
 * Per frame, bottom to top: the shot (and the one before it while an overlapping transition runs),
 * with words and pieces that sit behind the subject's cutout inside it; the overlays (rain on glass,
 * snow, lightning, leaks…); the set pieces; the words; the overlays marked `top`; flashes. Sound
 * effects are Sequences of their own.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, getInputProps, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import type { SceneProps } from '../kit/contract';
import { fontsReady } from './fonts';
import { GLPass, LIQUID, PORTAL, SMOKE, ZOOMT } from './gl';
import { CC, ENERGY, FilterDefs, Frame, LOOKS } from './look';
import { isBehind, PieceLayer } from './pieces';
import { camera, camUniforms, frameOf, matteOf, matteTime, SETTLE, settleOf, ShotLayer, SMOOTH, sourceTime, tinFrames, TRANSITIONS, type Phase } from './Shot';
import { bgAt } from './motion';
import { isBehindWord, WordsLayer } from './type';
import type { Cut, Overlay, Shot, Transition } from './types';

export type AmvProps = {
  cut: Cut;
  /** overlay name → its length in seconds (scripts/amv.ts), so long uses loop */
  overlayLengths: Record<string, number>;
};

// fonts load before the first frame is measured
void fontsReady;

// `--props='{"clean":true}'`: the picture without its words, for finding the free space under each caption
// (scripts/amv-space.py)
const CLEAN = !!(getInputProps() as { clean?: boolean }).clean;

const indexAt = (shots: Shot[], t: number) => {
  let lo = 0;
  let hi = shots.length - 1;
  if (t < shots[0].from) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (shots[mid].from <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

/** shard polygons (percent) for the shatter transition: a broken pane from a centre point */
const SHARDS: { poly: string; dx: number; dy: number; rot: number }[] = (() => {
  const pts: [number, number][] = [
    [0, 0], [30, 0], [62, 0], [100, 0], [100, 34], [100, 70], [100, 100], [66, 100], [36, 100], [0, 100], [0, 64], [0, 28],
  ];
  const c: [number, number] = [52, 46];
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const mx = (p[0] + q[0]) / 2 - c[0];
    const my = (p[1] + q[1]) / 2 - c[1];
    return { poly: `polygon(${c[0]}% ${c[1]}%, ${p[0]}% ${p[1]}%, ${q[0]}% ${q[1]}%)`, dx: mx, dy: my, rot: ((i * 37) % 50) - 25 };
  });
})();

/**
 * The smooth cuts' moves (ZOOMT): the old shot accelerates away (ease-in over its out-part), the new one carries the
 * same move on and settles (ease-out over its in-part), with the motion blur of each move's change per frame. A push
 * zooms in; the new shot's zoom is its camera's settle (Shot.tsx SETTLE, which stays). A warp pushes deeper and bends
 * both shots through a lens, melting one into the other over the cut. A slide carries the picture off one side and
 * the next one in from the other, the same way, its edges mirrored.
 */
const smoothMove = (kind: Transition, g: number, outF: number, inF: number, B: Shot, t: number) => {
  const pa = Math.min(1, Math.max(0, g / outF));
  const pb = Math.min(1, Math.max(0, (g - outF) / inF));
  const eA = Math.pow(pa, 2.2);
  const dA = (2.2 * Math.pow(pa, 1.2)) / outF;
  const eB = 1 - Math.pow(1 - pb, 3);
  const dB = (3 * Math.pow(1 - pb, 2)) / inF;
  const BLUR = 1.35;
  const bump = Math.max(0, 1 - Math.abs(g - outF) / 2);
  const still = [1, 0, 0, 0];
  const none = [0, 0, 0];
  // the new shot's own settle, as a scale velocity for its blur
  const settleV = B.tin === 'push' || B.tin === 'warp' ? (SETTLE * dB) / (1 + SETTLE * settleOf(B, t)) : 0;
  const before = g < outF;
  switch (kind) {
    case 'push':
      return { xA: [1 + 0.38 * eA, 0, 0, 0], vA: [0.38 * dA * BLUR, 0, 0], xB: still, vB: [settleV * BLUR, 0, 0], mix: before ? 0 : 1, flash: 0.2 * bump };
    case 'warp': {
      const m = Math.min(1, Math.max(0, (g - (outF - 1.2)) / 2.4));
      return {
        xA: [1 + 0.6 * eA, 0, 0, 0.85 * pa * pa],
        vA: [0.6 * dA * BLUR, 0, 0],
        xB: [1, 0, 0, 0.85 * (1 - eB)],
        vB: [settleV * BLUR, 0, 0],
        mix: m * m * (3 - 2 * m),
        flash: 0.3 * bump,
      };
    }
    default: {
      // slides: the picture moves that way (uv: +x right, +y up)
      const dir = kind === 'slide-l' ? [-1, 0] : kind === 'slide-r' ? [1, 0] : kind === 'slide-u' ? [0, 1] : [0, -1];
      const oA = 0.45 * eA;
      const oB = -0.28 * (1 - eB);
      return {
        xA: [1, dir[0] * oA, dir[1] * oA, 0],
        vA: [0, dir[0] * 0.45 * dA * BLUR, dir[1] * 0.45 * dA * BLUR],
        xB: [1, dir[0] * oB, dir[1] * oB, 0],
        vB: [0, dir[0] * 0.28 * dB * BLUR, dir[1] * 0.28 * dB * BLUR],
        mix: before ? 0 : 1,
        flash: 0.08 * bump,
      };
    }
  }
  void none;
};

/**
 * The Goten glitch (src/mediamake/Stages): the frame breaks into horizontal bands, some showing the
 * other shot, shoved sideways, red/blue split, a few inverted; re-rolled every 2 frames, strongest on
 * the cut. `env` 0..1 is the strength; `other` the share of bands showing the other shot.
 */
const bandsAt = (seed: number, env: number, other: number) => {
  const count = Math.max(2, Math.round((5 + 9 * random(`n${seed}`)) * (0.4 + 0.6 * env)));
  const raw = Array.from({ length: count }, (_, k) => {
    const h = 10 + 180 * Math.pow(random(`h${seed}.${k}`), 2);
    const y0 = random(`y${seed}.${k}`) * (1080 - h);
    return {
      y0,
      y1: y0 + h,
      other: random(`o${seed}.${k}`) < other,
      dx: (random(`x${seed}.${k}`) * 2 - 1) * 130 * env,
      split: random(`s${seed}.${k}`) < 0.65,
      invert: random(`i${seed}.${k}`) < 0.12,
    };
  });
  raw.sort((a, b) => a.y0 - b.y0);
  const out: typeof raw = [];
  let cur = 0;
  const jitter = (random(`j${seed}`) * 2 - 1) * 16 * env;
  for (const r of raw) {
    const y0 = Math.max(r.y0, cur);
    if (r.y1 <= y0) continue;
    if (y0 > cur) out.push({ y0: cur, y1: y0, other: false, dx: jitter, split: false, invert: false });
    out.push({ ...r, y0 });
    cur = r.y1;
  }
  if (cur < 1080) out.push({ y0: cur, y1: 1080, other: false, dx: jitter, split: false, invert: false });
  return out;
};

export const Amv: React.FC<SceneProps<AmvProps>> = ({ manifest, section, cut, overlayLengths }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = section.from + frame / fps;
  const shots = cut.shots;
  const aux = useMemo(() => Object.fromEntries(cut.aux.map(s => [s.id, s])), [cut]);
  const ctx = { cut, m: manifest, frame };

  const i = indexAt(shots, t);
  const s = shots[i];
  const prev = shots[i - 1];
  const next = shots[i + 1];
  const tin = TRANSITIONS[s.tin ?? 'cut'];
  const tinLen = tinFrames(s);
  const sinceF = (t - s.from) * fps;
  const inPh: Phase | undefined = s.tin && sinceF < tinLen ? { kind: s.tin, p: sinceF / tinLen, dir: 'in' } : undefined;
  const tnext = next?.tin ? TRANSITIONS[next.tin] : undefined;
  const untilF = next ? (next.from - t) * fps : Infinity;
  const outPh: Phase | undefined = tnext && untilF <= tnext.out ? { kind: next!.tin!, p: 1 - untilF / Math.max(1, tnext.out), dir: 'out' } : undefined;
  const ph = outPh && (!inPh || untilF < sinceF) ? outPh : inPh;
  const overlap = !!(inPh && tin.overlap && prev);

  // words and pieces drawn behind this shot's cutout
  const behindWords = CLEAN ? [] : cut.words.filter(w => isBehindWord(w) && t >= w.from && t <= w.to);
  const behindPieces = cut.pieces.filter(p => isBehind(p) && 'from' in p && t >= p.from && t <= p.to);
  const behind =
    s.matte && (behindWords.length || behindPieces.length) ? (
      <>
        {behindPieces.map((p, k) => (
          <PieceLayer key={`bp${k}`} p={p} t={t} cut={cut} renderAux={() => null} />
        ))}
        {behindWords.map((w, k) => (
          <WordsLayer key={`bw${k}`} w={w} t={t} cut={cut} pass="behind" />
        ))}
      </>
    ) : null;

  const renderAux = (id: string, clip: string) => {
    const a = aux[id];
    if (!a) return null;
    return (
      <div style={{ position: 'absolute', inset: 0, clipPath: clip }}>
        <ShotLayer s={a} t={t} ctx={ctx} />
      </div>
    );
  };

  const overlay = (o: Overlay, k: number) => {
    if (t < o.from || t > o.to) return null;
    const len = overlayLengths[o.src] ?? 600;
    const ot = ((o.in ?? 0) + (t - o.from) * (o.rate ?? 1)) % Math.max(0.5, len - 0.1);
    const ed = o.edge ?? 0.25;
    const edge = ed > 0 ? Math.min(1, (t - o.from) / ed, (o.to - t) / ed) : 1;
    return (
      <div key={`o${k}`} style={{ position: 'absolute', inset: 0, mixBlendMode: o.blend ?? 'screen', opacity: (o.opacity ?? 0.6) * edge }}>
        <Frame
          src={staticFile(`${cut.slug}/input/overlays/${o.src}.mp4`)}
          t={ot}
          style={{ filter: o.filter, transform: o.scale ? `scale(${o.scale})` : undefined }}
        />
      </div>
    );
  };

  // the shot track
  let track: React.ReactNode;
  // the smooth cuts: one GPU pass across the cut, the old shot's out-part then the new one's in-part
  const zt = ph && SMOOTH.has(ph.kind) ? ph : undefined;
  const zA = zt ? (zt.dir === 'out' ? s : prev) : undefined;
  const zB = zt ? (zt.dir === 'out' ? next : s) : undefined;
  if (zt && zA && zB && zA.src !== 'black' && zB.src !== 'black') {
    const outF = TRANSITIONS[zt.kind].out;
    const inF = tinFrames(zB);
    const g = zt.dir === 'out' ? outF - untilF : outF + sinceF;
    const mv = smoothMove(zt.kind, g, outF, inF, zB, t);
    const ca = camUniforms(zA, t, manifest, frame);
    const cb = camUniforms(zB, t, manifest, frame);
    track = (
      <GLPass
        frag={ZOOMT}
        inputs={[
          { id: 'a', ...frameOf(cut, zA, t) },
          { id: 'b', ...frameOf(cut, zB, t) },
        ]}
        uniforms={{
          u_t: t,
          u_camA: ca.cam,
          u_rotA: ca.rot,
          u_camB: cb.cam,
          u_rotB: cb.rot,
          u_kA: CC[zA.grade ?? 'teal'],
          u_kB: CC[zB.grade ?? 'teal'],
          u_xA: mv.xA,
          u_xB: mv.xB,
          u_vA: mv.vA,
          u_vB: mv.vB,
          u_mix: mv.mix,
          u_flash: mv.flash,
        }}
      />
    );
    // the words that sit behind his cutout stay on through the move (over it, for these few frames)
    if (behind) track = <>{track}{behind}</>;
  } else if (overlap && prev && s.tin === 'shatter') {
    const p = inPh!.p;
    track = (
      <>
        <ShotLayer s={s} t={t} ctx={ctx} behind={behind} />
        {SHARDS.map((sh, k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: sh.poly,
              transform: `translate(${(sh.dx * p * p * 2.2).toFixed(2)}%, ${(sh.dy * p * p * 2.2 + 30 * p * p).toFixed(2)}%) rotate(${(sh.rot * p).toFixed(1)}deg)`,
              opacity: 1 - p * 0.6,
              filter: `brightness(${(1 + p).toFixed(2)})`,
            }}
          >
            <ShotLayer s={prev} t={t} ctx={ctx} />
          </div>
        ))}
      </>
    );
  } else if (overlap && prev && s.tin === 'eye') {
    const p = inPh!.p;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const h = Math.max(1, e * 1.3 * 1080);
    const w = 1920 * (0.55 + 0.75 * e);
    const path = `M ${960 - w / 2} 540 Q 960 ${540 - h} ${960 + w / 2} 540 Q 960 ${540 + h} ${960 - w / 2} 540 Z`;
    track = (
      <>
        <ShotLayer s={prev} t={t} ctx={ctx} />
        <div style={{ position: 'absolute', inset: 0, clipPath: `path('${path}')` }}>
          <ShotLayer s={s} t={t} ctx={ctx} behind={behind} />
        </div>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <path d={path} fill="none" stroke="#7ff3ff" strokeWidth={4} opacity={1 - p} style={{ filter: 'drop-shadow(0 0 14px #2fe4ff)' }} />
        </svg>
      </>
    );
  } else if (overlap && prev && (s.tin === 'liquid' || s.tin === 'portal' || s.tin === 'smoke')) {
    // the GPU transitions: both shots' frames as they sit in their cameras, mixed by a shader
    const p = inPh!.p;
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const a = frameOf(cut, prev, t);
    const b = frameOf(cut, s, t);
    const ca = camUniforms(prev, t, manifest, frame);
    const cb = camUniforms(s, t, manifest, frame);
    const e = ENERGY[s.portal?.color ?? s.aura?.color ?? 'blue'];
    // the portal opens to a window, holds a breath, then pushes through
    const ss = (x: number, lo: number, hi: number) => Math.min(1, Math.max(0, (x - lo) / (hi - lo))) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (x - lo) / (hi - lo))));
    const r = 0.01 + 0.13 * ss(p, 0, 0.35) + 2.1 * ss(p, 0.5, 1) ** 2;
    track = (
      <GLPass
        frag={s.tin === 'liquid' ? LIQUID : s.tin === 'portal' ? PORTAL : SMOKE}
        inputs={[
          { id: 'a', ...a },
          { id: 'b', ...b },
        ]}
        uniforms={{
          u_t: t,
          u_p: s.tin === 'portal' ? p : ease,
          u_camA: ca.cam,
          u_rotA: ca.rot,
          u_camB: cb.cam,
          u_rotB: cb.rot,
          u_kA: CC[prev.grade ?? 'teal'],
          u_kB: CC[s.grade ?? 'teal'],
          u_tint: e.core,
          u_dir: s.dir ?? [1, 0],
          u_c: [s.portal?.x ?? 0.5, 1 - (s.portal?.y ?? 0.5)],
          u_r: r,
          u_zb: 0.45 + 0.55 * ss(p, 0.3, 1),
          u_ring: e.outer,
        }}
      />
    );
  } else if ((overlap && prev && s.tin === 'bands') || (outPh?.kind === 'bands' && next)) {
    // the Goten glitch round the cut: before it, bands of the shot to come break through; after it,
    // bands of the shot that left, strongest on the cut itself, the first frame after the cut all new
    const before = outPh?.kind === 'bands' && !(overlap && s.tin === 'bands');
    const base = before ? s : s;
    const otherShot = before ? next! : prev!;
    const p = before ? outPh!.p : inPh!.p;
    const env = before ? 0.35 + 0.65 * p : 1 - p * 0.85;
    const seed = Math.floor(frame / 2) * 7.31 + s.from;
    const bands = bandsAt(seed, env, before ? 0.35 + 0.4 * p : 0.6 * (1 - p));
    const flashNew = !before && sinceF < 1;
    track = (
      <>
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={`amv-split-${frame}`} x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
              <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
              <feOffset in="r" dx={18 * env} result="r2" />
              <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
              <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
              <feOffset in="b" dx={-18 * env} result="b2" />
              <feBlend in="r2" in2="g" mode="screen" result="rg" />
              <feBlend in="rg" in2="b2" mode="screen" />
            </filter>
          </defs>
        </svg>
        {flashNew ? (
          <ShotLayer s={s} t={t} ctx={ctx} behind={behind} />
        ) : (
          bands.map((band, k) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: `inset(${band.y0.toFixed(0)}px 0 ${(1080 - band.y1).toFixed(0)}px 0)`,
                transform: `translateX(${band.dx.toFixed(1)}px)`,
                filter: [band.split ? `url(#amv-split-${frame})` : '', band.invert ? 'invert(1) hue-rotate(180deg)' : ''].filter(Boolean).join(' ') || undefined,
              }}
            >
              <ShotLayer s={band.other ? otherShot : base} t={t} ctx={ctx} behind={band.other ? undefined : behind} />
            </div>
          ))
        )}
      </>
    );
  } else if (overlap && prev && s.tin === 'mask' && s.matte) {
    // his cutout arrives first over the old shot, then his world comes in behind him
    const p = inPh!.p;
    const cb = camera(s, t, manifest, frame);
    const subj = Math.min(1, p / 0.3);
    const world = Math.max(0, (p - 0.5) / 0.5);
    track = (
      <>
        <ShotLayer s={prev} t={t} ctx={ctx} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: subj,
            transform: `translate(${cb.tx.toFixed(1)}px, ${cb.ty.toFixed(1)}px) rotate(${cb.rot.toFixed(2)}deg) scale(${(cb.z * (1.14 - 0.14 * subj)).toFixed(4)})`,
          }}
        >
          <Frame
            src={matteOf(cut, s.matte)}
            t={matteTime(s, t)}
            transparent
            style={{ filter: `${LOOKS[s.grade ?? 'teal'].filter} drop-shadow(0 0 ${(16 * (1 - p)).toFixed(1)}px #ffffff) drop-shadow(0 0 ${(40 * (1 - p)).toFixed(1)}px ${ENERGY[s.aura?.color ?? 'blue'].css})` }}
          />
        </div>
        {world > 0 && (
          <div style={{ position: 'absolute', inset: 0, opacity: world }}>
            <ShotLayer s={s} t={t} ctx={ctx} behind={behind} />
          </div>
        )}
      </>
    );
  } else if (overlap && prev) {
    // fade
    track = (
      <>
        <ShotLayer s={prev} t={t} ctx={ctx} />
        <div style={{ position: 'absolute', inset: 0, opacity: inPh!.p }}>
          <ShotLayer s={s} t={t} ctx={ctx} behind={behind} />
        </div>
      </>
    );
  } else {
    track = <ShotLayer s={s} t={t} ctx={ctx} ph={ph} behind={behind} />;
  }

  // white flash on 'flash' cuts
  const flash = s.tin === 'flash' && sinceF < tin.in ? Math.pow(1 - sinceF / tin.in, 2) : 0;

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <FilterDefs />
      {(() => {
        // the camera on the footage under the caption (motion.tsx bgAt)
        const m = bgAt(cut.words, t);
        if (!m) return track;
        const filter = [m.blur > 0.3 ? `blur(${m.blur.toFixed(1)}px)` : '', m.bright !== 1 ? `brightness(${m.bright.toFixed(3)})` : ''].join(' ').trim();
        return (
          <div style={{ position: 'absolute', inset: 0, transform: `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px) rotate(${m.rot.toFixed(4)}rad) scale(${m.s.toFixed(4)})`, filter: filter || undefined }}>
            {track}
          </div>
        );
      })()}
      {cut.overlays.map((o, k) => (o.top ? null : overlay(o, k)))}
      {cut.pieces.map((p, k) => (isBehind(p) && s.matte ? null : <PieceLayer key={`p${k}`} p={p} t={t} cut={cut} renderAux={renderAux} />))}
      {/* over the subject: every word, but those behind his cutout (a cutout's outline comes back over him) */}
      {!CLEAN &&
        cut.words.map((w, k) =>
          isBehindWord(w) && s.matte && w.look !== 'cutout' ? null : <WordsLayer key={`w${k}`} w={w} t={t} cut={cut} pass={w.look === 'cutout' ? (s.matte ? 'front' : 'solo') : 'solo'} />,
        )}
      {cut.overlays.map((o, k) => (o.top ? overlay(o, k) : null))}
      {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash }} />}
      {cut.sfx.map((x, k) => (
        <Sequence key={`sfx${k}`} from={Math.round((x.at - section.from) * fps)} durationInFrames={Math.round(6 * fps)} layout="none">
          <Audio src={staticFile(`${cut.slug}/input/sfx/${x.src}`)} volume={x.volume ?? 0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** for scripts: where a shot's source time is at song time t */
export { sourceTime };
