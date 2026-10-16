import type React from 'react';

/**
 * Special Effects live on a CSS style object as `--mm-fx-*` variables.
 * Keep the names in sync with the editor's `special-effects.ts`.
 * `textStyle` and `blockStyle` both surface this section; renderers call
 * `mergeSpecialEffects` so the variables become real CSS.
 */
export const FX = {
  opacity: '--mm-fx-opacity',
  blur: '--mm-fx-blur',
  brightness: '--mm-fx-brightness',
  contrast: '--mm-fx-contrast',
  saturate: '--mm-fx-saturate',
  hue: '--mm-fx-hue',
  grayscale: '--mm-fx-grayscale',
  sepia: '--mm-fx-sepia',
  invert: '--mm-fx-invert',
  blend: '--mm-fx-blend',
  shadowX: '--mm-fx-shadow-x',
  shadowY: '--mm-fx-shadow-y',
  shadowBlur: '--mm-fx-shadow-blur',
  shadowColor: '--mm-fx-shadow-color',
  glowBlur: '--mm-fx-glow-blur',
  glowColor: '--mm-fx-glow-color',
  backdropBlur: '--mm-fx-backdrop-blur',
} as const;

const SHADOW_KEYS = [FX.shadowX, FX.shadowY, FX.shadowBlur, FX.shadowColor] as const;

const round = (n: number) => Math.round(n * 1000) / 1000;

function readNumber(style: Record<string, unknown>, key: string): number | undefined {
  if (!(key in style) || style[key] == null || style[key] === '') return undefined;
  const n = typeof style[key] === 'number' ? style[key] : Number(style[key]);
  return Number.isFinite(n) ? n : undefined;
}

/** CSS contributed by Special Effects only. Other style keys are left out. */
export function specialEffectCss(style: React.CSSProperties | undefined): React.CSSProperties {
  const source = (style ?? {}) as Record<string, unknown>;
  const parts: string[] = [];

  const blur = readNumber(source, FX.blur);
  if (blur && blur > 0) parts.push(`blur(${round(blur)}px)`);

  const brightness = readNumber(source, FX.brightness);
  if (brightness !== undefined && brightness !== 100) parts.push(`brightness(${round(brightness / 100)})`);

  const contrast = readNumber(source, FX.contrast);
  if (contrast !== undefined && contrast !== 100) parts.push(`contrast(${round(contrast / 100)})`);

  const saturate = readNumber(source, FX.saturate);
  if (saturate !== undefined && saturate !== 100) {
    parts.push(`saturate(${round(Math.max(0, saturate) / 100)})`);
  }

  const hue = readNumber(source, FX.hue);
  if (hue) parts.push(`hue-rotate(${round(hue)}deg)`);

  const grayscale = readNumber(source, FX.grayscale);
  if (grayscale) parts.push(`grayscale(${round(grayscale)}%)`);

  const sepia = readNumber(source, FX.sepia);
  if (sepia) parts.push(`sepia(${round(sepia)}%)`);

  const invert = readNumber(source, FX.invert);
  if (invert) parts.push(`invert(${round(invert)}%)`);

  if (SHADOW_KEYS.some((key) => key in source && source[key] != null && source[key] !== '')) {
    const x = readNumber(source, FX.shadowX) ?? 0;
    const y = readNumber(source, FX.shadowY) ?? 0;
    const shadowBlur = readNumber(source, FX.shadowBlur) ?? 0;
    const shadowColor = source[FX.shadowColor];
    const color =
      typeof shadowColor === 'string' && shadowColor.trim()
        ? shadowColor.trim()
        : 'rgba(0,0,0,0.45)';
    parts.push(`drop-shadow(${round(x)}px ${round(y)}px ${round(shadowBlur)}px ${color})`);
  }

  const glowBlur = readNumber(source, FX.glowBlur);
  const glowColorRaw = source[FX.glowColor];
  const glowColor = typeof glowColorRaw === 'string' ? glowColorRaw.trim() : '';
  if ((glowBlur !== undefined && glowBlur > 0) || glowColor) {
    parts.push(`drop-shadow(0 0 ${round(glowBlur ?? 0)}px ${glowColor || '#ffffff'})`);
  }

  const out: React.CSSProperties = {};
  if (parts.length > 0) out.filter = parts.join(' ');

  const opacity = readNumber(source, FX.opacity);
  if (opacity !== undefined && opacity !== 1) {
    out.opacity = Math.max(0, Math.min(1, opacity));
  }

  const blend = source[FX.blend];
  if (typeof blend === 'string' && blend.trim() && blend !== 'normal') {
    out.mixBlendMode = blend as React.CSSProperties['mixBlendMode'];
  }

  const backdrop = readNumber(source, FX.backdropBlur);
  if (backdrop && backdrop > 0) out.backdropFilter = `blur(${round(backdrop)}px)`;

  return out;
}

