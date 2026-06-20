/**
 * DepthPulse Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a sense of z-axis movement for flat elements using coordinated scale and blur effects.
 * Simulates elements moving toward and away from the viewer in 3D space through inverse scale-blur
 * animation, creating a depth-of-field illusion without actual 3D transforms.
 *
 * Features:
 * - **Coordinated Animations**: Scale, blur, and opacity animate in sync to create depth perception
 * - **Inverse Correlation**: When scaled smaller = more blur, when larger = sharp focus
 * - **Depth-of-Field Illusion**: Mimics camera focus effects for a sophisticated depth effect
 * - **Breathing Modes**: Smooth ease-in-out or stepped linear animation options
 * - **Configurable Parameters**: Control pulse depth, focus point, duration, and animation mode
 *
 * Use cases:
 * - Creating subtle depth animations for hero sections
 * - Adding visual interest to static elements
 * - Building breathing/pulsing UI effects
 * - Enhancing flat designs with perceived 3D depth
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the depth pulse effect to'),
  pulseDepth: z
    .number()
    .min(0)
    .max(0.5)
    .describe(
      'How far elements appear to move in depth (0 = no movement, 0.5 = maximum depth range)',
    ),
  focusPoint: z
    .number()
    .optional()
    .describe(
      'Scale value where blur is 0 (sharp focus point, default: 1.0 for normal size)',
    ),
  pulseDuration: z
    .number()
    .optional()
    .describe('Duration of one complete pulse cycle in milliseconds (default: 1200ms)'),
  breathingMode: z
    .enum(['smooth', 'stepped'])
    .optional()
    .describe(
      'Animation style: smooth for ease-in-out breathing effect, stepped for linear mechanical pulses',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const pulseDepth = params.pulseDepth;
  const focusPoint = params.focusPoint ?? 1;
  const pulseDuration = params.pulseDuration ?? 1200;
  const breathingMode = params.breathingMode ?? 'smooth';
  const targetIds = params.targetIds;

  // Calculate scale ranges based on pulseDepth and focusPoint
  const minScale = focusPoint - pulseDepth;
  const maxScale = focusPoint + pulseDepth;

  // Calculate blur values inversely correlated with scale
  // When at minScale (smallest), blur is highest
  // When at focusPoint (middle), blur is 0 (sharp focus)
  // When at maxScale (largest), blur is moderate
  const maxBlur = 10;
  const midBlur = 5;

  // Opacity changes at extremes to enhance depth perception
  const minOpacity = 0.8;
  const midOpacity = 1;
  const maxOpacity = 0.9;

  // Choose easing based on breathing mode
  const easingType = breathingMode === 'smooth' ? 'ease-in-out' : 'linear';

  // Convert duration from milliseconds to seconds
  const durationInSeconds = pulseDuration / 1000;

  // Construct the generic effect data with coordinated ranges
  const effectData: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Scale animation: small → focus → large
      { key: 'scale', val: minScale, prog: 0 },
      { key: 'scale', val: focusPoint, prog: 0.5 },
      { key: 'scale', val: maxScale, prog: 1 },

      // Blur animation: high → none → moderate (inverse of scale)
      { key: 'blur', val: maxBlur, prog: 0 },
      { key: 'blur', val: 0, prog: 0.5 },
      { key: 'blur', val: midBlur, prog: 1 },

      // Opacity animation: dim → full → slightly dim
      { key: 'opacity', val: minOpacity, prog: 0 },
      { key: 'opacity', val: midOpacity, prog: 0.5 },
      { key: 'opacity', val: maxOpacity, prog: 1 },
    ],
  };

  // Create the effect node
  const effect = {
    id: `depth-pulse-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return output structure with effect container
  const rootContainer = {
    id: 'depth-pulse-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    effects: [effect],
    childrenData: [] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'depth-pulse-effect',
  title: 'DepthPulse Effect',
  description:
    'Internal effect preset that creates a sense of z-axis movement for flat elements using coordinated scale and blur effects. Simulates elements moving toward and away from the viewer in 3D space through inverse scale-blur animation, creating a depth-of-field illusion without actual 3D transforms. Includes parameters for pulseDepth, focusPoint, pulseDuration, and breathingMode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'depth', 'pulse', 'scale', 'blur', '3d-illusion'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    pulseDepth: 0.1,
    focusPoint: 1,
    pulseDuration: 1200,
    breathingMode: 'smooth',
  },
};

export const depthPulseEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
