/**
 * Set pieces: the graphics that carry the big moments. Neon rings (Infinity), the golden halo, the
 * title written in stars, the heaven/earth split, the Unlimited Void's information overload, the
 * bounty reticle, the 0.2 s clock, the eye-shaped slit (R12), the Six Eyes ring, letterbox bars,
 * flashes and the title card.
 */
import React from 'react';
import { Easing, Img, interpolate, random, staticFile } from 'remotion';
import { FONTS } from './fonts';
import { Frame } from './look';
import type { Cut, Piece } from './types';

const W = 1920;
const H = 1080;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const fade = (p: { from: number; to: number }, t: number, a = 0.25, b = 0.25) =>
  Math.min(interpolate(t, [p.from, p.from + a], [0, 1], clamp), interpolate(t, [p.to - b, p.to], [1, 0], clamp));

/** pieces that sit behind the current shot's cutout instead of over everything */
export const isBehind = (p: Piece) => p.kind === 'rings';

export const PieceLayer: React.FC<{ p: Piece; t: number; cut: Cut; renderAux: (id: string, clip: string) => React.ReactNode }> = ({ p, t, cut, renderAux }) => {
  if ('at' in p) {
    if (t < p.at - 0.01 || t > p.at + ((p as { frames?: number }).frames ?? 6) / 30 + 0.02) return null;
  } else if (t < p.from - 0.01 || t > p.to + 0.01) return null;
  switch (p.kind) {
    case 'rings':
      return <Rings p={p} t={t} cut={cut} />;
    case 'halo':
      return <Halo p={p} t={t} />;
    case 'constellation':
      return <Constellation p={p} t={t} cut={cut} />;
    case 'split':
      return <Split p={p} t={t} renderAux={renderAux} />;
    case 'voidgrid':
      return <VoidGrid p={p} t={t} cut={cut} />;
    case 'reticle':
      return <Reticle p={p} t={t} />;
    case 'clock':
      return <Clock p={p} t={t} />;
    case 'letterbox':
      return <Letterbox p={p} t={t} />;
    case 'flash':
      return <Flash p={p} t={t} />;
    case 'eyeslit':
      return <EyeSlit p={p} t={t} cut={cut} />;
    case 'sixeyes':
      return <SixEyes p={p} t={t} cut={cut} />;
    case 'title':
      return <Title p={p} t={t} />;
    default:
      return null;
  }
};

const overlaySrc = (cut: Cut, name: string) => staticFile(`${cut.slug}/input/overlays/${name}.mp4`);

/** Infinity: neon rings rushing outward on a star field (R12's tunnel) */
const RingsArt: React.FC<{ t: number; t0: number; color?: string; cut: Cut }> = ({ t, t0, color = '#2fe4ff', cut }) => {
  const n = 9;
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, #04203a 0%, #010812 70%)' }}>
      <Frame src={overlaySrc(cut, 'starfield-deep')} t={(t - t0) % 100} style={{ mixBlendMode: 'screen', opacity: 0.7 }} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="ringglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: n }, (_, i) => {
          const ph = (((t - t0) * 0.42 + i / n) % 1 + 1) % 1;
          const r = 40 + ph * ph * 1300;
          return (
            <circle
              key={i}
              cx={W / 2}
              cy={H / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={4 + ph * 22}
              opacity={Math.min(1, ph * 6) * (1 - ph * 0.6)}
              filter="url(#ringglow)"
            />
          );
        })}
      </svg>
    </div>
  );
};

const Rings: React.FC<{ p: Extract<Piece, { kind: 'rings' }>; t: number; cut: Cut }> = ({ p, t, cut }) => (
  <div style={{ position: 'absolute', inset: 0, opacity: fade(p, t, 0.15, 0.2) }}>
    <RingsArt t={t} t0={p.from} color={p.color} cut={cut} />
  </div>
);

