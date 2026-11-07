/**
 * The powerful type set for the flowing edit (make-anime-music-video, after UnClonable's channel):
 * giant heavy words a beat each (slam), the two-tier lockup (a thin spaced line over a heavy italic
 * word with a glowing outline), brush words a beat each down a diagonal, giant outlined words behind
 * the subject, words with the energy pouring off them (burn: the GPU aura on the letters) and the
 * footage inside the letters (knockout, which can dive through into the next shot). Sizes are fitted to
 * the frame with the loaded faces' real metrics.
 */
import React from 'react';
import { Easing, interpolate, random, staticFile } from 'remotion';
import { FONTS, STACK_FONTS, type StackFont } from './fonts';
import { AURA, GLPass, KNOCK } from './gl';
import { CC, ENERGY } from './look';
import type { Cut, Words } from './types';

const W = 1920;
const H = 1080;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const easeOut = { ...clamp, easing: Easing.out(Easing.cubic) };
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9']/g, '');

let measureCtx: CanvasRenderingContext2D | null = null;
/** the font size at which `text` is `maxW` wide (capped at `maxH`), with letter spacing in em */
export const fit = (text: string, family: string, maxW: number, maxH: number, weight = 400, style = 'normal', spacing = 0) => {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return maxH;
  measureCtx.font = `${style} ${weight} 100px "${family}"`;
  const w100 = measureCtx.measureText(text).width + spacing * 100 * Math.max(0, [...text].length - 1);
  return Math.min(maxH, (maxW / Math.max(1, w100)) * 100);
};

const Box: React.FC<{ x?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x = 0.5, y = 0.5, children, style }) => (
  <div style={{ position: 'absolute', left: x * W, top: y * H, transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', textAlign: 'center', ...style }}>
    {children}
  </div>
);

/** which unit of a ' / '-separated text is on at t (each lands on its beat) */
const unitAt = (w: Words, units: string[], t: number) => {
  const beats = w.beats ?? units.map((_, i) => w.from + (i * (w.to - w.from)) / units.length);
  let j = -1;
  for (let i = 0; i < units.length; i++) if (t >= beats[i] - 1e-3) j = i;
  return { j, beats };
};

/** giant heavy words a beat each: 'I / AM / THE ONE' (a '|' inside a unit breaks the line) */
export const Slam: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const units = w.text.split(' / ');
  const { j, beats } = unitAt(w, units, t);
  if (j < 0) return null;
  const unit = units[j].toUpperCase();
  const lines = unit.split('|');
  const since = t - beats[j];
  const end = beats[j + 1] ?? w.to;
  const a = interpolate(since, [0, 0.12], [0, 1], easeOut);
  const out = j === units.length - 1 ? interpolate(t, [w.to - 0.12, w.to], [0, 1], clamp) : 0;
  const family = FONTS.hero;
  const size = Math.min(...lines.map(l => fit(l, family, W * (w.width ?? 0.9), ((w.size ?? 0.66) * H) / lines.length)));
  const keyed = !!w.key && norm(unit).includes(norm(w.key));
  const energy = ENERGY[w.energy ?? 'blue'];
  const color = keyed ? energy.css : w.color ?? '#ffffff';
  const sh = (1 - Math.min(1, since / 0.32)) * 18;
  const f = Math.round(t * 60);
  const dx = (random(`sx${f}`) - 0.5) * sh;
  const dy = (random(`sy${f}`) - 0.5) * sh;
  const split = (1 - a) * 30;
  const blur = (1 - a) * 12 + out * 18;
  const scale = 1.34 - 0.34 * a + 0.035 * Math.min(1, since / Math.max(0.2, end - beats[j])) + out * 0.18;
  const text = (style: React.CSSProperties) => (
    <div style={{ fontFamily: family, fontSize: size, lineHeight: 0.86, letterSpacing: '0.01em', ...style }}>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
  return (
    <Box
      x={w.x}
      y={w.y}
      style={{
        transform: `translate(-50%, -50%) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale.toFixed(4)})`,
        opacity: 1 - out,
        filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
      }}
    >
      {split > 0.5 && (
        <>
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-split}px)`, mixBlendMode: 'screen', opacity: 0.85 }}>{text({ color: '#ff2448' })}</div>
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${split}px)`, mixBlendMode: 'screen', opacity: 0.85 }}>{text({ color: '#21d8ff' })}</div>
        </>
      )}
      {text({
        position: 'relative',
        color,
        filter: a < 1 ? `brightness(${(1 + (1 - a) * 2.5).toFixed(2)})` : undefined,
        textShadow: `0 0 ${(size * 0.06).toFixed(0)}px ${keyed ? energy.css : 'rgba(255,255,255,0.55)'}, 0 0 ${(size * 0.3).toFixed(0)}px ${keyed ? energy.css : 'rgba(120,200,255,0.35)'}, 0 ${(size * 0.03).toFixed(0)}px ${(size * 0.08).toFixed(0)}px rgba(0,0,0,0.6)`,
      })}
    </Box>
  );
};

