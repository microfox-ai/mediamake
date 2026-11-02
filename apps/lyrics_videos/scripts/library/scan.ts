/**
 * scan: index where media already is, moving nothing. The library itself is reconciled (a moved
 * file is found again by its hash, a vanished one marked missing); Downloads, projects' inputs,
 * out/ finals, brands/ and overlays/ are indexed in place, so `find` and `dedupe` see everything at
 * once. `--rebuild` makes the catalog again from the library's .media.json files.
 *
 * Hashing is the heavy part (hundreds of GB on a first run): files already seen with the same
 * size, date and inode are not read again, and the work waits while a render runs.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DIRS, REPO, kindOf } from '../paths.ts';
import { classify, isPersonal, mediaTypeOf } from './classify.ts';
import { channelOfFolder } from './config.ts';
import { getItem, openDb, reindex, tx, type Kind, type Role } from './db.ts';
import { addLocation, addSource, addTags, knownHash, rank, relOf, roleOf, upsertItem, type Lib } from './lib.ts';
import { probe, thumbnail } from './probe.ts';
import { readFolder } from './sidecar.ts';
import { now, rendering, sha256File, size, sleep } from './sys.ts';

export const ROOTS = ['library', 'downloads', 'projects', 'out', 'brands', 'overlays'] as const;
export type Root = (typeof ROOTS)[number];

type Found = { abs: string; st: fs.Stats };

const walk = (dir: string, keep: (abs: string, name: string, st: fs.Stats) => boolean, skipDir: (abs: string, name: string) => boolean, out: Found[] = []) => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith('.') && !skipDir(abs, e.name)) walk(abs, keep, skipDir, out);
    } else if (e.isFile() && !e.name.startsWith('.')) {
      const st = fs.statSync(abs);
      if (mediaTypeOf(e.name) && keep(abs, e.name, st)) out.push({ abs, st });
    }
  }
  return out;
};

const BUNDLES = /^(node_modules|build|dist|\.next|.*\.app|.*\.revisions|_entry-.*|\.cleanup)$/;

/** The files each root contributes. */
const filesOf = (lib: Lib, root: Root): Found[] => {
  const none = () => false;
  switch (root) {
    case 'library':
      // _review holds the sweep's review sets: stills and clones of files that aren't in the library yet
      return fs.existsSync(lib.root)
        ? walk(lib.root, () => true, (abs, name) => name === '.catalog' || name === '.cache.noindex' || abs === path.join(lib.root, '_review'))
        : [];
    case 'downloads': {
      const skip = new Set([lib.root, lib.cfg.inbox].map(p => path.resolve(p)));
      const excluded = new Set(lib.cfg.exclude.map(e => e.toLowerCase()));
      return walk(
        lib.cfg.deliverRoot,
        (abs, name, st) => !isPersonal(name) && (mediaTypeOf(name) !== 'image' || st.size >= 20_000),
        (abs, name) => skip.has(abs) || BUNDLES.test(name) || (path.dirname(abs) === lib.cfg.deliverRoot && excluded.has(name.toLowerCase())),
      );
    }
    case 'projects':
      // a project's sources are its input/; footage*/, derived/ and analysis/ are made from them
      return fs.existsSync(lib.projects)
        ? fs.readdirSync(lib.projects).flatMap(slug => {
            const input = path.join(lib.projects, slug, 'input');
            return fs.existsSync(input) ? walk(input, () => true, (_a, name) => BUNDLES.test(name)) : [];
          })
        : [];
    case 'out':
      return walk(
        lib.out,
        (abs, name) => (mediaTypeOf(name) === 'image' ? abs.includes(`${path.sep}youtube${path.sep}`) : ['final', 'version'].includes(kindOf(abs))),
        (_a, name) => BUNDLES.test(name) || name === 'brands',
      );
    case 'brands':
      return walk(lib.brands, (_a, name, st) => mediaTypeOf(name) !== 'image' || st.size >= 100_000, (_a, name) => BUNDLES.test(name) || name === 'graphics');
    case 'overlays':
      return fs.existsSync(lib.overlays) ? walk(lib.overlays, () => true, none) : [];
  }
};

export type ScanReport = { root: Root; files: number; bytes: number; hashed: number; added: number; missing: number };

