/**
 * Prismatic Refraction Reveal Preset
 *
 * This internal effect preset generates RGB chromatic aberration effects through animated
 * triangular prism masks. Creates separate red, green, and blue channel offsets that converge
 * during animation, simulating light refraction through glass prisms.
 *
 * ARRAY OF EFFECTS:
 * Returns an array of effects (3 per prism: R, G, B channels). Each effect targets a specific
 * component via targetIds and creates triangular clip paths with RGB color separation.
 *
 * Features:
 * - **Triangular Prism Masks**: SVG-based clip paths creating prism shapes
 * - **RGB Channel Separation**: Separate red, green, blue layers with independent offsets
 * - **Chromatic Aberration**: Simulates light refraction with color channel displacement
 * - **Configurable Prisms**: Multiple prism layers with different angles
 * - **Refraction Index**: Controls intensity of color separation effect
 * - **Glass-like Effects**: Blur gradients and brightness variations for optical realism
 * - **Convergence Animation**: Color channels start separated and converge to normal
 *
 * Use cases:
 * - Creating prismatic reveal effects for content
 * - Simulating light refraction through glass
 * - Adding rainbow-like color separation transitions
 * - Building optical effects for sophisticated visual reveals
 * - Creating scientific or futuristic visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply prism effects to'),
  start: z.number().describe('Start time of the effect (relative to parent)'),
  duration: z.number().describe('Duration of the effect in seconds'),
  prismCount: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of triangular prisms to generate'),
  refractionIndex: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe('Refraction intensity (1 = minimal, 3 = extreme)'),
  colorSeparation: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Distance of RGB channel separation in pixels'),
  angleVariation: z
    .number()
    .min(0)
    .max(180)
    .default(45)
    .describe('Angle variation between prisms in degrees'),
  edgeBlur: z
    .boolean()
    .default(true)
    .describe('Enable blur gradients on prism edges'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate triangular prism clip path
  const generatePrismPath = (
    angle: number,
    position: number,
    index: number,
  ): string => {
    // Create triangular path based on angle and position
    // Position ranges from 0 (left/top) to 1 (right/bottom)
    const isVertical = angle % 180 < 90;

    if (isVertical) {
      // Vertical prism
      const x = position * 100;
      const width = 100 / params.prismCount;
      return `polygon(${x}% 0%, ${x + width}% 0%, ${x + width / 2}% 100%)`;
    } else {
      // Horizontal prism
      const y = position * 100;
      const height = 100 / params.prismCount;
      return `polygon(0% ${y}%, 100% ${y}%, 50% ${y + height}%)`;
    }
  };

  // Helper function: Calculate channel offset based on refraction index
  const calculateChannelOffset = (
    channelIndex: number,
    refractionIndex: number,
  ): { x: number; y: number } => {
    const baseOffset = params.colorSeparation * refractionIndex;
    const angles = [0, 120, 240]; // R, G, B at 120° separation for rainbow effect

    const angleRad = (angles[channelIndex] * Math.PI) / 180;
    return {
      x: Math.cos(angleRad) * baseOffset,
      y: Math.sin(angleRad) * baseOffset,
    };
  };

  // Generate effects for all prisms and channels
  const allEffects: any[] = [];
  const channelColors = ['red', 'green', 'blue'];
  const channelFilters = [
    'sepia(1) saturate(10) hue-rotate(0deg)', // Red channel
    'sepia(1) saturate(10) hue-rotate(90deg)', // Green channel
    'sepia(1) saturate(10) hue-rotate(210deg)', // Blue channel
  ];

  params.targetIds.forEach((targetId) => {
    for (let prismIndex = 0; prismIndex < params.prismCount; prismIndex++) {
      const angle =
        (prismIndex * params.angleVariation) % 360 + Math.random() * 15;
      const position = prismIndex / params.prismCount;

      // Create 3 effects per prism (R, G, B channels)
      for (let channelIndex = 0; channelIndex < 3; channelIndex++) {
        const offset = calculateChannelOffset(
          channelIndex,
          params.refractionIndex,
        );
        const channelColor = channelColors[channelIndex];
        const effectId =
          params.effectId ||
          `prism-${prismIndex}-${channelColor}-${targetId}`;

        const ranges: any[] = [
          // Clip path animation (prism shape)
          {
            key: 'clipPath',
            val: generatePrismPath(angle, position, prismIndex),
            prog: 0,
          },
          {
            key: 'clipPath',
            val: generatePrismPath(angle, position, prismIndex),
            prog: 1,
          },

          // Channel offset convergence (start separated, converge to 0)
          {
            key: 'translateX',
            val: offset.x,
            prog: 0,
          },
          {
            key: 'translateX',
            val: 0,
            prog: 1,
          },
          {
            key: 'translateY',
            val: offset.y,
            prog: 0,
          },
          {
            key: 'translateY',
            val: 0,
            prog: 1,
          },

          // Opacity convergence (channels blend in)
          {
            key: 'opacity',
            val: 0.33,
            prog: 0,
          },
          {
            key: 'opacity',
            val: 1,
            prog: 1,
          },

          // Color filter for RGB channel separation
          {
            key: 'filter',
            val: channelFilters[channelIndex],
            prog: 0,
          },
          {
            key: 'filter',
            val: channelFilters[channelIndex],
            prog: 0.5,
          },
          {
            key: 'filter',
            val: 'none',
            prog: 1,
          },
        ];

        // Add blur gradient if enabled
        if (params.edgeBlur) {
          ranges.push(
            {
              key: 'filter',
              val: `${channelFilters[channelIndex]} blur(2px) brightness(1.2)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `${channelFilters[channelIndex]} blur(1px) brightness(1.1)`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'blur(0px) brightness(1)',
              prog: 1,
            },
          );
        }

        const effectData: GenericEffectData = {
          type: 'ease-out',
          start: params.start,
          duration: params.duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: ranges,
        };

        allEffects.push({
          id: effectId,
          componentId: 'generic',
          data: effectData,
        });
      }
    }
  });

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'prism-effects-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: allEffects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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
  id: 'prismaticRefractionReveal',
  title: 'Prismatic Refraction Reveal',
  description:
    'Internal effect preset that generates RGB chromatic aberration effects through animated triangular prism masks. Creates separate red, green, and blue channel offsets that converge during animation, simulating light refraction through glass prisms. Supports multiple prism layers with configurable angles, refraction intensity, color separation distance, and glass-like blur/brightness gradients. Returns effects array for application to target component IDs via mode: provider.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'prism',
    'refraction',
    'rgb',
    'chromatic-aberration',
    'glass',
    'optical',
    'rainbow',
    'color-separation',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    start: 0,
    duration: 2,
    prismCount: 3,
    refractionIndex: 1.5,
    colorSeparation: 20,
    angleVariation: 45,
    edgeBlur: true,
  },
};

export const prismaticRefractionRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
