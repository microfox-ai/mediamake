/**
 * Step 3 of the storyboard: how the lyrics move — a mediamake caption preset with its animation,
 * layout, size and place. Fonts and colours are not here: they come from the font set (step 2).
 * Counts are from the read-only export of mediamake timelines (2026-10-24: 150 sub-vertical-float,
 * 22 sub-fast-rap-static, 12 sub-kinetic-motion tracks); presets the user never used are marked new.
 * Shots: out/waveform-catalog/captions/<id>.jpg, four moments of one line
 * (npm run wave-lab -w lyrics_videos -- catalog captions).
 */
import type { CaptionSetup, CatalogEntry } from '../src/mediamake/look';

/** What every saved sub-vertical-float track had in common. */
const sync = {
  negativeOffset: 0.3,
  floatThreshold: 5,
  noGaps: { enabled: true, maxLength: 1 },
  disableMetadata: false,
  impact: 1,
  autoHighlight: true,
};

/** Places in a 1920×1080 frame. */
const LOWER = { top: 800, bottom: 100, left: 0, right: 0 };
const BAND = { top: 820, bottom: 50, left: 100, right: 100 };
const CENTER = { top: 0, bottom: 0, left: 0, right: 0 };

const float = (
  animationStyle: string,
  o: { layout?: 'vertical' | 'horizontal'; maxLines?: number; size?: number; position?: object; textAlign?: string; sync?: object } = {},
): CaptionSetup => ({
  preset: 'sub-vertical-float',
  params: {
    avgFontSize: o.size ?? 80,
    textAlign: o.textAlign ?? 'center',
    position: o.position ?? LOWER,
    subtitleSync: {
      ...sync,
      animationStyle,
      layout: o.layout ?? 'vertical',
      maxLines: o.maxLines ?? 2,
      ...o.sync,
    },
  },
});

/** sub-fast-rap-static: one sentence (or one word) at a time, a blur transition between them. */
const rap = (transitionStyle: string, o: { size?: number; top?: number; spacing?: string; glow?: string; offset?: number } = {}): CaptionSetup => ({
  preset: 'sub-fast-rap-static',
  params: {
    avgFontSize: o.size ?? 90,
    position: { align: 'fixed', randomize: false, textAlign: 'center', top: o.top ?? 780, bottom: 60, left: 0, right: 0 },
    subtitleSync: {
      transitionStyle,
      negativeOffset: o.offset ?? 0.4,
      maxLines: 3,
      transitionDuration: 0.08,
      staticWordOpacity: 1,
      highlightIntensity: 1,
      disableMetadata: false,
      noGaps: { enabled: false, maxLength: 3 },
      eachWordAScentence: true,
    },
    style: {
      extraStyleProps: {
        letterSpacing: o.spacing ?? '0.4rem',
        ...(o.glow ? { textShadow: `2px 2px 200px ${o.glow}` } : {}),
      },
    },
  },
});

const kinetic = (animationPreset: string, o: { size?: number; top?: number; maxLines?: number; extra?: object } = {}): CaptionSetup => ({
  preset: 'sub-kinetic-motion',
  params: {
    avgFontSize: o.size ?? 70,
    position: { align: 'fixed', randomize: false, textAlign: 'center', top: o.top ?? 700, left: 0, right: 0 },
    kineticMotion: {
      animationPreset,
      motionIntensity: 0.8,
      negativeOffset: 0.4,
      maxLines: o.maxLines ?? 3,
      disableMetadata: false,
      noGaps: { enabled: false, maxLength: 3 },
      fontScaling: { highlighted: 1.25, normal: 1 },
      ...o.extra,
    },
  },
});

const gradient = (animationStyle: string, normal: string, highlight: string, accent: string): CaptionSetup => ({
  preset: 'sub-kinetic-gradient-flow',
  params: {
    avgFontSize: 70,
    position: { align: 'center', randomize: false, textAlign: 'center' },
    subtitleSync: {
      animationStyle,
      layout: 'horizontal',
      negativeOffset: 0.3,
      maxLines: 3,
      floatThreshold: 15,
      disableMetadata: false,
      noGaps: { enabled: false, maxLength: 3 },
      fontScaling: { highlighted: 1.4, normal: 0.95 },
      impact: 1,
    },
    gradientChoices: [{ normalGradient: normal, highlightGradient: highlight, accentColor: accent }],
  },
});

