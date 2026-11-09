// See all configuration options: https://remotion.dev/docs/config
// Note: the Node.js APIs (scripts/stills.ts) don't read this file; they pass the same options directly.

import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';
import { onlyProject } from './scripts/only-project.ts';
import { timestampSnapshots } from './scripts/snapshots.ts';

// Every project's input/ and manifest.json are served via staticFile('<slug>/...').
Config.setPublicDir('./projects');
Config.setVideoImageFormat('jpeg');
Config.setDelayRenderTimeoutInMilliseconds(100000);
// ANGLE gives headless Chrome a GPU path; three.js scenes (WebGL) need it.
Config.setChromiumOpenGlRenderer('angle');
// mediamake presets and @microfox/remotion atoms style themselves with Tailwind classes.
// Snapshots by timestamp: hashing read all of projects/ and killed the bundle at ~63 % (scripts/snapshots.ts).
// ONLY_PROJECT=<slug> (set by render-project) bundles that project alone (scripts/only-project.ts), without
// webpack's cache: the cache doesn't know which project a bundle was narrowed to, so two sessions rendering two
// projects at once got each other's bundle ("Could not find composition with ID honoredone. Available
// compositions: wakeup-waveform…", 2026-11-04).
if (process.env.ONLY_PROJECT) Config.setCachingEnabled(false);
Config.overrideWebpackConfig(async config => {
  const styled = timestampSnapshots(await enableTailwind(config));
  return process.env.ONLY_PROJECT ? onlyProject(styled, process.env.ONLY_PROJECT) : styled;
});
