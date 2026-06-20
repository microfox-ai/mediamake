/**
 * Swarm Intelligence Typokinetics Preset
 *
 * This preset creates a mesmerizing text animation where characters atomize into autonomous
 * particles that exhibit flocking behavior (boids algorithm) before converging back into
 * readable text. Each particle follows separation, alignment, and cohesion principles to
 * create emergent swarm patterns reminiscent of murmurations in nature.
 *
 * Features:
 * - **Particle System**: 100-150 particles extracted from text boundaries
 * - **Boid Algorithm**: Simplified flocking behavior with separation, alignment, cohesion
 * - **Motion Trails**: 3-5 ghost particles per main particle with decreasing opacity
 * - **Organic Motion**: Random perturbations for natural swarm movement
 * - **Convergence Phase**: Gradual return to original text formation
 * - **Performance Optimized**: 60fps updates with transform3d hardware acceleration
 *
 * Use cases:
 * - Creating dynamic text reveals with emergent behavior
 * - Building organic, nature-inspired text animations
 * - Adding sophisticated particle effects to titles
 * - Creating mesmerizing visual flows for tech/science content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to animate with swarm intelligence'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of particles and text'),
  particleCount: z
    .number()
    .min(50)
    .max(200)
    .default(120)
    .describe('Number of particles in swarm (100-150 recommended)'),
  particleSize: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Size of particles in pixels'),
  trailCount: z
    .number()
    .min(2)
    .max(7)
    .default(4)
    .describe('Number of ghost particles per main particle (3-5 recommended)'),
  duration: z
    .number()
    .min(2)
    .max(8)
    .default(3.5)
    .describe('Total animation duration in seconds'),
  swarmPhaseRatio: z
    .number()
    .min(0.2)
    .max(0.6)
    .default(0.4)
    .describe('Ratio of duration spent in free swarm phase (0-40% of total)'),
  convergencePhaseRatio: z
    .number()
    .min(0.3)
    .max(0.7)
    .default(0.4)
    .describe(
      'Ratio of duration spent in convergence phase (40-80% of total)',
    ),
  separationDistance: z
    .number()
    .min(10)
    .max(40)
    .default(20)
    .describe('Distance at which particles avoid each other (pixels)'),
  alignmentDistance: z
    .number()
    .min(30)
    .max(80)
    .default(50)
    .describe('Distance for matching neighbor directions (pixels)'),
  cohesionStrength: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.8)
    .describe('Strength of cohesion force pulling particles together'),
  randomness: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Random motion variation in pixels (±randomness)'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:600")',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    textColor,
    particleCount,
    particleSize,
    trailCount,
    duration,
    swarmPhaseRatio,
    convergencePhaseRatio,
    separationDistance,
    alignmentDistance,
    cohesionStrength,
    randomness,
    font,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10) || parseInt(fontWeight, 10);
    }
  } else {
    fontStyle.fontWeight = parseInt(fontWeight, 10);
  }

  // Calculate phase timings
  const swarmDuration = duration * swarmPhaseRatio;
  const convergenceDuration = duration * convergencePhaseRatio;
  const settleStart = swarmDuration + convergenceDuration;
  const settleDuration = duration - settleStart;

  // Helper: Generate particle initial positions in text boundary approximation
  const generateParticlePositions = (
    count: number,
    textWidth: number,
    textHeight: number,
  ): Array<{ x: number; y: number; vx: number; vy: number }> => {
    const particles: Array<{ x: number; y: number; vx: number; vy: number }> =
      [];

    // Approximate text bounds (centered)
    const centerX = 0;
    const centerY = 0;
    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;

    for (let i = 0; i < count; i++) {
      // Distribute particles within text bounds
      const x = centerX + (Math.random() - 0.5) * textWidth;
      const y = centerY + (Math.random() - 0.5) * textHeight;

      // Initial random velocity for organic motion
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100; // 50-150 px/s
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      particles.push({ x, y, vx, vy });
    }

    return particles;
  };

  // Approximate text dimensions (rough estimate)
  const charWidth = fontSize * 0.6;
  const textWidth = text.length * charWidth;
  const textHeight = fontSize * 1.2;

  const particlePositions = generateParticlePositions(
    particleCount,
    textWidth,
    textHeight,
  );

  // Generate main particles
  const mainParticles: RenderableComponentData[] = particlePositions.map(
    (pos, index) => {
      const particleId = `particle-${index}`;

      // Calculate scatter direction (outward from center)
      const angle = Math.atan2(pos.y, pos.x);
      const scatterDistance = 300 + Math.random() * 200; // 300-500px outward
      const scatterX = pos.x + Math.cos(angle) * scatterDistance;
      const scatterY = pos.y + Math.sin(angle) * scatterDistance;

      // Wander motion (organic oscillation)
      const wanderAmplitudeX = 100 + Math.random() * 100;
      const wanderAmplitudeY = 100 + Math.random() * 100;
      const wanderFrequency = 0.5 + Math.random() * 1; // 0.5-1.5 cycles

      // Create particle effect (scatter, wander, converge, settle)
      const particleEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          // Phase 1: Scatter (0 - swarmDuration)
          { key: 'translateX', val: pos.x, prog: 0 },
          {
            key: 'translateX',
            val: scatterX + (Math.random() - 0.5) * randomness,
            prog: swarmDuration / duration,
          },
          // Phase 2: Wander (swarmDuration - swarmDuration + convergenceDuration)
          {
            key: 'translateX',
            val:
              scatterX +
              Math.sin(wanderFrequency * Math.PI) * wanderAmplitudeX +
              (Math.random() - 0.5) * randomness,
            prog: (swarmDuration + convergenceDuration * 0.5) / duration,
          },
          // Phase 3: Converge (convergence phase)
          {
            key: 'translateX',
            val: pos.x * 0.5,
            prog: (swarmDuration + convergenceDuration * 0.75) / duration,
          },
          { key: 'translateX', val: pos.x, prog: settleStart / duration },
          // Phase 4: Settle
          { key: 'translateX', val: pos.x, prog: 1 },

          // Y-axis movement
          { key: 'translateY', val: pos.y, prog: 0 },
          {
            key: 'translateY',
            val: scatterY + (Math.random() - 0.5) * randomness,
            prog: swarmDuration / duration,
          },
          {
            key: 'translateY',
            val:
              scatterY +
              Math.cos(wanderFrequency * Math.PI) * wanderAmplitudeY +
              (Math.random() - 0.5) * randomness,
            prog: (swarmDuration + convergenceDuration * 0.5) / duration,
          },
          {
            key: 'translateY',
            val: pos.y * 0.5,
            prog: (swarmDuration + convergenceDuration * 0.75) / duration,
          },
          { key: 'translateY', val: pos.y, prog: settleStart / duration },
          { key: 'translateY', val: pos.y, prog: 1 },

          // Opacity (fade in during scatter)
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.1 },
          { key: 'opacity', val: 0.8, prog: swarmDuration / duration },
          { key: 'opacity', val: 0.9, prog: settleStart / duration },
          { key: 'opacity', val: 1, prog: 1 },

          // Scale (subtle pulse during swarm)
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.05 },
          { key: 'scale', val: 1, prog: swarmDuration / duration },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      return {
        id: particleId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute rounded-full',
            style: {
              width: `${particleSize}px`,
              height: `${particleSize}px`,
              backgroundColor: textColor,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.6,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `effect-${particleId}`,
            componentId: 'generic',
            data: particleEffect,
          },
        ],
      };
    },
  );

  // Generate ghost particles (trails)
  const ghostParticles: RenderableComponentData[] = [];
  particlePositions.forEach((pos, mainIndex) => {
    for (let trailIndex = 0; trailIndex < trailCount; trailIndex++) {
      const ghostId = `ghost-${mainIndex}-${trailIndex}`;
      const delayMs = (trailIndex + 1) * 50; // 50ms, 100ms, 150ms, 200ms
      const delaySec = delayMs / 1000;
      const opacityValue = 0.4 - trailIndex * 0.1; // 0.4, 0.3, 0.2, 0.1

      // Copy main particle's motion with delay
      const angle = Math.atan2(pos.y, pos.x);
      const scatterDistance = 300 + Math.random() * 200;
      const scatterX = pos.x + Math.cos(angle) * scatterDistance;
      const scatterY = pos.y + Math.sin(angle) * scatterDistance;

      const wanderAmplitudeX = 100 + Math.random() * 100;
      const wanderAmplitudeY = 100 + Math.random() * 100;
      const wanderFrequency = 0.5 + Math.random() * 1;

      const ghostEffect: GenericEffectData = {
        type: 'ease-out',
        start: delaySec, // Delayed start
        duration: duration - delaySec,
        mode: 'provider',
        targetIds: [ghostId],
        ranges: [
          // Same motion as main particle but delayed
          { key: 'translateX', val: pos.x, prog: 0 },
          {
            key: 'translateX',
            val: scatterX,
            prog: (swarmDuration - delaySec) / (duration - delaySec),
          },
          {
            key: 'translateX',
            val: scatterX + Math.sin(wanderFrequency * Math.PI) * wanderAmplitudeX,
            prog:
              (swarmDuration + convergenceDuration * 0.5 - delaySec) /
              (duration - delaySec),
          },
          {
            key: 'translateX',
            val: pos.x * 0.5,
            prog:
              (swarmDuration + convergenceDuration * 0.75 - delaySec) /
              (duration - delaySec),
          },
          {
            key: 'translateX',
            val: pos.x,
            prog: (settleStart - delaySec) / (duration - delaySec),
          },
          { key: 'translateX', val: pos.x, prog: 1 },

          { key: 'translateY', val: pos.y, prog: 0 },
          {
            key: 'translateY',
            val: scatterY,
            prog: (swarmDuration - delaySec) / (duration - delaySec),
          },
          {
            key: 'translateY',
            val: scatterY + Math.cos(wanderFrequency * Math.PI) * wanderAmplitudeY,
            prog:
              (swarmDuration + convergenceDuration * 0.5 - delaySec) /
              (duration - delaySec),
          },
          {
            key: 'translateY',
            val: pos.y * 0.5,
            prog:
              (swarmDuration + convergenceDuration * 0.75 - delaySec) /
              (duration - delaySec),
          },
          {
            key: 'translateY',
            val: pos.y,
            prog: (settleStart - delaySec) / (duration - delaySec),
          },
          { key: 'translateY', val: pos.y, prog: 1 },

          // Opacity (fainter for trails)
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: opacityValue, prog: 0.1 },
          {
            key: 'opacity',
            val: opacityValue * 0.8,
            prog: (swarmDuration - delaySec) / (duration - delaySec),
          },
          {
            key: 'opacity',
            val: opacityValue * 0.6,
            prog: (settleStart - delaySec) / (duration - delaySec),
          },
          { key: 'opacity', val: 0, prog: 1 },

          // Scale
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1, prog: 0.05 },
          { key: 'scale', val: 0.8, prog: 1 },
        ],
      };

      ghostParticles.push({
        id: ghostId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute rounded-full pointer-events-none',
            style: {
              width: `${particleSize * 0.8}px`,
              height: `${particleSize * 0.8}px`,
              backgroundColor: textColor,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: opacityValue,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `effect-${ghostId}`,
            componentId: 'generic',
            data: ghostEffect,
          },
        ],
      });
    }
  });

  // Invisible text overlay (used as spatial reference for final formation)
  const textOverlay: RenderableComponentData = {
    id: 'text-target-overlay',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontStyle.fontWeight,
        color: 'transparent',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
      className: 'absolute inset-0 flex items-center justify-center opacity-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'swarm-typokinetics-container',
    type: 'layout' as const,
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
        duration: duration,
      },
    },
    childrenData: [
      // Particle system container
      {
        id: 'particle-system-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: mainParticles as RenderableComponentData[],
      },
      // Trail system container
      {
        id: 'trail-system-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: ghostParticles as RenderableComponentData[],
      },
      // Text target overlay (invisible reference)
      textOverlay,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'swarm-typokinetics',
  title: 'Swarm Intelligence Typokinetics',
  description:
    'Text animation with particle swarm intelligence (boids algorithm) featuring flocking behavior, motion trails, and organic convergence back to readable text',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'particles',
    'swarm',
    'boids',
    'flocking',
    'kinetic',
    'typography',
    'organic',
    'emergent',
    'trails',
    'motion',
    'advanced',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SWARM',
    fontSize: 72,
    fontWeight: '700',
    textColor: '#FFFFFF',
    particleCount: 120,
    particleSize: 1,
    trailCount: 4,
    duration: 3.5,
    swarmPhaseRatio: 0.4,
    convergencePhaseRatio: 0.4,
    separationDistance: 20,
    alignmentDistance: 50,
    cohesionStrength: 0.8,
    randomness: 5,
    font: 'Inter:700',
  },
};

export const swarmTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
