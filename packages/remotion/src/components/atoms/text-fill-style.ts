import type React from 'react';

/**
 * Turns editor text-fill CSS variables into `opacity` and `filter`.
 * Keep in sync with `textFillEffectStyle` in the editor's text-fill.ts.
 */
export function applyTextFillStyle(style: React.CSSProperties | undefined): React.CSSProperties {
  if (!style) return {};
  const record = style as Record<string, unknown>;
  const read = (key: string): number | undefined => {
    if (!(key in record) || record[key] == null || record[key] === '') return undefined;
    const n = Number(record[key]);
    return Number.isFinite(n) ? n : undefined;
  };
  const out: React.CSSProperties = {};
  const fillOpacity = read('--text-fill-opacity');
  if (fillOpacity !== undefined) {
    const base = read('opacity') ?? 1;
    out.opacity = base * fillOpacity;
  }
  const exposure = read('--text-fill-exposure') ?? 0;
  const contrast = read('--text-fill-contrast') ?? 0;
  const saturation = read('--text-fill-saturation') ?? 0;
  const temperature = read('--text-fill-temperature') ?? 0;
  const tint = read('--text-fill-tint') ?? 0;
  const parts: string[] = [];
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
  if (parts.length > 0) {
    const existing = typeof record.filter === 'string' && record.filter !== 'none' ? record.filter : '';
    out.filter = existing ? `${existing} ${parts.join(' ')}` : parts.join(' ');
  }
  return out;
}
