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

const MM = {
  fit: '--mm-image-fit',
  filter: '--mm-image-filter',
  blend: '--mm-image-blend',
  tint: '--mm-image-tint',
  opacity: '--mm-image-opacity',
} as const;

/** CSS keys the Image section owns. Schema children with these keys are not rendered twice. */
export const IMAGE_STYLE_KEYS = new Set<string>([
  'objectFit',
  'objectPosition',
  'filter',
  'mixBlendMode',
  'opacity',
  ...Object.values(MM),
]);

export type ImageLookDraft = {
  fit: ImageFit;
  filter: ImageFilter;
  blendMode: ImageBlendMode;
  opacity: number;
  colorTint?: string;
};

function isFit(value: unknown): value is ImageFit {
  return typeof value === 'string' && (IMAGE_FITS as readonly string[]).includes(value);
}

function isFilter(value: unknown): value is ImageFilter {
  return typeof value === 'string' && (IMAGE_FILTERS as readonly string[]).includes(value);
}

function isBlend(value: unknown): value is ImageBlendMode {
  return typeof value === 'string' && (IMAGE_BLEND_MODES as readonly string[]).includes(value);
}

export function readImageLook(style: Record<string, unknown> | undefined): ImageLookDraft {
  const source = style && typeof style === 'object' ? style : {};
  const markedOpacity = source[MM.opacity];
  const opacity =
    typeof markedOpacity === 'number' && Number.isFinite(markedOpacity)
      ? markedOpacity
      : typeof source.opacity === 'number' && Number.isFinite(source.opacity)
        ? source.opacity
        : 1;
  const markedFit = source[MM.fit];
  const objectFit = source.objectFit;
  const markedFilter = source[MM.filter];
  const markedBlend = source[MM.blend];
  const mixBlendMode = source.mixBlendMode;
  const tint = source[MM.tint];
  return {
    fit: isFit(markedFit) ? markedFit : isFit(objectFit) ? objectFit : 'cover',
    filter: isFilter(markedFilter) ? markedFilter : 'none',
    blendMode: isBlend(markedBlend) ? markedBlend : isBlend(mixBlendMode) ? mixBlendMode : 'normal',
    opacity,
    colorTint: typeof tint === 'string' && tint.trim() ? tint : undefined,
  };
}

/**
 * Write Image-section values onto a CSS style object.
 * Position / block keys are left untouched.
 */
export function commitImageLook(
  style: Record<string, unknown> | undefined,
  draft: ImageLookDraft,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(style && typeof style === 'object' ? style : {}) };
  for (const key of IMAGE_STYLE_KEYS) delete next[key];

  next.objectFit = draft.fit;
  next[MM.fit] = draft.fit;

  if (draft.filter && draft.filter !== 'none') next[MM.filter] = draft.filter;
  if (draft.blendMode && draft.blendMode !== 'normal') {
    next.mixBlendMode = draft.blendMode;
    next[MM.blend] = draft.blendMode;
  }
  if (draft.opacity !== 1 && Number.isFinite(draft.opacity)) {
    next.opacity = draft.opacity;
    next[MM.opacity] = draft.opacity;
  }
  if (draft.colorTint && draft.colorTint.trim()) next[MM.tint] = draft.colorTint;

  return next;
}

export function readImageLookSafe(style: Record<string, unknown> | undefined): ImageLookDraft {
  return readImageLook(style);
}
