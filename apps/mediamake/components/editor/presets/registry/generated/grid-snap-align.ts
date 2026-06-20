/**
 * Grid Snap Align Effect Preset
 *
 * INTERNAL EFFECT PRESET
 * 
 * This internal effect preset provides smooth snapping animations for elements moving into grid positions.
 * It animates translateX, translateY, and scale properties with spring easing to create a magnetic snap
 * effect when elements align to grid points.
 *
 * Features:
 * - Calculates nearest grid point based on current element position
 * - Smooth spring-based animations for natural movement
 * - Configurable grid size (pixel spacing)
 * - Adjustable snap duration (milliseconds)
 * - Spring intensity control (0-1 for tension)
 * - Optional spring overshoot effect
 * - Subtle scale effect (0.95 to 1.0) during snap to emphasize alignment
 *
 * SINGLE EFFECT:
 * Returns a single generic effect that animates translateX, translateY, and scale simultaneously.
 *
 * Use cases:
 * - Grid-based layout animations
 * - Magnetic snap effects for draggable elements
 * - Alignment animations for text, images, or videos
 * - Grid organization transitions
 *
 * @example
 * // Call from main preset
 * const snapEffect = await presets.gridSnapAlign({
 *   targetIds: ['text-1', 'image-2'],
 *   gridSize: 32,
 *   snapDuration: 400,
 *   snapIntensity: 0.7,
 *   overshoot: true,
 *   currentX: 145,
 *   currentY: 267,
 * }, props);
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the snap effect to'),
  gridSize: z
    .number()
    .min(1)
    .default(32)
    .describe('Grid spacing in pixels (e.g., 32 means elements snap to multiples of 32px)'),
  snapDuration: z
    .number()
    .min(100)
    .default(400)
    .describe('Duration of the snap animation in milliseconds'),
  snapIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Spring tension intensity (0 = loose spring, 1 = tight spring)'),
  overshoot: z
    .boolean()
    .default(true)
    .describe('Whether the spring animation should overshoot the target position'),
  currentX: z
    .number()
    .default(0)
    .describe('Current X position of the element in pixels (before snap)'),
  currentY: z
    .number()
    .default(0)
    .describe('Current Y position of the element in pixels (before snap)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (defaults to auto-generated)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate nearest grid point
  const calculateNearestGridPoint = (
    current: number,
    gridSize: number,
  ): number => {
    return Math.round(current / gridSize) * gridSize;
  };

  // Calculate nearest grid positions
  const nearestGridX = calculateNearestGridPoint(params.currentX, params.gridSize);
  const nearestGridY = calculateNearestGridPoint(params.currentY, params.gridSize);

  // Convert duration from milliseconds to seconds
  const durationInSeconds = params.snapDuration / 1000;

  // Calculate spring tension based on intensity
  // Higher intensity = tighter spring = faster snap
  const springTension = 50 + params.snapIntensity * 150; // Range: 50-200

  // Determine easing type based on overshoot setting
  const easingType = params.overshoot ? 'spring' : 'ease-out';

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: easingType,
    start: params.effectStart,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // TranslateX animation: from current position to nearest grid X
      { key: 'translateX', val: params.currentX, prog: 0 },
      { key: 'translateX', val: nearestGridX, prog: 1 },

      // TranslateY animation: from current position to nearest grid Y
      { key: 'translateY', val: params.currentY, prog: 0 },
      { key: 'translateY', val: nearestGridY, prog: 1 },

      // Scale animation: subtle scale down then back to 1.0 for emphasis
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.95, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
    // Spring-specific props (only used when type is 'spring')
    props: params.overshoot
      ? {
          tension: springTension,
          friction: 20,
          mass: 1,
        }
      : undefined,
  };

  // Generate effect ID
  const effectId =
    params.effectId ||
    `grid-snap-${params.targetIds.join('-')}-${Date.now()}`;

  // Create the effect object
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect wrapped in a container structure
  return {
    output: {
      childrenData: [
        {
          id: 'grid-snap-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
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
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'gridSnapAlign',
  title: 'Grid Snap Align Effect',
  description:
    'Provides smooth snapping animations for elements moving into grid positions with spring easing, magnetic snap effect, and subtle scale emphasis during alignment',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'grid',
    'snap',
    'align',
    'spring',
    'animation',
    'magnetic',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    gridSize: 32,
    snapDuration: 400,
    snapIntensity: 0.7,
    overshoot: true,
    currentX: 0,
    currentY: 0,
    effectStart: 0,
  },
};

// Export preset
export const gridSnapAlignPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
