/**
 * workspace: where your work lives, as opposed to the framework (this checkout). Every script, the
 * Remotion bundles (remotion.config.ts, scripts/bundle.ts), the mediamake app's dev routes and the
 * Python analysis ask here, or in a twin that follows the same rule, for these folders:
 *
 *   projects/          one folder per production: input, analysis, derived, scene code
 *   out/               renders, stills, review files, upload packs, brand renders
 *   brands/            brand kits (and each brand's graphics source)
 *   thumbnails/jobs/   thumbnail and poster jobs
 *   overlays/          stock overlay clips
 *   notes/             what sessions learn, per skill (lessons that used to be appended to SKILL.md)
 *   skills/            your skill variants
 *   extensions/        your scenes, graphics and catalog entries that aren't in the engine yet
 *
 * The rule:
 * - A workspace is set by MEDIAMAKE_WORKSPACE, else by `workspace` in ~/.mediamake/config.json (next
 *   to `library`; MEDIAMAKE_CONFIG points at another file). When one is set, every folder is
 *   <workspace>/<folder>, so the workspace is laid out like apps/studio and the relative imports a
 *   project makes (../../../src/kit) still mean the same thing (workspace-webpack.ts for the bundles,
 *   workspace-node.ts for project code that Node or esbuild loads).
 * - When none is set, the folders that were always in apps/studio (projects, out, brands,
 *   thumbnails/jobs, overlays) stay there: nothing moves until `mm migrate` moves it and sets the
 *   workspace. The folders that are new (notes, skills, extensions) are in ~/MediaMake already.
 *
 * Everything is read when it is asked for, never cached, so a test can set MEDIAMAKE_WORKSPACE per case.
 * No import.meta here: remotion.config.ts loads this file as CommonJS (where import.meta is empty and
 * esbuild warns about it), so the folders that can be in apps/studio take that folder as an argument
 * (paths.ts passes its ROOT; remotion.config.ts passes the folder Remotion runs it in).
 *
 * Twins that must follow the same rule: apps/mediamake/lib/remotion-editor/server/workspace.ts (the
 * app's dev routes) and analysis/workspace.py (the Python analysis). workspace.test.ts checks them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { configFile, expandHome } from './library/config.ts';

/** The workspace when nothing names one: where `mm migrate` moves your work. */
export const DEFAULT_WORKSPACE = '~/MediaMake';

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

/** The folders that were in apps/studio before the workspace, and stay there until one is set. */
export const STUDIO_FOLDERS: readonly WorkspaceFolder[] = ['projects', 'out', 'brands', 'thumbnailJobs', 'overlays'];

export type WorkspaceSetting = { root: string; from: 'env' | 'config' };

/** The workspace named by MEDIAMAKE_WORKSPACE or the config file, or null when neither names one. */
export const workspaceSetting = (): WorkspaceSetting | null => {
  const env = process.env.MEDIAMAKE_WORKSPACE?.trim();
  if (env) return { root: path.resolve(expandHome(env)), from: 'env' };
  let value: unknown;
  try {
    value = (JSON.parse(fs.readFileSync(configFile(), 'utf8')) as { workspace?: unknown })?.workspace;
  } catch {
    return null;
  }
  return typeof value === 'string' && value.trim() ? { root: path.resolve(expandHome(value.trim())), from: 'config' } : null;
};

export const isWorkspaceSet = () => workspaceSetting() !== null;

/** The workspace folder: the one set, else ~/MediaMake (which holds notes, skills and extensions either way). */
export const workspaceRoot = () => workspaceSetting()?.root ?? path.resolve(expandHome(DEFAULT_WORKSPACE));

/**
 * Where one of the workspace's folders is. `studio` (apps/studio) is needed for the folders that can
 * still be there (STUDIO_FOLDERS) when no workspace is set; notes, skills and extensions never are.
 */
export const workspaceDir = (name: WorkspaceFolder, studio?: string): string => {
  const rel = WORKSPACE_FOLDERS[name];
  if (!rel) throw new Error(`No workspace folder "${name}" (${Object.keys(WORKSPACE_FOLDERS).join(', ')})`);
  const set = workspaceSetting();
  if (set) return path.join(set.root, ...rel.split('/'));
  if (STUDIO_FOLDERS.includes(name)) {
    if (!studio) throw new Error(`workspaceDir('${name}') needs the studio folder while no workspace is set (paths.ts DIRS has it)`);
    return path.join(path.resolve(studio), ...rel.split('/'));
  }
  return path.join(path.resolve(expandHome(DEFAULT_WORKSPACE)), ...rel.split('/'));
};

/** Every workspace folder at once. */
export const workspaceDirs = (studio: string) =>
  Object.fromEntries(Object.keys(WORKSPACE_FOLDERS).map(k => [k, workspaceDir(k as WorkspaceFolder, studio)])) as Record<WorkspaceFolder, string>;

const inside = (dir: string, abs: string) => abs === dir || abs.startsWith(dir + path.sep);

/**
 * A path as the studio has always named it ("projects/<slug>/video/index.tsx", "out/<slug>/<slug>.mp4",
 * "src/kit"): what logs, review links and the app's dev routes store and pass around, so they mean the
 * same file wherever the workspace is. A path in neither the workspace nor the studio stays absolute.
 */
export const toStudioPath = (abs: string, studio: string) => {
  const p = path.resolve(abs);
  // the deepest folder first (thumbnails/jobs before a workspace that is the studio itself)
  const dirs = (Object.keys(WORKSPACE_FOLDERS) as WorkspaceFolder[])
    .map(k => [WORKSPACE_FOLDERS[k], workspaceDir(k, studio)] as const)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [rel, dir] of dirs) if (inside(dir, p)) return [rel, ...path.relative(dir, p).split(path.sep)].filter(Boolean).join('/');
  return inside(path.resolve(studio), p) ? path.relative(studio, p).split(path.sep).join('/') : p;
};

/** The file a studio path names (the other way from toStudioPath). Absolute paths are kept. */
export const fromStudioPath = (rel: string, studio: string) => {
  if (path.isAbsolute(rel)) return rel;
  const parts = rel.split(/[\\/]/).filter(p => p && p !== '.');
  const joined = parts.join('/');
  const match = (Object.keys(WORKSPACE_FOLDERS) as WorkspaceFolder[])
    .filter(k => joined === WORKSPACE_FOLDERS[k] || joined.startsWith(`${WORKSPACE_FOLDERS[k]}/`))
    .sort((a, b) => WORKSPACE_FOLDERS[b].length - WORKSPACE_FOLDERS[a].length)[0];
  if (!match) return path.join(path.resolve(studio), ...parts);
  return path.join(workspaceDir(match, studio), ...parts.slice(WORKSPACE_FOLDERS[match].split('/').length));
};