/**
 * Fold Special Effects onto a style object.
 * Existing `filter` is kept and the effect filter is appended.
 * Existing `opacity` is multiplied by the effect opacity.
 */
export function mergeSpecialEffects(style: React.CSSProperties | undefined): React.CSSProperties {
  const base: React.CSSProperties = { ...(style ?? {}) };
  const fx = specialEffectCss(style);
  if (fx.filter) {
    const existing = typeof base.filter === 'string' && base.filter !== 'none' ? base.filter : '';
    base.filter = existing ? `${existing} ${fx.filter}` : fx.filter;
  }
  if (typeof fx.opacity === 'number') {
    const current = typeof base.opacity === 'number' && Number.isFinite(base.opacity) ? base.opacity : 1;
    base.opacity = Math.max(0, Math.min(1, current * fx.opacity));
  }
  if (fx.mixBlendMode) base.mixBlendMode = fx.mixBlendMode;
  if (fx.backdropFilter) {
    const existing = typeof base.backdropFilter === 'string' ? base.backdropFilter : '';
    base.backdropFilter = existing ? `${existing} ${fx.backdropFilter}` : fx.backdropFilter;
  }
  const blockFilter = blockFilterParts(base as Record<string, unknown>);
  if (blockFilter) {
    const existing = typeof base.filter === 'string' && base.filter !== 'none' ? base.filter : '';
    if (!existing.includes(blockFilter)) {
      base.filter = existing ? `${existing} ${blockFilter}` : blockFilter;
    }
  }
  return base;
}

/** Layer blur and block-fill adjustments stored beside the real CSS. */
function blockFilterParts(style: Record<string, unknown>): string {
  const parts: string[] = [];
  const blur = readNumber(style, '--mm-block-layer-blur');
  if (blur && blur > 0) parts.push(`blur(${round(blur)}px)`);
  const read = (key: string) => readNumber(style, key) ?? 0;
  const exposure = read('--mm-block-fill-exposure');
  const contrast = read('--mm-block-fill-contrast');
  const saturation = read('--mm-block-fill-saturation');
  const temperature = read('--mm-block-fill-temperature');
  const tint = read('--mm-block-fill-tint');
  if (exposure) parts.push(`brightness(${(1 + exposure / 100).toFixed(3)})`);
  if (contrast) parts.push(`contrast(${(1 + contrast / 100).toFixed(3)})`);
  if (saturation) parts.push(`saturate(${Math.max(0, 1 + saturation / 100).toFixed(3)})`);
  if (temperature > 0) {
    const t = temperature / 100;
    parts.push(`sepia(${(t * 0.45).toFixed(3)}) saturate(${(1 + t * 0.35).toFixed(3)})`);
  } else if (temperature < 0) {
    const t = -temperature / 100;
    parts.push(`hue-rotate(${(t * 18).toFixed(2)}deg) saturate(${(1 + t * 0.2).toFixed(3)})`);
  }
  if (tint) parts.push(`hue-rotate(${(tint * 1.8).toFixed(2)}deg)`);
  return parts.join(' ');
}
