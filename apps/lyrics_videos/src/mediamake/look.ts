/**
 * A waveform lyric video is a picture plus three choices, made in this order in the storyboard:
 * the wave, the fonts and the caption animation. A Look holds all of them; lookVideo() (lookVideo.tsx)
 * turns it into a project. Catalog entries (apps/lyrics_videos/catalog) are pieces of a Look, and a
 * project's video/storyboard.ts lists its candidates for each step and the ones picked.
 *
 * Pure data and helpers only: scripts/wave-lab.ts imports this file in Node.
 */
import { CAPTIONS, FONTS, WAVES } from '../../catalog/index.ts';
import type { CaptionPresetId } from './CaptionLayer';
import type { CoverBackdropProps } from './CoverBackdrop';
import type { OverlayTextProps } from './OverlayText';
import type { OverlayVideoProps } from './OverlayVideo';
import type { SubjectProps } from './Subject';
import type { TrackTitleProps } from './TrackTitle';
import type { WaveformLayerProps } from './WaveformLayer';

export type TextStyle = {
  /** Google font as mediamake names it: 'BebasNeue', 'Roboto:600:italic'. */
  font?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** e.g. '0.04em' */
  letterSpacing?: string;
  /** Size relative to the caption setup's avgFontSize. */
  textScale?: number;
  isGlowEnabled?: boolean;
  /** CSS gradient filling the words instead of the colour (sub-vertical-float). */
  gradient?: string;
};

/** Step 1: one waveform, or several drawn together (both edges, a line over a fill). */
export type WaveDesign = WaveformLayerProps | WaveformLayerProps[];

/** Step 2: the type of the lyrics (and of the title card). */
export type FontSet = {
  /** The hero word(s) of a line: sub-vertical-float's highlightTextStyle, the older presets' headerFont. */
  highlight: TextStyle;
  /** The rest of the line: subTextStyle, or primaryFont. */
  sub: TextStyle;
  /** primary = sung words, secondary = words still to come, accent = the highlight glow. */
  colors?: { primary?: string; secondary?: string; accent?: string };
  /** Multiplies the caption setup's avgFontSize (wide fonts want less, condensed ones more). */
  sizeScale?: number;
  /** Title card fonts. Default: the highlight and sub fonts. */
  title?: { font?: string; subFont?: string };
  /** A specimen line for sets made for another script (Telugu), used in the catalog shots. */
  sample?: string;
};

/** Step 3: how the lyrics move — a mediamake caption preset and its own inputs. */
export type CaptionSetup = {
  preset: CaptionPresetId;
  /**
   * The preset's inputs without captions, fonts and colours (those come from the FontSet):
   * sub-vertical-float's avgFontSize, textAlign, position, subtitleSync; the older presets'
   * avgFontSize, position, subtitleSync / kineticMotion / wordAnimation, style.
   */
  params: Record<string, unknown>;
  /** The editor's layout box for the whole caption track. */
  containerProps?: { style?: Record<string, unknown> };
};

/** Everything around the three choices. */
export type LookBase = {
  fps?: number;
  width?: number;
  height?: number;
  /** The picture. Default: the first image in the project's input/. */
  cover?: CoverBackdropProps;
  /** Off unless given. */
  title?: false | (TrackTitleProps & { seconds?: number });
  texts?: (OverlayTextProps & { from: number; to: number })[];
  /** Looping clips over the picture (particles, light leaks). */
  overlays?: OverlayVideoProps[];
  /** The subject cut out of the picture, over the visualizers (cover.image is then the clean plate). */
  subject?: SubjectProps;
};

export type Look = LookBase & {
  /** null: no wave. */
  wave?: WaveDesign | null;
  fonts: FontSet;
  /** null: no lyrics (the wave step's shots). */
  captions: CaptionSetup | null;
};

/** A catalog id (apps/lyrics_videos/catalog) or a design written out. */
export type Ref<T> = string | T;

export type Step = 'looks' | 'waves' | 'fonts' | 'captions';

/**
 * Step 0: cover settings laid over base.cover, plus overlay clips added to base.overlays, a cutout
 * subject (replacing base.subject) and the look's own visualizers (`layers`, drawn with the wave).
 */
export type PictureStyle = CoverBackdropProps & {
  overlays?: OverlayVideoProps[];
  subject?: SubjectProps;
  layers?: WaveDesign;
};

/** projects/<slug>/video/storyboard.ts: the candidates of each step, and what the user picked. */
export type Storyboard = {
  base?: LookBase;
  /**
   * Before the wave: the picture's style (L1, L2, …), cover settings laid over base.cover, usually
   * a `look` (grade, picture filters, texture: PictureLook.tsx), and its own `overlays`
   * (particles, flashes). null = the picture as it is.
   */
  looks?: Record<string, PictureStyle | null>;
  /** Step 1. Keys are the IDs the user picks by (W1, W2, …). null = no wave. */
  waves?: Record<string, Ref<WaveDesign> | null>;
  /** Step 2 (F1, F2, …). */
  fonts?: Record<string, Ref<FontSet>>;
  /** Step 3 (C1, C2, …). */
  /** Step 3 (C1, C2, …). null = no preset captions (the project draws its own lyrics). */
  captions?: Record<string, Ref<CaptionSetup> | null>;
  pick?: { look?: string; wave?: string; fonts?: string; captions?: string };
  /** Song seconds to shoot each step at. Default: the loudest moment, and its lyric line. */
  at?: Partial<Record<Step, number[]>>;
};

