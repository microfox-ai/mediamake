// kinetictype shots: every device of the make-kinetictype style as a component drawn from its spec at
// time t (the video's seconds). Ported from projects/screamingtowin (2026-11-08), where the user's
// rule was set: one giant word per hit, faces cut out in front of the type, words as windows onto the
// plates, cracks, and motion everywhere — every shot slams in (scale, rotation kick, smear, colour split),
// the camera pushes and shakes, inverted impact frames on the big hits.
import React from 'react';
import { AbsoluteFill, random } from 'remotion';
import {
  ANTON,
  Cover,
  Cracked,
  Frame,
  H,
  KnockoutOnBlack,
  SpeedLines,
  W,
  Word,
  ZoomEcho,
  clamp,
  easeIn,
  easeOut,
  entry,
  fit,
  kick,
  lastHit,
  lerp,
  shake,
} from './fx';
import type {
  BurstShot,
  CrackShot,
  FacesShot,
  FlashShot,
  LettersShot,
  OpenShot,
  PosterShot,
  RiseShot,
  SlamFields,
  StrobeShot,
} from './spec';

/** The palette: ink, paper, one red; the blue / fire tones only where a plate brings them. */
export const C = {
  ink: '#0a0a0a',
  paper: '#fbfbfa',
  red: '#e02b3e',
  fire: '#ff8a2a',
  blue: '#4cc3ff',
  night: '#04060d',
};

const SLAM = 0.12; // seconds a slam takes
const IMPACT = 2 / 30; // an impact frame lasts two frames
const impactFilter = 'invert(1) grayscale(1) contrast(2)';

// ================================================================ the slam

const Stack: React.FC<{ s: SlamFields; e: number; mask?: boolean; strokeOnly?: string }> = ({ s, e, mask, strokeOnly }) => {
  const width = s.width ?? 1040;
  const sizes = s.rows.map(r => fit(r, width, s.max ?? 1500));
  const pitches = sizes.map(z => z * 0.84);
  const total = pitches.reduce((a, b) => a + b, 0);
  let y = (s.y ?? 960) - total / 2;
  const els: React.ReactNode[] = [];
  s.rows.forEach((r, i) => {
    const yc = y + pitches[i] / 2;
    y += pitches[i];
    const p = easeOut(clamp((e - i * 0.035) / SLAM));
    const q = 1 - p;
    const split = mask ? 0 : 10 * q + 3;
    els.push(
      <Word
        key={`r${i}`}
        text={r}
        size={sizes[i]}
        x={540}
        y={yc}
        dx={(i % 2 ? -1 : 1) * 160 * q}
        scale={1 + 0.65 * q}
        smearX={36 * q}
        opacity={e >= i * 0.035 ? 1 : 0}
        color={mask ? '#fff' : strokeOnly || s.stroke ? 'transparent' : s.color ?? C.paper}
        stroke={strokeOnly ?? (mask ? undefined : s.stroke)}
        strokeW={4}
        style={
          mask || strokeOnly
            ? undefined
            : { textShadow: `${split}px 0 0 rgba(255,0,70,0.55), ${-split}px 0 0 rgba(0,210,255,0.55)${s.glow ? `, 0 0 40px ${s.glow}` : ''}` }
        }
      />,
    );
  });
  if (s.echoes && !mask) {
    const top = (s.y ?? 960) - total / 2;
    for (let k = 1; k <= 3; k++) {
      els.push(
        <Word
          key={`e${k}`}
          text={s.rows[0]}
          size={sizes[0]}
          x={540 + (k % 2 ? 1 : -1) * e * 120 * k}
          y={top - pitches[0] * (k - 0.5)}
          stroke={s.color ?? C.paper}
          strokeW={3}
          opacity={(0.8 - 0.2 * k) * clamp((e - 0.04 * k) / 0.06)}
        />,
      );
    }
  }
  return <>{els}</>;
};

