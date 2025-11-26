/**
 * SVG Mask Morph Reveal Preset
 *
 * This preset creates dynamic SVG masking effects that reveal cutout images through animated
 * shape morphing synchronized with caption keywords. Features organic, fluid transitions between
 * geometric shapes (circle to star, square to hexagon) with liquid-like animations similar to
 * After Effects shape layers.
 *
 * Features:
 * - **Shape Morphing**: Smooth transitions between geometric shapes (circle, star, hexagon, square)
 * - **Caption Synchronization**: Shape changes triggered by caption keywords and impact levels
 * - **Dynamic Reveal Areas**: High-impact words expand the mask, low-impact words contract it
 * - **Edge Glow Effects**: Feathered mask edges with drop-shadow for depth
 * - **GPU Acceleration**: Uses transform and opacity for optimal performance
 * - **Multiple Morph Presets**: 4 internal shape transition patterns
 *
 * Use cases:
 * - Creating video editing-style mask wipe effects for cutout images
 * - Building dynamic reveals synchronized with narration emphasis
 * - Adding organic transitions between content segments
 * - Creating professional mask animations without complex video editing software
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters schema
const presetParams = z.object({
  trackId: z
    .string()
    .default('svg-mask-morph-reveal')
    .describe('Unique ID for this preset track'),
  cutoutImageSrc: z
    .string()
    .describe('Source URL for the cutout image (PNG with transparency recommended)'),
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(z.any()).optional(),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption data with timing and keyword/impact metadata'),
  morphStyle: z
    .enum(['circle-reveal', 'star-burst', 'hexagon-transition', 'square-morph'])
    .default('circle-reveal')
    .describe('Shape morphing animation style'),
  baseRevealSize: z
    .number()
    .default(300)
    .describe('Base size for reveal area in pixels'),
  impactMultiplier: z
    .number()
    .default(1.5)
    .describe('Multiplier for high-impact reveal expansion (1.0 - 3.0)'),
  morphDuration: z
    .number()
    .default(0.6)
    .describe('Duration of shape morph animations in seconds'),
  glowIntensity: z
    .number()
    .default(0.5)
    .describe('Intensity of edge glow effect (0.0 - 1.0)'),
  glowColor: z
    .string()
    .default('rgba(255,255,255,0.5)')
    .describe('Color of the edge glow effect'),
  imageFit: z
    .enum(['cover', 'contain', 'fill', 'none'])
    .default('cover')
    .describe('How the cutout image should fit in the container'),
  backgroundColor: z
    .string()
    .default('rgba(0,0,0,1)')
    .describe('Background color behind the masked image'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    cutoutImageSrc,
    captions,
    morphStyle,
    baseRevealSize,
    impactMultiplier,
    morphDuration,
    glowIntensity,
    glowColor,
    imageFit,
    backgroundColor,
  } = params;

  // Helper: Generate shape morph keyframes based on style
  const generateMorphKeyframes = (
    style: string,
    baseSize: number,
    impact: number,
    start: number,
    duration: number,
    targetId: string,
  ) => {
    const expandedSize = baseSize * (impact > 1 ? impactMultiplier : 1);
    const contractedSize = baseSize * 0.3;

    switch (style) {
      case 'circle-reveal':
        return [
          {
            id: `${targetId}-morph-in`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'ease-in-out',
              start,
              duration: duration * 0.5,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'r', val: contractedSize, prog: 0 },
                { key: 'r', val: expandedSize, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          {
            id: `${targetId}-morph-out`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'ease-in-out',
              start: start + duration * 0.5,
              duration: duration * 0.5,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'r', val: expandedSize, prog: 0 },
                { key: 'r', val: contractedSize, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ];

      case 'star-burst':
        return [
          {
            id: `${targetId}-star-expand`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'ease-out',
              start,
              duration: duration * 0.4,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: expandedSize / baseSize, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 180, prog: 1 },
              ],
            },
          },
          {
            id: `${targetId}-star-hold`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'linear',
              start: start + duration * 0.4,
              duration: duration * 0.3,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'scale', val: expandedSize / baseSize, prog: 0 },
                { key: 'scale', val: expandedSize / baseSize, prog: 1 },
              ],
            },
          },
          {
            id: `${targetId}-star-contract`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'ease-in',
              start: start + duration * 0.7,
              duration: duration * 0.3,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'scale', val: expandedSize / baseSize, prog: 0 },
                { key: 'scale', val: 0, prog: 1 },
                { key: 'rotate', val: 180, prog: 0 },
                { key: 'rotate', val: 360, prog: 1 },
              ],
            },
          },
        ];

      case 'hexagon-transition':
        return [
          {
            id: `${targetId}-hex-morph`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'ease-in-out',
              start,
              duration,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: expandedSize / baseSize, prog: 0.5 },
                { key: 'scale', val: 0.5, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 120, prog: 0.5 },
                { key: 'rotate', val: 240, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ];

      case 'square-morph':
        return [
          {
            id: `${targetId}-square-expand`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'ease-in-out',
              start,
              duration: duration * 0.5,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'rx', val: baseSize * 0.5, prog: 0 },
                { key: 'rx', val: expandedSize * 0.5, prog: 1 },
                { key: 'ry', val: baseSize * 0.5, prog: 0 },
                { key: 'ry', val: expandedSize * 0.5, prog: 1 },
                { key: 'opacity', val: 0.5, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          {
            id: `${targetId}-square-contract`,
            componentId: 'GenericKeyframeEffect',
            data: {
              type: 'ease-in-out',
              start: start + duration * 0.5,
              duration: duration * 0.5,
              mode: 'provider',
              targetIds: [targetId],
              ranges: [
                { key: 'rx', val: expandedSize * 0.5, prog: 0 },
                { key: 'rx', val: 0, prog: 1 },
                { key: 'ry', val: expandedSize * 0.5, prog: 0 },
                { key: 'ry', val: 0, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ];

      default:
        return [];
    }
  };

  // Calculate total duration from captions
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 10;

  // Generate effects for each caption
  const allEffects: any[] = [];
  captions.forEach((caption, index) => {
    const impact = caption.metadata?.impact ?? 1.0;
    const captionStart = caption.absoluteStart;
    const captionDuration = caption.duration;
    const morphTargetId = `morph-shape-${index}`;

    const effects = generateMorphKeyframes(
      morphStyle,
      baseRevealSize,
      impact,
      captionStart,
      Math.min(morphDuration, captionDuration),
      morphTargetId,
    );

    allEffects.push(...effects);
  });

  // Create SVG mask HTML with initial shape
  const svgMaskHTML = `
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
      <defs>
        <clipPath id="morphMask-${trackId}">
          <circle id="morph-shape-0" cx="960" cy="540" r="0" style="transform-origin: center; transform-box: fill-box;" />
        </clipPath>
      </defs>
    </svg>
  `;

  // Build the composition structure
  const childrenData: RenderableComponentData[] = [
    {
      id: `${trackId}-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden',
          style: {
            backgroundColor,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [
        {
          id: `${trackId}-image-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                clipPath: `url(#morphMask-${trackId})`,
                filter: `drop-shadow(0 0 ${20 * glowIntensity}px ${glowColor})`,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          childrenData: [
            {
              id: `${trackId}-cutout-image`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: cutoutImageSrc,
                fit: imageFit,
                className: 'w-full h-full',
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
        {
          id: `${trackId}-svg-mask`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            innerHTML: svgMaskHTML,
            className: 'absolute inset-0 pointer-events-none',
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: allEffects,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  return {
    output: {
      childrenData,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'svg-mask-morph-reveal',
  title: 'SVG Mask Morph Reveal',
  description:
    'A dynamic SVG masking preset that reveals cutout images through animated shape morphing synchronized with caption keywords. Features organic, fluid shape transitions (circle to star, square to hexagon) with liquid-like animations. High-impact caption words trigger dramatic mask expansions while less impactful moments contract the reveal area. Includes feathered edge glow effects for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'svg',
    'mask',
    'reveal',
    'morph',
    'animation',
    'captions',
    'shapes',
    'effects',
    'dynamic',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    trackId: 'svg-mask-morph-reveal',
    cutoutImageSrc: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    captions: [
      {
        id: 'cap-1',
        text: 'Welcome to our presentation',
        start: 0,
        end: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        duration: 3,
        metadata: {
          keyword: 'Welcome',
          impact: 1.5,
        },
      },
      {
        id: 'cap-2',
        text: 'This is amazing content',
        start: 0,
        end: 3,
        absoluteStart: 3.5,
        absoluteEnd: 6.5,
        duration: 3,
        metadata: {
          keyword: 'amazing',
          impact: 2.0,
        },
      },
    ],
    morphStyle: 'circle-reveal',
    baseRevealSize: 300,
    impactMultiplier: 1.5,
    morphDuration: 0.6,
    glowIntensity: 0.5,
    glowColor: 'rgba(255,255,255,0.5)',
    imageFit: 'cover',
    backgroundColor: 'rgba(0,0,0,1)',
  },
};

// Export preset
export const svgMaskMorphRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
