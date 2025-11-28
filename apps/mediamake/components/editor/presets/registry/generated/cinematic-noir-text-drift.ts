/**
 * Cinematic Noir Text Drift Effect Preset
 *
 * Film noir-inspired text drift effect where words emerge from darkness and float
 * downward like smoke wisps with variable font weights, film grain overlay,
 * chromatic aberration, and hypnotic slow-motion drift animations.
 *
 * Features:
 * - **Variable Font Weights**: First letters heavier, trailing letters lighter for gradient effect
 * - **Film Grain Texture**: Authentic grain overlay using CSS noise pattern
 * - **Chromatic Aberration**: RGB split text shadow for vintage film look
 * - **Hypnotic Drift**: Primary downward drift (0 to 80vh over 10s)
 * - **Micro-Movements**: Subtle horizontal sine wave drift (2px amplitude, 3s period)
 * - **Rotation**: Gentle rotation oscillation (-1deg to 1deg, 5s period)
 * - **Blend Modes**: Difference/exclusion blend mode for noir aesthetic
 * - **Film Filters**: Contrast, brightness, and blur for authentic film look
 * - **Gradient Overlay**: From transparent via black/50 to black
 *
 * Use cases:
 * - Film noir title cards
 * - Atmospheric dramatic intros
 * - Mystery/thriller content titles
 * - Vintage film-style captions
 * - Moody text overlays
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
        start: z.number().describe('Relative start time'),
        absoluteStart: z
          .number()
          .describe('Absolute start in caption timeline'),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start within caption'),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Roboto:400:italic")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (before blend mode)'),

  blendMode: z
    .enum(['difference', 'exclusion', 'screen', 'overlay', 'soft-light'])
    .default('difference')
    .describe('Blend mode for noir aesthetic'),

  grainOpacity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.08)
    .describe('Film grain overlay opacity'),

  chromaticAberrationIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Chromatic aberration intensity multiplier'),

  driftDuration: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Duration of primary downward drift in seconds'),

  microDriftPeriod: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Period of micro horizontal drift in seconds'),

  rotationPeriod: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Period of rotation oscillation in seconds'),

  impact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global impact multiplier for all effects'),

  startingYPosition: z
    .number()
    .min(-50)
    .max(50)
    .default(10)
    .describe('Starting Y position as percentage of viewport height'),

  endingYPosition: z
    .number()
    .min(50)
    .max(150)
    .default(90)
    .describe('Ending Y position as percentage of viewport height'),
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
    textColor,
    blendMode,
    grainOpacity,
    chromaticAberrationIntensity,
    driftDuration,
    microDriftPeriod,
    rotationPeriod,
    impact,
    startingYPosition,
    endingYPosition,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate chromatic aberration shadow
  const aberrationOffset = 1 * chromaticAberrationIntensity;
  const chromaticShadow = `${aberrationOffset}px ${aberrationOffset}px 0 rgba(255,0,0,0.3), -${aberrationOffset}px -${aberrationOffset}px 0 rgba(0,0,255,0.3)`;

  // Create word containers with effects
  const wordContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `noir-word-${captionIndex}-${wordIndex}`;
      const wordContainerId = `noir-word-container-${captionIndex}-${wordIndex}`;

      // Variable font weight: start heavy (600), fade to light (300) over duration
      const baseWeight = fontStyle.fontWeight || 400;
      const heavyWeight = Math.min(baseWeight + 200, 700);
      const lightWeight = Math.max(baseWeight - 100, 300);

      // Create word text atom with variable weight effect
      const wordAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            mixBlendMode: blendMode,
            filter: 'contrast(1.1) brightness(0.95) blur(0.3px)',
            textShadow: chromaticShadow,
            letterSpacing: '0.05em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: [lightWeight.toString(), heavyWeight.toString()],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: driftDuration * impact,
          },
        },
      } as RenderableComponentData;

      // Variable weight effect (heavier start, lighter end)
      const weightEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: 2 * impact,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'fontWeight', val: heavyWeight, prog: 0 },
          { key: 'fontWeight', val: lightWeight, prog: 1 },
        ],
      };

      // Primary drift effect (translateY: 0 to 80vh over duration)
      const primaryDriftEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: driftDuration * impact,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: `${endingYPosition - startingYPosition}vh`, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 0.85 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      // Micro-drift effect (sine wave horizontal movement)
      const microDriftEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: microDriftPeriod * impact,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [
          { key: 'translateX', val: -2, prog: 0 },
          { key: 'translateX', val: 2, prog: 0.5 },
          { key: 'translateX', val: -2, prog: 1 },
        ],
      };

      // Rotation effect (-1deg to 1deg oscillation)
      const rotationEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: rotationPeriod * impact,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [
          { key: 'rotate', val: -1, prog: 0 },
          { key: 'rotate', val: 1, prog: 0.5 },
          { key: 'rotate', val: -1, prog: 1 },
        ],
      };

      // Word container with all effects
      const wordContainer: RenderableComponentData = {
        id: wordContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: '50%',
              top: `${startingYPosition}vh`,
              transform: 'translateX(-50%)',
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: driftDuration * impact,
          },
        },
        effects: [
          {
            id: `${wordContainerId}-weight`,
            componentId: 'generic',
            data: weightEffect,
          },
          {
            id: `${wordContainerId}-drift`,
            componentId: 'generic',
            data: primaryDriftEffect,
          },
          {
            id: `${wordContainerId}-micro`,
            componentId: 'generic',
            data: microDriftEffect,
          },
          {
            id: `${wordContainerId}-rotation`,
            componentId: 'generic',
            data: rotationEffect,
          },
        ],
        childrenData: [wordAtom],
      } as RenderableComponentData;

      wordContainers.push(wordContainer);
    });
  });

  // Gradient overlay (absolute positioned div)
  const gradientOverlay: RenderableComponentData = {
    id: 'noir-gradient-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black pointer-events-none"></div>',
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'BaseScene',
      },
    },
  } as RenderableComponentData;

  // Film grain overlay (using HTMLBlockAtom with CSS noise pattern)
  const grainOverlay: RenderableComponentData = {
    id: 'noir-grain-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 pointer-events-none" style="opacity: ${grainOpacity}; mix-blend-mode: overlay; background-image: url('data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"200\\" height=\\"200\\"><filter id=\\"noise\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.9\\" numOctaves=\\"4\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23noise)\\"/></svg>'); background-size: 200px 200px;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'BaseScene',
      },
    },
  } as RenderableComponentData;

  // Word drift container (holds all words)
  const wordDriftContainer: RenderableComponentData = {
    id: 'noir-word-drift-container',
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
        fitDurationTo: 'BaseScene',
      },
    },
    childrenData: wordContainers,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'noir-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'bg-black w-full h-full relative overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'BaseScene',
      },
    },
    childrenData: [gradientOverlay, grainOverlay, wordDriftContainer],
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'cinematicNoirTextDrift',
  title: 'Cinematic Noir Text Drift Effect',
  description:
    'Film noir-inspired text drift effect where words emerge from darkness and float downward like smoke wisps with variable font weights, film grain overlay, chromatic aberration, and hypnotic slow-motion drift animations. Features atmospheric gradients, blend modes, and micro-movements for authentic cinematic atmosphere.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'cinematic',
    'noir',
    'drift',
    'film',
    'smoke',
    'atmospheric',
    'vintage',
    'gradient',
    'grain',
    'chromatic-aberration',
    'blend-mode',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Into the darkness',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Into',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'the',
            start: 0.5,
            absoluteStart: 0.5,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.3,
          },
          {
            id: 'word-3',
            text: 'darkness',
            start: 0.8,
            absoluteStart: 0.8,
            end: 2,
            absoluteEnd: 2,
            duration: 1.2,
          },
        ],
      },
    ],
    font: 'Inter:300',
    fontSize: 72,
    textColor: '#ffffff',
    blendMode: 'difference',
    grainOpacity: 0.08,
    chromaticAberrationIntensity: 1,
    driftDuration: 10,
    microDriftPeriod: 3,
    rotationPeriod: 5,
    impact: 1,
    startingYPosition: 10,
    endingYPosition: 90,
  },
};

// --- Export ---

export const cinematicNoirTextDriftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
