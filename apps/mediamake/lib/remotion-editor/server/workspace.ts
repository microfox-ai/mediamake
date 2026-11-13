import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
 * Where the studio's work lives, for the dev routes (development only): the twin of
 * apps/studio/scripts/workspace.ts, which says why. The same rule:
 *
 * - A workspace is set by MEDIAMAKE_WORKSPACE, else by `workspace` in ~/.mediamake/config.json
 *   (MEDIAMAKE_CONFIG points at another file). Then every folder is <workspace>/<folder>.
 * - When none is set, projects, out, brands, thumbnails/jobs and overlays stay in apps/studio; notes,
 *   skills and extensions are in ~/MediaMake.
 *
 * The routes keep naming files as the studio always has (projects/<slug>/video/index.tsx, src/kit,
 * out/<slug>/…), so the editor compiles a project's relative imports of the engine the same way
 * wherever the project is. apps/studio/scripts/workspace.test.ts checks this file against the studio's.
 */

const DEFAULT_WORKSPACE = '~/MediaMake';

export const WORKSPACE_FOLDERS = {
  projects: 'projects',
  out: 'out',
  brands: 'brands',
  thumbnailJobs: 'thumbnails/jobs',
  overlays: 'overlays',
  notes: 'notes',
  skills: 'skills',
  extensions: 'extensions',
} as const;

export type WorkspaceFolder = keyof typeof WORKSPACE_FOLDERS;

const STUDIO_FOLDERS: readonly WorkspaceFolder[] = ['projects', 'out', 'brands', 'thumbnailJobs', 'overlays'];

const expandHome = (p: string) =>
  p === '~' ? os.homedir() : p.startsWith('~/') || (path.sep === '\\' && p.startsWith('~\\')) ? path.join(os.homedir(), p.slice(2)) : p;

const configFile = () =>
  process.env.MEDIAMAKE_CONFIG ?? path.join(os.homedir(), '.mediamake', 'config.json');

/** The workspace named by MEDIAMAKE_WORKSPACE or the config file, or null when neither names one. */
export function workspaceSetting(): { root: string; from: 'env' | 'config' } | null {
  const env = process.env.MEDIAMAKE_WORKSPACE?.trim();
  if (env) return { root: path.resolve(expandHome(env)), from: 'env' };
  let value: unknown;
  try {
    value = (JSON.parse(fs.readFileSync(configFile(), 'utf8')) as { workspace?: unknown })?.workspace;
  } catch {
    return null;
  }
  return typeof value === 'string' && value.trim()
    ? { root: path.resolve(expandHome(value.trim())), from: 'config' }
    : null;
}

/** Where one of the workspace's folders is; `studio` is apps/studio. */
export function workspaceDir(name: WorkspaceFolder, studio: string): string {
  const rel = WORKSPACE_FOLDERS[name].split('/');
  const set = workspaceSetting();
  if (set) return path.join(set.root, ...rel);
  if (STUDIO_FOLDERS.includes(name)) return path.join(path.resolve(studio), ...rel);
  return path.join(path.resolve(expandHome(DEFAULT_WORKSPACE)), ...rel);
}

const inside = (dir: string, abs: string) => abs === dir || abs.startsWith(dir + path.sep);

const byDepth = (studio: string) =>
  (Object.keys(WORKSPACE_FOLDERS) as WorkspaceFolder[])
    .map(k => ({ rel: WORKSPACE_FOLDERS[k], dir: workspaceDir(k, studio) }))
    .sort((a, b) => b.dir.length - a.dir.length);

/** A file as the studio names it (projects/…, out/…, src/…), or the absolute path when it is in neither. */
export function toStudioPath(abs: string, studio: string): string {
  const p = path.resolve(abs);
  for (const { rel, dir } of byDepth(studio)) {
    if (inside(dir, p)) return [rel, ...path.relative(dir, p).split(path.sep)].filter(Boolean).join('/');
  }
  return inside(path.resolve(studio), p) ? path.relative(studio, p).split(path.sep).join('/') : p;
}

/** The file a studio path names. */
export function fromStudioPath(rel: string, studio: string): string {
  if (path.isAbsolute(rel)) return rel;
  const parts = rel.split(/[\\/]/).filter(p => p && p !== '.');
  const joined = parts.join('/');
  const match = (Object.keys(WORKSPACE_FOLDERS) as WorkspaceFolder[])
    .filter(k => joined === WORKSPACE_FOLDERS[k] || joined.startsWith(`${WORKSPACE_FOLDERS[k]}/`))
    .sort((a, b) => WORKSPACE_FOLDERS[b].length - WORKSPACE_FOLDERS[a].length)[0];
  if (!match) return path.join(path.resolve(studio), ...parts);
  return path.join(workspaceDir(match, studio), ...parts.slice(WORKSPACE_FOLDERS[match].split('/').length));
}

/** The folders a studio path may resolve into: the studio and every workspace folder. */
export function allowedRoots(studio: string): string[] {
  return [path.resolve(studio), ...byDepth(studio).map(d => d.dir)];
}
