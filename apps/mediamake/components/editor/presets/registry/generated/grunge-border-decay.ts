/**
 * Grunge Border Decay Effect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Returns a single effect that progressively deteriorates the edges of elements
 * to create a weathered, torn appearance.
 *
 * Features:
 * - Progressive edge decay from clean to irregular
 * - SVG turbulence filter for texture
 * - Animated clip-path with dynamic vertex generation
 * - Three animation stages: initial wear, progressive tearing, final stabilization
 * - Subtle shadow animations for torn paper illusion
 * - Configurable decay speed, edge variance, and corner preservation
 *
 * Use cases:
 * - Creating vintage or worn aesthetic effects
 * - Paper tear transitions
 * - Weathered photo/video edges
 * - Grunge design overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  decaySpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Speed multiplier for the decay progression (higher = faster)'),
  edgeVariance: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum random offset for edge vertices in percentage'),
  preserveCorners: z
    .boolean()
    .default(true)
    .describe('Whether to keep corners intact during decay'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate rough polygon with random vertices
  const generateRoughPolygon = (
    numVertices: number,
    variance: number,
    preserveCorners: boolean,
  ): string => {
    const points: string[] = [];
    const cornerIndices = [0, numVertices / 4, numVertices / 2, (3 * numVertices) / 4];

    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * 360;
      const isCorner = preserveCorners && cornerIndices.some(idx => Math.abs(i - idx) < 0.5);

      // Calculate base position on circle
      const radius = 50; // 50% radius
      let x = 50 + radius * Math.cos((angle * Math.PI) / 180);
      let y = 50 + radius * Math.sin((angle * Math.PI) / 180);

      // Add random variance for non-corner points
      if (!isCorner) {
        const randomOffset = (Math.random() - 0.5) * variance;
        const offsetAngle = ((angle + 90) * Math.PI) / 180;
        x += randomOffset * Math.cos(offsetAngle);
        y += randomOffset * Math.sin(offsetAngle);
      }

      // Clamp to valid percentage range
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));

      points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }

    return `polygon(${points.join(', ')})`;
  };

  // Generate polygon states for animation stages
  const cleanPolygon = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  const wornPolygon = generateRoughPolygon(8, params.edgeVariance * 0.4, params.preserveCorners);
  const tornPolygon = generateRoughPolygon(16, params.edgeVariance, params.preserveCorners);

  // Calculate animation timing based on decay speed
  const adjustedDuration = params.effectDuration / params.decaySpeed;

  // Generate SVG filter ID
  const filterId = `grunge-turbulence-${params.targetId}`;

  // Create SVG filter definition
  const svgFilter = `
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <filter id="${filterId}">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" seed="1" />
          <feDisplacementMap in="SourceGraphic" scale="8" />
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>
    </svg>
  `;

  // Create the main grunge decay effect
  const grungeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: adjustedDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Stage 1: Initial wear (0-33% progress) - Clean to slightly worn
      { key: 'clipPath', val: cleanPolygon, prog: 0 },
      { key: 'clipPath', val: wornPolygon, prog: 0.33 },
      
      // Stage 2: Progressive tearing (33-66% progress) - Worn to heavily torn
      { key: 'clipPath', val: tornPolygon, prog: 0.66 },
      
      // Stage 3: Final stabilization (66-100% progress) - Stabilize at torn state
      { key: 'clipPath', val: tornPolygon, prog: 1 },

      // Shadow animations for depth illusion
      // Start with subtle shadow
      {
        key: 'filter',
        val: `url(#${filterId}) drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.2))`,
        prog: 0,
      },
      // Increase shadow during wear
      {
        key: 'filter',
        val: `url(#${filterId}) drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.3))`,
        prog: 0.33,
      },
      // Maximum shadow at peak tearing
      {
        key: 'filter',
        val: `url(#${filterId}) drop-shadow(4px 6px 8px rgba(0, 0, 0, 0.4))`,
        prog: 0.66,
      },
      // Stabilize shadow
      {
        key: 'filter',
        val: `url(#${filterId}) drop-shadow(3px 5px 6px rgba(0, 0, 0, 0.35))`,
        prog: 1,
      },
    ],
  };

  // Create effect node
  const effect = {
    id: params.effectId || `grunge-decay-${params.targetId}`,
    componentId: 'generic',
    data: grungeEffect,
  };

  // Return output with effect and SVG filter
  return {
    output: {
      childrenData: [
        {
          id: 'grunge-decay-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              dangerouslySetInnerHTML: {
                __html: svgFilter,
              },
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
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
  id: 'grunge-border-decay',
  title: 'Grunge Border Decay Effect',
  description:
    'An internal effect preset that progressively deteriorates the edges of elements to create a weathered, torn appearance using CSS clip-path animation and shadow effects. Returns effect objects for integration into other presets.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'grunge', 'decay', 'edges', 'vintage', 'worn', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 5,
    decaySpeed: 1,
    edgeVariance: 5,
    preserveCorners: true,
  },
};

// Export preset
export const grungeBorderDecayPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
