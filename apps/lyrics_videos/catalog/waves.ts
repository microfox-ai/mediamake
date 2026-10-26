/**
 * Step 1 of the storyboard: waveforms. The ones from mediamake timelines keep the parameters the
 * user's videos used (counted in the read-only export of 2026-10-24: 185 waveform-audio tracks, 91
 * distinct setups); `new` ones were designed for this catalog. Values are px for 1920×1080.
 * Shots: out/waveform-catalog/waves/<id>.jpg (npm run wave-lab -w lyrics_videos -- catalog waves).
 */
import type { WaveformLayerProps } from '../src/mediamake/WaveformLayer';
import type { CatalogEntry, WaveDesign } from '../src/mediamake/look';

type Bars = Extract<WaveformLayerProps, { kind: 'waveform-audio' }>;

/** mediamake's waveform-audio preset with the settings nearly every saved track shared. */
const bars = (waveform: Bars['waveform'], container: Bars['container']): Bars => ({
  kind: 'waveform-audio',
  waveform: {
    type: 'static',
    barColor: '#fff',
    barSpacing: 8,
    barBorderRadius: 4,
    barWidth: 4,
    horizontalSymmetry: false,
    verticalMirror: true,
    gradientStartColor: '#ffffff',
    gradientEndColor: '#ffffff',
    gradientDirection: 'vertical',
    gradientStyle: 'mirrored',
    waveDirection: 'right-to-left',
    useFrequencyData: true,
    histogramStyle: 'full-width',
    amplitude: 1,
    numberOfSamples: 128,
    smoothNormalisation: 0.1,
    ...waveform,
  },
  container: { backgroundColor: 'transparent', position: 'absolute', zIndex: 1, ...container },
});

/** Bars turned vertical and run up the left edge (leftVerticalPos moves them in or out). */
const SIDE = {
  top: 0,
  bottom: 0,
  left: -1,
  right: 0,
  height: 500,
  verticalTransform: true,
  verticalWidth: 1080,
  leftVerticalPos: -15.5,
  className: 'flex items-center justify-center',
};

/** Bars mirrored about the bottom edge, so only their top half rises into the frame. */
const STRIP = { bottom: -200, height: 400, verticalTransform: false };

type Line = Extract<WaveformLayerProps, { kind: 'spectrum-line' }>;
const line = (data: Line['data'], box: Line['box'] = {}): Line => ({
  kind: 'spectrum-line',
  data,
  box: { height: 300, ...box },
});