/** One slam: `at` is when it lands (its shot's start), `amp` the energy (0..1) for the shake. */
export const Slam: React.FC<{ s: SlamFields; t: number; at: number; amp?: number; seed: string }> = ({ s, t, at, amp = 0.6, seed }) => {
  const e = t - at;
  const q = 1 - easeOut(clamp(e / SLAM));
  const [sx, sy] = shake(t, 4 + 10 * amp + 18 * q, seed);
  const rot = (s.rot ?? (random(`${seed}${at}`) - 0.5) * 8) * (1 - easeOut(clamp(e / 0.28)));
  const cam = { transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${1 + 0.07 * e + 0.05 * q})`, transformOrigin: '50% 45%' };
  const cut = s.cut;
  const rise = 1 - easeOut(clamp(e / 0.16));
  const cutEl = cut && (
    <Frame
      src={cut.src}
      f={cut.f ?? [0.5, 0.5]}
      at={[cut.at[0], cut.at[1] + 220 * rise]}
      w={cut.w * (1 + 0.14 * rise + 0.04 * e)}
      filter={cut.filter ?? 'drop-shadow(0 30px 50px rgba(0,0,0,0.45)) contrast(1.15)'}
    />
  );
  const body = s.knock ? (
    <>
      <KnockoutOnBlack
        picture={<Cover src={s.knock} f={[0.47, 0.42]} zoom={1.05 + 0.1 * e} filter="brightness(1.6) saturate(1.2) contrast(1.1)" />}
        mask={
          <AbsoluteFill style={cam}>
            <Stack s={s} e={e} mask />
          </AbsoluteFill>
        }
      />
      <AbsoluteFill style={cam}>
        <Stack s={s} e={e} strokeOnly={s.color ?? C.paper} />
        {cutEl}
      </AbsoluteFill>
    </>
  ) : (
    <AbsoluteFill style={cam}>
      {s.plate && <Cover src={s.plate} f={[0.47, 0.42]} zoom={1.03 + 0.1 * e} />}
      {s.plate && <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.75) 80%)' }} />}
      {s.lines && <SpeedLines t={t} color={s.lines} opacity={0.3 + 0.25 * q} count={26} seed={`${seed}l`} speed={3400} />}
      <Stack s={s} e={e} />
      {cutEl}
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill
      style={{ background: s.knock ? '#000' : s.ground ?? C.ink, overflow: 'hidden', filter: s.invertStart && e < IMPACT ? impactFilter : undefined }}
    >
      {body}
      <AbsoluteFill style={{ background: '#fff', opacity: 0.35 * Math.max(0, 1 - e / 0.07) }} />
    </AbsoluteFill>
  );
};

// ================================================================ open: the loop's landing

export const Open: React.FC<{ s: OpenShot; t: number }> = ({ s, t }) => {
  const d = s.to - s.from;
  const e = t - s.from;
  const p = clamp(e / d);
  const [sx, sy] = shake(t, 26 * (1 - easeOut(p)) + 4, `open${s.id}`);
  const rush = 1 - easeOut(clamp(e / 0.45));
  const [z0, z1] = s.zoom ?? [1.12, 1.42];
  const [b0, b1] = s.brightness ?? [1.05, 0.4];
  // the face's screen point on the cover (top clamped to 0 for a square on 9:16)
  const left = clamp(W / 2 - s.face[0] * H, W - H, 0);
  const face: [number, number] = [left + s.face[0] * H, clamp(H / 2 - s.face[1] * H, H - H, 0) + s.face[1] * H];
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `translate(${sx}px, ${sy}px) rotate(${lerp(5, 0, easeOut(p))}deg) scale(${lerp(z0, z1, easeOut(clamp(e / (d * 0.85))))})`,
          transformOrigin: `${face[0]}px ${face[1]}px`,
        }}
      >
        <ZoomEcho origin={face} amount={0.5 * rush}>
          <Cover src={s.plate} f={s.face} filter={`brightness(${lerp(b0, b1, easeIn(p))}) contrast(1.3)`} />
        </ZoomEcho>
        <SpeedLines t={t} color="#fff" opacity={0.55 * (1 - p) + 0.1} count={32} seed={`open${s.id}`} speed={4600} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#fff', opacity: 0.9 * Math.max(0, 1 - e / 0.14) }} />
    </AbsoluteFill>
  );
};

// ================================================================ strobe

export const Strobe: React.FC<{ s: StrobeShot; t: number }> = ({ s, t }) => {
  const e = t - s.from;
  const on = Math.floor(e * 15) % 2 === 0;
  const [sx, sy] = shake(t, 26, `strobe${s.id}`);
  const size = fit(s.word, 1000, 1100);
  return (
    <AbsoluteFill style={{ background: on ? C.ink : C.paper, overflow: 'hidden' }}>
      <Word text={s.word} size={size} x={540 + sx} y={960 + sy} scale={1 + 1.4 * easeIn(e / (s.to - s.from))} color={on ? C.red : C.ink} />
    </AbsoluteFill>
  );
};

// ================================================================ letters

const Spelling: React.FC<{ word: string; n: number; t: number; at: number }> = ({ word, n, t, at }) => {
  const pop = 1 - easeOut(clamp((t - at) / 0.1));
  return (
    <div style={{ position: 'absolute', left: 0, width: W, top: 1500, height: 132, background: C.ink, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {word.split('').map((ch, i) => (
        <span
          key={i}
          style={{
            fontFamily: ANTON,
            fontSize: Math.min(104, 900 / word.length / 0.5),
            lineHeight: 1,
            margin: '0 4px',
            color: i < n - 1 ? C.paper : i === n - 1 ? C.red : 'rgba(255,255,255,0.12)',
            display: 'inline-block',
            transform: i === n - 1 ? `scale(${1 + 0.8 * pop})` : undefined,
          }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
};

export const Letters: React.FC<{ s: LettersShot; t: number }> = ({ s, t }) => {
  const letters = s.word.replace(/\s+/g, '').split('');
  const i = Math.min(letters.length - 1, Math.max(0, lastHit(t, s.hits)));
  const look = s.looks[i % s.looks.length] ?? {};
  const fields: SlamFields = { y: look.cut ? 760 : 860, width: 900, max: 1700, color: C.paper, ...look, rows: [letters[i]] };
  return (
    <AbsoluteFill>
      <Slam s={fields} t={t} at={s.hits[i] ?? s.from} amp={0.8} seed={`letters${s.id}`} />
      {s.spell !== false && <Spelling word={letters.join('')} n={i + 1} t={t} at={s.hits[i] ?? s.from} />}
    </AbsoluteFill>
  );
};

// ================================================================ crack

export const Crack: React.FC<{ s: CrackShot; t: number }> = ({ s, t }) => {
  const e = t - s.from;
  const q = 1 - easeOut(clamp(e / 0.1));
  const [sx, sy] = shake(t, 8 + 24 * q, `crack${s.id}`);
  const size = fit(s.word, s.width ?? 1040);
  const y = s.y ?? 760;
  const gap = 4 + 40 * easeOut(clamp((t - s.crackAt) / 0.14));
  const rise = 1 - easeOut(clamp(e / 0.13));
  return (
    <AbsoluteFill style={{ background: s.ground, overflow: 'hidden', filter: e < IMPACT ? 'invert(1) contrast(2)' : undefined }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) rotate(${-6 * q}deg) scale(${1 + 0.1 * e + 0.06 * q})` }}>
        <SpeedLines t={t} color={C.ink} opacity={0.4} count={28} seed={`crack${s.id}`} speed={4200} />
        {s.echoes &&
          [1, 2].map(k => (
            <Word key={k} text={s.word} size={size} x={540 + (k % 2 ? 1 : -1) * e * 260} y={y - k * size * 0.84} stroke={s.color} strokeW={3} opacity={0.75 - 0.25 * k} />
          ))}
        <Cracked text={s.word} size={size} x={540} y={y} color={s.color} gap={gap} scale={1 + 0.6 * q} smearX={36 * q} />
        {s.cut && (
          <Frame
            src={s.cut.src}
            f={s.cut.f ?? [0.5, 0.5]}
            at={[s.cut.at[0], s.cut.at[1] + 320 * rise]}
            w={s.cut.w * (1 + 0.12 * rise)}
            filter={s.cut.filter ?? 'drop-shadow(0 30px 50px rgba(0,0,0,0.45)) contrast(1.2)'}
          />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#fff', opacity: 0.35 * Math.max(0, 1 - e / 0.07) }} />
    </AbsoluteFill>
  );
};

