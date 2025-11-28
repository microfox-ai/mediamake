/**
 * Broken Transmission Transition Preset
 *
 * Simulates a deteriorating satellite signal transition between videos with progressive
 * signal degradation effects including macro blocking, color banding, frame drops, and
 * interlacing artifacts.
 *
 * Features:
 * - **Progressive Signal Degradation**: Outgoing video experiences increasing compression artifacts
 * - **Macro Blocking Grid**: 16x9 grid of blocks that freeze, shift color, and drop out randomly
 * - **Pixelated Rendering**: Heavy pixelation effects with image-rendering: pixelated
 * - **Color Banding**: Posterize filter effect for reduced color depth
 * - **Interlacing Effect**: Alternating horizontal scan lines with varying opacity
 * - **Frame Drops Simulation**: Random block freezes at different times
 * - **Hue Shifts**: Random color channel shifts across macro blocks
 * - **Smooth Resolution**: Incoming video resolves from heavy pixelation to normal
 *
 * Use cases:
 * - Creating glitchy transitions between video clips
 * - Simulating broadcast signal deterioration
 * - Adding technical/cyberpunk aesthetic to transitions
 * - Creating retro digital artifact effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video (seconds)'),
    endAt: z.number().optional().describe('End time of outgoing video (seconds)'),
    playbackRate: z.number().optional().describe('Playback rate of outgoing video'),
    volume: z.number().optional().describe('Volume of outgoing video (0-1)'),
    fit: z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']).optional().describe('Object fit for outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video (seconds)'),
    endAt: z.number().optional().describe('End time of incoming video (seconds)'),
    playbackRate: z.number().optional().describe('Playback rate of incoming video'),
    volume: z.number().optional().describe('Volume of incoming video (0-1)'),
    fit: z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']).optional().describe('Object fit for incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z.number().default(0.9).describe('Duration of transition overlap in seconds'),
  
  macroBlockConfig: z.object({
    cols: z.number().default(16).describe('Number of macro block columns'),
    rows: z.number().default(9).describe('Number of macro block rows'),
    minOpacity: z.number().default(0.5).describe('Minimum opacity for macro blocks'),
    maxOpacity: z.number().default(1).describe('Maximum opacity for macro blocks'),
  }).optional().describe('Macro block grid configuration'),
  
  pixelationIntensity: z.number().default(0.25).describe('Pixelation scale factor (0.1-1, lower = more pixelated)'),
  
  posterizeLevels: z.number().default(8).describe('Color posterization levels (lower = more banding)'),
  
  interlacingOpacity: z.object({
    even: z.number().default(0.7).describe('Opacity for even scan lines'),
    odd: z.number().default(1).describe('Opacity for odd scan lines'),
  }).optional().describe('Interlacing scan line opacity'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;
  const macroBlockConfig = params.macroBlockConfig ?? { cols: 16, rows: 9, minOpacity: 0.5, maxOpacity: 1 };
  const pixelationIntensity = params.pixelationIntensity ?? 0.25;
  const posterizeLevels = params.posterizeLevels ?? 8;
  const interlacingOpacity = params.interlacingOpacity ?? { even: 0.7, odd: 1 };

  // Helper: Generate random hue rotation
  const getRandomHue = (): number => {
    return Math.floor(Math.random() * 360);
  };

  // Helper: Generate random opacity within range
  const getRandomOpacity = (): number => {
    return macroBlockConfig.minOpacity + Math.random() * (macroBlockConfig.maxOpacity - macroBlockConfig.minOpacity);
  };

  // Helper: Generate random freeze delay
  const getRandomFreezeDelay = (maxDelay: number): number => {
    return Math.random() * maxDelay;
  };

  // Calculate timing
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;
  const transitionStart = video1.duration - overlapDuration;

  // Generate macro blocks
  const macroBlocks: RenderableComponentData[] = [];
  const totalBlocks = macroBlockConfig.cols * macroBlockConfig.rows;

  for (let i = 0; i < totalBlocks; i++) {
    const col = i % macroBlockConfig.cols;
    const row = Math.floor(i / macroBlockConfig.cols);
    const blockWidth = 100 / macroBlockConfig.cols;
    const blockHeight = 100 / macroBlockConfig.rows;
    
    const randomHue = getRandomHue();
    const randomOpacity = getRandomOpacity();
    const freezeDelay = getRandomFreezeDelay(overlapDuration * 0.8);

    macroBlocks.push({
      id: `macro-block-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: transparent;"></div>`,
        className: 'absolute',
        style: {
          left: `${col * blockWidth}%`,
          top: `${row * blockHeight}%`,
          width: `${blockWidth}%`,
          height: `${blockHeight}%`,
          filter: `hue-rotate(${randomHue}deg)`,
          opacity: randomOpacity,
          imageRendering: 'pixelated' as any,
          pointerEvents: 'none' as any,
          mixBlendMode: 'overlay' as any,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `block-flicker-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: freezeDelay,
            duration: overlapDuration - freezeDelay,
            mode: 'provider',
            targetIds: [`macro-block-${i}`],
            ranges: [
              { key: 'opacity', val: randomOpacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.3 },
              { key: 'opacity', val: randomOpacity, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Generate interlacing lines
  const interlacingLines: RenderableComponentData[] = [];
  const lineCount = 60; // Number of horizontal scan lines

  for (let i = 0; i < lineCount; i++) {
    const isEven = i % 2 === 0;
    const lineOpacity = isEven ? interlacingOpacity.even : interlacingOpacity.odd;
    const lineHeight = 100 / lineCount;

    interlacingLines.push({
      id: `interlace-line-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: rgba(0, 0, 0, ${1 - lineOpacity});"></div>`,
        className: 'absolute',
        style: {
          left: '0%',
          top: `${i * lineHeight}%`,
          width: '100%',
          height: `${lineHeight}%`,
          pointerEvents: 'none' as any,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
    } as RenderableComponentData);
  }

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            imageRendering: 'pixelated' as any,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            startFrom: video1.startFrom ?? 0,
            endAt: video1.endAt,
            playbackRate: video1.playbackRate ?? 1,
            volume: video1.volume ?? 1,
            fit: video1.fit ?? 'cover',
            className: 'w-full h-full object-cover',
            style: {
              imageRendering: 'pixelated' as any,
              filter: `contrast(1.2) saturate(0.8) url(#posterize-${posterizeLevels})`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-degradation',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: transitionStart,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: pixelationIntensity, prog: 0.5 },
                  { key: 'scale', val: 1, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            imageRendering: 'pixelated' as any,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: video2.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            startFrom: video2.startFrom ?? 0,
            endAt: video2.endAt,
            playbackRate: video2.playbackRate ?? 1,
            volume: video2.volume ?? 1,
            fit: video2.fit ?? 'cover',
            className: 'w-full h-full object-cover',
            style: {
              imageRendering: 'pixelated' as any,
              filter: `contrast(1.2) saturate(0.8) url(#posterize-${posterizeLevels})`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + overlapDuration,
            },
          },
          effects: [
            {
              id: 'incoming-resolution',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'scale', val: pixelationIntensity, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Macro block layer
    {
      id: 'macro-block-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            imageRendering: 'pixelated' as any,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: overlapDuration,
        },
      },
      childrenData: macroBlocks,
    } as RenderableComponentData,

    // Interlacing layer
    {
      id: 'interlacing-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: overlapDuration,
        },
      },
      childrenData: interlacingLines,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'broken-transmission-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-black',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'broken-transmission-transition',
  title: 'Broken Transmission Transition',
  description: 'Simulates a deteriorating satellite signal transition between videos with macro blocking, color banding, frame drops, and interlacing effects. Features progressive signal degradation with pixelated grid system where blocks freeze, shift color, and drop out randomly.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glitch', 'signal', 'degradation', 'transmission', 'macro-blocking', 'pixelated', 'interlacing', 'cyberpunk'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
      fit: 'cover',
      volume: 1,
      playbackRate: 1,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
      fit: 'cover',
      volume: 1,
      playbackRate: 1,
    },
    overlapDuration: 0.9,
    macroBlockConfig: {
      cols: 16,
      rows: 9,
      minOpacity: 0.5,
      maxOpacity: 1,
    },
    pixelationIntensity: 0.25,
    posterizeLevels: 8,
    interlacingOpacity: {
      even: 0.7,
      odd: 1,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const brokenTransmissionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
