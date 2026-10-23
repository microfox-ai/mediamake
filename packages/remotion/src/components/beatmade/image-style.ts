import type React from 'react';

export const IMAGE_FITS = ['cover', 'contain', 'fill', 'none', 'scale-down'] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];

export const IMAGE_FILTERS = [
  'none',
  'blur',
  'brightness',
  'contrast',
  'saturate',
  'grayscale',
  'sepia',
  'hue-rotate',
  'invert',
  'distorted',
  'vintage',
  'dramatic',
  'soft',
  'sharp',
] as const;
export type ImageFilter = (typeof IMAGE_FILTERS)[number];

export const IMAGE_BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const;
export type ImageBlendMode = (typeof IMAGE_BLEND_MODES)[number];

export const IMAGE_LOOK_VARS = {
  fit: '--mm-image-fit',
  filter: '--mm-image-filter',
  blend: '--mm-image-blend',
  tint: '--mm-image-tint',
  opacity: '--mm-image-opacity',
} as const;

/** Per-function filter amounts. Present when the video section stores a look. */
export const FILTER_ADJUST_VARS = {
  blur: '--mm-adj-blur',
  brightness: '--mm-adj-brightness',
  contrast: '--mm-adj-contrast',
  saturate: '--mm-adj-saturate',
  grayscale: '--mm-adj-grayscale',
  sepia: '--mm-adj-sepia',
  hueRotate: '--mm-adj-hue',
  invert: '--mm-adj-invert',
} as const;

/** CSS / editor keys the Image section owns. */
export const IMAGE_LOOK_KEYS = new Set<string>([
  'objectFit',
  'objectPosition',
  'filter',
  'mixBlendMode',
  'opacity',
  ...Object.values(IMAGE_LOOK_VARS),
  ...Object.values(FILTER_ADJUST_VARS),
]);

export const BLOCK_STYLE_KEYS = new Set<string>([
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'translate',
  'rotate',
  'scale',
  'transform',
  'transformOrigin',
  'overflow',
  'display',
  'flexDirection',
  'alignItems',
  'justifyContent',
  'alignSelf',
  'justifySelf',
  'placeSelf',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'backgroundColor',
  'backgroundImage',
  'backgroundPosition',
  'backgroundSize',
  'backgroundRepeat',
  'borderWidth',
  'borderStyle',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'backdropFilter',
]);

export function isImageFit(value: unknown): value is ImageFit {
  return typeof value === 'string' && (IMAGE_FITS as readonly string[]).includes(value);
}

export function isImageFilter(value: unknown): value is ImageFilter {
  return typeof value === 'string' && (IMAGE_FILTERS as readonly string[]).includes(value);
}

export function isImageBlendMode(value: unknown): value is ImageBlendMode {
  return typeof value === 'string' && (IMAGE_BLEND_MODES as readonly string[]).includes(value);
}

export function filterCss(filter: string | undefined): string | undefined {
  switch (filter) {
    case 'blur':
      return 'blur(2px)';
    case 'brightness':
      return 'brightness(1.2)';
    case 'contrast':
      return 'contrast(1.3)';
    case 'saturate':
      return 'saturate(1.5)';
    case 'grayscale':
      return 'grayscale(100%)';
    case 'sepia':
      return 'sepia(100%)';
    case 'hue-rotate':
      return 'hue-rotate(180deg)';
    case 'invert':
      return 'invert(100%)';
    case 'distorted':
      return 'contrast(1.5) saturate(1.3) hue-rotate(15deg)';
    case 'vintage':
      return 'sepia(50%) contrast(1.2) brightness(0.9) saturate(1.1)';
    case 'dramatic':
      return 'contrast(1.4) saturate(1.3) brightness(0.8)';
    case 'soft':
      return 'blur(0.5px) brightness(1.1) contrast(0.9)';
    case 'sharp':
      return 'contrast(1.2) saturate(1.1) brightness(1.05)';
    case 'none':
    default:
      return undefined;
  }
}

