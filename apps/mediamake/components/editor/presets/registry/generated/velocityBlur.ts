/**
 * Velocity Blur Effect Preset
 *
 * INTERNAL EFFECT PRESET - Returns effect data to be applied to target components.
 *
 * Creates extreme motion blur simulation through progressive blur and opacity ramping.
 * Simulates rapid movement by combining blur increase with subtle opacity reduction during
 * peak velocity moments. Supports directional motion blur (horizontal, vertical, radial)
 * and configurable speed ramp curves.
 *
 * Features:
 * - **Progressive Blur**: Animates blur from 0 to specified intensity (0-20px)
 * - **Opacity Ramping**: Subtle opacity dips to 0.7 at peak blur moments
 * - **Speed Curves**: Accelerate, decelerate, or whiplash velocity curves
 * - **Directional Blur**: Horizontal, vertical, or radial motion simulation
 * - **Subtle Scale**: Optional scale transforms for enhanced motion illusion
 * - **Configurable Duration**: Adjustable effect duration
 *
 * Use cases:
 * - Creating speed/impact effects for dynamic content
 * - Simulating fast camera movements or action sequences
 * - Adding emphasis to high-energy moments
 * - Creating transition effects with motion blur
 *
 * Technical details:
 * - Returns generic AnimationRange[] effects
 * - Keyframes distributed based on curve type
 * - Combines filter (blur), opacity, and transform properties
 * - Can be extracted and applied to any component
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameters Schema ---
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply velocity blur effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  duration: z
    .number()
    .default(1)
    .min(0.1)
    .describe('Duration of the velocity blur effect in seconds'),
  intensity: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Maximum blur intensity in pixels (0-20)'),
  curve: z
    .enum(['accelerate', 'decelerate', 'whiplash'])
    .default('accelerate')
    .describe(
      'Speed ramp curve type: accelerate (slow to fast), decelerate (fast to slow), whiplash (fast-slow-fast)',
    ),
  direction: z
    .enum(['horizontal', 'vertical', 'radial'])
    .default('horizontal')
    .describe(
      'Direction of motion blur simulation: horizontal, vertical, or radial',
    ),
  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Minimum opacity at peak velocity (default: 0.7)'),
  scaleIntensity: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe('Subtle scale intensity for motion enhancement (0-0.2, default: 0.05)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (generated if not provided)'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate keyframes based on curve type
  const generateKeyframes = (curveType: 'accelerate' | 'decelerate' | 'whiplash') => {
    const intensity = params.intensity || 10;
    const minOpacity = params.minOpacity ?? 0.7;
    const scaleIntensity = params.scaleIntensity ?? 0.05;

    // Base keyframes structure
    const keyframes = {
      blur: [] as Array<{ key: string; val: string; prog: number }>,
      opacity: [] as Array<{ key: string; val: number; prog: number }>,
      scale: [] as Array<{ key: string; val: number; prog: number }>,
      translate: [] as Array<{ key: string; val: number; prog: number }>,
    };

    if (curveType === 'accelerate') {
      // Slow to fast: blur increases, opacity dips at end
      keyframes.blur = [
        { key: 'blur', val: '0px', prog: 0 },
        { key: 'blur', val: `${intensity * 0.3}px`, prog: 0.3 },
        { key: 'blur', val: `${intensity * 0.7}px`, prog: 0.7 },
        { key: 'blur', val: `${intensity}px`, prog: 1 },
      ];

      keyframes.opacity = [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.95, prog: 0.5 },
        { key: 'opacity', val: minOpacity, prog: 1 },
      ];

      keyframes.scale = [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1 + scaleIntensity * 0.5, prog: 0.7 },
        { key: 'scale', val: 1 + scaleIntensity, prog: 1 },
      ];
    } else if (curveType === 'decelerate') {
      // Fast to slow: blur peaks early, then reduces
      keyframes.blur = [
        { key: 'blur', val: `${intensity}px`, prog: 0 },
        { key: 'blur', val: `${intensity * 0.7}px`, prog: 0.3 },
        { key: 'blur', val: `${intensity * 0.3}px`, prog: 0.7 },
        { key: 'blur', val: '0px', prog: 1 },
      ];

      keyframes.opacity = [
        { key: 'opacity', val: minOpacity, prog: 0 },
        { key: 'opacity', val: 0.95, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ];

      keyframes.scale = [
        { key: 'scale', val: 1 + scaleIntensity, prog: 0 },
        { key: 'scale', val: 1 + scaleIntensity * 0.5, prog: 0.3 },
        { key: 'scale', val: 1, prog: 1 },
      ];
    } else {
      // whiplash: fast-slow-fast with blur peaks at start and end
      keyframes.blur = [
        { key: 'blur', val: `${intensity * 0.8}px`, prog: 0 },
        { key: 'blur', val: `${intensity * 0.3}px`, prog: 0.25 },
        { key: 'blur', val: '0px', prog: 0.5 },
        { key: 'blur', val: `${intensity * 0.3}px`, prog: 0.75 },
        { key: 'blur', val: `${intensity * 0.8}px`, prog: 1 },
      ];

      keyframes.opacity = [
        { key: 'opacity', val: minOpacity + 0.1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: minOpacity + 0.1, prog: 1 },
      ];

      keyframes.scale = [
        { key: 'scale', val: 1 + scaleIntensity * 0.7, prog: 0 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: 1 + scaleIntensity * 0.7, prog: 1 },
      ];
    }

    // Add directional translation based on direction parameter
    const direction = params.direction || 'horizontal';
    const translateIntensity = intensity * 2; // Translate moves more than blur

    if (direction === 'horizontal') {
      if (curveType === 'accelerate') {
        keyframes.translate = [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateIntensity * 0.3, prog: 0.5 },
          { key: 'translateX', val: translateIntensity, prog: 1 },
        ];
      } else if (curveType === 'decelerate') {
        keyframes.translate = [
          { key: 'translateX', val: translateIntensity, prog: 0 },
          { key: 'translateX', val: translateIntensity * 0.3, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
        ];
      } else {
        keyframes.translate = [
          { key: 'translateX', val: -translateIntensity * 0.5, prog: 0 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: translateIntensity * 0.5, prog: 1 },
        ];
      }
    } else if (direction === 'vertical') {
      if (curveType === 'accelerate') {
        keyframes.translate = [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: translateIntensity * 0.3, prog: 0.5 },
          { key: 'translateY', val: translateIntensity, prog: 1 },
        ];
      } else if (curveType === 'decelerate') {
        keyframes.translate = [
          { key: 'translateY', val: translateIntensity, prog: 0 },
          { key: 'translateY', val: translateIntensity * 0.3, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ];
      } else {
        keyframes.translate = [
          { key: 'translateY', val: -translateIntensity * 0.5, prog: 0 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: translateIntensity * 0.5, prog: 1 },
        ];
      }
    } else {
      // radial: scale only (no translation)
      keyframes.translate = [];
    }

    return keyframes;
  };

  // Generate keyframes based on curve parameter
  const keyframes = generateKeyframes(params.curve || 'accelerate');

  // Combine all ranges into a single AnimationRange array
  const allRanges = [
    ...keyframes.blur,
    ...keyframes.opacity,
    ...keyframes.scale,
    ...keyframes.translate,
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart || 0,
    duration: params.duration || 1,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: allRanges,
  };

  // Create effect node
  const effect = {
    id: params.effectId || `velocity-blur-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure (will be extracted by _internalPresetOutput)
  return {
    output: {
      childrenData: [
        {
          id: 'velocity-blur-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.duration || 1,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'velocityBlur',
  title: 'Velocity Blur Effect',
  description:
    'Internal effect preset that simulates extreme motion blur through progressive blur and opacity ramping. Creates illusion of rapid movement by combining blur increase with subtle opacity reduction during peak velocity moments. Supports directional motion blur (horizontal, vertical, radial) and configurable speed ramp curves (accelerate, decelerate, whiplash).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'blur', 'motion', 'velocity', 'speed', 'internal', 'generic'],
  dependencies: {},
  // Mark as internal preset - only used by other presets
  _internalPreset: true,
  _internalPresetOutput: 'effects', // Extract effects from output
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    duration: 1,
    intensity: 10,
    curve: 'accelerate',
    direction: 'horizontal',
    minOpacity: 0.7,
    scaleIntensity: 0.05,
  },
};

// --- Export Preset ---
export const velocityBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
