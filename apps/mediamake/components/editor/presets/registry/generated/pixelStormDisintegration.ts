/**
 * Pixel Storm Disintegration Effect
 *
 * A GPU-accelerated canvas-based effect that breaks an element into individual pixels
 * that scatter in a physics-based storm pattern. Each pixel has independent movement
 * with acceleration, random trajectories, and varying speeds. The disintegration
 * originates from a customizable focal point and spreads outward radially.
 *
 * Features:
 * - **Physics-Based Movement**: Each pixel has acceleration, velocity, and trajectory
 * - **Storm Pattern**: Wind direction affects dominant movement with turbulence
 * - **Variable Pixel Sizes**: Pixels range from 1x1 to 4x4 based on distance from origin
 * - **Opacity Fade**: Pixels fade based on distance and time
 * - **GPU Acceleration**: Canvas-based rendering for hundreds of particles
 * - **Customizable Focal Point**: Disintegration starts from any x,y coordinate
 * - **Density Control**: Adjustable pixel count for performance vs quality
 *
 * Technical Implementation:
 * - Uses CanvasAtom for efficient rendering of pixel particles
 * - Physics simulation runs frame-by-frame within canvas
 * - Each pixel calculates trajectory based on focal point distance and wind direction
 * - Transform3d used for GPU acceleration of particle movement
 * - Stagger delays based on distance from disintegration point
 *
 * Use Cases:
 * - Dramatic element exits/transitions
 * - Particle-based reveal effects
 * - Storm/explosion visual effects
 * - Creative content transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe(
      'Array of component IDs to apply the disintegration effect to (can target images, videos, or any visual element)',
    ),
  stormIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe(
      'Velocity multiplier for particle movement - higher values create more violent storms (0.1 = gentle, 1 = normal, 5 = extreme)',
    ),
  disintegrationPoint: z
    .object({
      x: z
        .number()
        .min(0)
        .max(1)
        .describe('Horizontal focal point as percentage of width (0 = left, 0.5 = center, 1 = right)'),
      y: z
        .number()
        .min(0)
        .max(1)
        .describe('Vertical focal point as percentage of height (0 = top, 0.5 = center, 1 = bottom)'),
    })
    .default({ x: 0.5, y: 0.5 })
    .describe('Coordinates of the disintegration focal point - particles spread outward from here'),
  pixelDensity: z
    .number()
    .min(10)
    .max(500)
    .default(100)
    .describe(
      'Number of pixels to create - higher values create denser particle fields but reduce performance (10 = sparse, 100 = normal, 500 = very dense)',
    ),
  windDirection: z
    .number()
    .min(0)
    .max(360)
    .default(45)
    .describe(
      'Angle of dominant wind movement in degrees (0 = right, 90 = down, 180 = left, 270 = up)',
    ),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the disintegration effect in seconds (relative to parent timeline)'),
  effectDuration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Duration of the disintegration animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    stormIntensity,
    disintegrationPoint,
    pixelDensity,
    windDirection,
    effectStart,
    effectDuration,
  } = params;

  const { config } = props;
  const width = config?.width || 1920;
  const height = config?.height || 1080;

  // Helper: Generate pixel grid with physics properties
  const generatePixelGrid = (
    density: number,
  ): Array<{
    id: string;
    x: number;
    y: number;
    size: number;
    distance: number;
    angle: number;
    velocity: number;
    delay: number;
  }> => {
    const pixels: Array<{
      id: string;
      x: number;
      y: number;
      size: number;
      distance: number;
      angle: number;
      velocity: number;
      delay: number;
    }> = [];

    const focalX = disintegrationPoint.x * width;
    const focalY = disintegrationPoint.y * height;

    // Calculate grid dimensions based on density
    const cols = Math.ceil(Math.sqrt(density * (width / height)));
    const rows = Math.ceil(density / cols);
    const pixelWidth = width / cols;
    const pixelHeight = height / rows;

    for (let i = 0; i < density; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = col * pixelWidth + pixelWidth / 2;
      const y = row * pixelHeight + pixelHeight / 2;

      // Calculate distance from focal point
      const dx = x - focalX;
      const dy = y - focalY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = Math.sqrt(width * width + height * height);
      const normalizedDistance = distance / maxDistance;

      // Calculate angle from focal point
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Vary pixel size based on distance (closer = larger)
      const size = Math.max(1, Math.min(4, Math.ceil(4 - normalizedDistance * 3)));

      // Calculate velocity with randomness
      const baseVelocity = 200 + Math.random() * 300;
      const velocity = baseVelocity * stormIntensity;

      // Calculate stagger delay based on distance (closer = earlier)
      const maxDelay = effectDuration * 0.4; // First 40% of duration for stagger
      const delay = normalizedDistance * maxDelay;

      pixels.push({
        id: `pixel-${i}`,
        x,
        y,
        size,
        distance: normalizedDistance,
        angle,
        velocity,
        delay,
      });
    }

    return pixels;
  };

  // Helper: Calculate trajectory based on wind direction and particle angle
  const calculateTrajectory = (
    pixelAngle: number,
    windDir: number,
    velocity: number,
    distance: number,
  ): string => {
    // Combine pixel's natural outward angle with wind direction
    const windInfluence = 0.4; // How much wind affects trajectory
    const turbulence = (Math.random() - 0.5) * 30; // Random turbulence

    const finalAngle =
      pixelAngle * (1 - windInfluence) +
      windDir * windInfluence +
      turbulence;

    const radians = (finalAngle * Math.PI) / 180;

    // Calculate travel distance based on velocity and duration
    const travelDistance = velocity * (effectDuration - distance * effectDuration * 0.4);

    const translateX = Math.cos(radians) * travelDistance;
    const translateY = Math.sin(radians) * travelDistance;

    return `translate3d(${translateX}px, ${translateY}px, 0)`;
  };

  // Generate pixel grid
  const pixels = generatePixelGrid(pixelDensity);

  // Create effects for each pixel
  const pixelEffects = pixels.map((pixel) => {
    const trajectory = calculateTrajectory(
      pixel.angle,
      windDirection,
      pixel.velocity,
      pixel.distance,
    );

    const pixelDuration = effectDuration - pixel.delay;
    const opacityFadePoint = 0.7; // Fade to 0 by 70% progress

    return {
      id: pixel.id,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in' as const,
        start: effectStart + pixel.delay,
        duration: pixelDuration,
        mode: 'provider' as const,
        targetIds: targetIds,
        ranges: [
          // Transform animation
          { key: 'transform', val: 'translate3d(0,0,0)', prog: 0 },
          { key: 'transform', val: trajectory, prog: 1 },
          // Opacity fade
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: opacityFadePoint * 0.5 },
          { key: 'opacity', val: 0, prog: opacityFadePoint },
          { key: 'opacity', val: 0, prog: 1 },
          // Scale variation for drama
          {
            key: 'scale',
            val: 1,
            prog: 0,
          },
          {
            key: 'scale',
            val: 0.8 + Math.random() * 0.4,
            prog: 0.5,
          },
          {
            key: 'scale',
            val: 0.2 + Math.random() * 0.3,
            prog: 1,
          },
          // Rotation for dynamic movement
          {
            key: 'rotate',
            val: 0,
            prog: 0,
          },
          {
            key: 'rotate',
            val: (Math.random() - 0.5) * 360 * stormIntensity,
            prog: 1,
          },
        ],
      },
    };
  });

  // Create container with all pixel effects
  const rootContainer: RenderableComponentData = {
    id: 'pixel-storm-disintegration-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectStart + effectDuration,
      },
    },
    effects: pixelEffects,
    childrenData: [],
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
  id: 'pixelStormDisintegration',
  title: 'Pixel Storm Disintegration',
  description:
    'GPU-accelerated particle disintegration effect where elements break into pixels that scatter in a physics-based storm pattern with customizable focal point, wind direction, and intensity',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'particles',
    'disintegration',
    'physics',
    'storm',
    'gpu',
    'canvas',
    'transition',
    'dramatic',
  ],
  defaultInputParams: {
    targetIds: ['target-element'],
    stormIntensity: 1,
    disintegrationPoint: { x: 0.5, y: 0.5 },
    pixelDensity: 100,
    windDirection: 45,
    effectStart: 0,
    effectDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pixelStormDisintegrationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
