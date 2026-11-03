/**
 * sweep: sort what already lies around — loose media at the top of Downloads and of the channel
 * folders, and the app's hash-named overlays/ — into the library, after the user has looked.
 * Folders are left as they are: a folder is a set, board or job someone made (a Pinterest board,
 * type-inspo/condensed, a Midjourney batch with its state.json, an exported brand kit), and filing
 * its files one by one would flatten it. A file whose own name says nothing is named after what a
 * project called the same bytes, and filed as what it was used as (input/overlays/ → overlays).
 *
 *   media sweep --plan [--limit=N]   proposes moves from the catalog (run `media scan` first):
 *                                     .catalog/sweeps/<id>/plan.json, and one set for
 *                                     /file-revision at _LIBRARY/_review/sweep-<id>/ (a row per
 *                                     destination; Drop = leave it where it is, a comment = retag;
 *                                     videos and songs play in the zoom view)
 *   media sweep --review=<id>        rebuilds that review set from the plan (same IDs, revisions kept)
 *   media sweep --apply=<id> [--yes] moves what wasn't dropped (same-disk renames: instant), logging
 *                                     each move in .catalog/sweeps/<id>/moves.jsonl
 *   media sweep --undo=<id> [--yes]  moves them all back
 *
 * Never proposed: delivered outputs (a video that matches a render in out/, anything in release/,
 * youtube/, remaster/ or previous/ folders, final masters, a channel folder's thumbnails, posters,
 * numbered shorts and .mov exports), the config's excluded folders,
 * personal captures, files changed in the last 15 minutes. Exact copies of library files are set
 * aside in _INBOX/_duplicates/ (never deleted). Projects, out/ and brands/ are not swept.
 */
import fs from 'node:fs';
import path from 'node:path';
import { classify, destOf, isPersonal, meaningless, mediaTypeOf } from './classify.ts';
import { channelOfFolder } from './config.ts';
import { tagsOf, tx, type Item, type Kind, type Role } from './db.ts';
import { absOf, relOf, roleOf, sourcesOf, type Lib } from './lib.ts';
import { placeholder } from './probe.ts';
import { archived } from './scan.ts';
import { dropEntry, putEntry } from './sidecar.ts';
import { cloneOnly, freePath, move, now, openFiles, readJson, slug, writeJson } from './sys.ts';

const RECENT = 15 * 60_000;
const DELIVERED_DIRS = new Set(['release', 'youtube', 'remaster', 'previous', 'shorts', 'final']);
const MASTER = /final master|\(-?\d+(\.\d+)? ?lufs\)/i;
/** A channel folder's own finished work: thumbnails, posters (gohan-mp), milestone cards (vegeta-15k), numbered shorts (07-higuruma-sentence-strike-s01). */
const FINISHED = /thumb|poster|(^|[^a-z0-9])(mp\d?|\d{2,3}k)$|^\d{2}-.+-s\d{2}$/i;
/** An editor's export (levi.mov): downloads come as mp4 or webm. */
const EXPORT = /\.mov$/i;

export type Move = {
  n: number;
  id: string;
  from: string;
  to: string;
  action: 'move' | 'set-aside';
  kind: string;
  subject: string | null;
  confidence: number;
  group: string;
  skip?: boolean;
};
type Plan = { schema: string; id: string; at: string; moves: Move[] };

const sweepDir = (lib: Lib, id: string) => path.join(lib.catalog, 'sweeps', id);
const reviewDir = (lib: Lib, id: string) => path.join(lib.root, '_review', `sweep-${id}`);

/** A project's input/<folder> says what a file was used as. */
const USED_AS: Record<string, Kind> = {
  footage: 'footage',
  clips: 'footage',
  'edits-and-clips': 'footage',
  overlays: 'overlays',
  sfx: 'sfx',
  song: 'music',
  pins: 'images',
  pinterest: 'images',
  inspiration: 'references',
  outcrops: 'art',
  cutout: 'art',
};
/** Chrome's " (1)" on a repeat download. */
const AGAIN = / \(\d+\)\.[^./]+$/;
/** Kinds that are media whatever they show: a song, a sound, a model, a font. */
const SURE = new Set<string>(['music', 'sfx', '3d', 'fonts']);

type Candidate = { path: string; item_id: string; role: Role; abs: string; segs: string[] };

