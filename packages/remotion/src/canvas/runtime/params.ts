import { CanvasKeyframe } from '../types';

/**
 * Keyframe interpolation for op params: numbers, unit strings ('12px',
 * '45deg', '30%'), and hex/rgb(a) colors. Same keyframe shape as the
 * UniversalEffect ranges so authors reuse one mental model.
 */

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const parseHex = (hex: string): RGBA | null => {
  let h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(h))
    return null;
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
};

const parseRgb = (str: string): RGBA | null => {
  const m = str.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
  );
  if (!m) return null;
  return {
    r: Math.min(255, parseInt(m[1], 10)),
    g: Math.min(255, parseInt(m[2], 10)),
    b: Math.min(255, parseInt(m[3], 10)),
    a: m[4] !== undefined ? Math.min(1, parseFloat(m[4])) : 1,
  };
};

const parseColor = (val: string): RGBA | null => {
  const t = val.trim();
  if (t.startsWith('#')) return parseHex(t);
  if (t.toLowerCase().startsWith('rgb')) return parseRgb(t);
  return null;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpColor = (c1: RGBA, c2: RGBA, t: number): string =>
  `rgba(${Math.round(lerp(c1.r, c2.r, t))}, ${Math.round(
    lerp(c1.g, c2.g, t)
  )}, ${Math.round(lerp(c1.b, c2.b, t))}, ${lerp(c1.a, c2.a, t)})`;

const UNIT_RE = /^(-?[\d.]+)([a-z%]*)$/i;

const lerpValue = (from: any, to: any, t: number): any => {
  if (typeof from === 'number' && typeof to === 'number') {
    return lerp(from, to, t);
  }
  if (typeof from === 'string' && typeof to === 'string') {
    const c1 = parseColor(from);
    const c2 = parseColor(to);
    if (c1 && c2) return lerpColor(c1, c2, t);

    const m1 = from.match(UNIT_RE);
    const m2 = to.match(UNIT_RE);
    if (m1 && m2 && m1[2] === m2[2]) {
      const v = lerp(parseFloat(m1[1]), parseFloat(m2[1]), t);
      return m1[2] ? `${v}${m1[2]}` : v;
    }
  }
  // Non-interpolatable values switch at the keyframe boundary.
  return t < 1 ? from : to;
};

/** Evaluate one key's keyframes at `progress` (0..1). */
export const evaluateKeyframes = (
  frames: CanvasKeyframe[],
  progress: number
): any => {
  const sorted = [...frames].sort((a, b) => a.prog - b.prog);
  if (sorted.length === 0) return undefined;
  if (sorted.length === 1) return sorted[0].val;

  const p = Math.max(0, Math.min(1, progress));
  if (p <= sorted[0].prog) return sorted[0].val;
  if (p >= sorted[sorted.length - 1].prog)
    return sorted[sorted.length - 1].val;

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (p >= cur.prog && p <= next.prog) {
      const span = next.prog - cur.prog;
      const local = span <= 0 ? 1 : (p - cur.prog) / span;
      return lerpValue(cur.val, next.val, local);
    }
  }
  return sorted[0].val;
};

/**
 * Merge animated keyframe values onto static params for the current
 * progress. Returns a new object; the parsed base params are never mutated.
 */
export const resolveParams = <P extends Record<string, any>>(
  base: P,
  ranges: CanvasKeyframe[] | undefined,
  progress: number
): P => {
  if (!ranges || ranges.length === 0) return base;

  const byKey = new Map<string, CanvasKeyframe[]>();
  for (const kf of ranges) {
    const list = byKey.get(kf.key);
    if (list) list.push(kf);
    else byKey.set(kf.key, [kf]);
  }

  const out: Record<string, any> = { ...base };
  byKey.forEach((frames, key) => {
    const val = evaluateKeyframes(frames, progress);
    if (val !== undefined) out[key] = val;
  });
  return out as P;
};
