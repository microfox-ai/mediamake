/**
 * Split Parts Cascade Subtitles Preset
 *
 * This preset creates cascading subtitle animations using caption metadata.splitParts to render
 * multiple lines of text with staggered entry animations. Each part enters with a configurable
 * delay, creating a waterfall effect perfect for multi-line captions.
 *
 * Features:
 * - **Split Parts Support**: Uses `caption.metadata.splitParts` array to break captions into multiple lines
 * - **Staggered Entry**: Each part enters with a configurable delay (cascadeDelayMs)
 * - **Multiple Animation Styles**: fadeInUp, slideInLeft, slideInRight, scaleIn
 * - **Flexible Positioning**: Configurable vertical (top/middle/bottom) and horizontal alignment
 * - **Fallback Rendering**: If splitParts is not present, renders caption as single line
 * - **Impact Control**: Per-caption impact multiplier via metadata or global parameter
 * - **Customizable Styling**: Font family, size, weight, colors, drop shadows
 *
 * Use Cases:
 * - Multi-line poetry or lyrics with dramatic reveals
 * - Quote displays with author attribution cascading in
 * - Step-by-step instructions appearing sequentially
 * - Dialogue with multiple speakers cascading
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(z.any()),
        metadata: z
          .object({
            splitParts: z.array(z.string()).optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with metadata.splitParts for multi-line rendering'),

  cascadeDelayMs: z
    .number()
    .default(150)
    .describe('Delay in milliseconds between each part entry (default: 150ms)'),

  animationStyle: z
    .enum(['fadeInUp', 'slideInLeft', 'slideInRight', 'scaleIn'])
    .default('fadeInUp')
    .describe('Animation style for part entry'),

  verticalPosition: z
    .enum(['top', 'middle', 'bottom'])
    .default('bottom')
    .describe('Vertical position on screen'),

  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal text alignment'),

  fontSize: z.number().default(48).describe('Font size in pixels'),

  fontFamily: z.string().default('Inter').describe('Font family name'),

  fontWeight: z
    .enum(['normal', 'bold', 'semibold', 'extrabold'])
    .default('bold')
    .describe('Font weight'),

  textColor: z.string().default('#FFFFFF').describe('Text color (hex)'),

  dropShadow: z.boolean().default(true).describe('Enable drop shadow effect'),

  defaultImpact: z
    .number()
    .default(1.0)
    .describe('Default impact multiplier for animation intensity (0.1 - 3.0)'),

  containerPadding: z
    .number()
    .default(32)
    .describe('Horizontal padding for the container in pixels'),

  lineGap: z
    .number()
    .default(8)
    .describe('Gap between lines in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    cascadeDelayMs,
    animationStyle,
    verticalPosition,
    horizontalAlign,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    dropShadow,
    defaultImpact,
    containerPadding,
    lineGap,
  } = params;

  // Helper function to get vertical position class
  const getVerticalClass = (position: string) => {
    switch (position) {
      case 'top':
        return 'items-start pt-16';
      case 'middle':
        return 'items-center';
      case 'bottom':
      default:
        return 'items-end pb-16';
    }
  };

  // Helper function to get horizontal alignment class
  const getHorizontalClass = (align: string) => {
    switch (align) {
      case 'left':
        return 'justify-start text-left';
      case 'right':
        return 'justify-end text-right';
      case 'center':
      default:
        return 'justify-center text-center';
    }
  };

  // Helper function to create animation effect for a part
  const createPartEffect = (
    partIndex: number,
    partId: string,
    caption: any,
    cascadeDelay: number,
  ) => {
    // Get impact from caption metadata or use default
    const impact = caption.metadata?.impact ?? defaultImpact;

    // Base animation duration (fast for cascade effect)
    const baseDuration = 0.4;
    const effectDuration = baseDuration * impact;

    // Calculate start time with cascade delay
    const effectStart = (partIndex * cascadeDelay) / 1000; // Convert ms to seconds

    // Create ranges based on animation style
    let ranges: any[] = [];

    switch (animationStyle) {
      case 'fadeInUp':
        ranges = [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateY', val: 20, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ];
        break;
      case 'slideInLeft':
        ranges = [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateX', val: -50, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ];
        break;
      case 'slideInRight':
        ranges = [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateX', val: 50, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ];
        break;
      case 'scaleIn':
        ranges = [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ];
        break;
    }

    return {
      id: `effect-${partId}`,
      componentId: partId,
      data: {
        type: 'ease-out',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [partId],
        ranges,
      },
    };
  };

  // Process each caption
  const captionContainers = captions.map((caption) => {
    const splitParts = caption.metadata?.splitParts;

    // If splitParts exists, create multiple text lines
    if (splitParts && splitParts.length > 0) {
      const partComponents = splitParts.map((partText, partIndex) => {
        const partId = `${caption.id}-part-${partIndex}`;

        // Create effect for this part
        const partEffect = createPartEffect(
          partIndex,
          partId,
          caption,
          cascadeDelayMs,
        );

        return {
          id: partId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: partText,
            style: {
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily,
              fontWeight: fontWeight,
              color: textColor,
            },
            className: dropShadow ? 'drop-shadow-lg' : '',
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [partEffect],
        };
      });

      // Create container for parts
      return {
        id: `${caption.id}-cascade-container`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex ${getVerticalClass(verticalPosition)} ${getHorizontalClass(horizontalAlign)} pointer-events-none`,
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: `${caption.id}-parts-wrapper`,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-col',
                style: {
                  gap: `${lineGap}px`,
                  paddingLeft: `${containerPadding}px`,
                  paddingRight: `${containerPadding}px`,
                },
              },
            },
            childrenData: partComponents,
          },
        ],
      };
    } else {
      // Fallback: render as single line
      const textId = `${caption.id}-text`;
      const textEffect = createPartEffect(0, textId, caption, 0);

      return {
        id: `${caption.id}-container`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex ${getVerticalClass(verticalPosition)} ${getHorizontalClass(horizontalAlign)} pointer-events-none`,
            style: {
              paddingLeft: `${containerPadding}px`,
              paddingRight: `${containerPadding}px`,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: textId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: caption.text,
              style: {
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                fontWeight: fontWeight,
                color: textColor,
              },
              className: dropShadow ? 'drop-shadow-lg' : '',
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [textEffect],
          },
        ],
      };
    }
  });

  return {
    output: {
      childrenData: captionContainers as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'splitPartsCascadeSubtitles',
  title: 'Split Parts Cascade Subtitles',
  description:
    'Uses metadata.splitParts to cascade multiple lines of a caption with staggered entry animations. Each part enters with a configurable delay, creating a waterfall effect perfect for multi-line captions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['subtitles', 'cascade', 'animation', 'multi-line', 'splitParts', 'staggered', 'waterfall'],
  defaultInputParams: {
    captions: [],
    cascadeDelayMs: 150,
    animationStyle: 'fadeInUp',
    verticalPosition: 'bottom',
    horizontalAlign: 'center',
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    dropShadow: true,
    defaultImpact: 1.0,
    containerPadding: 32,
    lineGap: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const splitPartsCascadeSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
