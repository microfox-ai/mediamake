/**
 * Preset registry. A preset turns params + the hero into layers with stable ids. When a look made
 * from raw layers works well, promote it here as a new preset so the next job gets it for a few
 * lines of JSON.
 */
import { behind, lower, side } from './cinematic.ts';
import type { Preset } from './common.ts';
import { band, poster, sticker } from './graphic.ts';
import { cover, coverBehind, coverFrame } from './poster.ts';

export type { Preset } from './common.ts';

export const PRESETS: Record<string, Preset> = {
  // thumbnails (1280×720)
  behind,
  lower,
  side,
  poster,
  sticker,
  band,
  // music posters / album artwork (1000×1000)
  cover,
  'cover-behind': coverBehind,
  'cover-frame': coverFrame,
};
