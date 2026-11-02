/**
 * dedupe: byte-identical copies become APFS clones of one file. Every path stays where it is, with
 * the same content and its own dates; only the disk space comes back. Nothing is deleted.
 *
 * The file kept is the best placed copy (the library's, then brands', out/'s, a project's…).
 * Never replaced: brands/, out/brands/ and apps/mediamake/out (they can be the copy kept),
 * git-tracked files, files changed in the last 15 minutes or open in another program, a copy whose
 * file changed since the scan, and copies on another disk than the one kept. Run `media scan` first.
 * Copies that are already clones (one APFS clone id, see clones.py) are left alone and count once,
 * so the space it says comes back is what really comes back.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DIRS, REPO } from '../paths.ts';
import type { Role } from './db.ts';
import { absOf, rank, relOf, type Lib } from './lib.ts';
import { trackedFiles } from './scan.ts';
import { clone, cloneIds, openFiles, size } from './sys.ts';

const RECENT = 15 * 60_000;

type Copy = { path: string; abs: string; role: Role; bytes: number; mtime: number; ino: number };
export type Swap = { keep: string; replace: string; bytes: number; skip?: string };
/** One file's copies; `streams` = how many separate copies of its bytes the disk holds (clones count once). */
type Group = { keep: string; size: number; files: { abs: string; id: string }[]; streams: number; frees: number };

/** A copy's data stream: its APFS clone id, else its inode (hard links share one). */
const streamOf = (ids: Map<string, string>, abs: string) => ids.get(abs) ?? `ino:${fs.statSync(abs).ino}`;
const streamCount = (g: Group, ids: Map<string, string>) => new Set(g.files.map(f => (fs.existsSync(f.abs) ? streamOf(ids, f.abs) : f.id))).size;

export const planDedupe = (lib: Lib, opts: { minBytes?: number } = {}) => {
  const protectedDirs = [lib.brands, DIRS.brandRenders, path.join(REPO, 'apps', 'mediamake', 'out')];
  const isProtected = (abs: string) => protectedDirs.some(d => abs === d || abs.startsWith(d + path.sep));
  const tracked = trackedFiles();
  const sets = (
    lib.db.prepare('SELECT item_id FROM locations GROUP BY item_id HAVING COUNT(*) > 1 AND MAX(bytes) >= ?').all(opts.minBytes ?? 1_000_000) as { item_id: string }[]
  )
    .map(({ item_id }) =>
      (lib.db.prepare('SELECT path, role, bytes, mtime, ino FROM locations WHERE item_id = ?').all(item_id) as Omit<Copy, 'abs'>[])
        .map(c => ({ ...c, abs: absOf(lib, c.path) }))
        .filter(c => fs.existsSync(c.abs)),
    )
    .filter(copies => copies.length > 1);
  const ids = cloneIds(sets.flat().map(c => c.abs));
  const swaps: Swap[] = [];
  const groups: Group[] = [];
  for (const copies of sets) {
    const keep = [...copies].sort((a, b) => rank(a.role) - rank(b.role) || a.mtime - b.mtime)[0];
    const keepDev = fs.statSync(keep.abs).dev;
    const files = copies.map(c => ({ abs: c.abs, id: streamOf(ids, c.abs) }));
    const keepId = files.find(f => f.abs === keep.abs)!.id;
    const mine: Swap[] = [];
    for (const c of copies) {
      if (c === keep) continue;
      const st = fs.statSync(c.abs);
      const skip =
        files.find(f => f.abs === c.abs)!.id === keepId
          ? 'already a clone of the kept copy'
          : isProtected(c.abs)
            ? 'kept as it is (brands and mediamake renders are never replaced)'
            : tracked.has(c.abs)
              ? 'tracked by git'
              : st.dev !== keepDev
                ? 'on another disk'
                : Date.now() - st.mtimeMs < RECENT
                  ? 'changed in the last 15 minutes'
                  : st.size !== c.bytes || Math.abs(st.mtimeMs - c.mtime) >= 1 || st.ino !== c.ino
                    ? 'changed since the scan (run media scan again)'
                    : undefined;
      mine.push({ keep: keep.abs, replace: c.abs, bytes: c.bytes, skip });
    }
    // what comes back: the separate copies of the bytes that stop existing once the swaps are done
    const swapped = new Set(mine.filter(s => !s.skip).map(s => s.replace));
    const group = { keep: keep.abs, size: keep.bytes, files, streams: new Set(files.map(f => f.id)).size, frees: 0 };
    group.frees = (group.streams - new Set(files.map(f => (swapped.has(f.abs) ? keepId : f.id))).size) * keep.bytes;
    // a copy that shares its bytes with one that stays gains nothing
    if (swapped.size && !group.frees) for (const s of mine) s.skip ??= 'shares its bytes with a copy that stays';
    if (group.frees) groups.push(group);
    swaps.push(...mine);
  }
  const go = swaps.filter(s => !s.skip);
  return { swaps, go, groups, bytes: groups.reduce((a, g) => a + g.frees, 0) };
};

