/**
 * Speed Ramp Text Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates extreme speed ramping for text elements using letter-spacing, scale, and motion blur.
 * Produces a 'whoosh' sensation with rapid acceleration followed by elastic deceleration bounce.
 * Optional chromatic aberration during peak speed for a 'breaking the speed barrier' effect.
 *
 * Features:
 * - Sophisticated easing curves (ease-in acceleration, spring deceleration)
 * - Properties animated: letterSpacing (-10px to 30px), scaleX (0.5 to 1.5), filter (blur + hue-rotate), opacity
 * - Configurable intensity, elastic bounce, and chromatic aberration
 * - Extreme stretching and compression for professional speed ramp feel
 *
 * Use cases:
 * - High-impact text entrances
 * - Dynamic typography effects
 * - Speed-themed transitions
 * - Professional video editing style animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  targetId: z.string().describe('ID of the text component to target'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  duration: z.number().default(1500).optional().describe('Duration of the effect in milliseconds'),
  intensity: z.number().min(0).max(2).default(1).optional().describe('Intensity multiplier for speed ramp effect (0-2, default: 1)'),
  elasticBounce: z.boolean().default(true).optional().describe('Whether to include elastic bounce during deceleration'),
  chromaticAberration: z.boolean().default(true).optional().describe('Whether to include chromatic aberration during peak speed'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationSeconds = (params.duration ?? 1500) / 1000;
  const intensity = params.intensity ?? 1;
  const elasticBounce = params.elasticBounce ?? true;
  const chromaticAberration = params.chromaticAberration ?? true;

  // Calculate keyframe progress points
  // Phase 1: Acceleration (0-40%)
  // Phase 2: Peak speed (40-50%)
  // Phase 3: Deceleration with elastic bounce (50-100%)
  const accelEnd = 0.4;
  const peakEnd = 0.5;
  
  // Scale intensity for extreme effects
  const maxStretch = 1 + (0.5 * intensity); // 1.5 at intensity=1, up to 2.0
  const minCompress = 1 - (0.5 * intensity); // 0.5 at intensity=1, down to 0
  const maxLetterSpacing = 30 * intensity; // Up to 60px at intensity=2
  const minLetterSpacing = -10 * intensity; // Down to -20px at intensity=2
  const maxBlur = 8 * intensity; // Up to 16px at intensity=2

  // Build animation ranges
  const ranges: any[] = [
    // Letter spacing: compress → extreme stretch → normal
    { key: 'letterSpacing', val: `${minLetterSpacing}px`, prog: 0 },
    { key: 'letterSpacing', val: `${maxLetterSpacing}px`, prog: peakEnd },
    { key: 'letterSpacing', val: elasticBounce ? '2px' : '0px', prog: 0.8 },
    { key: 'letterSpacing', val: '0px', prog: 1 },

    // ScaleX: compress → extreme stretch → bounce back → normal
    { key: 'scaleX', val: minCompress, prog: 0 },
    { key: 'scaleX', val: maxStretch, prog: peakEnd },
    { key: 'scaleX', val: elasticBounce ? 0.95 : 1, prog: 0.75 },
    { key: 'scaleX', val: elasticBounce ? 1.02 : 1, prog: 0.9 },
    { key: 'scaleX', val: 1, prog: 1 },

    // Opacity: maintain visibility throughout
    { key: 'opacity', val: 0.8, prog: 0 },
    { key: 'opacity', val: 0.9, prog: accelEnd },
    { key: 'opacity', val: 1, prog: peakEnd },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Motion blur during acceleration and peak
  if (chromaticAberration) {
    // Chromatic aberration effect: blur + hue rotation during peak speed
    ranges.push(
      { key: 'filter', val: `blur(0px) hue-rotate(0deg)`, prog: 0 },
      { key: 'filter', val: `blur(${maxBlur / 2}px) hue-rotate(5deg)`, prog: accelEnd },
      { key: 'filter', val: `blur(${maxBlur}px) hue-rotate(10deg)`, prog: peakEnd },
      { key: 'filter', val: `blur(${maxBlur / 4}px) hue-rotate(5deg)`, prog: 0.7 },
      { key: 'filter', val: `blur(0px) hue-rotate(0deg)`, prog: 0.9 }
    );
  } else {
    // Just motion blur without chromatic
    ranges.push(
      { key: 'filter', val: `blur(0px)`, prog: 0 },
      { key: 'filter', val: `blur(${maxBlur / 2}px)`, prog: accelEnd },
      { key: 'filter', val: `blur(${maxBlur}px)`, prog: peakEnd },
      { key: 'filter', val: `blur(${maxBlur / 4}px)`, prog: 0.7 },
      { key: 'filter', val: `blur(0px)`, prog: 0.9 }
    );
  }

  // Construct effect data with sophisticated easing
  // Use 'ease-in' for acceleration phase, 'spring' for deceleration phase
  // Note: The universal effect will handle the easing type, but since we need different
  // easing for different phases, we'll use 'ease-in-out' as a compromise that provides
  // smooth transitions. For true spring physics, the effect system would need to support
  // per-keyframe easing, which isn't available in the current AnimationRange structure.
  const effectData: GenericEffectData = {
    type: elasticBounce ? 'spring' : 'ease-in-out',
    start: params.effectStart,
    duration: durationSeconds,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id: params.effectId || `speed-ramp-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'speed-ramp-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none' as const,
              },
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Default container duration
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
  id: 'speedRampText',
  title: 'Speed Ramp Text Effect',
  description: 'Internal effect preset that creates extreme speed ramping for text elements using letter-spacing, scale, and motion blur. Creates a "whoosh" sensation with rapid acceleration followed by elastic deceleration bounce. Includes optional chromatic aberration during peak speed for breaking the speed barrier effect with extreme stretching and compression.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'text', 'speed', 'ramp', 'motion-blur', 'chromatic', 'kinetic', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetId: 'text-1',
    effectStart: 0,
    duration: 1500,
    intensity: 1,
    elasticBounce: true,
    chromaticAberration: true,
  },
};

export const speedRampTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