/** One file: its item (new or known) and this copy of it. */
const indexFile = async (lib: Lib, f: Found, countHash: (b: number) => void) => {
  let id = knownHash(lib, f.abs, f.st);
  if (!id) {
    id = await sha256File(f.abs);
    countHash(f.st.size);
  }
  const { role } = roleOf(lib, f.abs);
  const known = getItem(lib.db, id);
  if (known) {
    tx(lib.db, () => {
      addLocation(lib, id!, f.abs);
      // the main copy is the best placed one (the library's, then brands', out/'s…)
      if (rank(role) < rank(known.role) || known.status !== 'online')
        lib.db.prepare("UPDATE items SET path = ?, role = ?, status = 'online' WHERE id = ?").run(relOf(lib, f.abs), role, id);
    });
    return false;
  }
  const type = mediaTypeOf(f.abs)!;
  const p = type === 'video' || type === 'audio' || type === 'image' ? probe(f.abs, type === 'image') : null;
  // inside the library its .media.json says what it is; elsewhere it is classified where it lies
  const side = role === 'library' ? readFolder(path.dirname(f.abs)).items[path.basename(f.abs)] : undefined;
  const segs = path.relative(lib.cfg.deliverRoot, path.dirname(f.abs)).split(path.sep);
  const channel = role === 'downloads' && segs[0] && !segs[0].startsWith('..') ? channelOfFolder(lib.cfg, segs[0]) : undefined;
  const c = classify({ file: f.abs, probe: p, hint: { channel }, context: path.dirname(f.abs).split(path.sep).slice(-3).join(' ') });
  const kind: Kind = side?.kind ?? c.kind ?? '_unsorted';
  tx(lib.db, () => {
    upsertItem(lib, {
      id: id!,
      path: relOf(lib, f.abs),
      kind,
      subject: side ? (side.subject ?? null) : c.subject,
      title: side?.title ?? c.title,
      ext: path.extname(f.abs).toLowerCase(),
      bytes: f.st.size,
      width: p?.width ?? null,
      height: p?.height ?? null,
      duration: p?.duration ?? null,
      fps: p?.fps ?? null,
      has_audio: p ? Number(p.hasAudio) : null,
      codec: p?.codec ?? null,
      rating: side?.rating ?? null,
      rights: side?.rights ?? null,
      role,
      confidence: side ? (side.confidence ?? 0.9) : c.confidence,
    });
    addLocation(lib, id!, f.abs);
    for (const s of side?.sources ?? (c.tool ? [{ tool: c.tool, ref: c.ref, prompt: c.prompt }] : [])) addSource(lib, id!, s);
    addTags(lib, id!, [...(side?.tags ?? c.tags), ...(c.guess ? [`kind:${c.guess}`] : [])]);
    for (const note of side?.notes ?? []) lib.db.prepare('INSERT INTO notes (item_id, at, text, production) VALUES (?, ?, ?, ?)').run(id!, note.at, note.text, note.production ?? null);
    reindex(lib.db, id!);
  });
  if (type !== 'font' && type !== '3d' && type !== 'archive' && !fs.existsSync(path.join(lib.thumbs, `${id}.jpg`)))
    thumbnail(f.abs, type, p?.duration, path.join(lib.thumbs, `${id}.jpg`));
  return true;
};

/** What cleanup-out moved to an external disk, by hash: such an item is cold (on that disk), not missing. */
export const archived = () => {
  const disks = new Map<string, string>();
  const file = path.join(DIRS.cleanup, 'ledger.jsonl');
  if (!fs.existsSync(file)) return disks;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    try {
      const e = JSON.parse(line) as { action: string; sha256: string; disk: { name: string } };
      if (e.action === 'moved') disks.set(e.sha256, e.disk.name);
      else if (e.action === 'restored') disks.delete(e.sha256);
    } catch {
      // blank or partial line
    }
  }
  return disks;
};

