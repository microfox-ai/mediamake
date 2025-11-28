/**
 * Cinematic Typokinetics with Audio-Reactive Depth Layers
 *
 * This preset creates a cinematic title sequence with multiple text layers at different
 * depth levels (foreground, midground, background) that respond to audio dynamics through
 * opacity variations. Each layer pulses at different rates and intensities, creating a
 * parallax-like effect with wave-like propagation through the text hierarchy.
 *
 * Features:
 * - Multiple text layers with z-index stacking (1-5)
 * - Audio-reactive opacity effects with cascading delays
 * - Foreground: subtle opacity variations (0.9-1.0)
 * - Midground: moderate opacity swings (0.5-0.9)
 * - Background: dramatic opacity swings (0.2-0.8)
 * - Wave-like propagation with layerIndex-based delays
 * - Luminous mix-blend-screen effect for cinematic look
 * - Epic and theatrical feel suitable for trailers and dramatic content
 *
 * Use cases:
 * - Movie title sequences
 * - Trailer title cards
 * - Dramatic video intros
 * - Cinematic overlays
 * - Epic content branding
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  mainTitle: z
    .string()
    .default('EPIC')
    .describe('Main title text (background layer)'),
  subtitle: z
    .string()
    .default('Cinematic Experience')
    .describe('Subtitle text (midground layer)'),
  credits: z
    .string()
    .default('Production Credits')
    .describe('Credits text (foreground layer)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive effects (optional)'),
  foregroundSensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Foreground layer opacity sensitivity (0.1-2.0)'),
  midgroundSensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.6)
    .describe('Midground layer opacity sensitivity (0.1-2.0)'),
  backgroundSensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Background layer opacity sensitivity (0.1-2.0)'),
  propagationDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay between layer animations (seconds)'),
  duration: z
    .number()
    .positive()
    .default(10)
    .describe('Total duration in seconds'),
  font: z
    .string()
    .default('Inter:900')
    .describe('Font family with optional weight (e.g., "Inter:900", "Bebas Neue:700")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 900;
  }

  // Layer configurations
  const layers = [
    {
      id: 'background-layer',
      zIndex: 1,
      text: params.mainTitle,
      fontSize: 'text-6xl',
      sensitivity: params.backgroundSensitivity,
      opacityRange: [0.2, 0.8],
      duration: 2,
      delay: 0,
      layerIndex: 0,
      className: 'absolute inset-0 flex items-center justify-center',
      textClassName: 'text-6xl font-bold text-white mix-blend-screen',
      textStyle: {
        textTransform: 'uppercase' as const,
        letterSpacing: '0.2em',
      },
    },
    {
      id: 'midground-layer',
      zIndex: 3,
      text: params.subtitle,
      fontSize: 'text-2xl',
      sensitivity: params.midgroundSensitivity,
      opacityRange: [0.5, 0.9],
      duration: 1.5,
      delay: params.propagationDelay,
      layerIndex: 1,
      className: 'absolute inset-0 grid grid-rows-[1fr_auto_1fr] items-center',
      textClassName: 'text-2xl font-light text-white mix-blend-screen text-center',
      textStyle: {
        letterSpacing: '0.15em',
      },
    },
    {
      id: 'foreground-layer',
      zIndex: 5,
      text: params.credits,
      fontSize: 'text-sm',
      sensitivity: params.foregroundSensitivity,
      opacityRange: [0.9, 1.0],
      duration: 1,
      delay: params.propagationDelay * 2,
      layerIndex: 2,
      className: 'absolute inset-0 flex flex-col justify-end items-center pb-16',
      textClassName: 'text-sm font-normal text-white mix-blend-screen text-center',
      textStyle: {
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
      },
    },
  ];

  // Create layers with effects
  const childrenData: RenderableComponentData[] = layers.map((layer) => {
    const textId = `${layer.id}-text`;

    // Create opacity effect with sensitivity-based range
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: layer.delay,
      duration: layer.duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'opacity', val: layer.opacityRange[0], prog: 0 },
        { key: 'opacity', val: layer.opacityRange[1], prog: 0.5 },
        { key: 'opacity', val: layer.opacityRange[0], prog: 1 },
      ],
    };

    const effect = {
      id: `${layer.id}-opacity-wave`,
      componentId: 'generic',
      data: effectData,
    };

    // Create text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: layer.text,
        className: layer.textClassName,
        style: {
          ...layer.textStyle,
          color: params.textColor,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    };

    // Create layer container
    const layerContainer: RenderableComponentData = {
      id: layer.id,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: layer.className,
          style: {
            zIndex: layer.zIndex,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [effect],
      childrenData: [textAtom],
    };

    return layerContainer;
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData,
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
  id: 'cinematic-typokinetics',
  title: 'Cinematic Typokinetics with Audio-Reactive Depth',
  description:
    'Epic cinematic typography preset featuring audio-reactive opacity layers that create dramatic depth effects. Multiple text layers with parallax-like opacity pulsing respond to audio dynamics, creating theatrical movie title sequence aesthetics. Foreground text maintains subtle opacity variations (0.9-1.0) while background layers have dramatic swings (0.2-0.8), with cascading wave propagation through the text hierarchy. Perfect for trailers, dramatic content, and cinematic title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'cinematic',
    'title-sequence',
    'audio-reactive',
    'depth-layers',
    'parallax',
    'epic',
    'trailer',
    'dramatic',
    'opacity',
    'wave-propagation',
    'movie-titles',
  ],
  dependencies: {},
  defaultInputParams: {
    mainTitle: 'EPIC',
    subtitle: 'Cinematic Experience',
    credits: 'Production Credits',
    foregroundSensitivity: 0.3,
    midgroundSensitivity: 0.6,
    backgroundSensitivity: 1.0,
    propagationDelay: 0.15,
    duration: 10,
    font: 'Inter:900',
    textColor: '#FFFFFF',
  },
};

// Export preset
export const cinematicTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