/** a golden halo above his head (R12) */
const Halo: React.FC<{ p: Extract<Piece, { kind: 'halo' }>; t: number }> = ({ p, t }) => {
  const a = interpolate(t, [p.from, p.from + 0.45], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(t, [p.to - 0.3, p.to], [0, 1], clamp);
  const w = p.w * W;
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x * W - w / 2,
        top: p.y * H - w * 0.14,
        width: w,
        height: w * 0.28,
        borderRadius: '50%',
        border: `${Math.max(6, w * 0.035)}px solid #ffe58a`,
        boxShadow: '0 0 30px 8px rgba(255, 200, 70, 0.9), inset 0 0 24px 6px rgba(255, 220, 120, 0.8), 0 0 90px 30px rgba(255, 170, 40, 0.45)',
        opacity: a * (1 - out),
        transform: `scale(${(0.6 + 0.4 * a).toFixed(3)}) translateY(${((1 - a) * -30).toFixed(1)}px)`,
      }}
    />
  );
};

/** "Stars will align / stars will fall": stars gather into the title, then rain down */
const Constellation: React.FC<{ p: Extract<Piece, { kind: 'constellation' }>; t: number; cut: Cut }> = ({ p, t, cut }) => {
  const N = 70;
  const align = interpolate(t, [p.from, p.from + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const fall = interpolate(t, [p.fall, p.fall + 1.4], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const title = interpolate(t, [p.from + 0.9, p.from + 2.1], [0, 1], clamp);
  // final star positions: two constellation bands, one above the title and one below it
  const half = N / 2;
  const stars = Array.from({ length: N }, (_, i) => {
    const row = i < half ? 0 : 1;
    const k = row ? i - half : i;
    const fx = 0.14 + 0.72 * (k / (half - 1)) + (random(`cx${i}`) - 0.5) * 0.015;
    const fy = (row ? 0.64 : 0.36) + Math.sin(k * 1.7 + row) * 0.025 + (random(`cy${i}`) - 0.5) * 0.02;
    const sx = random(`sx${i}`);
    const sy = random(`sy${i}`);
    const x = sx + (fx - sx) * align;
    const y = sy + (fy - sy) * align + fall * (0.6 + random(`fy${i}`) * 0.9);
    return { x, y, r: 1.5 + random(`r${i}`) * 3.5, tw: 0.6 + 0.4 * Math.sin(t * 7 + i) };
  });
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #0a1b3d 0%, #02040c 75%)', opacity: fade(p, t, 0.3, 0.35) }}>
      <Frame src={overlaySrc(cut, 'starry-timelapse')} t={(t - p.from) % 20} style={{ mixBlendMode: 'screen', opacity: 0.8 }} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="starglow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* constellation lines, drawn once the stars are in place */}
        {stars.slice(0, -1).map((s, i) => {
          const n = stars[i + 1];
          const show = interpolate(align, [0.7, 1], [0, 1], clamp) * (1 - fall);
          // lines run along each band only, never across the title
          return i === half - 1 || i % 4 === 3 ? null : (
            <line key={`l${i}`} x1={s.x * W} y1={s.y * H} x2={n.x * W} y2={n.y * H} stroke="#bfe9ff" strokeWidth={1.2} opacity={0.55 * show} />
          );
        })}
        {stars.map((s, i) => (
          <g key={i}>
            {fall > 0 && <line x1={s.x * W} y1={s.y * H} x2={s.x * W} y2={(s.y - 0.12 * fall) * H} stroke="#dff6ff" strokeWidth={s.r * 0.8} opacity={0.7 * fall} />}
            <circle cx={s.x * W} cy={s.y * H} r={s.r * (1 + fall)} fill="#ffffff" opacity={s.tw} filter="url(#starglow)" />
          </g>
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          opacity: title * (1 - fall),
          filter: title < 1 ? `blur(${((1 - title) * 12).toFixed(1)}px)` : undefined,
        }}
      >
        <div style={{ fontFamily: FONTS.regal, fontWeight: 900, fontSize: 132, letterSpacing: '0.16em', color: '#f3fbff', textShadow: '0 0 30px rgba(140,210,255,0.9), 0 0 80px rgba(60,140,255,0.6)' }}>
          {p.text}
        </div>
        {p.sub && (
          <div style={{ fontFamily: FONTS.label, fontWeight: 700, fontSize: 26, letterSpacing: '0.8em', color: '#9fd8ff', marginTop: 18 }}>{p.sub}</div>
        )}
      </div>
    </div>
  );
};

/** Heaven over earth: two shots split by a seam of light (the quote) */
const Split: React.FC<{ p: Extract<Piece, { kind: 'split' }>; t: number; renderAux: (id: string, clip: string) => React.ReactNode }> = ({ p, t, renderAux }) => {
  const open = interpolate(t, [p.from, p.from + 0.5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const a = fade(p, t, 0.01, 0.2);
  const half = 50 * open;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: a }}>
      {renderAux(p.top, `inset(${(50 - half).toFixed(2)}% 0 50% 0)`)}
      {renderAux(p.bottom, `inset(50% 0 ${(50 - half).toFixed(2)}% 0)`)}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, transform: 'translateY(-50%)', background: '#fff7d6', boxShadow: '0 0 24px 6px rgba(255, 220, 120, 0.9)' }} />
    </div>
  );
};

