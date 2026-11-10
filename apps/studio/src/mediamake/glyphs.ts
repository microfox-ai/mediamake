/**
 * Fonts as outline data: every letter an SVG path, so a scene draws type without waiting on a web font and
 * the hosted Remotion editor (which can't provide opentype.js) shows it the same as a render. `mm glyphs <slug>`
 * writes a project's video/glyphs.ts from its font files and its lyrics; the project registers it once:
 *
 *   // projects/<slug>/video/index.tsx
 *   import { registerGlyphs } from '@mediamake/engine/lyrics';
 *   import { GLYPHS } from './glyphs';
 *   registerGlyphs(GLYPHS);
 *
 * and GlyphLyrics / ChannelTitle name a font by its key ("<slug>/fonts/PirataOne-400.ttf"). The data stays
 * out of the layers' props, which the editor reads and saves to edits.json. Made for Hollow Soul (2026-11-09).
 */

/** A font's metrics and, for each character a project uses, its outline (font units, baseline 0, y down) and advance. */
export type GlyphFont = { unitsPerEm: number; ascender: number; descender: number; glyphs: Record<string, { d: string; w: number }> };

const REGISTRY: Record<string, GlyphFont> = {};

/** Adds a project's fonts (the GLYPHS of its video/glyphs.ts). */
export const registerGlyphs = (fonts: Record<string, GlyphFont>) => {
  Object.assign(REGISTRY, fonts);
};

/** A registered font, or an error that says how to make it. */
export const glyphFont = (name: string): GlyphFont => {
  const f = REGISTRY[name];
  if (!f) {
    const known = Object.keys(REGISTRY);
    throw new Error(
      `No outlines for the font "${name}": run \`mm glyphs <slug>\` and registerGlyphs(GLYPHS) in video/index.tsx` +
        (known.length ? ` (registered: ${known.join(', ')})` : ''),
    );
  }
  return f;
};

/** One letter placed: its outline, where it starts in its run (px) and its scale from font units to px. */
export type PlacedGlyph = { d: string; x: number; s: number };

/** Lays a run of text out in a font at `size` px with `tracking` em between letters: its letters and width (px). */
export const setGlyphs = (font: GlyphFont, text: string, size: number, tracking = 0) => {
  const s = size / font.unitsPerEm;
  const track = tracking * size;
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  for (const ch of text) {
    const g = font.glyphs[ch] ?? font.glyphs['?'];
    if (!g) {
      x += size * 0.3 + track;
      continue;
    }
    if (ch.trim()) glyphs.push({ d: g.d, x, s });
    x += g.w * s + track;
  }
  return { glyphs, width: Math.max(0, x - track) };
};
