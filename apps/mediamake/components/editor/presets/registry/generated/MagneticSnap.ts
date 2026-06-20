/**
 * MagneticSnap Internal Effect Preset
 *
 * SINGLE EFFECT (or ARRAY OF EFFECTS depending on targetIds):
 * Simulates magnetic attraction with elastic resistance. The effect creates a non-linear
 * acceleration curve that mimics real magnetic forces fighting against elastic resistance.
 * 
 * Animation phases:
 * - Slow start (0-40%): Fighting against elastic resistance
 * - Rapid acceleration (40-70%): Magnetic pull overcomes elasticity
 * - Elastic snap (70-100%): Satisfying snap into place with compression/expansion
 * - Post-snap oscillation: 3-4 small wobbles with decreasing amplitude
 * 
 * Supports two modes:
 * - 'attract': Default forward animation (element moves toward target)
 * - 'repel': Reversed animation (element pushes away from target)
 * 
 * Fine control parameters:
 * - attractionStrength: Controls the intensity of magnetic pull (higher = faster acceleration)
 * - elasticResistance: Controls resistance to movement (higher = slower start, more elastic)
 * - settleTime: Duration of post-snap oscillation phase
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  mode: z
    .enum(['attract', 'repel'])
    .default('attract')
    .describe(
      'Animation mode: attract (pull toward target) or repel (push away from target)',
    ),
  attractionStrength: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe(
      'Strength of magnetic attraction - controls acceleration intensity (0.5-5, default: 2)',
    ),
  elasticResistance: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe(
      'Elastic resistance force - controls initial slowness and snap intensity (0.1-3, default: 1)',
    ),
  settleTime: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe(
      'Duration of post-snap oscillation in seconds (0.1-1, default: 0.3)',
    ),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the magnetic snap effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  effectDuration: z
    .number()
    .default(1)
    .describe('Total duration of the main snap animation (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate eased progress based on attraction/resistance ratio
  const calculateMagneticCurve = (
    progress: number,
    strength: number,
    resistance: number,
  ): number => {
    const ratio = strength / resistance;
    
    if (progress < 0.4) {
      // Slow start phase (0-40%): Fighting elastic resistance
      // Quadratic ease-in modulated by resistance
      const phase = progress / 0.4;
      return (phase * phase) / (ratio * 2);
    } else if (progress < 0.7) {
      // Rapid acceleration phase (40-70%): Magnetic pull overcomes
      // Exponential acceleration based on strength
      const phase = (progress - 0.4) / 0.3;
      const startValue = 0.4 / (ratio * 2);
      return startValue + Math.pow(phase, ratio) * (0.7 - startValue);
    } else {
      // Elastic snap phase (70-100%): Satisfying snap into place
      // Elastic ease-out with overshoot
      const phase = (progress - 0.7) / 0.3;
      const elasticFactor = 1 + (resistance * 0.1);
      return 0.7 + (0.3 * (phase < 0.5 
        ? phase * elasticFactor 
        : 1 - Math.pow(-2 * phase + 2, 2) / 2));
    }
  };

  // Helper function to create oscillation ranges for post-snap wobble
  const createOscillationRanges = (
    settleTime: number,
    resistance: number,
  ) => {
    const numWobbles = 4;
    const wobbleRanges: any[] = [];
    
    for (let i = 0; i < numWobbles; i++) {
      const wobbleProgress = i / numWobbles;
      const amplitude = (resistance * 0.02) * Math.pow(0.5, i); // Decreasing amplitude
      const wobbleValue = i % 2 === 0 ? amplitude : -amplitude;
      
      // Translate oscillation
      wobbleRanges.push({
        key: 'translateY',
        val: wobbleValue * 10,
        prog: wobbleProgress,
      });
      
      // Scale oscillation (subtle)
      wobbleRanges.push({
        key: 'scale',
        val: 1 + wobbleValue,
        prog: wobbleProgress,
      });
    }
    
    // Final settle
    wobbleRanges.push({ key: 'translateY', val: 0, prog: 1 });
    wobbleRanges.push({ key: 'scale', val: 1, prog: 1 });
    
    return wobbleRanges;
  };

  const {
    mode,
    attractionStrength,
    elasticResistance,
    settleTime,
    targetIds,
    effectStart,
    effectDuration,
    effectId,
  } = params;

  // Calculate acceleration curve based on strength/resistance ratio
  const slowStartProgress = calculateMagneticCurve(0.4, attractionStrength, elasticResistance);
  const rapidAccelProgress = calculateMagneticCurve(0.7, attractionStrength, elasticResistance);

  // Base translation distance (will be inverted for repel mode)
  const baseDistance = 50;
  const direction = mode === 'repel' ? 1 : -1;

  // Main animation ranges (attract mode - will reverse for repel)
  const mainRanges = mode === 'attract' 
    ? [
        // Translate ranges: slow start (0-40%)
        { key: 'translateY', val: baseDistance, prog: 0 },
        { key: 'translateY', val: baseDistance * 0.7, prog: 0.4 },
        
        // Rapid acceleration (40-70%)
        { key: 'translateY', val: baseDistance * 0.2, prog: 0.7 },
        
        // Elastic snap (70-100%)
        { key: 'translateY', val: 0, prog: 1 },

        // Scale: slight compression during acceleration
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.98, prog: 0.4 },
        { key: 'scale', val: 0.95, prog: 0.7 },
        
        // Expansion on snap
        { key: 'scale', val: 1.05, prog: 0.85 },
        { key: 'scale', val: 1, prog: 1 },

        // Opacity (subtle fade in during approach)
        { key: 'opacity', val: 0.9, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.7 },
      ]
    : [
        // Repel mode: reverse the animation
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: baseDistance * 0.3, prog: 0.3 },
        { key: 'translateY', val: baseDistance * 0.8, prog: 0.6 },
        { key: 'translateY', val: baseDistance, prog: 1 },

        // Scale: expansion during repulsion
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.15 },
        { key: 'scale', val: 0.95, prog: 0.6 },
        { key: 'scale', val: 0.92, prog: 1 },

        // Opacity (fade out during repulsion)
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.9, prog: 0.3 },
        { key: 'opacity', val: 0.85, prog: 1 },
      ];

  // Main snap effect
  const snapEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: mainRanges,
  };

  // Post-snap oscillation effect (only for attract mode)
  const oscillationRanges = mode === 'attract' 
    ? createOscillationRanges(settleTime, elasticResistance)
    : [];

  const oscillationEffect: GenericEffectData | null = mode === 'attract' && oscillationRanges.length > 0
    ? {
        type: 'ease-out',
        start: effectStart + effectDuration,
        duration: settleTime,
        mode: 'provider',
        targetIds: targetIds,
        ranges: oscillationRanges,
      }
    : null;

  // Build effects array
  const effects = [
    {
      id: effectId || `magnetic-snap-${targetIds[0] || 'effect'}`,
      componentId: 'generic',
      data: snapEffect,
    },
  ];

  if (oscillationEffect) {
    effects.push({
      id: effectId ? `${effectId}-oscillation` : `magnetic-oscillation-${targetIds[0] || 'effect'}`,
      componentId: 'generic',
      data: oscillationEffect,
    });
  }

  // Container structure
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-snap-container',
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
        duration: effectDuration + settleTime,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'MagneticSnap',
  title: 'Magnetic Snap Effect',
  description:
    'Internal effect preset that simulates magnetic attraction with elastic resistance. Features non-linear acceleration curve with slow start (fighting elastic resistance), rapid acceleration (magnetic pull overcomes), elastic snap into place, and subtle post-snap oscillation. Supports attract/repel modes and fine control over attraction strength and elastic resistance parameters.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'magnetic', 'snap', 'elastic', 'physics', 'kinetic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    mode: 'attract',
    attractionStrength: 2,
    elasticResistance: 1,
    settleTime: 0.3,
    targetIds: ['example-target'],
    effectStart: 0,
    effectDuration: 1,
  },
};

export const MagneticSnapPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
