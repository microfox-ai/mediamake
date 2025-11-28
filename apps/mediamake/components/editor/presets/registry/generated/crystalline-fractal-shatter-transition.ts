/**
 * Crystalline Fractal Shatter Transition
 *
 * A mesmerizing transition where the outgoing video shatters into triangular 
 * glass-like shards that replicate fractally and spiral outward, then the incoming 
 * video assembles from these scattered pieces spiraling inward.
 *
 * Features:
 * - 24 triangular shards with glass-like refraction effects
 * - Backdrop-filter blur and brightness for crystalline appearance
 * - Fractal replication pattern (shards split into smaller versions)
 * - Spiral cascade outward for outgoing video
 * - Reverse spiral inward for incoming video
 * - 720° rotation during transition
 * - Camera shake effect at peak transition moment
 * - 2.5-second overlap period
 *
 * Use cases:
 * - High-impact video transitions
 * - Crystal/glass-themed content
 * - Dynamic scene changes
 * - Music video effects
 * - Abstract visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameters schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the shatter transition overlap in seconds'),
  shardCount: z
    .number()
    .default(24)
    .describe('Number of triangular shards to create'),
  rotationDegrees: z
    .number()
    .default(720)
    .describe('Total rotation in degrees during transition'),
  spiralRadius: z
    .number()
    .default(300)
    .describe('Maximum spiral radius in pixels'),
  blurAmount: z
    .number()
    .default(2)
    .describe('Backdrop blur amount in pixels'),
  brightnessAmount: z
    .number()
    .default(1.2)
    .describe('Brightness multiplier for glass effect'),
  shakeIntensity: z
    .number()
    .default(10)
    .describe('Camera shake intensity in pixels'),
  shakeDuration: z
    .number()
    .default(0.2)
    .describe('Camera shake duration in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    shardCount,
    rotationDegrees,
    spiralRadius,
    blurAmount,
    brightnessAmount,
    shakeIntensity,
    shakeDuration,
  } = params;

  // Calculate total duration (with overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;
  const transitionStart = video1.duration - transitionDuration;

  // Helper: Generate triangular clip-path
  const generateTriangleClipPath = (index: number, total: number): string => {
    const angle = (index / total) * Math.PI * 2;
    const nextAngle = ((index + 1) / total) * Math.PI * 2;
    
    // Triangle from center to edge
    const cx = 50;
    const cy = 50;
    const radius = 50;
    
    const x1 = cx + Math.cos(angle) * radius;
    const y1 = cy + Math.sin(angle) * radius;
    const x2 = cx + Math.cos(nextAngle) * radius;
    const y2 = cy + Math.sin(nextAngle) * radius;
    
    return `polygon(${cx}% ${cy}%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  };

  // Helper: Calculate spiral position
  const calculateSpiralPosition = (
    index: number,
    total: number,
    radius: number,
  ): { x: number; y: number } => {
    const angle = (index / total) * Math.PI * 4; // Multiple spirals
    const distance = radius * (index / total);
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper: Generate shard effects (outgoing)
  const generateOutgoingShardEffects = (
    shardId: string,
    index: number,
    total: number,
  ) => {
    const delay = (index / total) * 0.5; // Stagger over 0.5s
    const position = calculateSpiralPosition(index, total, spiralRadius);
    
    return [
      {
        id: `${shardId}-transform`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: delay,
          duration: transitionDuration - delay,
          mode: 'provider',
          targetIds: [shardId],
          ranges: [
            // Spiral outward
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: `${position.x}px`, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: `${position.y}px`, prog: 1 },
            // Scale down (fractal shrinking)
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.3, prog: 1 },
            // Rotate
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];
  };

  // Helper: Generate shard effects (incoming)
  const generateIncomingShardEffects = (
    shardId: string,
    index: number,
    total: number,
  ) => {
    const delay = ((total - index) / total) * 0.5; // Reverse stagger
    const position = calculateSpiralPosition(index, total, spiralRadius);
    
    return [
      {
        id: `${shardId}-transform`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: delay,
          duration: transitionDuration - delay,
          mode: 'provider',
          targetIds: [shardId],
          ranges: [
            // Spiral inward
            { key: 'translateX', val: `${position.x}px`, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: `${position.y}px`, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Scale up
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Rotate (reverse)
            { key: 'rotate', val: rotationDegrees, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ];
  };

  // Generate outgoing shards
  const outgoingShards: RenderableComponentData[] = [];
  for (let i = 0; i < shardCount; i++) {
    const shardId = `shard-out-${i}`;
    const clipPath = generateTriangleClipPath(i, shardCount);
    
    outgoingShards.push({
      id: shardId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath,
            backdropFilter: `blur(${blurAmount}px) brightness(${brightnessAmount})`,
            WebkitBackdropFilter: `blur(${blurAmount}px) brightness(${brightnessAmount})`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: generateOutgoingShardEffects(shardId, i, shardCount),
      childrenData: [
        {
          id: `${shardId}-video`,
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
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Generate incoming shards
  const incomingShards: RenderableComponentData[] = [];
  for (let i = 0; i < shardCount; i++) {
    const shardId = `shard-in-${i}`;
    const clipPath = generateTriangleClipPath(i, shardCount);
    
    incomingShards.push({
      id: shardId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath,
            backdropFilter: `blur(${blurAmount}px) brightness(${brightnessAmount})`,
            WebkitBackdropFilter: `blur(${blurAmount}px) brightness(${brightnessAmount})`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: generateIncomingShardEffects(shardId, i, shardCount),
      childrenData: [
        {
          id: `${shardId}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Camera shake effect at transition midpoint
  const shakeEffectId = 'camera-shake-container';
  const shakeMidpoint = transitionDuration / 2;
  
  const shakeEffect = {
    id: 'camera-shake-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: shakeMidpoint,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [shakeEffectId],
      ranges: [
        // Rapid random shake
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.2 },
        { key: 'translateX', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.4 },
        { key: 'translateX', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.6 },
        { key: 'translateX', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.2 },
        { key: 'translateY', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.4 },
        { key: 'translateY', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.6 },
        { key: 'translateY', val: `${shakeIntensity * Math.random() - shakeIntensity / 2}px`, prog: 0.8 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Build composition structure
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-fractal-shatter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
    childrenData: [
      // Outgoing video (full frame)
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
      } as RenderableComponentData,
      
      // Shatter effect container
      {
        id: shakeEffectId,
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
            start: transitionStart,
            duration: transitionDuration,
          },
        },
        effects: [shakeEffect],
        childrenData: [
          // Outgoing shards layer
          {
            id: 'outgoing-shards-layer',
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
                duration: transitionDuration,
              },
            },
            childrenData: outgoingShards,
          } as RenderableComponentData,
          
          // Incoming shards layer
          {
            id: 'incoming-shards-layer',
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
                duration: transitionDuration,
              },
            },
            childrenData: incomingShards,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
      
      // Incoming video (full frame)
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
            start: video1.duration,
            duration: video2.duration,
          },
        },
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'crystalline-fractal-shatter-transition',
  title: 'Crystalline Fractal Shatter Transition',
  description:
    'A mesmerizing transition where the outgoing video shatters into triangular glass-like shards that replicate fractally and spiral outward, then the incoming video assembles from these scattered pieces spiraling inward. Features backdrop-filter refraction effects, 720° rotation, recursive shard replication, and dynamic camera shake at the transition peak.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shatter', 'fractal', 'crystalline', 'glass', 'spiral'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2.5,
    shardCount: 24,
    rotationDegrees: 720,
    spiralRadius: 300,
    blurAmount: 2,
    brightnessAmount: 1.2,
    shakeIntensity: 10,
    shakeDuration: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const crystallineFractalShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
