/**
 * Split-Screen Parallax Preset
 *
 * A dynamic split-screen parallax preset where an image is divided into vertical slices
 * that move at different speeds while text scrolls through the center. Features:
 * - 5 vertical image slices with independent parallax motion
 * - Different translation speeds and directions per slice
 * - Horizontal scrolling text through the center
 * - Midway glitch effect for added visual impact
 * - High-contrast design with mix-blend-mode
 *
 * Use cases:
 * - Music video edits with fragmented backgrounds
 * - Energetic content with disorienting parallax effects
 * - Social media content requiring striking visuals
 * - Title sequences with dynamic motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  backgroundImage: z
    .string()
    .describe('Image source URL to be split into vertical slices'),
  text: z
    .string()
    .describe('Text content to scroll horizontally through the center'),
  duration: z
    .number()
    .min(3)
    .max(30)
    .default(10)
    .optional()
    .describe('Total duration of the preset in seconds (3-30s)'),
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .optional()
    .describe('Intensity multiplier for the glitch effect (0.5-3)'),
});

// --- EXECUTION FUNCTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration ?? 10;
  const glitchIntensity = params.glitchIntensity ?? 1;

  // Helper: Generate slice ID
  const sliceId = (index: number) => `split-parallax-slice-${index}`;

  // Helper: Generate effect ID
  const effectId = (type: string, index?: number) =>
    index !== undefined
      ? `split-parallax-${type}-${index}`
      : `split-parallax-${type}`;

  // Define slice configurations
  const sliceConfigs = [
    {
      index: 1,
      leftPos: '0%',
      clipPath: 'inset(0 80% 0 0)',
      objectPosition: '0% 50%',
      translateStart: '-10%',
      translateEnd: '10%',
      duration: 10,
    },
    {
      index: 2,
      leftPos: '20%',
      clipPath: 'inset(0 60% 0 20%)',
      objectPosition: '25% 50%',
      translateStart: '10%',
      translateEnd: '-10%',
      duration: 8,
    },
    {
      index: 3,
      leftPos: '40%',
      clipPath: 'inset(0 40% 0 40%)',
      objectPosition: '50% 50%',
      translateStart: '-5%',
      translateEnd: '5%',
      duration: 12,
    },
    {
      index: 4,
      leftPos: '60%',
      clipPath: 'inset(0 20% 0 60%)',
      objectPosition: '75% 50%',
      translateStart: '15%',
      translateEnd: '-15%',
      duration: 7,
    },
    {
      index: 5,
      leftPos: '80%',
      clipPath: 'inset(0 0% 0 80%)',
      objectPosition: '100% 50%',
      translateStart: '-8%',
      translateEnd: '8%',
      duration: 9,
    },
  ];

  // Create image slice components with parallax effects
  const sliceComponents: RenderableComponentData[] = sliceConfigs.map(
    (config) => ({
      id: sliceId(config.index),
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: params.backgroundImage,
        className: 'absolute top-0 bottom-0 w-1/5',
        style: {
          left: config.leftPos,
          clipPath: config.clipPath,
          objectFit: 'cover',
          objectPosition: config.objectPosition,
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
          id: effectId('parallax', config.index),
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: config.duration,
            mode: 'provider',
            targetIds: [sliceId(config.index)],
            ranges: [
              {
                key: 'translateY',
                val: config.translateStart,
                prog: 0,
              },
              {
                key: 'translateY',
                val: config.translateEnd,
                prog: 1,
              },
            ],
          },
        },
      ],
    }),
  );

  // Text component with scroll and glitch effects
  const textId = 'split-parallax-text';
  const textScrollDuration = 5;
  const glitchStart = duration / 2;
  const glitchDuration = 0.3 * glitchIntensity;

  // Glitch effect ranges
  const glitchTranslateAmount = 10 * glitchIntensity;
  const glitchRgbAmount = 5 * glitchIntensity;

  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-7xl font-black text-white whitespace-nowrap',
      style: {
        mixBlendMode: 'difference',
        backdropFilter: 'blur(2px)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Main scroll effect
      {
        id: effectId('text-scroll'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: textScrollDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 },
          ],
        },
      },
      // Glitch effect - horizontal jitter
      {
        id: effectId('glitch-x'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: glitchStart,
          duration: glitchDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${glitchTranslateAmount}px`, prog: 0.2 },
            { key: 'translateX', val: `${-glitchTranslateAmount}px`, prog: 0.4 },
            { key: 'translateX', val: `${glitchTranslateAmount * 0.5}px`, prog: 0.6 },
            { key: 'translateX', val: `${-glitchTranslateAmount * 0.3}px`, prog: 0.8 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
      // Glitch effect - vertical jitter
      {
        id: effectId('glitch-y'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: glitchStart,
          duration: glitchDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `${glitchTranslateAmount * 0.7}px`, prog: 0.15 },
            { key: 'translateY', val: `${-glitchTranslateAmount * 0.5}px`, prog: 0.35 },
            { key: 'translateY', val: `${glitchTranslateAmount * 0.4}px`, prog: 0.55 },
            { key: 'translateY', val: `${-glitchTranslateAmount * 0.2}px`, prog: 0.75 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
      // RGB split effect using text-shadow
      {
        id: effectId('glitch-rgb'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: glitchStart,
          duration: glitchDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            {
              key: 'textShadow',
              val: '0 0 0 transparent',
              prog: 0,
            },
            {
              key: 'textShadow',
              val: `${glitchRgbAmount}px 0 0 #ff0000, ${-glitchRgbAmount}px 0 0 #00ffff`,
              prog: 0.25,
            },
            {
              key: 'textShadow',
              val: `${-glitchRgbAmount * 0.8}px 0 0 #ff0000, ${glitchRgbAmount * 0.8}px 0 0 #00ffff`,
              prog: 0.5,
            },
            {
              key: 'textShadow',
              val: `${glitchRgbAmount * 0.5}px 0 0 #ff0000, ${-glitchRgbAmount * 0.5}px 0 0 #00ffff`,
              prog: 0.75,
            },
            {
              key: 'textShadow',
              val: '0 0 0 transparent',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Text container for positioning
  const textContainer: RenderableComponentData = {
    id: 'split-parallax-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 -translate-y-1/2 z-50 w-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textComponent],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'split-parallax-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...sliceComponents, textContainer] as RenderableComponentData[],
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

// --- METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'split-screen-parallax',
  title: 'Dynamic Split-Screen Parallax',
  description:
    'A dynamic split-screen parallax preset where an image is divided into vertical slices that move at different speeds while text scrolls through the center. Features fragmented background with disorienting parallax effect, horizontal scrolling text, and midway glitch effect for energetic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'parallax',
    'image',
    'text',
    'scroll',
    'glitch',
    'music-video',
    'energetic',
    'fragmented',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://example.com/background.jpg',
    text: 'SPLIT SCREEN',
    duration: 10,
    glitchIntensity: 1,
  },
};

// --- EXPORT ---
export const splitScreenParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
