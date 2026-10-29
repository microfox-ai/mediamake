// a short's cuts as the render frames them: clip file, seconds on screen, clip seconds at start / middle / end
import fs from 'node:fs';
import { createRequire } from 'node:module';
const [slug, id] = process.argv.slice(2);
const root = process.cwd();
const opentype = (await import(createRequire(`${root}/package.json`).resolve('opentype.js'))).default;
const { resolveShort, clipTime } = await import(`${root}/src/lyricshorts/spec.ts`);
const { solveShort } = await import(`${root}/src/lyricshorts/layout.ts`);
const { frameCuts } = await import(`${root}/src/lyricshorts/framing.ts`);
const P = `${root}/projects/${slug}`;
const m = JSON.parse(fs.readFileSync(`${P}/manifest.json`, 'utf8'));
const short = JSON.parse(fs.readFileSync(`${P}/shorts/${id}/short.json`, 'utf8'));
const { edl } = await import(`${P}/shorts/${id}/edl.ts`);
const { THEME } = await import(`${P}/shorts/theme.ts`);
const buf = fs.readFileSync(`${root}/projects/${THEME.type.font}`);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const r = resolveShort(m, short, edl);
const layouts = solveShort(r.screens.filter(s => s.kind === 'stack'), font, THEME.type, 1080, 1920);
const faces = JSON.parse(fs.readFileSync(`${P}/footage/faces.json`, 'utf8'));
const cuts = frameCuts(r.cuts, r.screens, layouts, faces, 1080, 1920, short.loop);
console.log(JSON.stringify(cuts.map((c, i) => {
  const d = c.end - c.start;
  return { n: i + 1, shot: c.shot, file: c.file, d: +d.toFixed(2), t: [0.05, 0.5, 0.95].map(f => +clipTime(c, d * f).toFixed(3)) };
})));
