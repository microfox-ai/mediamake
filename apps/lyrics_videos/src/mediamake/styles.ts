/**
 * Named looks for the mediamake layers, learned from the saved mediamake timelines in the current
 * (node tree) format, as of 2026-10-24. `default` is the editor's own defaults. The comment on
 * each look names the timelines it comes from. Values are for a 1920×1080 frame.
 */
import type { VerticalFloatStyle } from './VerticalFloatLyrics';
import type { WaveformLayerProps } from './WaveformLayer';

/** What every saved sub-vertical-float track had in common. */
const sync = {
  negativeOffset: 0.3,
  floatThreshold: 5,
  noGaps: { enabled: true, maxLength: 1 },
  disableMetadata: false,
  impact: 1,
} as const;

/** AnimeZone lyric edits: white lines in the lower band, a spaced-out display font for the hero word. */
const amz = (accent: string, highlightFont: string, subFont: string): VerticalFloatStyle => ({
  avgFontSize: 95,
  textAlign: 'center',
  position: { top: 800, bottom: 100, left: 0, right: 0 },
  colors: { primary: '#f6f1f1', secondary: '#ffffff', accent },
  highlightTextStyle: {
    font: highlightFont,
    textScale: 1.1,
    textTransform: 'uppercase',
    letterSpacing: '2.5em',
    isGlowEnabled: true,
  },
  subTextStyle: {
    font: subFont,
    textScale: 1,
    textTransform: 'capitalize',
    letterSpacing: '0.15em',
    isGlowEnabled: true,
  },
  subtitleSync: {
    ...sync,
    animationStyle: 'word-fade-letterspace-float',
    layout: 'vertical',
    maxLines: 2,
    autoHighlight: true,
  },
});

/** Telugu devotional (subhodayam): Ramabhadra caps, white, no highlight colour, highlight words only from <b>. */
const devotional = (layout: 'horizontal' | 'vertical'): VerticalFloatStyle => ({
  avgFontSize: layout === 'horizontal' ? 120 : 100,
  textAlign: 'left',
  colors: { primary: '#ffffff', secondary: '#ffffff', accent: '' },
  highlightTextStyle: { font: 'Ramabhadra', textScale: 1, textTransform: 'uppercase', letterSpacing: '0em' },
  subTextStyle: { font: 'Ramabhadra', textScale: 1, textTransform: 'uppercase', letterSpacing: '0em' },
  subtitleSync: {
    ...sync,
    animationStyle: 'scentence-highlight-float',
    layout,
    maxLines: 4,
    autoHighlight: false,
  },
});

