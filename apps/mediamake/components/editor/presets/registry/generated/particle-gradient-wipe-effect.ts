/**
 * Particle Gradient Wipe Effect Preset
 *
 * Creates a dissolve-like wipe effect where content materializes from scattered particles
 * that converge along a gradient line. Multiple small pseudo-particle elements are animated
 * with randomized positions and individual timing/easing for organic movement.
 *
 * Features:
 * - **Configurable Particle Count**: Control density of particles (10-100)
 * - **Scatter Radius**: Adjust initial spread distance of particles
 * - **Convergence Patterns**: Center, edge, or random distribution
 * - **Organic Movement**: Each particle has unique timing offsets and easing
 * - **Sci-Fi Integration Effect**: Digital disintegration/integration visual style
 *
 * Use cases:
 * - Sci-fi style content reveals
 * - Digital materialization effects
 * - Particle-based transitions
 * - Modern dissolve-style wipes
 * - High-tech visual effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Input parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the particle wipe effect to'),
  particleCount: z
    .number()
    .min(10)
    .max(100)
    .default(20)
    .describe('Number of particles to generate (10-100)'),
  scatterRadius: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Initial scatter radius in pixels (50-500)'),
  convergencePattern: z
    .enum(['center', 'edge', 'random'])
    .default('random')
    .describe(
      'Pattern of particle distribution: center-weighted, edge-weighted, or uniform random',
    ),
  convergenceDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration in seconds for particles to converge (0.5-5)'),
  staggerWindow: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Time window in seconds for staggered particle start times (0-2)'),
  particleColor: z
    .string()
    .default('#ffffff')
    .describe('Color of particles (CSS color value)'),
  particleSize: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Size of each particle in pixels (2-10)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    particleCount,
    scatterRadius,
    convergencePattern,
    convergenceDuration,
    staggerWindow,
    particleColor,
    particleSize,
  } = params;

  // Helper function: Generate random position based on convergence pattern
  const generatePosition = (index: number): { x: number; y: number } => {
    let x: number;
    let y: number;

    switch (convergencePattern) {
      case 'center': {
        // Center-weighted: Use gaussian-like distribution
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * Math.random() * scatterRadius;
        x = Math.cos(angle) * distance;
        y = Math.sin(angle) * distance;
        break;
      }
      case 'edge': {
        // Edge-weighted: Prefer positions near the scatter radius
        const angle = Math.random() * Math.PI * 2;
        const distance = scatterRadius * (0.7 + Math.random() * 0.3);
        x = Math.cos(angle) * distance;
        y = Math.sin(angle) * distance;
        break;
      }
      case 'random':
      default: {
        // Uniform random distribution
        x = Math.random() * scatterRadius * 2 - scatterRadius;
        y = Math.random() * scatterRadius * 2 - scatterRadius;
        break;
      }
    }

    return { x, y };
  };

  // Generate particle effects array
  const particleEffects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  for (let i = 0; i < particleCount; i++) {
    const position = generatePosition(i);
    const startOffset = Math.random() * staggerWindow;

    // Each particle has unique easing for organic feel
    const easingTypes = ['ease-out', 'ease-in-out'] as const;
    const easing = easingTypes[Math.floor(Math.random() * easingTypes.length)];

    const effectData: GenericEffectData = {
      type: easing,
      start: startOffset,
      duration: convergenceDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Translate X: from scattered position to center
        { key: 'translateX', val: position.x, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        // Translate Y: from scattered position to center
        { key: 'translateY', val: position.y, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Scale: from invisible to full size
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Opacity: fade in slightly after scale starts
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    particleEffects.push({
      id: `particle-effect-${i}`,
      componentId: 'generic',
      data: effectData,
    });
  }

  // Generate particle elements (visual representation)
  const particleElements = Array.from({ length: particleCount }, (_, i) => {
    const position = generatePosition(i);

    return {
      id: `particle-element-${i}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${particleSize}px; height: ${particleSize}px; border-radius: 50%; background: ${particleColor}; box-shadow: 0 0 ${particleSize * 2}px ${particleColor};"></div>`,
        className: 'absolute',
        style: {
          top: '50%',
          left: '50%',
          transform: `translate(${position.x}px, ${position.y}px)`,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: convergenceDuration + staggerWindow,
        },
      },
    } as RenderableComponentData;
  });

  // Root container that holds all particles
  const rootContainer = {
    id: `${targetId}-particle-wipe-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: convergenceDuration + staggerWindow,
      },
    },
    effects: particleEffects,
    childrenData: particleElements,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: targetId,
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'particle-gradient-wipe-effect',
  title: 'Particle Gradient Wipe Effect',
  description:
    'Internal effect preset that creates a dissolve-like wipe where content materializes from scattered particles that converge along a gradient line. Features randomized particle positions, timings, and organic movement patterns with configurable particle count, scatter radius, and convergence patterns. Creates sci-fi style digital integration effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'particles',
    'wipe',
    'reveal',
    'gradient',
    'sci-fi',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    particleCount: 20,
    scatterRadius: 200,
    convergencePattern: 'random',
    convergenceDuration: 2,
    staggerWindow: 0.5,
    particleColor: '#ffffff',
    particleSize: 4,
  },
};

// Export preset
export const particleGradientWipeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
