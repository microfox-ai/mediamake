/**
 * Grunge Distress Edges Effect Preset
 *
 * SINGLE EFFECT:
 * Applies a distressed, worn edge effect to any component using CSS filters and clip-path animations.
 * Creates a rough, torn paper aesthetic with GPU-accelerated transforms.
 *
 * Features:
 * - Multi-stage animation with pulsing distortion and progressive edge roughness
 * - Custom SVG filter for grunge texture overlay
 * - Configurable intensity (0-1) and edge roughness (smooth/medium/rough)
 * - Uses generic AnimationRange effects combining filter and clip-path properties
 * - Mode: provider with targetIds for applying to specific components
 *
 * Technical Details:
 * - Effect type: generic (AnimationRange[])
 * - Animated properties: filter (contrast, brightness, url(#grunge-filter)), clipPath, opacity
 * - Multi-stage keyframes: 0 → 0.5 → 1 for pulsing distortion effect
 * - Clip-path uses polygon with random vertices based on edgeRoughness
 * - SVG filter definition included in effect for grunge texture
 *
 * Use cases:
 * - Creating vintage/distressed visual effects
 * - Applying worn paper or torn edge aesthetics
 * - Adding texture overlays to components
 * - Building retro or grunge-style compositions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Effect intensity from 0 (subtle) to 1 (intense)'),
  edgeRoughness: z
    .enum(['smooth', 'medium', 'rough'])
    .default('medium')
    .describe('Edge roughness level: smooth, medium, or rough'),
  duration: z
    .number()
    .min(0.5)
    .default(3)
    .describe('Animation duration in seconds'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for identification'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random clip-path polygon vertices
  const generateClipPath = (roughness: 'smooth' | 'medium' | 'rough'): string => {
    // Number of vertices based on roughness
    const vertexCount = roughness === 'smooth' ? 8 : roughness === 'medium' ? 12 : 16;
    
    // Random deviation range based on roughness
    const deviation = roughness === 'smooth' ? 3 : roughness === 'medium' ? 6 : 10;
    
    // Generate vertices around the perimeter
    const vertices: string[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      
      // Base position on circle (with some inset from edge)
      const baseRadius = 48 + (Math.random() * deviation - deviation / 2);
      
      // Convert to percentage coordinates
      const x = 50 + baseRadius * Math.cos(angle);
      const y = 50 + baseRadius * Math.sin(angle);
      
      vertices.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }
    
    return `polygon(${vertices.join(', ')})`;
  };

  // Helper function to generate grunge filter strength based on intensity
  const getFilterValues = (prog: number, intensity: number) => {
    // Base values
    const baseContrast = 1.0;
    const baseBrightness = 1.0;
    
    // Intensity-based modulation
    const contrastRange = 0.3 * intensity;
    const brightnessRange = 0.15 * intensity;
    
    // Progressive animation (pulsing effect)
    if (prog === 0) {
      return {
        contrast: baseContrast,
        brightness: baseBrightness,
      };
    } else if (prog === 0.5) {
      // Peak of pulse
      return {
        contrast: baseContrast + contrastRange,
        brightness: baseBrightness - brightnessRange,
      };
    } else {
      // Return to near-base
      return {
        contrast: baseContrast + contrastRange * 0.3,
        brightness: baseBrightness - brightnessRange * 0.5,
      };
    }
  };

  // Extract parameters
  const { targetIds, intensity, edgeRoughness, duration, effectStart, effectId } = params;

  // Generate clip-path values for animation stages
  const clipPath0 = generateClipPath(edgeRoughness);
  const clipPath1 = generateClipPath(edgeRoughness);
  const clipPath2 = generateClipPath(edgeRoughness);

  // Generate filter values
  const filter0 = getFilterValues(0, intensity);
  const filter1 = getFilterValues(0.5, intensity);
  const filter2 = getFilterValues(1, intensity);

  // Construct SVG filter for grunge texture
  const grungeFilterSvg = `
    <svg style="position: absolute; width: 0; height: 0;">
      <defs>
        <filter id="grunge-filter">
          <feTurbulence type="fractalNoise" baseFrequency="${0.02 + intensity * 0.03}" numOctaves="4" seed="${Math.floor(Math.random() * 100)}" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 0 1 1" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="${0.5 + intensity}" />
        </filter>
      </defs>
    </svg>
  `;

  // Construct generic effect with AnimationRange keyframes
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Filter animation (contrast + brightness + SVG filter)
      {
        key: 'filter',
        val: `contrast(${filter0.contrast}) brightness(${filter0.brightness}) url(#grunge-filter)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `contrast(${filter1.contrast}) brightness(${filter1.brightness}) url(#grunge-filter)`,
        prog: 0.5,
      },
      {
        key: 'filter',
        val: `contrast(${filter2.contrast}) brightness(${filter2.brightness}) url(#grunge-filter)`,
        prog: 1,
      },
      // Clip-path animation (progressive edge roughness)
      {
        key: 'clipPath',
        val: clipPath0,
        prog: 0,
      },
      {
        key: 'clipPath',
        val: clipPath1,
        prog: 0.5,
      },
      {
        key: 'clipPath',
        val: clipPath2,
        prog: 1,
      },
      // Subtle opacity pulsing
      {
        key: 'opacity',
        val: 1,
        prog: 0,
      },
      {
        key: 'opacity',
        val: 0.95 - intensity * 0.1,
        prog: 0.5,
      },
      {
        key: 'opacity',
        val: 1,
        prog: 1,
      },
    ],
  };

  // Create effect node
  const effect = {
    id: effectId || `grunge-distress-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return output with effect and SVG filter definition
  return {
    output: {
      childrenData: [
        {
          id: 'grunge-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'hidden', // Hidden container for effect-only preset
            },
          },
          effects: [effect],
          childrenData: [
            // Add SVG filter definition as HTMLBlockAtom
            {
              id: 'grunge-svg-filter',
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: grungeFilterSvg,
                className: 'absolute inset-0',
                style: {
                  pointerEvents: 'none',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
            },
          ],
          context: {
            timing: {
              start: 0,
              duration: duration,
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
  id: 'grunge-distress-edges',
  title: 'Grunge Distress Edges Effect',
  description:
    'Internal effect preset that applies a distressed, worn edge effect to components using CSS filters and clip-path animations. Returns effect configurations (not visual structure) with multi-stage keyframe ranges for pulsing distortion and progressive edge roughness. Supports intensity control, edge roughness levels, and GPU-accelerated transforms. Uses mode: provider with targetIds to apply effects to existing components.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'grunge',
    'distress',
    'edges',
    'filter',
    'clip-path',
    'texture',
    'vintage',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    intensity: 0.5,
    edgeRoughness: 'medium',
    duration: 3,
    effectStart: 0,
  },
};

// Export preset
export const grungeDistressEdgesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
