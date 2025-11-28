/**
 * Center Split Text Reveal Preset
 *
 * A sophisticated text reveal preset where existing words slide horizontally apart from center
 * with ease-out easing, making space for a new word that scales up from zero with elastic spring
 * overshoot. Features blur-to-focus and opacity fade effects on the middle word, mimicking
 * professional motion graphics with anticipation and follow-through. Uses GPU-accelerated
 * transforms via will-change property.
 *
 * Features:
 * - Words slide apart horizontally from center with smooth ease-out curve
 * - Middle word emerges with elastic spring overshoot (0→1.1→1.0 scale)
 * - Blur-to-focus effect (4px→0) on middle word for enhanced reveal
 * - Opacity fade (0→1) on middle word
 * - GPU acceleration via will-change: transform
 * - 0.2s overlap timing for smooth choreographed reveal
 * - fitDurationTo: 'children' for dynamic timing
 *
 * Use cases:
 * - Video editor-style center-split transitions
 * - Professional motion graphics typography
 * - Dynamic text reveals with anticipation/follow-through
 * - Headline animations with smooth spacing transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  leftWord: z.string().describe('Text for the word sliding to the left'),
  middleWord: z.string().describe('Text for the word emerging in the center'),
  rightWord: z.string().describe('Text for the word sliding to the right'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., Inter, Roboto)'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size in pixels for all words'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (CSS color)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., 400, 700, bold)'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the slide-apart transition in seconds'),
  slideDistance: z
    .number()
    .default(150)
    .describe('Distance in pixels that words slide apart (left/right)'),
  scaleOvershoot: z
    .number()
    .default(1.1)
    .describe('Peak scale value for middle word overshoot (e.g., 1.1 = 110%)'),
  scaleDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the scale animation in seconds'),
  overlapDelay: z
    .number()
    .default(0.2)
    .describe(
      'Delay before middle word animation starts (overlap with slide)',
    ),
  blurStart: z
    .number()
    .default(4)
    .describe('Initial blur amount in pixels for middle word'),
  duration: z
    .number()
    .optional()
    .describe(
      'Total duration of the animation (optional, uses fitDurationTo: children if not provided)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftWord,
    middleWord,
    rightWord,
    fontFamily,
    fontSize,
    textColor,
    fontWeight,
    transitionDuration,
    slideDistance,
    scaleOvershoot,
    scaleDuration,
    overlapDelay,
    blurStart,
    duration,
  } = params;

  // Calculate total duration
  const totalDuration =
    duration || Math.max(transitionDuration, overlapDelay + scaleDuration);

  // Generate unique IDs
  const leftWordId = 'left-word-slide';
  const middleWordId = 'middle-word-emerge';
  const rightWordId = 'right-word-slide';

  // Create left word (slides left)
  const leftWordComponent: RenderableComponentData = {
    id: leftWordId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: leftWord,
      className: 'absolute left-1/2 -translate-x-1/2',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight,
        willChange: 'transform',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'slide-left-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [leftWordId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -slideDistance, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create middle word (emerges with scale, opacity, blur)
  const middleWordComponent: RenderableComponentData = {
    id: middleWordId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: middleWord,
      className: 'absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight,
        willChange: 'transform, opacity, filter',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Scale effect with spring easing and overshoot
      {
        id: 'scale-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: overlapDelay,
          duration: scaleDuration,
          mode: 'provider',
          targetIds: [middleWordId],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: scaleOvershoot, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Opacity fade-in
      {
        id: 'opacity-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: overlapDelay,
          duration: 0.6,
          mode: 'provider',
          targetIds: [middleWordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Blur-to-focus effect
      {
        id: 'blur-focus-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: overlapDelay,
          duration: 0.6,
          mode: 'provider',
          targetIds: [middleWordId],
          ranges: [
            { key: 'blur', val: blurStart, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create right word (slides right)
  const rightWordComponent: RenderableComponentData = {
    id: rightWordId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: rightWord,
      className: 'absolute left-1/2 -translate-x-1/2',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight,
        willChange: 'transform',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'slide-right-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [rightWordId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: slideDistance, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'center-split-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
        fitDurationTo: duration ? undefined : 'children',
      },
    },
    childrenData: [leftWordComponent, middleWordComponent, rightWordComponent],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'center-split-text-reveal',
  title: 'Center Split Text Reveal',
  description:
    'A sophisticated text reveal preset where existing words slide horizontally apart from center with ease-out easing, making space for a new word that scales up from zero with elastic spring overshoot. Features blur-to-focus and opacity fade effects on the middle word, mimicking professional motion graphics with anticipation and follow-through. Uses GPU-accelerated transforms via will-change property.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'split',
    'transition',
    'typography',
    'motion-graphics',
    'center',
    'slide',
    'scale',
    'spring',
  ],
  defaultInputParams: {
    leftWord: 'Welcome',
    middleWord: 'to',
    rightWord: 'MediaMake',
    fontFamily: 'Inter',
    fontSize: 48,
    textColor: '#FFFFFF',
    fontWeight: '700',
    transitionDuration: 0.8,
    slideDistance: 150,
    scaleOvershoot: 1.1,
    scaleDuration: 0.8,
    overlapDelay: 0.2,
    blurStart: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const centerSplitTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
