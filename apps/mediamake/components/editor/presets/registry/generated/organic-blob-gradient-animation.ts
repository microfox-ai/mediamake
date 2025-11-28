/**
 * Organic Blob Gradient Animation Preset
 *
 * Creates a hypnotic liquid gradient animation with multiple morphing blob layers.
 * Features overlapping radial gradients with complementary color pairs (blue/orange, purple/yellow)
 * that transform at different speeds to create lava lamp-like fluid motion.
 * Includes floating text with subtle reflection effect.
 *
 * Features:
 * - Multiple gradient layers with independent transform animations (rotate, scale, translate)
 * - Smooth, organic morphing using CSS transforms (no SVG filters due to complexity)
 * - Complementary color pairs for maximum visual impact
 * - Floating text with reflection effect
 * - Configurable animation speeds and intensities
 *
 * Use cases:
 * - Eye-catching background animations
 * - Liquid motion graphics
 * - Hypnotic visual experiences
 * - Modern design aesthetics
 * - Abstract visual content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().default('LIQUID MOTION').describe('Main text to display'),
  duration: z
    .number()
    .default(30)
    .describe('Duration of the animation in seconds'),
  textSize: z
    .number()
    .default(64)
    .describe('Font size of the main text in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:600")',
    ),
  showReflection: z
    .boolean()
    .default(true)
    .describe('Whether to show text reflection effect'),
  reflectionOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of the reflection text (0-1)'),
  animationSpeed: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Speed multiplier for animations (0.1-3)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(60)
    .describe('Blur intensity for gradient layers in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textSize,
    fontFamily,
    showReflection,
    reflectionOpacity,
    animationSpeed,
    blurIntensity,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const parsedFont = fontFamily.includes(':')
    ? fontFamily.split(':')
    : [fontFamily];
  const fontFamilyName = parsedFont[0];
  const fontWeight = parsedFont.length > 1 ? parseInt(parsedFont[1], 10) : 700;

  // Helper function to create gradient layer with animation
  const createGradientLayer = (
    id: string,
    color: string,
    positionX: number,
    positionY: number,
    opacity: number,
    animDuration1: number,
    animDuration2: number,
    animDuration3: number,
  ): RenderableComponentData => {
    return {
      id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background: `radial-gradient(circle at ${positionX}% ${positionY}%, ${color} 0%, transparent 50%)`,
            filter: `blur(${blurIntensity}px)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Rotation animation
        {
          id: `${id}-rotate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: animDuration1 / animationSpeed,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
            ],
          },
        },
        // Scale animation (breathing effect)
        {
          id: `${id}-scale`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: animDuration2 / animationSpeed,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Translation animation (drift effect)
        {
          id: `${id}-translate`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: animDuration3 / animationSpeed,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 50, prog: 0.25 },
              { key: 'translateX', val: 0, prog: 0.5 },
              { key: 'translateX', val: -50, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -40, prog: 0.33 },
              { key: 'translateY', val: 0, prog: 0.66 },
              { key: 'translateY', val: 40, prog: 0.83 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create gradient layers with complementary colors
  const gradientLayers: RenderableComponentData[] = [
    // Orange blob
    createGradientLayer(
      'gradient-layer-1',
      'rgba(255, 140, 0, 0.6)',
      30,
      40,
      0.6,
      12, // Rotation duration
      8, // Scale duration
      10, // Translation duration
    ),
    // Blue blob
    createGradientLayer(
      'gradient-layer-2',
      'rgba(0, 120, 255, 0.6)',
      70,
      60,
      0.6,
      15,
      10,
      12,
    ),
    // Yellow blob
    createGradientLayer(
      'gradient-layer-3',
      'rgba(255, 215, 0, 0.5)',
      50,
      50,
      0.5,
      18,
      12,
      14,
    ),
    // Purple blob
    createGradientLayer(
      'gradient-layer-4',
      'rgba(128, 0, 128, 0.5)',
      20,
      80,
      0.5,
      20,
      14,
      16,
    ),
  ];

  // Create text components
  const textComponents: RenderableComponentData[] = [
    // Main text
    {
      id: 'main-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'text-white tracking-wider',
        style: {
          fontSize: textSize,
          fontWeight,
          textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        },
        font: {
          family: fontFamilyName,
          weights: [fontWeight.toString()],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    } as RenderableComponentData,
  ];

  // Add reflection if enabled
  if (showReflection) {
    textComponents.push({
      id: 'reflection-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'text-white tracking-wider',
        style: {
          fontSize: textSize,
          fontWeight,
          transform: 'scaleY(-1)',
          opacity: reflectionOpacity,
          marginTop: '8px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 50%)',
        },
        font: {
          family: fontFamilyName,
          weights: [fontWeight.toString()],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    } as RenderableComponentData);
  }

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: textComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'organic-blob-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [...gradientLayers, textContainer],
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

const presetMetadata: PresetMetadata = {
  id: 'organic-blob-gradient-animation',
  title: 'Organic Blob Gradient Animation',
  description:
    'Hypnotic liquid gradient animation with multiple morphing blob layers animated via transform effects. Features overlapping radial gradients with complementary color pairs (blue/orange, purple/yellow) that scale, translate, and rotate at different speeds to create lava lamp-like fluid motion. Includes floating text with subtle reflection effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'gradient',
    'animation',
    'liquid',
    'blob',
    'lava-lamp',
    'organic',
    'morphing',
    'hypnotic',
    'abstract',
    'background',
  ],
  defaultInputParams: {
    text: 'LIQUID MOTION',
    duration: 30,
    textSize: 64,
    fontFamily: 'Inter:700',
    showReflection: true,
    reflectionOpacity: 0.2,
    animationSpeed: 1,
    blurIntensity: 60,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const organicBlobGradientAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
