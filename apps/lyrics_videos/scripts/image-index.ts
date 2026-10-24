/**
 * image-index: make any folder of images reviewable in mediamake's /image-revision, by writing the
 * image-set contract (mediamake.image-set/v1) as <folder>/index.json. Use it for images from any
 * workflow: an MCP server (fal, Midjourney, ElevenLabs…), a script, a download. Workflows that
 * render with Remotion write the same file themselves (scripts/thumbs.ts).
 *
 * Usage: npm run image-index -w lyrics_videos -- <folder> [--title="…"] [--workflow=<skill>] [--source=<path>]
 *          [--kind=<kind>] [--pick=<max>] [--label=<what a pick is called>] [--groups=subfolders]
 *
 *   IDs are the file names without extension (stable as long as the files keep their names);
 *   --groups=subfolders makes one row per subfolder instead of one row for the folder.
 *   An existing index.json keeps its groups, notes, picks and kept IDs: new files are added, removed ones dropped.
 *
 * The contract (index.json):
 *   { schema, job, kind?, title?, workflow?, source?, location?, path? (absolute), sourcePath?, size?: [w, h], pick?: { max, label },
 *     groups: [{ id, name, idea?, items: [{ id, file, note? }] }], picked?, kept? }
 *   `styles` / `variants` are accepted for `groups` / `items` (the thumbnail engine's names).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const SHEET = /^sheet(-small)?\.(jpe?g|png)$/i;

type Item = { id: string; file: string; note?: string };
type Group = { id: string; name: string; idea?: string; items: Item[] };

const args = process.argv.slice(2);
const folder = args.find(a => !a.startsWith('--'));
const flag = (k: string) => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
if (!folder) {
  console.error('Usage: npm run image-index -w lyrics_videos -- <folder> [--title=…] [--workflow=…] [--groups=subfolders]');
  process.exit(1);
}
const dir = path.resolve(process.env.INIT_CWD ?? process.cwd(), folder);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`No folder ${dir}`);

const images = (d: string) =>
  fs
    .readdirSync(d)
    .filter(f => IMAGE.test(f) && !SHEET.test(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const idOf = (file: string) => path.basename(file).replace(/\.[^.]+$/, '');

const groups: Group[] = [];
if (flag('groups') === 'subfolders') {
  for (const sub of fs.readdirSync(dir).filter(s => fs.statSync(path.join(dir, s)).isDirectory() && !s.startsWith('.') && !s.endsWith('.revisions'))) {
    const files = images(path.join(dir, sub));
    if (files.length) groups.push({ id: sub, name: sub, items: files.map(f => ({ id: `${sub}/${idOf(f)}`, file: `${sub}/${f}` })) });
  }
} else {
  const files = images(dir);
  if (files.length) groups.push({ id: 'all', name: flag('title') ?? path.basename(dir), items: files.map(f => ({ id: idOf(f), file: f })) });
}
if (!groups.length) throw new Error(`No images in ${dir}`);

// keep what an earlier index said about files that are still here
const file = path.join(dir, 'index.json');
const old = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>) : {};
const oldItems = new Map(
  ((old.groups ?? old.styles ?? []) as { items?: Item[]; variants?: Item[] }[]).flatMap(g => (g.items ?? g.variants ?? []).map(i => [i.file, i] as const)),
);
for (const g of groups) g.items = g.items.map(i => ({ ...i, ...(oldItems.get(i.file) ?? {}), file: i.file }));

const pick = flag('pick') ? { max: Number(flag('pick')), ...(flag('label') ? { label: flag('label') } : {}) } : old.pick;
const index = {
  ...old,
  schema: 'mediamake.image-set/v1',
  job: path.basename(dir),
  kind: flag('kind') ?? old.kind ?? 'images',
  title: flag('title') ?? old.title ?? path.basename(dir),
  workflow: flag('workflow') ?? old.workflow,
  source: flag('source') ?? old.source,
  location: path.relative(REPO, dir).startsWith('..') ? dir : path.relative(REPO, dir),
  // absolute, so /image-revision can show the folder in Finder (dev server) or copy the path
  path: dir,
  ...(pick ? { pick } : {}),
  groups,
};
delete (index as Record<string, unknown>).styles;
fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
console.log(`✔ ${path.relative(process.cwd(), file)} (${groups.reduce((n, g) => n + g.items.length, 0)} images, ${groups.length} group${groups.length === 1 ? '' : 's'})`);
