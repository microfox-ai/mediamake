/**
 * Golden Hour Light Leak Overlay Preset
 *
 * A subtle, professional light leak overlay that adds warmth and atmosphere without overwhelming content.
 * Creates soft, diffused golden hour sunlight effect with gentle movement and color grading.
 *
 * Features:
 * - Soft radial gradient light source positioned off-screen (top-right corner)
 * - Warm color grading layer with linear gradient
 * - Gentle movement animation (translate, scale, rotate) over 4 seconds
 * - Blend modes (soft-light, overlay) for natural integration
 * - Moderate opacity for subtle enhancement
 * - Configurable warmth intensity and positioning
 *
 * Use cases:
 * - Wedding videos
 * - Corporate content
 * - Cinematic productions
 * - Adding production value to any video content
 *
 * Technical approach:
 * - BaseLayout container with absolute positioning
 * - HTMLBlockAtom for light source (radial gradient with blur)
 * - BaseLayout for color grading layer (linear gradient)
 * - Generic effects for smooth animation
 * - Provider mode targeting for all effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  warmthIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .describe('Intensity of the warm light effect (0.1-1, higher = more intense)'),
  position: z
    .enum(['top-right', 'top-left', 'bottom-right', 'bottom-left'])
    .default('top-right')
    .describe('Position of the light source corner'),
  animationDuration: z
    .number()
    .min(3)
    .max(8)
    .default(4)
    .describe('Duration of the movement animation in seconds (3-8s)'),
  fadeInDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of the fade-in effect in seconds (0.5-3s)'),
  duration: z
    .number()
    .min(1)
    .default(30)
    .describe('Total duration of the overlay in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    warmthIntensity,
    position,
    animationDuration,
    fadeInDuration,
    duration,
  } = params;

  // Calculate position classes and animation values based on position parameter
  const getPositionConfig = (pos: string) => {
    switch (pos) {
      case 'top-right':
        return {
          className: '-top-1/4 -right-1/4',
          translateStart: 'translate(10%, 10%)',
          translateEnd: 'translate(-10%, -10%)',
        };
      case 'top-left':
        return {
          className: '-top-1/4 -left-1/4',
          translateStart: 'translate(-10%, 10%)',
          translateEnd: 'translate(10%, -10%)',
        };
      case 'bottom-right':
        return {
          className: '-bottom-1/4 -right-1/4',
          translateStart: 'translate(10%, -10%)',
          translateEnd: 'translate(-10%, 10%)',
        };
      case 'bottom-left':
        return {
          className: '-bottom-1/4 -left-1/4',
          translateStart: 'translate(-10%, -10%)',
          translateEnd: 'translate(10%, 10%)',
        };
      default:
        return {
          className: '-top-1/4 -right-1/4',
          translateStart: 'translate(10%, 10%)',
          translateEnd: 'translate(-10%, -10%)',
        };
    }
  };

  const positionConfig = getPositionConfig(position);

  // Build light source gradient with warmth intensity
  const lightGradient = `radial-gradient(ellipse at center, rgba(255,220,130,${0.8 * warmthIntensity}) 0%, rgba(255,200,100,${0.4 * warmthIntensity}) 30%, transparent 70%)`;

  // Build color grading gradient with warmth intensity
  const colorGradingGradient = `linear-gradient(135deg, rgba(255,200,100,${0.1 * warmthIntensity}) 0%, transparent 60%)`;

  // Light source HTML block (using HTMLBlockAtom for custom styling)
  const lightSourceHtml = `
    <div style="
      width: 100%;
      height: 100%;
      background: ${lightGradient};
      filter: blur(40px);
    "></div>
  `;

  const lightSourceComponent: RenderableComponentData = {
    id: 'light-leak-source',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: lightSourceHtml,
      className: `absolute ${positionConfig.className} w-[150%] h-[150%]`,
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Smooth movement animation (translate, scale, rotate)
      {
        id: 'light-source-movement',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: animationDuration,
          mode: 'provider',
          targetIds: ['light-leak-source'],
          ranges: [
            // Translate animation
            { key: 'translateX', val: '10%', prog: 0 },
            { key: 'translateX', val: '-10%', prog: 1 },
            { key: 'translateY', val: '10%', prog: 0 },
            { key: 'translateY', val: '-10%', prog: 1 },
            // Scale animation
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1.1, prog: 1 },
            // Subtle rotation
            { key: 'rotate', val: -5, prog: 0 },
            { key: 'rotate', val: 5, prog: 1 },
          ],
        },
      },
    ],
  };

  // Color grading layer
  const colorGradingComponent: RenderableComponentData = {
    id: 'color-grading-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: colorGradingGradient,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Root container with fade-in effect
  const rootContainer: RenderableComponentData = {
    id: 'golden-hour-light-leak-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'soft-light',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Fade-in effect on entire overlay
      {
        id: 'overlay-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: ['golden-hour-light-leak-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: warmthIntensity, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [lightSourceComponent, colorGradingComponent],
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
  id: 'golden-hour-light-leak',
  title: 'Golden Hour Light Leak Overlay',
  description:
    'A subtle, professional light leak overlay that adds warmth and atmosphere without overwhelming content. Features soft golden hour sunlight with gentle movement and warm color grading. Perfect for wedding videos, corporate content, and cinematic productions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'overlay',
    'light-leak',
    'golden-hour',
    'warmth',
    'atmosphere',
    'cinematic',
    'wedding',
    'corporate',
    'production-value',
    'subtle',
  ],
  defaultInputParams: {
    warmthIntensity: 0.6,
    position: 'top-right',
    animationDuration: 4,
    fadeInDuration: 1,
    duration: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const goldenHourLightLeakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
