// See all configuration options: https://remotion.dev/docs/config
// Note: the Node.js APIs (scripts/stills.ts) don't read this file; they pass the same options directly.

import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';

// Every project's input/ and manifest.json are served via staticFile('<slug>/...').
Config.setPublicDir('./projects');
Config.setVideoImageFormat('jpeg');
Config.setDelayRenderTimeoutInMilliseconds(100000);
// ANGLE gives headless Chrome a GPU path; three.js scenes (WebGL) need it.
Config.setChromiumOpenGlRenderer('angle');
// mediamake presets and @microfox/remotion atoms style themselves with Tailwind classes.
Config.overrideWebpackConfig(enableTailwind);
