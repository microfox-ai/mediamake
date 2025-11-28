/**
 * Circular Reveal Text Animation Preset
 *
 * This preset creates a circular reveal animation where words rotate apart around an invisible
 * circle's circumference (like a radial wipe in video editing) to reveal central text.
 * Each word starts at the center and spirals outward to its final position on the circle's edge.
 *
 * Features:
 * - **Circular Path Animation**: Words rotate and translate along circular paths from center to edge
 * - **Radial Wipe Effect**: Sequential staggered timing creates a radial wipe transition
 * - **Center Word Reveal**: Central text emerges with zoom-and-spin effect (360° rotation + scale)
 * - **Lens Distortion Effect**: Subtle contrast/brightness filter effects that normalize on completion
 * - **Configurable Radius**: Adjustable circle size for different compositions
 * - **Staggered Timing**: Cascading reveal with configurable delays between words
 * - **Transform-Origin Control**: Words rotate from their centers for smooth motion
 *
 * Technical Implementation:
 * - Uses BaseLayout with relative positioning and flexbox centering
 * - Orbiting words use absolute positioning with calculated circular coordinates
 * - CSS custom properties (--radius, --angle) for dynamic positioning
 * - Generic effects combine rotate + translateX/translateY for circular motion
 * - Center word uses multi-keyframe scale animation with rotation and filter effects
 *
 * Use cases:
 * - Creating dramatic title sequences inspired by classic TV shows
 * - Building radial wipe transitions for segment introductions
 * - Adding cinematic text reveals with motion path animations
 * - Creating attention-grabbing social media content openings
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters ---
const presetParams = z.object({
  // Words configuration
  orbitingWords: z
    .array(z.string())
    .describe('Array of words to rotate outward around the circle'),

  centerText: z
    .string()
    .describe('Central text that emerges after orbiting words reveal'),

  // Timing configuration
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the preset animation in seconds'),

  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay in seconds between each orbiting word animation start'),

  orbitDuration: z
    .number()
    .default(1)
    .describe('Duration for each orbiting word to complete its path'),

  centerWordDelay: z
    .number()
    .default(1.2)
    .describe('Delay before center word starts its reveal animation'),

  centerWordDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the center word zoom-and-spin effect'),

  // Circular path configuration
  radius: z
    .number()
    .default(200)
    .describe('Radius of the invisible circle in pixels'),

  // Styling configuration
  orbitingWordsFontSize: z
    .number()
    .default(32)
    .describe('Font size for orbiting words in pixels'),

  centerFontSize: z
    .number()
    .default(64)
    .describe('Font size for center text in pixels'),

  orbitingWordsColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for orbiting words'),

  centerTextColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for center text'),

  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for all text (e.g., "Inter", "Roboto")'),

  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight for all text (e.g., "400", "700")'),

  // Effect configuration
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-in-out')
    .describe('Easing function for all animations'),

  trackId: z
    .string()
    .default('circular-reveal')
    .describe('Unique ID for this preset instance'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    orbitingWords,
    centerText,
    duration,
    staggerDelay,
    orbitDuration,
    centerWordDelay,
    centerWordDuration,
    radius,
    orbitingWordsFontSize,
    centerFontSize,
    orbitingWordsColor,
    centerTextColor,
    fontFamily,
    fontWeight,
    easing,
    trackId,
  } = params;

  // Calculate angle increment for evenly distributed words
  const angleIncrement = (2 * Math.PI) / orbitingWords.length;

  // Create orbiting word components
  const orbitingWordComponents: RenderableComponentData[] =
    orbitingWords.map((word, index) => {
      const angle = index * angleIncrement;
      const wordId = `${trackId}-orbiting-word-${index}`;

      // Calculate final position on circle using trigonometry
      const finalX = Math.cos(angle) * radius;
      const finalY = Math.sin(angle) * radius;

      // Convert angle to degrees for rotation
      const angleDegrees = (angle * 180) / Math.PI;

      // Create animation effect for circular motion
      const orbitEffect = {
        id: `${wordId}-orbit-effect`,
        componentId: 'generic',
        data: {
          type: easing,
          start: index * staggerDelay, // Staggered start time (relative to parent)
          duration: orbitDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Translate from center (0,0) to final position
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: finalX, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: finalY, prog: 1 },
            // Rotate from 0 to final angle
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: angleDegrees, prog: 1 },
            // Fade in during motion
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      };

      // Create word component
      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: orbitingWordsFontSize,
            fontWeight: fontWeight,
            color: orbitingWordsColor,
            transformOrigin: 'center',
            position: 'absolute',
            whiteSpace: 'nowrap',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [orbitEffect],
      } as RenderableComponentData;
    });

  // Create center word component with zoom-and-spin effect
  const centerWordId = `${trackId}-center-word`;
  const centerWordEffect = {
    id: `${centerWordId}-reveal-effect`,
    componentId: 'generic',
    data: {
      type: easing,
      start: centerWordDelay, // Relative to parent start
      duration: centerWordDuration,
      mode: 'provider' as const,
      targetIds: [centerWordId],
      ranges: [
        // Multi-keyframe scale: 0.5 → 1.2 → 1.0 (bounce effect)
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1.2, prog: 0.7 },
        { key: 'scale', val: 1.0, prog: 1 },
        // 360 degree rotation
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360, prog: 1 },
        // Lens distortion filter effect (contrast + brightness)
        {
          key: 'filter',
          val: 'contrast(1.2) brightness(1.1)',
          prog: 0,
        },
        {
          key: 'filter',
          val: 'contrast(1.1) brightness(1.05)',
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'contrast(1) brightness(1)',
          prog: 1,
        },
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.4 },
      ],
    },
  };

  const centerWordComponent: RenderableComponentData = {
    id: centerWordId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: centerText,
      style: {
        fontSize: centerFontSize,
        fontWeight: 'bold',
        color: centerTextColor,
        transformOrigin: 'center',
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [centerWordEffect],
  };

  // Root container (relative positioning with flexbox centering)
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          // CSS custom properties (for reference, not used in this implementation)
          ['--radius' as any]: `${radius}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Orbiting words container
      {
        id: `${trackId}-orbiting-words-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: orbitingWordComponents,
      } as RenderableComponentData,
      // Center word container
      {
        id: `${trackId}-center-word-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [centerWordComponent],
      } as RenderableComponentData,
    ],
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
  id: 'circular-reveal-text',
  title: 'Circular Reveal Text Animation',
  description:
    'A circular reveal preset where words rotate apart around an invisible circle\'s circumference to reveal central text. Orbiting words start at the center and spiral outward to their final positions on the circle\'s edge with staggered timing. The revealed center word emerges with a dramatic zoom-and-spin effect (360 degree rotation while scaling up) with a subtle lens distortion filter effect that normalizes as the animation completes. Inspired by classic TV show title sequences and radial wipe video editing transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'circular',
    'reveal',
    'radial',
    'wipe',
    'rotation',
    'spiral',
    'title-sequence',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    orbitingWords: ['WELCOME', 'TO', 'THE', 'SHOW'],
    centerText: 'PREMIERE',
    duration: 3,
    staggerDelay: 0.1,
    orbitDuration: 1,
    centerWordDelay: 1.2,
    centerWordDuration: 0.8,
    radius: 200,
    orbitingWordsFontSize: 32,
    centerFontSize: 64,
    orbitingWordsColor: '#FFFFFF',
    centerTextColor: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '700',
    easing: 'ease-in-out',
    trackId: 'circular-reveal',
  },
};

// --- Export Preset ---
export const circularRevealTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
