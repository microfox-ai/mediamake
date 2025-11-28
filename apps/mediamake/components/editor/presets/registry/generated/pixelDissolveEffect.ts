/**
 * Pixel Dissolve Effect Preset
 *
 * SINGLE EFFECT:
 * Simulates a retro video game-style pixelated dissolve transition by animating scale transforms
 * combined with opacity fading to create an 8-bit aesthetic. The effect starts with large scale
 * (simulating large pixel blocks) and progressively reduces to normal resolution while fading opacity.
 *
 * Technical Details:
 * - Uses generic effect with scale and opacity animation ranges
 * - Supports both 'in' (fade in from pixelated) and 'out' (fade out to pixelated) directions
 * - Configurable pixel start/end sizes, duration, and dissolve direction
 * - Achieves pixelation aesthetic through scale transforms (large scale = blocky appearance)
 * - All effects use mode: 'provider' with targetIds array - never wrapper mode
 *
 * Use Cases:
 * - Retro video game transitions
 * - 8-bit style reveals
 * - Nostalgic pixelated effects for text and media
 * - Creative dissolve transitions with vintage aesthetic
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply the pixel dissolve effect to'),
  duration: z.number().default(1.5).optional().describe('Duration of the pixel dissolve effect in seconds (default: 1.5)'),
  pixelStartSize: z.number().default(64).optional().describe('Starting pixel block size - larger values create more pixelated appearance (default: 64)'),
  pixelEndSize: z.number().default(1).optional().describe('Ending pixel block size - typically 1 for normal resolution (default: 1)'),
  dissolveDirection: z.enum(['in', 'out']).describe("Direction of the dissolve: 'in' fades from pixelated to clear, 'out' fades from clear to pixelated"),
  effectStart: z.number().default(0).optional().describe('Start time of the effect relative to parent component (default: 0)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = params.duration ?? 1.5;
  const pixelStartSize = params.pixelStartSize ?? 64;
  const pixelEndSize = params.pixelEndSize ?? 1;
  const dissolveDirection = params.dissolveDirection;
  const effectStart = params.effectStart ?? 0;
  const targetIds = params.targetIds;

  // Helper function to calculate scale from pixel size
  // Larger pixel size = larger scale (more blocky/pixelated appearance)
  // This simulates pixelation by making elements appear blocky when scaled up
  const calculateScaleFromPixelSize = (pixelSize: number): number => {
    // Base calculation: larger pixel sizes map to larger scales
    // Scale ranges from 1 (normal) to ~2.5 (very pixelated)
    // Formula: scale = 1 + (pixelSize - 1) / 40
    // For pixelSize=64: scale ≈ 2.575 (very blocky)
    // For pixelSize=32: scale ≈ 1.775 (medium blocky)
    // For pixelSize=16: scale ≈ 1.375 (slightly blocky)
    // For pixelSize=1: scale = 1 (normal)
    return 1 + Math.max(0, (pixelSize - 1) / 40);
  };

  // Calculate scales for start and end
  const scaleStart = calculateScaleFromPixelSize(pixelStartSize);
  const scaleEnd = calculateScaleFromPixelSize(pixelEndSize);

  // Create keyframes for pixel size reduction (simulated via scale)
  // Multiple keyframes create smooth progression through different "pixel" sizes
  const pixelRanges = [
    { key: 'scale', val: scaleStart, prog: 0 },           // Start: Large pixels (blocky)
    { key: 'scale', val: scaleStart * 0.7, prog: 0.3 },   // 30%: Medium-large pixels
    { key: 'scale', val: scaleStart * 0.4, prog: 0.6 },   // 60%: Medium-small pixels
    { key: 'scale', val: scaleEnd, prog: 1 },             // 100%: Normal resolution
  ];

  // Create keyframes for opacity fade
  const opacityRanges = [
    { key: 'opacity', val: 0, prog: 0 },    // Start: Invisible
    { key: 'opacity', val: 1, prog: 1 },    // End: Fully visible
  ];

  // If dissolveDirection is 'out', reverse the animations
  // 'in': fade in from pixelated to clear (default behavior above)
  // 'out': fade out from clear to pixelated (reverse all ranges)
  let finalPixelRanges = pixelRanges;
  let finalOpacityRanges = opacityRanges;

  if (dissolveDirection === 'out') {
    // Reverse scale ranges (normal to pixelated)
    finalPixelRanges = [
      { key: 'scale', val: scaleEnd, prog: 0 },
      { key: 'scale', val: scaleStart * 0.4, prog: 0.4 },
      { key: 'scale', val: scaleStart * 0.7, prog: 0.7 },
      { key: 'scale', val: scaleStart, prog: 1 },
    ];

    // Reverse opacity ranges (visible to invisible)
    finalOpacityRanges = [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ];
  }

  // Combine pixel and opacity ranges
  const combinedRanges = [...finalPixelRanges, ...finalOpacityRanges];

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-out', // Smooth easing for pixel size reduction
    start: effectStart,
    duration: duration,
    mode: 'provider', // ALWAYS use provider mode with targetIds
    targetIds: targetIds,
    ranges: combinedRanges,
  };

  // Create the effect node
  const effect = {
    id: params.effectId || `pixel-dissolve-effect-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'pixel-dissolve-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: 10, // Arbitrary container duration
      },
    },
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'pixelDissolveEffect',
  title: 'Pixel Dissolve Effect',
  description:
    'Internal effect preset that simulates a retro video game-style pixelated dissolve transition using scale transforms and opacity. Achieves an 8-bit aesthetic by animating scale (large scale = blocky appearance, normal scale = clear) combined with opacity fading. Supports both fade-in and fade-out directions. Uses generic effects with mode: provider and targetIds for all animations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'pixel', 'dissolve', 'retro', '8-bit', 'transition', 'pixelated', 'generic', 'internal'],
  dependencies: {
    presets: [],
    helpers: [],
  },
  // Internal preset markers
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    duration: 1.5,
    pixelStartSize: 64,
    pixelEndSize: 1,
    dissolveDirection: 'in',
    effectStart: 0,
  },
};

// Export the preset
export const pixelDissolveEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
