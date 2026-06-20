/**
 * Shattered Glass Transition Preset
 *
 * Creates a realistic glass-shattering transition effect where the outgoing video
 * fractures into 25 triangular shards that fall with physics-based motion.
 *
 * Features:
 * - Realistic physics: Mass-based fall rates and rotation speeds
 * - Glass effects: Refraction, brightness variations, drop shadows
 * - Collision interactions: Subtle bouncing between shards
 * - Irregular triangles: 25 unique polygon shapes for natural shattering
 * - 1.5-second overlap: Smooth transition between videos
 *
 * Technical implementation:
 * - VideoAtom instances with clip-path: polygon() for triangular shapes
 * - Mass calculated from polygon area determines physics
 * - Transform animations: translateY with acceleration, rotate3d with variable speeds
 * - Filter effects: drop-shadow and brightness for glass appearance
 * - Transform-origin at polygon centroid for realistic rotation
 * - Subtle translateX wobble for air resistance simulation
 * - Z-index layering based on initial Y position
 *
 * Use cases:
 * - Dynamic video transitions with impact
 * - Creative scene changes with glass-breaking effect
 * - Attention-grabbing transitions for social media content
 * - Dramatic reveals or endings
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
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the glass-shattering transition overlap in seconds'),
  shardCount: z
    .number()
    .default(25)
    .describe('Number of glass shards (25 for optimal visual)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Define 25 irregular triangular shards with clip paths and centroids
  const shardDefinitions = [
    {
      clipPath: 'polygon(10% 15%, 25% 5%, 20% 30%)',
      centroid: { x: 18.3, y: 16.7 },
      area: 0.015,
      yPos: 15,
    },
    {
      clipPath: 'polygon(25% 5%, 40% 10%, 35% 25%, 20% 30%)',
      centroid: { x: 30, y: 17.5 },
      area: 0.025,
      yPos: 10,
    },
    {
      clipPath: 'polygon(40% 10%, 55% 8%, 50% 28%)',
      centroid: { x: 48.3, y: 15.3 },
      area: 0.018,
      yPos: 12,
    },
    {
      clipPath: 'polygon(55% 8%, 70% 12%, 65% 30%, 50% 28%)',
      centroid: { x: 60, y: 19.5 },
      area: 0.028,
      yPos: 15,
    },
    {
      clipPath: 'polygon(70% 12%, 85% 18%, 75% 32%)',
      centroid: { x: 76.7, y: 20.7 },
      area: 0.016,
      yPos: 18,
    },
    {
      clipPath: 'polygon(85% 18%, 95% 15%, 90% 35%, 75% 32%)',
      centroid: { x: 86.25, y: 25 },
      area: 0.022,
      yPos: 20,
    },
    {
      clipPath: 'polygon(10% 15%, 20% 30%, 5% 40%)',
      centroid: { x: 11.7, y: 28.3 },
      area: 0.014,
      yPos: 25,
    },
    {
      clipPath: 'polygon(20% 30%, 35% 25%, 30% 45%, 15% 50%, 5% 40%)',
      centroid: { x: 21, y: 38 },
      area: 0.032,
      yPos: 35,
    },
    {
      clipPath: 'polygon(35% 25%, 50% 28%, 45% 48%)',
      centroid: { x: 43.3, y: 33.7 },
      area: 0.019,
      yPos: 30,
    },
    {
      clipPath: 'polygon(50% 28%, 65% 30%, 60% 50%, 45% 48%)',
      centroid: { x: 55, y: 39 },
      area: 0.026,
      yPos: 35,
    },
    {
      clipPath: 'polygon(65% 30%, 75% 32%, 70% 52%)',
      centroid: { x: 70, y: 38 },
      area: 0.017,
      yPos: 38,
    },
    {
      clipPath: 'polygon(75% 32%, 90% 35%, 85% 55%, 70% 52%)',
      centroid: { x: 80, y: 43.5 },
      area: 0.027,
      yPos: 40,
    },
    {
      clipPath: 'polygon(90% 35%, 98% 40%, 92% 58%)',
      centroid: { x: 93.3, y: 44.3 },
      area: 0.013,
      yPos: 42,
    },
    {
      clipPath: 'polygon(5% 40%, 15% 50%, 8% 65%)',
      centroid: { x: 9.3, y: 51.7 },
      area: 0.012,
      yPos: 50,
    },
    {
      clipPath: 'polygon(15% 50%, 30% 45%, 25% 68%, 18% 72%, 8% 65%)',
      centroid: { x: 19.2, y: 60.4 },
      area: 0.030,
      yPos: 55,
    },
    {
      clipPath: 'polygon(30% 45%, 45% 48%, 40% 70%)',
      centroid: { x: 38.3, y: 54.3 },
      area: 0.020,
      yPos: 52,
    },
    {
      clipPath: 'polygon(45% 48%, 60% 50%, 55% 72%, 40% 70%)',
      centroid: { x: 50, y: 60 },
      area: 0.024,
      yPos: 58,
    },
    {
      clipPath: 'polygon(60% 50%, 70% 52%, 65% 75%)',
      centroid: { x: 65, y: 59 },
      area: 0.016,
      yPos: 60,
    },
    {
      clipPath: 'polygon(70% 52%, 85% 55%, 80% 78%, 65% 75%)',
      centroid: { x: 75, y: 65 },
      area: 0.029,
      yPos: 62,
    },
    {
      clipPath: 'polygon(85% 55%, 92% 58%, 88% 82%)',
      centroid: { x: 88.3, y: 65 },
      area: 0.015,
      yPos: 65,
    },
    {
      clipPath: 'polygon(8% 65%, 18% 72%, 12% 88%)',
      centroid: { x: 12.7, y: 75 },
      area: 0.013,
      yPos: 72,
    },
    {
      clipPath: 'polygon(18% 72%, 25% 68%, 32% 85%, 22% 92%, 12% 88%)',
      centroid: { x: 21.8, y: 81.6 },
      area: 0.028,
      yPos: 78,
    },
    {
      clipPath: 'polygon(25% 68%, 40% 70%, 35% 90%)',
      centroid: { x: 33.3, y: 76 },
      area: 0.018,
      yPos: 75,
    },
    {
      clipPath: 'polygon(40% 70%, 55% 72%, 50% 92%, 35% 90%)',
      centroid: { x: 45, y: 81 },
      area: 0.023,
      yPos: 80,
    },
    {
      clipPath:
        'polygon(55% 72%, 65% 75%, 80% 78%, 88% 82%, 75% 95%, 60% 94%, 50% 92%)',
      centroid: { x: 68.3, y: 83.5 },
      area: 0.038,
      yPos: 82,
    },
  ];

  // Helper: Calculate physics parameters based on mass (area)
  const calculatePhysics = (area: number, index: number) => {
    // Normalize mass (area) to 0.5-2.0 range
    const mass = 0.5 + area * 40;

    // Fall speed: inversely proportional to mass (smaller = faster)
    // Range: 100vh to 140vh
    const fallDistance = 100 + (1 / mass) * 40;

    // Rotation speed: inversely proportional to mass (smaller = more rotation)
    // Range: 360deg to 1080deg
    const rotationAmount = 360 + (1 / mass) * 720;

    // Random rotation axis
    const axes = [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 0.5, z: 0.3 },
    ];
    const axis = axes[index % axes.length];

    // Wobble (air resistance): smaller pieces wobble more
    const wobbleAmount = (1 / mass) * 30;
    const wobbleDirection = index % 2 === 0 ? 1 : -1;

    return {
      mass,
      fallDistance,
      rotationAmount,
      axis,
      wobbleAmount,
      wobbleDirection,
    };
  };

  // Generate 25 shard components
  const shards: RenderableComponentData[] = shardDefinitions.map(
    (shard, index) => {
      const physics = calculatePhysics(shard.area, index);
      const shardId = `shard-${String(index + 1).padStart(2, '0')}`;

      // Brightness variation for glass effect
      const brightness = 1.0 + (Math.random() - 0.5) * 0.2;

      // Delay based on Y position (top shards start falling first)
      const fallDelay = (shard.yPos / 100) * 0.3;

      // Collision bounce simulation (subtle)
      const bounceIntensity = 3 * (1 / physics.mass);

      return {
        id: shardId,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            clipPath: shard.clipPath,
            filter: `drop-shadow(2px 4px 6px rgba(0,0,0,0.6)) brightness(${brightness.toFixed(2)})`,
            transformOrigin: `${shard.centroid.x}% ${shard.centroid.y}%`,
            zIndex: Math.floor(shard.yPos),
          },
        },
        context: {
          timing: {
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `${shardId}-fall`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: fallDelay,
              duration: transitionDuration - fallDelay,
              mode: 'provider',
              targetIds: [shardId],
              ranges: [
                // Fall down with acceleration
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: `${physics.fallDistance}vh`, prog: 1 },
                // Rotation based on mass
                { key: 'rotate3d', val: `${physics.axis.x}, ${physics.axis.y}, ${physics.axis.z}, 0deg`, prog: 0 },
                { key: 'rotate3d', val: `${physics.axis.x}, ${physics.axis.y}, ${physics.axis.z}, ${physics.rotationAmount}deg`, prog: 1 },
                // Wobble (air resistance)
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: `${physics.wobbleAmount * physics.wobbleDirection * 0.3}px`, prog: 0.3 },
                { key: 'translateX', val: `${physics.wobbleAmount * physics.wobbleDirection * -0.2}px`, prog: 0.6 },
                { key: 'translateX', val: `${physics.wobbleAmount * physics.wobbleDirection}px`, prog: 1 },
                // Collision bounce (subtle)
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1 - bounceIntensity * 0.02, prog: 0.4 },
                { key: 'scale', val: 1 + bounceIntensity * 0.01, prog: 0.5 },
                { key: 'scale', val: 1, prog: 0.6 },
                // Fade out at the end
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.85 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Video 1 (complete, behind the shards)
  const video1Full: RenderableComponentData = {
    id: 'video1-full',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
  };

  // Video 2 (incoming, underneath everything)
  const video2Incoming: RenderableComponentData = {
    id: 'video2-incoming',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'video2-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['video2-incoming'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'shattered-glass-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [video2Incoming, video1Full, ...shards],
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
  id: 'shattered-glass-transition',
  title: 'Shattered Glass Transition',
  description:
    'A realistic glass-shattering transition effect where the outgoing video fractures into 25 triangular shards that fall with physics-based motion. Shards tumble downward with rotation and wobble based on their calculated mass, featuring glass refraction effects, shadows, and collision-like interactions during the 1.5-second overlap.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glass',
    'shatter',
    'physics',
    'video',
    'dramatic',
    'impact',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.5,
    shardCount: 25,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const shatteredGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