export const LYRIC_STYLES = {
  /** sub-vertical-float with the editor's defaults. */
  default: {},
  /** garou-beyondmonster: MetalMania hero word over BebasNeue, blood red glow. */
  'amz-red': amz('#c90202ef', 'MetalMania', 'BebasNeue'),
  /** itachi-inexorable: smaller (50), Michroma over Aldrich, highlight that spaces out letter by letter. */
  'amz-tech': {
    ...amz('#c90202ef', 'Michroma', 'Aldrich'),
    avgFontSize: 50,
    highlightTextStyle: {
      font: 'Michroma',
      textScale: 1.3,
      textTransform: 'uppercase',
      letterSpacing: '2.5em',
      isGlowEnabled: true,
    },
    subTextStyle: {
      font: 'Aldrich',
      textScale: 1,
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
      isGlowEnabled: true,
    },
    subtitleSync: {
      ...sync,
      animationStyle: 'scentence-highlight-letterspace-float',
      layout: 'vertical',
      maxLines: 2,
      autoHighlight: true,
    },
  },
  /** nezuko-lyrics: handwritten NothingYouCouldDo over Quicksand, pink glow, right two thirds of the frame. */
  'amz-pink': {
    ...amz('#ec4899bc', 'NothingYouCouldDo', 'Quicksand'),
    position: { left: '35%', right: 96, top: 0, bottom: 0 },
    highlightTextStyle: {
      font: 'NothingYouCouldDo',
      textScale: 1.3,
      textTransform: 'capitalize',
      letterSpacing: '2.5em',
      isGlowEnabled: true,
    },
    subTextStyle: {
      font: 'Quicksand',
      textScale: 1,
      textTransform: 'capitalize',
      letterSpacing: '0.05em',
      isGlowEnabled: true,
    },
  },
  /** giz-demon: one line at a time, sentence highlight, toxic green, no glow. */
  'amz-green': {
    ...amz('#07f898c0', 'MetalMania', 'BebasNeue'),
    avgFontSize: 60,
    position: { top: 850, bottom: 250, left: 0, right: 0 },
    highlightTextStyle: {
      font: 'MetalMania',
      textScale: 1.1,
      textTransform: 'uppercase',
      letterSpacing: '0.3em',
      isGlowEnabled: false,
    },
    subTextStyle: {
      font: 'BebasNeue',
      textScale: 1,
      textTransform: 'capitalize',
      letterSpacing: '0.15em',
      isGlowEnabled: false,
    },
    subtitleSync: {
      ...sync,
      animationStyle: 'scentence-highlight-float',
      layout: 'vertical',
      maxLines: 1,
      autoHighlight: true,
    },
  },
  /** Akhilanda Natha, Ayyappa: one horizontal line in the lower band. */
  'devotional-band': {
    ...devotional('horizontal'),
    position: { top: 820, bottom: 50, left: 100, right: 100 },
  },
  /** ChittiGanapayya: stacked lines in a left panel, the deity picture on the right. */
  'devotional-panel': {
    ...devotional('vertical'),
    position: { top: 0, bottom: 0, left: 150, right: 500 },
  },
  /** barghavive: stacked, centered in the right half, faint green highlight. */
  'devotional-right': {
    ...devotional('vertical'),
    textAlign: 'center',
    colors: { primary: '#f6f1f1', secondary: '#ffffff', accent: '#60f65f4f' },
    position: { top: 100, bottom: 100, left: 900, right: 10 },
  },
  /** The Day I Saw You (Love Note): thin PoiretOne over smaller Quicksand caps, no glow colour. */
  'love-note': {
    avgFontSize: 80,
    colors: { primary: '#ffffff', secondary: '#ffffff', accent: '#00000000' },
    highlightTextStyle: { font: 'PoiretOne', textTransform: 'uppercase', textScale: 1 },
    subTextStyle: { font: 'Quicksand', textTransform: 'uppercase', textScale: 0.8 },
    position: { top: 500, bottom: 200, left: 500, right: 500 },
    subtitleSync: {
      ...sync,
      animationStyle: 'scentence-highlight-letterspace-float',
      layout: 'vertical',
      maxLines: 4,
    },
  },
  /** youcanhavekingdom (InvertedDevils): NovaFlat / NovaOval, one horizontal line near the bottom. */
  kingdom: {
    avgFontSize: 65,
    textAlign: 'center',
    position: { top: '80%', left: 0, right: 0 },
    colors: { primary: '#ffffff', secondary: '#ffffff', accent: '#ff6b6b' },
    highlightTextStyle: { font: 'NovaFlat', textTransform: 'capitalize', letterSpacing: '0.04em', textScale: 1 },
    subTextStyle: { font: 'NovaOval', textTransform: 'none', letterSpacing: '0em', textScale: 1 },
    subtitleSync: {
      animationStyle: 'scentence-highlight-float',
      layout: 'horizontal',
      negativeOffset: 0.15,
      maxLines: 5,
      floatThreshold: 15,
      autoHighlight: true,
      noGaps: { enabled: false, maxLength: 3 },
      impact: 1,
    },
  },
} satisfies Record<string, VerticalFloatStyle>;

/**
 * The AnimeZone side bars: `waveform-audio` static histogram turned vertical and run up the left
 * edge, bar gradient in the video's accent colour.
 */