/** Copies under a root that weren't seen this time are gone; an item without copies is cold or missing. */
const forget = (lib: Lib, root: Root, seen: Set<string>) => {
  const onDisk = archived();
  const roles: Record<Root, Role[]> = {
    library: ['library'],
    downloads: ['downloads', 'delivery'],
    projects: ['project'],
    out: ['out'],
    brands: ['brands'],
    overlays: ['overlays'],
  };
  const rows = lib.db.prepare(`SELECT path, item_id FROM locations WHERE role IN (${roles[root].map(() => '?').join(', ')})`).all(...roles[root]) as { path: string; item_id: string }[];
  let missing = 0;
  tx(lib.db, () => {
    for (const r of rows) {
      if (seen.has(r.path)) continue;
      lib.db.prepare('DELETE FROM locations WHERE path = ?').run(r.path);
      const left = lib.db.prepare('SELECT path, role FROM locations WHERE item_id = ? ORDER BY path').all(r.item_id) as { path: string; role: Role }[];
      if (!left.length) {
        const disk = onDisk.get(r.item_id);
        if (disk) lib.db.prepare("UPDATE items SET status = 'cold', disk = ? WHERE id = ?").run(disk, r.item_id);
        else {
          lib.db.prepare("UPDATE items SET status = 'missing' WHERE id = ? AND status = 'online'").run(r.item_id);
          missing++;
        }
      } else {
        const best = [...left].sort((a, b) => rank(a.role) - rank(b.role))[0];
        lib.db.prepare('UPDATE items SET path = ?, role = ? WHERE id = ? AND path = ?').run(best.path, best.role, r.item_id, r.path);
      }
    }
  });
  return missing;
};

export const scan = async (lib: Lib, roots: Root[] = [...ROOTS]) => {
  const reports: ScanReport[] = [];
  for (const root of roots) {
    const files = filesOf(lib, root);
    const report: ScanReport = { root, files: files.length, bytes: files.reduce((a, f) => a + f.st.size, 0), hashed: 0, added: 0, missing: 0 };
    lib.log(`${root}: ${files.length} files, ${size(report.bytes)}`);
    const seen = new Set<string>();
    let last = Date.now();
    for (const [i, f] of files.entries()) {
      // MEDIA_NO_WAIT: the tests, which shouldn't wait on another session's render
      if (i % 50 === 0 && !process.env.MEDIA_NO_WAIT && rendering().length) {
        lib.log('  … waiting: a render or analysis is running');
        while (rendering().length) sleep(30_000);
      }
      try {
        if (await indexFile(lib, f, b => (report.hashed += b))) report.added++;
        seen.add(relOf(lib, f.abs));
      } catch (err) {
        lib.log(`  skipped ${f.abs}: ${err instanceof Error ? err.message : err}`);
      }
      if (Date.now() - last > 15_000) {
        lib.log(`  ${i + 1}/${files.length} (${size(report.hashed)} read)`);
        last = Date.now();
      }
    }
    report.missing = forget(lib, root, seen);
    reports.push(report);
  }
  return reports;
};

/** Make the catalog again from the library's .media.json files (the old one is kept beside it). */
export const rebuild = async (lib: Lib) => {
  const db = path.join(lib.catalog, 'library.db');
  lib.db.close();
  if (fs.existsSync(db)) {
    const backup = path.join(lib.catalog, 'backups', `library-${now().replace(/[:.]/g, '-')}.db`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.renameSync(db, backup);
    for (const ext of ['-wal', '-shm']) fs.rmSync(db + ext, { force: true });
  }
  lib.db = openDb(lib.root);
  return scan(lib, ['library']);
};

/** Groups of identical bytes in more than one place: what dedupe can turn into clones. */
export const duplicates = (lib: Lib) => {
  const rows = lib.db
    .prepare('SELECT item_id, COUNT(*) AS copies, MAX(bytes) AS bytes FROM locations GROUP BY item_id HAVING copies > 1 ORDER BY bytes * (copies - 1) DESC')
    .all() as { item_id: string; copies: number; bytes: number }[];
  return { groups: rows.length, extra: rows.reduce((a, r) => a + r.bytes * (r.copies - 1), 0), rows };
};

/** Git-tracked files under the repo (dedupe and the sweep leave them alone). */
export const trackedFiles = () => {
  try {
    return new Set(
      execFileSync('git', ['ls-files', '-z'], { cwd: REPO, maxBuffer: 1 << 28 })
        .toString()
        .split('\0')
        .filter(Boolean)
        .map(f => path.join(REPO, f)),
    );
  } catch {
    return new Set<string>();
  }
};