/** UnClonable's "WE'VE BEEN / INFILTRATED": a thin spaced-caps line over a heavy italic word with a glowing outline */
export const Lockup: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const sub = (w.sub ?? '').toUpperCase();
  const main = w.text.toUpperCase();
  const tMain = w.beats?.[1] ?? w.from + 0.14;
  const aSub = interpolate(t, [w.beats?.[0] ?? w.from, (w.beats?.[0] ?? w.from) + 0.4], [0, 1], easeOut);
  const aMain = interpolate(t, [tMain, tMain + 0.12], [0, 1], easeOut);
  const out = interpolate(t, [w.to - 0.15, w.to], [0, 1], clamp);
  const size = fit(main, FONTS.kinetic, W * 0.82, (w.size ?? 0.22) * H, 900, 'italic');
  const accent = w.color ?? ENERGY[w.energy ?? 'red'].css;
  const stroke = Math.max(2, size * 0.022);
  const face: React.CSSProperties = { fontFamily: FONTS.kinetic, fontWeight: 900, fontStyle: 'italic', fontSize: size, lineHeight: 1, letterSpacing: '0.01em' };
  return (
    <Box x={w.x} y={w.y} style={{ opacity: 1 - out, filter: out > 0 ? `blur(${(out * 14).toFixed(1)}px)` : undefined }}>
      {sub && (
        <div
          style={{
            fontFamily: FONTS.label,
            fontWeight: 700,
            fontSize: Math.max(34, size * 0.2),
            letterSpacing: `${(0.5 + (1 - aSub) * 0.7).toFixed(3)}em`,
            marginRight: `-${(0.5 + (1 - aSub) * 0.7).toFixed(3)}em`,
            color: '#ffffff',
            opacity: aSub,
            marginBottom: size * 0.02,
            textShadow: '0 2px 18px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.9)',
          }}
        >
          {sub}
        </div>
      )}
      <div style={{ position: 'relative', transform: `scale(${(1.28 - 0.28 * aMain).toFixed(4)})`, opacity: aMain, filter: aMain < 1 ? `blur(${((1 - aMain) * 10).toFixed(1)}px) brightness(${(1 + (1 - aMain) * 2).toFixed(2)})` : undefined }}>
        <div style={{ ...face, position: 'absolute', inset: 0, color: accent, filter: `blur(${(size * 0.1).toFixed(0)}px)`, opacity: 0.9 }}>{main}</div>
        <div style={{ ...face, position: 'relative', color: accent, WebkitTextStroke: `${stroke.toFixed(1)}px #ffffff`, textShadow: `0 0 ${(size * 0.06).toFixed(0)}px ${accent}` }}>{main}</div>
      </div>
    </Box>
  );
};

/**
 * brush lettering a word a beat, stacked down the side (x, y = the top word), the key word bigger and
 * coloured (UnClonable's "AM / THE / PAIN"); a slight lean, so the stack stays in its free space
 */
