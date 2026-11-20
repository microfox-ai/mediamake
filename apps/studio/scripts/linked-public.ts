/**
 * linked-public: Remotion bundles whose public dir is linked, never copied, on every platform.
 *
 * bundle({ symlinkPublicDir: true }) links the public dir on macOS and Linux, but on Windows
 * @remotion/bundler skips the symlink (one needs Developer Mode or admin there) and copies the whole
 * folder instead. Our public dir is the workspace's projects/ (many GB), so on Windows every kept
 * bundle was a full copy of it, and eight of them filled C: (2026-11-19). A directory junction needs
 * no privilege: on Windows the bundle is made over an empty public dir and `public` then becomes a
 * junction to the real one.
 *
 * One difference: Remotion lists the public dir's files in index.html (getStaticFiles(), capped at
 * 10 000). Over a junction the list is empty, which the studio's code reads as "unknown, fetch it"
 * (kit/edits.tsx), so nothing is missed.
 *
 * Removing a bundle (removeBundleDir) unlinks its `public` first, so only the link goes, never the
 * projects it points to (fs.rmSync also leaves a junction's target alone: checked on Node 26, Windows).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bundle, type BundleOptions } from '@remotion/bundler';

const WIN = process.platform === 'win32';

const isLink = (p: string) => {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};

/** bundle() with options.publicDir linked into the bundle as `public` (a junction on Windows). */
export async function bundleLinked(options: BundleOptions): Promise<string> {
  const real = options.publicDir && path.isAbsolute(options.publicDir) ? options.publicDir : null;
  if (!WIN || !real || !fs.existsSync(real)) return bundle({ symlinkPublicDir: true, ...options });
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-empty-public-'));
  let out: string;
  try {
    out = await bundle({ ...options, symlinkPublicDir: true, publicDir: empty });
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
  const link = path.join(out, 'public');
  if (isLink(link)) fs.unlinkSync(link);
  // the copy of the empty folder: rmdir only removes an empty one
  else if (fs.existsSync(link)) fs.rmdirSync(link);
  fs.symlinkSync(real, link, 'junction');
  return out;
}

/** Whether a bundle's `public` is a link (not a copy). */
export const publicIsLinked = (bundleDir: string) => isLink(path.join(bundleDir, 'public'));

/**
 * Removes a bundle folder, or a folder of bundles (a project's in the store): every `public` link in
 * it is unlinked first, then the rest is removed. The projects a link points to are never touched.
 */
export function removeBundleDir(dir: string) {
  const links = [path.join(dir, 'public')];
  try {
    // one level down (a project's bundles), never through a link (dir/public/… is the projects)
    for (const e of fs.readdirSync(dir, { withFileTypes: true }))
      if (e.isDirectory() && !e.isSymbolicLink()) links.push(path.join(dir, e.name, 'public'));
  } catch {
    // not there, or not a folder
  }
  for (const l of links) if (isLink(l)) fs.unlinkSync(l);
  fs.rmSync(dir, { recursive: true, force: true });
}

/** The bytes in a folder, links not followed (a linked public dir counts as nothing). */
export function sizeOf(dir: string): number {
  let total = 0;
  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(p);
      else
        try {
          total += fs.lstatSync(p).size;
        } catch {
          // gone meanwhile
        }
    }
  };
  walk(dir);
  return total;
}

/** Free bytes on the disk that holds `dir`, or null when it can't be read. */
export function freeSpace(dir: string): number | null {
  try {
    const s = fs.statfsSync(dir);
    return s.bavail * s.bsize;
  } catch {
    return null;
  }
}
