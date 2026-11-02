/**
 * backup: copies of finished work (renders, masters, anything the user wants kept) on an external
 * disk, classified by channel, with a manifest so any file can be found and restored later, even
 * while the disk is unplugged.
 *
 *   staging   <deliverRoot>/_BACKUP/<CHANNEL>/<as>/<file>    APFS clones of the originals (no extra space)
 *   the disk  <disk>/MediaMake Backup/<CHANNEL>/<as>/<file>   real copies, each checked against its SHA-256
 *   manifest  <library>/.catalog/backup/manifest.jsonl, and   one line per staged, copied or restored file
 *             <disk>/MediaMake Backup/manifest.jsonl
 *
 * The catalog's manifest outlives the staging folder, so a search works with the disk unplugged and
 * the clones gone; a connected disk's own manifest is read too. Restoring needs the disk (or the
 * staged clone, while it's still here).
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expandHome } from './config.ts';
import { knownHash, type Lib } from './lib.ts';
import { cloneOnly, freePath, now, readJson, sha256File, writeJson } from './sys.ts';

export const DISK_FOLDER = 'MediaMake Backup';

export type BackupEntry = {
  at: string;
  action: 'staged' | 'copied' | 'restored';
  /** the channel's folder name in Downloads (AMZ, GIZ…) */
  channel: string;
  /** what kind of thing it is (renders, masters…): the folder under the channel */
  as: string;
  name: string;
  /** path inside the backup: <channel>/<as>/<name> */
  rel: string;
  /** where the original was */
  from: string;
  bytes: number;
  mtime: number;
  sha256: string;
  disk?: { id: string; name: string };
  /** where a restore put it */
  to?: string;
};

export const backupRoot = (lib: Lib) => expandHome((lib.cfg as { backup?: string }).backup ?? path.join(lib.cfg.deliverRoot, '_BACKUP'));
export const localManifest = (lib: Lib) => path.join(lib.catalog, 'backup', 'manifest.jsonl');
const diskManifest = (target: string) => path.join(target, 'manifest.jsonl');

export const readManifest = (file: string): BackupEntry[] =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as BackupEntry) : [];
const append = (file: string, e: BackupEntry) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(e) + '\n');
};

