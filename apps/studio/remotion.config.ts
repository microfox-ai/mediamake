// See all configuration options: https://remotion.dev/docs/config
// Note: the Node.js APIs (scripts/stills.ts) don't read this file; they pass the same options directly.

import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';
import { onlyProject } from './scripts/only-project.ts';
import { timestampSnapshots } from './scripts/snapshots.ts';
import { studioCache } from './scripts/webpack-cache.ts';

// Every project's input/ and manifest.json are served via staticFile('<slug>/...').
Config.setPublicDir('./projects');
Config.setVideoImageFormat('jpeg');
Config.setDelayRenderTimeoutInMilliseconds(100000);
// ANGLE gives headless Chrome a GPU path; three.js scenes (WebGL) need it.
Config.setChromiumOpenGlRenderer('angle');
// mediamake presets and @microfox/remotion atoms style themselves with Tailwind classes.
// Snapshots by timestamp: hashing read all of projects/ and killed the bundle at ~63 % (scripts/snapshots.ts).
// ONLY_PROJECT=<slug> (mm preview <slug>, or a `remotion render src/index.ts` by hand) bundles that project
// alone (scripts/only-project.ts) under a webpack cache of its own. `mm render` and `mm stills` don't bundle
// here: they reuse the project's kept bundle (scripts/project-bundle.ts) and hand the CLI its folder.
// The caches live in node_modules/.cache/mediamake/webpack, out of reach of the CLI's cache clearing
// (scripts/webpack-cache.ts).
Config.overrideWebpackConfig(async config => {
  const styled = timestampSnapshots(await enableTailwind(config));
  return studioCache(process.env.ONLY_PROJECT ? onlyProject(styled, process.env.ONLY_PROJECT) : styled);
});
