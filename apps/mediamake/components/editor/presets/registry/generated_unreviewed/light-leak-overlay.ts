/**
 * Light Leak Overlay Preset
 *
 * This preset adds animated light leak overlays that move across the frame, creating
 * a cinematic and ethereal visual effect. Light leaks simulate the effect of light
 * entering a camera lens, producing organic, colorful streaks and glows.
 *
 * Features:
 * - **Multiple Light Leaks**: Three independent light leak overlays with different motion patterns
 * - **Blend Modes**: Uses screen and add blend modes for authentic light leak appearance
 * - **Motion Variety**: Each leak moves in different directions with unique timing and trajectories
 * - **Dynamic Effects**: Combines translation, rotation, scaling, and opacity for organic movement
 * - **Customizable Intensity**: Control opacity, blur, and speed of each leak independently
 * - **Continuous Animation**: Loops seamlessly throughout the video duration
 * - **Staggered Timing**: Delayed starts create natural, non-synchronous patterns
 *
 * Use Cases:
 * - Music videos and artistic content
 * - Cinematic transitions and atmospheric overlays
 * - Dreamy, nostalgic, or vintage aesthetics
 * - Adding visual interest to talking head videos
 * - Creating depth and dimension in flat compositions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  leak1: z
    .object({
      enabled: z.boolean().default(true).describe('Enable first light leak'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.6)
        .describe('Opacity of first light leak'),
      blurAmount: z
        .number()
        .min(0)
        .max(10)
        .default(2)
        .describe('Blur intensity in pixels'),
      speed: z
        .number()
        .min(0.1)
        .max(5)
        .default(1)
        .describe('Animation speed multiplier'),
      color: z
        .string()
        .default('#ffaa00')
        .describe('Base color tint for light leak'),
    })
    .describe('Configuration for first light leak'),

  leak2: z
    .object({
      enabled: z.boolean().default(true).describe('Enable second light leak'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Opacity of second light leak'),
      blurAmount: z
        .number()
        .min(0)
        .max(10)
        .default(3)
        .describe('Blur intensity in pixels'),
      speed: z
        .number()
        .min(0.1)
        .max(5)
        .default(1)
        .describe('Animation speed multiplier'),
      color: z
        .string()
        .default('#ff6699')
        .describe('Base color tint for light leak'),
    })
    .describe('Configuration for second light leak'),

  leak3: z
    .object({
      enabled: z.boolean().default(true).describe('Enable third light leak'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.4)
        .describe('Opacity of third light leak'),
      blurAmount: z
        .number()
        .min(0)
        .max(10)
        .default(4)
        .describe('Blur intensity in pixels'),
      speed: z
        .number()
        .min(0.1)
        .max(5)
        .default(1)
        .describe('Animation speed multiplier'),
      color: z
        .string()
        .default('#ffdd44')
        .describe('Base color tint for light leak'),
    })
    .describe('Configuration for third light leak'),

  globalIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Global intensity multiplier for all light leaks'),

  duration: z
    .number()
    .positive()
    .optional()
    .describe(
      'Optional duration in seconds. If not provided, fits to parent duration',
    ),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { config, clip } = props;

  // Determine duration
  const finalDuration = params.duration
    ? params.duration
    : clip?.duration
      ? clip.duration
      : config?.duration
        ? config.duration
        : 30;

  // Helper function to create light leak gradient SVG
  const createLightLeakGradient = (color: string, leakId: string): string => {
    // Create a radial gradient SVG data URL
    const svg = `
      <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad-${leakId}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${color};stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
          </radialGradient>
        </defs>
        <ellipse cx="400" cy="400" rx="300" ry="600" fill="url(#grad-${leakId})" transform="rotate(45 400 400)" />
      </svg>
    `.trim();

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Build children array
  const children: any[] = [];

  // Light Leak 1
  if (params.leak1.enabled) {
    const baseDuration = 4000;
    const duration = baseDuration / params.leak1.speed;
    const fadeDuration = Math.min(1000, duration * 0.25);

    children.push({
      id: 'light-leak-1',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: createLightLeakGradient(params.leak1.color, 'leak1'),
        containerProps: {
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
            opacity: params.leak1.opacity * params.globalIntensity,
            filter: `blur(${params.leak1.blurAmount}px)`,
            width: '50vw',
            height: '100vh',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: finalDuration,
        },
      },
      effects: [
        {
          id: 'leak1-translate',
          componentId: 'light-leak-1',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-1'],
            loop: true,
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '120%', prog: 1 },
              { key: 'translateY', val: '-20%', prog: 0 },
              { key: 'translateY', val: '30%', prog: 1 },
            ],
          },
        },
        {
          id: 'leak1-opacity',
          componentId: 'light-leak-1',
          data: {
            type: 'ease-in',
            start: 0,
            duration: fadeDuration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              {
                key: 'opacity',
                val: params.leak1.opacity * params.globalIntensity,
                prog: 1,
              },
            ],
          },
        },
        {
          id: 'leak1-scale',
          componentId: 'light-leak-1',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-1'],
            loop: true,
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.2, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // Light Leak 2
  if (params.leak2.enabled) {
    const baseDuration = 5500;
    const duration = baseDuration / params.leak2.speed;
    const fadeDuration = Math.min(1200, duration * 0.25);
    const delay = 0.8;

    children.push({
      id: 'light-leak-2',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: createLightLeakGradient(params.leak2.color, 'leak2'),
        containerProps: {
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
            opacity: params.leak2.opacity * params.globalIntensity,
            filter: `blur(${params.leak2.blurAmount}px)`,
            width: '50vw',
            height: '100vh',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: finalDuration,
        },
      },
      effects: [
        {
          id: 'leak2-translate',
          componentId: 'light-leak-2',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: duration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-2'],
            loop: true,
            ranges: [
              { key: 'translateX', val: '100%', prog: 0 },
              { key: 'translateX', val: '-120%', prog: 1 },
              { key: 'translateY', val: '80%', prog: 0 },
              { key: 'translateY', val: '10%', prog: 1 },
            ],
          },
        },
        {
          id: 'leak2-opacity',
          componentId: 'light-leak-2',
          data: {
            type: 'ease-in',
            start: delay,
            duration: fadeDuration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              {
                key: 'opacity',
                val: params.leak2.opacity * params.globalIntensity,
                prog: 1,
              },
            ],
          },
        },
        {
          id: 'leak2-rotate',
          componentId: 'light-leak-2',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: duration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-2'],
            loop: true,
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 15, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // Light Leak 3
  if (params.leak3.enabled) {
    const baseDuration = 6000;
    const duration = baseDuration / params.leak3.speed;
    const fadeDuration = Math.min(1500, duration * 0.25);
    const delay = 1.5;

    children.push({
      id: 'light-leak-3',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: createLightLeakGradient(params.leak3.color, 'leak3'),
        containerProps: {
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
            opacity: params.leak3.opacity * params.globalIntensity,
            filter: `blur(${params.leak3.blurAmount}px)`,
            width: '50vw',
            height: '100vh',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: finalDuration,
        },
      },
      effects: [
        {
          id: 'leak3-translate',
          componentId: 'light-leak-3',
          data: {
            type: 'linear',
            start: delay,
            duration: duration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-3'],
            loop: true,
            ranges: [
              { key: 'translateX', val: '50%', prog: 0 },
              { key: 'translateX', val: '-30%', prog: 1 },
              { key: 'translateY', val: '-50%', prog: 0 },
              { key: 'translateY', val: '120%', prog: 1 },
            ],
          },
        },
        {
          id: 'leak3-opacity',
          componentId: 'light-leak-3',
          data: {
            type: 'ease-in',
            start: delay,
            duration: fadeDuration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              {
                key: 'opacity',
                val: params.leak3.opacity * params.globalIntensity,
                prog: 1,
              },
            ],
          },
        },
        {
          id: 'leak3-scale',
          componentId: 'light-leak-3',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: duration / 1000,
            mode: 'provider',
            targetIds: ['light-leak-3'],
            loop: true,
            ranges: [
              { key: 'scale', val: 1.5, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // Root container
  const rootContainer = {
    id: 'light-leak-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          zIndex: 1000,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: finalDuration,
      },
    },
    childrenData: children,
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'light-leak-overlay',
  title: 'Light Leak Overlay',
  description:
    'Adds animated light leak overlays that move across the frame with customizable colors, blend modes, and motion patterns',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'overlay',
    'light-leak',
    'cinematic',
    'visual-effects',
    'atmosphere',
    'gradient',
    'motion',
    'animation',
  ],
  defaultInputParams: {
    leak1: {
      enabled: true,
      opacity: 0.6,
      blurAmount: 2,
      speed: 1,
      color: '#ffaa00',
    },
    leak2: {
      enabled: true,
      opacity: 0.5,
      blurAmount: 3,
      speed: 1,
      color: '#ff6699',
    },
    leak3: {
      enabled: true,
      opacity: 0.4,
      blurAmount: 4,
      speed: 1,
      color: '#ffdd44',
    },
    globalIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const lightLeakOverlayPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