export type CatalogEntry<T> = {
  name: string;
  /** What it looks like and when it fits. */
  about: string;
  /** Moods, genres and channels it suits. */
  tags: string[];
  /** Where it came from: the mediamake timelines it was used in (and when), or 'new' with a date. */
  source: string;
  value: T;
  /** What it was shot with in the catalog, when that isn't the default. */
  shotWith?: { fonts?: string; captions?: string; wave?: string };
};

/** Used until the user has picked fonts or a caption setup. */
export const DEFAULT_FONTS = 'bebas-roboto';
export const DEFAULT_CAPTIONS = 'sentence-float-2';

const lookup = <T>(kind: string, table: Record<string, CatalogEntry<T>>, id: string): T => {
  const entry = table[id];
  if (!entry) throw new Error(`No ${kind} "${id}" in the catalog. Known: ${Object.keys(table).join(', ')}`);
  return entry.value;
};
export const waveRef = (r: Ref<WaveDesign>): WaveDesign =>
  typeof r === 'string' ? lookup<WaveDesign>('wave', WAVES, r) : r;
export const fontsRef = (r: Ref<FontSet>): FontSet =>
  typeof r === 'string' ? lookup<FontSet>('font set', FONTS, r) : r;
export const captionsRef = (r: Ref<CaptionSetup>): CaptionSetup =>
  typeof r === 'string' ? lookup<CaptionSetup>('caption setup', CAPTIONS, r) : r;

/**
 * The look of a storyboard: its picks, with one step's candidate swapped in. Steps not picked
 * yet use the defaults, and while the wave is being chosen the lyrics stay off.
 */
export const storyboardLook = (sb: Storyboard, candidate?: { step: Step; id: string }): Look => {
  const choose = <T>(step: Step, table: Record<string, T> | undefined, picked: string | undefined) => {
    const id = candidate?.step === step ? candidate.id : picked;
    if (id === undefined) return undefined;
    if (!table || !(id in table)) throw new Error(`storyboard.ts has no ${step} candidate "${id}"`);
    return table[id];
  };
  const { overlays: lookOverlays, subject, layers, ...pictureLook } = choose('looks', sb.looks, sb.pick?.look) ?? {};
  const overlays = [...(sb.base?.overlays ?? []), ...(lookOverlays ?? [])];
  const wave = choose('waves', sb.waves, sb.pick?.wave);
  const waves = [...(wave ? [waveRef(wave)].flat() : []), ...(layers ? [layers].flat() : [])];
  const fonts = choose('fonts', sb.fonts, sb.pick?.fonts);
  const captions = choose('captions', sb.captions, sb.pick?.captions);
  const lyricsOff =
    candidate?.step === 'looks' || candidate?.step === 'waves' || (!candidate && !sb.pick?.fonts && !sb.pick?.captions);
  return {
    ...sb.base,
    cover: { ...sb.base?.cover, ...pictureLook },
    ...(overlays.length ? { overlays } : {}),
    ...(subject ? { subject } : {}),
    wave: waves.length ? waves : null,
    fonts: fontsRef(fonts ?? DEFAULT_FONTS),
    captions: lyricsOff || captions === null ? null : captionsRef(captions ?? DEFAULT_CAPTIONS),
  };
};

/**
 * The caption preset's full input for a setup in a font set: sub-vertical-float takes text styles,
 * the older presets one font pair (`fontChoices`), one colour set and text transforms.
 */
export const captionParams = (setup: CaptionSetup, fonts: FontSet): Record<string, unknown> => {
  const params = { ...setup.params };
  if (typeof params.avgFontSize === 'number' && fonts.sizeScale)
    params.avgFontSize = Math.round(params.avgFontSize * fonts.sizeScale);
  if (setup.preset === 'sub-vertical-float') {
    return {
      ...params,
      highlightTextStyle: fonts.highlight,
      subTextStyle: fonts.sub,
      ...(fonts.colors ? { colors: fonts.colors } : {}),
    };
  }
  const style = (params.style ?? {}) as Record<string, unknown>;
  return {
    ...params,
    fontChoices: [
      {
        headerFont: fonts.highlight.font ?? 'BebasNeue',
        primaryFont: fonts.sub.font ?? fonts.highlight.font ?? 'Roboto:600:italic',
      },
    ],
    ...(fonts.colors
      ? {
          colorChoices: [
            {
              primary: fonts.colors.primary ?? '#ffffff',
              secondary: fonts.colors.secondary ?? '#ffffff',
              accent: fonts.colors.accent ?? '#ffffff',
            },
          ],
        }
      : {}),
    style: {
      ...style,
      textTransformMain: fonts.highlight.textTransform ?? style.textTransformMain,
      textTransformSub: fonts.sub.textTransform ?? style.textTransformSub,
    },
  };
};

/**
 * A wave in other colours: `main` paints the front (fill, line, bars), `second` the echo layers,
 * glow or the far end of a bar gradient. Use it to fit a catalog wave to the picture's palette.
 */
export const tintWave = (design: Ref<WaveDesign>, main: string, second = main): WaveDesign => {
  const one = (w: WaveformLayerProps): WaveformLayerProps => {
    if (w.kind === 'spectrum-fill') {
      const layers = { layer2Color: second, layer3Color: second, layer4Color: second };
      return { ...w, data: { ...w.data, fillColor: main, gradientEndColor: undefined, ...layers } };
    }
    if (w.kind === 'spectrum-line') {
      return { ...w, data: { ...w.data, strokeColor: main, glowColor: second } };
    }
    if (w.kind !== 'waveform-audio') return w; // the visualizers take their colours as props
    return {
      ...w,
      waveform: { ...w.waveform, barColor: main, gradientStartColor: main, gradientEndColor: second },
    };
  };
  const d = waveRef(design);
  return Array.isArray(d) ? d.map(one) : one(d);
};
