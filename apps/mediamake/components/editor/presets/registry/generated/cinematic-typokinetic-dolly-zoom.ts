/**
 * Cinematic Typokinetic Dolly Zoom Preset
 *
 * This preset creates a cinematic typokinetic effect that scales words from 90% to 100%
 * while simulating a dolly zoom effect. Each word starts slightly below its final position
 * (translateY: 5px) and rises as it scales, creating a floating-up motion. A film-grain
 * texture overlay fades as text becomes fully visible, creating a cinematic, movie-title
 * feel perfect for dramatic captions or opening credits.
 *
 * Features:
 * - Dolly zoom effect combining scale (0.9 → 1.0), translateY (5 → 0), and translateZ (20 → 0)
 * - Film grain texture overlay that fades as text becomes visible
 * - Hardware-accelerated transforms with perspective CSS
 * - Slight random delays per word for organic feel
 * - Cubic-bezier easing for smooth, cinematic motion
 *
 * Use cases:
 * - Dramatic caption presentations
 * - Opening credits and movie titles
 * - Cinematic subtitle effects
 * - Professional video intros
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

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
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with words and timing information'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(16)
    .max(200)
    .optional()
    .default(48)
    .describe('Font size in pixels (responsive via clamp)'),

  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),

  animationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .optional()
    .default(0.8)
    .describe('Duration of the dolly zoom animation in seconds'),

  maxRandomDelay: z
    .number()
    .min(0)
    .max(0.3)
    .optional()
    .default(0.1)
    .describe('Maximum random delay per word for organic feel (seconds)'),

  grainOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.4)
    .describe('Initial opacity of film grain overlay'),

  perspective: z
    .number()
    .min(500)
    .max(2000)
    .optional()
    .default(1000)
    .describe('Perspective distance in pixels for 3D effect'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    animationDuration,
    maxRandomDelay,
    grainOpacity,
    perspective,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  const captionsChildrenData: RenderableComponentData[] = [];

  // Process each caption
  captions.forEach((caption) => {
    const captionId = `cinematic-caption-${caption.id}`;
    const wordsChildrenData: RenderableComponentData[] = [];

    // Process each word in caption
    caption.words.forEach((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;
      const randomDelay = Math.random() * maxRandomDelay;

      // Create dolly zoom effect for this word
      const dollyZoomEffect: GenericEffectData = {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
        start: word.start + randomDelay,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale animation (90% → 100%)
          { key: 'scale', val: 0.9, prog: 0 },
          { key: 'scale', val: 1.0, prog: 1 },
          // TranslateY animation (5px below → 0)
          { key: 'translateY', val: 5, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // TranslateZ for perspective depth (20 → 0)
          { key: 'translateZ', val: 20, prog: 0 },
          { key: 'translateZ', val: 0, prog: 1 },
          // Opacity fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          // Filter effects (grain simulation)
          {
            key: 'filter',
            val: 'contrast(1.1) brightness(0.95)',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'contrast(1) brightness(1)',
            prog: 1,
          },
        ],
      };

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'transform-gpu',
          style: {
            fontSize: `clamp(32px, 5vw, ${fontSize * 1.5}px)`,
            fontWeight: fontStyle.fontWeight || 700,
            color: textColor,
            textShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
            willChange: 'transform, filter',
            marginRight: '0.3em',
            ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
            display: 'swap',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-dolly-zoom`,
            componentId: 'generic',
            data: dollyZoomEffect,
          },
        ],
      };

      wordsChildrenData.push(wordComponent);
    });

    // Create grain overlay for this caption
    const grainOverlayId = `${captionId}-grain-overlay`;
    const grainOverlay: RenderableComponentData = {
      id: grainOverlayId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='position: absolute; inset: 0; pointer-events: none; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAABN0lEQVR4nO2YzQ6CMBCEh/d/RL0YEz34IiYm+iAmRtH5kk2aSCgttKXt7iSThJCF+dndUqGUUkoplRwAbgDuAJ4AVgBzACsAywGsAbwArACsl7kBmAFYAPgA+AL4BPgA8P73CWAO4A7gBuAKYArgAuAM4ATgCOAA4AxgD+AM4ATg+M8JwAHACcARwBnACcAJwBnAEcABwAnACcAZwAnAEcABwBHAGcARwAHACcAJwBnADsAewB7ADsAewAnAEcABwBHACcAJwAHACcAJwBnAHsAOwB7ADsAOwAnAEcARwAHAEcAJwBnADsAOwAnAEcARwAHA+X8nAAcARwAnAGcARwAHAEcAJwBnAHsAOwAnACcARwAHAEcAJwBnADsAewB7ADsAJwBHACcAZwA7ADsAOwAnAEcAZwBHAAcAewC7P6WUUkr1wBfvH2RjYwAAAABJRU5ErkJggg==); background-size: 200px 200px; opacity: ${grainOpacity}; mix-blend-mode: overlay;'></div>`,
        className: 'absolute inset-0 pointer-events-none',
      } as any,
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `${grainOverlayId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: animationDuration * 1.5,
            mode: 'provider',
            targetIds: [grainOverlayId],
            ranges: [
              { key: 'opacity', val: grainOpacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    // Create caption container with perspective
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'relative overflow-hidden h-screen flex items-center justify-center',
          style: {
            perspective: `${perspective}px`,
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
        grainOverlay,
        {
          id: `${captionId}-words-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-wrap items-center justify-center gap-4 px-8',
              style: {
                maxWidth: '90vw',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordsChildrenData,
        } as RenderableComponentData,
      ],
    };

    captionsChildrenData.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-typokinetic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          captions.length > 0
            ? captions[captions.length - 1].absoluteEnd
            : 10,
      },
    },
    childrenData: captionsChildrenData,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'cinematicTypokineticDollyZoom',
  title: 'Cinematic Typokinetic Dolly Zoom',
  description:
    'Cinematic typokinetic preset with dolly zoom effect combining scale (90%-100%), translateY (5px to 0), and translateZ (20px to 0) for floating-up motion. Features film grain texture overlay that fades as text becomes visible, perfect for dramatic captions or opening credits. Uses cubic-bezier easing with slight random delays for organic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'cinematic',
    'dolly-zoom',
    'typokinetic',
    'film-grain',
    'captions',
    'titles',
    'dramatic',
    'movie-credits',
    'perspective',
    '3d',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'THE BEGINNING',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            text: 'THE',
            start: 0,
            end: 1,
            duration: 1,
            absoluteStart: 0,
            absoluteEnd: 1,
          },
          {
            text: 'BEGINNING',
            start: 1,
            end: 3,
            duration: 2,
            absoluteStart: 1,
            absoluteEnd: 3,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    animationDuration: 0.8,
    maxRandomDelay: 0.1,
    grainOpacity: 0.4,
    perspective: 1000,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cinematicTypokineticDollyZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
