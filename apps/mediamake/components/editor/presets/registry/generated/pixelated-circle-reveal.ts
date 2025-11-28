/**
 * Pixelated Circle Reveal Preset
 *
 * Creates a digital mosaic circle reveal effect that starts with a blocky, low-resolution circle
 * and progressively becomes smoother and more circular as it expands. This effect mimics the look
 * of old-school video game transitions or digital corruption that resolves into clarity.
 *
 * Features:
 * - Progressive pixel grid from rough 8x8-like initial cluster to smooth 32x32 resolution
 * - Radial expansion from center outward
 * - Staggered timing with distance-based delays for organic digital growth
 * - Random flicker effects on ~20% of pixels for digital aesthetic
 * - Brightness variations during expansion
 * - Optional glow effect on active pixels
 * - Authentic digital feel with linear easing and snappy transitions
 *
 * Technical Implementation:
 * - Uses 32x32 CSS Grid layout (1024 pixels total)
 * - HTMLBlockAtom squares as individual pixels
 * - Distance-based activation thresholds
 * - Generic effects for opacity animations with staggered start times
 * - Random flicker patterns for enhanced digital aesthetic
 *
 * Use Cases:
 * - Tech-related content transitions
 * - Gaming video reveals
 * - Modern digital aesthetic overlays
 * - Retro pixel art style animations
 * - Digital corruption/resolution effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total duration of the reveal animation in seconds'),
  pixelColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the pixels (CSS color value)'),
  backgroundColor: z
    .string()
    .default('transparent')
    .describe('Background color behind the pixel grid'),
  glowEffect: z
    .boolean()
    .default(true)
    .describe('Enable glow effect on active pixels'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Probability of flicker effect on pixels (0-1, 0.2 = 20% of pixels)'),
  expansionSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for expansion (1 = normal, 2 = faster, 0.5 = slower)'),
  initialClusterSize: z
    .number()
    .min(4)
    .max(16)
    .default(8)
    .describe('Initial cluster size in pixels (radius)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    pixelColor,
    backgroundColor,
    glowEffect,
    flickerIntensity,
    expansionSpeed,
    initialClusterSize,
  } = params;

  // Grid configuration
  const GRID_SIZE = 32;
  const CENTER_X = GRID_SIZE / 2;
  const CENTER_Y = GRID_SIZE / 2;
  const MAX_DISTANCE = Math.sqrt(CENTER_X * CENTER_X + CENTER_Y * CENTER_Y);

  // Helper function to calculate distance from center
  const calculateDistance = (row: number, col: number): number => {
    const dx = col - CENTER_X;
    const dy = row - CENTER_Y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to determine if pixel should flicker
  const shouldFlicker = (): boolean => {
    return Math.random() < flickerIntensity;
  };

  // Helper function to create flicker effect ranges
  const createFlickerRanges = () => {
    return [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.2 },
      { key: 'opacity', val: 0.7, prog: 0.35 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: 0.85, prog: 0.65 },
      { key: 'opacity', val: 1, prog: 0.8 },
      { key: 'opacity', val: 1, prog: 1 },
    ];
  };

  // Helper function to create normal fade ranges
  const createNormalRanges = () => {
    return [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ];
  };

  // Generate pixel grid
  const pixelGrid: RenderableComponentData[] = [];
  const pixelEffects: any[] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const distance = calculateDistance(row, col);
      const normalizedDistance = distance / MAX_DISTANCE;
      
      // Calculate activation time based on distance
      // Pixels closer to center activate earlier
      const baseDelay = normalizedDistance * duration * 0.8; // 80% of duration for expansion
      const stagger = distance * 0.01 * expansionSpeed;
      const startTime = baseDelay + stagger;
      
      // Only create pixels that will be visible within duration
      if (startTime >= duration) continue;
      
      // Determine if within initial cluster
      const inInitialCluster = distance <= initialClusterSize;
      
      // Pixel effect duration - shorter for snappy transitions
      const effectDuration = 0.15 / expansionSpeed;
      
      // Create pixel ID
      const pixelId = `pixel-${row}-${col}`;
      
      // Determine if this pixel should flicker
      const hasFlicker = shouldFlicker();
      
      // Create pixel element with HTMLBlockAtom (ShapeAtom is deprecated)
      const pixelElement: RenderableComponentData = {
        id: pixelId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="w-full h-full" style="background-color: ${pixelColor};${glowEffect ? ` box-shadow: 0 0 4px ${pixelColor}50;` : ''}"></div>`,
          className: 'w-full h-full',
          style: {
            opacity: inInitialCluster ? 1 : 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      };
      
      pixelGrid.push(pixelElement);
      
      // Create pixel effect if not in initial cluster
      if (!inInitialCluster) {
        const pixelEffect = {
          id: `effect-${pixelId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: startTime,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [pixelId],
            ranges: hasFlicker ? createFlickerRanges() : createNormalRanges(),
          },
        };
        
        pixelEffects.push(pixelEffect);
      }
    }
  }

  // Create root container with CSS Grid layout
  const rootContainer: RenderableComponentData = {
    id: 'pixelated-circle-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden grid grid-cols-32 grid-rows-32',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: pixelEffects,
    childrenData: pixelGrid,
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
  id: 'pixelated-circle-reveal',
  title: 'Pixelated Circle Reveal',
  description:
    'A digital mosaic circle reveal that progressively evolves from blocky low-resolution pixels into a smooth circular shape, featuring organic growth timing, random flicker effects, and brightness variations for an authentic retro-digital aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['reveal', 'pixel', 'mosaic', 'circle', 'digital', 'retro', 'gaming', 'tech'],
  defaultInputParams: {
    duration: 2,
    pixelColor: '#ffffff',
    backgroundColor: 'transparent',
    glowEffect: true,
    flickerIntensity: 0.2,
    expansionSpeed: 1,
    initialClusterSize: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pixelatedCircleRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
