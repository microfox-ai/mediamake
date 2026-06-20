/**
 * Paper Shredder Transition Preset
 *
 * This preset creates a paper shredder transition effect where the outgoing video is divided
 * into 12 vertical strips that are pulled downward as if through a shredder. Each strip moves
 * at slightly different speeds and curls as it's pulled down, with paper dust particles emitting
 * from the shredding point. The incoming video is revealed from top to bottom as the strips disappear.
 *
 * Features:
 * - **12 Vertical Strips**: Outgoing video divided into equal vertical strips
 * - **Staggered Animation**: Each strip starts 0.1s after the previous one
 * - **Curl Effect**: Strips rotate slightly (rotateX) as they're pulled down
 * - **Stretch Effect**: Strips scale vertically (scaleY) for stretching appearance
 * - **Paper Dust Particles**: Animated particles at the top of the frame simulating paper dust
 * - **Top-to-Bottom Reveal**: Incoming video revealed using clip-path animation
 * - **Sound Effect Sync**: 1.6s overlap for mechanical shredder sound sync points
 *
 * Use cases:
 * - Creating dramatic scene transitions
 * - Document destruction effects
 * - Paper-themed transitions
 * - Mechanical/industrial video transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
  }),
  overlapDuration: z
    .number()
    .default(1.6)
    .describe('Duration of transition overlap in seconds'),
  stripCount: z
    .number()
    .default(12)
    .describe('Number of vertical strips to divide outgoing video into'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each strip animation in seconds'),
  particleCount: z
    .number()
    .default(16)
    .describe('Number of paper dust particles'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    stripCount,
    staggerDelay,
    particleCount,
  } = params;

  // Calculate strip width percentage
  const stripWidth = 100 / stripCount;

  // Create vertical strips for outgoing video
  const strips: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripId = `shredder-strip-${i}`;
    const videoId = `shredder-strip-video-${i}`;
    const leftPosition = i * stripWidth;

    // Calculate animation timing for this strip (staggered)
    const animationStart = i * staggerDelay;
    const animationDuration = overlapDuration - animationStart;

    // Create strip container
    strips.push({
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            left: `${leftPosition}%`,
            top: 0,
            width: `${stripWidth}%`,
            height: '100%',
          },
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
          id: `strip-shred-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: animationStart,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              // Pull down
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '120%', prog: 1 },
              // Stretch vertically
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 1.2, prog: 1 },
              // Curl effect (slight rotation)
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 15, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            muted: true,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${stripCount * 100}%`,
              height: '100%',
              objectFit: 'cover',
              marginLeft: `${-i * 100}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Create paper dust particles
  const particles: RenderableComponentData[] = [];

  for (let i = 0; i < particleCount; i++) {
    const particleId = `particle-${i}`;
    const leftPosition = (i / particleCount) * 100 + Math.random() * 5;
    const particleSize = 3 + Math.random() * 2; // 3-5px
    const opacity = 0.6 + Math.random() * 0.2; // 0.6-0.8
    const particleDelay = Math.random() * 0.5; // 0-0.5s
    const particleDuration = 0.8 + Math.random() * 0.4; // 0.8-1.2s

    particles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${particleSize}px; height: ${particleSize}px; background: rgba(255,255,255,${opacity}); border-radius: 50%;"></div>`,
        style: {
          position: 'absolute',
          left: `${leftPosition}%`,
          top: '0%',
        },
      },
      context: {
        timing: {
          start: particleDelay,
          duration: particleDuration,
        },
      },
      effects: [
        {
          id: `particle-fall-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: particleDuration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              // Fall down
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '100px', prog: 1 },
              // Fade out
              { key: 'opacity', val: opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              // Slight rotation
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: Math.random() * 360, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Incoming video with clip-path reveal (top to bottom)
  const incomingVideoComponent: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      muted: false,
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
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
        id: 'incoming-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Clip-path reveal from top to bottom
            { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paper-shredder-transition-container',
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
        duration: overlapDuration,
      },
    },
    childrenData: [
      // Incoming video (bottom layer)
      incomingVideoComponent,
      // Shredder strips container (middle layer)
      {
        id: 'shredder-strips-container',
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
            duration: overlapDuration,
          },
        },
        childrenData: strips,
      } as RenderableComponentData,
      // Particle container (top layer)
      {
        id: 'particle-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        childrenData: particles,
      } as RenderableComponentData,
    ],
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
  id: 'paper-shredder-transition',
  title: 'Paper Shredder Transition',
  description:
    'A transition effect where the outgoing video is divided into vertical strips that are pulled downward through a paper shredder with curling, stretching, and paper dust particles. The incoming video is revealed from top to bottom as strips disappear.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'paper-shredder',
    'vertical-strips',
    'curl',
    'particles',
    'reveal',
    'mechanical',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
    },
    overlapDuration: 1.6,
    stripCount: 12,
    staggerDelay: 0.1,
    particleCount: 16,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperShredderTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};