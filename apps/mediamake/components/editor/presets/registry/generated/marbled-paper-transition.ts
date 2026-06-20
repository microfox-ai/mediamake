/**
 * Marbled Paper Transition Preset
 *
 * Creates a hypnotic transition effect that simulates oil-based inks floating on water,
 * with swirling videos that blend together organically. The effect features:
 *
 * - 2.8-second slow, hypnotic overlap where both videos swirl together
 * - Multiple rotation points creating authentic marbling patterns
 * - RGB channel splitting (red/cyan shadows) at peak transition for liquid ink effect
 * - Animated vein-like lines mimicking characteristic marbled paper patterns
 * - Natural deceleration as the transition completes (ink settling on paper)
 *
 * Technical implementation:
 * - Both videos rotate simultaneously with different transform origins
 * - Origins cycle between corners and center (0% 0%, 100% 100%, 50% 50%)
 * - Color channel splitting using drop-shadow filters (±2px red/cyan offset)
 * - 15 vein lines animating across bezier curve paths
 * - Cubic-bezier easing for natural deceleration
 *
 * Use cases:
 * - Artistic video transitions with organic flow
 * - Creative storytelling with liquid, flowing aesthetics
 * - Psychedelic or abstract visual effects
 * - Brand videos requiring unique, memorable transitions
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.8)
    .describe('Duration of the marbling transition overlap in seconds'),
  rotationIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Rotation intensity in degrees (±)'),
  channelSplitIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('RGB channel split intensity in pixels'),
  veinLineCount: z
    .number()
    .int()
    .min(10)
    .max(25)
    .default(15)
    .describe('Number of vein lines to animate'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    rotationIntensity,
    channelSplitIntensity,
    veinLineCount,
  } = params;

  // Calculate total duration (overlap reduces total time)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Generate vein line positions and animations
  const generateVeinLines = (count: number): RenderableComponentData[] => {
    const lines: RenderableComponentData[] = [];
    
    for (let i = 0; i < count; i++) {
      const verticalPosition = (i / (count - 1)) * 100; // Distribute 0-100%
      const opacity = 0.15 + Math.random() * 0.1; // 0.15-0.25 opacity variation
      const animationDelay = (i / count) * transitionDuration * 0.3; // Stagger animations
      const animationDuration = transitionDuration * 0.7; // Most of transition
      
      lines.push({
        id: `vein-line-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute h-px w-full pointer-events-none',
            style: {
              top: `${verticalPosition}%`,
              left: '0',
              background: `linear-gradient(to right, transparent, rgba(0,0,0,${opacity}), transparent)`,
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
            id: `vein-animate-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: animationDelay,
              duration: animationDuration,
              mode: 'provider',
              targetIds: [`vein-line-${i}`],
              ranges: [
                // Bezier curve path simulation using translateX and translateY
                { key: 'translateX', val: '-10%', prog: 0 },
                { key: 'translateX', val: '5%', prog: 0.3 },
                { key: 'translateX', val: '-3%', prog: 0.6 },
                { key: 'translateX', val: '0%', prog: 1 },
                { key: 'translateY', val: `${Math.sin(i) * 3}px`, prog: 0 },
                { key: 'translateY', val: `${Math.cos(i) * 2}px`, prog: 0.5 },
                { key: 'translateY', val: '0px', prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return lines;
  };

  // Outgoing video with swirl and channel split effects
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        effects: [],
      } as RenderableComponentData,
    ],
    effects: [
      // Swirl rotation with changing transform origins
      {
        id: 'outgoing-swirl-1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration * 0.33,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationIntensity, prog: 1 },
            { key: 'transformOrigin', val: '0% 0%', prog: 0 },
            { key: 'transformOrigin', val: '0% 0%', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-swirl-2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration * 0.67,
          duration: transitionDuration * 0.33,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotate', val: rotationIntensity, prog: 0 },
            { key: 'rotate', val: -rotationIntensity * 0.5, prog: 1 },
            { key: 'transformOrigin', val: '100% 100%', prog: 0 },
            { key: 'transformOrigin', val: '100% 100%', prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-swirl-3',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingVideo.duration - transitionDuration * 0.34,
          duration: transitionDuration * 0.34,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotate', val: -rotationIntensity * 0.5, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'transformOrigin', val: '50% 50%', prog: 0 },
            { key: 'transformOrigin', val: '50% 50%', prog: 1 },
          ],
        },
      },
      // RGB channel splitting (peak at midpoint, fade to normal)
      {
        id: 'outgoing-channel-split',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(0px 0px 0px rgba(255,0,0,0)) drop-shadow(0px 0px 0px rgba(0,255,255,0))',
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(${channelSplitIntensity}px 0 0 rgba(255,0,0,0.8)) drop-shadow(-${channelSplitIntensity}px 0 0 rgba(0,255,255,0.8))`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0px 0px 0px rgba(255,0,0,0)) drop-shadow(0px 0px 0px rgba(0,255,255,0))',
              prog: 1,
            },
          ],
        },
      },
      // Fade out
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration * 0.4,
          duration: transitionDuration * 0.4,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with swirl and channel split effects
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
        effects: [],
      } as RenderableComponentData,
    ],
    effects: [
      // Swirl rotation with changing transform origins
      {
        id: 'incoming-swirl-1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration * 0.33,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'rotate', val: -rotationIntensity, prog: 0 },
            { key: 'rotate', val: rotationIntensity * 0.5, prog: 1 },
            { key: 'transformOrigin', val: '100% 0%', prog: 0 },
            { key: 'transformOrigin', val: '100% 0%', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-swirl-2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionDuration * 0.33,
          duration: transitionDuration * 0.33,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'rotate', val: rotationIntensity * 0.5, prog: 0 },
            { key: 'rotate', val: -rotationIntensity * 0.3, prog: 1 },
            { key: 'transformOrigin', val: '0% 100%', prog: 0 },
            { key: 'transformOrigin', val: '0% 100%', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-swirl-3',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionDuration * 0.66,
          duration: transitionDuration * 0.34,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'rotate', val: -rotationIntensity * 0.3, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'transformOrigin', val: '50% 50%', prog: 0 },
            { key: 'transformOrigin', val: '50% 50%', prog: 1 },
          ],
        },
      },
      // RGB channel splitting (start strong, normalize by end)
      {
        id: 'incoming-channel-split',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            {
              key: 'filter',
              val: `drop-shadow(${channelSplitIntensity}px 0 0 rgba(255,0,0,0.8)) drop-shadow(-${channelSplitIntensity}px 0 0 rgba(0,255,255,0.8))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(${channelSplitIntensity * 1.2}px 0 0 rgba(255,0,0,0.9)) drop-shadow(-${channelSplitIntensity * 1.2}px 0 0 rgba(0,255,255,0.9))`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0px 0px 0px rgba(255,0,0,0)) drop-shadow(0px 0px 0px rgba(0,255,255,0))',
              prog: 1,
            },
          ],
        },
      },
      // Fade in
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Vein lines container
  const veinLinesContainer: RenderableComponentData = {
    id: 'vein-lines-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: generateVeinLines(veinLineCount),
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'marbled-paper-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoNode,
      incomingVideoNode,
      veinLinesContainer,
    ] as RenderableComponentData[],
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
  id: 'marbled-paper-transition',
  title: 'Marbled Paper Transition',
  description:
    'A hypnotic oil-on-water marbling transition effect that swirls two videos together using rotating transforms, RGB channel splitting at peak transition, and animated vein-like lines. Creates an organic, liquid ink appearance with natural deceleration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'marbled',
    'swirl',
    'organic',
    'liquid',
    'artistic',
    'creative',
    'channel-split',
    'rgb',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.8,
    rotationIntensity: 5,
    channelSplitIntensity: 2,
    veinLineCount: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const marbledPaperTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
