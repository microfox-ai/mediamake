/**
 * cleanup-out: free disk space without losing work. The cleanup-out skill drives it.
 *
 * Usage (from the repo root; every command only prints what it would do until --yes):
 *   npm run cleanup-out -w lyrics_videos -- scan [--json]
 *       what takes space: rebuildable files, then every production's heavy files by kind
 *   npm run cleanup-out -w lyrics_videos -- drives
 *       external disks under /Volumes: free space, file system, writable, holds an archive
 *   npm run cleanup-out -w lyrics_videos -- clean [--yes]
 *       delete rebuildable files: Remotion's leftover temp bundles, out/_entry-*\/build,
 *       out/brands/.public and apps/mediamake/.next (each skipped while it may be in use)
 *   npm run cleanup-out -w lyrics_videos -- archive <name|path>... [--to=<disk>] [--only=<kinds>] [--uploaded] [--list] [--yes]
 *       copy heavy files to <disk>/MediaMake Archive/<repo path>, check every copy (size and
 *       SHA-256), then remove them here. Finals are only copied (a backup) unless --uploaded says
 *       they're already published. Kinds: final, version, work, source (see scripts/paths.ts).
 *   npm run cleanup-out -w lyrics_videos -- restore <name|path>... --from=<disk> [--only=<kinds>] [--yes]
 *       copy archived files back, checked against the hash in the disk's ledger
 *
 * <disk> is a volume name (T7) or a folder (/Volumes/T7). A file is removed here only after its
 * copy hashes the same as the original. Every copy goes into a ledger on the disk
 * (MediaMake Archive/ledger.jsonl) and here (out/.cleanup/ledger.jsonl). Only heavy files (video,
 * audio, arrays, archives) move; images, JSON, notes and code stay. Files changed in the last 15
 * minutes, git-tracked files and brands/ are never touched; out/brands/ only when a path names it.
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  DIRS, KINDS, LAYOUT, REPO, fromRepoPath, isHeavy, isProtected, kindOf, productionDirs, productionNames, rebuildableDirs, repoPath,
  type Kind,
} from './paths.ts';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [cmd, ...targets] = args.filter(a => !a.startsWith('--'));
const flag = (k: string) => flags.find(f => f.startsWith(`--${k}=`))?.slice(k.length + 3);
const yes = flags.includes('--yes');

const ARCHIVE = 'MediaMake Archive';
const LEDGER = path.join(DIRS.cleanup, 'ledger.jsonl');
const RECENT = 15 * 60_000;
const DAY = 24 * 3600_000;
const size = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${Math.round(b / 1e6)} MB` : b ? `${Math.round(b / 1e3)} KB` : '-');
const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
const lpad = (s: string, n: number) => (s.length >= n ? s : ' '.repeat(n - s.length) + s);

type FileInfo = { abs: string; bytes: number; mtime: number };
type Entry = {
  at: string;
  action: 'moved' | 'copied' | 'restored';
  name: string;
  kind: Kind;
  path: string;
  bytes: number;
  mtime: number;
  sha256: string;
  disk: { id: string; name: string };
  layout: number;
};

/** Every file under dir. Symlinks are never followed (a temp bundle links all of projects/). */
const walk = (dir: string, out: FileInfo[] = []) => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else if (e.isFile()) {
      const st = fs.statSync(abs);
      out.push({ abs, bytes: st.size, mtime: st.mtimeMs });
    }
  }
  return out;
};
const bytesOf = (dir: string) => walk(dir).reduce((a, f) => a + f.bytes, 0);

const tracked = new Set(
  execFileSync('git', ['ls-files', '-z', '--', 'apps/lyrics_videos/projects', 'apps/lyrics_videos/out', 'apps/lyrics_videos/thumbnails/jobs', 'apps/mediamake/out'], {
    cwd: REPO,
    maxBuffer: 1 << 28,
  })
    .toString()
    .split('\0')
    .filter(Boolean),
);

/** Processes that may be using temp bundles (renders, stills, Studio) or .next (the dev server). */
const running = () => {
  const lines = execFileSync('ps', ['-axo', 'command='], { maxBuffer: 1 << 26 }).toString().split('\n');
  const rendering = lines.filter(l => /remotion (render|studio|still|bundle)|scripts\/(render|stills|wave-lab|thumbs|brand|logos|lyric-shorts|remix|shorts)\.ts/.test(l));
  const serving = lines.filter(l => /next dev|next-server|next\/dist\/bin\/next/.test(l));
  return { rendering, serving };
};

