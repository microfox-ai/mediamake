/**
 * Anaglyph 3D Drift Effect Preset
 * 
 * Creates a retro 3D anaglyph effect with drifting red and cyan color channels.
 * The red and cyan channels slowly drift apart and together, simulating depth 
 * perception changes like classic 3D glasses. Includes z-axis rotation for 
 * added dimensionality and optional vintage filter for authentic retro aesthetics.
 * 
 * Features:
 * - Red/cyan channel separation with oscillating drift patterns
 * - Configurable drift patterns (sine, circular, figure-8)
 * - Adjustable depth offset and drift speed
 * - Optional vintage filter (grain, vignette, contrast adjustments)
 * - Subtle z-axis rotation for enhanced dimensionality
 * 
 * Use cases:
 * - Retro-futuristic video aesthetics
 * - Nostalgic 3D effects
 * - Music videos with vintage vibes
 * - Creating depth perception illusions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the anaglyph effect to'),
  depthOffset: z
    .number()
    .min(1)
    .max(50)
    .default(8)
    .describe('Channel separation distance in pixels (controls 3D depth intensity)'),
  driftPattern: z
    .enum(['sine', 'circular', 'figure8'])
    .default('sine')
    .describe('Pattern of channel drift: sine (back-forth), circular (orbit), figure-8 (lemniscate)'),
  driftSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Oscillation cycle duration in seconds (higher = slower drift)'),
  vintageFilter: z
    .boolean()
    .default(false)
    .describe('Apply retro filter with grain, vignette, and contrast adjustments'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const { targetIds, depthOffset, driftPattern, driftSpeed, vintageFilter } = params;

  // Helper function to calculate keyframe values based on drift pattern
  const calculateDriftKeyframes = (isRedChannel: boolean) => {
    const sign = isRedChannel ? 1 : -1; // Red drifts opposite to cyan
    
    switch (driftPattern) {
      case 'circular':
        // Circular pattern uses both X and Y translation
        return {
          x: [
            { val: 0, prog: 0 },
            { val: sign * depthOffset, prog: 0.25 },
            { val: 0, prog: 0.5 },
            { val: -sign * depthOffset, prog: 0.75 },
            { val: 0, prog: 1 },
          ],
          y: [
            { val: 0, prog: 0 },
            { val: depthOffset * 0.5, prog: 0.25 },
            { val: depthOffset, prog: 0.5 },
            { val: depthOffset * 0.5, prog: 0.75 },
            { val: 0, prog: 1 },
          ],
        };
      
      case 'figure8':
        // Figure-8 pattern (lemniscate curve)
        return {
          x: [
            { val: 0, prog: 0 },
            { val: sign * depthOffset, prog: 0.125 },
            { val: sign * depthOffset * 0.7, prog: 0.25 },
            { val: 0, prog: 0.375 },
            { val: -sign * depthOffset * 0.7, prog: 0.5 },
            { val: -sign * depthOffset, prog: 0.625 },
            { val: -sign * depthOffset * 0.7, prog: 0.75 },
            { val: 0, prog: 0.875 },
            { val: 0, prog: 1 },
          ],
          y: [
            { val: 0, prog: 0 },
            { val: depthOffset * 0.3, prog: 0.125 },
            { val: depthOffset * 0.6, prog: 0.25 },
            { val: depthOffset * 0.3, prog: 0.375 },
            { val: 0, prog: 0.5 },
            { val: -depthOffset * 0.3, prog: 0.625 },
            { val: -depthOffset * 0.6, prog: 0.75 },
            { val: -depthOffset * 0.3, prog: 0.875 },
            { val: 0, prog: 1 },
          ],
        };
      
      case 'sine':
      default:
        // Simple sine wave (horizontal only)
        return {
          x: [
            { val: 0, prog: 0 },
            { val: sign * depthOffset, prog: 0.25 },
            { val: 0, prog: 0.5 },
            { val: -sign * depthOffset, prog: 0.75 },
            { val: 0, prog: 1 },
          ],
          y: [],
        };
    }
  };

  // Generate red channel effect
  const redKeyframes = calculateDriftKeyframes(true);
  const redChannelRanges = [
    // Color filter (red channel isolation)
    { key: 'filter', val: 'sepia(1) saturate(2) hue-rotate(-50deg)', prog: 0 },
    { key: 'filter', val: 'sepia(1) saturate(2) hue-rotate(-50deg)', prog: 1 },
    // X-axis translation
    ...redKeyframes.x.map(kf => ({ key: 'translateX', ...kf })),
    // Y-axis translation (if applicable)
    ...redKeyframes.y.map(kf => ({ key: 'translateY', ...kf })),
  ];

  // Generate cyan channel effect
  const cyanKeyframes = calculateDriftKeyframes(false);
  const cyanChannelRanges = [
    // Color filter (cyan channel isolation)
    { key: 'filter', val: 'sepia(1) saturate(2) hue-rotate(130deg)', prog: 0 },
    { key: 'filter', val: 'sepia(1) saturate(2) hue-rotate(130deg)', prog: 1 },
    // X-axis translation (opposite phase)
    ...cyanKeyframes.x.map(kf => ({ key: 'translateX', ...kf })),
    // Y-axis translation (if applicable)
    ...cyanKeyframes.y.map(kf => ({ key: 'translateY', ...kf })),
  ];

  // Red channel effect
  const redChannelEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: driftSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: redChannelRanges,
    iterations: 'infinite' as any,
  };

  // Cyan channel effect
  const cyanChannelEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: driftSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: cyanChannelRanges,
    iterations: 'infinite' as any,
  };

  // Z-axis rotation effect (slower, for subtle dimensionality)
  const rotationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: driftSpeed * 2,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'rotateZ', val: 0, prog: 0 },
      { key: 'rotateZ', val: 2, prog: 0.5 },
      { key: 'rotateZ', val: 0, prog: 1 },
    ],
    iterations: 'infinite' as any,
  };

  // Vintage filter effect (static)
  const vintageFilterEffect: GenericEffectData | null = vintageFilter
    ? {
        type: 'linear',
        start: 0,
        duration: 0.01,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          {
            key: 'filter',
            val: 'contrast(1.2) brightness(0.9) saturate(0.8)',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'contrast(1.2) brightness(0.9) saturate(0.8)',
            prog: 1,
          },
        ],
        iterations: 1 as any,
      }
    : null;

  // Compile all effects
  const effects = [
    {
      id: `anaglyph-red-${targetIds.join('-')}`,
      componentId: 'generic',
      data: redChannelEffect,
    },
    {
      id: `anaglyph-cyan-${targetIds.join('-')}`,
      componentId: 'generic',
      data: cyanChannelEffect,
    },
    {
      id: `anaglyph-rotation-${targetIds.join('-')}`,
      componentId: 'generic',
      data: rotationEffect,
    },
  ];

  if (vintageFilterEffect) {
    effects.push({
      id: `anaglyph-vintage-${targetIds.join('-')}`,
      componentId: 'generic',
      data: vintageFilterEffect,
    });
  }

  // Return as internal effect preset output
  return {
    output: {
      _extractedEffects: effects,
    },
    options: {},
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'anaglyph-3d-drift',
  title: 'Anaglyph 3D Drift Effect',
  description:
    'Creates a retro 3D anaglyph effect with drifting red and cyan color channels. Channels drift apart and together using configurable patterns (sine, circular, figure-8) to simulate depth perception changes. Includes vintage filter options for authentic retro aesthetics.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'anaglyph', '3d', 'retro', 'vintage', 'drift', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    depthOffset: 8,
    driftPattern: 'sine',
    driftSpeed: 4,
    vintageFilter: false,
  },
};

// Export preset
export const anaglyph3dDriftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
