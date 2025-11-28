/**
 * Glitch Mosaic Transition Preset
 *
 * A chaotic digital glitch transition combining RGB channel splits, data moshing blocks,
 * scan lines, noise patterns, and color inversions. The outgoing video corrupts into
 * digital artifacts before reassembling as the incoming video, with peak glitch intensity
 * at the transition midpoint.
 *
 * Features:
 * - RGB channel splitting with chromatic aberration
 * - Data moshing blocks with blend modes
 * - Animated scan lines
 * - Random noise overlays
 * - Color inversion effects
 * - Jitter and displacement animations
 * - Peak intensity at transition midpoint
 *
 * Use cases:
 * - Tech/cyberpunk video transitions
 * - Glitch art effects
 * - Digital corruption aesthetics
 * - Music video transitions
 * - Error/malfunction visual effects
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
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video data'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video data'),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const transitionStart = video1.duration - overlapDuration;
  const transitionEnd = video1.duration;
  const transitionMidpoint = transitionStart + overlapDuration / 2;

  // Helper: Generate random glitch block properties
  const generateGlitchBlocks = (count: number) => {
    const blocks: RenderableComponentData[] = [];
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'];
    
    for (let i = 0; i < count; i++) {
      const width = Math.random() * 200 + 50; // 50-250px
      const height = Math.random() * 100 + 30; // 30-130px
      const top = Math.random() * 80; // 0-80%
      const left = Math.random() * 80; // 0-80%
      const color = colors[Math.floor(Math.random() * colors.length)];

      blocks.push({
        id: `glitch-block-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          className: 'absolute',
          style: {
            width: `${width}px`,
            height: `${height}px`,
            top: `${top}%`,
            left: `${left}%`,
            backgroundColor: color,
            mixBlendMode: 'difference',
            opacity: 0,
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
            id: `glitch-block-flicker-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: transitionStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [`glitch-block-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.1 },
                { key: 'opacity', val: 0, prog: 0.15 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.4 },
                { key: 'opacity', val: 0, prog: 0.45 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 0.55 },
                { key: 'opacity', val: 1, prog: 0.6 },
                { key: 'opacity', val: 0, prog: 0.8 },
                { key: 'opacity', val: 1, prog: 0.85 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return blocks;
  };

  // Generate 20 glitch blocks
  const glitchBlocks = generateGlitchBlocks(20);

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: transitionStart,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB Split Layer - Red Channel
    {
      id: 'red-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: 'sepia(1) hue-rotate(300deg) saturate(10)',
          mixBlendMode: 'screen',
          opacity: 0,
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
          id: 'red-channel-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['red-channel'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'red-channel-jitter',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['red-channel'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '-5px', prog: 0.1 },
              { key: 'translateX', val: '8px', prog: 0.2 },
              { key: 'translateX', val: '-3px', prog: 0.3 },
              { key: 'translateX', val: '10px', prog: 0.5 },
              { key: 'translateX', val: '-7px', prog: 0.7 },
              { key: 'translateX', val: '4px', prog: 0.8 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB Split Layer - Green Channel
    {
      id: 'green-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: 'sepia(1) hue-rotate(100deg) saturate(10)',
          mixBlendMode: 'screen',
          opacity: 0,
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
          id: 'green-channel-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['green-channel'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'green-channel-jitter',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['green-channel'],
            ranges: [
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '6px', prog: 0.15 },
              { key: 'translateY', val: '-8px', prog: 0.3 },
              { key: 'translateY', val: '10px', prog: 0.5 },
              { key: 'translateY', val: '-5px', prog: 0.7 },
              { key: 'translateY', val: '3px', prog: 0.85 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB Split Layer - Blue Channel
    {
      id: 'blue-channel',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: 'sepia(1) hue-rotate(200deg) saturate(10)',
          mixBlendMode: 'screen',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'blue-channel-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['blue-channel'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'blue-channel-jitter',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['blue-channel'],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '7px', prog: 0.1 },
              { key: 'translateX', val: '-10px', prog: 0.25 },
              { key: 'translateX', val: '5px', prog: 0.4 },
              { key: 'translateX', val: '-8px', prog: 0.6 },
              { key: 'translateX', val: '6px', prog: 0.75 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Scan lines overlay
    {
      id: 'scanline-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          opacity: 0,
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
          id: 'scanline-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['scanline-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'scanline-animation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['scanline-overlay'],
            ranges: [
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '-100px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Glitch blocks
    ...glitchBlocks,

    // Noise overlay (using solid color since we can't use external URLs)
    {
      id: 'noise-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          mixBlendMode: 'overlay',
          opacity: 0,
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
          id: 'noise-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['noise-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.2 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'glitch-mosaic-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'glitch-mosaic-transition',
  title: 'Glitch Mosaic Transition',
  description:
    'A chaotic digital glitch transition combining RGB channel splits, data moshing blocks, scan lines, noise patterns, and color inversions. The outgoing video corrupts into digital artifacts before reassembling as the incoming video, with peak glitch intensity at the transition midpoint.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glitch', 'rgb-split', 'mosaic', 'digital', 'cyberpunk'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchMosaicTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