const diskFree = (dir: string) => {
  const s = fs.statfsSync(dir);
  return { free: s.bavail * s.bsize, total: s.blocks * s.bsize };
};

// ---------- rebuildable ----------

const TEMP = [/^remotion-webpack-bundle-/, /^react-motion-render/, /^remotion-v[\d.]+-assets/, /^wave-lab-/];
const tempRoots = () => {
  const roots = new Set([path.resolve(os.tmpdir())]);
  try {
    roots.add(path.resolve(execFileSync('getconf', ['DARWIN_USER_TEMP_DIR']).toString().trim()));
  } catch {
    // not macOS
  }
  return [...roots].filter(r => fs.existsSync(r));
};

type Item = { abs: string; label: string; bytes: number; skip?: string };
const rebuildable = (): Item[] => {
  const { rendering, serving } = running();
  const items: Item[] = [];
  for (const root of tempRoots())
    for (const name of fs.readdirSync(root)) {
      if (!TEMP.some(re => re.test(name))) continue;
      const abs = path.join(root, name);
      const age = Date.now() - fs.statSync(abs).mtimeMs;
      // a render running now (here or in the mediamake app) has its bundle here
      const skip = age < 3600_000 ? 'made in the last hour' : rendering.length && age < DAY ? 'a render is running' : undefined;
      items.push({ abs, label: `temp: ${name}`, bytes: bytesOf(abs), skip });
    }
  for (const abs of rebuildableDirs())
    items.push({ abs, label: path.relative(REPO, abs), bytes: bytesOf(abs), skip: rendering.length && abs.endsWith('.public') ? 'a render or Studio is running' : undefined });
  const next = path.join(REPO, 'apps', 'mediamake', '.next');
  if (fs.existsSync(next)) items.push({ abs: next, label: path.relative(REPO, next), bytes: bytesOf(next), skip: serving.length ? 'the Next.js dev server is running' : undefined });
  return items;
};

const clean = () => {
  const items = rebuildable();
  const go = items.filter(i => !i.skip);
  const temp = go.filter(i => i.label.startsWith('temp: '));
  if (temp.length) console.log(`${lpad(size(temp.reduce((a, i) => a + i.bytes, 0)), 9)}  ${temp.length} Remotion temp folders (${tempRoots().join(', ')})`);
  for (const i of go.filter(i => !i.label.startsWith('temp: '))) console.log(`${lpad(size(i.bytes), 9)}  ${i.label}`);
  for (const i of items.filter(i => i.skip)) console.log(`  skipped  ${i.label}: ${i.skip}`);
  const total = go.reduce((a, i) => a + i.bytes, 0);
  if (!yes) return console.log(`\n${size(total)} can go. Dry run: add --yes to delete.`);
  const before = diskFree(REPO).free;
  // rmSync removes a symlink without following it, so a linked public dir is never touched
  for (const i of go) fs.rmSync(i.abs, { recursive: true, force: true });
  console.log(`\n✔ deleted ${size(total)}; free space ${size(before)} → ${size(diskFree(REPO).free)}`);
};

// ---------- ledger ----------

const readLedger = (file: string): Entry[] =>
  fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Entry)
    : [];
/** The last entry for each path. */
const latest = (entries: Entry[]) => {
  const m = new Map<string, Entry>();
  for (const e of entries) m.set(e.path, e);
  return m;
};

// ---------- disks ----------

type Drive = { mount: string; name: string; fs: string; free: number; total: number; writable: boolean; archive: boolean };
const drives = (): Drive[] =>
  execFileSync('mount')
    .toString()
    .split('\n')
    .map(l => l.match(/^\S+ on (\/Volumes\/.+) \(([^,)]+)(.*)\)$/))
    .filter((m): m is RegExpMatchArray => !!m && !/nobrowse/.test(m[3]) && fs.existsSync(m[1]) && fs.realpathSync(m[1]) !== '/')
    .map(([, mount, type, opts]) => {
      let writable = !/read-only/.test(opts);
      try {
        fs.accessSync(mount, fs.constants.W_OK);
      } catch {
        writable = false;
      }
      return { mount, name: path.basename(mount), fs: type, ...diskFree(mount), writable, archive: fs.existsSync(path.join(mount, ARCHIVE, 'archive.json')) };
    });

