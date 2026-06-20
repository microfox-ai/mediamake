/**
 * Gradient Meditation Backdrop Preset
 *
 * This preset creates a minimalist, slow-burn gradient animation inspired by sunset timelapses.
 * It features extremely slow, calming transitions through warm colors (coral, orange, pink, purple)
 * mimicking a golden hour progression. Perfect for meditation apps or calming background visuals.
 *
 * Features:
 * - **Multiple Gradient Layers**: Overlapping gradient layers with staggered opacity crossfades
 * - **Slow Transitions**: Very long durations (10-15 seconds) for barely perceptible changes
 * - **Breathing Effect**: Subtle opacity and scale animations create a living, breathing backdrop
 * - **Color Flow**: Hue rotation effects for subtle color shifts throughout the animation
 * - **Clean Typography**: Modern text with soft-light blend mode and subtle drop shadow
 * - **CSS Variables**: Custom properties for gradient colors (extensible for future customization)
 *
 * Use cases:
 * - Meditation app backgrounds
 * - Calm waiting screens
 * - Ambient video content
 * - Relaxing visual experiences
 * - Slow-motion sunrise/sunset simulations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('Breathe')
    .describe('Text to display in the center of the gradient backdrop'),
  duration: z
    .number()
    .min(10)
    .max(300)
    .default(60)
    .describe('Total duration of the gradient animation in seconds'),
  font: z
    .string()
    .optional()
    .default('Inter:300')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Montserrat:200")',
    ),
  textSize: z
    .number()
    .min(24)
    .max(200)
    .default(80)
    .describe('Font size for the center text in pixels'),
  textOpacityMin: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum opacity for text breathing effect (0-1)'),
  textOpacityMax: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Maximum opacity for text breathing effect (0-1)'),
  breathingDuration: z
    .number()
    .min(5)
    .max(30)
    .default(12)
    .describe('Duration of text breathing cycle in seconds'),
  gradientIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Overall intensity multiplier for gradient animations (0.5 = subtle, 2 = intense)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    font,
    textSize,
    textOpacityMin,
    textOpacityMax,
    breathingDuration,
    gradientIntensity,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:300';
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

  // Gradient layer configurations
  const gradientLayers = [
    {
      id: 'gradient-layer-1',
      className: 'absolute inset-0',
      html: '<div class="absolute inset-0 bg-gradient-to-br from-orange-400 via-pink-400 to-purple-500"></div>',
      effects: [
        {
          id: 'gradient-1-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 15 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-1'],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.8, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'gradient-1-hue',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 20 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-1'],
            ranges: [
              { key: 'filter:hue-rotate', val: 0, prog: 0 },
              { key: 'filter:hue-rotate', val: 15, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'gradient-1-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 30 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-1'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.02, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
    {
      id: 'gradient-layer-2',
      className: 'absolute inset-0',
      html: '<div class="absolute inset-0 bg-gradient-to-tl from-red-400 via-orange-300 to-pink-400"></div>',
      effects: [
        {
          id: 'gradient-2-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 5,
            duration: 15 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'gradient-2-hue',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 10,
            duration: 20 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-2'],
            ranges: [
              { key: 'filter:hue-rotate', val: 0, prog: 0 },
              { key: 'filter:hue-rotate', val: -10, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
    {
      id: 'gradient-layer-3',
      className: 'absolute inset-0',
      html: '<div class="absolute inset-0 bg-gradient-to-tr from-pink-500 via-purple-400 to-orange-400"></div>',
      effects: [
        {
          id: 'gradient-3-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 10,
            duration: 15 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'gradient-3-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 15,
            duration: 25 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-3'],
            ranges: [
              { key: 'scale', val: 0.98, prog: 0 },
              { key: 'scale', val: 1.01, prog: 0.5 },
              { key: 'scale', val: 0.99, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
    {
      id: 'gradient-layer-4',
      className: 'absolute inset-0',
      html: '<div class="absolute inset-0 bg-gradient-to-bl from-purple-600 via-pink-500 to-red-400"></div>',
      effects: [
        {
          id: 'gradient-4-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 20,
            duration: 15 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-4'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          } as GenericEffectData,
        },
        {
          id: 'gradient-4-hue',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 25,
            duration: 20 * gradientIntensity,
            mode: 'provider',
            targetIds: ['gradient-layer-4'],
            ranges: [
              { key: 'filter:hue-rotate', val: 0, prog: 0 },
              { key: 'filter:hue-rotate', val: 20, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
  ];

  // Create gradient layer components
  const gradientChildren: RenderableComponentData[] = gradientLayers.map(
    (layer) =>
      ({
        id: layer.id,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: layer.html,
          className: layer.className,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: layer.effects,
      }) as RenderableComponentData,
  );

  // Text overlay component
  const textOverlay: RenderableComponentData = {
    id: 'text-overlay',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className:
        'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white tracking-wider',
      style: {
        fontSize: textSize,
        fontWeight: fontStyle.fontWeight || 300,
        fontStyle: fontStyle.fontStyle || 'normal',
        mixBlendMode: 'soft-light',
        textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
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
        duration: duration,
      },
    },
    effects: [
      {
        id: 'text-opacity-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: breathingDuration,
          mode: 'provider',
          targetIds: ['text-overlay'],
          ranges: [
            { key: 'opacity', val: textOpacityMin, prog: 0 },
            { key: 'opacity', val: textOpacityMax, prog: 0.5 },
            { key: 'opacity', val: textOpacityMin, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'gradient-meditation-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...gradientChildren, textOverlay],
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

const presetMetadata: PresetMetadata = {
  id: 'gradient-meditation-backdrop',
  title: 'Gradient Meditation Backdrop',
  description:
    'Minimalist, slow-burn gradient animation inspired by sunset timelapses with extremely slow, calming transitions through warm colors (coral, orange, pink, purple) mimicking golden hour progression. Features overlapping gradient layers with staggered opacity crossfades and breathing effects for a living, breathing meditation app background.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'gradient',
    'meditation',
    'calm',
    'slow',
    'sunset',
    'golden-hour',
    'breathing',
    'ambient',
    'background',
    'minimalist',
  ],
  defaultInputParams: {
    text: 'Breathe',
    duration: 60,
    font: 'Inter:300',
    textSize: 80,
    textOpacityMin: 0.7,
    textOpacityMax: 1,
    breathingDuration: 12,
    gradientIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gradientMeditationBackdropPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
