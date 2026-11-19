#!/usr/bin/env node
/**
 * Runs a use-figcraft recipe (a figcraft-cli script whose fonts, pictures and outputs are tokens), so a
 * recipe made on one computer builds on any other.
 *
 *   node scripts/recipe.mjs <recipe.json> --out=<folder> [--images=<folder>] [--fonts=<folder>] [--no-fetch]
 *   node scripts/recipe.mjs <recipe.json> --tokens          (list what the recipe needs, and stop)
 *   node scripts/recipe.mjs --fonts                         (list the font files this computer has, and stop)
 *
 * Tokens inside the recipe's strings:
 *   {{font:<File>.ttf}}   a font file, named like MediaMake's thumbnail fonts (Family-<weight>[italic].ttf,
 *                         e.g. PlusJakartaSans-800.ttf); recipes/fonts.json says which Google family each is.
 *                         Looked for in --fonts, ~/Library/Fonts, ~/.local/share/fonts, MediaMake's
 *                         thumbnail jobs (~/MediaMake/thumbnails/jobs/<job>/fonts), the cache
 *                         (~/.cache/use-figcraft/fonts), else fetched from Google Fonts into the cache
 *                         (the network: --no-fetch stops it).
 *   {{image:<name>}}      a picture: --images/<name> when it is there, else a neutral gradient placeholder
 *                         (swap the real picture in afterwards with image.replace).
 *   {{out}}               the output folder.
 *
 * It writes <out>/<recipe>.run.json (the resolved script) and <out>/<recipe>.figcraft, and prints each
 * export the recipe made. figcraft-cli: $FIGCRAFT_CLI, the PATH, or ~/.local/bin/figcraft-cli.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = k => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const recipe = args.find(a => !a.startsWith('--'));
const home = os.homedir();
const cache = path.join(home, '.cache', 'use-figcraft', 'fonts');

/** Where a font file can be, in order. */
const fontDirs = () => {
  const dirs = [flag('fonts'), path.join(home, 'Library', 'Fonts'), path.join(home, '.local', 'share', 'fonts')].filter(Boolean);
  const jobs = path.join(home, 'MediaMake', 'thumbnails', 'jobs');
  if (fs.existsSync(jobs)) for (const j of fs.readdirSync(jobs)) dirs.push(path.join(jobs, j, 'fonts'));
  dirs.push(cache);
  return dirs;
};

