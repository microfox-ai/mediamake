/**
 * Named looks for the mediamake layers. `default` is the editor's own defaults; the other entries
 * are learned from saved mediamake timelines (see the mediamake-lyric-video skill).
 */
import type { VerticalFloatStyle } from './VerticalFloatLyrics';
import type { WaveformLayerProps } from './WaveformLayer';

export const LYRIC_STYLES = {
  /** sub-vertical-float with the editor's defaults. */
  default: {},
} satisfies Record<string, VerticalFloatStyle>;

export const WAVE_STYLES = {
  /** FearlessBeats spectrum fill, the Wave Look action's default. */
  default: { kind: 'spectrum-fill', look: 'fearless-beats', impact: 0.5, box: { height: 320 } },
} satisfies Record<string, WaveformLayerProps>;

export type LyricStyleName = keyof typeof LYRIC_STYLES;
export type WaveStyleName = keyof typeof WAVE_STYLES;

export const lyricStyle = (name: LyricStyleName): VerticalFloatStyle => LYRIC_STYLES[name];
export const waveStyle = (name: WaveStyleName): WaveformLayerProps =>
  WAVE_STYLES[name] as WaveformLayerProps;
