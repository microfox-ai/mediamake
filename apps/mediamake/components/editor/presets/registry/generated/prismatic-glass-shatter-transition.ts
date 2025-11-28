/**
 * Prismatic Glass Shatter Transition
 *
 * A crystalline glass shatter transition where the outgoing video fragments into 16 triangular
 * shards that refract light, blur, and rotate independently before revealing the incoming video.
 * Each shard has staggered blur (0px→15px), subtle rotation (-5deg to 5deg), and iridescent
 * hue-rotate animations cycling at different speeds to simulate light refraction through glass.
 * The incoming video uses complementary inverse blur (20px→0px), scale (1.1→1.0), and brightness
 * effects (70%→100%).
 *
 * Features:
 * - 16 triangular glass shards covering the full frame
 * - Independent blur progression (0px→15px) per shard with staggered timing
 * - Subtle rotation animations (-5deg to 5deg) with staggered delays
 * - Iridescent hue-rotate cycling (0deg→360deg) at different speeds per shard
 * - Incoming video with inverse blur (20px→0px), scale (1.1→1.0), brightness (70%→100%)
 * - Overlap transition: 1.8s
 * - BaseLayout duration = video1.duration + video2.duration - 1.8s
 *
 * Use cases:
 * - Creating dramatic crystalline transition effects between videos
 * - Simulating glass shattering and light refraction
 * - Adding prismatic dispersion effects to video transitions
 * - Professional video transitions with complex visual effects
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
    startFrom: z.number().optional().describe('Start time for outgoing video playback'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
    startFrom: z.number().optional().describe('Start time for incoming video playback'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(1.8).describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate BaseLayout duration with overlap
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;
  const overlapStart = video1.duration - transitionDuration;

  // Define 16 triangular shard clip-paths covering the full frame (4x4 grid pattern)
  const shardClipPaths = [
    // Row 1
    'polygon(0% 0%, 25% 0%, 12.5% 25%)',
    'polygon(25% 0%, 50% 0%, 37.5% 25%, 12.5% 25%)',
    'polygon(50% 0%, 75% 0%, 62.5% 25%, 37.5% 25%)',
    'polygon(75% 0%, 100% 0%, 87.5% 25%, 62.5% 25%)',
    // Row 2
    'polygon(12.5% 25%, 37.5% 25%, 25% 50%, 0% 50%)',
    'polygon(37.5% 25%, 62.5% 25%, 50% 50%, 25% 50%)',
    'polygon(62.5% 25%, 87.5% 25%, 75% 50%, 50% 50%)',
    'polygon(87.5% 25%, 100% 25%, 100% 50%, 75% 50%)',
    // Row 3
    'polygon(0% 50%, 25% 50%, 12.5% 75%)',
    'polygon(25% 50%, 50% 50%, 37.5% 75%, 12.5% 75%)',
    'polygon(50% 50%, 75% 50%, 62.5% 75%, 37.5% 75%)',
    'polygon(75% 50%, 100% 50%, 100% 75%, 62.5% 75%)',
    // Row 4
    'polygon(12.5% 75%, 37.5% 75%, 25% 100%, 0% 100%)',
    'polygon(37.5% 75%, 62.5% 75%, 50% 100%, 25% 100%)',
    'polygon(62.5% 75%, 87.5% 75%, 75% 100%, 50% 100%)',
    'polygon(87.5% 75%, 100% 75%, 100% 100%, 75% 100%)',
  ];

  // Generate random rotation values for each shard (-5deg to 5deg)
  const getRandomRotation = () => {
    return (Math.random() * 10 - 5).toFixed(2);
  };

  // Generate hue-rotate animation speeds for each shard (0.5s to 1.5s)
  const getRandomHueRotateSpeed = () => {
    return (0.5 + Math.random() * 1.0).toFixed(2);
  };

  // Create 16 shard containers
  const shardContainers: RenderableComponentData[] = shardClipPaths.map((clipPath, index) => {
    const shardDelay = index * 0.03; // Staggered delay per shard
    const rotationValue = getRandomRotation();
    const hueRotateSpeed = parseFloat(getRandomHueRotateSpeed());
    const blurDuration = 0.8 + (index % 4) * 0.1; // Vary blur duration (0.8s-1.1s)

    return {
      id: `shard-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: clipPath,
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Blur effect (0px→15px) starting at overlap with staggered timing
        {
          id: `shard-${index}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: overlapStart + shardDelay,
            duration: blurDuration,
            mode: 'provider',
            targetIds: [`shard-${index}`],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(15px)', prog: 1 },
            ],
          },
        },
        // Opacity fade (1→0) starting midway through transition
        {
          id: `shard-${index}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: overlapStart + 0.5 + (index * 0.02),
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: [`shard-${index}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Rotation effect (0deg→random(-5deg, 5deg))
        {
          id: `shard-${index}-rotate`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: overlapStart + (index * 0.025),
            duration: 0.6,
            mode: 'provider',
            targetIds: [`shard-${index}`],
            ranges: [
              { key: 'rotate', val: '0deg', prog: 0 },
              { key: 'rotate', val: `${rotationValue}deg`, prog: 1 },
            ],
          },
        },
        // Hue-rotate animation (0deg→360deg) cycling at different speeds
        {
          id: `shard-${index}-hue`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: overlapStart,
            duration: hueRotateSpeed,
            mode: 'provider',
            targetIds: [`shard-${index}`],
            ranges: [
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
              { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `shard-${index}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            startFrom: video1.startFrom || 0,
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Incoming video layer (below shards, z-index 0)
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: overlapStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      // Inverse blur effect (20px→0px) during first 0.6s of overlap
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Scale effect (1.1→1.0) during first 0.8s of overlap
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'scale', val: 1.1, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
      // Brightness effect (70%→100%) during first 0.4s of overlap
      {
        id: 'incoming-brightness',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'filter', val: 'brightness(0.7)', prog: 0 },
            { key: 'filter', val: 'brightness(1)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          startFrom: video2.startFrom || 0,
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Shards container (above incoming video, z-index 1)
  const shardsContainer: RenderableComponentData = {
    id: 'shards-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: shardContainers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-glass-shatter-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: [incomingVideoLayer, shardsContainer],
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
  id: 'prismatic-glass-shatter-transition',
  title: 'Prismatic Glass Shatter Transition',
  description: 'A crystalline glass shatter transition where the outgoing video fragments into 16 triangular shards with independent blur, rotation, and iridescent hue-rotate animations simulating light refraction. The incoming video reveals beneath with inverse blur and scale effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glass', 'shatter', 'prismatic', 'crystalline', 'refraction', 'blur', 'hue-rotate'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 10,
      startFrom: 0,
    },
    video2: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 10,
      startFrom: 0,
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticGlassShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
