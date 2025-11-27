/**
 * Kinetic Ribbon Typography Preset
 *
 * This preset creates dynamic 3D typography where text forms from flowing metallic ribbons
 * that weave and twist through 3D space before settling into readable letters. Each letter
 * maintains dimensional depth with visible ribbon edges and subtle shadows.
 *
 * Features:
 * - **3D Ribbon Formation**: Letters animate from twisted metallic ribbons with rotateY, rotateZ, and translateZ transforms
 * - **Brushed Metal Texture**: Multi-gradient background simulating brushed metal with light-catching highlights
 * - **Spring Physics**: Overshoot and bounce effect with cubic-bezier(0.68, -0.55, 0.265, 1.55) easing
 * - **Dimensional Depth**: Text shadows and drop shadows create visible ribbon edges and depth
 * - **Staggered Animation**: Each letter animates with 0.1s stagger for flowing ribbon effect
 * - **Preserve-3D Context**: Full 3D transforms with perspective-1000 for realistic depth
 *
 * Use cases:
 * - Premium brand reveals with metallic aesthetic
 * - Title sequences requiring dimensional typography
 * - Luxury product presentations
 * - Modern tech or automotive content
 * - High-end fashion or jewelry reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('RIBBON')
    .describe('Text content to display with kinetic ribbon animation'),
  font: z
    .string()
    .default('Bodoni Moda:700')
    .describe(
      'Font family with optional weight and style (e.g., "Bodoni Moda:700", "Playfair Display:900")',
    ),
  fontSize: z
    .string()
    .default('clamp(80px, 15vw, 200px)')
    .describe('Font size (CSS value, responsive clamp recommended)'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Total duration of the animation in seconds'),
  letterStagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Time delay between each letter animation start (seconds)'),
  animationDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Duration of each individual letter animation (seconds)'),
  metalColor: z
    .string()
    .default('#c0c0c0')
    .describe('Base metallic color for the ribbon texture'),
  highlightColor: z
    .string()
    .default('#e8e8e8')
    .describe('Highlight color for metallic shine'),
  shadowColor: z
    .string()
    .default('rgba(0,0,0,0.3)')
    .describe('Shadow color for dimensional depth'),
  letterSpacing: z
    .string()
    .default('0.02em')
    .describe('Spacing between letters (CSS value)'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('3D perspective value in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Bodoni Moda:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  // Split text into individual letters
  const letters = params.text.split('');

  // Create letter components with wrapper structure
  const letterComponents: RenderableComponentData[] = letters.map(
    (char, index) => {
      const letterId = `letter-${index}`;
      const wrapperId = `letter-wrapper-${index}`;

      // Calculate timing
      const letterStart = index * params.letterStagger;

      // Create generic effect for ribbon animation
      const ribbonEffect = {
        id: `ribbon-effect-${letterId}`,
        componentId: 'generic',
        data: {
          type: 'spring' as const,
          start: 0,
          duration: params.animationDuration,
          mode: 'provider' as const,
          targetIds: [letterId],
          ranges: [
            // Initial state: rotated 90deg Y, full rotation Z, translateZ 100px, scale 0.5
            { key: 'rotateY', val: 90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'rotateZ', val: 360, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            { key: 'translateZ', val: 100, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
            // Scale with overshoot (0.5 → 1.05 → 1.0)
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.85 },
            { key: 'scale', val: 1.0, prog: 1 },
            // Opacity fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      };

      // Letter wrapper component
      const letterWrapper: RenderableComponentData = {
        id: wrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative transform-gpu',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: letterStart,
            duration: params.duration - letterStart,
          },
        },
        effects: [ribbonEffect],
        childrenData: [
          {
            id: letterId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
              style: {
                fontSize: params.fontSize,
                ...fontStyle,
                color: 'transparent',
                backgroundImage: `linear-gradient(135deg, ${params.metalColor} 0%, ${params.highlightColor} 25%, #a0a0a0 50%, ${params.highlightColor} 75%, ${params.metalColor} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                textShadow: `2px 2px 4px ${params.shadowColor}`,
                filter: `drop-shadow(3px 3px 6px ${params.shadowColor})`,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: params.animationDuration,
              },
            },
          } as RenderableComponentData,
        ],
      };

      return letterWrapper;
    },
  );

  // Text container with preserve-3d
  const textContainer: RenderableComponentData = {
    id: 'ribbon-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row items-center justify-center',
        style: {
          gap: params.letterSpacing,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-ribbon-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: `${params.perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textContainer],
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
  id: 'kinetic-ribbon-typography',
  title: 'Kinetic Ribbon Typography',
  description:
    'A dynamic 3D typography preset where text forms from flowing metallic ribbons that weave and twist through 3D space before settling into readable letters. Features brushed metal textures with light-catching gradients, dimensional depth with visible ribbon edges and shadows, and spring physics with overshoot bounce effect. Each letter animates with staggered timing using spring easing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'ribbon',
    'metallic',
    'spring',
    'depth',
    'luxury',
    'premium',
    'dimensional',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RIBBON',
    font: 'Bodoni Moda:700',
    fontSize: 'clamp(80px, 15vw, 200px)',
    duration: 3,
    letterStagger: 0.1,
    animationDuration: 1.2,
    metalColor: '#c0c0c0',
    highlightColor: '#e8e8e8',
    shadowColor: 'rgba(0,0,0,0.3)',
    letterSpacing: '0.02em',
    perspective: 1000,
  },
};

// Export preset
export const kineticRibbonTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
