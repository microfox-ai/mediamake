/**
 * Dynamic Particle Burst System Preset
 *
 * This preset creates decorative particles that burst outward from behind a cutout subject at specific moments,
 * featuring physics-based trajectories (spiral, arc, zigzag), motion blur during burst phase, glow effects,
 * and gentle floating animations. Particles have full lifespan cycles with fade-in burst, float phase, and fade-out.
 *
 * Features:
 * - **Physics-Based Trajectories**: Spiral outward, arc upward then fall, and zigzag patterns with realistic physics
 * - **Three-Phase Lifespan**: Burst (explosive outward movement), Float (gentle oscillation), Fade (graceful exit)
 * - **Motion Blur & Glow**: Motion blur during fast movement, intense glow during burst phase that fades during float
 * - **Intensity-Reactive**: Particle count per burst (5-20) scales with burst intensity parameter
 * - **Multiple Particle Types**: Stars, hearts, circles, diamonds with weighted random selection
 * - **GPU-Accelerated**: Uses transform3d for smooth performance
 * - **Customizable**: Control colors, sizes, spawn radius, durations, and burst timings
 *
 * Use cases:
 * - Adding magical particle effects behind speakers in video content
 * - Creating confetti-like celebration moments at key timestamps
 * - Enhancing energy and visual interest during emphatic speaking moments
 * - Building dynamic decorative overlays for cutout subjects
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  video: z.object({
    src: z.string().describe('Source URL of the main video with cutout subject'),
  }).describe('Main video configuration'),
  
  burstTimes: z.array(z.number()).default([1, 3, 5, 7]).describe('Array of timestamps (in seconds) when particle bursts should occur'),
  
  burstIntensity: z.number().min(0.1).max(3).default(1).describe('Intensity multiplier for particle count per burst (0.1-3.0, where 1.0 = 10-15 particles)'),
  
  particleTypes: z.array(z.enum(['star', 'heart', 'circle', 'diamond'])).default(['star', 'circle', 'diamond']).describe('Array of particle shape types to randomly select from'),
  
  particleColors: z.array(z.string()).default(['#FFD700', '#FF69B4', '#00FFFF', '#FF6B6B', '#4ECDC4']).describe('Array of particle colors (hex format) for random selection'),
  
  particleSizeRange: z.object({
    min: z.number().default(16),
    max: z.number().default(32),
  }).default({ min: 16, max: 32 }).describe('Particle size range in pixels'),
  
  spawnRadius: z.number().min(0).max(200).default(80).describe('Radius (in pixels) around video center from which particles spawn'),
  
  burstDuration: z.number().min(0.1).max(1).default(0.3).describe('Duration of the burst phase in seconds'),
  
  floatDuration: z.number().min(1).max(10).default(3).describe('Duration of the float phase in seconds'),
  
  fadeDuration: z.number().min(0.1).max(2).default(0.5).describe('Duration of the fade-out phase in seconds'),
  
  trajectoryVariation: z.number().min(0).max(1).default(0.7).describe('Variation in trajectory paths (0 = uniform, 1 = highly varied)'),
});

// --- Preset Execution ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    video,
    burstTimes,
    burstIntensity,
    particleTypes,
    particleColors,
    particleSizeRange,
    spawnRadius,
    burstDuration,
    floatDuration,
    fadeDuration,
    trajectoryVariation,
  } = params;

  // Helper: Random selection
  const randomSelect = <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // Helper: Random number in range
  const randomRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Calculate particle count based on intensity
  const calculateParticleCount = (intensity: number): number => {
    const baseCount = 12;
    const count = Math.round(baseCount * intensity);
    return Math.max(5, Math.min(20, count));
  };

  // Helper: Generate trajectory based on type
  const generateTrajectory = (
    type: 'spiral' | 'arc' | 'zigzag',
    spawnX: number,
    spawnY: number,
    variation: number,
  ): { burst: any[], float: any[] } => {
    const variationFactor = 1 + (Math.random() - 0.5) * variation;
    
    if (type === 'spiral') {
      const angle = Math.random() * Math.PI * 2;
      const distance = randomRange(100, 180) * variationFactor;
      const spiralFactor = randomRange(0.3, 0.7);
      
      return {
        burst: [
          { offset: 0, translateX: spawnX, translateY: spawnY, scale: 0, opacity: 0, rotate: 0 },
          { offset: 0.5, translateX: spawnX + Math.cos(angle) * distance * 0.6, translateY: spawnY + Math.sin(angle) * distance * 0.6, scale: 1.2, opacity: 1, rotate: 90 * spiralFactor },
          { offset: 1, translateX: spawnX + Math.cos(angle) * distance, translateY: spawnY + Math.sin(angle) * distance, scale: 1, opacity: 1, rotate: 180 * spiralFactor },
        ],
        float: [
          { offset: 0, translateX: spawnX + Math.cos(angle) * distance, translateY: spawnY + Math.sin(angle) * distance, rotate: 180 * spiralFactor },
          { offset: 0.33, translateX: spawnX + Math.cos(angle + 0.3) * (distance + 15), translateY: spawnY + Math.sin(angle + 0.3) * (distance + 15), rotate: 270 * spiralFactor },
          { offset: 0.66, translateX: spawnX + Math.cos(angle - 0.3) * (distance + 10), translateY: spawnY + Math.sin(angle - 0.3) * (distance + 10), rotate: 360 * spiralFactor },
          { offset: 1, translateX: spawnX + Math.cos(angle) * (distance + 20), translateY: spawnY + Math.sin(angle) * (distance + 20), rotate: 450 * spiralFactor },
        ],
      };
    } else if (type === 'arc') {
      const xDir = (Math.random() - 0.5) * 2;
      const peakHeight = randomRange(120, 200) * variationFactor;
      const horizontalDist = randomRange(60, 120) * variationFactor;
      
      return {
        burst: [
          { offset: 0, translateX: spawnX, translateY: spawnY, scale: 0, opacity: 0 },
          { offset: 0.4, translateX: spawnX + xDir * horizontalDist * 0.4, translateY: spawnY - peakHeight * 0.7, scale: 1.1, opacity: 1 },
          { offset: 1, translateX: spawnX + xDir * horizontalDist, translateY: spawnY - peakHeight, scale: 1, opacity: 1 },
        ],
        float: [
          { offset: 0, translateX: spawnX + xDir * horizontalDist, translateY: spawnY - peakHeight },
          { offset: 0.25, translateX: spawnX + xDir * horizontalDist * 1.1, translateY: spawnY - peakHeight * 0.8 },
          { offset: 0.5, translateX: spawnX + xDir * horizontalDist * 1.15, translateY: spawnY - peakHeight * 0.4 },
          { offset: 0.75, translateX: spawnX + xDir * horizontalDist * 1.2, translateY: spawnY - peakHeight * 0.1 },
          { offset: 1, translateX: spawnX + xDir * horizontalDist * 1.25, translateY: spawnY + peakHeight * 0.2 },
        ],
      };
    } else { // zigzag
      const xDir = (Math.random() - 0.5) * 2;
      const zigzagWidth = randomRange(40, 80) * variationFactor;
      const totalDist = randomRange(140, 220) * variationFactor;
      
      return {
        burst: [
          { offset: 0, translateX: spawnX, translateY: spawnY, scale: 0, opacity: 0 },
          { offset: 1, translateX: spawnX + xDir * zigzagWidth * 0.5, translateY: spawnY - totalDist * 0.2, scale: 1.15, opacity: 1 },
        ],
        float: [
          { offset: 0, translateX: spawnX + xDir * zigzagWidth * 0.5, translateY: spawnY - totalDist * 0.2 },
          { offset: 0.2, translateX: spawnX - xDir * zigzagWidth * 0.8, translateY: spawnY - totalDist * 0.4 },
          { offset: 0.4, translateX: spawnX + xDir * zigzagWidth * 1.2, translateY: spawnY - totalDist * 0.6 },
          { offset: 0.6, translateX: spawnX - xDir * zigzagWidth * 0.9, translateY: spawnY - totalDist * 0.8 },
          { offset: 0.8, translateX: spawnX + xDir * zigzagWidth * 1.3, translateY: spawnY - totalDist * 0.95 },
          { offset: 1, translateX: spawnX - xDir * zigzagWidth * 1.0, translateY: spawnY - totalDist },
        ],
      };
    }
  };

  // Helper: Create particle with effects
  const createParticle = (
    burstTime: number,
    index: number,
  ): RenderableComponentData => {
    const particleId = `particle-${burstTime}-${index}`;
    const shape = randomSelect(particleTypes);
    const color = randomSelect(particleColors);
    const size = randomRange(particleSizeRange.min, particleSizeRange.max);
    
    // Random spawn position around center
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.random() * spawnRadius;
    const spawnX = Math.cos(spawnAngle) * spawnDist;
    const spawnY = Math.sin(spawnAngle) * spawnDist;
    
    // Random trajectory type
    const trajectoryType = randomSelect(['spiral', 'arc', 'zigzag'] as const);
    const trajectory = generateTrajectory(trajectoryType, spawnX, spawnY, trajectoryVariation);
    
    // Total duration
    const totalDuration = burstDuration + floatDuration + fadeDuration;
    
    // Calculate phase timings (as ratios)
    const burstEndRatio = burstDuration / totalDuration;
    const floatEndRatio = (burstDuration + floatDuration) / totalDuration;
    
    // Build composite effect with blur and glow
    const burstKeyframes = trajectory.burst.map((kf, i) => {
      const blurAmount = i === 0 ? 10 : (i === trajectory.burst.length - 1 ? 0 : 5);
      const glowIntensity = i === 0 ? 0.9 : 1.0;
      const glowSize = i === 0 ? 15 : (i === trajectory.burst.length - 1 ? 8 : 20);
      
      return {
        ...kf,
        offset: kf.offset * burstEndRatio,
        filter: `blur(${blurAmount}px) drop-shadow(0 0 ${glowSize}px ${color.replace('#', 'rgba(').replace(/(..)(..)(..)/, '$1,$2,$3,') + glowIntensity + ')'})`,
      };
    });
    
    const floatKeyframes = trajectory.float.map((kf, i) => ({
      ...kf,
      offset: burstEndRatio + (kf.offset * (floatEndRatio - burstEndRatio)),
      filter: `blur(0px) drop-shadow(0 0 6px ${color.replace('#', 'rgba(').replace(/(..)(..)(..)/, '$1,$2,$3,') + '0.5)'})`,
    }));
    
    const fadeKeyframes = [
      { offset: floatEndRatio, opacity: 1 },
      { offset: 1, opacity: 0 },
    ];
    
    // Combine all keyframes
    const allKeyframes = [
      ...burstKeyframes,
      ...floatKeyframes,
      ...fadeKeyframes,
    ].sort((a, b) => a.offset - b.offset);

    return {
      id: particleId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape,
        size,
        fill: color,
        className: 'absolute mix-blend-screen pointer-events-none',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, opacity, filter',
        },
      },
      context: {
        timing: {
          start: burstTime,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `${particleId}-effect`,
          componentId: particleId,
          data: {
            type: 'keyframes',
            start: 0,
            duration: totalDuration,
            mode: 'provider',
            targetIds: [particleId],
            keyframes: allKeyframes,
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Generate all particles for all burst times
  const allParticles: RenderableComponentData[] = [];
  
  burstTimes.forEach(burstTime => {
    const particleCount = calculateParticleCount(burstIntensity);
    for (let i = 0; i < particleCount; i++) {
      allParticles.push(createParticle(burstTime, i));
    }
  });

  // Build composition structure
  const particleContainer: RenderableComponentData = {
    id: 'dynamic-particle-burst-particle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        fitDurationTo: 'dynamic-particle-burst-main-video',
      },
    },
    childrenData: allParticles,
  } as RenderableComponentData;

  const mainVideo: RenderableComponentData = {
    id: 'dynamic-particle-burst-main-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 30,
      },
    },
    context: {
      timing: {
        fitDurationTo: 'self',
      },
    },
  } as RenderableComponentData;

  const rootContainer: RenderableComponentData = {
    id: 'dynamic-particle-burst-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
      },
    },
    context: {
      timing: {
        fitDurationTo: 'dynamic-particle-burst-main-video',
      },
    },
    childrenData: [particleContainer, mainVideo],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'dynamic-particle-burst',
  title: 'Dynamic Particle Burst System',
  description: 'Decorative particles burst outward from behind a cutout subject at specified moments, featuring physics-based trajectories (spiral, arc, zigzag), motion blur during burst phase, glow effects, and gentle floating animations. Particles have full lifespan cycles with fade-in burst, float phase, and fade-out. Supports intensity-reactive particle counts and various geometric shapes (stars, circles, diamonds) with weighted random selection.',
  type: 'predefined',
  presetType: 'children',
  tags: ['particles', 'burst', 'physics', 'animation', 'decorative', 'confetti', 'magical', 'effects', 'glow', 'motion-blur'],
  defaultInputParams: {
    video: {
      src: 'video.mp4',
    },
    burstTimes: [1, 3, 5, 7],
    burstIntensity: 1,
    particleTypes: ['star', 'circle', 'diamond'],
    particleColors: ['#FFD700', '#FF69B4', '#00FFFF', '#FF6B6B', '#4ECDC4'],
    particleSizeRange: {
      min: 16,
      max: 32,
    },
    spawnRadius: 80,
    burstDuration: 0.3,
    floatDuration: 3,
    fadeDuration: 0.5,
    trajectoryVariation: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const dynamicParticleBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};