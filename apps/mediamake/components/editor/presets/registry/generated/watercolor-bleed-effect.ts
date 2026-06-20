/**
 * WatercolorBleedEffect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset simulates organic watercolor paint bleeding across components.
 * It returns a single effect that animates blur, scale, and opacity properties to create
 * a fluid, expanding bleed effect with natural, organic movement.
 *
 * Features:
 * - **Organic Watercolor Bleeding**: Simulates paint spreading on paper
 * - **Multi-Property Animation**: Combines blur, scale, and opacity
 * - **Spring Easing**: Natural, organic movement with fast expansion and slow absorption
 * - **Customizable Intensity**: Control max blur amount via bleedIntensity parameter
 * - **Optional Color Overlay**: Add watercolor tint effect
 * - **GPU Accelerated**: Uses transform: scale() for performance
 *
 * Animation Phases:
 * 1. Sharp & Small (prog: 0): blur: 0, scale: 0.8, opacity: 0
 * 2. Expansion (prog: 0.3): blur: 8px (scaled), scale: 1.1, opacity: 0.7
 * 3. Settling (prog: 0.7): blur: 2px (scaled), scale: 1.0, opacity: 0.9
 * 4. Full Clarity (prog: 1): blur: 0, scale: 1, opacity: 1
 *
 * Use cases:
 * - Creating organic reveal animations
 * - Simulating watercolor paint effects
 * - Adding fluid, artistic transitions
 * - Building natural, organic motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the watercolor bleed effect to'),
  bleedIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe(
      'Controls maximum blur amount (0-1, scales the 8px blur at peak expansion)',
    ),
  bleedDuration: z
    .number()
    .min(100)
    .default(2000)
    .describe('Total animation duration in milliseconds'),
  bleedColor: z
    .string()
    .optional()
    .describe(
      'Optional color overlay for watercolor tint effect (CSS color value)',
    ),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent timeline (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (defaults to generated ID)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract and validate parameters
  const {
    targetIds,
    bleedIntensity = 1,
    bleedDuration = 2000,
    bleedColor,
    effectStart = 0,
    effectId,
  } = params;

  // Convert duration from milliseconds to seconds
  const durationInSeconds = bleedDuration / 1000;

  // Calculate scaled blur values based on intensity
  const maxBlur = 8 * bleedIntensity;
  const midBlur = 2 * bleedIntensity;

  // Build animation ranges for blur, scale, and opacity
  const animationRanges: Array<{ key: string; val: any; prog: number }> = [
    // Blur animation: 0 → maxBlur → midBlur → 0
    { key: 'blur', val: `0px`, prog: 0 },
    { key: 'blur', val: `${maxBlur}px`, prog: 0.3 },
    { key: 'blur', val: `${midBlur}px`, prog: 0.7 },
    { key: 'blur', val: `0px`, prog: 1 },

    // Scale animation: 0.8 → 1.1 → 1.0 → 1.0
    { key: 'scale', val: 0.8, prog: 0 },
    { key: 'scale', val: 1.1, prog: 0.3 },
    { key: 'scale', val: 1.0, prog: 0.7 },
    { key: 'scale', val: 1.0, prog: 1 },

    // Opacity animation: 0 → 0.7 → 0.9 → 1
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 0.7, prog: 0.3 },
    { key: 'opacity', val: 0.9, prog: 0.7 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Add optional color overlay animation if bleedColor is provided
  if (bleedColor) {
    // Parse color to extract RGB values for filter application
    const colorOverlayRanges: Array<{
      key: string;
      val: any;
      prog: number;
    }> = [
      // Color overlay fades in during expansion and fades out during settling
      { key: 'backgroundColor', val: 'transparent', prog: 0 },
      { key: 'backgroundColor', val: bleedColor, prog: 0.3 },
      { key: 'backgroundColor', val: 'transparent', prog: 0.7 },
      { key: 'backgroundColor', val: 'transparent', prog: 1 },
    ];

    animationRanges.push(...colorOverlayRanges);
  }

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'spring', // Spring easing for organic, natural movement
    start: effectStart,
    duration: durationInSeconds,
    mode: 'provider', // Always use provider mode
    targetIds: targetIds, // Target the specified components
    ranges: animationRanges,
  };

  // Create the effect object
  const watercolorBleedEffect = {
    id:
      effectId ||
      `watercolor-bleed-${targetIds.join('-')}-${Date.now()}`.substring(0, 50),
    componentId: 'generic', // Use generic UniversalEffect
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'watercolor-bleed-effect-container',
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
          effects: [watercolorBleedEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds,
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
  id: 'watercolor-bleed-effect',
  title: 'WatercolorBleedEffect',
  description:
    'Internal effect preset that simulates organic watercolor paint bleeding across components. Animates blur, scale, and opacity properties using spring easing to create fluid, expanding bleed effects. The effect progresses from sharp/small (blur:0, scale:0.8, opacity:0) through expansion (blur:8px, scale:1.1, opacity:0.7) to settling (blur:2px, scale:1.0, opacity:0.9) and finally full clarity (blur:0, scale:1, opacity:1). Accepts bleedIntensity (0-1), bleedDuration (ms), optional bleedColor overlay, and targetIds array.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'watercolor', 'bleed', 'blur', 'scale', 'opacity', 'spring', 'organic', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    bleedIntensity: 1,
    bleedDuration: 2000,
    effectStart: 0,
  },
};

// Export preset
export const watercolorBleedEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
