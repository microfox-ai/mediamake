/**
 * paths: where a production's files live, and what each file is. The one place that knows the
 * folder layout, so scripts that sweep across every production (cleanup-out today, sync and the
 * production-folder restructure later) follow it instead of hard-coding folders.
 *
 * Layout 1 (today): one production is spread over every folder named after it.
 *
 *   projects/<name>/            input, analysis, derived, footage* (sources) + scene code
 *   out/<name>/                 <name>.mp4 (final), v<N>/ (versions), clips, stills, parts… (work)
 *   out/<name>/shorts/<id>/     <name>-<id>-<format>.mp4 (finals), v<N>/, stills… ; picks-* (work)
 *   out/youtube/<name>/         the upload pack (finals)
 *   out/posters/<name>/         poster images + Spotify canvas (finals)
 *   out/thumbnails/<name>/      thumbnail sets (images)
 *   thumbnails/jobs/<name>/     thumbnail and poster job inputs (sources)
 *
 * Shared, never swept: brands/ (kits) and out/brands/ (brand renders, unless a path names them).
 * Rebuildable: out/_entry-*\/build and out/brands/.public (bundle and public-dir copies).
 * Outside this app: apps/mediamake/out (renders made by the mediamake app) is the group
 * "mediamake-renders".
 *
 * Only heavy files (video, audio, arrays, archives) are ever moved. Images, JSON, notes and code
 * always stay, so the skill library and the review screens keep working for archived work.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LAYOUT = 1;
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(ROOT, '..', '..');

export const DIRS = {
  projects: path.join(ROOT, 'projects'),
  out: path.join(ROOT, 'out'),
  brands: path.join(ROOT, 'brands'),
  brandRenders: path.join(ROOT, 'out', 'brands'),
  youtube: path.join(ROOT, 'out', 'youtube'),
  posters: path.join(ROOT, 'out', 'posters'),
  thumbnails: path.join(ROOT, 'out', 'thumbnails'),
  thumbnailJobs: path.join(ROOT, 'thumbnails', 'jobs'),
  mediamakeRenders: path.join(REPO, 'apps', 'mediamake', 'out'),
  /** cleanup-out's ledger of what went to which disk */
  cleanup: path.join(ROOT, 'out', '.cleanup'),
};

/** Folders under out/ that hold many productions (or none), not one. */
const SHARED_OUT = new Set(['brands', 'youtube', 'posters', 'thumbnails']);
/** Every folder a production named <name> can have files in, in layout 1. */
const PARENTS = [DIRS.projects, DIRS.out, DIRS.youtube, DIRS.posters, DIRS.thumbnails, DIRS.thumbnailJobs];
export const MEDIAMAKE_RENDERS = 'mediamake-renders';

export type Kind = 'final' | 'version' | 'work' | 'source';
export const KINDS: Kind[] = ['final', 'version', 'work', 'source'];

const HEAVY = new Set([
  '.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi', '.prores',
  '.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.aif', '.aiff', '.opus',
  '.npz', '.npy', '.pt', '.pth', '.onnx',
  '.zip', '.tgz', '.gz', '.tar', '.7z', '.blend', '.blend1',
]);
/** Video, audio, arrays and archives: the files that fill the disk and the only ones ever moved. */
export const isHeavy = (file: string) => HEAVY.has(path.extname(file).toLowerCase());

/** Repo-relative path with forward slashes (what the ledger and the disk copy use). */
export const repoPath = (abs: string) => path.relative(REPO, abs).split(path.sep).join('/');
export const fromRepoPath = (rel: string) => path.join(REPO, ...rel.split('/'));

const childDirs = (dir: string) =>
  fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('.')).map(d => d.name) : [];

/** Every production (or other group of work) by name: projects, out folders, packs, jobs. */
export const productionNames = () => {
  const names = new Set<string>();
  for (const parent of PARENTS)
    for (const name of childDirs(parent)) {
      if (parent === DIRS.out && (SHARED_OUT.has(name) || name.startsWith('_entry-'))) continue;
      names.add(name);
    }
  if (fs.existsSync(DIRS.mediamakeRenders)) names.add(MEDIAMAKE_RENDERS);
  return [...names].sort();
};

/** The folders a production's files are in (those that exist). */
export const productionDirs = (name: string) =>
  (name === MEDIAMAKE_RENDERS
    ? [DIRS.mediamakeRenders]
    : PARENTS.filter(p => !(p === DIRS.out && SHARED_OUT.has(name))).map(p => path.join(p, name))
  ).filter(d => fs.existsSync(d));

/** Rebuildable folders inside this app: safe to delete whenever nothing is rendering. */
export const rebuildableDirs = () => [
  ...childDirs(DIRS.out).filter(n => n.startsWith('_entry-')).map(n => path.join(DIRS.out, n, 'build')),
  path.join(DIRS.brandRenders, '.public'),
].filter(d => fs.existsSync(d));

/** A symlink under projects/ whose target is gone: `link` is its path inside the project. */
export type DanglingLink = { project: string; link: string; abs: string; target: string };

/**
 * Symlinks under projects/ whose target is missing (footage once linked from ~/Downloads, then
 * moved or deleted): the project that reads the file breaks. Links are listed, never followed or
 * removed; putting the file back or removing the link is the user's call.
 */
export const danglingLinks = (root = DIRS.projects): DanglingLink[] => {
  const found: DanglingLink[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      // existsSync follows the link, so it is false only when the target is gone
      else if (e.isSymbolicLink() && !fs.existsSync(abs)) {
        const [project, ...rest] = path.relative(root, abs).split(path.sep);
        found.push({ project, link: rest.join('/'), abs, target: path.resolve(dir, fs.readlinkSync(abs)) });
      }
    }
  };
  walk(root);
  return found;
};

/** Shared folders a sweep never touches unless a path names them. */
export const isProtected = (abs: string) =>
  [DIRS.brands, DIRS.brandRenders].some(d => abs === d || abs.startsWith(d + path.sep));

/**
 * What a heavy file is to its production:
 * - final: what ships (out/<name>/<name>.*, a short's own render, the YouTube pack, a poster's canvas,
 *   a loose file in an out folder that isn't a project's, the mediamake app's renders)
 * - version: anything inside a v<N>/ folder
 * - source: projects/<name>/ and thumbnail job inputs
 * - work: everything else (clips, stills, parts, previews, storyboards, picks)
 */
export const kindOf = (abs: string): Kind => {
  if (abs.startsWith(DIRS.mediamakeRenders + path.sep)) return 'final';
  const rel = path.relative(ROOT, abs).split(path.sep);
  if (rel.some(s => /^v\d+$/.test(s))) return 'version';
  if (rel[0] === 'projects' || (rel[0] === 'thumbnails' && rel[1] === 'jobs')) return 'source';
  if (rel[0] !== 'out') return 'work';
  if (rel[1] === 'youtube' || rel[1] === 'posters') return 'final';
  const [, name, ...rest] = rel;
  if (rest.length === 1) {
    // a loose file: the project's render, or one of a collection of deliverables (out/intros, …)
    const isProject = fs.existsSync(path.join(DIRS.projects, name));
    return !isProject || rest[0].startsWith(`${name}.`) ? 'final' : 'work';
  }
  // out/<name>/shorts/<id>/<file>: the short's render (picks-* are the stretch previews)
  if (rest[0] === 'shorts' && rest.length === 3 && !/picks/.test(rest[1])) return 'final';
  return 'work';
};