if (args.includes('--fonts')) {
  // every font file once (the first folder that has it), grouped by family name
  const seen = new Map();
  for (const d of fontDirs()) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (/\.(ttf|otf)$/i.test(f) && !seen.has(f)) seen.set(f, path.join(d, f));
  }
  const byFamily = new Map();
  for (const [f, p] of [...seen].sort()) {
    const fam = f.replace(/-[^-]*$/, '').replace(/\.(ttf|otf)$/i, '');
    if (!byFamily.has(fam)) byFamily.set(fam, []);
    byFamily.get(fam).push(f.slice(fam.length + 1).replace(/\.(ttf|otf)$/i, '') || f);
  }
  for (const [fam, faces] of byFamily) console.log(`${fam}: ${faces.join(', ')}`);
  console.log(`${seen.size} files; built in, no file needed: Inter (Regular, Italic, SemiBold, Bold). Paths: --fonts --paths`);
  if (args.includes('--paths')) for (const [, p] of [...seen].sort()) console.log(p.replace(home, '~'));
  process.exit(0);
}
if (!recipe) {
  console.error('Usage: node scripts/recipe.mjs <recipe.json> --out=<folder> [--images=<folder>] [--fonts=<folder>] [--no-fetch] | --tokens | --fonts');
  process.exit(2);
}
const text = fs.readFileSync(recipe, 'utf8');
const tokens = [...new Set([...text.matchAll(/\{\{(font|image):([^}]+)\}\}/g)].map(m => `${m[1]}:${m[2]}`))];
const fontsMap = (() => {
  const f = path.join(here, '..', 'recipes', 'fonts.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
})();

if (args.includes('--tokens')) {
  for (const t of tokens) console.log(t.startsWith('font:') ? `${t}  (${fontsMap[t.slice(5)]?.family ?? 'family unknown'} ${fontsMap[t.slice(5)]?.weight ?? ''})` : t);
  process.exit(0);
}

const out = path.resolve(flag('out') ?? path.join(process.cwd(), 'figcraft-out'));
fs.mkdirSync(out, { recursive: true });

const cli = (() => {
  if (process.env.FIGCRAFT_CLI && fs.existsSync(process.env.FIGCRAFT_CLI)) return process.env.FIGCRAFT_CLI;
  const w = spawnSync('which', ['figcraft-cli'], { encoding: 'utf8' });
  if (w.status === 0 && w.stdout.trim()) return w.stdout.trim();
  const local = path.join(home, '.local', 'bin', 'figcraft-cli');
  if (fs.existsSync(local)) return local;
  console.error('figcraft-cli is not installed (see the use-figcraft skill, "First: check the MCPs").');
  process.exit(1);
})();

const fetchFont = async file => {
  const info = fontsMap[file];
  if (!info || args.includes('--no-fetch')) return undefined;
  const axis = info.italic ? `ital,wght@1,${info.weight ?? 400}` : `wght@${info.weight ?? 400}`;
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${info.family.replace(/\s+/g, '+')}:${axis}`);
  const url = css.ok ? (await css.text()).match(/url\((https:[^)]+)\)/)?.[1] : undefined;
  if (!url) return undefined;
  fs.mkdirSync(cache, { recursive: true });
  const to = path.join(cache, file);
  fs.writeFileSync(to, Buffer.from(await (await fetch(url)).arrayBuffer()));
  console.log(`↓ ${info.family} ${info.weight ?? 400}${info.italic ? ' italic' : ''} from Google Fonts → ${to.replace(home, '~')}`);
  return to;
};

/** A soft diagonal gradient PNG (no dependencies), standing in for a picture the recipe needs. */
const placeholder = (name, w = 1600, h = 1000) => {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = buf => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  // two colours picked from the name, so different placeholders look different
  let seed = 0;
  for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = seed % 360;
  const hsl = (hh, s, l) => {
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + hh / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return [f(0), f(8), f(4)];
  };
  const [c1, c2] = [hsl(hue, 0.35, 0.62), hsl((hue + 40) % 360, 0.4, 0.32)];
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const t = (x / w + y / h) / 2;
      const o = y * (w * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(c1[i] + (c2[i] - c1[i]) * t);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  const to = path.join(out, 'placeholders', `${name.replace(/\.[a-z]+$/i, '')}.png`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, png);
  return to;
};

const resolved = {};
const missing = [];
for (const t of tokens) {
  const [kind, value] = [t.slice(0, t.indexOf(':')), t.slice(t.indexOf(':') + 1)];
  if (kind === 'font') {
    const found = fontDirs()
      .map(d => path.join(d, value))
      .find(f => fs.existsSync(f));
    const file = found ?? (await fetchFont(value).catch(() => undefined));
    if (file) resolved[t] = file;
    else missing.push(value);
  } else {
    const given = flag('images') && path.join(path.resolve(flag('images')), value);
    resolved[t] = given && fs.existsSync(given) ? given : placeholder(value);
    if (resolved[t] !== given) console.log(`□ ${value}: no picture given, a placeholder stands in (swap it with image.replace)`);
  }
}
if (missing.length) {
  console.error(`Fonts not found: ${missing.join(', ')}. Put them in --fonts=<folder>, or allow fetching from Google Fonts (they must be in recipes/fonts.json).`);
  process.exit(1);
}

const script = text.replace(/\{\{(font|image):([^}]+)\}\}/g, (_, k, v) => resolved[`${k}:${v}`].replace(/\\/g, '\\\\')).replace(/\{\{out\}\}/g, out.replace(/\\/g, '\\\\'));
// make sure every folder an export writes into exists (file.export doesn't create folders)
for (const m of script.matchAll(/"path"\s*:\s*"([^"]+\.(png|jpg|jpeg|webp|svg|pdf|xml|fig|penpot))"/g)) fs.mkdirSync(path.dirname(m[1]), { recursive: true });
const name = path.basename(recipe, '.json');
const runFile = path.join(out, `${name}.run.json`);
fs.writeFileSync(runFile, script);
const doc = path.join(out, `${name}.figcraft`);
const r = spawnSync(cli, ['run', runFile, '--out', doc], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.status !== 0) {
  console.error(`${name} failed: ${`${r.stderr}\n${r.stdout}`.trim().split('\n').slice(-3).join(' · ')}`);
  process.exit(1);
}
const lines = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
console.log(`✔ ${name}: ${lines.length} steps → ${doc}`);
for (const l of lines) {
  const res = l.result ?? {};
  if (res.path) console.log(`  ${res.path}`);
  if (Array.isArray(res.files)) for (const f of res.files) if (f.path) console.log(`  ${f.path}`);
}
