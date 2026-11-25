/**
 * Painted cartoons (@mediamake/engine/painted): short, hand-painted 2D cartoons in p5.brush, starring
 * Clawd or any character, made with the make-painted-cartoon skill. The kit is John Heibel's Claude
 * Animation Base (kit/, MIT; kit/UPSTREAM.md).
 *
 * A project's video/index.tsx is one line, `export default paintedProject({ id: '<slug>' })`. Its
 * scenes are the kit's plain scene files, listed in video/painted.json; `mm painted new <slug>` makes
 * them, `mm painted <slug> --sheet=…` checks them, `mm render <slug>` renders the video.
 */
import { defineProject, layer, type ProjectDefinition } from '../kit/contract';
import { PaintedCartoon, type PaintedCartoonProps } from './PaintedCartoon';
import { FPS, HEIGHT, WIDTH } from './page';

export { PaintedCartoon, type PaintedCartoonProps };
export { FPS, HEIGHT, WIDTH, type PaintedConfig, type PaintedSettings } from './page';

/** A painted cartoon's project: the whole length is one PaintedCartoon (1920×1080 at 24 fps, the kit's). */
export const paintedProject = (o: { id: string; loop?: string; tail?: number }): ProjectDefinition =>
  defineProject({
    id: o.id,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    tail: o.tail,
    layers: [layer<PaintedCartoonProps>({ scene: PaintedCartoon, at: 'all', props: { loop: o.loop }, name: 'painted cartoon' })],
  });
