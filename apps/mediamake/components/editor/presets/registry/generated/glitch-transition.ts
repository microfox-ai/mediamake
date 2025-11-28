/**
 * Glitch Transition Preset
 *
 * Creates a digital glitch transition effect simulating corrupted video frames with chromatic aberration
 * and RGB channel separation. Combines VHS-style degradation with digital compression artifacts.
 *
 * Features:
 * - **RGB Channel Separation**: Multiple ImageAtom layers with offset red/green/blue channels
 * - **Chromatic Aberration**: CSS blend modes (screen for red, multiply for green/blue)
 * - **Stepped Timing**: Erratic, freeze-frame animations using steps() easing
 * - **Data-Mosh Effects**: Independent scaleX/scaleY animations for pixel stretching
 * - **Digital Breakdown**: Random opacity flickers, position jumps, and scan line overlays
 * - **Signal Reconstruction**: Channels break apart and reassemble with stutter effects
 *
 * Use cases:
 * - Cyberpunk/tech-themed transitions
 * - Corrupted digital aesthetic overlays
 * - VHS tape degradation effects
 * - Digital signal breakdown sequences
 * - Glitch art compositions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  sourceImage: z.object({
    src: z.string().describe('Source image URL or local path'),
    duration: z.number().describe('Duration of the glitch effect in seconds'),
  }).describe('Source image configuration for the glitch transition'),
  
  glitchIntensity: z
    .enum(['low', 'medium', 'high'])
    .default('medium')
    .describe('Intensity of the glitch effect - controls offset distances and distortion'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Total duration of the glitch transition effect in seconds'),
  
  rgbChannels: z
    .object({
      red: z.object({
        offsetX: z.number().optional().describe('Horizontal offset for red channel (px)'),
        offsetY: z.number().optional().describe('Vertical offset for red channel (px)'),
        enabled: z.boolean().default(true).describe('Enable red channel separation'),
      }).optional(),
      green: z.object({
        offsetX: z.number().optional().describe('Horizontal offset for green channel (px)'),
        offsetY: z.number().optional().describe('Vertical offset for green channel (px)'),
        enabled: z.boolean().default(true).describe('Enable green channel separation'),
      }).optional(),
      blue: z.object({
        offsetX: z.number().optional().describe('Horizontal offset for blue channel (px)'),
        offsetY: z.number().optional().describe('Vertical offset for blue channel (px)'),
        enabled: z.boolean().default(true).describe('Enable blue channel separation'),
      }).optional(),
    })
    .optional()
    .describe('Configuration for individual RGB channel offsets and enable/disable'),
  
  scanlineIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity intensity of scan line overlay effect (0-1)'),
  
  noiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity intensity of noise/grain overlay effect (0-1)'),
  
  pixelStretch: z
    .object({
      enabled: z.boolean().default(true).describe('Enable pixel stretching effect'),
      maxScaleX: z.number().min(0.8).max(2.0).default(1.5).describe('Maximum horizontal stretch'),
      maxScaleY: z.number().min(0.8).max(1.5).default(1.1).describe('Maximum vertical stretch'),
    })
    .optional()
    .describe('Configuration for data-mosh style pixel stretching'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { sourceImage, glitchIntensity, transitionDuration, rgbChannels, scanlineIntensity, noiseIntensity, pixelStretch } = params;

  // Intensity multipliers based on glitchIntensity setting
  const intensityMultipliers = {
    low: 0.6,
    medium: 1.0,
    high: 1.5,
  };
  const intensityMultiplier = intensityMultipliers[glitchIntensity];

  // Calculate RGB channel offsets (defaults with intensity scaling)
  const redConfig = rgbChannels?.red || {};
  const greenConfig = rgbChannels?.green || {};
  const blueConfig = rgbChannels?.blue || {};

  const redOffsetX = (redConfig.offsetX ?? -15) * intensityMultiplier;
  const redOffsetY = (redConfig.offsetY ?? 8) * intensityMultiplier;
  const greenOffsetX = (greenConfig.offsetX ?? 10) * intensityMultiplier;
  const greenOffsetY = (greenConfig.offsetY ?? -6) * intensityMultiplier;
  const blueOffsetX = (blueConfig.offsetX ?? -12) * intensityMultiplier;
  const blueOffsetY = (blueConfig.offsetY ?? 5) * intensityMultiplier;

  // Pixel stretch configuration
  const stretchEnabled = pixelStretch?.enabled ?? true;
  const maxScaleX = pixelStretch?.maxScaleX ?? 1.5;
  const maxScaleY = pixelStretch?.maxScaleY ?? 1.1;

  const childrenData: RenderableComponentData[] = [];

  // Red Channel Layer
  if (redConfig.enabled !== false) {
    childrenData.push({
      id: 'red-channel-layer',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: sourceImage.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          filter: 'hue-rotate(0deg) contrast(200%) brightness(1.5)',
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'red-channel-glitch-x',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 4,
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['red-channel-layer'],
            ranges: [
              { key: 'translateX', val: redOffsetX, prog: 0 },
              { key: 'translateX', val: redOffsetX * 1.3, prog: 0.3 },
              { key: 'translateX', val: redOffsetX * -0.7, prog: 0.6 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'red-channel-glitch-y',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 4,
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['red-channel-layer'],
            ranges: [
              { key: 'translateY', val: redOffsetY, prog: 0 },
              { key: 'translateY', val: redOffsetY * -0.6, prog: 0.4 },
              { key: 'translateY', val: redOffsetY * 0.4, prog: 0.7 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'red-channel-opacity-flicker',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 2,
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['red-channel-layer'],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        ...(stretchEnabled
          ? [
              {
                id: 'red-channel-scale-x',
                componentId: 'generic',
                data: {
                  type: 'steps',
                  steps: 4,
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['red-channel-layer'],
                  ranges: [
                    { key: 'scaleX', val: 1.2, prog: 0 },
                    { key: 'scaleX', val: 0.9, prog: 0.3 },
                    { key: 'scaleX', val: maxScaleX, prog: 0.6 },
                    { key: 'scaleX', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: 'red-channel-scale-y',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['red-channel-layer'],
                  ranges: [
                    { key: 'scaleY', val: 0.98, prog: 0 },
                    { key: 'scaleY', val: maxScaleY, prog: 0.5 },
                    { key: 'scaleY', val: 1, prog: 1 },
                  ],
                },
              },
            ]
          : []),
      ],
    } as RenderableComponentData);
  }

  // Green Channel Layer
  if (greenConfig.enabled !== false) {
    childrenData.push({
      id: 'green-channel-layer',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: sourceImage.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'multiply',
          filter: 'hue-rotate(120deg) contrast(150%) brightness(1.2)',
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0.05,
          duration: transitionDuration - 0.05,
        },
      },
      effects: [
        {
          id: 'green-channel-glitch-x',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 4,
            start: 0,
            duration: transitionDuration - 0.05,
            mode: 'provider',
            targetIds: ['green-channel-layer'],
            ranges: [
              { key: 'translateX', val: greenOffsetX, prog: 0 },
              { key: 'translateX', val: greenOffsetX * -1.8, prog: 0.35 },
              { key: 'translateX', val: greenOffsetX * 0.8, prog: 0.65 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'green-channel-glitch-y',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 4,
            start: 0,
            duration: transitionDuration - 0.05,
            mode: 'provider',
            targetIds: ['green-channel-layer'],
            ranges: [
              { key: 'translateY', val: greenOffsetY, prog: 0 },
              { key: 'translateY', val: greenOffsetY * -0.7, prog: 0.3 },
              { key: 'translateY', val: greenOffsetY * 0.3, prog: 0.7 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'green-channel-opacity-flicker',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 2,
            start: 0,
            duration: transitionDuration - 0.05,
            mode: 'provider',
            targetIds: ['green-channel-layer'],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.25 },
              { key: 'opacity', val: 0.5, prog: 0.55 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        ...(stretchEnabled
          ? [
              {
                id: 'green-channel-scale-x',
                componentId: 'generic',
                data: {
                  type: 'steps',
                  steps: 4,
                  start: 0,
                  duration: transitionDuration - 0.05,
                  mode: 'provider',
                  targetIds: ['green-channel-layer'],
                  ranges: [
                    { key: 'scaleX', val: 0.85, prog: 0 },
                    { key: 'scaleX', val: 1.3, prog: 0.4 },
                    { key: 'scaleX', val: 0.95, prog: 0.7 },
                    { key: 'scaleX', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: 'green-channel-scale-y',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: transitionDuration - 0.05,
                  mode: 'provider',
                  targetIds: ['green-channel-layer'],
                  ranges: [
                    { key: 'scaleY', val: 1.08, prog: 0 },
                    { key: 'scaleY', val: 0.96, prog: 0.5 },
                    { key: 'scaleY', val: 1, prog: 1 },
                  ],
                },
              },
            ]
          : []),
      ],
    } as RenderableComponentData);
  }

  // Blue Channel Layer
  if (blueConfig.enabled !== false) {
    childrenData.push({
      id: 'blue-channel-layer',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: sourceImage.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'multiply',
          filter: 'hue-rotate(240deg) contrast(180%) brightness(1.3)',
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0.1,
          duration: transitionDuration - 0.1,
        },
      },
      effects: [
        {
          id: 'blue-channel-glitch-x',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 4,
            start: 0,
            duration: transitionDuration - 0.1,
            mode: 'provider',
            targetIds: ['blue-channel-layer'],
            ranges: [
              { key: 'translateX', val: blueOffsetX, prog: 0 },
              { key: 'translateX', val: blueOffsetX * -1.25, prog: 0.25 },
              { key: 'translateX', val: blueOffsetX * 0.7, prog: 0.6 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'blue-channel-glitch-y',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 4,
            start: 0,
            duration: transitionDuration - 0.1,
            mode: 'provider',
            targetIds: ['blue-channel-layer'],
            ranges: [
              { key: 'translateY', val: blueOffsetY, prog: 0 },
              { key: 'translateY', val: blueOffsetY * -1.4, prog: 0.35 },
              { key: 'translateY', val: blueOffsetY * 0.6, prog: 0.65 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'blue-channel-opacity-flicker',
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 2,
            start: 0,
            duration: transitionDuration - 0.1,
            mode: 'provider',
            targetIds: ['blue-channel-layer'],
            ranges: [
              { key: 'opacity', val: 0.9, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        ...(stretchEnabled
          ? [
              {
                id: 'blue-channel-scale-x',
                componentId: 'generic',
                data: {
                  type: 'steps',
                  steps: 4,
                  start: 0,
                  duration: transitionDuration - 0.1,
                  mode: 'provider',
                  targetIds: ['blue-channel-layer'],
                  ranges: [
                    { key: 'scaleX', val: 1.1, prog: 0 },
                    { key: 'scaleX', val: 0.8, prog: 0.35 },
                    { key: 'scaleX', val: maxScaleX, prog: 0.65 },
                    { key: 'scaleX', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: 'blue-channel-scale-y',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: transitionDuration - 0.1,
                  mode: 'provider',
                  targetIds: ['blue-channel-layer'],
                  ranges: [
                    { key: 'scaleY', val: 0.95, prog: 0 },
                    { key: 'scaleY', val: maxScaleY, prog: 0.5 },
                    { key: 'scaleY', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: 'blue-channel-rotate',
                componentId: 'generic',
                data: {
                  type: 'steps',
                  steps: 4,
                  start: 0,
                  duration: transitionDuration - 0.1,
                  mode: 'provider',
                  targetIds: ['blue-channel-layer'],
                  ranges: [
                    { key: 'rotate', val: -2, prog: 0 },
                    { key: 'rotate', val: 3, prog: 0.4 },
                    { key: 'rotate', val: -1, prog: 0.7 },
                    { key: 'rotate', val: 0, prog: 1 },
                  ],
                },
              },
            ]
          : []),
      ],
    } as RenderableComponentData);
  }

  // Base Image Layer (subtle background)
  childrenData.push({
    id: 'base-image-layer',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: sourceImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'normal',
        opacity: 0.3,
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'base-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['base-image-layer'],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.1, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Scanline Overlay
  childrenData.push({
    id: 'scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, transparent 2px, transparent 4px); pointer-events: none; mix-blend-mode: overlay;"></div>',
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'scanline-opacity-flicker',
        componentId: 'generic',
        data: {
          type: 'steps',
          steps: 2,
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scanline-overlay'],
          ranges: [
            { key: 'opacity', val: scanlineIntensity * 0.5, prog: 0 },
            { key: 'opacity', val: scanlineIntensity * 1.3, prog: 0.3 },
            { key: 'opacity', val: scanlineIntensity * 0.7, prog: 0.6 },
            { key: 'opacity', val: scanlineIntensity, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Noise Overlay
  childrenData.push({
    id: 'noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22noise%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 /></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%220.4%22 /></svg>'); opacity: ${noiseIntensity}; mix-blend-mode: overlay; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'noise-opacity-flicker',
        componentId: 'generic',
        data: {
          type: 'steps',
          steps: 2,
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: noiseIntensity * 0.3, prog: 0 },
            { key: 'opacity', val: noiseIntensity * 1.3, prog: 0.2 },
            { key: 'opacity', val: noiseIntensity * 0.5, prog: 0.5 },
            { key: 'opacity', val: noiseIntensity, prog: 0.8 },
            { key: 'opacity', val: noiseIntensity * 0.2, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  const rootContainer: RenderableComponentData = {
    id: 'glitch-transition-container',
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
        duration: sourceImage.duration,
      },
    },
    childrenData,
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
  id: 'glitch-transition',
  title: 'Glitch Transition',
  description:
    'A digital glitch transition preset that simulates corrupted video frames with chromatic aberration, RGB channel separation, and data-mosh effects. Creates a VHS-meets-digital-compression aesthetic with erratic stepped animations, opacity flickers, and independent channel movements for a characteristic signal breakdown effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'rgb-separation',
    'chromatic-aberration',
    'vhs',
    'digital',
    'data-mosh',
    'corruption',
    'tech',
    'cyberpunk',
  ],
  defaultInputParams: {
    sourceImage: {
      src: 'https://example.com/image.jpg',
      duration: 3.0,
    },
    glitchIntensity: 'medium',
    transitionDuration: 1.0,
    rgbChannels: {
      red: { enabled: true },
      green: { enabled: true },
      blue: { enabled: true },
    },
    scanlineIntensity: 0.6,
    noiseIntensity: 0.3,
    pixelStretch: {
      enabled: true,
      maxScaleX: 1.5,
      maxScaleY: 1.1,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
