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
  path.resolve(options.publicDir ?? '') === path.join(ROOT, 'projects') &&
  (!options.webpackOverride || options.webpackOverride === enableTailwind);

/** bundle() with the public dir linked (not copied), removed when the process ends; a project's kept bundle for ONLY_PROJECT. */
export const tempBundle = async (options: BundleOptions) => {
  if (isProjectBundle(options)) return (await projectBundle(process.env.ONLY_PROJECT!)).serveUrl;
  hook();
  const override = options.webpackOverride;
  const dir = await bundle({
    symlinkPublicDir: true,
    ...options,
    webpackOverride: async config => {
      // snapshots by timestamp: hashing read all of projects/ (scripts/snapshots.ts)
      const own = timestampSnapshots(override ? await override(config) : config);
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
