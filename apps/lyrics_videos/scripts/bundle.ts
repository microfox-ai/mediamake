/**
 * Throwaway Remotion bundles for the scripts that render through the Node API (stills, wave-lab,
 * thumbs, brand, logos). bundle() copies the whole public dir into a temp folder by default, and
 * projects/ is 20+ GB: a run that was stopped or timed out left that copy behind (67 GB of them in
 * $TMPDIR by 2026-10-27). Here the public dir is linked instead of copied, which is what
 * `remotion render` itself does, and the bundle is removed however the process ends.
 */
import fs from 'node:fs';
import { bundle, type BundleOptions } from '@remotion/bundler';

const live = new Set<string>();

const removeAll = () => {
  for (const dir of live) fs.rmSync(dir, { recursive: true, force: true });
  live.clear();
};

let hooked = false;
const hook = () => {
  if (hooked) return;
  hooked = true;
  process.on('exit', removeAll);
  // 'exit' doesn't run when a signal ends the process: clean up, then die of the same signal
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(signal, () => {
      removeAll();
      process.kill(process.pid, signal);
    });
  }
};

// Snapshots by timestamp, not content hash: Root.tsx's require.context reads all of projects/, and
// webpack's hash of a folder holding a dangling symlink (footage linked from Downloads, then
// deleted) is undefined, which crashes the bundle (2026-10-30).
const TIMESTAMPS = { timestamp: true, hash: false };
const timestampSnapshots: NonNullable<BundleOptions['webpackOverride']> = config => ({
  ...config,
  snapshot: {
    ...config.snapshot,
    module: TIMESTAMPS,
    resolve: TIMESTAMPS,
    contextModule: TIMESTAMPS,
    buildDependencies: TIMESTAMPS,
    resolveBuildDependencies: TIMESTAMPS,
  },
});

/** bundle() with the public dir linked (not copied), removed when the process ends. */
export const tempBundle = async (options: BundleOptions) => {
  hook();
  const override = options.webpackOverride;
  const dir = await bundle({
    symlinkPublicDir: true,
    ...options,
    webpackOverride: async config => timestampSnapshots(override ? await override(config) : config),
  });
  live.add(dir);
  return dir;
};

/** Remove a bundle from tempBundle now (removing only unlinks the public dir, never its files). */
export const removeBundle = (dir: string) => {
  fs.rmSync(dir, { recursive: true, force: true });
  live.delete(dir);
};