const parseCssColor = (
  input: string,
): { r: number; g: number; b: number; a: number } | null => {
  const s = input.trim();
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (!rgb) return null;
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: rgb[4] !== undefined ? Number(rgb[4]) : 1,
  };
};

export function colorTintFilter(colorTint: string | undefined): string | undefined {
  if (!colorTint || !colorTint.trim()) return undefined;
  const parsed = parseCssColor(colorTint);
  if (!parsed) return undefined;
  const max = Math.max(parsed.r, parsed.g, parsed.b);
  const min = Math.min(parsed.r, parsed.g, parsed.b);
  let hue = 0;
  const d = max - min;
  if (d !== 0) {
    if (max === parsed.r) hue = ((parsed.g - parsed.b) / d) % 6;
    else if (max === parsed.g) hue = (parsed.b - parsed.r) / d + 2;
    else hue = (parsed.r - parsed.g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const amount = Math.min(1, Math.max(0.2, parsed.a < 1 ? parsed.a : 0.65));
  const rotate = Math.round(hue - 40);
  return `sepia(${amount}) hue-rotate(${rotate}deg) saturate(${(1 + amount).toFixed(2)})`;
}

export function readImageLook(style: Record<string, unknown> | undefined): {
  fit: ImageFit;
  filter: ImageFilter;
  blendMode: ImageBlendMode;
  opacity: number;
  colorTint?: string;
} {
  const source = style && typeof style === 'object' ? style : {};
  const markedFit = source[IMAGE_LOOK_VARS.fit];
  const cssFit = source.objectFit;
  const fit: ImageFit = isImageFit(markedFit)
    ? markedFit
    : isImageFit(cssFit)
      ? cssFit
      : 'cover';
  const markedFilter = source[IMAGE_LOOK_VARS.filter];
  const filter: ImageFilter = isImageFilter(markedFilter) ? markedFilter : 'none';
  const markedBlend = source[IMAGE_LOOK_VARS.blend];
  const cssBlend = source.mixBlendMode;
  const blendMode: ImageBlendMode = isImageBlendMode(markedBlend)
    ? markedBlend
    : isImageBlendMode(cssBlend)
      ? cssBlend
      : 'normal';
  const markedOpacity = source[IMAGE_LOOK_VARS.opacity];
  const opacity =
    typeof markedOpacity === 'number' && Number.isFinite(markedOpacity)
      ? markedOpacity
      : typeof source.opacity === 'number' && Number.isFinite(source.opacity)
        ? source.opacity
        : 1;
  const tint = source[IMAGE_LOOK_VARS.tint];
  return {
    fit,
    filter,
    blendMode,
    opacity,
    colorTint: typeof tint === 'string' && tint.trim() ? tint : undefined,
  };
}

type FilterAdjust = {
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  invert: number;
};

const ADJUST_DEFAULT: FilterAdjust = {
  blur: 0,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
};

function adjustNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatAdjustNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** CSS `filter` for manually tuned ranges. Preset names keep `filterCss`. */
export function adjustmentsToCss(adjust: FilterAdjust): string | undefined {
  const parts: string[] = [];
  if (Math.abs(adjust.blur) > 0.001) parts.push(`blur(${formatAdjustNumber(adjust.blur)}px)`);
  if (Math.abs(adjust.brightness - 1) > 0.001) {
    parts.push(`brightness(${formatAdjustNumber(adjust.brightness)})`);
  }
  if (Math.abs(adjust.contrast - 1) > 0.001) {
    parts.push(`contrast(${formatAdjustNumber(adjust.contrast)})`);
  }
  if (Math.abs(adjust.saturate - 1) > 0.001) {
    parts.push(`saturate(${formatAdjustNumber(adjust.saturate)})`);
  }
  if (Math.abs(adjust.grayscale) > 0.001) {
    parts.push(`grayscale(${Math.round(adjust.grayscale * 100)}%)`);
  }
  if (Math.abs(adjust.sepia) > 0.001) parts.push(`sepia(${Math.round(adjust.sepia * 100)}%)`);
  if (Math.abs(adjust.hueRotate) > 0.001) {
    parts.push(`hue-rotate(${formatAdjustNumber(adjust.hueRotate)}deg)`);
  }
  if (Math.abs(adjust.invert) > 0.001) parts.push(`invert(${Math.round(adjust.invert * 100)}%)`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function readFilterAdjust(style: Record<string, unknown> | undefined): FilterAdjust | undefined {
  const source = style ?? {};
  const present = (Object.values(FILTER_ADJUST_VARS) as string[]).some(
    (key) => typeof source[key] === 'number',
  );
  if (!present) return undefined;
  return {
    blur: adjustNumber(source[FILTER_ADJUST_VARS.blur], ADJUST_DEFAULT.blur),
    brightness: adjustNumber(source[FILTER_ADJUST_VARS.brightness], ADJUST_DEFAULT.brightness),
    contrast: adjustNumber(source[FILTER_ADJUST_VARS.contrast], ADJUST_DEFAULT.contrast),
    saturate: adjustNumber(source[FILTER_ADJUST_VARS.saturate], ADJUST_DEFAULT.saturate),
    grayscale: adjustNumber(source[FILTER_ADJUST_VARS.grayscale], ADJUST_DEFAULT.grayscale),
    sepia: adjustNumber(source[FILTER_ADJUST_VARS.sepia], ADJUST_DEFAULT.sepia),
    hueRotate: adjustNumber(source[FILTER_ADJUST_VARS.hueRotate], ADJUST_DEFAULT.hueRotate),
    invert: adjustNumber(source[FILTER_ADJUST_VARS.invert], ADJUST_DEFAULT.invert),
  };
}

/**
 * Turns Image-section keys on `style` into CSS for the <img>.
 * Position / block keys are left on the wrapper.
 */
export function applyImageLook(
  style: React.CSSProperties | undefined,
): React.CSSProperties {
  const source = (style ?? {}) as Record<string, unknown>;
  const look = readImageLook(source);
  const parts: string[] = [];
  let skipExisting = false;
  if (source[IMAGE_LOOK_VARS.filter] === 'custom') {
    const custom = adjustmentsToCss(readFilterAdjust(source) ?? ADJUST_DEFAULT);
    if (custom) {
      parts.push(custom);
      skipExisting = true;
    }
  } else {
    const preset = filterCss(look.filter);
    if (preset) parts.push(preset);
  }
  const tint = colorTintFilter(look.colorTint);
  if (tint) parts.push(tint);
  const existing =
    !skipExisting && style && typeof style.filter === 'string' && style.filter !== 'none'
      ? style.filter
      : '';
  const out: React.CSSProperties = {
    objectFit: look.fit,
    mixBlendMode: look.blendMode === 'normal' ? undefined : look.blendMode,
    opacity: look.opacity === 1 ? undefined : look.opacity,
  };
  if (parts.length > 0) {
    out.filter = existing ? `${existing} ${parts.join(' ')}` : parts.join(' ');
  } else if (existing) {
    out.filter = existing;
  }
  return out;
}

export function splitImageBeatStyle(style?: React.CSSProperties): {
  block: React.CSSProperties;
  image: React.CSSProperties;
} {
  const block: React.CSSProperties = {};
  const image: React.CSSProperties = {};
  if (!style) return { block, image };
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue;
    if (IMAGE_LOOK_KEYS.has(key)) {
      (image as Record<string, unknown>)[key] = value;
    } else if (BLOCK_STYLE_KEYS.has(key) || key.startsWith('--mm-')) {
      (block as Record<string, unknown>)[key] = value;
    } else {
      (image as Record<string, unknown>)[key] = value;
    }
  }
  return { block, image };
}