export const planSweep = (lib: Lib, o: { limit?: number } = {}) => {
  const excluded = new Set(lib.cfg.exclude.map(e => e.toLowerCase()));
  const renders = archived();
  const rows = lib.db.prepare("SELECT l.path, l.item_id, l.role FROM locations l WHERE l.role IN ('downloads', 'overlays')").all() as { path: string; item_id: string; role: Role }[];
  const roles = (id: string) => (lib.db.prepare('SELECT role FROM locations WHERE item_id = ?').all(id) as { role: Role }[]).map(r => r.role);
  const candidates: Candidate[] = [];
  let inFolders = 0;
  for (const r of rows) {
    const abs = absOf(lib, r.path);
    if (!fs.existsSync(abs)) continue;
    const segs = r.role === 'overlays' ? ['overlays', path.basename(abs)] : path.relative(lib.cfg.deliverRoot, abs).split(path.sep);
    const name = path.basename(abs);
    if (r.role === 'downloads' && excluded.has(segs[0].toLowerCase())) continue;
    // a folder is the user's (or a tool's) own set, board or job: only loose files are sorted one by one
    if (r.role === 'downloads' && !(segs.length === 1 || (segs.length === 2 && channelOfFolder(lib.cfg, segs[0])))) {
      inFolders++;
      continue;
    }
    if (isPersonal(name) || segs.slice(0, -1).some(s => DELIVERED_DIRS.has(s.toLowerCase())) || MASTER.test(name)) continue;
    if (segs.length === 2 && (FINISHED.test(path.parse(name).name) || EXPORT.test(name))) continue;
    if (Date.now() - fs.statSync(abs).mtimeMs < RECENT) continue;
    // a video that is also a render (in out/, or archived from it by cleanup-out) is a delivered final: it stays
    if (mediaTypeOf(name) === 'video' && (roles(r.item_id).includes('out') || renders.has(r.item_id))) continue;
    candidates.push({ ...r, abs, segs });
  }
  // of loose copies of the same bytes, the one without " (1)" goes in and the rest are set aside
  candidates.sort((a, b) => Number(AGAIN.test(a.abs)) - Number(AGAIN.test(b.abs)) || a.abs.localeCompare(b.abs));

  const moves: Move[] = [];
  const planned = new Set<string>();
  let unknown = 0;
  for (const r of candidates) {
    const n = moves.length + 1;
    if (planned.has(r.item_id) || roles(r.item_id).includes('library')) {
      moves.push({ n, id: r.item_id, from: r.abs, to: path.join('_duplicates', 'sweep', ...r.segs), action: 'set-aside', kind: 'duplicate', subject: null, confidence: 1, group: 'copies, set aside in _INBOX/_duplicates' });
      continue;
    }
    const it = lib.db.prepare('SELECT * FROM items WHERE id = ?').get(r.item_id) as Item;
    const channel = r.role === 'downloads' && r.segs.length > 1 ? channelOfFolder(lib.cfg, r.segs[0]) : undefined;
    // how a project used the same bytes says what it is: the input folder it sat in, and its name there
    const used = (lib.db.prepare("SELECT path FROM locations WHERE item_id = ? AND role = 'project'").all(r.item_id) as { path: string }[]).map(u =>
      path.relative(lib.projects, absOf(lib, u.path)).split(path.sep),
    );
    const usedAs = used.map(s => (s[1] === 'input' && s.length > 3 ? USED_AS[s[2].toLowerCase()] : undefined)).find(Boolean);
    const stem = (f: string) => path.basename(f, path.extname(f));
    const alias = meaningless(stem(r.abs)) ? used.map(s => stem(s[s.length - 1])).find(b => !meaningless(b)) : undefined;
    const c = classify({
      file: r.abs,
      probe: { width: it.width ?? undefined, height: it.height ?? undefined, duration: it.duration ?? undefined, fps: it.fps ?? undefined, hasAudio: !!it.has_audio },
      source: sourcesOf(lib, it.id)[0] ?? null,
      hint: { channel, kind: r.role === 'overlays' ? 'overlays' : usedAs },
      context: [...r.segs.slice(0, -1), ...used.map(s => s[0])].join(' '),
      alias,
    });
    if (!c.kind) continue;
    // neither what it shows nor which tool made it is known: it stays (personal photos and work graphics hide among these)
    if (c.kind === '_unsorted' && !c.tool && !SURE.has(c.guess ?? '')) {
      unknown++;
      continue;
    }
    planned.add(r.item_id);
    const to = destOf(c);
    moves.push({ n, id: r.item_id, from: r.abs, to, action: 'move', kind: c.kind, subject: c.subject, confidence: c.confidence, group: path.dirname(to) });
    if (o.limit && moves.length >= o.limit) break;
  }

  const id = now().slice(0, 16).replace(/[-:T]/g, '');
  const plan: Plan = { schema: 'mediamake.library-sweep/v1', id, at: now(), moves };
  writeJson(path.join(sweepDir(lib, id), 'plan.json'), plan);
  const { review } = writeReview(lib, plan);
  return { plan, review, inFolders, unknown };
};

