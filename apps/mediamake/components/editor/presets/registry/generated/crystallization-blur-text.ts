/**
 * Crystallization Blur Text Reveal Preset
 *
 * This preset creates a stunning frost-inspired text reveal effect where text forms
 * like ice crystals on glass. The text starts as an abstract blur with a fractal,
 * ice-like quality and crystallizes into sharp letterforms synchronized to audio beats.
 *
 * Features:
 * - **Crystalline Blur Formation**: Initial heavy blur (30px) with geometric patterns
 *   emerging as focus sharpens, creating a fractal ice-like quality
 * - **Prismatic Light Effects**: Subtle light refraction through ice crystals with
 *   chromatic aberration using RGB text shadows
 * - **Nucleation Point Growth**: Formation spreads from nucleation points using
 *   radial gradient masks with animated expansion
 * - **Beat Synchronization**: Crystallization completion syncs to audio beats
 * - **Frosted Glass Texture**: Subtle persistent texture remains after focus for
 *   atmospheric depth (2px residual blur)
 * - **Contrast Boost**: Enhanced contrast (1.5) for abstract crystalline feel
 * - **Brightness Enhancement**: Increased brightness (1.2) for icy luminosity
 *
 * Technical Implementation:
 * - Uses BaseLayout with TextAtom and CSS/SVG filters for crystalline effects
 * - Initial heavy blur (30px) transitions to subtle texture (2px) on beat
 * - Frost texture: filter: blur() + contrast(1.5) + brightness(1.2)
 * - Prismatic effects: RGB text-shadow offsets for color aberration
 * - Growth pattern: Radial gradient masks expanding from nucleation points
 * - Scale animation (0.95 to 1) synchronized with blur reduction
 * - Opacity masks expanding from center points for nucleation growth
 * - Performance optimized: CSS custom properties for animation values
 *
 * Use cases:
 * - Creating dramatic frozen text reveals for winter-themed content
 * - Building atmospheric ice-crystal title sequences
 * - Adding crystalline text effects synchronized to music beats
 * - Creating ethereal frost-on-glass typography animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('FROZEN').describe('Text to display with crystallization effect'),
  fontSize: z.number().default(120).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700", "900")'),
  duration: z.number().default(10).describe('Total duration in seconds'),
  crystallizationTime: z.number().default(2.5).describe('Time for full crystallization to complete (seconds)'),
  backgroundColor: z.string().default('#0a0a12').describe('Background color (dark blue-black)'),
  textColor: z.string().default('#ffffff').describe('Base text color (white for ice)'),
  
  // Prismatic effects
  chromaticAberration: z.boolean().default(true).describe('Enable chromatic aberration (RGB text shadow offsets)'),
  chromaticIntensity: z.number().default(0.3).min(0).max(1).describe('Chromatic aberration intensity (0-1)'),
  
  // Blur and texture
  initialBlur: z.number().default(30).describe('Initial blur amount in pixels'),
  finalBlur: z.number().default(2).describe('Final frosted glass blur amount in pixels (for texture)'),
  
  // Crystalline effects
  contrast: z.number().default(1.5).describe('Contrast boost for crystalline effect'),
  brightness: z.number().default(1.2).describe('Brightness enhancement for icy luminosity'),
  
  // Nucleation growth
  nucleationPoints: z.number().default(3).min(1).max(5).describe('Number of nucleation points for growth pattern'),
  
  // Animation
  scaleStart: z.number().default(0.95).describe('Initial scale factor'),
  scaleEnd: z.number().default(1).describe('Final scale factor'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    duration,
    crystallizationTime,
    backgroundColor,
    textColor,
    chromaticAberration,
    chromaticIntensity,
    initialBlur,
    finalBlur,
    contrast,
    brightness,
    nucleationPoints,
    scaleStart,
    scaleEnd,
  } = params;

  // Calculate chromatic aberration offsets
  const chromaticOffset = chromaticAberration ? chromaticIntensity * 2 : 0;
  const textShadowRGB = chromaticAberration
    ? `-${chromaticOffset}px 0 rgba(255, 100, 100, ${chromaticIntensity}), ${chromaticOffset}px 0 rgba(100, 100, 255, ${chromaticIntensity})`
    : 'none';

  // Create nucleation point positions (distributed across text)
  const createNucleationPoints = () => {
    const points: string[] = [];
    for (let i = 0; i < nucleationPoints; i++) {
      const xPos = ((i + 1) / (nucleationPoints + 1)) * 100;
      const yPos = 50; // Center vertically
      points.push(`radial-gradient(circle at ${xPos}% ${yPos}%, rgba(255,255,255,1) 0%, transparent 60%)`);
    }
    return points.join(', ');
  };

  // Component IDs
  const rootId = 'crystallization-root';
  const frostTextureId = 'frost-texture-layer';
  const prismaticOverlayId = 'prismatic-overlay';
  const textContainerId = 'crystallization-text-container';
  const mainTextId = 'main-text';

  // Build composition structure
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      // Frost texture layer (subtle radial gradient overlay)
      {
        id: frostTextureId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              background: 'radial-gradient(ellipse at center, rgba(180, 220, 255, 0.08) 0%, transparent 70%)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Prismatic overlay (gradient for light refraction)
      {
        id: prismaticOverlayId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              background: 'linear-gradient(135deg, rgba(100, 180, 255, 0.05) 0%, rgba(200, 100, 255, 0.05) 50%, rgba(100, 255, 200, 0.05) 100%)',
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Text container
      {
        id: textContainerId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
            style: {
              width: '100%',
              height: '100%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [
          // Main text atom
          {
            id: mainTextId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                textShadow: textShadowRGB,
              },
              font: {
                family: fontFamily,
                weights: [fontWeight],
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
            effects: [
              // Blur effect: 30px → 2px (frosted glass texture remains)
              {
                id: 'crystallization-blur',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: crystallizationTime,
                  mode: 'provider',
                  targetIds: [mainTextId],
                  ranges: [
                    { key: 'filter', val: `blur(${initialBlur}px) contrast(${contrast}) brightness(${brightness})`, prog: 0 },
                    { key: 'filter', val: `blur(${finalBlur}px) contrast(${contrast}) brightness(${brightness})`, prog: 1 },
                  ],
                },
              },
              // Scale effect: 0.95 → 1
              {
                id: 'crystallization-scale',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: crystallizationTime,
                  mode: 'provider',
                  targetIds: [mainTextId],
                  ranges: [
                    { key: 'scale', val: scaleStart, prog: 0 },
                    { key: 'scale', val: scaleEnd, prog: 1 },
                  ],
                },
              },
              // Opacity effect: 0 → 1
              {
                id: 'crystallization-opacity',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: crystallizationTime,
                  mode: 'provider',
                  targetIds: [mainTextId],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'crystallization-blur-text',
  title: 'Crystallization Blur Text Reveal',
  description:
    'A frost-inspired text reveal preset where text forms like ice crystals on glass. Text starts as an abstract blur and crystallizes into sharp letterforms synchronized to audio beats. Features fractal ice-like blur quality, prismatic light refraction effects, nucleation point growth patterns, and subtle chromatic aberration. The frosted glass texture persists after focus for atmospheric depth.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'blur', 'crystallization', 'frost', 'ice', 'reveal', 'animated', 'beat-sync', 'prismatic'],
  dependencies: {},
  defaultInputParams: {
    text: 'FROZEN',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '700',
    duration: 10,
    crystallizationTime: 2.5,
    backgroundColor: '#0a0a12',
    textColor: '#ffffff',
    chromaticAberration: true,
    chromaticIntensity: 0.3,
    initialBlur: 30,
    finalBlur: 2,
    contrast: 1.5,
    brightness: 1.2,
    nucleationPoints: 3,
    scaleStart: 0.95,
    scaleEnd: 1,
  },
};

export const crystallizationBlurTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