/** The catalog's manifest plus those of the backup disks connected now (each line once). */
const allEntries = (lib: Lib) => {
  const seen = new Set<string>();
  const out: BackupEntry[] = [];
  const disks = drives().filter(d => d.backup).map(d => diskManifest(path.join(d.mount, DISK_FOLDER)));
  for (const e of [localManifest(lib), ...disks].flatMap(readManifest)) {
    const key = `${e.action}|${e.rel}|${e.at}|${e.disk?.id ?? ''}`;
    if (!seen.has(key)) out.push(e);
    seen.add(key);
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
};

/** A channel id (getintozone) or its folder (GIZ) → the folder name the backup is classified by. */
export const channelFolder = (lib: Lib, channel: string) => {
  const byId = lib.cfg.channels[channel];
  if (byId) return byId;
  const folder = Object.values(lib.cfg.channels).find(f => f.toLowerCase() === channel.toLowerCase());
  if (folder) return folder;
  throw new Error(`Unknown channel "${channel}". Known: ${Object.entries(lib.cfg.channels).map(([id, f]) => `${id} (${f})`).join(', ')} (add it to ~/.mediamake/config.json)`);
};

const filesIn = (p: string): string[] =>
  fs.statSync(p).isDirectory()
    ? fs.readdirSync(p).filter(f => !f.startsWith('.')).flatMap(f => filesIn(path.join(p, f)))
    : [p];

/** Stage files for the next disk copy: clones under <backup>/<channel>/<as>/, one manifest line each. */
export const stage = async (lib: Lib, paths: string[], o: { channel: string; as: string; yes?: boolean }) => {
  const root = backupRoot(lib);
  const channel = channelFolder(lib, o.channel);
  const staged = new Map(readManifest(localManifest(lib)).filter(e => e.action === 'staged').map(e => [e.from, e]));
  const plan: { from: string; dest: string; bytes: number; again: boolean }[] = [];
  for (const p of paths.flatMap(filesIn)) {
    const st = fs.statSync(p);
    const before = staged.get(p);
    const again = !!before && before.bytes === st.size && fs.existsSync(path.join(root, before.rel));
    plan.push({ from: p, dest: path.join(root, channel, o.as, path.basename(p)), bytes: st.size, again });
  }
  if (!o.yes) return { root, channel, plan, done: 0 };
  let done = 0;
  for (const s of plan.filter(s => !s.again)) {
    const dest = freePath(s.dest);
    // a clone or nothing: a full copy would double the space until the disk takes it
    if (!cloneOnly(s.from, dest)) throw new Error(`Couldn't clone ${s.from} into ${root} (not on the same APFS disk?)`);
    const st = fs.statSync(s.from);
    append(localManifest(lib), {
      at: now(), action: 'staged', channel, as: o.as, name: path.basename(dest), rel: path.relative(root, dest),
      from: s.from, bytes: st.size, mtime: st.mtimeMs, sha256: knownHash(lib, s.from, st) ?? (await sha256File(s.from)),
    });
    done++;
  }
  return { root, channel, plan, done };
};

export type Drive = { mount: string; name: string; free: number; total: number; writable: boolean; backup: boolean };

/** Where disks mount (MEDIA_VOLUMES points the tests at a folder of their own). */
const volumes = () => process.env.MEDIA_VOLUMES ?? '/Volumes';

/** External disks (the system disk is a link under /Volumes, so it's left out). */
export const drives = (): Drive[] =>
  (fs.existsSync(volumes()) ? fs.readdirSync(volumes(), { withFileTypes: true }) : [])
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => {
      const mount = path.join(volumes(), d.name);
      const s = fs.statfsSync(mount);
      let writable = true;
      try {
        fs.accessSync(mount, fs.constants.W_OK);
      } catch {
        writable = false;
      }
      return { mount, name: d.name, free: s.bavail * s.bsize, total: s.blocks * s.bsize, writable, backup: fs.existsSync(path.join(mount, DISK_FOLDER, 'backup.json')) };
    });

/** A volume name (T7) or a folder (/Volumes/T7, or any folder for a test) → the backup folder on it. */
export const diskOf = (arg: string, create = false) => {
  const mount = arg.startsWith('/') ? arg : path.join(volumes(), arg);
  if (!fs.existsSync(mount)) throw new Error(`${mount} isn't there: is the disk connected? (media backup drives)`);
  const root = path.join(mount, DISK_FOLDER);
  const marker = path.join(root, 'backup.json');
  let meta = readJson<{ id: string }>(marker);
  if (!meta && create) {
    meta = { id: randomUUID() };
    writeJson(marker, { schema: 'mediamake.backup/v1', ...meta, created: now(), machine: os.hostname() });
  }
  return { root, disk: { id: meta?.id ?? '', name: path.basename(mount) } };
};

/** Every file copied to a backup disk, by hash → the disk's name: once its last copy here goes, the item is cold, not missing. */
export const backedUp = (lib: Lib) =>
  new Map(readManifest(localManifest(lib)).filter(e => e.action === 'copied' && e.disk).map(e => [e.sha256, e.disk!.name]));

/** The latest line for each file in the backup, and which disks hold it. */
export const state = (entries: BackupEntry[]) => {
  const files = new Map<string, { entry: BackupEntry; disks: Map<string, string> }>();
  for (const e of entries) {
    if (e.action === 'restored') continue;
    const f = files.get(e.rel) ?? { entry: e, disks: new Map() };
    if (e.action === 'staged') f.entry = e;
    if (e.action === 'copied' && e.disk) f.disks.set(e.disk.id, e.disk.name);
    files.set(e.rel, f);
  }
  return files;
};