/**
 * The plan as one set for /file-revision: a row per destination, each tile a file to move. Every
 * file gets a tile (its name, when it has no picture), so nothing moves unseen, and a video or song
 * gets a clone beside it (APFS: no extra space) to play in the zoom view. Rebuilding keeps the IDs,
 * so the revisions beside it still apply.
 */
const writeReview = (lib: Lib, plan: Plan) => {
  const review = reviewDir(lib, plan.id);
  const groups = new Map<string, Move[]>();
  for (const m of plan.moves) groups.set(m.group, [...(groups.get(m.group) ?? []), m]);
  let playable = 0;
  const index = {
    schema: 'mediamake.image-set/v1',
    job: `sweep-${plan.id}`,
    kind: 'set',
    title: `Library sort ${plan.id}: drop what should stay where it is`,
    workflow: 'cleanup-downloads',
    source: path.join(sweepDir(lib, plan.id), 'plan.json'),
    location: review,
    path: review,
    groups: [...groups].map(([g, list]) => ({
      id: slug(g, 80) || 'misc',
      name: `${g} (${list.length})`,
      items: list.map(m => {
        const dir = slug(g, 80) || 'misc';
        const file = path.join(dir, `m${m.n}.jpg`);
        const thumb = path.join(lib.thumbs, `${m.id}.jpg`);
        fs.mkdirSync(path.join(review, dir), { recursive: true });
        if (!fs.existsSync(path.join(review, file))) {
          if (fs.existsSync(thumb)) fs.copyFileSync(thumb, path.join(review, file), fs.constants.COPYFILE_FICLONE);
          else placeholder(path.basename(m.from), path.join(review, file));
        }
        const media = playableClone(m, review, dir);
        if (media) playable++;
        return { id: `m${m.n}`, file, ...(media ? { media } : {}), note: `${path.relative(lib.cfg.deliverRoot, m.from)} → ${m.to}` };
      }),
    })),
  };
  writeJson(path.join(review, 'index.json'), index);
  return { review, playable };
};

/** A clone of a video or song to move, inside the review folder (browsers only read the folder they were given). */
const playableClone = (m: Move, review: string, dir: string) => {
  const type = mediaTypeOf(m.from);
  if ((type !== 'video' && type !== 'audio') || !fs.existsSync(m.from)) return null;
  const rel = path.join(dir, `m${m.n}${path.extname(m.from).toLowerCase()}`);
  const abs = path.join(review, rel);
  // a clone or nothing: a full copy of every video would fill the disk
  return fs.existsSync(abs) || cloneOnly(m.from, abs) ? rel : null;
};

export const reviewSweep = (lib: Lib, id: string) => {
  const plan = readJson<Plan>(path.join(sweepDir(lib, id), 'plan.json'));
  if (!plan) throw new Error(`No sweep ${id} (media sweep --plan makes one)`);
  return { plan, ...writeReview(lib, plan) };
};

/** The newest revision of the review: the ids the user dropped, and the comments to act on. */
const reviewOf = (lib: Lib, id: string) => {
  const dir = reviewDir(lib, id);
  const revDirs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(d => d.endsWith('.revisions')) : [];
  const revs = revDirs.flatMap(d => fs.readdirSync(path.join(dir, d)).filter(f => /^rev-\d+\.json$/.test(f)).map(f => path.join(dir, d, f))).sort();
  const last = revs.length ? readJson<{ drop?: string[]; comments?: { images: string[]; text: string }[] }>(revs[revs.length - 1]) : null;
  return { drop: new Set(last?.drop ?? []), comments: last?.comments ?? [] };
};

