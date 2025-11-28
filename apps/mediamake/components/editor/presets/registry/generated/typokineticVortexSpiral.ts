/**
 * Typokinetic Vortex Spiral Preset
 * 
 * Creates a dramatic vortex/whirlpool effect where words spiral inward from the screen edges
 * toward a central vanishing point, mimicking the visual of looking down into a typographic tornado.
 * 
 * Features:
 * - Logarithmic spiral paths with polar-to-Cartesian coordinate conversion
 * - Accelerating angular velocity (slow rotation at edges, dramatic spin near center)
 * - Scale reduction for depth illusion (words shrink as they approach the vortex core)
 * - Brightness dimming to simulate deepening into the vortex
 * - Multiple spiral arms for complex, layered motion
 * - Optional "resistance" effect for high-impact words (brief pause mid-animation)
 * - Staggered entry timing for cascading spiral effect
 * 
 * Use Cases:
 * - Dynamic title sequences with intense motion
 * - Music video typography with rhythmic pull
 * - Social media hooks with eye-catching vortex animation
 * - Transition effects between scenes
 * - Abstract typographic art pieces
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  words: z
    .array(z.string())
    .describe('Array of words to spiral into the vortex'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Duration for each word to complete spiral (seconds)'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.25)
    .describe('Delay between each word entry (seconds)'),
  rotations: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Number of full rotations during spiral (higher = more spinning)'),
  spiralArms: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(4)
    .describe('Number of spiral arms (distributes words around circle)'),
  startRadius: z
    .number()
    .min(200)
    .max(800)
    .default(500)
    .describe('Starting radius from center in pixels (edge distance)'),
  fontSize: z
    .number()
    .min(24)
    .max(96)
    .default(48)
    .describe('Font size for words in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  impactWords: z
    .array(z.string())
    .optional()
    .describe('Words that should "resist" the vortex pull (brief pause mid-animation)'),
  resistanceDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.5)
    .describe('Duration of resistance pause for impact words (seconds)'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Background color or gradient (CSS value)'),
  easingType: z
    .enum(['ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-in')
    .describe('Easing type for spiral motion'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    duration,
    staggerDelay,
    rotations,
    spiralArms,
    startRadius,
    fontSize,
    textColor,
    fontFamily,
    fontWeight,
    impactWords = [],
    resistanceDuration,
    backgroundColor,
    easingType,
  } = params;

  // Helper function: Calculate logarithmic spiral coordinates
  const calculateSpiralPosition = (
    progress: number,
    armIndex: number,
    totalArms: number,
  ): { x: number; y: number } => {
    // Logarithmic spiral: r(t) = r0 * e^(-k*t)
    // We want r to decrease from startRadius to ~0
    const k = 3; // Decay constant (higher = tighter spiral)
    const r = startRadius * Math.exp(-k * progress);

    // Angle increases with progress and includes arm offset
    const armOffset = (armIndex * 2 * Math.PI) / totalArms;
    const theta = progress * rotations * 2 * Math.PI + armOffset;

    // Polar to Cartesian conversion
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    return { x, y };
  };

  // Generate word containers with staggered timing
  const wordContainers: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `vortex-word-${index}`;
    const armIndex = index % spiralArms;
    const isImpactWord = impactWords.includes(word);

    // Calculate start position (edge of spiral)
    const startPos = calculateSpiralPosition(0, armIndex, spiralArms);

    // Spiral motion effect with translateX and translateY
    const spiralRanges: Array<{ key: string; val: number; prog: number }> = [];

    if (isImpactWord) {
      // Impact word: pause mid-animation (resistance effect)
      const pauseStart = 0.4;
      const pauseEnd = pauseStart + resistanceDuration / duration;

      // Move to pause point
      const pausePos = calculateSpiralPosition(pauseStart, armIndex, spiralArms);

      spiralRanges.push(
        { key: 'translateX', val: startPos.x, prog: 0 },
        { key: 'translateX', val: pausePos.x, prog: pauseStart },
        { key: 'translateX', val: pausePos.x, prog: pauseEnd }, // Hold position
        { key: 'translateX', val: 0, prog: 1 },

        { key: 'translateY', val: startPos.y, prog: 0 },
        { key: 'translateY', val: pausePos.y, prog: pauseStart },
        { key: 'translateY', val: pausePos.y, prog: pauseEnd }, // Hold position
        { key: 'translateY', val: 0, prog: 1 },
      );
    } else {
      // Normal word: smooth spiral
      spiralRanges.push(
        { key: 'translateX', val: startPos.x, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },

        { key: 'translateY', val: startPos.y, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      );
    }

    // Spiral motion effect
    const spiralEffect: GenericEffectData = {
      type: easingType,
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: spiralRanges,
    };

    // Rotation effect (accelerating spin)
    const rotationEffect: GenericEffectData = {
      type: easingType,
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: rotations * 360, prog: 1 },
      ],
    };

    // Scale effect (shrink toward center)
    const scaleEffect: GenericEffectData = {
      type: easingType,
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.1, prog: 1 },
      ],
    };

    // Opacity effect (fade out in final second)
    const opacityEffect: GenericEffectData = {
      type: 'linear',
      start: duration - 1,
      duration: 1,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    // Brightness effect (dim toward center)
    const brightnessEffect: GenericEffectData = {
      type: easingType,
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'brightness', val: 1, prog: 0 },
        { key: 'brightness', val: 0.5, prog: 1 },
      ],
    };

    return {
      id: `vortex-word-container-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
        },
      },
      context: {
        timing: {
          start: index * staggerDelay,
          duration: duration,
        },
      },
      effects: [
        {
          id: `spiral-effect-${index}`,
          componentId: 'generic',
          data: spiralEffect,
        },
        {
          id: `rotation-effect-${index}`,
          componentId: 'generic',
          data: rotationEffect,
        },
        {
          id: `scale-effect-${index}`,
          componentId: 'generic',
          data: scaleEffect,
        },
        {
          id: `opacity-effect-${index}`,
          componentId: 'generic',
          data: opacityEffect,
        },
        {
          id: `brightness-effect-${index}`,
          componentId: 'generic',
          data: brightnessEffect,
        },
      ],
      childrenData: [
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              color: textColor,
              textShadow: '0 0 20px rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
              display: 'swap',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Calculate total duration (last word completes its spiral)
  const totalDuration = (words.length - 1) * staggerDelay + duration;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-vortex-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: backgroundColor
          ? { background: backgroundColor }
          : {
              background:
                'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)',
            },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers,
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
  id: 'typokineticVortexSpiral',
  title: 'Typokinetic Vortex Spiral',
  description:
    'Dynamic vortex effect where words spiral in from screen edges toward center following logarithmic spiral paths. Features accelerating rotation, scaling depth illusion, brightness shifts simulating vortex deepening, and optional resistance effect for high-impact words.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'vortex',
    'spiral',
    'motion',
    'dynamic',
    'tornado',
    'whirlpool',
    'text-animation',
    'advanced',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['DIVE', 'INTO', 'THE', 'VORTEX'],
    duration: 5,
    staggerDelay: 0.25,
    rotations: 2,
    spiralArms: 4,
    startRadius: 500,
    fontSize: 48,
    textColor: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '700',
    impactWords: ['VORTEX'],
    resistanceDuration: 0.5,
    easingType: 'ease-in',
  },
};

// Export preset
export const typokineticVortexSpiralPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
