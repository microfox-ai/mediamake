/**
 * Magnifying Glass Hover Effect (Internal Effect Preset)
 *
 * SINGLE EFFECT:
 * Applies a circular magnification/fisheye-like distortion to targeted elements (text, image, or video).
 * Uses CSS transforms (scale, translateZ) combined with clip-path for a lens-like bulge effect.
 *
 * Features:
 * - Circular magnification area with configurable radius
 * - Smooth animation curve with keyframes at 0%, 20%, 80%, and 100%
 * - Configurable magnification intensity (1.2x to 2x)
 * - Adjustable animation duration and easing curve
 * - Supports 3D depth via translateZ for enhanced perspective
 * - Natural lens movement with ease-in and ease-out phases
 *
 * Use cases:
 * - Creating focus/emphasis effects on text or media
 * - Simulating magnifying glass hover interactions
 * - Drawing attention to specific elements in a composition
 * - Creating dynamic reveal effects with lens-like distortion
 *
 * Technical Details:
 * - Effect type: Generic (AnimationRange[])
 * - Properties animated: scale, translateZ, clipPath (circular mask)
 * - Animation structure: 4 keyframes (0%, 20%, 80%, 100%) for natural lens movement
 * - Mode: provider (targets specific component IDs)
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the magnification effect to'),
  magnifyIntensity: z
    .number()
    .min(1.2)
    .max(2)
    .default(1.5)
    .describe('Magnification intensity multiplier (1.2x to 2x scale)'),
  radius: z
    .number()
    .default(150)
    .describe('Radius of the circular magnification area in pixels'),
  duration: z
    .number()
    .default(1)
    .describe('Duration of the magnification animation in seconds'),
  easing: z
    .enum(['ease-in-out', 'spring'])
    .default('ease-in-out')
    .describe('Easing curve for the animation'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent component'),
  depthIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('3D depth intensity via translateZ in pixels'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for identification'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetIds,
    magnifyIntensity = 1.5,
    radius = 150,
    duration = 1,
    easing = 'ease-in-out',
    effectStart = 0,
    depthIntensity = 20,
    effectId,
  } = params;

  // Calculate intermediate scale values for smooth lens movement
  // Phase 1 (0% → 20%): Ease in from 1 to slight magnification
  const scaleEaseIn = 1 + (magnifyIntensity - 1) * 0.3; // 30% of full magnification

  // Phase 2 (20% → 80%): Hold at peak magnification
  const scalePeak = magnifyIntensity;

  // Phase 3 (80% → 100%): Ease out back to normal
  const scaleEaseOut = 1;

  // Calculate translateZ values for 3D depth effect
  const depthEaseIn = depthIntensity * 0.3; // 30% of full depth
  const depthPeak = depthIntensity;
  const depthEaseOut = 0;

  // Create circular clip-path values
  // Using circle() function with radius at center
  const clipPathNormal = `circle(${radius * 2}px at center)`;
  const clipPathMagnified = `circle(${radius * magnifyIntensity}px at center)`;

  // Construct the generic effect data with AnimationRange[]
  const effectData: GenericEffectData = {
    type: easing === 'spring' ? 'spring' : 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Scale animation - 4 keyframes for natural lens movement
      { key: 'scale', val: 1, prog: 0 }, // Start: normal size
      { key: 'scale', val: scaleEaseIn, prog: 0.2 }, // Ease in: 20% progress
      { key: 'scale', val: scalePeak, prog: 0.8 }, // Peak: 80% progress (hold)
      { key: 'scale', val: scaleEaseOut, prog: 1 }, // Ease out: 100% progress

      // TranslateZ animation for 3D depth perspective
      { key: 'translateZ', val: 0, prog: 0 }, // Start: no depth
      { key: 'translateZ', val: depthEaseIn, prog: 0.2 }, // Ease in
      { key: 'translateZ', val: depthPeak, prog: 0.8 }, // Peak depth
      { key: 'translateZ', val: depthEaseOut, prog: 1 }, // Ease out

      // ClipPath animation for circular mask effect
      { key: 'clipPath', val: clipPathNormal, prog: 0 }, // Start: normal clip
      { key: 'clipPath', val: clipPathMagnified, prog: 0.2 }, // Magnified clip
      { key: 'clipPath', val: clipPathMagnified, prog: 0.8 }, // Hold magnified
      { key: 'clipPath', val: clipPathNormal, prog: 1 }, // Back to normal
    ],
  };

  // Create the effect object
  const magnifyEffect = {
    id: effectId || `magnify-glass-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in a container structure for extraction
  const effectContainer: RenderableComponentData = {
    id: 'magnify-effect-root',
    type: 'layout' as const,
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
        duration: duration,
      },
    },
    effects: [magnifyEffect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata with internal preset configuration
const presetMetadata: PresetMetadata = {
  id: 'magnify-glass-effect',
  title: 'Magnifying Glass Hover Effect',
  description:
    'An internal effect preset that applies a circular magnification/fisheye-like distortion to targeted elements (text, image, or video). Uses CSS transforms (scale, translateZ) combined with clip-path for a lens-like bulge effect. Accepts parameters for magnification intensity (1.2x-2x), effect radius, animation duration, and easing curve. The effect smoothly transitions with keyframes at 0%, 20%, 80%, and 100% for natural lens movement. Returns effect data via _internalPresetOutput: effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'magnify',
    'fisheye',
    'lens',
    'distortion',
    'zoom',
    'scale',
    'generic',
    'internal',
  ],
  // REQUIRED: Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    targetIds: ['component-1'],
    magnifyIntensity: 1.5,
    radius: 150,
    duration: 1,
    easing: 'ease-in-out',
    effectStart: 0,
    depthIntensity: 20,
  },
};

// Export preset with standard naming convention
export const magnifyGlassEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
