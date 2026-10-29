// a short's screens as JSON: kind, words, how much of the height a stack fills, its beats, entry and exit
// usage (from apps/lyrics_videos): node --experimental-strip-types <this> <slug> <id>
import fs from 'node:fs';
import { createRequire } from 'node:module';
const [slug, id] = process.argv.slice(2);
const root = process.cwd();
const opentype = (await import(createRequire(`${root}/package.json`).resolve('opentype.js'))).default;
const { resolveShort, beatAt } = await import(`${root}/src/lyricshorts/spec.ts`);
const { solveShort } = await import(`${root}/src/lyricshorts/layout.ts`);
const P = `${root}/projects/${slug}`;
const m = JSON.parse(fs.readFileSync(`${P}/manifest.json`, 'utf8'));
const short = JSON.parse(fs.readFileSync(`${P}/shorts/${id}/short.json`, 'utf8'));
const { edl } = await import(`${P}/shorts/${id}/edl.ts`);
const { THEME } = await import(`${P}/shorts/theme.ts`);
const buf = fs.readFileSync(`${root}/projects/${THEME.type.font}`);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const r = resolveShort(m, short, edl);
const lays = solveShort(r.screens.filter(s => s.kind === 'stack'), font, THEME.type, 1080, 1920);
console.log(JSON.stringify(r.screens.map(s => ({
  index: s.index, kind: s.kind, start: +beatAt(m, s.start).toFixed(2), end: +beatAt(m, s.end).toFixed(2),
  words: s.kind === 'full' ? [] : s.words.map(w => w.text),
  fill: s.kind === 'stack' ? +Math.min(1, 1 / lays.get(s.index).stretch).toFixed(2) : null,
  enter: s.enter, exit: s.exit, columns: s.kind === 'stack' ? lays.get(s.index).rows.some(x => x.vertical) : false,
}))));
