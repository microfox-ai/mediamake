/**
 * Lets a Remotion bundle of the studio compile work that lives outside it (scripts/workspace.ts):
 * remotion.config.ts (the CLI: `remotion render`, `mm preview`) and scripts/bundle.ts (the Node API
 * scripts) both run it. It changes nothing while every folder is still in apps/studio.
 *
 * - The studio finds work with require.context: src/Root.tsx ('../projects'), logoGraphics/Root.tsx
 *   ('../brands'), thumbnails/Root.tsx and Thumbnail.tsx ('./jobs'). Each context that is somewhere
 *   else now reads the folder where it is.
 * - Code outside the checkout finds no node_modules above it, so the studio's and the repo's are
 *   added to where packages are looked up (after the usual walk up, so code in the checkout resolves
 *   exactly as before). React and remotion are single copies whatever imports them (Remotion's own
 *   aliases).
 * - A workspace is laid out like apps/studio, so a project's relative imports of the engine
 *   (../../../src/kit from projects/<slug>/video/index.tsx) point at <workspace>/src/kit. Every
 *   framework folder or file of the studio (src, catalog, logoGraphics, the thumbnail engine…) is
 *   aliased there, as if the workspace were laid over the studio. TypeScript gets the same view from
 *   `rootDirs` (a workspace tsconfig, written by mm migrate). This bridge holds until projects import
 *   the engine by name (@mediamake/engine, plan step A3).
 */
import fs from 'node:fs';
import path from 'node:path';
import webpack from 'webpack';
import { WORKSPACE_FOLDERS, workspaceDirs, workspaceSetting, type WorkspaceFolder } from './workspace.ts';

/** The require.context folders, as the studio names them, and the workspace folder each one reads. */
const CONTEXTS: [rel: string, folder: WorkspaceFolder][] = [
  ['projects', 'projects'],
  ['brands', 'brands'],
  ['thumbnails/jobs', 'thumbnailJobs'],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const real = (p: string) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
};
/** A path and its real path (webpack sees real paths: macOS's temp folder is a link into /private). */
const spellings = (p: string) => [...new Set([path.resolve(p), real(p)])];

export type WorkspaceBundle = {
  /** apps/studio (or another engine checkout's app folder) */
  studio: string;
  /** where each folder is (default: workspaceDirs(studio)) */
  dirs?: Partial<Record<WorkspaceFolder, string>>;
  /** the folder laid over the studio (default: the workspace when one is set) */
  root?: string | null;
};

/**
 * <root>/<entry> → <studio>/<entry> for every framework entry of the studio: its top-level folders and
 * files except node_modules, hidden ones and the workspace's own folders (thumbnails/ is opened one level,
 * since thumbnails/jobs is the workspace's). Files get a key without their extension too, the way imports
 * name them.
 */
export const overlayAliases = (studio: string, root: string): Record<string, string> => {
  const own = new Set<string>(Object.values(WORKSPACE_FOLDERS));
  const above = new Set([...own].flatMap(rel => rel.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))));
  const aliases: Record<string, string> = {};
  const walk = (rel: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(studio, ...rel.split('/').filter(Boolean)), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (own.has(r)) continue;
      if (above.has(r)) {
        if (e.isDirectory()) walk(r);
        continue;
      }
      const to = path.join(studio, ...r.split('/'));
      for (const base of spellings(root)) {
        const from = path.join(base, ...r.split('/'));
        aliases[from] = to;
        const ext = e.isFile() ? path.extname(e.name) : '';
        if (ext) aliases[from.slice(0, -ext.length)] = to.slice(0, -ext.length);
      }
    }
  };
  walk('');
  return aliases;
};

/** Any webpack config (the CLI's and @remotion/bundler's own webpack copy have different types). */
type AnyConfig = { plugins?: unknown[]; resolve?: object };
type Resolve = { modules?: unknown[]; alias?: unknown };

/** The config unchanged when everything is in the studio, else with the contexts, packages and engine pointed right. */
export const workspaceWebpack = <C extends AnyConfig>(config: C, opts: WorkspaceBundle): C => {
  const studio = path.resolve(opts.studio);
  const dirs = { ...workspaceDirs(studio), ...opts.dirs };
  const root = opts.root === undefined ? (workspaceSetting()?.root ?? null) : opts.root;
  const moved = CONTEXTS.filter(([rel, folder]) => path.resolve(dirs[folder]) !== path.join(studio, ...rel.split('/')));
  const overlay = root && path.resolve(root) !== studio ? overlayAliases(studio, root) : {};
  if (!moved.length && !Object.keys(overlay).length) return config;
  const repo = path.resolve(studio, '..', '..');
  const resolve = (config.resolve ?? {}) as Resolve;
  const alias = resolve.alias;
  if (Array.isArray(alias)) throw new Error('workspaceWebpack: resolve.alias as an array is not supported');
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...moved.map(([rel, folder]) => {
        const from = new RegExp(`^(${spellings(path.join(studio, ...rel.split('/'))).map(escapeRegExp).join('|')})$`);
        return new webpack.ContextReplacementPlugin(from, path.resolve(dirs[folder]));
      }),
    ],
    resolve: {
      ...resolve,
      modules: [...(resolve.modules ?? ['node_modules']), path.join(studio, 'node_modules'), path.join(repo, 'node_modules')],
      alias: { ...(alias as Record<string, unknown> | undefined), ...overlay },
    },
  } as C;
};