export const Brush: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const words = w.text.split(' ');
  const beats = w.beats ?? words.map((_, i) => w.from + i * 0.22);
  const size = (w.size ?? 0.15) * H;
  const out = interpolate(t, [w.to - 0.15, w.to], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: (w.x ?? 0.18) * W, top: (w.y ?? 0.2) * H, transform: `rotate(${w.rot ?? -8}deg)`, opacity: 1 - out, filter: out > 0 ? `blur(${(out * 12).toFixed(1)}px)` : undefined }}>
      {words.map((word, i) => {
        if (t < beats[i] - 1e-3) return null;
        const a = interpolate(t, [beats[i], beats[i] + 0.11], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
        const keyed = !!w.key && norm(word) === norm(w.key);
        const color = keyed ? ENERGY[w.energy ?? 'red'].css : w.color ?? '#ffffff';
        const s = size * (keyed ? 1.3 : 1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i * size * 0.16,
              top: i * size * 0.86,
              transform: `translate(-50%, -50%) scale(${(1.55 - 0.55 * a).toFixed(4)}) rotate(${((1 - a) * -10).toFixed(2)}deg)`,
              fontFamily: FONTS.brush,
              fontSize: s,
              lineHeight: 1,
              color,
              opacity: Math.min(1, a * 1.4),
              whiteSpace: 'nowrap',
              textShadow: `0 0 ${(s * 0.14).toFixed(0)}px ${keyed ? color : 'rgba(0,0,0,0.55)'}, 0 ${(s * 0.05).toFixed(0)}px ${(s * 0.1).toFixed(0)}px rgba(0,0,0,0.75)`,
            }}
          >
            {word.toUpperCase()}
          </div>
        );
      })}
    </div>
  );
};

/** a giant outlined word, usually behind the subject (Itachi's "MOJE", u13) */
export const Outline: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const text = w.text.toUpperCase();
  const size = fit(text, FONTS.hero, W * 0.96, (w.size ?? 0.62) * H, 400, 'normal', 0.08);
  const a = interpolate(t, [w.from, w.from + 0.3], [0, 1], easeOut);
  const out = interpolate(t, [w.to - 0.25, w.to], [0, 1], clamp);
  const k = interpolate(t, [w.from, w.to], [0, 1], clamp);
  const color = w.color ?? ENERGY[w.energy ?? 'blue'].css;
  return (
    <Box x={w.x} y={w.y} style={{ opacity: a * (1 - out), transform: `translate(-50%, -50%) scale(${(1.1 - 0.1 * a + 0.05 * k).toFixed(4)})` }}>
      <div
        style={{
          fontFamily: FONTS.hero,
          fontSize: size,
          lineHeight: 0.9,
          letterSpacing: '0.08em',
          marginRight: '-0.08em',
          color: 'transparent',
          WebkitTextStroke: `${Math.max(2.5, size * 0.011).toFixed(1)}px ${color}`,
          filter: `drop-shadow(0 0 ${(size * 0.025).toFixed(0)}px ${color}) drop-shadow(0 0 ${(size * 0.08).toFixed(0)}px ${color})`,
        }}
      >
        {text}
      </div>
    </Box>
  );
};

