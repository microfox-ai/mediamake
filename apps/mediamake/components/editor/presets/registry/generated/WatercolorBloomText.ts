/**
 * Watercolor Bloom Text Effect Preset
 *
 * This preset creates a delicate watercolor bloom effect where text emerges like flowers opening
 * in time-lapse. Each letter starts as a tiny seed point and expands outward with organic,
 * irregular growth patterns. The watercolor fill spreads from the center of each character,
 * creating beautiful color bleeding at the edges.
 *
 * Features:
 * - **Organic Growth Animation**: Scale from 0→1.1→1 with elastic easing for natural bloom effect
 * - **Watercolor Visual Effects**: Radial gradient backgrounds, SVG filters for blur and texture
 * - **Gentle Swaying Motion**: Continuous rotation animation simulating breeze
 * - **Pastel Color Shifts**: Hue-rotate animation cycling through pastel hues
 * - **Drip Effects**: Occasional translateY animations creating color run-down effect
 * - **Staggered Timing**: Each letter blooms at its own pace with 100ms delay per character
 * - **Poetic Natural Feel**: Each word blooms independently with organic timing
 *
 * Use cases:
 * - Creating poetic text animations for artistic content
 * - Building nature-themed title sequences
 * - Creating delicate, organic text reveals
 * - Adding watercolor aesthetic to text overlays
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

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Start time relative to caption timeline'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Start time relative to caption'),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),

  pastelColors: z
    .array(z.string())
    .optional()
    .default([
      '#FFB3C1',
      '#C7CEEA',
      '#B5EAD7',
      '#FFDAC1',
      '#E2C2FF',
      '#FFC8DD',
    ])
    .describe('Array of pastel colors for text watercolor effect'),

  bloomDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.8)
    .describe('Duration of bloom animation per letter in seconds'),

  swayDuration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Duration of one complete sway cycle in seconds'),

  colorShiftDuration: z
    .number()
    .min(2)
    .max(20)
    .default(6)
    .describe('Duration of color shift cycle in seconds'),

  letterDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each letter bloom in seconds'),

  dripChance: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability (0-1) that a word will have a drip effect'),

  bloomIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for bloom effect (affects scale overshoot)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    pastelColors,
    bloomDuration,
    swayDuration,
    colorShiftDuration,
    letterDelay,
    dripChance,
    bloomIntensity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Create bloom effect for a letter
  const createBloomEffect = (
    targetId: string,
    effectStart: number,
    effectId: string,
  ): RenderableComponentData => {
    const scaleOvershoot = 1 + 0.1 * bloomIntensity;

    const effectData: GenericEffectData = {
      type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any, // Elastic easing
      start: effectStart,
      duration: bloomDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Scale animation: 0 → overshoot → 1
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: scaleOvershoot, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
        // Opacity animation: 0 → 1
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Helper: Create sway effect for a letter
  const createSwayEffect = (
    targetId: string,
    effectStart: number,
    effectId: string,
    reverse: boolean = false,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: swayDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: reverse
        ? [
            { key: 'rotate', val: 2, prog: 0 },
            { key: 'rotate', val: -2, prog: 0.5 },
            { key: 'rotate', val: 2, prog: 1 },
          ]
        : [
            { key: 'rotate', val: -2, prog: 0 },
            { key: 'rotate', val: 2, prog: 0.5 },
            { key: 'rotate', val: -2, prog: 1 },
          ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Helper: Create color shift effect
  const createColorShiftEffect = (
    targetId: string,
    effectStart: number,
    effectId: string,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: colorShiftDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'hue-rotate(30deg)', prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Helper: Create drip effect
  const createDripEffect = (
    targetId: string,
    effectStart: number,
    effectId: string,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: effectStart,
      duration: 2,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateY', val: -10, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8, prog: 0.3 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  // Build caption components
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];

    // Create word containers
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const letters = word.text.split('');

      // Create letter components
      const letterComponents: RenderableComponentData[] = [];
      const letterEffects: RenderableComponentData[] = [];

      letters.forEach((letter, letterIndex) => {
        const letterId = `letter-${captionIndex}-${wordIndex}-${letterIndex}`;
        const colorIndex = (captionIndex + wordIndex + letterIndex) % pastelColors.length;
        const letterColor = pastelColors[colorIndex];

        // Letter timing: start relative to word start
        const letterStartTime = word.start + letterIndex * letterDelay;

        // Create letter TextAtom
        letterComponents.push({
          id: letterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: `${fontSize}px`,
              color: letterColor,
              textShadow: `0 4px 12px ${letterColor}40`,
              filter: 'url(#watercolor-blur)',
              transformOrigin: 'center center',
              ...fontStyle,
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
              start: 0, // All letters start together (layout maintained)
              duration: caption.duration,
            },
          },
        } as RenderableComponentData);

        // Create bloom effect for letter
        letterEffects.push(
          createBloomEffect(
            letterId,
            letterStartTime,
            `bloom-${captionIndex}-${wordIndex}-${letterIndex}`,
          ),
        );

        // Create sway effect for letter
        letterEffects.push(
          createSwayEffect(
            letterId,
            letterStartTime,
            `sway-${captionIndex}-${wordIndex}-${letterIndex}`,
            letterIndex % 2 === 0, // Alternate sway direction
          ),
        );

        // Create color shift effect
        letterEffects.push(
          createColorShiftEffect(
            letterId,
            letterStartTime,
            `color-${captionIndex}-${wordIndex}-${letterIndex}`,
          ),
        );
      });

      // Word container
      const wordContainer: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex',
            style: {
              marginRight: '0.3em',
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        childrenData: letterComponents,
        effects: letterEffects,
      } as RenderableComponentData;

      wordComponents.push(wordContainer);

      // Add drip effect with probability
      if (Math.random() < dripChance) {
        const dripId = `drip-${captionIndex}-${wordIndex}`;
        const dripColor = pastelColors[wordIndex % pastelColors.length];

        const dripElement: RenderableComponentData = {
          id: dripId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position:absolute;bottom:-20px;left:50%;width:2px;height:20px;background:linear-gradient(to bottom, ${dripColor}99, transparent);transform:translateX(-50%)"></div>`,
          },
          context: {
            timing: {
              start: word.start + 1.5, // Drip starts 1.5s after word
              duration: Math.max(0, word.duration - 1.5),
            },
          },
          effects: [
            createDripEffect(
              dripId,
              0,
              `drip-effect-${captionIndex}-${wordIndex}`,
            ),
          ],
        } as RenderableComponentData;

        wordComponents.push(dripElement);
      }
    });

    // Caption container
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 flex flex-wrap justify-center items-center gap-4',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;

    captionComponents.push(captionContainer);
  });

  // SVG filters for watercolor effect
  const svgFilters: RenderableComponentData = {
    id: 'watercolor-svg-filters',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg style="position:absolute;width:0;height:0;pointer-events:none"><defs><filter id="watercolor-blur"><feGaussianBlur in="SourceGraphic" stdDeviation="2"/><feColorMatrix type="saturate" values="1.2"/></filter><filter id="watercolor-texture"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="2"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter></defs></svg>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as any,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 30, // Available for entire composition
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-bloom-root',
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
        duration: 30, // Adjust based on caption data
      },
    },
    childrenData: [svgFilters, ...captionComponents],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'WatercolorBloomText',
  title: 'Watercolor Bloom Text Effect',
  description:
    'Delicate watercolor bloom effect where text emerges like flowers opening in time-lapse. Each letter starts as a tiny seed point and expands outward with organic growth patterns. Features watercolor fill spreading from character centers, color bleeding at edges, gentle swaying motion, pastel color shifts, and occasional drip effects. Animation feels poetic and natural with each word blooming at its own pace.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'watercolor',
    'bloom',
    'organic',
    'floral',
    'pastel',
    'artistic',
    'poetic',
    'nature',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Bloom',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Bloom',
            start: 0,
            absoluteStart: 0,
            end: 3,
            absoluteEnd: 3,
            duration: 3,
          },
        ],
      },
    ],
    font: 'Inter:600',
    fontSize: 72,
    pastelColors: [
      '#FFB3C1',
      '#C7CEEA',
      '#B5EAD7',
      '#FFDAC1',
      '#E2C2FF',
      '#FFC8DD',
    ],
    bloomDuration: 1.8,
    swayDuration: 4,
    colorShiftDuration: 6,
    letterDelay: 0.1,
    dripChance: 0.3,
    bloomIntensity: 1,
  },
};

// --- Export Preset ---

export const WatercolorBloomTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
