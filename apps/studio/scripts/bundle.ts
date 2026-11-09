/**
 * Remotion bundles for the scripts that render through the Node API (stills, lyric-shorts, wave-lab,
 * amv-lab, thumbs, brand, logos, golden).
 *
 * - A bundle of one project (ONLY_PROJECT=<slug>, src/index.ts over projects/) is the project's kept
 *   bundle from project-bundle.ts: made once, reused until its code changes, shared with mm render.
 * - Any other bundle is a throwaway: bundle() copies the whole public dir into a temp folder by
 *   default, and projects/ is 20+ GB: a run that was stopped or timed out left that copy behind
 *   (67 GB of them in $TMPDIR by 2026-10-27). Here the public dir is linked instead of copied, which
 *   is what `remotion render` itself does, and the bundle is removed however the process ends.
 *
 * The studio's contexts read the workspace (scripts/workspace-webpack.ts), wherever it is.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, type BundleOptions } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind-v4';
import { onExit } from './locks.ts';
import { onlyProject } from './only-project.ts';
import { isKeptBundle, projectBundle } from './project-bundle.ts';
import { timestampSnapshots } from './snapshots.ts';
import { workspaceDir } from './workspace.ts';
import { workspaceWebpack, type WorkspaceBundle } from './workspace-webpack.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live = new Set<string>();

let hooked = false;
const hook = () => {
  if (hooked) return;
  hooked = true;
  onExit(() => {
    for (const dir of live) fs.rmSync(dir, { recursive: true, force: true });
    live.clear();
  });
};

/** The standard bundle of one project: the one project-bundle.ts keeps. */
const isProjectBundle = (options: BundleOptions) =>
  Boolean(process.env.ONLY_PROJECT) &&
  path.resolve(options.entryPoint) === path.join(ROOT, 'src', 'index.ts') &&
  path.resolve(options.publicDir ?? '') === workspaceDir('projects', ROOT) &&
  (!options.webpackOverride || options.webpackOverride === enableTailwind);

/**
 * bundle() with the public dir linked (not copied), removed when the process ends; a project's kept bundle
 * for ONLY_PROJECT. `workspace`: where the studio's contexts read from (default: this checkout's studio and
 * the workspace; false: as webpack finds them, for golden.ts, which points them at its own fixtures).
 */
export const tempBundle = async ({ workspace, ...options }: BundleOptions & { workspace?: WorkspaceBundle | false }) => {
  if (workspace === undefined && isProjectBundle(options)) return (await projectBundle(process.env.ONLY_PROJECT!)).serveUrl;
  hook();
  const override = options.webpackOverride;
  const dir = await bundle({
    symlinkPublicDir: true,
    ...options,
    webpackOverride: async config => {
      const mine = override ? await override(config) : config;
      const placed = workspace === false ? mine : workspaceWebpack(mine, workspace ?? { studio: ROOT });
      // snapshots by timestamp: hashing read all of projects/ (scripts/snapshots.ts)
      const own = timestampSnapshots(placed);
      // ONLY_PROJECT=<slug> bundles that project alone (scripts/only-project.ts)
      return process.env.ONLY_PROJECT ? onlyProject(own, process.env.ONLY_PROJECT) : own;
    },
  });
  live.add(dir);
  return dir;
};

/** Done with a bundle from tempBundle: a throwaway is removed now (only unlinking the public dir, never its
 *  files); a project's kept bundle stays for the next run. */
export const removeBundle = (dir: string) => {
  if (isKeptBundle(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
  live.delete(dir);
};
