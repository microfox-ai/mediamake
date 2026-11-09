/**
 * Whole-video templates on top of the mediamake layers, so a project's video/index.tsx can be a
 * few lines. Both return a normal ProjectDefinition: add, remove or reorder layers freely.
 */
import { defineProject, layer, type Layer, type ProjectDefinition } from '../kit/contract';
import { CoverBackdrop, type CoverBackdropProps } from './CoverBackdrop';
import { OverlayText, type OverlayTextProps } from './OverlayText';
import { lyricStyle, type LyricStyleName, waveStyle, type WaveStyleName } from './styles';
import { TrackTitle, type TrackTitleProps } from './TrackTitle';
import { VerticalFloatLyrics, type VerticalFloatStyle } from './VerticalFloatLyrics';
import { WaveformLayer, type WaveformLayerProps } from './WaveformLayer';

type Frame = { fps?: number; width?: number; height?: number };

type Common = Frame & {
  /** Must equal the project folder name. */
  id: string;
  /** Background picture (manifest asset name or URL), or full backdrop props. Omit for black. */
  cover?: string | CoverBackdropProps;
  /** Title card for the first seconds. `false` turns it off. */
  title?: false | (TrackTitleProps & { seconds?: number });
  /** Text overlays (channel tag, a title in the song's language, credits), in song seconds. */
  texts?: (OverlayTextProps & { from: number; to: number })[];
  /** Layers drawn on top of the template's. */
  extra?: Layer[];
};

const overlays = (texts: Common['texts']): Layer[] =>
  (texts ?? []).map(({ from, to, ...props }) =>
    layer({ scene: OverlayText, at: { from, to }, props, name: `text: ${props.text}` }),
  );

const backdrop = (cover: Common['cover']): Layer[] =>
  cover
    ? [
        layer({
          scene: CoverBackdrop,
          at: 'all',
          props: typeof cover === 'string' ? { image: cover } : cover,
          name: 'cover',
        }),
      ]
    : [];

const titleCard = (title: Common['title'], fallbackSeconds: number): Layer[] => {
  if (title === false) return [];
  const { seconds = fallbackSeconds, ...props } = title ?? {};
  return [layer({ scene: TrackTitle, at: { from: 0, to: seconds }, props, name: 'title' })];
};

const resolveLyrics = (s: VerticalFloatStyle | LyricStyleName) =>
  typeof s === 'string' ? lyricStyle(s) : s;
const resolveWave = (w: WaveformLayerProps | WaveStyleName) =>
  typeof w === 'string' ? waveStyle(w) : w;

/** Lyric video: cover backdrop, sub-vertical-float lyrics over the whole song, optional wave strip. */
export const lyricVideo = (
  o: Common & {
    lyrics?: VerticalFloatStyle | LyricStyleName;
    /** A waveform under the lyrics. Off by default. */
    wave?: WaveformLayerProps | WaveStyleName;
  },
): ProjectDefinition =>
  defineProject({
    id: o.id,
    fps: o.fps ?? 30,
    width: o.width ?? 1920,
    height: o.height ?? 1080,
    layers: [
      ...backdrop(o.cover),
      ...(o.wave ? [layer({ scene: WaveformLayer, at: 'all', props: resolveWave(o.wave), name: 'wave' })] : []),
      // Off by default: lyrics usually start within the first seconds.
      ...(o.title ? titleCard(o.title, 4) : []),
      layer({
        scene: VerticalFloatLyrics,
        at: 'all',
        props: { style: resolveLyrics(o.lyrics ?? 'default') },
        name: 'lyrics',
      }),
      ...overlays(o.texts),
      ...(o.extra ?? []),
    ],
  });

/** Waveform video: cover backdrop, a waveform for the whole song, title, optional lyrics. */
export const waveformVideo = (
  o: Common & {
    wave?: WaveformLayerProps | WaveStyleName;
    /** Lyrics over the waveform. Off by default. */
    lyrics?: VerticalFloatStyle | LyricStyleName;
  },
): ProjectDefinition =>
  defineProject({
    id: o.id,
    fps: o.fps ?? 30,
    width: o.width ?? 1920,
    height: o.height ?? 1080,
    layers: [
      ...backdrop(o.cover),
      layer({ scene: WaveformLayer, at: 'all', props: resolveWave(o.wave ?? 'default'), name: 'wave' }),
      ...titleCard(o.title, 8),
      ...(o.lyrics
        ? [
            layer({
              scene: VerticalFloatLyrics,
              at: 'all',
              props: { style: resolveLyrics(o.lyrics) },
              name: 'lyrics',
            }),
          ]
        : []),
      ...overlays(o.texts),
      ...(o.extra ?? []),
    ],
  });
