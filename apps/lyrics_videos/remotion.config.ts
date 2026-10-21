// See all configuration options: https://remotion.dev/docs/config
// Note: the Node.js APIs (scripts/stills.ts) don't read this file; they pass the same options directly.

import { Config } from '@remotion/cli/config';

// Every project's input/ and manifest.json are served via staticFile('<slug>/...').
Config.setPublicDir('./projects');
Config.setVideoImageFormat('jpeg');
Config.setDelayRenderTimeoutInMilliseconds(100000);