export const CAPTIONS = {
  'pulse-shake-4': {
    name: 'Pulse shake, 4 lines',
    about: 'Words punch in with a pulse and a shake, up to four lines stacking in the lower band. The most used setup.',
    tags: ['rap', 'hype', 'anime', 'aggressive'],
    source: 'mediamake: 85 tracks (bony, Cute little forever, goten, killmachine, … 2025-10 → 2026-10)',
    value: float('aggressive-pulse-shake-float', { maxLines: 4, size: 80, position: { top: 760, bottom: 10, left: 0, right: 0 } }),
  },
  'letterspace-float-2': {
    name: 'Letter-space float, 2 lines',
    about: 'Each word fades in while its letters drift apart; two lines in the lower band.',
    tags: ['anime', 'cinematic', 'dark'],
    source: 'mediamake: nezuko-lyrics, garou-beyondmonster, kingpin, shunsui (2026-04 → 10)',
    value: float('word-fade-letterspace-float', { size: 95 }),
  },
  'letterspace-float-4': {
    name: 'Letter-space float, 4 lines, centred',
    about: 'The letter-space float in the middle of the frame, up to four lines.',
    tags: ['cinematic', 'epic'],
    source: 'mediamake: krillin-earthlytether, erwin, yuta, gokublack (2026-02 → 10)',
    value: float('word-fade-letterspace-float', { maxLines: 4, position: CENTER }),
  },
  'blur-float-4': {
    name: 'Blur float',
    about: 'Words come into focus out of a soft blur, slow and melodic, up to four lines low in the frame.',
    tags: ['ballad', 'love', 'sad', 'lofi'],
    source: 'mediamake: nami-fanletter-lyrics, goku-goodbye (2025-12)',
    value: float('melodic-fade-blur-float', { maxLines: 4, size: 75, position: { top: 760, bottom: 20, left: 0, right: 0 }, sync: { negativeOffset: 0.5 } }),
  },
  'sentence-float-2': {
    name: 'Sentence highlight, 2 lines',
    about: 'The whole line shows, the sung words light up and the highlight word grows; two lines low. Calm and readable.',
    tags: ['any song', 'default', 'readable'],
    source: 'mediamake: atomic - cid, bojja, nakama, gravity (2026-02 → 10)',
    value: float('scentence-highlight-float', { size: 80 }),
  },
  'sentence-band': {
    name: 'Sentence highlight, one band',
    about: 'Lines flow left to right in one horizontal band near the bottom.',
    tags: ['devotional', 'pop', 'readable'],
    source: 'mediamake: Ayyappa, Akhilanda Natha, youcanhavekingdom (2026-10)',
    value: float('scentence-highlight-float', { layout: 'horizontal', maxLines: 4, size: 100, position: BAND }),
    shotWith: { fonts: 'novaflat-novaoval' },
  },
  'sentence-panel': {
    name: 'Sentence highlight, side panel',
    about: 'Lines stacked in the left half, left-aligned, leaving the right half to the picture.',
    tags: ['devotional', 'portrait art', 'story'],
    source: 'mediamake: ChittiGanapayya, barghavive (2026-10)',
    value: float('scentence-highlight-float', {
      maxLines: 4,
      size: 90,
      textAlign: 'left',
      position: { top: 0, bottom: 0, left: 150, right: 960 },
    }),
  },
  'sentence-letterspace-2': {
    name: 'Letter-spacing highlight, 2 lines',
    about: 'The sung line lights up while its highlight word spaces out letter by letter; small and wide.',
    tags: ['anime', 'tech', 'cold'],
    source: 'mediamake: itachi-inexorable (2026-10)',
    value: float('scentence-highlight-letterspace-float', { size: 50 }),
    shotWith: { fonts: 'michroma-aldrich' },
  },
  'sentence-letterspace-4': {
    name: 'Letter-spacing highlight, centred stack',
    about: 'The same, as a narrow centred stack of up to four lines.',
    tags: ['love', 'ballad', 'minimal'],
    source: 'mediamake: The Day I Saw You, Cute little forever 2 (2026-10)',
    value: float('scentence-highlight-letterspace-float', {
      maxLines: 4,
      position: { top: 500, bottom: 200, left: 500, right: 500 },
    }),
    shotWith: { fonts: 'poiret-quicksand' },
  },
  'one-line': {
    name: 'One line at a time',
    about: 'Only the line being sung, one row, smaller; nothing waits on screen.',
    tags: ['minimal', 'fast', 'rap'],
    source: 'mediamake: giz-demon (2026-10)',
    value: float('scentence-highlight-float', { maxLines: 1, size: 70, position: { top: 860, bottom: 120, left: 0, right: 0 } }),
  },
  typewriter: {
    name: 'Typewriter',
    about: 'Each line types itself out, letter by letter, with a soft glow.',
    tags: ['story', 'pop', 'indie'],
    source: 'mediamake: supermel-iamthbrave, supermel-wearethestars (2025-12 → 2026-01)',
    value: float('horizontal-typewriter', {
      maxLines: 4,
      size: 90,
      position: { top: 700, bottom: 50, left: 0, right: 0 },
      sync: { impact: 0.1, negativeOffset: 0.5 },
    }),
  },
  'bounce-flow': {
    name: 'Bounce flow',
    about: 'Big words bounce in one after another across the middle of the frame.',
    tags: ['fun', 'pop', 'adventure'],
    source: 'mediamake: whitebeard (2025-10)',
    value: float('horizontal-bounce-flow', { layout: 'horizontal', maxLines: 4, size: 110, position: CENTER, sync: { impact: 0.5 } }),
  },
  'slide-reveal': {
    name: 'Slide reveal',
    about: 'Words slide out from behind each other, large, across the middle.',
    tags: ['instrumental', 'title', 'hype'],
    source: 'mediamake: vegetassj-instrumental-levels (2026-09)',
    value: float('horizontal-slide-reveal', { layout: 'horizontal', maxLines: 5, size: 110, position: CENTER, sync: { impact: 0.3 } }),
  },
  'wave-breathing': {
    name: 'Wave breathing',
    about: 'Lines rise and fall gently like breathing, centred.',
    tags: ['ballad', 'dreamy', 'calm'],
    source: 'new 2026-10-25: sub-vertical-float melodic-wave-breathing, never used in a timeline',
    value: float('melodic-wave-breathing', { maxLines: 3, size: 85, position: CENTER }),
  },
  'color-flow': {
    name: 'Colour flow',
    about: 'Colour flows through the words as they are sung, centred.',
    tags: ['pop', 'colourful', 'dreamy'],
    source: 'new 2026-10-25: sub-vertical-float melodic-color-flow, never used in a timeline',
    value: float('melodic-color-flow', { maxLines: 3, size: 85, position: CENTER }),
  },
  'gentle-drift': {
    name: 'Gentle drift',
    about: 'Lines drift slowly sideways as they play, low in the frame.',
    tags: ['lofi', 'acoustic', 'calm'],
    source: 'new 2026-10-25: sub-vertical-float melodic-gentle-drift, never used in a timeline',
    value: float('melodic-gentle-drift', { maxLines: 2, size: 85 }),
  },
  'ripple-expand': {
    name: 'Ripple expand',
    about: 'Words ripple outwards from the centre as they appear.',
    tags: ['edm', 'dance', 'hype'],
    source: 'new 2026-10-25: sub-vertical-float horizontal-ripple-expand, never used in a timeline',
    value: float('horizontal-ripple-expand', { layout: 'horizontal', maxLines: 4, size: 100, position: CENTER }),
  },
  'zoom-cascade': {
    name: 'Zoom cascade',
    about: 'Words zoom in from far away in a cascade.',
    tags: ['edm', 'cinematic', 'epic'],
    source: 'new 2026-10-25: sub-vertical-float horizontal-zoom-cascade, never used in a timeline',
    value: float('horizontal-zoom-cascade', { layout: 'horizontal', maxLines: 4, size: 100, position: CENTER }),
  },
  'rap-slide-up': {
    name: 'Rap: slide up blur',
    about: 'One word at a time slides up out of a blur, tracked wide. Built for fast verses.',
    tags: ['rap', 'fast', 'anime'],
    source: 'mediamake: kisuke-lyricvideo (sub-fast-rap-static, 2026-09)',
    value: rap('slide-up-blur', { spacing: '20px' }),
  },
  'rap-blur-slide': {
    name: 'Rap: blur slide right',
    about: 'Each sentence slides in from the right through a blur. The fast-rap preset\'s default, its most used.',
    tags: ['rap', 'fast'],
    source: 'mediamake: minato-final and 13 more (sub-fast-rap-static, 2025-10 → 2026-05)',
    value: rap('blur-slide-right', { size: 100, offset: 0.2 }),
  },
  'rap-zoom-impact': {
    name: 'Rap: zoom impact',
    about: 'Words zoom at the viewer out of a blur, hard hits.',
    tags: ['rap', 'trap', 'aggressive'],
    source: 'mediamake: skyline-lyrics (2026-02)',
    value: rap('zoom-blur-impact', { size: 70, top: 700, spacing: '1.5rem', offset: 0.2 }),
  },
  'rap-glitch': {
    name: 'Rap: glitch',
    about: 'Words glitch in and out with a blur, a gold glow behind them.',
    tags: ['rap', 'tech', 'villain'],
    source: 'mediamake: freiza-lyrics (2026-02)',
    value: rap('glitch-blur-transition', { top: 750, spacing: '1.5rem', glow: '#FFD700' }),
  },
  'rap-scale-entrance': {
    name: 'Rap: scale entrance',
    about: 'Words scale up out of a blur, tracked very wide with an ice-blue glow.',
    tags: ['rap', 'sport', 'anime'],
    source: 'mediamake: isagi-lyrics (2026-03)',
    value: rap('scale-blur-entrance', { size: 100, top: 700, spacing: '2.5rem', glow: '#86D4F2', offset: 0.5 }),
    shotWith: { fonts: 'stalinist-fugaz' },
  },
  'rap-pulse-beat': {
    name: 'Rap: pulse on the beat',
    about: 'Words pulse with a blur in time with the beat, low in the frame.',
    tags: ['rap', 'edm'],
    source: 'mediamake: gogeta-apexsaiyans-lyrics (2026-01)',
    value: rap('pulse-blur-beat', { size: 80, top: 850, offset: 0.7 }),
  },
  'kinetic-soft-bounce': {
    name: 'Kinetic: soft bounce',
    about: 'Words bounce softly into place, up to five lines in the middle.',
    tags: ['pop', 'fun', 'speech'],
    source: 'mediamake: k (sub-kinetic-motion, 2025-12)',
    value: kinetic('soft-bounce', { size: 60, top: 380, maxLines: 5 }),
  },
  'kinetic-elegant-drift': {
    name: 'Kinetic: elegant drift',
    about: 'Words drift in slowly and elegantly, low in the frame.',
    tags: ['speech', 'motivation', 'calm'],
    source: 'mediamake: standingali-finalproject (2025-10)',
    value: kinetic('elegant-drift', { size: 60 }),
  },
  'kinetic-subtle-glow': {
    name: 'Kinetic: subtle glow',
    about: 'Words glow up with motion blur and a faint wave distortion, two lines mid-frame.',
    tags: ['cinematic', 'dark'],
    source: 'mediamake: minato-saved (2025-10)',
    value: kinetic('subtle-glow', { size: 80, top: 400, maxLines: 2, extra: { motionBlur: true, particleEffects: true, waveDistortion: true } }),
  },
  'gradient-neon-burst': {
    name: 'Gradient: neon burst',
    about: 'Words filled with a neon gradient that bursts as they are sung.',
    tags: ['edm', 'neon', 'synthwave'],
    source: 'new 2026-10-25: sub-kinetic-gradient-flow, never used in a timeline',
    value: gradient(
      'gradient-neon-burst',
      'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
      'linear-gradient(135deg, #f0abfc 0%, #ec4899 100%)',
      '#ec4899',
    ),
  },
  'gradient-aurora-drift': {
    name: 'Gradient: aurora drift',
    about: 'An aurora gradient drifting through the words.',
    tags: ['dreamy', 'night', 'ambient'],
    source: 'new 2026-10-25: sub-kinetic-gradient-flow, never used in a timeline',
    value: gradient(
      'gradient-aurora-drift',
      'linear-gradient(135deg, #a7f3d0 0%, #93c5fd 100%)',
      'linear-gradient(135deg, #6ee7b7 0%, #c4b5fd 100%)',
      '#6ee7b7',
    ),
  },
  'gradient-fire-flicker': {
    name: 'Gradient: fire flicker',
    about: 'Words burning in a flickering fire gradient.',
    tags: ['aggressive', 'fire', 'metal'],
    source: 'new 2026-10-25: sub-kinetic-gradient-flow, never used in a timeline',
    value: gradient(
      'gradient-fire-flicker',
      'linear-gradient(180deg, #fde047 0%, #f97316 100%)',
      'linear-gradient(180deg, #fef08a 0%, #dc2626 100%)',
      '#f97316',
    ),
  },
  'scroll-up': {
    name: 'Scrolling lyrics',
    about: 'The lyrics scroll upwards like a lyric sheet, the sung line glowing.',
    tags: ['karaoke', 'lyric sheet', 'calm'],
    source: 'new 2026-10-25: sub-scrolling-vertical, never used in a timeline',
    value: {
      preset: 'sub-scrolling-vertical',
      params: {
        position: { align: 'center', margin: 80 },
        wordAnimation: { style: 'fade-in', duration: 0.4, intensity: 1, stagger: 0.05 },
        highlightEffects: { enabled: true, style: 'glow', intensity: 1.5, duration: 0.3 },
        style: { fontSize: 56 },
      },
    },
  },
} satisfies Record<string, CatalogEntry<CaptionSetup>>;
