/**
 * Shorts (make-video-music-remix-shorts): vertical cuts of one stretch of a remix project's song.
 *
 * A short lives in projects/<slug>/shorts/<id>/: short.json (the window, written by
 * `npm run shorts -- <slug> make`), edl.ts (its cut list, in the song's own beats) and index.tsx:
 *
 *   export default defineShorts(parent, short, edl);
 *
 * `parent` is the project's video/index.tsx (its Remix layer: footage, anchors, theme, window) or, for
 * a project made only for shorts, { slug, fps, remix: { footage, anchors, window, theme } }. One
 * composition per format the user chose, '<slug>-<id>-9x16', playing only the window: the song's
 * timeline is shifted (ProjectDefinition.window), so beats, words and sound effects keep their song
 * times and a short can reuse the full edit's cut list as it is.
 *
 * mode 'rotate' (no edl): a "rotate your phone" short — a hook on the film's start lights, then the
 * finished 16:9 render (derived/final-16x9.mp4) as it is, turned 90° to fill the frame (RotateShort).
 */
import type { Layer, ProjectDefinition } from '../kit/contract';
import type { Block, Gfx, Sfx, TextCue } from './edl.ts';
import { Remix, type RemixProps } from './Remix';
import { RotateShort, type RotateHook } from './RotateShort';

/** frame sizes: Shorts / Reels / TikTok, Instagram's portrait grid, Instagram's feed portrait */
export const FORMATS = { '9x16': [1080, 1920], '3x4': [1080, 1440], '4x5': [1080, 1350] } as const;
export type ShortFormat = keyof typeof FORMATS;

/** shorts/<id>/short.json */
export type ShortSpec = {
  id: string;
  /** song seconds (on downbeats) and the same as beat indices of manifest.beats.list */
  from: number;
  to: number;
  fromBeat: number;
  toBeat: number;
  formats: ShortFormat[];
  /** seconds of audio fade at the start (default 0: a short starts on the hit) and the end (0.4) */
  fadeIn?: number;
  fadeOut?: number;
  sections?: string[];
  /** 'recast' (default): the edit recast for the frame (edl.ts); 'rotate': hook + the 16:9 render turned */
  mode?: 'recast' | 'rotate';
  /** mode 'rotate': the hook (from song second hook.from to `from`) and the finished render it turns to */
  hook?: RotateHook;
  video?: string;
};

export type ShortEdl = { blocks: Block[]; words: TextCue[]; sfx?: Sfx[]; gfx?: Gfx };

type RemixBase = Omit<RemixProps, 'slug' | 'blocks' | 'words' | 'sfx' | 'gfx'>;
export type ShortsBase = ProjectDefinition | { slug: string; fps: number; remix: RemixBase };

export const defineShorts = (base: ShortsBase, short: ShortSpec, edl?: ShortEdl): ProjectDefinition[] => {
  const slug = 'layers' in base ? base.slug ?? base.id : base.slug;
  if (short.mode === 'rotate') {
    if (!short.hook) throw new Error(`shorts/${short.id}: a rotate short needs short.json "hook" (npm run shorts -- ${slug} make … --mode=rotate)`);
    const remix = 'layers' in base ? (base.layers.find(l => l.scene === Remix)?.props as RemixProps | undefined) : { ...base.remix, gfx: undefined };
    if (!remix) throw new Error(`shorts/${short.id}: ${slug}'s video/index.tsx has no Remix layer (its theme and logo)`);
    const size: [number, number] = 'layers' in base ? [base.width, base.height] : [1920, 1080];
    return short.formats.map(format => ({
      id: `${slug}-${short.id}-${format}`,
      slug,
      fps: base.fps,
      width: FORMATS[format][0],
      height: FORMATS[format][1],
      window: { from: short.hook!.from, to: short.to },
      // the render brings its own mix; the hook its own sounds
      audio: false,
      layers: [{
        // to the short's end, which may run past the song into the render's end screen
        scene: RotateShort, at: { from: 0, to: short.to + 1 }, name: 'rotate',
        props: { slug, video: short.video ?? 'derived/final-16x9.mp4', size, start: short.from, end: short.to, hook: short.hook!, theme: remix.theme, logo: remix.gfx?.title?.logo },
      }],
    }));
  }
  if (!edl) throw new Error(`shorts/${short.id}: no edl.ts`);
  const edit = { blocks: edl.blocks, words: edl.words, sfx: edl.sfx ?? [], gfx: edl.gfx ?? {} };
  const layers: Layer[] =
    'layers' in base
      ? base.layers.map(l => (l.scene === Remix ? { ...l, props: { ...l.props, ...edit } } : l))
      : [{ scene: Remix, at: 'all', name: 'remix', props: { slug, ...base.remix, ...edit } }];
  if (!layers.some(l => l.scene === Remix)) throw new Error(`shorts/${short.id}: ${slug}'s video/index.tsx has no Remix layer`);
  return short.formats.map(format => ({
    id: `${slug}-${short.id}-${format}`,
    slug,
    fps: base.fps,
    width: FORMATS[format][0],
    height: FORMATS[format][1],
    window: { from: short.from, to: short.to, fadeIn: short.fadeIn, fadeOut: short.fadeOut },
    layers,
  }));
};
