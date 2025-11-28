/**
 * Cutout Glitch Stack Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset creates RGB channel separation (chromatic aberration)
 * with offset color channels simulating misaligned paper cutouts or printing registration errors.
 * Returns 3 separate effects (red, green, blue channels) that can be applied to target components.
 *
 * Features:
 * - RGB split effect with independent channel offsets
 * - Configurable glitch intensity and separation distance
 * - Optional rotation variance per channel
 * - Supports continuous, beat-triggered, or manual trigger modes
 * - Optional digital noise overlay (future extension)
 * - Clean paper aesthetic or digital glitch aesthetic
 *
 * Use cases:
 * - Creating retro printing misalignment effects
 * - Adding chromatic aberration to text or images
 * - Simulating VHS or analog media glitches
 * - Creating dynamic RGB split animations
 * - Building custom glitch effect compositions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the glitch effect to'),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .min(0.1)
    .default(2)
    .describe('Duration of the effect in seconds'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Glitch intensity (0 = no glitch, 1 = maximum glitch)'),
  separationDistance: z
    .number()
    .min(0)
    .max(100)
    .default(10)
    .describe('Color channel separation distance in pixels'),
  rotationVariance: z
    .number()
    .min(0)
    .max(45)
    .default(2)
    .describe('Maximum rotation variance per channel in degrees'),
  triggerMode: z
    .enum(['continuous', 'beat', 'manual'])
    .default('continuous')
    .describe('Trigger mode: continuous (always on), beat (audio-reactive), manual (custom timing)'),
  addNoise: z
    .boolean()
    .default(false)
    .describe('Add digital noise overlay (currently not implemented)'),
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .optional()
    .describe('Easing function for the glitch animation'),
  effectIdPrefix: z
    .string()
    .default('cutout-glitch-stack')
    .optional()
    .describe('Prefix for effect IDs'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate channel offsets based on intensity
  const calculateChannelOffset = (
    baseOffset: number,
    intensity: number,
    multiplier: number,
  ): number => {
    return baseOffset * intensity * multiplier;
  };

  // Helper function to calculate rotation variance
  const calculateRotation = (
    maxRotation: number,
    intensity: number,
    channelMultiplier: number,
  ): number => {
    return maxRotation * intensity * channelMultiplier;
  };

  const {
    targetIds,
    effectStart,
    effectDuration,
    glitchIntensity,
    separationDistance,
    rotationVariance,
    triggerMode,
    easingType,
    effectIdPrefix,
  } = params;

  // Calculate channel-specific offsets and rotations
  const redOffsetX = calculateChannelOffset(separationDistance, glitchIntensity, -1);
  const redOffsetY = calculateChannelOffset(separationDistance * 0.3, glitchIntensity, -0.5);
  const redRotation = calculateRotation(rotationVariance, glitchIntensity, -1);

  const greenOffsetX = calculateChannelOffset(separationDistance * 0.2, glitchIntensity, 0.5);
  const greenOffsetY = calculateChannelOffset(separationDistance * 0.5, glitchIntensity, 1);
  const greenRotation = calculateRotation(rotationVariance, glitchIntensity, 0.5);

  const blueOffsetX = calculateChannelOffset(separationDistance, glitchIntensity, 1);
  const blueOffsetY = calculateChannelOffset(separationDistance * 0.2, glitchIntensity, 0.5);
  const blueRotation = calculateRotation(rotationVariance, glitchIntensity, 1);

  // Define animation progression based on trigger mode
  let animationRanges: Array<{ prog: number; offsetX: number; offsetY: number; rotation: number }>;
  
  if (triggerMode === 'continuous') {
    // Continuous glitch with oscillation
    animationRanges = [
      { prog: 0, offsetX: 0, offsetY: 0, rotation: 0 },
      { prog: 0.15, offsetX: 1, offsetY: 1, rotation: 1 },
      { prog: 0.3, offsetX: 0.7, offsetY: 0.8, rotation: 0.7 },
      { prog: 0.5, offsetX: 1, offsetY: 1, rotation: 1 },
      { prog: 0.7, offsetX: 0.5, offsetY: 0.6, rotation: 0.5 },
      { prog: 0.85, offsetX: 0.8, offsetY: 0.9, rotation: 0.8 },
      { prog: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    ];
  } else if (triggerMode === 'beat') {
    // Beat-triggered glitch (sharp spike)
    animationRanges = [
      { prog: 0, offsetX: 0, offsetY: 0, rotation: 0 },
      { prog: 0.1, offsetX: 1, offsetY: 1, rotation: 1 },
      { prog: 0.3, offsetX: 0.3, offsetY: 0.3, rotation: 0.3 },
      { prog: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    ];
  } else {
    // Manual trigger (simple in-out)
    animationRanges = [
      { prog: 0, offsetX: 0, offsetY: 0, rotation: 0 },
      { prog: 0.5, offsetX: 1, offsetY: 1, rotation: 1 },
      { prog: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    ];
  }

  // Create red channel effect
  const redChannelEffect: GenericEffectData = {
    type: easingType || 'ease-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      ...animationRanges.map(range => ({
        key: 'translateX',
        val: redOffsetX * range.offsetX,
        prog: range.prog,
      })),
      ...animationRanges.map(range => ({
        key: 'translateY',
        val: redOffsetY * range.offsetY,
        prog: range.prog,
      })),
      ...animationRanges.map(range => ({
        key: 'rotate',
        val: redRotation * range.rotation,
        prog: range.prog,
      })),
      { key: 'mixBlendMode', val: 'screen', prog: 0 },
      { key: 'filter', val: 'sepia(0.8) hue-rotate(-30deg)', prog: 0 },
    ],
  };

  // Create green channel effect
  const greenChannelEffect: GenericEffectData = {
    type: easingType || 'ease-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      ...animationRanges.map(range => ({
        key: 'translateX',
        val: greenOffsetX * range.offsetX,
        prog: range.prog,
      })),
      ...animationRanges.map(range => ({
        key: 'translateY',
        val: greenOffsetY * range.offsetY,
        prog: range.prog,
      })),
      ...animationRanges.map(range => ({
        key: 'rotate',
        val: greenRotation * range.rotation,
        prog: range.prog,
      })),
      { key: 'mixBlendMode', val: 'screen', prog: 0 },
      { key: 'filter', val: 'sepia(0.8) hue-rotate(60deg)', prog: 0 },
    ],
  };

  // Create blue channel effect
  const blueChannelEffect: GenericEffectData = {
    type: easingType || 'ease-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      ...animationRanges.map(range => ({
        key: 'translateX',
        val: blueOffsetX * range.offsetX,
        prog: range.prog,
      })),
      ...animationRanges.map(range => ({
        key: 'translateY',
        val: blueOffsetY * range.offsetY,
        prog: range.prog,
      })),
      ...animationRanges.map(range => ({
        key: 'rotate',
        val: blueRotation * range.rotation,
        prog: range.prog,
      })),
      { key: 'mixBlendMode', val: 'screen', prog: 0 },
      { key: 'filter', val: 'sepia(0.8) hue-rotate(180deg)', prog: 0 },
    ],
  };

  // Create effect nodes
  const effects = [
    {
      id: `${effectIdPrefix}-red-channel`,
      componentId: 'generic',
      data: redChannelEffect,
    },
    {
      id: `${effectIdPrefix}-green-channel`,
      componentId: 'generic',
      data: greenChannelEffect,
    },
    {
      id: `${effectIdPrefix}-blue-channel`,
      componentId: 'generic',
      data: blueChannelEffect,
    },
  ];

  // Return effects in container structure
  const rootContainer: RenderableComponentData = {
    id: 'cutout-glitch-stack-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: effects,
    childrenData: [],
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
  id: 'cutout-glitch-stack',
  title: 'Cutout Glitch Stack Effect',
  description:
    'An internal effect preset that creates RGB channel separation and glitch effects simulating misaligned paper cutouts or printing registration errors. Outputs 3 effect definitions (R, G, B channels) with transform offsets, rotation variance, and mix-blend-mode for chromatic aberration. Supports continuous animation, beat-triggered, or manual trigger modes. Parameters control glitch intensity, separation distance, rotation variance, and optional digital noise overlay.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'rgb-split', 'chromatic-aberration', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 2,
    glitchIntensity: 0.5,
    separationDistance: 10,
    rotationVariance: 2,
    triggerMode: 'continuous',
    addNoise: false,
    easingType: 'ease-out',
    effectIdPrefix: 'cutout-glitch-stack',
  },
};

// Export preset
export const cutoutGlitchStackPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
