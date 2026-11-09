/**
 * Narrows the bundle to one project. Root.tsx's require.context loads every project's index.tsx, and
 * several of them load Google fonts when their module is evaluated: a render of one project waited on
 * all of those fonts and sometimes failed with "Timed out loading Google Font" (Cadence, 2026-10-31).
 * With ONLY_PROJECT=<slug> (render-project and stills set it), the context holds that project only.
 */
import webpack from 'webpack';

/** Any webpack config (the CLI's and @remotion/bundler's own webpack copy have different types). */
export const onlyProject = <C extends { plugins?: unknown[] }>(config: C, slug: string): C => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    new webpack.ContextReplacementPlugin(
      // Root.tsx's context, whatever the app folder is called (it was lyrics_videos until 2026-11).
      // No import.meta here: the CLI loads remotion.config.ts, which imports this file, as CommonJS.
      /[\\/]projects$/,
      new RegExp(`^\\./${slug.replace(/[^a-zA-Z0-9_-]/g, '')}/(video|shorts/[^_./][^/]*)/index\\.tsx$`),
    ),
  ],
});
