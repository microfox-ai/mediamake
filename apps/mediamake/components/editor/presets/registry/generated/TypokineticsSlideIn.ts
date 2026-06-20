/**
 * Typokinetics Slide-In Preset
 *
 * This preset creates a professional kinetic typography effect where words slide in sequentially
 * from the right edge of the screen, decelerating smoothly into their final positions like a
 * video editor pulling clips into a timeline. Each word arrives with a subtle bounce-ease that
 * mimics professional motion graphics.
 *
 * Features:
 * - Sequential slide-in animation from right edge
 * - Smooth deceleration with bounce-ease timing
 * - Motion blur effect during slide motion (clears as words settle)
 * - Precise editorial spacing in horizontal layout
 * - GPU-accelerated transforms with will-change optimization
 * - Staggered timing (0.15s delay per word)
 *
 * Use cases:
 * - Title sequences with cinematic text reveal
 * - Professional motion graphics for video intros
 * - After Effects-style keyframed text animations
 * - Editorial-style text compositions with precise timing
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text to display (words will be split and animated individually)'),
  fontSize: z.number().default(48).describe('Font size in pixels'),
  fontWeight: z.union([z.string(), z.number()]).default('600').describe('Font weight'),
  color: z.string().default('#ffffff').describe('Text color'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  fontWeights: z.array(z.string()).default(['600']).describe('Font weights to load'),
  gap: z.number().default(0.5).describe('Gap between words in rem units'),
  slideDuration: z.number().default(0.4).describe('Duration of slide animation per word in seconds'),
  staggerDelay: z.number().default(0.15).describe('Delay between each word animation in seconds'),
  blurAmount: z.number().default(2).describe('Motion blur amount in pixels during slide'),
  totalDuration: z.number().optional().describe('Total duration of the animation (auto-calculated if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words
  const words = params.text.trim().split(/\s+/);
  
  // Calculate total duration if not provided
  const calculatedDuration = params.totalDuration ?? 
    (words.length * params.staggerDelay + params.slideDuration);

  // Create word components with slide-in effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `typokinetics-word-${index}`;
    const wordStartDelay = index * params.staggerDelay;

    return {
      id: wordId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            willChange: 'transform, filter',
          },
        },
      },
      context: {
        timing: {
          start: wordStartDelay,
          duration: calculatedDuration - wordStartDelay,
        },
      },
      childrenData: [
        {
          id: `${wordId}-text`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: params.fontWeight,
              color: params.color,
            },
            font: {
              family: params.fontFamily,
              weights: params.fontWeights,
              display: 'swap' as const,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: calculatedDuration - wordStartDelay,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `${wordId}-slide-blur-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: params.slideDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // Slide from right (100%) to position (0%)
              { key: 'translateX', val: '100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              // Motion blur during slide, clears as word settles
              { key: 'filter', val: `blur(${params.blurAmount}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container with horizontal flex layout
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-slide-in-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-row items-center justify-center gap-${Math.floor(params.gap * 4)}`,
        style: {
          width: '100%',
          height: '100%',
          gap: `${params.gap}rem`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedDuration,
      },
    },
    childrenData: wordComponents,
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

const presetMetadata: PresetMetadata = {
  id: 'TypokineticsSlideIn',
  title: 'Typokinetics Slide-In',
  description: 'Professional typokinetics preset featuring words sliding in sequentially from the right edge with smooth deceleration, bounce-ease animation, and synchronized motion blur effect. Each word arrives with precise editorial spacing, creating a clean horizontal timeline-like composition reminiscent of After Effects keyframed text layers.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'slide', 'motion-graphics', 'timeline', 'editorial', 'motion-blur', 'after-effects', 'keyframe'],
  defaultInputParams: {
    text: 'Typokinetics Slide In',
    fontSize: 48,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter',
    fontWeights: ['600'],
    gap: 0.5,
    slideDuration: 0.4,
    staggerDelay: 0.15,
    blurAmount: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const TypokineticsSlideInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
