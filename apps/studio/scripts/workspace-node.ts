/**
 * Lets Node load your code the way the Remotion bundles do (workspace-webpack.ts). Some scripts import a
 * project's own code in Node: mm remix (video/edl.ts), mm amv (video/cut.ts), mm lyric-shorts (edl.ts,
 * theme.ts), mm wave-lab (the storyboard). That code imports the engine by name
 * (@mediamake/engine/remix/edl.ts, engine.ts), or still by path (../../../src/remix/edl.ts), which in
 * ~/MediaMake means ~/MediaMake/src, a folder that isn't there.
 *
 * Importing this file (a side effect, before the project's code is imported) adds a Node resolve hook
 * (workspace-node-hooks.mjs):
 * - the engine's names resolve to this studio's files (with the bundles' extensions and index files);
 * - from a file in a workspace outside the studio, and only for what fails to resolve: a relative import
 *   that lands on one of the studio's framework folders or files in the workspace (src/, catalog/,
 *   logoGraphics/, thumbnails/<engine files>…) is read from the studio, and a package is looked up from
 *   the studio (its node_modules), for a workspace with no node_modules link.
 * Everything else resolves as before.
 *
 * `workspaceEsbuild()` is the same for esbuild (mm brand bundles a brand's svg module).
 */
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'esbuild';
import { ENGINE, SUFFIXES, engineFile, readEngine } from './engine.ts';
import { ROOT } from './paths.ts';
import { WORKSPACE_FOLDERS, workspaceSetting } from './workspace.ts';

const real = (p: string) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const inside = (dir: string, abs: string) => abs === dir || abs.startsWith(dir + path.sep);

/**
 * The studio file a path in the workspace stands for, or null when it isn't one: a path under `root`
 * that is not in one of the workspace's own folders (projects/, out/, brands/, thumbnails/jobs/…),
 * hidden files and node_modules aside.
 */
export const studioTarget = (target: string, root: string, studio: string): string | null => {
  const abs = path.resolve(target);
  const base = path.resolve(root);
  if (!inside(base, abs) || abs === base) return null;
  const rel = path.relative(base, abs).split(path.sep);
  if (rel[0].startsWith('.') || rel[0] === 'node_modules') return null;
  const joined = rel.join('/');
  if (Object.values(WORKSPACE_FOLDERS).some(own => joined === own || joined.startsWith(`${own}/`))) return null;
  return path.join(path.resolve(studio), ...rel);
};

/** The workspace laid over this studio, or null when there is none to lay (none set, or it is the studio). */
export const workspaceOverlay = (studio = ROOT): { root: string; studio: string } | null => {
  const root = workspaceSetting()?.root;
  if (!root || real(root) === real(studio)) return null;
  // real paths: what Node and esbuild name the importing files by (macOS's temp folder is a link into /private)
  return { root: real(root), studio: real(studio) };
};

const SKIP = 'mediamake-workspace';

let registered = false;
/** Adds the resolve hook once (importing this file does it). */
export const registerWorkspaceResolve = (studio = ROOT) => {
  if (registered) return;
  const table = readEngine(studio);
  const overlay = workspaceOverlay(studio);
  if (!table && !overlay) return;
  registered = true;
  register(new URL('./workspace-node-hooks.mjs', import.meta.url), {
    data: { studio: real(studio), overlay, own: Object.values(WORKSPACE_FOLDERS), engine: table, suffixes: SUFFIXES },
  });
};

/** The engine's names, and the same fallback for workspace code, for an esbuild build. */
export const workspaceEsbuild = (studio = ROOT): Plugin => ({
  name: 'mediamake-workspace',
  setup(build) {
    const table = readEngine(studio);
    if (table) {
      // ENGINE has no regular-expression characters
      const names = new RegExp(`^${ENGINE}(/|$)`);
      build.onResolve({ filter: names }, args => {
        const file = engineFile(args.path, studio, table);
        return file ? { path: file } : { errors: [{ text: `${args.path}: no such file in the engine (${path.join(studio, 'engine.json')})` }] };
      });
    }
    const overlay = workspaceOverlay(studio);
    if (!overlay) return;
    const again = { pluginData: SKIP } as const;
    build.onResolve({ filter: /.*/ }, async args => {
      if (args.pluginData === SKIP || !args.importer || !inside(overlay.root, args.importer)) return undefined;
      const first = await build.resolve(args.path, { kind: args.kind, importer: args.importer, resolveDir: args.resolveDir, ...again });
      if (!first.errors.length) return first;
      const to = args.path.startsWith('.') ? studioTarget(path.resolve(args.resolveDir, args.path), overlay.root, overlay.studio) : null;
      if (args.path.startsWith('.') && !to) return first;
      // the studio file (esbuild adds the extension), or the package as the studio finds it
      const second = to
        ? await build.resolve(`./${path.basename(to)}`, { kind: args.kind, resolveDir: path.dirname(to), ...again })
        : await build.resolve(args.path, { kind: args.kind, resolveDir: overlay.studio, ...again });
      return second.errors.length ? first : second;
    });
  },
});

registerWorkspaceResolve();