/** Copy what's staged and not on this disk yet; every copy is read back and checked against its hash. */
export const copyToDisk = async (lib: Lib, diskArg: string, o: { yes?: boolean; log?: (s: string) => void } = {}) => {
  const root = backupRoot(lib);
  const { root: target, disk } = diskOf(diskArg, !!o.yes);
  const onDisk = new Set(readManifest(diskManifest(target)).filter(e => e.action === 'copied').map(e => e.rel));
  const todo = [...state(readManifest(localManifest(lib))).values()]
    .map(f => f.entry)
    .filter(e => !(onDisk.has(e.rel) && fs.existsSync(path.join(target, e.rel))) && fs.existsSync(path.join(root, e.rel)));
  const bytes = todo.reduce((n, e) => n + e.bytes, 0);
  const free = fs.statfsSync(path.dirname(target));
  if (bytes > free.bavail * free.bsize) throw new Error(`Not enough space on ${disk.name}: ${todo.length} files need ${bytes} bytes`);
  if (!o.yes) return { target, disk, todo, bytes, done: 0, bad: [] as string[] };
  let done = 0;
  const bad: string[] = [];
  for (const e of todo) {
    const src = path.join(root, e.rel);
    const dest = path.join(target, e.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    if ((await sha256File(dest)) !== e.sha256) {
      fs.rmSync(dest, { force: true });
      bad.push(e.rel);
      continue;
    }
    const line: BackupEntry = { ...e, at: now(), action: 'copied', disk };
    // the disk carries its own manifest, so it can be read on any Mac
    append(diskManifest(target), { ...e, action: 'staged' });
    append(diskManifest(target), line);
    append(localManifest(lib), line);
    done++;
    o.log?.(`  ✔ ${e.rel}`);
  }
  return { target, disk, todo, bytes, done, bad };
};

const matches = (e: BackupEntry, words: string[], channel?: string) =>
  (!channel || e.channel.toLowerCase() === channel.toLowerCase()) &&
  words.every(w => `${e.rel} ${path.basename(e.from)}`.toLowerCase().includes(w.toLowerCase()));

/** What the backup holds: each file, whether its clone is still here, and the disks it's on. */
export const listBackup = (lib: Lib, words: string[], o: { channel?: string; disk?: string } = {}) => {
  const root = backupRoot(lib);
  return [...state(allEntries(lib)).values()]
    .filter(f => matches(f.entry, words, o.channel) && (!o.disk || [...f.disks.values()].includes(o.disk)))
    .map(f => ({ ...f.entry, here: fs.existsSync(path.join(root, f.entry.rel)), disks: [...f.disks.values()] }));
};

/**
 * Copy files back from the disk (or from the staged clone when no disk is given), checked against
 * the manifest's hash. They go to --to, else back where they were when that place is free, else to
 * the channel's folder (<deliverRoot>/<CHANNEL>/restored/).
 */
export const restore = async (lib: Lib, words: string[], o: { from?: string; to?: string; channel?: string; yes?: boolean } = {}) => {
  const root = backupRoot(lib);
  const source = o.from ? diskOf(o.from).root : root;
  const picks = listBackup(lib, words, { channel: o.channel }).map(e => {
    const dest = o.to
      ? path.join(expandHome(o.to), e.name)
      : !fs.existsSync(e.from)
        ? e.from
        : path.join(lib.cfg.deliverRoot, e.channel, 'restored', e.name);
    return { entry: e, src: path.join(source, e.rel), dest, available: fs.existsSync(path.join(source, e.rel)) };
  });
  if (!o.yes) return { source, picks, done: 0, bad: [] as string[] };
  let done = 0;
  const bad: string[] = [];
  for (const p of picks.filter(p => p.available)) {
    const dest = freePath(p.dest);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (source !== root || !cloneOnly(p.src, dest)) fs.copyFileSync(p.src, dest);
    if ((await sha256File(dest)) !== p.entry.sha256) {
      fs.rmSync(dest, { force: true });
      bad.push(p.entry.rel);
      continue;
    }
    append(localManifest(lib), { ...p.entry, at: now(), action: 'restored', to: dest });
    p.dest = dest;
    done++;
  }
  return { source, picks, done, bad };
};