/** Put a clone of `keep` where `replace` is, keeping replace's own dates and permissions. */
const swap = (lib: Lib, s: Swap) => {
  const st = fs.statSync(s.replace);
  const tmp = path.join(path.dirname(s.replace), `.${path.basename(s.replace)}.dedupe-${process.pid}`);
  clone(s.keep, tmp);
  if (fs.statSync(tmp).size !== st.size) {
    fs.rmSync(tmp, { force: true });
    throw new Error(`clone of ${s.keep} came out a different size`);
  }
  fs.chmodSync(tmp, st.mode);
  fs.utimesSync(tmp, st.atime, st.mtime);
  fs.renameSync(tmp, s.replace);
  const now = fs.statSync(s.replace);
  lib.db.prepare('UPDATE locations SET ino = ?, mtime = ? WHERE path = ?').run(now.ino, now.mtimeMs, relOf(lib, s.replace));
};

export const dedupe = (lib: Lib, opts: { yes?: boolean; minBytes?: number } = {}) => {
  const plan = planDedupe(lib, opts);
  if (!opts.yes) return { ...plan, done: 0, failed: [] as string[] };
  let swapped = 0;
  const failed: string[] = [];
  let open = openFiles();
  let openAt = Date.now();
  for (const s of plan.go) {
    // listed again every few seconds, so a render that starts meanwhile is seen
    if (Date.now() - openAt > 5000) [open, openAt] = [openFiles(), Date.now()];
    if (open.has(s.replace)) {
      failed.push(`${s.replace}: open in another program`);
      continue;
    }
    try {
      swap(lib, s);
      swapped += s.bytes;
    } catch (err) {
      failed.push(`${s.replace}: ${err instanceof Error ? err.message : err}`);
    }
  }
  // measured, not assumed: how many separate copies each group holds now
  const ids = cloneIds(plan.groups.flatMap(g => g.files.map(f => f.abs)));
  const done = ids.size ? plan.groups.reduce((a, g) => a + Math.max(0, g.streams - streamCount(g, ids)) * g.size, 0) : swapped;
  return { ...plan, done, failed };
};

export const printDedupe = (lib: Lib, plan: ReturnType<typeof planDedupe>, list: boolean) => {
  const top = [...plan.groups].sort((a, b) => b.frees - a.frees);
  for (const g of list ? top : top.slice(0, 15)) {
    lib.log(`${size(g.frees).padStart(8)}  keep ${g.keep}`);
    for (const s of plan.go.filter(s => s.keep === g.keep)) lib.log(`          clone → ${s.replace}`);
  }
  if (!list && top.length > 15) lib.log(`  … ${top.length - 15} more groups (--list shows all)`);
  const skipped = plan.swaps.filter(s => s.skip);
  if (skipped.length) {
    const why = new Map<string, number>();
    for (const s of skipped) why.set(s.skip!, (why.get(s.skip!) ?? 0) + 1);
    for (const [w, count] of why) lib.log(`  skipped ${count}: ${w}`);
  }
};
