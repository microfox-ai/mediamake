/**
 * INVERTED Devils. The reusable piece is <InvertedDevilsLogo /> (./Logo.tsx); intro and
 * ending scenes built around it go next to it. explorations/ holds the first five 7 s
 * concepts (with backgrounds), kept for reference.
 */
import { defineLogo } from '../kit';
import { Gaze } from './explorations/Gaze';
import { Mirror } from './explorations/Mirror';
import { Trace } from './explorations/Trace';
import { Velvet } from './explorations/Velvet';
import { Voice } from './explorations/Voice';
import { LogoScene } from './Logo';
import { FPS, H, W } from './theme';

export { InvertedDevilsLogo, LOGO_TIMING, LOGO_VIEW } from './Logo';

export default defineLogo({
  id: 'inverted-devils',
  fps: FPS,
  width: W,
  height: H,
  scenes: [
    { id: 'logo', component: LogoScene, seconds: 4, transparent: true },
    { id: 'explore-1-trace', component: Trace, seconds: 7, folder: 'explorations' },
    { id: 'explore-2-mirror', component: Mirror, seconds: 7, folder: 'explorations' },
    { id: 'explore-3-velvet', component: Velvet, seconds: 7, folder: 'explorations' },
    { id: 'explore-4-voice', component: Voice, seconds: 7, folder: 'explorations' },
    { id: 'explore-5-gaze', component: Gaze, seconds: 7, folder: 'explorations' },
  ],
});
