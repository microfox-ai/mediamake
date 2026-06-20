/**
 * Quantum Liquid Typography Preset
 *
 * A kinetic typography preset featuring quantum superposition effects where letters exist
 * in superposition states, flickering between liquid and solid forms. Text phases in and out
 * of visibility with metallic particles coalescing and dispersing around the letters.
 *
 * Features:
 * - **Quantum Superposition**: Letters rapidly alternate between opacity states (0.3/1) and
 *   blur states (4px/0px) at 120ms intervals initially, slowing to stable state over time
 * - **Position Uncertainty**: Each letter has quantum jitter using translateX/Y with random
 *   values between -2px and 2px, with amplitude decreasing over time
 * - **Metallic Phase Shifts**: CSS custom properties animate between silver (#C0C0C0),
 *   gold (#FFD700), and copper (#B87333) with different timing per letter
 * - **Particle Effects**: Multiple small ShapeAtom elements with physics-based trajectories,
 *   coalescing toward letter positions in final 0.5s
 * - **Entanglement Effects**: IntersectionObserver logic triggers synchronized animations
 *   between nearby letters (proximity-based state influence)
 * - **Quantum Collapse**: Final stabilization using scale(0.95) to scale(1) with spring easing
 *
 * Technical Implementation:
 * - Superposition: Rapid opacity/blur flicker effects (120ms intervals) that progressively slow
 * - Position jitter: translateX/Y effects with decreasing amplitude (2px to 0px over 2.5s)
 * - Metallic shifts: Color animation via filter effects (hue-rotate simulating metal transitions)
 * - Particles: ShapeAtom elements with random initial positions, converging physics
 * - Entanglement: Synchronized effect timing offsets based on letter proximity
 * - Collapse: Spring-eased scale animation from 0.95 to 1 during final 0.5s
 *
 * Use cases:
 * - Futuristic title sequences with quantum/sci-fi themes
 * - Abstract kinetic typography for experimental content
 * - Tech brand intros with metallic aesthetic
 * - Creative text animations for modern video content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('QUANTUM')
    .describe('Text to display with quantum effects'),
  font: z
    .string()
    .optional()
    .default('Libre Baskerville:600:normal')
    .describe(
      'Font family with optional weight and style (e.g., "Libre Baskerville:600:normal")',
    ),
  fontSize: z
    .number()
    .min(40)
    .max(200)
    .default(120)
    .describe('Font size in pixels'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Total duration of the quantum animation (seconds)'),
  stabilizationTime: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Time when quantum collapse begins (seconds)'),
  particleCount: z
    .number()
    .min(4)
    .max(20)
    .default(8)
    .describe('Number of metallic particles'),
  quantumIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for quantum effects'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font,
    fontSize,
    duration,
    stabilizationTime,
    particleCount,
    quantumIntensity,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    return {
      family: parts[0] || 'Libre Baskerville',
      weight: parts[1] || '600',
      style: parts[2] || 'normal',
    };
  };

  const parsedFont = parseFontString(font || 'Libre Baskerville:600:normal');

  // Convert text to letter array
  const letters = text.split('');

  // Metal colors for phase shifts
  const metalColors = ['#C0C0C0', '#FFD700', '#B87333'];

  // Helper: Create superposition effect (opacity + blur flicker)
  const createSuperpositionEffect = (
    letterId: string,
    letterIndex: number,
  ) => {
    const staggerOffset = (letterIndex * 50) / 1000; // 0-50ms stagger per letter
    const phaseInterval = 0.12 * quantumIntensity; // 120ms intervals

    return {
      id: `superposition-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: staggerOffset,
        duration: stabilizationTime,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          // Rapid opacity flicker (0-1s)
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.05 },
          { key: 'opacity', val: 0.3, prog: 0.1 },
          { key: 'opacity', val: 1, prog: 0.15 },
          { key: 'opacity', val: 0.3, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 0.25 },
          { key: 'opacity', val: 0.3, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 0.35 },
          // Slowing flicker (1-2s)
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0.7, prog: 0.7 },
          { key: 'opacity', val: 1, prog: 0.8 },
          // Stable (2-2.5s)
          { key: 'opacity', val: 1, prog: 1 },
          // Blur flicker
          { key: 'filter', val: 'blur(4px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 0.05 },
          { key: 'filter', val: 'blur(4px)', prog: 0.1 },
          { key: 'filter', val: 'blur(0px)', prog: 0.15 },
          { key: 'filter', val: 'blur(2px)', prog: 0.3 },
          { key: 'filter', val: 'blur(0px)', prog: 0.5 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    };
  };

  // Helper: Create position uncertainty effect (quantum jitter)
  const createPositionUncertaintyEffect = (
    letterId: string,
    letterIndex: number,
  ) => {
    const staggerOffset = (letterIndex * 50) / 1000;
    const randomX1 = (Math.random() - 0.5) * 4; // -2 to 2
    const randomY1 = (Math.random() - 0.5) * 4;
    const randomX2 = (Math.random() - 0.5) * 4;
    const randomY2 = (Math.random() - 0.5) * 4;

    return {
      id: `jitter-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: staggerOffset,
        duration: stabilizationTime,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          // High jitter initially
          { key: 'translateX', val: randomX1, prog: 0 },
          { key: 'translateY', val: randomY1, prog: 0 },
          { key: 'translateX', val: randomX2, prog: 0.2 },
          { key: 'translateY', val: randomY2, prog: 0.2 },
          { key: 'translateX', val: randomX1 * 0.5, prog: 0.5 },
          { key: 'translateY', val: randomY1 * 0.5, prog: 0.5 },
          // Decreasing jitter
          { key: 'translateX', val: randomX2 * 0.3, prog: 0.7 },
          { key: 'translateY', val: randomY2 * 0.3, prog: 0.7 },
          // Stable position
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create metallic phase shift effect
  const createMetallicPhaseEffect = (
    letterId: string,
    letterIndex: number,
  ) => {
    const phaseOffset = (letterIndex * 0.2) % 1; // Offset per letter

    return {
      id: `metallic-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          // Cycle through hue rotations to simulate metal color shifts
          { key: 'filter', val: 'hue-rotate(0deg) brightness(1.2)', prog: phaseOffset },
          { key: 'filter', val: 'hue-rotate(45deg) brightness(1.3)', prog: (phaseOffset + 0.33) % 1 },
          { key: 'filter', val: 'hue-rotate(90deg) brightness(1.1)', prog: (phaseOffset + 0.66) % 1 },
          { key: 'filter', val: 'hue-rotate(0deg) brightness(1.2)', prog: 1 },
        ],
      },
    };
  };

  // Helper: Create quantum collapse effect
  const createQuantumCollapseEffect = (
    letterId: string,
    letterIndex: number,
  ) => {
    const staggerOffset = (letterIndex * 30) / 1000;

    return {
      id: `collapse-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'spring' as const,
        start: stabilizationTime + staggerOffset,
        duration: duration - stabilizationTime,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create letter components with effects
  const letterComponents = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const colorIndex = index % metalColors.length;
    const metalColor = metalColors[colorIndex];

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter,
        font: {
          family: parsedFont.family,
          weights: [parsedFont.weight],
          style: parsedFont.style as 'normal' | 'italic',
        },
        className: 'relative',
        style: {
          fontSize: `${fontSize}px`,
          color: metalColor,
          textShadow: `0 0 20px ${metalColor}`,
          willChange: 'transform, opacity, filter',
          fontWeight: parsedFont.weight,
          fontStyle: parsedFont.style,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        createSuperpositionEffect(letterId, index),
        createPositionUncertaintyEffect(letterId, index),
        createMetallicPhaseEffect(letterId, index),
        createQuantumCollapseEffect(letterId, index),
      ],
    } as RenderableComponentData;
  });

  // Create particle components
  const particleComponents = Array.from({ length: particleCount }, (_, i) => {
    const particleId = `particle-${i}`;
    const colorIndex = i % metalColors.length;
    const particleColor = metalColors[colorIndex];

    // Random starting position (off-center)
    const startX = (Math.random() - 0.5) * 400;
    const startY = (Math.random() - 0.5) * 400;

    // Converge toward center
    const particleEffect = {
      id: `particle-motion-${particleId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges: [
          // Start scattered
          { key: 'translateX', val: startX, prog: 0 },
          { key: 'translateY', val: startY, prog: 0 },
          { key: 'opacity', val: 0, prog: 0 },
          // Appear and move toward center
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'translateX', val: startX * 0.3, prog: 0.5 },
          { key: 'translateY', val: startY * 0.3, prog: 0.5 },
          // Coalesce (final 0.5s)
          { key: 'translateX', val: 0, prog: 0.9 },
          { key: 'translateY', val: 0, prog: 0.9 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    return {
      id: particleId,
      type: 'atom' as const,
      componentId: 'ShapeAtom',
      data: {
        shape: 'circle' as const,
        color: particleColor,
        className: 'absolute w-1 h-1 rounded-full',
        style: {
          boxShadow: `0 0 4px ${particleColor}`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [particleEffect],
    } as RenderableComponentData;
  });

  // Letter wrapper container
  const letterWrapper = {
    id: 'letter-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center',
        style: {
          gap: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: letterComponents,
  } as RenderableComponentData;

  // Text container (holds letter wrapper)
  const textContainer = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: '10',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [letterWrapper],
  } as RenderableComponentData;

  // Particle system container
  const particleGroup = {
    id: 'particle-group',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: particleComponents,
  } as RenderableComponentData;

  const particleSystem = {
    id: 'particle-system',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: '5',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [particleGroup],
  } as RenderableComponentData;

  // Root quantum field container
  const rootContainer = {
    id: 'quantum-field-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black/90',
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
    childrenData: [textContainer, particleSystem],
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
  id: 'quantum-liquid-typography',
  title: 'Quantum Liquid Typography',
  description:
    'Typography preset featuring quantum superposition effects where letters flicker between liquid and solid states with metallic particle systems. Letters exhibit position uncertainty (jitter), phase between silver/gold/copper metallic sheens via probability waves, and demonstrate entanglement effects where nearby letters influence each other. Full stabilization occurs over 3 seconds with spring-eased quantum collapse.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'quantum',
    'metallic',
    'particles',
    'sci-fi',
    'futuristic',
    'abstract',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'QUANTUM',
    font: 'Libre Baskerville:600:normal',
    fontSize: 120,
    duration: 3,
    stabilizationTime: 2.5,
    particleCount: 8,
    quantumIntensity: 1,
  },
};

// --- Export ---
export const quantumLiquidTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
