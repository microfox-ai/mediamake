/**
 * '@title': a collab lockup, LOGO × TITLE. The logo is revealed alone in the centre by a light sweep
 * (a moving shine keeps running over it), then glides left as an × slashes in beside it and the
 * title slams in on its right on beat `cfg.hit`: each letter flies in on a motion-blurred speed
 * trail, lands with a flash of light, a speed streak bursts behind it, the camera takes the hit;
 * a metallic shine and an underline under the whole lockup follow, then the small line. The card
 * zooms out into the next cut. The logo, streaks, underline and glows take the theme's accent
 * (colors.red).
 */
import React from 'react';
import { AbsoluteFill, Easing, interpolate, random, staticFile } from 'remotion';
import type { Manifest } from '../../kit/manifest';
import type { TitleCard as Cfg } from '../edl.ts';
import { measure } from '../measure';
import { beatTime } from '../resolve.ts';

type Theme = { fonts: { punch: string; line: string; data: string; title?: string }; colors: { ground: string; bone: string; red: string } };

const out = Easing.out(Easing.cubic);
const inOut = Easing.inOut(Easing.cubic);
const p01 = (t: number, a: number, b: number, e = out) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });

export const TitleCard: React.FC<{ slug: string; manifest: Manifest; theme: Theme; w: number; h: number; cfg: Cfg; song: number; from: number; to: number }> = ({
  slug, manifest, theme, w, h, cfg, song, from, to,
}) => {
  const t = song - from;
  const hit = beatTime(manifest as never, cfg.hit);
  const { colors, fonts } = theme;
  // the accent (colors.red), darker and lighter, and as a glow at alpha a: the card follows the theme
  const dark = `color-mix(in srgb, ${colors.red} 60%, black)`;
  const light = `color-mix(in srgb, ${colors.red} 72%, white)`;
  const glow = (a: number) => `color-mix(in srgb, ${colors.red} ${Math.round(a * 100)}%, transparent)`;
  const logo = staticFile(`${slug}/${cfg.logo}`);
  const family = fonts.title ?? fonts.punch;
  const ratio = 387 / 1280;

  // the lockup: [logo] × [TITLE], centred as a whole
  let size = cfg.size ?? 150;
  let titleW = measure(cfg.text, family, size, 0);
  const lw = cfg.logoW ?? 540;
  const xs = 84;
  const gap = 64;
  const fit = (w * 0.86) / (lw + xs + gap * 2 + titleW);
  if (fit < 1) {
    size *= fit;
    titleW *= fit;
  }
  const k = Math.min(1, fit);
  const LWl = lw * k;
  const XS = xs * k;
  const G = gap * k;
  const total = LWl + XS + G * 2 + titleW;
  const x0 = (w - total) / 2;
  const cy = h * 0.43;

  // the logo: alone and big in the centre, then it glides into the lockup as the × and title arrive
  const LW0 = Math.max(720, lw * 1.1);
  const slide = p01(song, hit - 0.42, hit - 0.06, inOut);
  const LW = LW0 + (LWl - LW0) * slide;
  const LH = LW * ratio;
  const lx = (w - LW0) / 2 + (x0 - (w - LW0) / 2) * slide;
  const rev = p01(t, 0.08, 0.7, inOut);
  const settle = p01(t, 0.08, 1.1);
  const shine = ((t * 0.7) % 1.4) / 1.4; // a pass every 2 s
  const mask: React.CSSProperties = { WebkitMaskImage: `url(${logo})`, WebkitMaskSize: '100% 100%', maskImage: `url(${logo})`, maskSize: '100% 100%' };

  // the ×: two slashes, the second a beat of a frame after the first, each a line of light
  const xc = x0 + LWl + G + XS / 2;
  const s1 = p01(song, hit - 0.16, hit - 0.08, Easing.out(Easing.quad));
  const s2 = p01(song, hit - 0.09, hit - 0.01, Easing.out(Easing.quad));
  const xGlow = song >= hit - 0.08 ? Math.exp(-Math.max(0, song - hit + 0.08) * 5) : 0;

  // title letters
  const title = cfg.text.split('');
  const tx = x0 + LWl + G * 2 + XS;
  const landAt = (n: number) => hit + n * 0.035;
  const allIn = landAt(title.length - 1) + 0.05;
  const shake = song >= hit ? Math.exp(-(song - hit) * 7) : 0;
  const jx = Math.sin(song * 71) * 14 * shake;
  const jy = Math.cos(song * 53) * 9 * shake;
  const exit = p01(song, to - 0.3, to, Easing.in(Easing.cubic));
  const underline = p01(song, allIn, allIn + 0.35);
  const shineT = p01(song, allIn + 0.1, allIn + 0.9, inOut);
  const rowBottom = cy + Math.max(LWl * ratio, size * 0.78) / 2;

  return (
    <AbsoluteFill style={{ background: colors.ground, overflow: 'hidden' }}>
      {/* drifting speed lines and a red glow behind the lockup */}
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 26 }, (_, n) => {
          const y = random(`ty${n}`) * h;
          const len = 120 + random(`tl${n}`) * 420;
          const x = w - (((random(`tx${n}`) * (w + len)) + t * (500 + 900 * random(`tv${n}`))) % (w + len));
          return <line key={n} x1={x} y1={y} x2={x + len} y2={y} stroke={colors.bone} strokeOpacity={0.05 + 0.08 * random(`to${n}`)} strokeWidth={1.5} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 40% at 50% ${(cy / h) * 100}%, ${glow(0.2 * rev)} 0%, rgba(0,0,0,0) 70%)` }} />

      <AbsoluteFill style={{ transform: `translate(${jx}px, ${jy}px) scale(${1 + 0.35 * exit})`, opacity: 1 - exit, filter: exit > 0.05 ? `blur(${exit * 10}px)` : undefined }}>
        {/* the logo */}
        <div style={{ position: 'absolute', left: lx, top: cy - LH / 2, width: LW, height: LH, transform: `scale(${1.12 - 0.12 * settle})`, filter: settle < 1 ? `blur(${(1 - settle) * 6}px)` : undefined }}>
          <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - 100 * rev}% 0 0)` }}>
            <div style={{ position: 'absolute', inset: 0, ...mask, background: `linear-gradient(100deg, ${dark} 0%, ${colors.red} 40%, ${light} 55%, ${colors.red} 70%, ${dark} 100%)` }} />
            <div
              style={{
                position: 'absolute', inset: 0, ...mask,
                background: `linear-gradient(105deg, rgba(255,255,255,0) ${shine * 160 - 40}%, rgba(255,255,255,0.85) ${shine * 160 - 30}%, rgba(255,255,255,0) ${shine * 160 - 20}%)`,
              }}
            />
          </div>
          {/* the sweep's edge of light */}
          {rev > 0 && rev < 1 && (
            <div style={{ position: 'absolute', top: -LH * 0.25, bottom: -LH * 0.25, left: `${rev * 100}%`, width: 6, background: '#fff', boxShadow: `0 0 30px 12px rgba(255,255,255,0.7), 0 0 90px 30px ${glow(0.5)}`, transform: 'translateX(-50%) skewX(-18deg)' }} />
          )}
        </div>

        {/* the × */}
        {s1 > 0 && (
          <svg width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible', filter: `drop-shadow(0 0 ${6 + 24 * xGlow}px ${glow(0.4 + 0.6 * xGlow)})` }}>
            {[
              [s1, -1],
              [s2, 1],
            ].map(([s, d], n) => {
              const r = XS / 2;
              const ax = xc - r * d;
              const ay = cy - r;
              return <line key={n} x1={ax} y1={ay} x2={ax + 2 * r * d * s} y2={ay + 2 * r * s} stroke={colors.bone} strokeWidth={Math.max(4, 7 * k)} strokeLinecap="square" opacity={s > 0 ? 1 : 0} />;
            })}
          </svg>
        )}

        {/* red speed streaks bursting behind the title on the hit */}
        {song >= hit - 0.05 && (
          <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
            {[0, 1, 2, 3].map(n => {
              const s = p01(song, hit - 0.05 + n * 0.03, hit + 0.35 + n * 0.03);
              const y = cy + (n - 1.5) * 30;
              const head = w * (1.1 - 0.55 * s);
              return <line key={n} x1={head} y1={y} x2={head + w * 0.4 * (1 - s * 0.6)} y2={y} stroke={colors.red} strokeOpacity={0.85 * (1 - s)} strokeWidth={4 - n * 0.6} strokeLinecap="round" />;
            })}
          </svg>
        )}

        {/* the title */}
        <div style={{ position: 'absolute', left: tx, top: cy - size * 0.5, fontFamily: family, fontWeight: 900, fontSize: size, lineHeight: 1, transform: 'skewX(-11deg)', whiteSpace: 'nowrap' }}>
          {title.map((ch, n) => {
            if (ch === ' ') return <span key={n} style={{ display: 'inline-block', width: size * 0.3 }} />;
            const land = landAt(n);
            const q = p01(song, land - 0.14, land, Easing.out(Easing.quad));
            if (song < land - 0.14) return <span key={n} style={{ display: 'inline-block', visibility: 'hidden' }}>{ch}</span>;
            const dx = (1 - q) * 820;
            const flash = song >= land ? Math.exp(-(song - land) * 6) : 0;
            const letter: React.CSSProperties = {
              backgroundImage: `linear-gradient(100deg, ${colors.bone} 0%, ${colors.bone} ${shineT * 140 - 30}%, #ffffff ${shineT * 140 - 18}%, ${colors.bone} ${shineT * 140 - 6}%, #d8d4cc 100%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            };
            return (
              <span key={n} style={{ position: 'relative', display: 'inline-block' }}>
                {/* speed trail */}
                {q < 1 && [3, 2, 1].map(j => (
                  <span key={j} style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${dx + j * 70 * (1 - q)}px)`, color: colors.bone, opacity: 0.18 * (1 - q) * (1 - j / 4), filter: 'url(#remix-mbh5)' }}>{ch}</span>
                ))}
                <span style={{ display: 'inline-block', transform: `translateX(${dx}px)`, filter: q < 0.95 ? 'url(#remix-mbh4)' : undefined, textShadow: flash > 0.02 ? `0 0 ${40 * flash}px rgba(255,255,255,${flash}), 0 0 ${90 * flash}px ${glow(0.7 * flash)}` : undefined, ...letter }}>
                  {ch}
                </span>
              </span>
            );
          })}
        </div>

        {/* the red underline under the whole lockup */}
        <div style={{ position: 'absolute', left: w / 2, top: rowBottom + 34, height: 6, width: total * underline, transform: 'translateX(-50%)', background: colors.red, boxShadow: `0 0 24px ${colors.red}` }} />

        {/* the small line */}
        {cfg.sub && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: rowBottom + 70, textAlign: 'center', fontFamily: fonts.line, fontSize: 22, letterSpacing: '0.7em', color: colors.bone, opacity: 0.85 }}>
            {cfg.sub.slice(0, Math.ceil(cfg.sub.length * p01(song, allIn + 0.2, allIn + 0.8, Easing.linear)))}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