const relocate = (lib: Lib, m: Move, fromAbs: string, toAbs: string, toLibrary: boolean) =>
  tx(lib.db, () => {
    const fromRel = relOf(lib, fromAbs);
    const toRel = relOf(lib, toAbs);
    const role: Role = toLibrary ? 'library' : toAbs.startsWith(lib.cfg.inbox + path.sep) ? 'inbox' : 'downloads';
    lib.db.prepare('UPDATE locations SET path = ?, role = ? WHERE path = ?').run(toRel, role, fromRel);
    if (toLibrary) lib.db.prepare('UPDATE items SET path = ?, role = ?, kind = ?, subject = ? WHERE id = ?').run(toRel, 'library', m.kind, m.subject, m.id);
    else lib.db.prepare('UPDATE items SET path = ?, role = ? WHERE id = ? AND path = ?').run(toRel, role, m.id, fromRel);
  });

export const applySweep = async (lib: Lib, id: string, o: { yes?: boolean } = {}) => {
  const plan = readJson<Plan>(path.join(sweepDir(lib, id), 'plan.json'));
  if (!plan) throw new Error(`No sweep ${id} (media sweep --plan makes one)`);
  const review = reviewOf(lib, id);
  const todo = plan.moves.filter(m => !m.skip && !review.drop.has(`m${m.n}`) && fs.existsSync(m.from));
  if (!o.yes) return { todo, dropped: plan.moves.length - todo.length, comments: review.comments, done: 0, left: [] as string[] };
  const log = path.join(sweepDir(lib, id), 'moves.jsonl');
  let done = 0;
  const left: string[] = [];
  let [open, openAt] = [openFiles(), Date.now()];
  for (const m of todo) {
    // days can pass between the plan and this: a file in use, or changed since the scan, stays where it is
    if (Date.now() - openAt > 5000) [open, openAt] = [openFiles(), Date.now()];
    const st = fs.statSync(m.from);
    const row = lib.db.prepare('SELECT bytes, mtime FROM locations WHERE path = ?').get(relOf(lib, m.from)) as { bytes: number; mtime: number } | undefined;
    if (open.has(m.from) || !row || st.size !== row.bytes || Math.abs(st.mtimeMs - row.mtime) >= 1 || Date.now() - st.mtimeMs < RECENT) {
      left.push(m.from);
      continue;
    }
    const dest = freePath(m.action === 'move' ? path.join(lib.root, m.to) : path.join(lib.cfg.inbox, m.to));
    await move(m.from, dest);
    relocate(lib, m, m.from, dest, m.action === 'move');
    if (m.action === 'move') {
      const it = lib.db.prepare('SELECT * FROM items WHERE id = ?').get(m.id) as Item;
      putEntry(path.dirname(dest), path.basename(dest), {
        sha256: m.id,
        kind: it.kind,
        subject: it.subject,
        title: it.title,
        tags: tagsOf(lib.db, m.id),
        sources: sourcesOf(lib, m.id),
        original: path.relative(lib.cfg.deliverRoot, m.from),
        addedAt: now(),
        confidence: m.confidence,
      });
    }
    fs.appendFileSync(log, JSON.stringify({ n: m.n, id: m.id, from: m.from, to: dest, action: m.action, at: now() }) + '\n');
    done++;
  }
  return { todo, dropped: plan.moves.length - todo.length, comments: review.comments, done, left };
};

export const undoSweep = async (lib: Lib, id: string, o: { yes?: boolean } = {}) => {
  const log = path.join(sweepDir(lib, id), 'moves.jsonl');
  const moves = fs.existsSync(log)
    ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as { n: number; id: string; from: string; to: string; action: Move['action'] })
    : [];
  const back = moves.reverse().filter(m => fs.existsSync(m.to) && !fs.existsSync(m.from));
  if (!o.yes) return { back, done: 0 };
  let done = 0;
  for (const m of back) {
    await move(m.to, m.from);
    if (m.action === 'move') dropEntry(path.dirname(m.to), path.basename(m.to));
    const { role } = roleOf(lib, m.from);
    tx(lib.db, () => {
      lib.db.prepare('UPDATE locations SET path = ?, role = ? WHERE path = ?').run(relOf(lib, m.from), role, relOf(lib, m.to));
      lib.db.prepare('UPDATE items SET path = ?, role = ? WHERE id = ? AND path = ?').run(relOf(lib, m.from), role, m.id, relOf(lib, m.to));
    });
    done++;
  }
  fs.renameSync(log, `${log}.undone-${Date.now()}`);
  return { back, done };
};
