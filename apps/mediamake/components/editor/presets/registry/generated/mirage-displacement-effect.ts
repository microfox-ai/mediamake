/**
 * Mirage Displacement Internal Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset creates a dynamic 3D heat distortion effect using CSS custom properties
 * and calc() functions. It animates custom CSS variables that control transform-origin, perspective,
 * and rotateX/rotateY to create a 3D heat distortion effect that makes elements appear to bend and
 * warp as if viewed through heated glass.
 *
 * Features:
 * - Dynamic CSS custom property animations (--perspective, --tilt-x, --tilt-y)
 * - Transform-origin shifting for rolling distortion waves
 * - 3D perspective and rotation effects
 * - Subtle opacity variations to enhance the heat shimmer
 * - Configurable intensity multiplier for overall effect strength
 * - Smooth ease-in-out transitions
 *
 * Use cases:
 * - Heat distortion effects for desert/summer scenes
 * - Surreal warping effects for creative transitions
 * - Dynamic 3D perspective shifts
 * - Glass/liquid refraction simulations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('IDs of components to apply the displacement effect to'),
  perspectiveDistance: z.number().default(1000).describe('3D perspective depth in pixels (lower = more extreme perspective)'),
  tiltAngle: z.number().default(5).describe('Maximum rotation angle in degrees for X/Y axis tilt'),
  originShift: z.number().default(50).describe('Transform-origin movement range in percentage (0-100)'),
  duration: z.number().default(3000).describe('Effect animation duration in milliseconds'),
  intensity: z.number().default(1).describe('Overall effect strength multiplier (0-2, 1 = normal)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationInSeconds = params.duration / 1000;

  // Calculate effect values with intensity multiplier
  const perspectiveValue = params.perspectiveDistance / params.intensity;
  const tiltAngleValue = params.tiltAngle * params.intensity;
  const originShiftValue = params.originShift * params.intensity;

  // Create transform-origin animation keyframes
  // Shifts from left (0% 50%) to right (100% 50%) and back to center (50% 50%)
  const transformOriginRanges = [
    { key: 'transformOrigin', val: '0% 50%', prog: 0 },
    { key: 'transformOrigin', val: '100% 50%', prog: 0.5 },
    { key: 'transformOrigin', val: '50% 50%', prog: 1 },
  ];

  // Create 3D rotation animation keyframes
  // Animates rotateX and rotateY to create rolling distortion
  const rotationRanges = [
    // Start with slight tilt
    { key: 'rotateX', val: tiltAngleValue, prog: 0 },
    { key: 'rotateY', val: -tiltAngleValue, prog: 0 },
    // Peak distortion at midpoint
    { key: 'rotateX', val: -tiltAngleValue, prog: 0.25 },
    { key: 'rotateY', val: tiltAngleValue, prog: 0.25 },
    // Reverse direction
    { key: 'rotateX', val: tiltAngleValue, prog: 0.5 },
    { key: 'rotateY', val: -tiltAngleValue, prog: 0.5 },
    // Return to neutral with slight overshoot
    { key: 'rotateX', val: -tiltAngleValue * 0.5, prog: 0.75 },
    { key: 'rotateY', val: tiltAngleValue * 0.5, prog: 0.75 },
    // Final settle
    { key: 'rotateX', val: 0, prog: 1 },
    { key: 'rotateY', val: 0, prog: 1 },
  ];

  // Create subtle opacity shimmer (0.9 to 1.0)
  const opacityRanges = [
    { key: 'opacity', val: 0.9, prog: 0 },
    { key: 'opacity', val: 1.0, prog: 0.25 },
    { key: 'opacity', val: 0.95, prog: 0.5 },
    { key: 'opacity', val: 1.0, prog: 0.75 },
    { key: 'opacity', val: 0.9, prog: 1 },
  ];

  // Combine all animation ranges
  const combinedRanges = [
    ...transformOriginRanges,
    ...rotationRanges,
    ...opacityRanges,
  ];

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: combinedRanges,
    // Apply perspective as inline style
    style: {
      perspective: `${perspectiveValue}px`,
      perspectiveOrigin: '50% 50%',
    },
  };

  // Create the effect object
  const effect = {
    id: `mirage-displacement-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in a layout container for extraction
  const rootContainer: RenderableComponentData = {
    id: 'mirage-displacement-effect-container',
    type: 'layout',
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

const presetMetadata: PresetMetadata = {
  id: 'mirage-displacement-effect',
  title: 'Mirage Displacement Effect',
  description: 'Internal effect preset that creates dynamic 3D heat distortion using CSS transforms. Animates perspective, rotateX/Y, and transform-origin to simulate elements bending and warping as if viewed through heated glass with rolling distortion waves.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', '3d', 'displacement', 'heat', 'distortion', 'mirage', 'transform'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    perspectiveDistance: 1000,
    tiltAngle: 5,
    originShift: 50,
    duration: 3000,
    intensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const mirageDisplacementEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
