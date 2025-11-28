/**
 * VHS Color Bleed Internal Effect Preset
 * 
 * SINGLE EFFECT: Generates a generic effect that simulates VHS tape color bleeding and saturation issues.
 * 
 * This internal effect preset creates unstable color reproduction typical of degraded VHS tapes.
 * It animates CSS filters including saturate, contrast, blur, and hue-rotate to create:
 * - Areas of oversaturation that "bleed" into neighboring areas
 * - Subtle color channel shifts that vary over time
 * - Unstable color reproduction with varying saturation levels
 * 
 * Features:
 * - Controllable bleed intensity (affects blur amount)
 * - Color shift range (hue rotation in degrees)
 * - Min/max saturation levels for unstable color cycling
 * - Contrast variations to enhance the degraded tape effect
 * - Keyframe animation at 5 points (0, 0.25, 0.5, 0.75, 1) for continuous instability
 * 
 * Technical Implementation:
 * - Uses GenericEffectData with AnimationRange[] for filter animations
 * - Combines saturate, contrast, blur, and hue-rotate filters
 * - Provider mode with targetIds for direct component targeting
 * - Relative timing (start/duration relative to parent component)
 * 
 * Use cases:
 * - VHS tape simulation effects
 * - Retro video aesthetics
 * - Degraded media reproduction effects
 * - Nostalgic visual treatments
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the color bleed effect to'),
  duration: z
    .number()
    .default(4000)
    .describe('Duration of the effect in milliseconds (default: 4000ms = 4 seconds)'),
  bleedIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Intensity of color bleeding effect, controls blur amount (0-5, default: 1)'),
  colorShiftRange: z
    .number()
    .min(0)
    .max(360)
    .default(10)
    .describe('Range of color channel shifts in degrees for hue rotation (0-360, default: 10)'),
  saturationLevels: z
    .object({
      min: z
        .number()
        .min(50)
        .max(200)
        .default(80)
        .describe('Minimum saturation percentage (50-200, default: 80)'),
      max: z
        .number()
        .min(50)
        .max(200)
        .default(150)
        .describe('Maximum saturation percentage (50-200, default: 150)'),
    })
    .describe('Min and max saturation levels for unstable color reproduction'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = params.duration || 4000;
  const durationSeconds = duration / 1000;
  const bleedIntensity = params.bleedIntensity ?? 1;
  const colorShiftRange = params.colorShiftRange ?? 10;
  const minSat = params.saturationLevels?.min ?? 80;
  const maxSat = params.saturationLevels?.max ?? 150;

  // Helper function to create filter strings combining multiple CSS filters
  const createFilterString = (
    saturate: number,
    contrast: number,
    blur: number,
    hueRotate: number,
  ): string => {
    const filters: string[] = [];
    
    // Add saturate filter
    filters.push(`saturate(${saturate}%)`);
    
    // Add contrast filter
    filters.push(`contrast(${contrast}%)`);
    
    // Add blur filter (only if blur > 0)
    if (blur > 0) {
      filters.push(`blur(${blur}px)`);
    }
    
    // Add hue-rotate filter (only if hueRotate !== 0)
    if (hueRotate !== 0) {
      filters.push(`hue-rotate(${hueRotate}deg)`);
    }
    
    return filters.join(' ');
  };

  // Create 5 keyframe filter values simulating VHS color instability
  // Keyframe 0 (prog: 0) - Normal state
  const filter0 = createFilterString(100, 100, 0, 0);
  
  // Keyframe 1 (prog: 0.25) - Oversaturation with slight bleed and color shift
  const filter1 = createFilterString(
    minSat + (maxSat - minSat) * 0.75, // High saturation
    110, // Slightly increased contrast
    bleedIntensity * 1, // Medium blur for bleeding
    colorShiftRange * 0.5, // Partial hue shift
  );
  
  // Keyframe 2 (prog: 0.5) - Desaturation with heavy bleed and different color shift
  const filter2 = createFilterString(
    minSat, // Low saturation
    120, // High contrast
    bleedIntensity * 2, // Heavy blur for maximum bleeding
    -colorShiftRange * 0.3, // Negative hue shift
  );
  
  // Keyframe 3 (prog: 0.75) - Return to oversaturation with reduced bleed
  const filter3 = createFilterString(
    maxSat, // Maximum saturation
    90, // Reduced contrast
    bleedIntensity * 0.5, // Light blur
    colorShiftRange * 0.7, // Different hue shift
  );
  
  // Keyframe 4 (prog: 1) - Back to normal state (creates loop)
  const filter4 = createFilterString(100, 100, 0, 0);

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'filter', val: filter0, prog: 0 },
      { key: 'filter', val: filter1, prog: 0.25 },
      { key: 'filter', val: filter2, prog: 0.5 },
      { key: 'filter', val: filter3, prog: 0.75 },
      { key: 'filter', val: filter4, prog: 1 },
    ],
  };

  // Create the effect object
  const effect = {
    id: params.effectId || `vhs-color-bleed-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure
  // (Will be auto-extracted via _internalPresetOutput: 'effects')
  return {
    output: {
      childrenData: [
        {
          id: 'color-bleed-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: { display: 'none' },
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationSeconds,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vhs-color-bleed-effect',
  title: 'VHS Color Bleed Internal Effect',
  description:
    'Internal effect preset that simulates VHS tape color bleeding and saturation issues. Generates generic effects with CSS filter animations (saturate, contrast, hue-rotate, blur) to create unstable color reproduction and oversaturation that varies over time.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'vhs', 'color-bleed', 'retro', 'degraded', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 4000,
    bleedIntensity: 1,
    colorShiftRange: 10,
    saturationLevels: {
      min: 80,
      max: 150,
    },
  },
};

// Export preset
export const vhsColorBleedEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