const sideBars = (
  color: string,
  extra: Record<string, unknown> = {},
  container: Record<string, unknown> = {},
): WaveformLayerProps => ({
  kind: 'waveform-audio',
  waveform: {
    type: 'static',
    barColor: '#fff',
    barSpacing: 8,
    barBorderRadius: 4,
    barWidth: 8,
    horizontalSymmetry: false,
    verticalMirror: true,
    gradientStartColor: color,
    gradientEndColor: color,
    gradientDirection: 'vertical',
    gradientStyle: 'mirrored',
    waveDirection: 'right-to-left',
    numberOfSamples: 128,
    useFrequencyData: true,
    histogramStyle: 'full-width',
    amplitude: 1,
    smoothNormalisation: 0.15,
    ...extra,
  },
  container: {
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    top: 0,
    height: 700,
    zIndex: 1,
    left: -1,
    right: 0,
    className: 'flex items-center justify-center',
    verticalTransform: true,
    verticalWidth: 1080,
    leftVerticalPos: -9.9,
    ...container,
  },
});

export const WAVE_STYLES = {
  /** FearlessBeats spectrum fill, the Wave Look action's default. */
  default: { kind: 'spectrum-fill', look: 'fearless-beats', impact: 0.5, box: { height: 320 } },
  /** garou-beyondmonster, itachi-inexorable */
  'side-bars-red': sideBars('#fa0404'),
  /** nezuko-lyrics */
  'side-bars-pink': sideBars('#ec4899'),
  /** The Day I Saw You: wider navy bars, a tight window, slightly further in. */
  'side-bars-navy': sideBars(
    '#0e3cb3',
    {
      gradientEndColor: '#0a2858',
      barWidth: 10,
      numberOfSamples: 96,
      smoothNormalisation: 0.1,
      windowInSeconds: 0.01,
    },
    { height: 800, leftVerticalPos: -7.2 },
  ),
  /** giz-demon: thin white slanted bars rising from the lower right. */
  'slant-bars': {
    kind: 'waveform-audio',
    waveform: {
      type: 'static',
      barColor: '#fff',
      barSpacing: 4,
      barBorderRadius: 8,
      barWidth: 2,
      barSlant: 17,
      horizontalSymmetry: false,
      verticalMirror: true,
      gradientStartColor: '#ffffff',
      gradientEndColor: '#ffffff',
      gradientDirection: 'vertical',
      gradientStyle: 'mirrored',
      waveDirection: 'right-to-left',
      numberOfSamples: 64,
      useFrequencyData: true,
      histogramStyle: 'full-width',
      amplitude: 1,
      smoothNormalisation: 0.4,
    },
    container: {
      position: 'absolute',
      top: 500,
      bottom: 0,
      left: -300,
      right: -52,
      width: 2020,
      height: 800,
      className: 'flex items-center justify-center',
    },
  },
  /** ChittiGanapayya, Akhilanda Natha, Ayyappa: a thin glowing spectrum line along the bottom. */
  'line-glow': {
    kind: 'spectrum-line',
    data: { strokeColor: '#edf4ea', strokeWidth: 3, glowColor: '#03ee44', glowBlur: 10 },
    box: { height: 300 },
  },
  /** The same line in white light, running up the left edge (Akhilanda Natha's rotated line). */
  'line-glow-side': {
    kind: 'spectrum-line',
    data: { strokeColor: '#edf4ea', strokeWidth: 3, glowColor: 'rgb(236, 237, 236)', glowBlur: 10 },
    box: { width: 1080, height: 300, left: -390, bottom: 390, transform: 'rotate(90deg)' },
  },
  /**
   * youcanhavekingdom, and the one saved Wave Look ("Fearless-double-wave-hit", inspired by the
   * Fearless music channel): red front wave, a pale pink echo 13 frames behind.
   */
  'fearless-double': {
    kind: 'spectrum-fill',
    look: 'fearless-beats',
    data: {
      fillColor: '#dd0000',
      layer2Color: '#ffe2e2',
      layerFrameOffset: 13,
      peakHeight: 0.42,
      gain: 15,
      noiseFloor: 0.05,
      temporalSmoothing: 0.6,
    },
    box: { height: 300 },
  },
} satisfies Record<string, WaveformLayerProps>;

export type LyricStyleName = keyof typeof LYRIC_STYLES;
export type WaveStyleName = keyof typeof WAVE_STYLES;

export const lyricStyle = (name: LyricStyleName): VerticalFloatStyle => LYRIC_STYLES[name];
export const waveStyle = (name: WaveStyleName): WaveformLayerProps =>
  WAVE_STYLES[name] as WaveformLayerProps;