const printDrives = () => {
  const list = drives();
  if (!list.length) return console.log('No external disk is connected (nothing under /Volumes). Connect one and run this again.');
  for (const d of list)
    console.log(`${pad(d.name, 20)} ${lpad(size(d.free), 9)} free of ${lpad(size(d.total), 9)}  ${pad(d.fs, 6)} ${d.writable ? 'writable' : 'READ-ONLY'}${d.archive ? `  has ${ARCHIVE}` : ''}  (${d.mount})`);
};

const diskDir = (arg: string) => {
  const dir = arg.startsWith('/') ? arg : path.join('/Volumes', arg);
  if (!fs.existsSync(dir)) throw new Error(`${dir} isn't there. Connect the disk, then: npm run cleanup-out -w lyrics_videos -- drives`);
  // archiving to the disk this repo is on frees nothing (tests pass --same-disk)
  if (fs.statSync(dir).dev === fs.statSync(REPO).dev && !flags.includes('--same-disk')) throw new Error(`${dir} is on the same disk as the repo: pick an external disk`);
  return dir;
};

const openArchive = (disk: string, create: boolean) => {
  const root = path.join(disk, ARCHIVE);
  const marker = path.join(root, 'archive.json');
  if (!fs.existsSync(marker)) {
    // a dry run plans against a disk without writing to it
    if (!create) return { root, disk: { id: '', name: path.basename(disk) }, ledger: path.join(root, 'ledger.jsonl') };
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(marker, JSON.stringify({ schema: 'mediamake.archive/v1', id: randomUUID(), created: new Date().toISOString(), machine: os.hostname(), layout: LAYOUT }, null, 2) + '\n');
  }
  const meta = JSON.parse(fs.readFileSync(marker, 'utf8')) as { id: string };
  return { root, disk: { id: meta.id, name: path.basename(disk) }, ledger: path.join(root, 'ledger.jsonl') };
};

const record = (ledgers: string[], e: Omit<Entry, 'at' | 'layout'>) => {
  const line = JSON.stringify({ at: new Date().toISOString(), ...e, layout: LAYOUT } satisfies Entry) + '\n';
  for (const l of ledgers) {
    fs.mkdirSync(path.dirname(l), { recursive: true });
    fs.appendFileSync(l, line);
  }
};

// ---------- copying ----------

const hashFile = async (file: string) => {
  const h = createHash('sha256');
  await pipeline(fs.createReadStream(file, { highWaterMark: 1 << 22 }), async (src: AsyncIterable<Buffer>) => {
    for await (const chunk of src) h.update(chunk);
  });
  return h.digest('hex');
};

/** Copy through a .part file (flushed to the disk before it's renamed), hashing on the way. */
const copyHashed = async (src: string, dest: string, mtime: number) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const h = createHash('sha256');
  await pipeline(
    fs.createReadStream(src, { highWaterMark: 1 << 22 }),
    new Transform({
      transform(chunk: Buffer, _enc, done) {
        h.update(chunk);
        done(null, chunk);
      },
    }),
    fs.createWriteStream(part, { flush: true }),
  );
  fs.renameSync(part, dest);
  fs.utimesSync(dest, new Date(), new Date(mtime));
  return h.digest('hex');
};