// ================================================================ burst

export const Burst: React.FC<{ s: BurstShot; t: number }> = ({ s, t }) => {
  const e = t - s.from;
  const p = clamp(e / (s.to - s.from));
  const dive = easeIn(clamp((t - s.diveAt) / Math.max(0.2, s.to - 0.07 - s.diveAt)));
  const [sx, sy] = shake(t, 6 + 16 * p + 20 * dive, `burst${s.id}`);
  const m = s.cut.at;
  const cam = 1 + 0.22 * easeOut(clamp(e / 0.42)) + 7 * dive;
  const letters = s.word.replace(/\s+/g, '').split('');
  const dark = clamp((t - (s.to - 0.23)) / 0.14);
  return (
    <AbsoluteFill style={{ background: s.ground ?? C.ink, overflow: 'hidden', filter: e < IMPACT ? 'invert(1) contrast(2)' : undefined }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${cam})`, transformOrigin: `${m[0]}px ${m[1]}px` }}>
        <ZoomEcho origin={m} amount={0.06 + 0.45 * dive}>
          <AbsoluteFill style={{ background: `radial-gradient(circle at ${m[0]}px ${m[1]}px, ${s.glow ?? 'rgba(224,43,62,0.55)'} 0%, rgba(0,0,0,0) 45%)` }} />
          <Frame src={s.cut.src} f={s.cut.f ?? [0.5, 0.5]} at={m} w={s.cut.w} filter={s.cut.filter ?? 'contrast(1.15)'} />
        </ZoomEcho>
        <SpeedLines t={t} color="#fff" opacity={0.25 + 0.35 * p} count={30} seed={`burst${s.id}`} speed={5200} />
      </AbsoluteFill>
      {letters.map((ch, i) => {
        const le = t - (s.from + i * 0.05);
        if (le < 0) return null;
        const lp = clamp(le / 0.5);
        const ang = ((200 + (random(`bA${s.id}${i}`) - 0.5) * 110) * Math.PI) / 180;
        const dist = Math.pow(lp, 1.6) * 760;
        return (
          <Word
            key={i}
            text={ch}
            size={240 * (0.12 + 4.2 * lp * lp)}
            x={m[0] + Math.cos(ang) * dist + (540 - m[0]) * lp}
            y={m[1] + Math.sin(ang) * dist * 0.8 - 120 * lp}
            rot={(random(`bR${s.id}${i}`) - 0.5) * 50 * lp}
            smearX={18 * lp}
            opacity={lp < 0.8 ? 1 : (1 - lp) / 0.2}
            color={i % 2 ? C.red : C.paper}
            style={{ textShadow: '6px 0 0 rgba(255,0,70,0.5), -6px 0 0 rgba(0,210,255,0.5)' }}
          />
        );
      })}
      <AbsoluteFill style={{ background: '#000', opacity: dark }} />
    </AbsoluteFill>
  );
};

// ================================================================ faces

export const Faces: React.FC<{ s: FacesShot; t: number }> = ({ s, t }) => {
  const i = Math.max(0, lastHit(t, s.faces.map(f => f.at)));
  const f = s.faces[i];
  const e = t - f.at;
  const q = 1 - easeOut(clamp(e / 0.12));
  const [sx, sy] = shake(t, 6 + 22 * q, `faces${s.id}`);
  const size = fit(s.word, 1800);
  const span = 1800 + size * 0.2;
  const dir = f.side === 'right' ? 1 : -1;
  const run = ((((t - s.from) * 1400 * dir) % span) + span) % span - span;
  return (
    <AbsoluteFill style={{ background: f.ground, overflow: 'hidden', filter: e < IMPACT ? impactFilter : undefined }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) rotate(${(i % 2 ? 1 : -1) * 5 * q}deg) scale(${1 + 0.06 * e + 0.06 * q})` }}>
        <SpeedLines t={t} color={f.lines ?? C.ink} opacity={0.3 + 0.3 * q} count={26} seed={`f${s.id}${i}`} speed={3600} />
        <div style={{ position: 'absolute', left: f.side === 'right' ? 900 : 180, top: 960, width: 0, height: 0, transform: `rotate(${dir * -90}deg)` }}>
          {[0, 1, 2].map(c => (
            <Word key={c} text={s.word} size={size} x={run + c * span - 900} y={0} anchor="left" color={f.color} smearX={20 * q} />
          ))}
        </div>
        <Frame src={f.cut} f={f.f} at={[540, 1060 + 240 * q]} w={1750 * (1 + 0.16 * q)} filter="drop-shadow(0 30px 50px rgba(0,0,0,0.45)) contrast(1.15)" />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#fff', opacity: 0.4 * Math.max(0, 1 - e / 0.07) }} />
    </AbsoluteFill>
  );
};

