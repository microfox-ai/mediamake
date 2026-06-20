/**
 * Crystalline Prism Transition Preset
 *
 * This preset creates a mesmerizing transition effect where the outgoing video refracts through
 * animated prismatic shards that spiral outward with chromatic aberration, while the incoming
 * video assembles from similar shards spiraling inward. Features counter-rotating spiral motions,
 * RGB channel separation effects, and a bright white flash at the convergence point.
 *
 * Features:
 * - **Prismatic Shard Animation**: 18 triangular video shards arranged in circular pattern
 * - **Chromatic Aberration**: RGB channel separation using CSS drop-shadow filters
 * - **Counter-Rotating Spirals**: Outgoing shards spiral outward (0→360°), incoming spiral inward (360°→0°)
 * - **White Flash Convergence**: Bright white light flash at transition midpoint (0.9s)
 * - **Smooth Scaling**: Outgoing shards scale down (1→0), incoming shards scale up (0→1)
 * - **Spiral Path Motion**: translateX/Y with trigonometric calculations for spiral effect
 * - **Mix Blend Mode**: Screen blend mode for light interaction between shards
 * - **Z-Index Layering**: Outgoing (10-30), flash (50), incoming (31-49)
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Adding cinematic prism refraction effects
 * - Building kaleidoscope-style transitions
 * - Enhancing video sequences with chromatic effects
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
    startFrom: z.number().optional().describe('Start time of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(1.8).describe('Total duration of the transition in seconds'),
  shardCount: z.number().default(18).describe('Number of prismatic shards (must be even number)'),
  spiralRadius: z.number().default(300).describe('Maximum radius of spiral motion in pixels'),
  rotationSpeed: z.number().default(360).describe('Rotation degrees during transition'),
  flashIntensity: z.number().min(0).max(1).default(1).describe('Intensity of white flash (0-1)'),
  chromaticOffset: z.number().default(3).describe('Chromatic aberration offset in pixels'),
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
    shardCount,
    spiralRadius,
    rotationSpeed,
    flashIntensity,
    chromaticOffset,
  } = params;

  const overlapDuration = transitionDuration;
  const flashDuration = 0.1;
  const flashStart = (transitionDuration / 2) - (flashDuration / 2);

  // Helper function to generate triangular clip-path for shards arranged in a circle
  const generateClipPath = (index: number, total: number): string => {
    const angle = (index * 360) / total;
    const angleRad = (angle * Math.PI) / 180;
    const nextAngleRad = ((angle + 360 / total) * Math.PI) / 180;
    
    // Center point
    const cx = 50;
    const cy = 50;
    
    // Outer points (on circle)
    const radius = 15;
    const x1 = cx + radius * Math.cos(angleRad);
    const y1 = cy + radius * Math.sin(angleRad);
    const x2 = cx + radius * Math.cos(nextAngleRad);
    const y2 = cy + radius * Math.sin(nextAngleRad);
    
    return `polygon(${cx}% ${cy}%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  };

  // Helper function to calculate spiral motion path
  const calculateSpiralPath = (index: number, total: number, progress: number, isOutgoing: boolean): { x: number; y: number } => {
    const angle = (index * 360) / total;
    const angleRad = (angle * Math.PI) / 180;
    
    // Spiral outward or inward
    const radius = isOutgoing ? progress * spiralRadius : (1 - progress) * spiralRadius;
    
    return {
      x: radius * Math.cos(angleRad + (isOutgoing ? progress * 2 * Math.PI : -progress * 2 * Math.PI)),
      y: radius * Math.sin(angleRad + (isOutgoing ? progress * 2 * Math.PI : -progress * 2 * Math.PI)),
    };
  };

  // Create outgoing video shards (spiral outward, rotate, scale down)
  const outgoingShards: RenderableComponentData[] = [];
  for (let i = 0; i < shardCount; i++) {
    const clipPath = generateClipPath(i, shardCount);
    const zIndex = 10 + i;

    outgoingShards.push({
      id: `outgoing-shard-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom || 0,
        playbackRate: 1,
        muted: true,
        className: 'absolute',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath,
          filter: `drop-shadow(${chromaticOffset}px 0 0 #ff0000) drop-shadow(-${chromaticOffset}px 0 0 #0000ff)`,
          mixBlendMode: 'screen',
          zIndex,
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration / 2,
        },
      },
      effects: [
        {
          id: `outgoing-shard-${i}-spiral`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration / 2,
            mode: 'provider',
            targetIds: [`outgoing-shard-${i}`],
            ranges: [
              // Scale down
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              // Rotate
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationSpeed, prog: 1 },
              // Spiral outward - translateX
              { key: 'translateX', val: '-50%', prog: 0 },
              { key: 'translateX', val: `calc(-50% + ${calculateSpiralPath(i, shardCount, 1, true).x}px)`, prog: 1 },
              // Spiral outward - translateY
              { key: 'translateY', val: '-50%', prog: 0 },
              { key: 'translateY', val: `calc(-50% + ${calculateSpiralPath(i, shardCount, 1, true).y}px)`, prog: 1 },
              // Opacity fade
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.8 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video shards (spiral inward, counter-rotate, scale up)
  const incomingShards: RenderableComponentData[] = [];
  for (let i = 0; i < shardCount; i++) {
    const clipPath = generateClipPath(i, shardCount);
    const zIndex = 31 + i;

    incomingShards.push({
      id: `incoming-shard-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: incomingVideo.startFrom || 0,
        playbackRate: 1,
        muted: true,
        className: 'absolute',
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath,
          filter: `drop-shadow(${chromaticOffset}px 0 0 #ff0000) drop-shadow(-${chromaticOffset}px 0 0 #0000ff)`,
          mixBlendMode: 'screen',
          zIndex,
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: transitionDuration / 2,
          duration: transitionDuration / 2,
        },
      },
      effects: [
        {
          id: `incoming-shard-${i}-spiral`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration / 2,
            mode: 'provider',
            targetIds: [`incoming-shard-${i}`],
            ranges: [
              // Scale up
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Counter-rotate
              { key: 'rotate', val: rotationSpeed, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Spiral inward - translateX
              { key: 'translateX', val: `calc(-50% + ${calculateSpiralPath(i, shardCount, 1, false).x}px)`, prog: 0 },
              { key: 'translateX', val: '-50%', prog: 1 },
              // Spiral inward - translateY
              { key: 'translateY', val: `calc(-50% + ${calculateSpiralPath(i, shardCount, 1, false).y}px)`, prog: 0 },
              { key: 'translateY', val: '-50%', prog: 1 },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create white flash overlay at midpoint
  const flashOverlay: RenderableComponentData = {
    id: 'white-flash',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width:100%;height:100%;background:#ffffff;"></div>',
      className: 'absolute inset-0',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 50,
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: flashStart,
        duration: flashDuration,
      },
    },
    effects: [
      {
        id: 'flash-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['white-flash'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create container layout
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-prism-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [...outgoingShards, ...incomingShards, flashOverlay] as RenderableComponentData[],
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
  id: 'crystalline-prism-transition',
  title: 'Crystalline Prism Transition',
  description:
    'A mesmerizing transition where the outgoing video refracts through animated prismatic shards that spiral outward with chromatic aberration, while the incoming video assembles from similar shards spiraling inward. Features counter-rotating spiral motions, RGB channel separation effects, and a bright white flash at the convergence point.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'prism',
    'chromatic',
    'spiral',
    'refraction',
    'kaleidoscope',
    'shards',
    'rgb-split',
    'flash',
    'cinematic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.8,
    shardCount: 18,
    spiralRadius: 300,
    rotationSpeed: 360,
    flashIntensity: 1,
    chromaticOffset: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crystallinePrismTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