/** Remove folders left empty up to (not including) the target folder. */
const prune = (dir: string, stop: string) => {
  while (dir.startsWith(stop + path.sep) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
};

// ---------- targets ----------

const parseKinds = () => {
  const only = flag('only');
  if (!only) return null;
  const kinds = only.split(',').map(k => k.trim().replace(/s$/, '')) as Kind[];
  const bad = kinds.filter(k => !KINDS.includes(k));
  if (bad.length) throw new Error(`Unknown kind ${bad.join(', ')}. Kinds: ${KINDS.join(', ')}`);
  return new Set(kinds);
};

type Target = { name: string; dirs: string[]; explicit: boolean };
const resolveTargets = (list: string[]): Target[] => {
  if (!list.length) throw new Error('Name the productions (see scan), or give a path');
  return list.map(t => {
    if (!t.includes('/')) {
      const dirs = productionDirs(t);
      if (!dirs.length) throw new Error(`No production named ${t}. Run: npm run cleanup-out -w lyrics_videos -- scan`);
      return { name: t, dirs, explicit: false };
    }
    const abs = path.isAbsolute(t) ? t : [path.resolve(REPO, t), path.resolve(DIRS.out, '..', t)].find(p => fs.existsSync(p)) ?? path.resolve(REPO, t);
    if (abs === DIRS.brands || abs.startsWith(DIRS.brands + path.sep)) throw new Error('brands/ holds the brand kits every video uses: it is never archived');
    if (!abs.startsWith(REPO + path.sep)) throw new Error(`${t} is outside the repo`);
    return { name: repoPath(abs), dirs: [abs], explicit: true };
  });
};

/** Heavy files of a target that a sweep may touch. */
const heavyFiles = (t: Target) =>
  t.dirs
    .flatMap(d => walk(d).map(f => ({ ...f, root: d })))
    .filter(f => isHeavy(f.abs) && !tracked.has(repoPath(f.abs)) && (t.explicit || !isProtected(f.abs)));

// ---------- scan ----------

type Row = { name: string; here: Record<Kind, number>; kept: number; away: number; backedUp: number; last: number };
const scan = () => {
  const ledger = latest(readLedger(LEDGER));
  const rows: Row[] = [];
  for (const name of productionNames()) {
    const row: Row = { name, here: { final: 0, version: 0, work: 0, source: 0 }, kept: 0, away: 0, backedUp: 0, last: 0 };
    for (const dir of productionDirs(name))
      for (const f of walk(dir)) {
        row.last = Math.max(row.last, f.mtime);
        if (tracked.has(repoPath(f.abs))) continue;
        if (isHeavy(f.abs)) {
          row.here[kindOf(f.abs)] += f.bytes;
          const e = ledger.get(repoPath(f.abs));
          if (e && e.action !== 'restored' && e.bytes === f.bytes) row.backedUp += f.bytes;
        } else row.kept += f.bytes;
      }
    const prefixes = productionDirs(name).map(d => repoPath(d) + '/');
    for (const e of ledger.values())
      if ((e.name === name || prefixes.some(p => e.path.startsWith(p))) && e.action === 'moved' && !fs.existsSync(fromRepoPath(e.path))) row.away += e.bytes;
    rows.push(row);
  }
  const heavy = (r: Row) => KINDS.reduce((a, k) => a + r.here[k], 0);
  rows.sort((a, b) => heavy(b) - heavy(a));
  const items = rebuildable();
  const disk = diskFree(REPO);
  const kits = bytesOf(DIRS.brands);
  const brandRenders = bytesOf(DIRS.brandRenders) - bytesOf(path.join(DIRS.brandRenders, '.public'));

  if (flags.includes('--json')) {
    console.log(JSON.stringify({ disk, rebuildable: items.map(i => ({ ...i, abs: undefined, path: i.abs })), productions: rows, kept: { brands: kits, brandRenders } }, null, 2));
    return;
  }
  console.log(`Disk: ${size(disk.free)} free of ${size(disk.total)} (${Math.round((1 - disk.free / disk.total) * 100)}% full)\n`);
  console.log('Rebuildable (clean --yes deletes these):');
  const temp = items.filter(i => i.label.startsWith('temp: '));
  console.log(`${lpad(size(temp.reduce((a, i) => a + i.bytes, 0)), 9)}  ${temp.length} Remotion temp folders${temp.some(i => i.skip) ? ' (some in use)' : ''}`);
  for (const i of items.filter(i => !i.label.startsWith('temp: '))) console.log(`${lpad(size(i.bytes), 9)}  ${i.label}${i.skip ? ` (skipped: ${i.skip})` : ''}`);
  console.log(`${lpad(size(items.reduce((a, i) => a + i.bytes, 0)), 9)}  total\n`);

  console.log('Productions: heavy files here by kind; kept = images, notes and code, which always stay');
  console.log(`${pad('name', 34)}${['final', 'version', 'work', 'source', 'kept', 'on disk'].map(h => lpad(h, 9)).join('')}  last change`);
  const shown = rows.filter(r => heavy(r) || r.away);
  for (const r of shown)
    console.log(
      `${pad(r.name, 34)}${[...KINDS.map(k => r.here[k]), r.kept, r.away + r.backedUp].map(b => lpad(size(b), 9)).join('')}  ${new Date(r.last).toISOString().slice(0, 10)}`,
    );
  const sum = (k: Kind) => rows.reduce((a, r) => a + r.here[k], 0);
  console.log(`${pad('total', 34)}${KINDS.map(k => lpad(size(sum(k)), 9)).join('')}${lpad(size(rows.reduce((a, r) => a + r.kept, 0)), 9)}`);
  if (rows.length > shown.length) console.log(`(${rows.length - shown.length} more with images or notes only)`);
  console.log(`\nAlways kept: brands/ ${size(kits)}; out/brands renders ${size(brandRenders)} (archive them only by path, e.g. out/brands/<brand>/renders)`);
};

// ---------- archive / restore ----------

const archive = async () => {
  const only = parseKinds();
  const uploaded = flags.includes('--uploaded');
  const list = flags.includes('--list');
  const to = flag('to');
  const store = to ? openArchive(diskDir(to), yes) : null;
  const storeLatest = store ? latest(readLedger(store.ledger)) : new Map<string, Entry>();
  type Job = FileInfo & { root: string; name: string; kind: Kind; move: boolean };
  const jobs: Job[] = [];
  let recent = 0;
  for (const t of resolveTargets(targets))
    for (const f of heavyFiles(t)) {
      const kind = kindOf(f.abs);
      if (only && !only.has(kind)) continue;
      if (Date.now() - f.mtime < RECENT) {
        recent++;
        continue;
      }
      jobs.push({ ...f, name: t.name, kind, move: kind !== 'final' || uploaded });
    }

  // the plan, per production
  const byName = new Map<string, Job[]>();
  for (const j of jobs) byName.set(j.name, [...(byName.get(j.name) ?? []), j]);
  console.log(store ? `archive → ${path.join(path.dirname(store.root), ARCHIVE)}` : 'archive (no disk given yet: --to=<disk>)');
  for (const [name, js] of byName) {
    const moved = js.filter(j => j.move);
    const kinds = KINDS.map(k => [k, moved.filter(j => j.kind === k).reduce((a, j) => a + j.bytes, 0)] as const).filter(([, b]) => b);
    const copied = js.filter(j => !j.move).reduce((a, j) => a + j.bytes, 0);
    console.log(
      `  ${pad(name, 34)} move ${lpad(size(moved.reduce((a, j) => a + j.bytes, 0)), 8)}${kinds.length ? ` (${kinds.map(([k, b]) => `${k} ${size(b)}`).join(', ')})` : ''}${copied ? ` · back up finals ${size(copied)}` : ''}`,
    );
    if (list) for (const j of js) console.log(`      ${j.move ? 'move' : 'copy'} ${lpad(size(j.bytes), 8)}  ${repoPath(j.abs)}`);
  }
  const total = jobs.reduce((a, j) => a + j.bytes, 0);
  const freed = jobs.filter(j => j.move).reduce((a, j) => a + j.bytes, 0);
  console.log(`  total: ${size(total)} to the disk, ${size(freed)} off this Mac${recent ? `; ${recent} file${recent === 1 ? '' : 's'} changed in the last 15 minutes left alone` : ''}`);
  if (!jobs.length) return;
  if (!store) return console.log('\nConnect the external disk, then run again with --to=<disk> (see drives).');

  const drive = drives().find(d => store.root.startsWith(d.mount + path.sep));
  if (drive?.fs === 'msdos' && jobs.some(j => j.bytes >= 4 * 1024 ** 3)) throw new Error(`${drive.name} is FAT32, which can't hold files over 4 GB: use an exFAT or APFS disk`);
  const toCopy = jobs.filter(j => {
    const e = storeLatest.get(repoPath(j.abs));
    return !(e && e.bytes === j.bytes && fs.existsSync(path.join(store.root, e.path)));
  });
  const need = toCopy.reduce((a, j) => a + j.bytes, 0);
  const { free } = diskFree(path.dirname(store.root));
  if (need + 1e9 > free) throw new Error(`The disk has ${size(free)} free; this needs ${size(need)} (+1 GB to spare)`);
  if (!yes) return console.log(`\nDry run: ${size(need)} to copy, the disk has ${size(free)} free. Add --yes to do it.`);

  const before = diskFree(REPO).free;
  const ledgers = [store.ledger, LEDGER];
  let done = 0;
  let removed = 0;
  const failed: string[] = [];
  for (const [i, j] of jobs.entries()) {
    const rel = repoPath(j.abs);
    const dest = path.join(store.root, rel);
    try {
      // a copy already on the disk is reused when it hashes the same
      let sha = fs.existsSync(dest) && fs.statSync(dest).size === j.bytes ? await hashFile(j.abs) : '';
      if (!sha || (await hashFile(dest)) !== sha) {
        sha = await copyHashed(j.abs, dest, j.mtime);
        if ((await hashFile(dest)) !== sha) throw new Error('the copy on the disk does not match');
      }
      const now = fs.statSync(j.abs);
      if (now.size !== j.bytes || now.mtimeMs !== j.mtime) throw new Error('it changed while it was copied');
      if (j.move) {
        fs.rmSync(j.abs);
        prune(path.dirname(j.abs), j.root);
        removed += j.bytes;
      }
      record(ledgers, { action: j.move ? 'moved' : 'copied', name: j.name, kind: j.kind, path: rel, bytes: j.bytes, mtime: j.mtime, sha256: sha, disk: store.disk });
      done += j.bytes;
      console.log(`✔ [${i + 1}/${jobs.length}] ${j.move ? 'moved ' : 'copied'} ${lpad(size(j.bytes), 8)}  ${rel}  (${size(done)} of ${size(total)})`);
    } catch (err) {
      failed.push(`${rel}: ${err instanceof Error ? err.message : err}`);
      console.error(`✘ ${rel}: ${err instanceof Error ? err.message : err} (kept here)`);
    }
  }
  console.log(`\n${size(done)} on ${store.disk.name}, ${size(removed)} removed here; free space ${size(before)} → ${size(diskFree(REPO).free)}`);
  if (failed.length) {
    console.error(`${failed.length} failed and stayed here:\n  ${failed.join('\n  ')}`);
    process.exit(1);
  }
};

const restore = async () => {
  const only = parseKinds();
  const from = flag('from');
  if (!from) throw new Error('Say which disk: --from=<disk> (see drives)');
  if (!targets.length) throw new Error('Name the productions or paths to bring back');
  const store = openArchive(diskDir(from), false);
  if (!store.disk.id) throw new Error(`No ${ARCHIVE} on ${from}`);
  const entries = [...latest(readLedger(store.ledger)).values()];
  const jobs = targets.flatMap(t => {
    const prefix = t.includes('/') ? repoPath(path.isAbsolute(t) ? t : path.resolve(REPO, t)) : null;
    return entries.filter(
      e => (prefix ? e.path === prefix || e.path.startsWith(prefix + '/') : e.name === t) && e.action !== 'restored' && (!only || only.has(e.kind)) && !fs.existsSync(fromRepoPath(e.path)),
    );
  });
  const total = jobs.reduce((a, e) => a + e.bytes, 0);
  console.log(`restore ← ${store.root}: ${jobs.length} files, ${size(total)} (free here ${size(diskFree(REPO).free)})`);
  if (!jobs.length) return;
  if (total + 5e9 > diskFree(REPO).free) throw new Error('Not enough room here (keeping 5 GB to spare)');
  if (!yes) return console.log('Dry run: add --yes to copy them back.');
  const failed: string[] = [];
  for (const [i, e] of jobs.entries()) {
    try {
      const sha = await copyHashed(path.join(store.root, e.path), fromRepoPath(e.path), e.mtime);
      if (sha !== e.sha256) {
        fs.rmSync(fromRepoPath(e.path));
        throw new Error('the copy on the disk does not match its ledger hash');
      }
      record([store.ledger, LEDGER], { action: 'restored', name: e.name, kind: e.kind, path: e.path, bytes: e.bytes, mtime: e.mtime, sha256: e.sha256, disk: store.disk });
      console.log(`✔ [${i + 1}/${jobs.length}] ${lpad(size(e.bytes), 8)}  ${e.path}`);
    } catch (err) {
      failed.push(`${e.path}: ${err instanceof Error ? err.message : err}`);
      console.error(`✘ ${e.path}: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (failed.length) {
    console.error(`${failed.length} could not be restored:\n  ${failed.join('\n  ')}`);
    process.exit(1);
  }
};

try {
  if (cmd === 'scan') scan();
  else if (cmd === 'drives') printDrives();
  else if (cmd === 'clean') clean();
  else if (cmd === 'archive') await archive();
  else if (cmd === 'restore') await restore();
  else {
    console.error('Usage: npm run cleanup-out -w lyrics_videos -- scan | drives | clean | archive <name|path>... | restore <name|path>... (see scripts/cleanup-out.ts)');
    process.exit(1);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