// ================================================================ rise

export const Rise: React.FC<{ s: RiseShot; t: number }> = ({ s, t }) => {
  const blackAt = s.blackAt ?? s.to - 0.2;
  const p = clamp((t - s.from) / (blackAt - s.from));
  const kk = kick(t, s.roll, 0.1);
  const black = t >= blackAt;
  const [sx, sy] = shake(t, 2 + 10 * p + 6 * kk, `rise${s.id}`);
  const fistW = lerp(s.cut.w, s.cut.w * 1.27, easeIn(p));
  const fistY = lerp(1700, s.cut.at[1], easeOut(p));
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      {!black && (
        <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
          <AbsoluteFill
            style={{ background: `radial-gradient(circle at 50% ${(fistY / H) * 100 - 4}%, rgba(255,255,255,${0.12 + 0.35 * p + 0.2 * kk}) 0%, rgba(255,255,255,0) 38%)` }}
          />
          <Word text={s.big} size={fit(s.big, 980)} x={540} y={900} stroke={`rgba(255,255,255,${0.15 + 0.45 * p})`} strokeW={3} scale={lerp(0.92, 1.04, p)} />
          <Frame src={s.cut.src} f={s.cut.f ?? [0.5, 0.15]} at={[s.cut.at[0], fistY]} w={fistW} filter={`contrast(1.2) brightness(${0.85 + 0.3 * kk})`} />
          {s.small && t >= (s.smallAt ?? s.from) && (
            <Word text={s.small} size={190} x={540} y={330} color={C.paper} smearX={entry(t - (s.smallAt ?? s.from))[1]} dx={entry(t - (s.smallAt ?? s.from))[0]} />
          )}
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: '#fff', opacity: black ? 0 : kk * (0.1 + 0.3 * p) }} />
    </AbsoluteFill>
  );
};

