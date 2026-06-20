/**
 * Storytelling Pop-Up Book Pages Preset
 *
 * This preset creates a storytelling experience where text rotates in like pages of a pop-up book unfolding.
 * Each text element rotates from a folded position (rotateY: -90deg) with transform-origin set to the left edge,
 * creating an authentic page-flip effect. The rotation eases out dramatically in the last 20% of the animation,
 * simulating paper settling.
 *
 * Features:
 * - **Page-Flip Animation**: Each sentence rotates from rotateY: -90deg to 0deg with transform-origin on left edge
 * - **Dramatic Settle Effect**: Custom easing curve [0.68, -0.55, 0.265, 1.55] for spring-like settling
 * - **Opacity Tied to Rotation**: Transparent when perpendicular, fully opaque when flat (conditional keyframes)
 * - **Growing Drop Shadow**: Shadow grows from none to 4px 4px 8px rgba(0,0,0,0.3) as page "lifts"
 * - **Paper Texture Overlay**: Optional paper texture with sepia tint for authentic storybook feeling
 * - **Continuous Reading Flow**: 300ms overlap between pages for seamless reading experience
 * - **3D Preserve**: Uses transformStyle: 'preserve-3d' for proper 3D effect
 *
 * Use cases:
 * - Creating storytelling animations with book-like transitions
 * - Building narrative video content with page-turning effects
 * - Adding storybook aesthetics to captions
 * - Creating educational content with chapter-based pages
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        end: z.number().describe('Relative end time'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        duration: z.number().describe('Duration of the sentence'),
        words: z.array(z.any()).optional(),
      }),
    )
    .describe('Array of caption sentences to display as book pages'),

  // Typography
  font: z
    .string()
    .optional()
    .default('Georgia')
    .describe(
      'Font family with optional weight and style (e.g., "Georgia:400", "Crimson Text:600:italic")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#4a3728')
    .describe('Text color (dark brown for storybook feel)'),
  textAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),
  lineHeight: z
    .number()
    .min(1)
    .max(3)
    .default(1.6)
    .describe('Line height multiplier'),
  maxWidth: z
    .string()
    .default('80%')
    .describe('Maximum width of text content'),

  // Background
  backgroundColor: z
    .string()
    .default('#fef3e2')
    .describe('Background color (amber-50 equivalent)'),
  sepiaTint: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Sepia filter intensity (0-1)'),

  // Paper texture
  paperTexture: z
    .object({
      enabled: z.boolean().default(true).describe('Enable paper texture overlay'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.15)
        .describe('Paper texture opacity'),
      blendMode: z
        .enum([
          'normal',
          'multiply',
          'screen',
          'overlay',
          'darken',
          'lighten',
          'color-dodge',
          'color-burn',
          'hard-light',
          'soft-light',
        ])
        .default('multiply')
        .describe('Blend mode for paper texture'),
    })
    .optional()
    .default({ enabled: true, opacity: 0.15, blendMode: 'multiply' })
    .describe('Paper texture overlay configuration'),

  // Animation
  pageDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.4)
    .describe('Duration of page flip animation in seconds'),
  pageOverlap: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Overlap between pages in seconds for continuous flow'),

  // Timing
  trackName: z
    .string()
    .default('popup-book-track')
    .describe('Name of the track (used for IDs)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Georgia';
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
  }

  // Calculate total duration
  const firstSentence = captions[0];
  const lastSentence = captions[captions.length - 1];
  const totalDuration =
    lastSentence.absoluteStart +
    lastSentence.duration +
    params.pageOverlap -
    firstSentence.absoluteStart;

  // Create page components for each sentence
  const pageComponents: RenderableComponentData[] = captions.map(
    (sentence, index) => {
      const pageContainerId = `${params.trackName}-page-${index}`;
      const pageTextId = `${params.trackName}-text-${index}`;

      // Calculate relative start (relative to pages-container)
      const relativeStart = sentence.absoluteStart - firstSentence.absoluteStart;
      const pageDuration = sentence.duration + params.pageOverlap;

      // Create rotation effect (rotateY from -90 to 0 with custom easing)
      const rotationEffect = {
        id: `${pageContainerId}-rotation-effect`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier' as any, // Custom easing
          customEasing: [0.68, -0.55, 0.265, 1.55], // Dramatic settle easing
          start: 0,
          duration: params.pageDuration,
          mode: 'provider' as const,
          targetIds: [pageContainerId],
          ranges: [
            { key: 'rotateY', val: -90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Create opacity effect (tied to rotation angle)
      const opacityEffect = {
        id: `${pageContainerId}-opacity-effect`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: params.pageDuration,
          mode: 'provider' as const,
          targetIds: [pageContainerId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 }, // Transparent when perpendicular
            { key: 'opacity', val: 0.2, prog: 0.3 }, // Becoming visible
            { key: 'opacity', val: 0.6, prog: 0.5 }, // Half visible
            { key: 'opacity', val: 1, prog: 1 }, // Fully opaque when flat
          ],
        } as GenericEffectData,
      };

      // Create drop shadow effect (grows as page lifts)
      const shadowEffect = {
        id: `${pageContainerId}-shadow-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: params.pageDuration,
          mode: 'provider' as const,
          targetIds: [pageContainerId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0px rgba(0,0,0,0))',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.3))',
              prog: 1,
            },
          ],
        } as GenericEffectData,
      };

      // Create page container with text
      return {
        id: pageContainerId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              transformOrigin: 'left center',
              transformStyle: 'preserve-3d' as any,
            },
          },
        },
        context: {
          timing: {
            start: relativeStart,
            duration: pageDuration,
          },
        },
        effects: [rotationEffect, opacityEffect, shadowEffect],
        childrenData: [
          {
            id: pageTextId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: sentence.text,
              style: {
                fontSize: params.fontSize,
                fontFamily: fontFamily,
                ...fontStyle,
                color: params.textColor,
                textAlign: params.textAlign,
                maxWidth: params.maxWidth,
                lineHeight: params.lineHeight,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: pageDuration,
              },
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create paper texture overlay (if enabled)
  const paperTextureComponent: RenderableComponentData | null =
    params.paperTexture?.enabled
      ? ({
          id: `${params.trackName}-paper-texture`,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background: url('data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;200&quot; height=&quot;200&quot;><filter id=&quot;noise&quot;><feTurbulence type=&quot;fractalNoise&quot; baseFrequency=&quot;0.9&quot; numOctaves=&quot;4&quot; /></filter><rect width=&quot;100%&quot; height=&quot;100%&quot; filter=&quot;url(%23noise)&quot; opacity=&quot;0.05&quot; /></svg>'); pointer-events: none;"></div>`,
            style: {
              position: 'absolute' as const,
              inset: 0,
              opacity: params.paperTexture.opacity,
              mixBlendMode: params.paperTexture.blendMode,
              pointerEvents: 'none' as const,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData)
      : null;

  // Create pages container with sepia filter
  const pagesContainer: RenderableComponentData = {
    id: `${params.trackName}-pages-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          filter: `sepia(${params.sepiaTint})`,
        },
      },
    },
    context: {
      timing: {
        start: firstSentence.absoluteStart,
        duration: totalDuration,
      },
    },
    childrenData: pageComponents as RenderableComponentData[],
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full p-12',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration + firstSentence.absoluteStart,
      },
    },
    childrenData: [
      paperTextureComponent,
      pagesContainer,
    ].filter(Boolean) as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'storytelling-popup-book',
  title: 'Storytelling Pop-Up Book Pages',
  description:
    'A storytelling preset where text rotates in like pages of a pop-up book unfolding. Each text element rotates from folded (rotateY: -90deg) to flat (rotateY: 0deg) with transform-origin on the left edge, creating an authentic page-flip effect. Features dramatic ease-out in the last 20% using custom easing curve [0.68, -0.55, 0.265, 1.55], simulating paper settling. Includes growing drop-shadow as pages "lift" off background, and opacity tied to rotation angle (transparent when perpendicular, opaque when flat). Adds paper texture overlay and sepia tint for storybook authenticity. Each sentence in captions is treated as a separate book page with 300ms overlap for continuous reading flow.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'storytelling',
    'popup-book',
    'page-flip',
    'captions',
    '3d',
    'paper',
    'storybook',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'sentence-1',
        text: 'Once upon a time, in a land far away...',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [],
      },
      {
        id: 'sentence-2',
        text: 'There lived a brave storyteller.',
        start: 0,
        absoluteStart: 3,
        end: 5.5,
        absoluteEnd: 8.5,
        duration: 5.5,
        words: [],
      },
      {
        id: 'sentence-3',
        text: 'Who brought tales to life with every word.',
        start: 0,
        absoluteStart: 8.5,
        end: 13,
        absoluteEnd: 21.5,
        duration: 4.5,
        words: [],
      },
    ],
    font: 'Georgia:400',
    fontSize: 48,
    textColor: '#4a3728',
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: '80%',
    backgroundColor: '#fef3e2',
    sepiaTint: 0.2,
    paperTexture: {
      enabled: true,
      opacity: 0.15,
      blendMode: 'multiply',
    },
    pageDuration: 1.4,
    pageOverlap: 0.3,
    trackName: 'popup-book-track',
  },
};

// Export preset
export const storytellingPopupBookPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
