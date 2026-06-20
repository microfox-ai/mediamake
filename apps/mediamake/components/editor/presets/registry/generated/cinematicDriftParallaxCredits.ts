/**
 * Cinematic Drift Parallax Credits Preset
 *
 * This preset creates text elements that drift horizontally like end credits with depth layers
 * and atmospheric haze. Features parallax scrolling where foreground text moves faster than
 * background, creating a cinematic depth effect. Each layer has different opacity levels to
 * simulate atmospheric perspective, with subtle vertical bobbing for organic motion.
 *
 * Features:
 * - **Parallax Scrolling**: 3-4 depth layers with different horizontal speeds
 * - **Atmospheric Perspective**: Depth-based opacity (foreground 1.0, midground 0.7, background 0.4)
 * - **Vertical Bobbing**: Subtle floating motion to reduce mechanical feel
 * - **Edge Fading**: Distance-based fade in from screen edge and fade out on opposite edge
 * - **Depth Enhancement**: Optional blur for background layers (1px filter)
 * - **Customizable Speeds**: Foreground (10s), midground (15s), background (25s)
 *
 * Use cases:
 * - Creating cinematic title sequences with depth
 * - Building end credits-style animations
 * - Adding atmospheric text effects with parallax
 * - Creating professional scrolling text with layers
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  // Layer text content
  foregroundText: z
    .string()
    .default('FOREGROUND TEXT')
    .describe('Text content for foreground layer (fastest movement)'),
  midgroundText: z
    .string()
    .default('MIDGROUND TEXT')
    .describe('Text content for midground layer (medium movement)'),
  backgroundText: z
    .string()
    .default('BACKGROUND TEXT')
    .describe('Text content for background layer (slowest movement)'),

  // Timing configuration
  foregroundDuration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Duration for foreground text drift (seconds)'),
  midgroundDuration: z
    .number()
    .min(10)
    .max(60)
    .default(15)
    .describe('Duration for midground text drift (seconds)'),
  backgroundDuration: z
    .number()
    .min(15)
    .max(120)
    .default(25)
    .describe('Duration for background text drift (seconds)'),

  // Vertical bobbing configuration
  verticalBobDuration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Duration for vertical bobbing cycle (seconds)'),
  verticalBobAmplitude: z
    .number()
    .min(5)
    .max(50)
    .default(10)
    .describe('Vertical bobbing amplitude in pixels'),

  // Font and styling
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for all layers'),

  // Background blur toggle
  enableBackgroundBlur: z
    .boolean()
    .default(true)
    .describe('Enable blur filter for background layer to enhance depth'),

  // Scene duration (longest layer dictates total duration)
  totalDuration: z
    .number()
    .optional()
    .describe(
      'Total duration of the preset (defaults to background layer duration)',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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

  // Calculate total duration (longest layer duration)
  const totalDuration =
    params.totalDuration ??
    Math.max(
      params.foregroundDuration,
      params.midgroundDuration,
      params.backgroundDuration,
    );

  // Layer configuration
  const layers = [
    {
      id: 'background-layer',
      zIndex: 10,
      text: params.backgroundText,
      className: 'text-2xl font-light',
      opacity: 0.4,
      scale: 0.8,
      duration: params.backgroundDuration,
      blur: params.enableBackgroundBlur ? 'blur(1px)' : undefined,
    },
    {
      id: 'midground-layer',
      zIndex: 20,
      text: params.midgroundText,
      className: 'text-4xl font-medium',
      opacity: 0.7,
      scale: 1,
      duration: params.midgroundDuration,
      blur: undefined,
    },
    {
      id: 'foreground-layer',
      zIndex: 30,
      text: params.foregroundText,
      className: 'text-6xl font-bold',
      opacity: 1,
      scale: 1.2,
      duration: params.foregroundDuration,
      blur: undefined,
    },
  ];

  // Create layer components
  const layerComponents: RenderableComponentData[] = layers.map((layer) => {
    const textId = `${layer.id}-text`;
    const bobbingEffectId = `${layer.id}-bobbing-effect`;
    const driftEffectId = `${layer.id}-drift-effect`;

    // Horizontal drift effect (translateX from 100vw to -100vw with edge fading)
    const driftEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: layer.duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Horizontal drift
        { key: 'translateX', val: '100vw', prog: 0 },
        { key: 'translateX', val: '-100vw', prog: 1 },
        // Edge fading (fade in from right, fade out on left)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: layer.opacity, prog: 0.15 },
        { key: 'opacity', val: layer.opacity, prog: 0.85 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    // Vertical bobbing effect (subtle floating motion)
    const bobbingEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: params.verticalBobDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        {
          key: 'translateY',
          val: -params.verticalBobAmplitude,
          prog: 0,
        },
        {
          key: 'translateY',
          val: params.verticalBobAmplitude,
          prog: 0.5,
        },
        {
          key: 'translateY',
          val: -params.verticalBobAmplitude,
          prog: 1,
        },
      ],
    };

    // Calculate how many bobbing cycles fit in the drift duration
    const bobbingCycles = Math.ceil(
      layer.duration / params.verticalBobDuration,
    );

    // Create multiple bobbing effects to loop
    const bobbingEffects = [];
    for (let i = 0; i < bobbingCycles; i++) {
      bobbingEffects.push({
        id: `${bobbingEffectId}-${i}`,
        componentId: 'generic',
        data: {
          ...bobbingEffect,
          start: i * params.verticalBobDuration,
        },
      });
    }

    // Text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: layer.text,
        className: `${layer.className} text-white absolute whitespace-nowrap`,
        style: {
          transform: `scale(${layer.scale})`,
          filter: layer.blur,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['400'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    };

    // Layer container with effects
    return {
      id: layer.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            zIndex: layer.zIndex,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: driftEffectId,
          componentId: 'generic',
          data: driftEffect,
        },
        ...bobbingEffects,
      ],
      childrenData: [textAtom],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-drift-parallax-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: layerComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cinematicDriftParallaxCredits',
  title: 'Cinematic Drift Parallax Credits',
  description:
    'Text elements that drift horizontally like end credits with depth layers and atmospheric haze. Features parallax scrolling with foreground text moving faster than background, depth-based opacity (atmospheric perspective), subtle vertical bobbing, distance-based edge fading, and optional blur for background layers. Creates a cinematic title sequence effect with 3-4 depth layers using different speeds, scales, and opacity levels.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'parallax',
    'drift',
    'credits',
    'depth',
    'layers',
    'atmospheric',
    'end-credits',
    'title-sequence',
  ],
  dependencies: {},
  defaultInputParams: {
    foregroundText: 'FOREGROUND TEXT',
    midgroundText: 'MIDGROUND TEXT',
    backgroundText: 'BACKGROUND TEXT',
    foregroundDuration: 10,
    midgroundDuration: 15,
    backgroundDuration: 25,
    verticalBobDuration: 4,
    verticalBobAmplitude: 10,
    font: 'Inter:700',
    textColor: '#ffffff',
    enableBackgroundBlur: true,
  },
};

export const cinematicDriftParallaxCreditsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