// ================================================================ flash

export const Flash: React.FC<{ s: FlashShot; t: number }> = ({ s, t }) => {
  const e = t - s.from;
  const gp = clamp(e / (s.to - s.from));
  const n = Math.max(0, Math.floor(e * 15));
  const [sx, sy] = shake(t, 8 + 20 * gp, `flash${s.id}`);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${sx * 2}px, ${sy * 2}px) scale(${1 + 0.14 * easeIn(gp)})` }}>
        <Cover src={s.plates[n % s.plates.length]} f={[0.47, 0.42]} zoom={1.05 + 0.12 * gp} />
        <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 80%)' }} />
        <Cracked text={s.word} size={fit(s.word, 860)} x={540} y={s.y ?? 1380} color={n % 2 ? C.red : C.paper} gap={8 + 70 * easeIn(gp)} />
      </AbsoluteFill>
      {s.white !== false && <AbsoluteFill style={{ background: '#fff', opacity: clamp((t - (s.to - 0.18)) / 0.18) }} />}
    </AbsoluteFill>
  );
};

// ================================================================ poster (the end, and the loop's warp)

export const Poster: React.FC<{ s: PosterShot; t: number }> = ({ s, t }) => {
  const hits = s.hits ?? [s.from, ...s.phrases.map(p => p.at), s.final.at, ...(s.final.crackAt ? [s.final.crackAt] : [])];
  const kk = kick(t, hits, 0.12);
  const crackAt = s.final.crackAt ?? Infinity;
  const big = kick(t, [crackAt], 0.22);
  const [sx, sy] = shake(t, 3 + 10 * kk + 24 * big, `poster${s.id}`);
  const plateW = s.plateW ?? 1300;
  const plateLeft = (W - plateW) / 2;
  const rise = 1 - easeOut(clamp((t - s.from) / 0.25));
  const plateTop = (s.plateTop ?? 700) + 260 * rise - 30 * kick(t, [s.final.at, crackAt], 0.15);
  const push = 1 + 0.05 * easeOut(clamp((t - s.from) / (s.to - s.from))) + 0.03 * kk;
  const final = t >= s.final.at;
  const k = lastHit(t, s.phrases.map(p => p.at));
  const ph = s.phrases[Math.max(0, k)];
  const pe = easeOut(clamp((t - (ph?.at ?? s.from)) / SLAM));
  const fp = easeOut(clamp((t - s.final.at) / SLAM));
  const crack = 4 + 40 * easeOut(clamp((t - crackAt) / 0.2));
  const warp = s.warp ? easeIn(clamp((t - s.warp.at) / (s.to - 0.03 - s.warp.at))) : 0;
  const wf = s.warp?.face ?? [0.4, 0.15];
  const faceX = 540 + (plateLeft + wf[0] * plateW - 540) * push;
  const faceY = 768 + (plateTop + wf[1] * plateW - 768) * push;
  const burn = s.warp ? clamp((t - (s.to - 0.3)) / 0.27) : 0;
  return (
    <AbsoluteFill style={{ background: C.night, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${1 + 5 * warp}) rotate(${-6 * warp}deg)`, transformOrigin: `${faceX}px ${faceY}px` }}>
        <ZoomEcho origin={[faceX, faceY]} amount={0.55 * warp}>
          <AbsoluteFill style={{ transform: `translate(${sx * (1 + 2 * warp)}px, ${sy * (1 + 2 * warp)}px) scale(${push})`, transformOrigin: '50% 40%' }}>
            <Frame
              src={s.plate}
              f={[0, 0]}
              at={[plateLeft, plateTop]}
              w={plateW}
              style={{ maskImage: 'linear-gradient(to bottom, transparent 0px, black 320px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 320px)' }}
            />
            <SpeedLines t={t} color="#d6ebff" opacity={0.15 + 0.3 * kk} count={26} seed={`poster${s.id}`} speed={3600} />
            {!final && ph && (
              <Word
                text={ph.text}
                size={fit(ph.text, 1020, 360)}
                x={540}
                y={430}
                dx={(k % 2 ? -1 : 1) * 160 * (1 - pe)}
                scale={1 + 0.65 * (1 - pe)}
                smearX={36 * (1 - pe)}
                color={ph.color ?? C.paper}
                style={{ textShadow: `${10 * (1 - pe) + 3}px 0 0 rgba(255,0,70,0.5), ${-10 * (1 - pe) - 3}px 0 0 rgba(0,210,255,0.5)` }}
              />
            )}
            {final && (
              <>
                <Word text={s.final.top} size={fit(s.final.top, 1040)} x={540} y={250} color={C.red} scale={1 + 0.3 * (1 - fp)} smearX={20 * big} />
                <Cracked text={s.final.bottom} size={fit(s.final.bottom, 1000)} x={540} y={560} color={C.paper} gap={crack} scale={1 + 0.5 * (1 - fp)} smearX={30 * (1 - fp)} />
              </>
            )}
            {s.cutout && <Frame src={s.cutout} f={[0, 0]} at={[plateLeft, plateTop]} w={plateW} />}
          </AbsoluteFill>
        </ZoomEcho>
      </AbsoluteFill>
      {s.warp && <SpeedLines t={t} color="#fff" opacity={0.6 * warp} count={34} seed={`warp${s.id}`} speed={6000} />}
      <AbsoluteFill
        style={{ background: '#fff', opacity: Math.max(0.8 * Math.max(kick(t, [s.from, s.final.at], 0.06), kick(t, [crackAt], 0.08)), 0.9 * burn) }}
      />
    </AbsoluteFill>
  );
};

