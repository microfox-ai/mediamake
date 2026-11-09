/**
 * paths: where a production's files live, and what each file is. The one place that knows the
 * folder layout, so scripts that sweep across every production (cleanup-out today, sync and the
 * production-folder restructure later) follow it instead of hard-coding folders.
 *
 * Layout 2 (2026-11-02) keeps layout 1's folders and adds the shared media library, outside the
 * repo (scripts/library, `mm media`): sources live there once and projects hold APFS clones
 * of what they use; approved outputs are delivered to the channel folders in Downloads. Library
 * files are the library's own business; cleanup-out still sweeps only the folders below.
 *
 * Layout 1: one production is spread over every folder named after it.
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
 *
 * Where these folders are comes from the workspace (scripts/workspace.ts): still apps/studio until a
 * workspace is set, then ~/MediaMake (or wherever it is). ROOT is always apps/studio, the framework;
 * never join ROOT with projects, out, brands, thumbnails/jobs or overlays: use DIRS.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromStudioPath, toStudioPath, workspaceDirs } from './workspace.ts';

export const LAYOUT = 2;
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(ROOT, '..', '..');

const WS = workspaceDirs(ROOT);

export const DIRS = {
  projects: WS.projects,
  out: WS.out,
  brands: WS.brands,
  brandRenders: path.join(WS.out, 'brands'),
  youtube: path.join(WS.out, 'youtube'),
  posters: path.join(WS.out, 'posters'),
  thumbnails: path.join(WS.out, 'thumbnails'),
  thumbnailJobs: WS.thumbnailJobs,
  overlays: WS.overlays,
  /** what sessions learn, per skill: <notes>/<skill>.md */
  notes: WS.notes,
  /** your skill variants */
  skills: WS.skills,
  /** your scenes, graphics and catalog entries that aren't in the engine yet */
  extensions: WS.extensions,
  mediamakeRenders: path.join(REPO, 'apps', 'mediamake', 'out'),
  /** cleanup-out's ledger of what went to which disk */
  cleanup: path.join(WS.out, '.cleanup'),
};

/**
 * A file as the studio names it ("projects/<slug>/input/song.mp3", "out/<slug>/<slug>.mp4"), wherever the
 * workspace is: for what is written down (render logs, review links, the library) and shown.
 */
export const studioPath = (abs: string) => toStudioPath(abs, ROOT);
/** The file a studio path names ("out/<slug>/<slug>.mp4" → the workspace's out). */
export const fromStudio = (rel: string) => fromStudioPath(rel, ROOT);

/**
 * A path to print: as the studio names it while it is in apps/studio ("out/<slug>/<slug>.mp4", as
 * always), else in full with ~ for the home folder ("~/MediaMake/out/<slug>/<slug>.mp4"), so it can be
 * opened or pasted from wherever you are.
 */
export const shown = (abs: string) => {
  const p = path.resolve(abs);
  if (p === ROOT || p.startsWith(ROOT + path.sep)) return path.relative(ROOT, p);
  const home = os.homedir();
  return p.startsWith(home + path.sep) ? `~/${path.relative(home, p)}` : p;
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

const STUDIO_IN_REPO = path.relative(REPO, ROOT).split(path.sep).join('/');

/**
 * Repo-relative path with forward slashes (what the ledger and the disk copy use). Work in the workspace
 * keeps the name it had in apps/studio ("apps/studio/out/<slug>/…"), so ledger entries and the copies on
 * a disk still match after the workspace moves out of the repo.
 */
export const repoPath = (abs: string) => {
  const s = studioPath(abs);
  return path.isAbsolute(s) ? path.relative(REPO, abs).split(path.sep).join('/') : `${STUDIO_IN_REPO}/${s}`;
};
export const fromRepoPath = (rel: string) =>
  rel.startsWith(`${STUDIO_IN_REPO}/`) ? fromStudio(rel.slice(STUDIO_IN_REPO.length + 1)) : path.join(REPO, ...rel.split('/'));

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
  // as the studio names it (projects/…, out/…, thumbnails/jobs/…), wherever the workspace is
  const rel = studioPath(abs).split('/');
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
