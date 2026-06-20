/**
 * VHS 80s Chrome Kinetic Text Preset
 *
 * Creates 80s arcade-style chrome text with VHS tracking effects, RGB separation slide-in,
 * continuous scan lines, subtle VHS wobble, and pulsing neon glow. Features metallic gradients
 * with specular highlights and word-level staggered entrance animations that build up from flat
 * text to full chrome over 0.3s per word.
 *
 * Features:
 * - **Full 80s Chrome Treatment**: Metallic gradients with specular highlights
 * - **VHS Tracking Effect**: Text slides in from right with RGB channel separation
 * - **Continuous Scan Lines**: Vertical scrolling scan line overlay
 * - **VHS Wobble**: Subtle sine wave Y-axis transformation
 * - **Neon Glow Pulse**: Breathing neon sign effect
 * - **Staggered Word Entrance**: Each word builds chrome effect over 0.3s
 *
 * Use cases:
 * - Creating 80s arcade-style title cards
 * - Building retro VHS-inspired text effects
 * - Adding nostalgic chrome text to videos
 * - Creating kinetic typography with vintage aesthetics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Orbitron')
    .describe(
      'Font family with optional weight and style (e.g., "Orbitron:900", "Orbitron")',
    ),
  chromeGradient: z
    .string()
    .default(
      'linear-gradient(135deg, #C0C0C0 0%, #808080 25%, #FFFFFF 50%, #808080 75%, #A0A0A0 100%)',
    )
    .describe('CSS gradient string for chrome effect'),
  neonColor: z
    .string()
    .default('#ff00ff')
    .describe('Neon glow color (hex format)'),
  shadowColor: z
    .string()
    .default('#404040')
    .describe('Shadow layer color (hex format)'),
  vhsWobbleAmplitude: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('VHS wobble amplitude in pixels'),
  scanLineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.03)
    .describe('Scan line opacity (0-1)'),
  rgbSeparationDistance: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('RGB channel separation distance in pixels'),
  wordStaggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between word entrances in seconds'),
  chromeBuildup: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Duration of chrome buildup effect per word in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    font,
    chromeGradient,
    neonColor,
    shadowColor,
    vhsWobbleAmplitude,
    scanLineOpacity,
    rgbSeparationDistance,
    wordStaggerDelay,
    chromeBuildup,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Orbitron';
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
  if (!fontStyle.fontWeight) {
    fontStyle.fontWeight = 900; // Default to 900 for chrome effect
  }

  // Create caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const captionId = `caption-${captionIndex}`;

      // Create word components with chrome layers
      const wordContainers: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;
          const relativeStart = word.start; // Relative to caption
          const wordDuration = word.duration;

          // Calculate staggered start time
          const staggeredStart = relativeStart + wordIndex * wordStaggerDelay;

          // Chrome layer IDs
          const shadowLayerId = `${wordId}-shadow`;
          const baseLayerId = `${wordId}-base`;
          const highlightLayerId = `${wordId}-highlight`;
          const specularLayerId = `${wordId}-specular`;

          // Shadow layer (darkest)
          const shadowLayer: RenderableComponentData = {
            id: shadowLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight,
                color: shadowColor,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                zIndex: 1,
                transform: 'translateZ(0)',
                willChange: 'transform, opacity',
                ...(fontStyle.fontStyle
                  ? { fontStyle: fontStyle.fontStyle }
                  : {}),
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '900'],
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData;

          // Base chrome layer (gradient)
          const baseLayer: RenderableComponentData = {
            id: baseLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              gradient: chromeGradient,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                zIndex: 2,
                transform: 'translateZ(0)',
                willChange: 'transform, opacity',
                ...(fontStyle.fontStyle
                  ? { fontStyle: fontStyle.fontStyle }
                  : {}),
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '900'],
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData;

          // Highlight layer (white glow)
          const highlightLayer: RenderableComponentData = {
            id: highlightLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight,
                color: 'transparent',
                textShadow:
                  '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.6)',
                zIndex: 3,
                transform: 'translateZ(0)',
                willChange: 'transform, opacity',
                ...(fontStyle.fontStyle
                  ? { fontStyle: fontStyle.fontStyle }
                  : {}),
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '900'],
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData;

          // Specular layer (neon glow)
          const specularLayer: RenderableComponentData = {
            id: specularLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight,
                color: 'transparent',
                textShadow: `0 0 10px ${neonColor}, 0 0 20px ${neonColor}, 0 0 30px ${neonColor}, 0 0 40px ${neonColor}`,
                zIndex: 4,
                transform: 'translateZ(0)',
                willChange: 'transform, opacity, filter',
                ...(fontStyle.fontStyle
                  ? { fontStyle: fontStyle.fontStyle }
                  : {}),
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '900'],
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData;

          // RGB separation effects for shadow layer
          const shadowRgbEffect: GenericEffectData = {
            type: 'ease-out',
            start: staggeredStart,
            duration: chromeBuildup,
            mode: 'provider',
            targetIds: [shadowLayerId],
            ranges: [
              {
                key: 'translateX',
                val: -rgbSeparationDistance,
                prog: 0,
              },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          };

          // RGB separation effects for base layer
          const baseRgbEffect: GenericEffectData = {
            type: 'ease-out',
            start: staggeredStart,
            duration: chromeBuildup,
            mode: 'provider',
            targetIds: [baseLayerId],
            ranges: [
              {
                key: 'translateX',
                val: -rgbSeparationDistance / 2,
                prog: 0,
              },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          };

          // Fade in for highlight layer
          const highlightEffect: GenericEffectData = {
            type: 'ease-out',
            start: staggeredStart,
            duration: chromeBuildup,
            mode: 'provider',
            targetIds: [highlightLayerId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          };

          // Chrome buildup effect (brightness)
          const chromeBuildupEffect: GenericEffectData = {
            type: 'ease-in-out',
            start: staggeredStart,
            duration: chromeBuildup,
            mode: 'provider',
            targetIds: [baseLayerId],
            ranges: [
              { key: 'filter:brightness', val: 0.5, prog: 0 },
              { key: 'filter:brightness', val: 1.2, prog: 1 },
            ],
          };

          // Neon glow pulse effect (starts after entrance)
          const neonPulseEffect: GenericEffectData = {
            type: 'ease-in-out',
            start: staggeredStart + chromeBuildup,
            duration: caption.duration - staggeredStart - chromeBuildup,
            mode: 'provider',
            targetIds: [specularLayerId],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          };

          // Word container with chrome layers
          const wordContainer: RenderableComponentData = {
            id: wordId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative inline-block',
                style: {
                  marginRight: '0.25em',
                  willChange: 'transform, opacity',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: [
              shadowLayer,
              baseLayer,
              highlightLayer,
              specularLayer,
            ],
            effects: [
              {
                id: `${wordId}-shadow-rgb`,
                componentId: 'generic',
                data: shadowRgbEffect,
              },
              {
                id: `${wordId}-base-rgb`,
                componentId: 'generic',
                data: baseRgbEffect,
              },
              {
                id: `${wordId}-highlight`,
                componentId: 'generic',
                data: highlightEffect,
              },
              {
                id: `${wordId}-chrome-buildup`,
                componentId: 'generic',
                data: chromeBuildupEffect,
              },
              {
                id: `${wordId}-neon-pulse`,
                componentId: 'generic',
                data: neonPulseEffect,
              },
            ],
          } as RenderableComponentData;

          return wordContainer;
        },
      );

      // Caption container (holds all words)
      const captionContainerId = `${captionId}-container`;
      const captionContainer: RenderableComponentData = {
        id: captionContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 flex items-center justify-center flex-wrap',
            style: {
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordContainers,
      } as RenderableComponentData;

      // VHS wobble effect on caption container
      const wobbleEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: caption.duration,
        mode: 'provider',
        targetIds: [captionContainerId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: vhsWobbleAmplitude, prog: 0.25 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: -vhsWobbleAmplitude, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      captionContainer.effects = [
        {
          id: `${captionId}-wobble`,
          componentId: 'generic',
          data: wobbleEffect,
        },
      ];

      return captionContainer;
    },
  );

  // Scan lines overlay
  const scanLinesId = 'scan-lines-overlay';
  const totalDuration =
    captions.length > 0
      ? captions[captions.length - 1].absoluteEnd
      : 10;

  const scanLines: RenderableComponentData = {
    id: scanLinesId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `repeating-linear-gradient(0deg, transparent 0px, rgba(255, 255, 255, ${scanLineOpacity}) 1px, transparent 2px)`,
          willChange: 'transform',
          zIndex: 1000,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  } as RenderableComponentData;

  // Scan lines scroll effect
  const scanLinesEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [scanLinesId],
    ranges: [
      { key: 'translateY', val: '0%', prog: 0 },
      { key: 'translateY', val: '100%', prog: 1 },
    ],
  };

  scanLines.effects = [
    {
      id: 'scan-lines-scroll',
      componentId: 'generic',
      data: scanLinesEffect,
    },
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vhs-chrome-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [scanLines, ...captionContainers],
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

const presetMetadata: PresetMetadata = {
  id: 'VHS80sChromeKineticText',
  title: 'VHS 80s Chrome Kinetic Text',
  description:
    '80s arcade-style chrome text with VHS tracking effects, RGB separation slide-in, continuous scan lines, subtle VHS wobble, and pulsing neon glow. Features metallic gradients with specular highlights and word-level staggered entrance animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'chrome',
    '80s',
    'retro',
    'vhs',
    'neon',
    'arcade',
    'rgb-separation',
    'scan-lines',
    'metallic',
    'gradient',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'RETRO VIBES',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'RETRO',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            id: 'word-2',
            text: 'VIBES',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
      },
    ],
    fontSize: 72,
    font: 'Orbitron:900',
    chromeGradient:
      'linear-gradient(135deg, #C0C0C0 0%, #808080 25%, #FFFFFF 50%, #808080 75%, #A0A0A0 100%)',
    neonColor: '#ff00ff',
    shadowColor: '#404040',
    vhsWobbleAmplitude: 2,
    scanLineOpacity: 0.03,
    rgbSeparationDistance: 20,
    wordStaggerDelay: 0.1,
    chromeBuildup: 0.3,
  },
};

export const VHS80sChromeKineticTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