/** "A million empty thoughts": the void floods him with everything at once */
const VoidGrid: React.FC<{ p: Extract<Piece, { kind: 'voidgrid' }>; t: number; cut: Cut }> = ({ p, t, cut }) => {
  const cols = 12;
  const rows = 7;
  const k = interpolate(t, [p.from, p.to], [0, 1], clamp);
  const f = Math.floor(t * 15);
  const zoom = 1.6 - 0.6 * k;
  const white = interpolate(k, [0.8, 1], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f4fbff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom.toFixed(3)})`, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 4, padding: 4 }}>
        {Array.from({ length: cols * rows }, (_, i) => {
          const tile = p.tiles[Math.floor(random(`vt${i}-${Math.floor(f / (1 + (i % 3)))}`) * p.tiles.length)];
          const on = random(`vo${i}-${f}`) < 0.35 + 0.6 * k;
          const word = p.words[i % p.words.length];
          return (
            <div key={i} style={{ position: 'relative', overflow: 'hidden', background: '#000', opacity: on ? 1 : 0.15 }}>
              {i % 5 === 2 ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.label, fontWeight: 800, fontSize: 18, letterSpacing: '0.2em', color: '#e8f8ff' }}>{word}</div>
              ) : (
                <Img src={staticFile(`${cut.slug}/${cut.stills[tile]}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.4) contrast(1.2) brightness(1.1)' }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: '#ffffff', opacity: white }} />
    </div>
  );
};

/** the bounty on his cradle: a sniper's reticle locking on */
const Reticle: React.FC<{ p: Extract<Piece, { kind: 'reticle' }>; t: number }> = ({ p, t }) => {
  const a = fade(p, t, 0.15, 0.2);
  const lock = interpolate(t, [p.from, p.from + 0.6], [1.8, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const r = 150 * lock;
  const cx = p.x * W;
  const cy = p.y * H;
  const red = '#ff2a3d';
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: a * (Math.round(t * 30) % 9 === 0 ? 0.6 : 1) }}>
      <g transform={`rotate(${(t * 40).toFixed(1)} ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={red} strokeWidth={3} strokeDasharray="22 14" />
      </g>
      <circle cx={cx} cy={cy} r={r * 0.55} fill="none" stroke={red} strokeWidth={2} opacity={0.8} />
      {[0, 90, 180, 270].map(d => (
        <line key={d} x1={cx} y1={cy - r * 1.35} x2={cx} y2={cy - r * 0.7} stroke={red} strokeWidth={3} transform={`rotate(${d} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={5} fill={red} />
      {p.label && (
        <text x={cx + r * 1.1} y={cy - r * 0.9} fill={red} fontFamily={FONTS.label} fontWeight={800} fontSize={24} letterSpacing="6">
          {p.label}
        </text>
      )}
    </svg>
  );
};

/** "One single second": the clock of the domain */
const Clock: React.FC<{ p: Extract<Piece, { kind: 'clock' }>; t: number }> = ({ p, t }) => {
  const a = fade(p, t, 0.1, 0.25);
  const k = interpolate(t, [p.from, p.to], [0, 0.2], clamp);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: '12%', textAlign: 'center', opacity: a }}>
      <div style={{ fontFamily: FONTS.label, fontWeight: 800, fontSize: 30, letterSpacing: '0.7em', color: '#e9f8ff' }}>{p.text}</div>
      <div style={{ fontFamily: FONTS.regal, fontWeight: 900, fontSize: 120, color: '#fff', textShadow: '0 0 40px rgba(120, 220, 255, 0.9)' }}>{k.toFixed(3)}s</div>
    </div>
  );
};

