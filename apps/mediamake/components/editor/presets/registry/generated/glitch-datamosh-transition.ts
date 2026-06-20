/**
 * Glitch Datamosh Video Transition Preset
 *
 * Creates a glitch-style datamosh transition that simulates video compression artifacts
 * and pixel sorting effects between video clips. Features horizontal scan lines with
 * random offsets, digital noise patterns, RGB channel splitting with hue-rotated layers,
 * and multiple blend modes (screen, overlay, difference) to create authentic datamosh
 * glitch effects.
 *
 * Technical features:
 * - Multiple glitch layers with different blend modes
 * - RGB channel splitting using hue-rotation filters
 * - Rapid position and opacity toggling for glitch effect
 * - Scanline overlay with repeating gradient
 * - 800ms transition duration with crossfade base
 * - Overflow-hidden container for proper clipping
 *
 * Use cases:
 * - Tech/cyberpunk video transitions
 * - Music video effects
 * - Glitch art compositions
 * - Digital corruption aesthetics
 * - Modern/edgy social media content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the glitch transition in seconds (default: 0.8s)'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for glitch effects (0.1-2, default: 1)'),
  rgbSplitAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Amount of RGB channel separation in pixels (default: 2px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    glitchIntensity,
    rgbSplitAmount,
  } = params;

  // Calculate timing
  const intensity = glitchIntensity ?? 1;
  const rgbSplit = rgbSplitAmount ?? 2;
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;
  const transitionStart = outgoingVideoDuration - transitionDuration;

  // Glitch layer animation intervals (rapid toggling)
  const glitchIntervals = 0.1; // 100ms intervals for rapid glitch
  const numGlitchKeyframes = Math.ceil(transitionDuration / glitchIntervals);

  // Helper: Generate random glitch positions
  const generateGlitchPositions = () => {
    const positions: Array<{ key: string; val: string; prog: number }> = [];
    for (let i = 0; i <= numGlitchKeyframes; i++) {
      const progress = i / numGlitchKeyframes;
      const offsetX = (Math.random() - 0.5) * 10 * intensity; // -5 to 5 scaled by intensity
      positions.push({
        key: 'translateX',
        val: `${offsetX}px`,
        prog: progress,
      });
    }
    return positions;
  };

  // Helper: Generate opacity flicker pattern
  const generateOpacityFlicker = () => {
    const pattern: Array<{ key: string; val: number; prog: number }> = [];
    for (let i = 0; i <= numGlitchKeyframes; i++) {
      const progress = i / numGlitchKeyframes;
      const flickerValues = [1, 0, 0.5];
      const opacityVal = flickerValues[i % 3] * intensity;
      pattern.push({
        key: 'opacity',
        val: Math.min(opacityVal, 1),
        prog: progress,
      });
    }
    return pattern;
  };

  const childrenData: RenderableComponentData[] = [
    // Main outgoing video - fades out
    {
      id: 'outgoing-video-main',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-main'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Main incoming video - fades in
    {
      id: 'incoming-video-main',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-main'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Glitch layer 1 - screen blend mode with horizontal offset
    {
      id: 'glitch-layer-1',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 2,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'glitch-1-position',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-layer-1'],
            ranges: generateGlitchPositions(),
          },
        },
        {
          id: 'glitch-1-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-layer-1'],
            ranges: generateOpacityFlicker(),
          },
        },
      ],
    } as RenderableComponentData,

    // Glitch layer 2 - overlay blend mode
    {
      id: 'glitch-layer-2',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 3,
          mixBlendMode: 'overlay',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'glitch-2-position',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-layer-2'],
            ranges: generateGlitchPositions(),
          },
        },
        {
          id: 'glitch-2-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-layer-2'],
            ranges: generateOpacityFlicker(),
          },
        },
      ],
    } as RenderableComponentData,

    // Glitch layer 3 - difference blend mode
    {
      id: 'glitch-layer-3',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 4,
          mixBlendMode: 'difference',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'glitch-3-position',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-layer-3'],
            ranges: generateGlitchPositions(),
          },
        },
        {
          id: 'glitch-3-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-layer-3'],
            ranges: generateOpacityFlicker(),
          },
        },
      ],
    } as RenderableComponentData,

    // RGB split red channel (hue-rotate 120deg)
    {
      id: 'rgb-split-red',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 5,
          mixBlendMode: 'screen',
          filter: 'hue-rotate(120deg)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-red-offset',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-split-red'],
            ranges: [
              { key: 'translateX', val: `${-rgbSplit}px`, prog: 0 },
              { key: 'translateX', val: `${-rgbSplit}px`, prog: 1 },
            ],
          },
        },
        {
          id: 'rgb-red-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-split-red'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7 * intensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB split green channel (hue-rotate 240deg)
    {
      id: 'rgb-split-green',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 6,
          mixBlendMode: 'screen',
          filter: 'hue-rotate(240deg)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-green-offset',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-split-green'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
        {
          id: 'rgb-green-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-split-green'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7 * intensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB split blue channel (no hue rotation)
    {
      id: 'rgb-split-blue',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        loop: false,
        muted: true,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 7,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-blue-offset',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-split-blue'],
            ranges: [
              { key: 'translateX', val: `${rgbSplit}px`, prog: 0 },
              { key: 'translateX', val: `${rgbSplit}px`, prog: 1 },
            ],
          },
        },
        {
          id: 'rgb-blue-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-split-blue'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7 * intensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Scanline overlay
    {
      id: 'scanline-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px); pointer-events: none;"></div>',
        className: 'absolute inset-0',
        style: {
          zIndex: 8,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'glitch-datamosh-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'glitch-datamosh-transition',
  title: 'Glitch Datamosh Video Transition',
  description:
    'A glitch-style datamosh transition that simulates video compression artifacts and pixel sorting effects between video clips. Features horizontal scan lines with random offsets, digital noise patterns, RGB channel splitting with hue-rotated layers, and multiple blend modes (screen, overlay, difference) to create authentic datamosh glitch effects. Transition duration is 800ms with rapid visibility toggles and position shifts for glitch layers while main videos crossfade underneath.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'datamosh',
    'video',
    'effects',
    'rgb-split',
    'compression-artifacts',
    'digital-noise',
    'cyberpunk',
    'tech',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 0.8,
    glitchIntensity: 1,
    rgbSplitAmount: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchDatamoshTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
