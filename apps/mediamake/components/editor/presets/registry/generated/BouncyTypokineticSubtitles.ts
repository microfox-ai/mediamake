/**
 * Bouncy Typokinetic Subtitles Preset
 *
 * This preset creates playful cartoon-inspired typokinetic subtitles with exaggerated physics.
 * Words slide in on arcing paths with rotation wobbles, compress on landing with squash effects,
 * then spring back to normal. Features cubic-bezier bounce easing, staggered word animations,
 * and transform-origin control for professional yet fun Pixar-style motion graphics.
 *
 * Features:
 * - **Arc Motion**: Words slide in on parabolic paths (not straight lines)
 * - **Rotation Wobble**: Rotation oscillates between -15deg and +15deg during flight, settling at 0deg
 * - **Squash Effect**: Words compress on landing (scaleY to 0.85) then spring back
 * - **Subtle Skew**: Adds personality with skewX during flight
 * - **Staggered Timing**: Each word delayed by 0.12s with slight overlap for energy
 * - **Spring Easing**: Cubic-bezier(0.68, -0.55, 0.265, 1.55) for bounce feel
 *
 * Use cases:
 * - Creating energetic subtitle animations for playful content
 * - Building Pixar-style title sequences
 * - Adding cartoon motion graphics to videos
 * - Creating fun yet professional text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Schema for Input Parameters ---
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Caption text'),
        start: z.number().describe('Caption start time (relative to video)'),
        absoluteStart: z.number().describe('Caption absolute start time'),
        duration: z.number().describe('Caption duration'),
        absoluteEnd: z.number().describe('Caption absolute end time'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z.number().describe('Word start time (relative to caption)'),
              absoluteStart: z.number().describe('Word absolute start time'),
              duration: z.number().describe('Word duration'),
              absoluteEnd: z.number().describe('Word absolute end time'),
            })
          )
          .optional()
          .describe('Word-level timing data'),
      })
    )
    .describe('Array of captions with word-level timing'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),

  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (Google Font name)'),

  fontWeight: z
    .string()
    .default('800')
    .optional()
    .describe('Font weight (e.g., 400, 700, 800)'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),

  textShadow: z
    .string()
    .default('0 4px 12px rgba(0, 0, 0, 0.4)')
    .optional()
    .describe('Text shadow for depth'),

  gapBetweenWords: z
    .string()
    .default('12px')
    .optional()
    .describe('Gap between words (CSS gap value)'),

  bottomPosition: z
    .string()
    .default('15%')
    .optional()
    .describe('Distance from bottom of screen (CSS bottom value)'),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.12)
    .optional()
    .describe('Delay between each word animation (seconds)'),

  arcIntensity: z
    .number()
    .min(0)
    .max(200)
    .default(80)
    .optional()
    .describe('Arc height intensity (pixels)'),

  rotationRange: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .optional()
    .describe('Maximum rotation wobble (degrees)'),

  squashAmount: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.85)
    .optional()
    .describe('Squash compression amount (scaleY value)'),

  animationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Duration of entry animation (seconds)'),

  trackName: z
    .string()
    .default('bouncy-typokinetic-subtitles')
    .optional()
    .describe('Track name for component IDs'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    captions,
    fontSize = 48,
    fontFamily = 'Inter',
    fontWeight = '800',
    textColor = '#ffffff',
    textShadow = '0 4px 12px rgba(0, 0, 0, 0.4)',
    gapBetweenWords = '12px',
    bottomPosition = '15%',
    staggerDelay = 0.12,
    arcIntensity = 80,
    rotationRange = 15,
    squashAmount = 0.85,
    animationDuration = 0.5,
    trackName = 'bouncy-typokinetic-subtitles',
  } = params;

  // Helper function to create word component with bouncy effects
  const createWordComponent = (
    word: { text: string; start: number; duration: number },
    wordIndex: number,
    captionIndex: number
  ): RenderableComponentData => {
    const wordId = `${trackName}-caption-${captionIndex}-word-${wordIndex}`;

    // Calculate staggered start time (relative to caption start)
    const wordRelativeStart = word.start + wordIndex * staggerDelay;

    // Arc motion keyframes
    const arcPeakProgress = 0.3; // Arc peaks at 30% of animation
    const arcTranslateYRanges = [
      { key: 'translateY', val: `-${arcIntensity}px`, prog: 0 },
      { key: 'translateY', val: `-${arcIntensity * 0.5}px`, prog: arcPeakProgress },
      { key: 'translateY', val: '0px', prog: 1 },
    ];

    // Rotation wobble keyframes
    const rotationRanges = [
      { key: 'rotate', val: `-${rotationRange}deg`, prog: 0 },
      { key: 'rotate', val: `${rotationRange * 0.8}deg`, prog: 0.25 },
      { key: 'rotate', val: `-${rotationRange * 0.5}deg`, prog: 0.5 },
      { key: 'rotate', val: '0deg', prog: 1 },
    ];

    // Squash effect timing (happens near end of entry animation)
    const squashStart = animationDuration * 0.84; // Start squash at 84% of animation
    const squashDuration = animationDuration * 0.32; // Squash lasts 32% of animation duration
    const squashScaleXCompensation = 1 + (1 - squashAmount) * 0.6; // Compensate width

    const squashScaleYRanges = [
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: squashAmount, prog: 0.4 },
      { key: 'scaleY', val: 1.05, prog: 0.7 },
      { key: 'scaleY', val: 1, prog: 1 },
    ];

    const squashScaleXRanges = [
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: squashScaleXCompensation, prog: 0.4 },
      { key: 'scaleX', val: 0.98, prog: 0.7 },
      { key: 'scaleX', val: 1, prog: 1 },
    ];

    // Subtle skew for personality
    const skewRanges = [
      { key: 'skewX', val: '-8deg', prog: 0 },
      { key: 'skewX', val: '4deg', prog: 0.3 },
      { key: 'skewX', val: '0deg', prog: 1 },
    ];

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          textShadow: textShadow,
          transformOrigin: 'bottom center',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: wordRelativeStart,
          duration: word.duration + staggerDelay, // Extend duration to cover stagger
        },
      },
      effects: [
        // Arc entry - translateX
        {
          id: `${wordId}-arc-translate-x`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
            start: 0,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'translateX', val: '150%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
            ],
          },
        },
        // Arc entry - translateY (parabolic path)
        {
          id: `${wordId}-arc-translate-y`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
            start: 0,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: arcTranslateYRanges,
          },
        },
        // Rotation wobble
        {
          id: `${wordId}-rotation-wobble`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: rotationRanges,
          },
        },
        // Squash effect - scaleY
        {
          id: `${wordId}-squash-scale-y`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
            start: squashStart,
            duration: squashDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: squashScaleYRanges,
          },
        },
        // Squash effect - scaleX (compensation)
        {
          id: `${wordId}-squash-scale-x`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
            start: squashStart,
            duration: squashDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: squashScaleXRanges,
          },
        },
        // Subtle skew
        {
          id: `${wordId}-skew`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: skewRanges,
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const captionId = `${trackName}-caption-${captionIndex}`;
    const words = caption.words || [];

    // Create word components
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) =>
      createWordComponent(word, wordIndex, captionIndex)
    );

    return {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-0 right-0 flex flex-row items-center justify-center pointer-events-none',
          style: {
            bottom: bottomPosition,
            gap: gapBetweenWords,
            transformOrigin: 'bottom center',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration + words.length * staggerDelay, // Extend for stagger
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    childrenData: captionContainers,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'BouncyTypokineticSubtitles',
  title: 'Bouncy Typokinetic Subtitles',
  description:
    'Playful cartoon-inspired typokinetic subtitles with exaggerated physics. Words slide in on arcing paths with rotation wobbles, compress on landing with squash effects, then spring back to normal. Features cubic-bezier bounce easing, staggered word animations, and transform-origin control for professional yet fun Pixar-style motion graphics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'typokinetics',
    'bouncy',
    'cartoon',
    'playful',
    'arc-motion',
    'squash-stretch',
    'rotation-wobble',
    'pixar',
    'motion-graphics',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        text: 'Hello World',
        start: 0,
        absoluteStart: 0,
        duration: 3,
        absoluteEnd: 3,
        words: [
          { text: 'Hello', start: 0, absoluteStart: 0, duration: 1, absoluteEnd: 1 },
          { text: 'World', start: 1, absoluteStart: 1, duration: 2, absoluteEnd: 3 },
        ],
      },
    ],
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '800',
    textColor: '#ffffff',
    textShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    gapBetweenWords: '12px',
    bottomPosition: '15%',
    staggerDelay: 0.12,
    arcIntensity: 80,
    rotationRange: 15,
    squashAmount: 0.85,
    animationDuration: 0.5,
    trackName: 'bouncy-typokinetic-subtitles',
  },
};

// --- Export Preset ---
export const BouncyTypokineticSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