export const WAVES = {
  'side-bars-white': {
    name: 'Side bars, white',
    about: 'Thin white frequency bars running up the left edge. The AnimeZone staple: quiet, never fights the picture or the lyrics.',
    tags: ['anime', 'rap', 'hype', 'edm', 'any picture'],
    source: 'mediamake: 35 of the 61 left-edge bar tracks (aizen, asta, goat, gohan-rage, … 2025-10 → 2026-10)',
    value: bars({}, SIDE),
  },
  'side-bars-red': {
    name: 'Side bars, red',
    about: 'Wider blood-red bars up the left edge, taller box. For dark, aggressive art.',
    tags: ['anime', 'dark', 'aggressive', 'villain'],
    source: 'mediamake: garou-beyondmonster, itachi-inexorable (2026-10)',
    value: bars(
      { barWidth: 8, gradientStartColor: '#fa0404', gradientEndColor: '#f90202', smoothNormalisation: 0.15 },
      { ...SIDE, height: 700, leftVerticalPos: -9.9 },
    ),
  },
  'side-bars-pink': {
    name: 'Side bars, pink',
    about: 'Wide hot-pink bars that reach far into the frame.',
    tags: ['anime', 'cute', 'pop', 'romance'],
    source: 'mediamake: bony-lyrics (2026-10), nezuko-lyrics',
    value: bars(
      { barWidth: 10, numberOfSamples: 64, gradientStartColor: '#F33993', gradientEndColor: '#F33993' },
      { ...SIDE, height: 800, leftVerticalPos: -7.2 },
    ),
  },
  'side-bars-gold': {
    name: 'Side bars, gold',
    about: 'Wide bars in a pale-gold to amber gradient, very responsive (light smoothing).',
    tags: ['epic', 'triumph', 'warm'],
    source: 'mediamake: killmachine - levi (2026-10)',
    value: bars(
      { barWidth: 8, smoothNormalisation: 0.05, gradientStartColor: '#fddea1', gradientEndColor: '#f6b15c' },
      { ...SIDE, height: 700, leftVerticalPos: -10.5 },
    ),
  },
  'side-bars-sky': {
    name: 'Side bars, sky blue',
    about: 'The white side bars in a cool sky blue.',
    tags: ['calm', 'cool', 'night'],
    source: 'mediamake: rukia-lyrics (2026-09)',
    value: bars({ gradientStartColor: '#87CEEB', gradientEndColor: '#87CEEB' }, SIDE),
  },
  'side-bars-navy': {
    name: 'Side bars, navy',
    about: 'Wide navy-to-midnight bars with a tight window: dark, moody, low contrast.',
    tags: ['love', 'night', 'ballad', 'calm'],
    source: 'mediamake: The Day I Saw You (Love Note, 2026-10)',
    value: bars(
      {
        barWidth: 10,
        numberOfSamples: 96,
        windowInSeconds: 0.01,
        gradientStartColor: '#0e3cb3',
        gradientEndColor: '#0a2858',
      },
      { ...SIDE, height: 800, leftVerticalPos: -7.2 },
    ),
  },
  'side-bars-ember': {
    name: 'Side bars, ember (one-sided)',
    about: 'One-sided red-to-magenta bars, turned round so they grow from their own baseline.',
    tags: ['aggressive', 'fight', 'neon'],
    source: 'mediamake: badass-gohanfightsfreiza (2026-10)',
    value: bars(
      {
        barWidth: 8,
        numberOfSamples: 64,
        smoothNormalisation: 0.15,
        verticalMirror: false,
        gradientStartColor: '#ea0606',
        gradientEndColor: '#eb02d1',
      },
      { ...SIDE, height: 700, leftVerticalPos: 29, rotation: 180 },
    ),
  },
  'side-bars-centered': {
    name: 'Side bars, centered',
    about: 'Bars that grow from the middle of the edge outwards (centered histogram), smoothed over a second.',
    tags: ['anime', 'rap', 'calm'],
    source: 'mediamake: 33 tracks (amachine, baddest, killua, kingpin, … 2025-09 → 2026-04)',
    value: bars(
      { histogramStyle: 'centered', windowInSeconds: 1, smoothNormalisation: 0.3 },
      { ...SIDE, height: 400, bottom: 5, left: 2, leftVerticalPos: -17.5 },
    ),
  },
  'side-bars-symmetric': {
    name: 'Side bars, symmetric',
    about: 'Short bars mirrored top-to-bottom along the edge, a tight compact block.',
    tags: ['anime', 'minimal'],
    source: 'mediamake: gearfive-lyrics, kakashi-lostandfound (2025-11)',
    value: bars(
      { horizontalSymmetry: true, numberOfSamples: 64, windowInSeconds: 0.5 },
      { ...SIDE, height: 250, bottom: 5, left: 2, leftVerticalPos: -21.5 },
    ),
  },
  'bottom-strip': {
    name: 'Bottom strip',
    about: 'Low bars rising from the bottom edge, white to peach. The instrumental-video staple.',
    tags: ['instrumental', 'ost', 'any picture'],
    source: 'mediamake: 60 bottom-strip tracks (android17, beerus, gojo, chala, … instrumentals 2025-10 → 2026-10)',
    value: bars(
      { numberOfSamples: 64, amplitude: 0.5, gradientStartColor: '#FFFFFF', gradientEndColor: '#FDCE99' },
      STRIP,
    ),
  },
  'bottom-strip-gold': {
    name: 'Bottom strip, gold tall',
    about: 'Dense tall bars in a gold-to-bronze gradient climbing from the bottom.',
    tags: ['epic', 'power-up', 'instrumental'],
    source: 'mediamake: Goku, gokussj / vegetassj instrumental levels (2026-09)',
    value: bars(
      {
        numberOfSamples: 64,
        barSpacing: 4,
        amplitude: 0.75,
        gradientStartColor: '#EFE197',
        gradientEndColor: '#805427',
      },
      { bottom: -350, height: 800, verticalTransform: false },
    ),
  },
  'bottom-strip-ice': {
    name: 'Bottom strip, ice',
    about: 'A short white-to-ice-blue strip hugging the bottom edge.',
    tags: ['cool', 'calm', 'instrumental'],
    source: 'mediamake: kokuten instrumentals (2026-04)',
    value: bars(
      { numberOfSamples: 64, gradientStartColor: '#FFFFFF', gradientEndColor: '#ADD8E6' },
      { bottom: -85, height: 200, verticalTransform: false },
    ),
  },
  'slant-bars': {
    name: 'Slant bars',
    about: 'Thin white bars tilted 17°, rising from the lower right across the frame.',
    tags: ['anime', 'edgy', 'fast'],
    source: 'mediamake: giz-demon (2026-10)',
    value: bars(
      { barSpacing: 4, barBorderRadius: 8, barWidth: 2, barSlant: 17, numberOfSamples: 64, smoothNormalisation: 0.4 },
      {
        top: 500,
        bottom: 0,
        left: -300,
        right: -52,
        width: 2020,
        height: 800,
        className: 'flex items-center justify-center',
      },
    ),
  },
  'slant-cluster': {
    name: 'Slant cluster',
    about: 'A one-sided group of bars slanted 35°, low in the middle of the frame, heavily smoothed.',
    tags: ['cinematic', 'choir', 'epic'],
    source: 'mediamake: the bladechoir series (12 tracks, 2026-02 → 03)',
    value: bars(
      { barSlant: 35, verticalMirror: false, smoothNormalisation: 0.5, windowInSeconds: 1 },
      {
        top: 540,
        bottom: 5,
        left: 290,
        right: 600,
        height: 400,
        rotation: 0.5,
        className: 'flex items-center justify-center',
      },
    ),
  },
  'waves-side-red': {
    name: 'Wave bars up the side, red',
    about: 'The time-domain waveform (it moves with every syllable, not the frequencies) in red up the left edge.',
    tags: ['rap', 'vocal', 'aggressive'],
    source: 'mediamake: itachi-lyrics (2025-11)',
    value: bars(
      {
        type: 'waves',
        useFrequencyData: false,
        waveNumberOfSamples: 128,
        waveAmplitude: 2.5,
        gradientStartColor: '#E31519',
        gradientEndColor: '#E31519',
      },
      { ...SIDE, height: 200, bottom: 5, left: 2, leftVerticalPos: -20.5 },
    ),
  },
  'waves-strip': {
    name: 'Wave strip',
    about: 'The time-domain waveform as a symmetric white-to-peach strip at the bottom.',
    tags: ['vocal', 'podcast', 'calm'],
    source: 'mediamake: beatstitch-shaky-jiren, k (2025-12)',
    value: bars(
      {
        type: 'waves',
        horizontalSymmetry: true,
        useFrequencyData: false,
        smoothNormalisation: 1,
        gradientStartColor: '#FFFFFF',
        gradientEndColor: '#FDCE99',
      },
      { bottom: 0, height: 200, verticalTransform: false },
    ),
  },
  'fearless-double': {
    name: 'Fearless double wave',
    about: 'A red spectrum fill with a pale-pink echo 13 frames behind: the double hit of the Fearless music channel.',
    tags: ['dark', 'sultry', 'pop', 'r&b'],
    source: 'mediamake: youcanhavekingdom (INVERTED Devils, 2026-10) and the saved Wave Look "Fearless-double-wave-hit"',
    value: {
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
  },
  'fill-fearless-white': {
    name: 'Fearless beats, white',
    about: "The Wave Look action's default: two white hills that trail each other on the beat.",
    tags: ['pop', 'edm', 'any picture'],
    source: 'mediamake: the Wave Look action (waveformSpectrumFillChoice), fearless-beats at impact 0.5',
    value: {
      kind: 'spectrum-fill',
      look: 'fearless-beats',
      impact: 0.5,
      data: { fillColor: '#ffffff', layer2Color: 'rgba(255,255,255,0.45)' },
      box: { height: 320 },
    },
  },
  'fill-triple': {
    name: 'Triple wave',
    about: 'Three overlapping hills in three tones, mirrored so they interleave.',
    tags: ['pop', 'colourful', 'dance'],
    source: 'mediamake: the Wave Look action, triple-wave',
    value: {
      kind: 'spectrum-fill',
      look: 'triple-wave',
      impact: 0.55,
      data: { fillColor: '#f472b6', layer2Color: '#a78bfa', layer3Color: '#38bdf8', opacity: 0.9 },
      box: { height: 300 },
    },
  },
  'line-glow': {
    name: 'Glow line',
    about: 'A thin pale spectrum line along the bottom with a green glow.',
    tags: ['devotional', 'calm', 'telugu'],
    source: 'mediamake: ChittiGanapayya, Akhilanda Natha, Ayyappa (Subhodayam, 2026-10)',
    value: line({ strokeColor: '#edf4ea', strokeWidth: 3, glowColor: '#03ee44', glowBlur: 10 }),
  },
  'line-glow-side': {
    name: 'Glow line up the side',
    about: 'The glow line in white light, turned to run up the left edge.',
    tags: ['devotional', 'calm'],
    source: 'mediamake: Akhilanda Natha (2026-10)',
    value: line(
      { strokeColor: '#edf4ea', strokeWidth: 3, glowColor: 'rgb(236, 237, 236)', glowBlur: 10 },
      { width: 1080, left: -390, bottom: 390, transform: 'rotate(90deg)' },
    ),
  },

  // New designs, 2026-10-25
  'frame-bars': {
    name: 'Frame bars',
    about: 'White side bars on both edges, framing the picture and the lyrics between them.',
    tags: ['anime', 'symmetric', 'hype'],
    source: 'new 2026-10-25: side-bars-white mirrored onto the right edge',
    value: [bars({}, SIDE), { ...bars({}, SIDE), mirrorX: true }],
  },
  'center-pulse-line': {
    name: 'Center pulse line',
    about: 'A white spectrum line mirrored through the middle of the frame, like a heartbeat across the picture.',
    tags: ['love', 'ballad', 'minimal', 'acoustic'],
    source: 'new 2026-10-25: two spectrum lines on one baseline, one flipped',
    value: [
      line({ strokeColor: '#ffffff', strokeWidth: 2, glowColor: 'rgba(255,255,255,0.8)', glowBlur: 12, peakHeight: 0.8 }, { bottom: 540, height: 220 }),
      line(
        { strokeColor: '#ffffff', strokeWidth: 2, glowColor: 'rgba(255,255,255,0.8)', glowBlur: 12, peakHeight: 0.8 },
        { bottom: 320, height: 220, flip: true, opacity: 0.6 },
      ),
    ],
  },
  'horizon-glow': {
    name: 'Horizon glow',
    about: 'A low, soft sky-blue fill fading upwards with a bright edge: a glowing horizon under the picture.',
    tags: ['dreamy', 'ballad', 'night', 'lofi'],
    source: 'new 2026-10-25: single-wave spectrum fill with a gradient and an outline',
    value: {
      kind: 'spectrum-fill',
      look: 'single-wave',
      impact: 0.4,
      data: {
        fillColor: 'rgba(125,211,252,0.75)',
        gradientEndColor: 'rgba(125,211,252,0)',
        strokeColor: '#e0f2fe',
        strokeWidth: 2,
      },
      box: { height: 240 },
    },
  },
  jaws: {
    name: 'Jaws',
    about: 'Fearless-beats fills biting in from the top and the bottom edge at once. Loud and confrontational.',
    tags: ['aggressive', 'metal', 'trap', 'villain'],
    source: 'new 2026-10-25: fearless-beats at the bottom plus a flipped copy at the top',
    value: [
      { kind: 'spectrum-fill', look: 'fearless-beats', impact: 0.7, data: { fillColor: '#b91c1c', layer2Color: '#450a0a' }, box: { height: 260 } },
      {
        kind: 'spectrum-fill',
        look: 'fearless-beats',
        impact: 0.7,
        data: { fillColor: '#b91c1c', layer2Color: '#450a0a' },
        box: { height: 260, bottom: 820, flip: true },
      },
    ],
  },
  'card-bars': {
    name: 'Card bars',
    about: 'A short, neat block of centered bars low in the middle, like a music-player card under the lyrics.',
    tags: ['minimal', 'lofi', 'pop', 'clean'],
    source: 'new 2026-10-25: a centered histogram in a 720 px box',
    value: bars(
      { histogramStyle: 'centered', numberOfSamples: 64, barWidth: 6, barSpacing: 6, smoothNormalisation: 0.3, amplitude: 0.9 },
      { bottom: 70, height: 140, width: 720, verticalTransform: false, className: 'flex items-center justify-center' },
    ),
  },
  'neon-twin-lines': {
    name: 'Neon twin lines',
    about: 'A cyan and a magenta spectrum line running in opposite directions and crossing: synthwave.',
    tags: ['synthwave', 'edm', 'neon', 'night drive'],
    source: 'new 2026-10-25: two glow lines, one high-to-low',
    value: [
      line({ strokeColor: '#67e8f9', strokeWidth: 3, glowColor: '#06b6d4', glowBlur: 14, peakHeight: 0.7 }, { height: 280 }),
      line(
        { strokeColor: '#f0abfc', strokeWidth: 3, glowColor: '#d946ef', glowBlur: 14, peakHeight: 0.7, direction: 'high-to-low' },
        { height: 280 },
      ),
    ],
  },
  'ember-rise': {
    name: 'Ember rise',
    about: 'Tall, dense bars from the bottom edge in an orange-to-red gradient: heat rising off the floor.',
    tags: ['hype', 'workout', 'trap', 'fire'],
    source: 'new 2026-10-25: the gold bottom strip in fire colours, taller',
    value: bars(
      {
        numberOfSamples: 64,
        barSpacing: 5,
        barWidth: 5,
        amplitude: 0.85,
        gradientStartColor: '#fde047',
        gradientEndColor: '#dc2626',
      },
      { bottom: -300, height: 760, verticalTransform: false },
    ),
  },
} satisfies Record<string, CatalogEntry<WaveDesign>>;
