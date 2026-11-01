/**
 * Webpack snapshots by timestamp, not content hash, for every bundle of this app: remotion.config.ts (the CLI:
 * render-project, `remotion render`) and scripts/bundle.ts (the Node API scripts).
 *
 * Tailwind's loader scans from the cwd and registers the folders it scans as context dependencies of
 * src/index.css: projects/, thumbnails/jobs, assets3d/… In production mode (every bundle except Studio's)
 * webpack snapshots a module's context dependencies by hash, and hashing a folder reads every file under it
 * in full. projects/ holds 20+ GB of footage: the CLI bundle read it all and was killed at ~63 % (2026-11-01/02;
 * measured 2026-11-02: 3 GB of clips no code imports, read whole, +2 GB of memory). Timestamps only stat the
 * files. A folder holding a dangling symlink (footage linked from Downloads, then deleted) also hashes to
 * undefined, which crashed the bundle (2026-10-30).
 */
const TIMESTAMPS = { timestamp: true, hash: false };

/** Any webpack config (the CLI's and @remotion/bundler's own webpack copy have different types). */
export const timestampSnapshots = <C extends { snapshot?: object }>(config: C): C => ({
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
