/**
 * image-index: make any folder of images, videos or audio reviewable in mediamake's /file-revision, by writing the
 * image-set contract (mediamake.image-set/v1) as <folder>/index.json. Use it for images from any
 * workflow: an MCP server (fal, Midjourney, ElevenLabs…), a script, a download. Workflows that
 * render with Remotion write the same file themselves (scripts/thumbs.ts).
 *
 * Usage: mm image-index <folder> [--title="…"] [--workflow=<skill>] [--source=<path>]
 *          [--kind=<kind>] [--pick=<max>] [--label=<what a pick is called>] [--groups=subfolders]
 *
 *   IDs are the file names without extension (stable as long as the files keep their names). A video or
 *   audio file plays in the zoom view; an image of the same name (clip.jpg beside clip.mp4) is its still;
 *   --groups=subfolders makes one row per subfolder instead of one row for the folder.
 *   An existing index.json keeps its groups, notes, picks and kept IDs: new files are added, removed ones dropped.
 *
 * The contract (index.json):
 *   { schema, job, kind?, title?, workflow?, source?, location?, path? (absolute), sourcePath?, size?: [w, h], pick?: { max, label },
 *     groups: [{ id, name, idea?, items: [{ id, file, media?, note? }] }], picked?, kept? }
 *   `media`: the video or audio a still (`file`) stands for, played in the zoom view.
 *   `styles` / `variants` are accepted for `groups` / `items` (the thumbnail engine's names).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const MEDIA = /\.(mp4|m4v|mov|webm|mp3|wav|m4a|aac|ogg|oga|opus|flac)$/i;
const SHEET = /^sheet(-small)?\.(jpe?g|png)$/i;

type Item = { id: string; file: string; media?: string; note?: string };
type Group = { id: string; name: string; idea?: string; items: Item[] };

const args = process.argv.slice(2);
const folder = args.find(a => !a.startsWith('--'));
const flag = (k: string) => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
if (!folder) {
  console.error('Usage: mm image-index <folder> [--title=…] [--workflow=…] [--groups=subfolders]');
  process.exit(1);
}
const dir = path.resolve(process.env.INIT_CWD ?? process.cwd(), folder);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`No folder ${dir}`);

const idOf = (file: string) => path.basename(file).replace(/\.[^.]+$/, '');
/** The folder's images, videos and audio as items (sub: the subfolder they are in); a video's or song's same-named image is its still. */
const items = (d: string, sub = '') => {
  const files = fs
    .readdirSync(d)
    .filter(f => (IMAGE.test(f) || MEDIA.test(f)) && !SHEET.test(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const media = new Map(files.filter(f => MEDIA.test(f)).map(f => [idOf(f), f]));
  const stills = new Set(files.filter(f => IMAGE.test(f) && media.has(idOf(f))).map(idOf));
  const at = (f: string) => (sub ? `${sub}/${f}` : f);
  return files.flatMap((f): Item[] => {
    const id = at(idOf(f));
    if (IMAGE.test(f)) return [{ id, file: at(f), ...(stills.has(idOf(f)) ? { media: at(media.get(idOf(f))!) } : {}) }];
    if (!stills.has(idOf(f))) return [{ id, file: at(f) }];
    return media.get(idOf(f)) === f ? [] : [{ id: at(f), file: at(f) }];
  });
};

const groups: Group[] = [];
if (flag('groups') === 'subfolders') {
  for (const sub of fs.readdirSync(dir).filter(s => fs.statSync(path.join(dir, s)).isDirectory() && !s.startsWith('.') && !s.endsWith('.revisions'))) {
    const list = items(path.join(dir, sub), sub);
    if (list.length) groups.push({ id: sub, name: sub, items: list });
  }
} else {
  const list = items(dir);
  if (list.length) groups.push({ id: 'all', name: flag('title') ?? path.basename(dir), items: list });
}
if (!groups.length) throw new Error(`No images, videos or audio in ${dir}`);

// keep what an earlier index said about files that are still here
const file = path.join(dir, 'index.json');
const old = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>) : {};
const oldItems = new Map(
  ((old.groups ?? old.styles ?? []) as { items?: Item[]; variants?: Item[] }[]).flatMap(g => (g.items ?? g.variants ?? []).map(i => [i.file, i] as const)),
);
for (const g of groups) g.items = g.items.map(i => ({ ...(oldItems.get(i.file) ?? {}), ...i }));

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
  // absolute, so /file-revision can show the folder in Finder (dev server) or copy the path
  path: dir,
  ...(pick ? { pick } : {}),
  groups,
};
delete (index as Record<string, unknown>).styles;
fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
console.log(`✔ ${path.relative(process.cwd(), file)} (${groups.reduce((n, g) => n + g.items.length, 0)} files, ${groups.length} group${groups.length === 1 ? '' : 's'})`);