/** draw lines of text centred at (cx, cy) on a 2D canvas the size of the frame (`stroke`: a dark edge) */
const drawText = (lines: string[], family: string, size: number, cx: number, cy: number, scale: number, fill: (ctx: CanvasRenderingContext2D) => string | CanvasGradient, stroke = 0) =>
  (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    ctx.save();
    ctx.translate((cx * cw) / W, (cy * ch) / H);
    ctx.scale((scale * cw) / W, (scale * ch) / H);
    ctx.font = `400 ${size}px "${family}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    lines.forEach((l, i) => {
      const y = (i - (lines.length - 1) / 2) * size * 0.9;
      if (stroke > 0) {
        ctx.lineWidth = size * stroke;
        ctx.strokeStyle = 'rgba(8, 10, 24, 0.85)';
        ctx.strokeText(l, 0, y);
      }
      ctx.fillStyle = fill(ctx);
      ctx.fillText(l, 0, y);
    });
    ctx.restore();
  };

/** heavy letters with the energy pouring off them (the aura shader on the letters) */
export const Burn: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const lines = w.text.toUpperCase().split('|');
  const size = Math.min(...lines.map(l => fit(l, FONTS.hero, W * (w.width ?? 0.86), ((w.size ?? 0.42) * H) / lines.length)));
  const a = interpolate(t, [w.from, w.from + 0.16], [0, 1], easeOut);
  const out = interpolate(t, [w.to - 0.2, w.to], [0, 1], clamp);
  const e = ENERGY[w.energy ?? 'blue'];
  const cx = (w.x ?? 0.5) * W;
  const cy = (w.y ?? 0.5) * H;
  const sc = 1.18 - 0.18 * a;
  const key = `${lines.join('|')}:${size.toFixed(1)}:${sc.toFixed(4)}`;
  // the letters: white at the top into the energy's colour, with a dark edge, so the fire never eats them
  const grad = (ctx: CanvasRenderingContext2D) => {
    const g = ctx.createLinearGradient(0, -size * 0.5 * lines.length, 0, size * 0.5 * lines.length);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#ffffff');
    g.addColorStop(1, `rgb(${e.outer.map((v, i) => Math.round(((v + e.core[i]) / 2) * 255)).join(',')})`);
    return g;
  };
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: (1 - out) * Math.min(1, a * 1.5) }}>
      <GLPass
        frag={AURA}
        inputs={[
          { id: 'pic', key: `${key}c`, draw: drawText(lines, FONTS.hero, size, cx, cy, sc, grad, 0.05) },
          { id: 'matte', key: `${key}m`, draw: drawText(lines, FONTS.hero, size, cx, cy, sc, () => '#ffffff') },
        ]}
        mips={['matte']}
        uniforms={{ u_t: t, u_c1: e.core, u_c2: e.outer, u_amt: 0.95 + (1 - a) * 1.6, u_rise: w.size && w.size < 0.25 ? 0.05 : 0.08, u_sub: 1, u_k: [1, 1, 1], u_dim: w.dim ?? 0, u_over: 0, u_halo: 0.55 }}
      />
    </div>
  );
};

/** the footage inside giant letters, the rest dark; exit 'dive' flies through the letters into the footage */
export const Knockout: React.FC<{ w: Words; t: number; cut?: Cut }> = ({ w, t, cut }) => {
  if (!w.clip || !cut) return null;
  const lines = w.text.toUpperCase().split('|');
  const size = Math.min(...lines.map(l => fit(l, FONTS.hero, W * 0.94, ((w.size ?? 0.78) * H) / lines.length)));
  const a = interpolate(t, [w.from, w.from + 0.14], [0, 1], easeOut);
  const d = w.exit === 'dive' ? interpolate(t, [w.to - 0.32, w.to], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) }) : 0;
  const out = w.exit === 'dive' ? 0 : interpolate(t, [w.to - 0.15, w.to], [0, 1], clamp);
  const sc = (1.12 - 0.12 * a) * (1 + d * d * 16);
  const cx = (w.x ?? 0.5) * W;
  const cy = (w.y ?? 0.5) * H;
  const key = `${lines.join('|')}:${size.toFixed(1)}:${sc.toFixed(4)}`;
  const src = staticFile(`${cut.slug}/${cut.sources[w.clip.src].path}`);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - out }}>
      <GLPass
        frag={KNOCK}
        inputs={[
          { id: 'pic', src, t: w.clip.in + (t - w.from) * (w.clip.rate ?? 1) },
          { id: 'txt', key, draw: drawText(lines, FONTS.hero, size, cx, cy, sc, () => '#ffffff') },
        ]}
        mips={['txt']}
        uniforms={{ u_k: CC.clean, u_bga: (w.accent ? 0.7 : 0.9) * (1 - d) * Math.min(1, a * 2), u_glow: ENERGY[w.energy ?? 'white'].core, u_glowAmt: 0.55 * (1 - d) }}
      />
    </div>
  );
};

/** a word or two a row: long words alone, little words joined to the word after them */
export const stackRows = (words: string[]): number[][] => {
  const rows: number[][] = [];
  let row: number[] = [];
  let chars = 0;
  words.forEach((wd, i) => {
    const n = wd.replace(/[^A-Za-z0-9']/g, '').length;
    row.push(i);
    chars += n;
    const next = words[i + 1]?.replace(/[^A-Za-z0-9']/g, '').length ?? 0;
    // close the row: a long word, two words already, or a short row whose next word is long
    if (n >= 6 || row.length >= 2 || chars >= 6 || (chars >= 4 && next >= 5) || i === words.length - 1) {
      rows.push(row);
      row = [];
      chars = 0;
    }
  });
  return rows;
};

/**
 * The summerstyle shorts' type on the footage (make-lyrics-shorts-summerstyle-boldwords, in 16:9): the
 * line's words stacked a word or two a row, every row fitted to one column width (`width`, a fraction of
 * the frame) and the stack no taller than `size` of the frame, centred on (x, y). The words wait faint
 * and light up white as each is sung (`beats`: one time per word), the `key` word in the energy's colour.
 */
export const Stack: React.FC<{ w: Words; t: number }> = ({ w, t }) => {
  const face = STACK_FONTS[(w.font ?? 'bebas') as StackFont] ?? STACK_FONTS.bebas;
  const words = w.text.toUpperCase().split(/\s+/).filter(Boolean);
  const rows = w.rows
    ? (() => {
        let k = 0;
        return w.rows.split('|').map(r => r.trim().split(/\s+/).map(() => k++));
      })()
    : stackRows(words);
  const beats = w.beats ?? words.map((_, i) => w.from + (i * (w.to - w.from)) / words.length);
  // one long word gets a wider column, so it stays as big as the rest
  const colW = (w.width ?? (rows.length === 1 ? 0.46 : 0.36)) * W;
  const maxH = (w.size ?? 0.78) * H;
  const lines = rows.map(r => r.map(i => words[i]).join(' '));
  let sizes = lines.map(l => fit(l, face.family, colW, H * 0.34, face.weight, 'normal', face.track));
  const total = sizes.reduce((a, s) => a + s * face.lh, 0);
  if (total > maxH) sizes = sizes.map(s => (s * maxH) / total);
  const a = interpolate(t, [w.from, w.from + 0.12], [0, 1], easeOut);
  const out = interpolate(t, [w.to - 0.14, w.to], [0, 1], clamp);
  const accent = ENERGY[w.energy ?? 'blue'].css;
  const keyAt = w.key ? words.findIndex(x => norm(x) === norm(w.key!)) : -1;
  return (
    <Box
      // the column always inside the frame, with a margin
      x={Math.min(Math.max(w.x ?? 0.2, colW / W / 2 + 0.045), 1 - colW / W / 2 - 0.045)}
      y={w.y ?? 0.5}
      style={{ opacity: a * (1 - out), filter: out > 0 ? `blur(${(out * 10).toFixed(1)}px)` : undefined, transform: `translate(-50%, -50%) scale(${(1.04 - 0.04 * a).toFixed(4)})` }}
    >
      {(w.dim ?? 0) > 0 && (
        // a soft dark pool under the words on a bright frame (white words only, never black ones)
        <div style={{ position: 'absolute', left: '-35%', right: '-35%', top: '-30%', bottom: '-30%', background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${w.dim}) 0%, rgba(0,0,0,${(w.dim! * 0.55).toFixed(2)}) 45%, transparent 72%)` }} />
      )}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {rows.map((r, ri) => (
          <div key={ri} style={{ fontFamily: face.family, fontWeight: face.weight, fontSize: sizes[ri], lineHeight: face.lh, letterSpacing: `${face.track}em`, whiteSpace: 'nowrap' }}>
            {r.map((i, j) => {
              const lit = interpolate(t, [beats[i] - 0.02, beats[i] + 0.08], [0, 1], clamp);
              const keyed = i === keyAt;
              const color = keyed ? accent : '#ffffff';
              return (
                <span
                  key={i}
                  style={{
                    color,
                    opacity: 0.2 + 0.8 * lit,
                    textShadow: `0 ${(sizes[ri] * 0.03).toFixed(1)}px ${(sizes[ri] * 0.12).toFixed(1)}px rgba(0,0,0,${(0.45 + 0.3 * lit).toFixed(2)}), 0 0 ${(sizes[ri] * 0.35).toFixed(0)}px rgba(0,0,0,0.35)${keyed && lit > 0 ? `, 0 0 ${(sizes[ri] * 0.18).toFixed(0)}px ${accent}` : ''}`,
                    filter: lit > 0 && lit < 1 ? `brightness(${(1 + (1 - lit) * 1.5).toFixed(2)})` : undefined,
                  }}
                >
                  {j > 0 ? ' ' : ''}
                  {words[i]}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </Box>
  );
};