const Letterbox: React.FC<{ p: Extract<Piece, { kind: 'letterbox' }>; t: number }> = ({ p, t }) => {
  const k = fade(p, t, 0.4, 0.4);
  const bar = ((H - W / p.ratio) / 2) * k;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000' }} />
    </>
  );
};

const Flash: React.FC<{ p: Extract<Piece, { kind: 'flash' }>; t: number }> = ({ p, t }) => {
  const frames = p.frames ?? 6;
  const k = interpolate(t, [p.at, p.at + frames / 30], [1, 0], clamp);
  return <div style={{ position: 'absolute', inset: 0, background: p.color ?? '#ffffff', opacity: k * k, mixBlendMode: p.color ? 'screen' : 'normal' }} />;
};

/** R12: an eye-shaped slit opens across the frame onto what lies beyond */
const EyeSlit: React.FC<{ p: Extract<Piece, { kind: 'eyeslit' }>; t: number; cut: Cut }> = ({ p, t, cut }) => {
  const k = interpolate(t, [p.from, p.to], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const h = Math.max(0.001, k * 1.25) * H; // the slit's full height
  const w = W * (0.6 + 0.55 * k);
  const path = `M ${W / 2 - w / 2} ${H / 2} Q ${W / 2} ${H / 2 - h} ${W / 2 + w / 2} ${H / 2} Q ${W / 2} ${H / 2 + h} ${W / 2 - w / 2} ${H / 2} Z`;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="eyeslit">
            <path d={path} />
          </clipPath>
        </defs>
      </svg>
      <div style={{ position: 'absolute', inset: 0, clipPath: 'url(#eyeslit)' }}>
        {p.inside === 'rings' ? <RingsArt t={t} t0={p.from} cut={cut} /> : <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, #ffffff, #cfeeff)' }} />}
      </div>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <path d={path} fill="none" stroke="#7ff3ff" strokeWidth={4} style={{ filter: 'drop-shadow(0 0 12px #2fe4ff)' }} />
      </svg>
    </div>
  );
};

/** the Six Eyes: his eye repeated in a slow ring */
const SixEyes: React.FC<{ p: Extract<Piece, { kind: 'sixeyes' }>; t: number; cut: Cut }> = ({ p, t, cut }) => {
  const a = fade(p, t, 0.3, 0.3);
  const n = 6;
  const R = 380;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: a }}>
      {Array.from({ length: n }, (_, i) => {
        const ang = (i / n) * Math.PI * 2 + (t - p.from) * 0.25;
        const x = W / 2 + Math.cos(ang) * R * 1.35;
        const y = H / 2 + Math.sin(ang) * R * 0.95;
        const pop = interpolate(t, [p.from + i * 0.08, p.from + i * 0.08 + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 110,
              top: y - 110,
              width: 220,
              height: 220,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid #7ff3ff',
              boxShadow: '0 0 30px rgba(47,228,255,0.9)',
              transform: `scale(${pop.toFixed(3)})`,
            }}
          >
            <Img src={staticFile(`${cut.slug}/${cut.stills[p.tile]}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        );
      })}
    </div>
  );
};

/** the closing title card */
const Title: React.FC<{ p: Extract<Piece, { kind: 'title' }>; t: number }> = ({ p, t }) => {
  const a = fade(p, t, 0.6, 0.6);
  const sweep = interpolate(t, [p.from + 0.3, p.from + 1.6], [-20, 120], clamp);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: a }}>
      <div
        style={{
          fontFamily: FONTS.regal,
          fontWeight: 900,
          fontSize: 120,
          letterSpacing: '0.18em',
          color: 'transparent',
          backgroundImage: `linear-gradient(100deg, #f4f1ea 0%, #f4f1ea ${sweep - 10}%, #ffffff ${sweep}%, #f4f1ea ${sweep + 10}%, #f4f1ea 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.35))',
        }}
      >
        {p.text}
      </div>
      {p.sub && <div style={{ fontFamily: FONTS.label, fontWeight: 700, fontSize: 28, letterSpacing: '0.9em', color: '#cfc7b5', marginTop: 24 }}>{p.sub}</div>}
    </div>
  );
};
