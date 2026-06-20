/**
 * ProximityFocus Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset generates distance-based focus effects for multiple target elements based on their
 * spatial relationship to one or more focus points. Elements closer to focus points render sharply
 * (no blur, full opacity) while distant elements progressively lose focus with increased blur
 * (0-20px) and reduced opacity (0.3-1.0).
 *
 * Features:
 * - **Distance-Based Calculations**: Uses Euclidean distance formula: Math.sqrt((x2-x1)² + (y2-y1)²)
 * - **Dynamic Blur Mapping**: blur = Math.min(maxBlur, distance * falloffRate)
 * - **Dynamic Opacity Mapping**: opacity = Math.max(0.3, 1 - (distance * opacityFalloff))
 * - **Depth Curve Modes**: Linear, exponential, and gaussian falloff curves
 * - **Focus Tracking**: Animate focus point along a path over time for dynamic focus pulls
 * - **Multi-Focus Support**: Multiple focus points with weighted influence blending
 * - **Bokeh Mode**: Approximated via standard CSS blur (hexagonal shapes not supported in CSS)
 *
 * Technical Implementation:
 * - Effect type: generic with computed blur/opacity values per target
 * - Returns array of effects (one per targetId)
 * - Supports time-based focus point interpolation
 * - Applies depth curve transformations to distance calculations
 *
 * Use Cases:
 * - Creating depth-of-field effects in flat 2D compositions
 * - Guiding viewer attention through spatial focus
 * - Dynamic focus pulls that follow action or narration
 * - Simulating camera focus in motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Params schema with detailed descriptions
const presetParams = z.object({
  targets: z
    .array(
      z.object({
        targetId: z.string().describe('ID of the component to apply focus effect to'),
        position: z.object({
          x: z.number().describe('X coordinate of target element center (pixels)'),
          y: z.number().describe('Y coordinate of target element center (pixels)'),
        }),
      }),
    )
    .describe('Array of target elements with their spatial positions'),

  focusPoints: z
    .array(
      z.object({
        x: z.number().describe('X coordinate of focus point (pixels)'),
        y: z.number().describe('Y coordinate of focus point (pixels)'),
        weight: z
          .number()
          .min(0)
          .max(1)
          .default(1)
          .optional()
          .describe('Influence weight of this focus point (0-1, default: 1)'),
      }),
    )
    .min(1)
    .describe('Array of focus points (minimum 1 required)'),

  falloffRate: z
    .number()
    .min(0)
    .default(0.05)
    .describe('Rate at which blur increases with distance (default: 0.05)'),

  opacityFalloff: z
    .number()
    .min(0)
    .default(0.002)
    .describe('Rate at which opacity decreases with distance (default: 0.002)'),

  maxBlur: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Maximum blur amount in pixels (0-50, default: 20)'),

  depthCurve: z
    .enum(['linear', 'exponential', 'gaussian'])
    .default('exponential')
    .describe('Falloff curve type for focus depth (default: exponential)'),

  focusTracking: z
    .object({
      enabled: z.boolean().describe('Enable animated focus tracking'),
      path: z
        .array(
          z.object({
            x: z.number().describe('X coordinate of path keyframe'),
            y: z.number().describe('Y coordinate of path keyframe'),
            duration: z.number().min(0).describe('Duration to reach this point (seconds)'),
          }),
        )
        .min(2)
        .describe('Array of path keyframes for focus point animation'),
    })
    .optional()
    .describe('Configuration for animated focus tracking along a path'),

  bokehMode: z
    .boolean()
    .default(false)
    .describe('Enable bokeh-style blur (approximated with standard CSS blur)'),

  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),

  effectDuration: z
    .number()
    .min(0.1)
    .default(10)
    .describe('Duration of the effect (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate Euclidean distance
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Helper function: Apply depth curve transformation
  const applyDepthCurve = (distance: number, curveType: string): number => {
    switch (curveType) {
      case 'linear':
        return distance;
      case 'exponential':
        return Math.pow(distance, 1.5);
      case 'gaussian':
        const variance = 10000; // Variance for gaussian curve
        return distance * Math.exp(-(distance * distance) / variance);
      default:
        return distance;
    }
  };

  // Helper function: Calculate blur value from distance
  const calculateBlur = (distance: number, falloffRate: number, maxBlur: number): number => {
    const blur = distance * falloffRate;
    return Math.min(maxBlur, Math.max(0, blur));
  };

  // Helper function: Calculate opacity value from distance
  const calculateOpacity = (distance: number, opacityFalloff: number): number => {
    const opacity = 1 - distance * opacityFalloff;
    return Math.max(0.3, Math.min(1, opacity));
  };

  // Helper function: Blend multiple focus points (weighted average)
  const blendFocusPoints = (
    targetX: number,
    targetY: number,
    focusPoints: Array<{ x: number; y: number; weight?: number }>,
  ): { distance: number } => {
    let totalWeight = 0;
    let weightedDistanceSum = 0;

    focusPoints.forEach((fp) => {
      const weight = fp.weight ?? 1;
      const dist = calculateDistance(targetX, targetY, fp.x, fp.y);
      weightedDistanceSum += dist * weight;
      totalWeight += weight;
    });

    return { distance: totalWeight > 0 ? weightedDistanceSum / totalWeight : 0 };
  };

  // Helper function: Interpolate focus point along path
  const interpolateFocusPath = (
    path: Array<{ x: number; y: number; duration: number }>,
    totalDuration: number,
  ): Array<{ x: number; y: number; prog: number }> => {
    const keyframes: Array<{ x: number; y: number; prog: number }> = [];
    let cumulativeTime = 0;

    path.forEach((point, index) => {
      const prog = Math.min(1, cumulativeTime / totalDuration);
      keyframes.push({ x: point.x, y: point.y, prog });
      cumulativeTime += point.duration;
    });

    return keyframes;
  };

  // Extract parameters
  const {
    targets,
    focusPoints,
    falloffRate,
    opacityFalloff,
    maxBlur,
    depthCurve,
    focusTracking,
    bokehMode,
    effectStart,
    effectDuration,
  } = params;

  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  // Determine if we need to handle focus tracking animation
  const useFocusTracking = focusTracking?.enabled && focusTracking.path.length >= 2;

  if (useFocusTracking && focusTracking) {
    // Focus tracking mode: Create time-based effects with interpolated focus points
    const pathKeyframes = interpolateFocusPath(focusTracking.path, effectDuration);

    targets.forEach((target) => {
      const ranges: Array<{ key: string; val: any; prog: number }> = [];

      // Generate keyframes for each path point
      pathKeyframes.forEach((keyframe) => {
        // Calculate distance from target to this focus point keyframe
        const distance = calculateDistance(
          target.position.x,
          target.position.y,
          keyframe.x,
          keyframe.y,
        );

        const transformedDistance = applyDepthCurve(distance, depthCurve);
        const blur = calculateBlur(transformedDistance, falloffRate, maxBlur);
        const opacity = calculateOpacity(transformedDistance, opacityFalloff);

        // Add blur keyframe
        if (bokehMode) {
          // Bokeh mode: Use larger blur with drop-shadow to simulate bokeh (approximation)
          ranges.push({
            key: 'filter',
            val: `blur(${blur.toFixed(2)}px) drop-shadow(0 0 ${(blur * 0.5).toFixed(2)}px rgba(255,255,255,0.3))`,
            prog: keyframe.prog,
          });
        } else {
          ranges.push({
            key: 'filter',
            val: `blur(${blur.toFixed(2)}px)`,
            prog: keyframe.prog,
          });
        }

        // Add opacity keyframe
        ranges.push({
          key: 'opacity',
          val: opacity,
          prog: keyframe.prog,
        });
      });

      // Create effect for this target
      const effectData: GenericEffectData = {
        type: 'linear', // Linear interpolation between keyframes
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [target.targetId],
        ranges: ranges,
      };

      effects.push({
        id: `proximity-focus-${target.targetId}`,
        componentId: 'generic',
        data: effectData,
      });
    });
  } else {
    // Static focus mode: Calculate focus effects based on static focus points
    targets.forEach((target) => {
      // Blend all focus points to get effective distance
      const { distance } = blendFocusPoints(target.position.x, target.position.y, focusPoints);

      const transformedDistance = applyDepthCurve(distance, depthCurve);
      const blurStart = calculateBlur(transformedDistance, falloffRate, maxBlur);
      const opacityStart = calculateOpacity(transformedDistance, opacityFalloff);

      // Create static effect (same blur/opacity throughout duration)
      const ranges: Array<{ key: string; val: any; prog: number }> = [];

      if (bokehMode) {
        ranges.push(
          {
            key: 'filter',
            val: `blur(${blurStart.toFixed(2)}px) drop-shadow(0 0 ${(blurStart * 0.5).toFixed(2)}px rgba(255,255,255,0.3))`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `blur(${blurStart.toFixed(2)}px) drop-shadow(0 0 ${(blurStart * 0.5).toFixed(2)}px rgba(255,255,255,0.3))`,
            prog: 1,
          },
        );
      } else {
        ranges.push(
          { key: 'filter', val: `blur(${blurStart.toFixed(2)}px)`, prog: 0 },
          { key: 'filter', val: `blur(${blurStart.toFixed(2)}px)`, prog: 1 },
        );
      }

      ranges.push(
        { key: 'opacity', val: opacityStart, prog: 0 },
        { key: 'opacity', val: opacityStart, prog: 1 },
      );

      const effectData: GenericEffectData = {
        type: 'linear',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [target.targetId],
        ranges: ranges,
      };

      effects.push({
        id: `proximity-focus-${target.targetId}`,
        componentId: 'generic',
        data: effectData,
      });
    });
  }

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'proximity-focus-effects-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'proximityFocusEffect',
  title: 'ProximityFocus Effect',
  description:
    'Distance-based focus effect that adjusts blur and opacity based on spatial relationships between elements and focus points. Supports dynamic focus tracking, multiple focus points, depth-of-field curves, and bokeh-style blur.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'focus', 'blur', 'depth', 'spatial', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targets: [
      { targetId: 'element-1', position: { x: 200, y: 200 } },
      { targetId: 'element-2', position: { x: 600, y: 400 } },
    ],
    focusPoints: [{ x: 400, y: 300, weight: 1 }],
    falloffRate: 0.05,
    opacityFalloff: 0.002,
    maxBlur: 20,
    depthCurve: 'exponential',
    bokehMode: false,
    effectStart: 0,
    effectDuration: 10,
  },
};

export const proximityFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
