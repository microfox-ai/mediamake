/**
 * Cinematic Text Reveal Preset
 *
 * This preset creates a documentary-style cinematic text reveal where lines fade in
 * from complete transparency while simultaneously sliding up from below their final position.
 * Each line starts 20px below with 0% opacity and animates to its resting position
 * with 100% opacity, creating a sophisticated 'floating up' effect.
 *
 * Features:
 * - **Fade-in from transparency**: Lines animate from 0% to 100% opacity
 * - **Slide-up motion**: Lines start 20px below and move to final position
 * - **Staggered reveal**: Each line starts 0.4s after the previous one
 * - **Smooth overlapping**: 0.6s animation with 0.4s stagger creates 0.2s overlap
 * - **Professional easing**: Uses cubic-bezier(0.4, 0, 0.2, 1) for polished feel
 * - **Responsive typography**: Text scales from 3xl to 5xl on larger screens
 * - **Subtle depth**: Text shadow adds dimension
 *
 * Use cases:
 * - Documentary-style title cards
 * - Professional video introductions
 * - High-end promotional content
 * - Cinematic text overlays
 * - Premium video production titles
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
} from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(5)
    .default(['First Line', 'Second Line', 'Third Line'])
    .describe(
      'Array of text lines to display (minimum 1, maximum 5 lines for optimal visual impact)',
    ),
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  startDelay: z
    .number()
    .min(0)
    .max(5)
    .default(0)
    .describe('Delay before the first line starts animating (seconds)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (CSS color value)'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Base font size in pixels (responsive scaling applied)'),
  gap: z
    .number()
    .min(8)
    .max(64)
    .default(16)
    .describe('Vertical gap between lines in pixels'),
  animationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of each line animation in seconds'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Delay between each line animation start in seconds'),
  slideDistance: z
    .number()
    .min(10)
    .max(100)
    .default(20)
    .describe('Distance in pixels that lines slide up from'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    duration,
    startDelay,
    textColor,
    fontSize,
    gap,
    animationDuration,
    staggerDelay,
    slideDistance,
  } = params;

  // Create line components with effects
  const lineComponents: RenderableComponentData[] = lines.map((lineText, index) => {
    const lineWrapperId = `line-${index}-wrapper`;
    const lineTextId = `line-${index}-text`;
    const lineStartTime = startDelay + index * staggerDelay;

    // Create opacity effect
    const opacityEffect = {
      id: `opacity-effect-${lineWrapperId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier',
        easingCurve: [0.4, 0, 0.2, 1],
        start: lineStartTime,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [lineWrapperId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Create translateY effect
    const translateYEffect = {
      id: `translateY-effect-${lineWrapperId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier',
        easingCurve: [0.4, 0, 0.2, 1],
        start: lineStartTime,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [lineWrapperId],
        ranges: [
          { key: 'translateY', val: slideDistance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Line wrapper (BaseLayout for applying effects)
    const lineWrapper: RenderableComponentData = {
      id: lineWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'transform translate-y-5 opacity-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [opacityEffect, translateYEffect],
      childrenData: [
        {
          id: lineTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: lineText,
            className: 'text-3xl md:text-5xl font-medium text-white',
            style: {
              color: textColor,
              fontSize: `${fontSize}px`,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    return lineWrapper;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-text-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex flex-col items-center justify-center',
        style: {
          gap: `${gap}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: lineComponents,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'cinematic-text-reveal',
  title: 'Cinematic Text Reveal',
  description:
    'Documentary-style text reveal where lines fade in from complete transparency while sliding up from 20px below their final position. Features cubic-bezier(0.4, 0, 0.2, 1) easing with 0.4s stagger for professional, overlapping animations. Includes subtle text-shadow for depth and responsive typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'cinematic',
    'documentary',
    'fade',
    'slide',
    'professional',
    'title-card',
    'overlay',
    'typography',
  ],
  defaultInputParams: {
    lines: ['First Line', 'Second Line', 'Third Line'],
    duration: 10,
    startDelay: 0,
    textColor: '#FFFFFF',
    fontSize: 48,
    gap: 16,
    animationDuration: 0.6,
    staggerDelay: 0.4,
    slideDistance: 20,
  },
  dependencies: {},
};

// --- Export ---
export const cinematicTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
