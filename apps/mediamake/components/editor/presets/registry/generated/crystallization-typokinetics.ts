/**
 * Crystallization Typokinetics Preset
 *
 * A dramatic text-to-shatter preset where each character fragments into 5-8 geometric shards
 * that tumble through 3D space with perspective transforms before reassembling in reverse.
 * Features clip-path polygonal shapes, multi-axis rotation (rotateX/Y/Z), translateZ depth,
 * refraction effects with brightness/hue-rotate filters, and light ray gradient overlays
 * with blend modes. Perfect for high-impact title reveals with crystalline glass-reforming aesthetics.
 *
 * Technical Details:
 * - Structure: BaseLayout with 'perspective-1000' for 3D space
 * - Each character uses multiple BaseLayout fragments with TextAtom clipped via 'clip-path: polygon()'
 * - 5-8 unique polygon shapes per character (triangular shards)
 * - Animation: Multi-axis rotation (rotateX/Y/Z) with different axes per shard
 * - Translate shards outward (translateZ -100 to -300px) then back to 0
 * - Ease-in-out timing for realistic physics
 * - Brightness and hue-rotate filters for light refraction effects
 * - Light ray gradient overlays with mix-blend-mode: overlay
 * - 2-2.5s duration with 30-50ms stagger between shards for cascading effect
 *
 * Performance:
 * - Limit to 8 shards per character
 * - Use transform3d for GPU acceleration
 * - Batch filter applications
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// --- PARAMS SCHEMA ---

const presetParams = z.object({
  text: z.string().describe('Text to fragment and reassemble'),
  duration: z
    .number()
    .min(1.5)
    .max(5)
    .default(2.5)
    .describe('Total animation duration in seconds (2-2.5s recommended)'),
  shardsPerCharacter: z
    .number()
    .min(5)
    .max(8)
    .default(6)
    .describe('Number of geometric shards per character (5-8 for performance)'),
  staggerDelay: z
    .number()
    .min(0.02)
    .max(0.1)
    .default(0.04)
    .describe(
      'Delay between each shard animation in seconds (30-50ms = 0.03-0.05s)',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (before refraction effects)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  refractionIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Intensity of brightness refraction effect (1.0-1.5 recommended)'),
  hueRotateRange: z
    .number()
    .min(0)
    .max(60)
    .default(20)
    .describe('Maximum hue rotation in degrees for color shift effect'),
  rotationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for rotation angles (0.5 = subtle, 2 = extreme)'),
  translateDepth: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe(
      'Maximum translateZ distance in pixels (100-300px recommended)',
    ),
});

// --- EXECUTION FUNCTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate polygonal shard clip-path coordinates (triangular shapes)
  const generateShardPolygon = (shardIndex: number, totalShards: number) => {
    // Create triangular/polygonal shapes by dividing the character space
    // Each shard is a polygon defined by 3-4 points
    const angle = (shardIndex / totalShards) * 360;
    const nextAngle = ((shardIndex + 1) / totalShards) * 360;

    // Center point
    const cx = 50;
    const cy = 50;

    // Calculate polygon points (triangular shard radiating from center)
    const radius = 70; // Extend beyond bounds for full coverage

    const x1 = cx + radius * Math.cos((angle * Math.PI) / 180);
    const y1 = cy + radius * Math.sin((angle * Math.PI) / 180);

    const x2 = cx + radius * Math.cos((nextAngle * Math.PI) / 180);
    const y2 = cy + radius * Math.sin((nextAngle * Math.PI) / 180);

    // Return polygon coordinates as string
    return `polygon(${cx}% ${cy}%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  };

  // Parse font configuration
  const fontString = params.font || 'Inter:700';
  const { fontFamily, fontStyle } = parseFontString(fontString);

  // Split text into characters
  const characters = params.text.split('');

  // Build character containers with shards
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, charIndex) => {
      const charId = `char-${charIndex}`;

      // Generate shards for this character
      const shardComponents: RenderableComponentData[] = [];

      for (let i = 0; i < params.shardsPerCharacter; i++) {
        const shardId = `${charId}-shard-${i}`;

        // Generate random rotation values (scaled by intensity)
        const rotateXStart = randomInRange(-180, 180) * params.rotationIntensity;
        const rotateYStart = randomInRange(-90, 90) * params.rotationIntensity;
        const rotateZStart = randomInRange(-45, 45) * params.rotationIntensity;

        // Generate random translation values
        const translateXStart = randomInRange(-50, 50);
        const translateYStart = randomInRange(-50, 50);
        const translateZStart =
          -randomInRange(params.translateDepth * 0.5, params.translateDepth);

        // Generate random hue rotation
        const hueRotateStart = randomInRange(
          -params.hueRotateRange,
          params.hueRotateRange,
        );

        // Calculate stagger start time
        const staggerStart = (charIndex * params.shardsPerCharacter + i) * params.staggerDelay;

        // Tumble effect (rotation + translation)
        const tumbleEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: staggerStart,
          duration: params.duration,
          mode: 'provider',
          targetIds: [shardId],
          ranges: [
            // Rotation
            { key: 'rotateX', val: rotateXStart, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'rotateY', val: rotateYStart, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'rotateZ', val: rotateZStart, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            // Translation
            { key: 'translateX', val: translateXStart, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: translateYStart, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'translateZ', val: translateZStart, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
            // Opacity
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        };

        // Refraction effect (brightness + hue-rotate)
        const refractionEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: staggerStart,
          duration: params.duration,
          mode: 'provider',
          targetIds: [shardId],
          ranges: [
            {
              key: 'brightness',
              val: params.refractionIntensity + 0.3,
              prog: 0,
            },
            { key: 'brightness', val: 1, prog: 1 },
            { key: 'hue-rotate', val: hueRotateStart, prog: 0 },
            { key: 'hue-rotate', val: 0, prog: 1 },
          ],
        };

        // TextAtom shard with clip-path
        const shardComponent: RenderableComponentData = {
          id: shardId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: char,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: fontStyle.fontWeight || 700,
              fontStyle: fontStyle.fontStyle,
              color: params.textColor,
              clipPath: generateShardPolygon(i, params.shardsPerCharacter),
              display: 'inline-block',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: params.duration + staggerStart + 0.5, // Extend to cover stagger
            },
          },
          effects: [
            {
              id: `${shardId}-tumble`,
              componentId: 'generic',
              data: tumbleEffect,
            },
            {
              id: `${shardId}-refraction`,
              componentId: 'generic',
              data: refractionEffect,
            },
          ],
        };

        shardComponents.push(shardComponent);
      }

      // Light ray overlay for this character
      const lightRayId = `${charId}-light-ray`;
      const lightRayComponent: RenderableComponentData = {
        id: lightRayId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.3) 100%); mix-blend-mode: overlay; pointer-events: none;"></div>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration + 0.5,
          },
        },
        effects: [
          {
            id: `${lightRayId}-fade`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: params.duration,
              mode: 'provider',
              targetIds: [lightRayId],
              ranges: [
                { key: 'opacity', val: 0.9, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };

      // Character container (holds all shards + light ray)
      const charContainer: RenderableComponentData = {
        id: charId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              transformStyle: 'preserve-3d',
              display: 'inline-block',
              marginRight: '0.1em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration + params.staggerDelay * params.shardsPerCharacter + 0.5,
          },
        },
        childrenData: [...shardComponents, lightRayComponent] as RenderableComponentData[],
      };

      return charContainer;
    },
  );

  // Root container (perspective + flex layout)
  const rootContainer: RenderableComponentData = {
    id: 'crystallization-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration + params.staggerDelay * params.shardsPerCharacter * characters.length + 0.5,
      },
    },
    childrenData: [
      {
        id: 'character-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-row',
            style: {
              transformStyle: 'preserve-3d',
              gap: '0px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration + params.staggerDelay * params.shardsPerCharacter * characters.length + 0.5,
          },
        },
        childrenData: characterComponents as RenderableComponentData[],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
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

// --- METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'crystallization-typokinetics',
  title: 'Crystallization Typokinetics',
  description:
    'Dramatic text-to-shatter preset where each character fragments into 5-8 geometric shards that tumble through 3D space with perspective transforms before reassembling in reverse. Features clip-path polygonal shapes, multi-axis rotation (rotateX/Y/Z), translateZ depth, refraction effects with brightness/hue-rotate filters, and light ray gradient overlays with blend modes. Perfect for high-impact title reveals with crystalline glass-reforming aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'shatter',
    'crystallization',
    '3d',
    'perspective',
    'geometric',
    'refraction',
    'dramatic',
    'title',
    'reveal',
    'glass',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SHATTER',
    duration: 2.5,
    shardsPerCharacter: 6,
    staggerDelay: 0.04,
    fontSize: 72,
    textColor: '#ffffff',
    font: 'Inter:700',
    refractionIntensity: 1.2,
    hueRotateRange: 20,
    rotationIntensity: 1,
    translateDepth: 200,
  },
};

// --- EXPORT ---

export const crystallizationTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
