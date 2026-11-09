/**
 * Where this app's webpack caches live: <app>/node_modules/.cache/mediamake/webpack, not Remotion's
 * node_modules/.cache/webpack. The Remotion CLI deletes every cache in its own folder when a render
 * runs with the cache off ("Cache disabled but found. Deleting") or another project's config is
 * cached there ("Webpack config change detected. Clearing cache"), so per-project caches can't live
 * there (project-bundle.ts). No import.meta here: remotion.config.ts imports this file, and the CLI
 * loads it as CommonJS.
 */
import path from 'node:path';

/** The cache folder for an app folder (Remotion's root, webpack's context). */
export const studioCacheDir = (root: string) => path.join(root, 'node_modules', '.cache', 'mediamake', 'webpack');

/** A webpack plugin that moves a filesystem cache into studioCacheDir. Plugins apply before webpack
 *  fills in its defaults, so the folder set here is the one webpack uses. No enumerable fields: the
 *  config hash Remotion names the cache after stays the same. */
export class StudioCacheDir {
  apply(compiler: { options: { context?: string; cache?: unknown } }) {
    const cache = compiler.options.cache as { type?: string; cacheDirectory?: string } | false | undefined;
    if (cache && cache.type === 'filesystem' && !cache.cacheDirectory) {
      cache.cacheDirectory = studioCacheDir(compiler.options.context ?? process.cwd());
    }
  }
}

/** Adds StudioCacheDir to any webpack config (the CLI's and @remotion/bundler's webpack types differ). */
export const studioCache = <C extends { plugins?: unknown[] }>(config: C): C => ({
  ...config,
  plugins: [...(config.plugins ?? []), new StudioCacheDir()],
});
