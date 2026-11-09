/**
 * Narrows the bundle to one project. Root.tsx's require.context loads every project's index.tsx, and
 * several of them load Google fonts when their module is evaluated: a render of one project waited on
 * all of those fonts and sometimes failed with "Timed out loading Google Font" (Cadence, 2026-10-31).
 * With ONLY_PROJECT=<slug> (render-project and stills set it), the context holds that project only.
 *
 * The config is also named after the project. Remotion names webpack's cache after a hash of the
 * config, and the context's RegExp hashes as `{}`: every project got the same cache, and two sessions
 * rendering two projects at once got each other's bundle (2026-11-04). With the name in the config,
 * each project has a cache of its own (project-bundle.ts).
 */
import webpack from 'webpack';

const safe = (slug: string) => slug.replace(/[^a-zA-Z0-9_-]/g, '');

/** Any webpack config (the CLI's and @remotion/bundler's own webpack copy have different types). */
export const onlyProject = <C extends { plugins?: unknown[]; name?: string }>(config: C, slug: string): C => ({
  ...config,
  name: `mediamake-project-${safe(slug)}`,
  plugins: [
    ...(config.plugins ?? []),
    new webpack.ContextReplacementPlugin(
      // Root.tsx's context, whatever the app folder is called (it was lyrics_videos until 2026-11).
      // No import.meta here: the CLI loads remotion.config.ts, which imports this file, as CommonJS.
      /[\\/]projects$/,
      new RegExp(`^\\./${safe(slug)}/(video|shorts/[^_./][^/]*)/index\\.tsx$`),
    ),
  ],
});
