/**
 * glyphs: a project's fonts as outline data (video/glyphs.ts), for the scenes that draw type as SVG paths
 * (GlyphLyrics, ChannelTitle): nothing waits on a web font, and the hosted Remotion editor, which can't provide
 * opentype.js, shows the type the same as a render. Run it again whenever the lyrics, the title or the fonts change.
 *
 * Usage: mm glyphs <slug> [--fonts=fonts/A.ttf,fonts/B.otf] [--text="Hollow Soul|Anime Music Zone"]
 *
 *   --fonts   the font files (relative to the project, or absolute). Default: every <slug>/fonts/<file> the
 *             project's video/ code names, else every font in its fonts/ folder
 *   --text    more text to cover, '|' between lines (the title and artist from input/project.json always are)
 *
 * Covers every character of the lyrics (manifest.json, else input/lyrics.json) and of every string in the video code
 * (titles, the channel's name), as written, in capitals and in lower case, plus '?' (drawn for a character a font lacks). A font is keyed by its path under projects/
 * ("<slug>/fonts/PirataOne-400.ttf"); the project registers the file once:
 *
 *   import { registerGlyphs } from '@mediamake/engine/lyrics';
 *   import { GLYPHS } from './glyphs';
 *   registerGlyphs(GLYPHS);
 */
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import { DIRS, shown } from './paths.ts';

const args = process.argv.slice(2);
const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const [slug] = args.filter(a => !a.startsWith('--'));
if (!slug) {
  console.error('Usage: mm glyphs <slug> [--fonts=fonts/A.ttf,…] [--text="Title|Channel"]');
  process.exit(1);
}
const P = path.join(DIRS.projects, slug);
if (!fs.existsSync(P)) {
  console.error(`No project at ${shown(P)}.`);
  process.exit(1);
}
const FONT_FILE = /\.(ttf|otf)$/i;
const readJson = (file: string): any => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const walk = (dir: string, keep: (f: string) => boolean): string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(full, keep);
    return keep(e.name) ? [full] : [];
  });
};

// ------------------------------------------------------------------ the fonts
/** The project's video code (but the file this writes). */
const code = walk(path.join(P, 'video'), f => /\.(tsx?|jsx?)$/.test(f) && f !== 'glyphs.ts').map(f => fs.readFileSync(f, 'utf8'));
const named = () => {
  const re = new RegExp(`['"\`]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/((?:[^'"\`]+/)?[^'"\`/]+\\.(?:ttf|otf))['"\`]`, 'gi');
  return [...new Set(code.flatMap(c => [...c.matchAll(re)].map(m => path.join(P, m[1]))))].filter(f => fs.existsSync(f));
};
const fontFiles = opt('fonts')
  ? opt('fonts')!
      .split(',')
      .map(f => path.resolve(P, f.trim()))
  : (() => {
      const used = named();
      return used.length ? used : walk(path.join(P, 'fonts'), f => FONT_FILE.test(f));
    })();
const absent = fontFiles.filter(f => !fs.existsSync(f));
if (absent.length) {
  console.error(`No font at ${absent.map(shown).join(', ')}.`);
  process.exit(1);
}
if (!fontFiles.length) {
  console.error(`No fonts: put the font files in ${shown(path.join(P, 'fonts'))} or pass --fonts=.`);
  process.exit(1);
}
/** The key a scene names a font by: its path under projects/ (a font from elsewhere: <slug>/fonts/<file>). */
const keyOf = (file: string) => {
  const rel = path.relative(DIRS.projects, file);
  return (rel.startsWith('..') || path.isAbsolute(rel) ? `${slug}/fonts/${path.basename(file)}` : rel).split(path.sep).join('/');
};

// ------------------------------------------------------------------ the text
const manifest = readJson(path.join(P, 'manifest.json'));
const raw = readJson(path.join(P, 'input', 'lyrics.json'));
type Line = { text?: string; metadata?: { htmlText?: string }; words?: { text?: string }[] };
const lines: Line[] = Array.isArray(manifest?.lyrics) ? manifest.lyrics : Array.isArray(raw) ? raw : Array.isArray(raw?.captions) ? raw.captions : [];
if (!lines.length) console.warn(`No lyrics in manifest.json or input/lyrics.json: covering only the title, the strings in the code and --text.`);
const project = readJson(path.join(P, 'input', 'project.json')) ?? {};
const strip = (html: string) => html.replace(/<[^>]+>/g, ' ');
const text = [
  ...lines.flatMap(l => [l.text ?? '', strip(l.metadata?.htmlText ?? ''), ...(l.words ?? []).map(w => w.text ?? '')]),
  project.title ?? '',
  project.artist ?? '',
  // every string the code holds: titles, the channel's name, a sub line (Hollow Soul's 'ANIME MUSIC ZONE' came out
  // '?ONE' when only the lyrics were covered)
  ...code.flatMap(c => [...c.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\$]*)`/g)].map(m => m[1] ?? m[2] ?? m[3] ?? '')),
  ...(opt('text')?.split('|') ?? []),
].join(' ');
const chars = [...new Set([...text, ...text.toUpperCase(), ...text.toLowerCase(), '?'])].filter(c => c.trim() || c === ' ').sort();

// ------------------------------------------------------------------ the outlines
const out: Record<string, unknown> = {};
const lacking: string[] = [];
for (const file of fontFiles) {
  const font = opentype.loadSync(file);
  const em = font.unitsPerEm;
  const glyphs: Record<string, { d: string; w: number }> = {};
  const missing: string[] = [];
  for (const c of chars) {
    const g = font.charToGlyph(c);
    if (!g || g.index === 0) {
      if (c !== '?') missing.push(c);
      continue;
    }
    glyphs[c] = { d: g.getPath(0, 0, em).toPathData(1), w: Math.round(g.advanceWidth ?? 0) };
  }
  if (missing.length) lacking.push(`${path.basename(file)} lacks ${missing.join(' ')}`);
  out[keyOf(file)] = { unitsPerEm: em, ascender: font.ascender, descender: font.descender, glyphs };
}

const body =
  `// The project's fonts as outlines (font units, baseline 0, y down) for the characters its lyrics and titles use.\n` +
  `// Written by \`mm glyphs ${slug}\` from its fonts and lyrics: don't edit by hand, run it again.\n` +
  `export const GLYPHS: Record<string, { unitsPerEm: number; ascender: number; descender: number; glyphs: Record<string, { d: string; w: number }> }> = ${JSON.stringify(out)};\n`;
const target = path.join(P, 'video', 'glyphs.ts');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, body);
console.log(`${shown(target)}: ${fontFiles.length} font${fontFiles.length === 1 ? '' : 's'} × ${chars.length} characters, ${(body.length / 1024).toFixed(0)} KB`);
for (const f of fontFiles) console.log(`  ${keyOf(f)}`);
for (const l of lacking) console.log(`  ⚠ ${l} (drawn as its '?', or a gap)`);
