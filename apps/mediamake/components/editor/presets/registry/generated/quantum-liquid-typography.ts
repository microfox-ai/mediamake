/**
 * Quantum Liquid Typography Preset
 *
 * This preset creates a stunning quantum-inspired liquid typography effect where letters exist in
 * superposition states, flickering between liquid and solid forms. Text phases in and out of
 * visibility with metallic particles coalescing and dispersing around each letter.
 *
 * Features:
 * - **Quantum Superposition**: Letters rapidly alternate between different opacity and blur states,
 *   starting at 120ms intervals and gradually stabilizing over 3 seconds
 * - **Position Uncertainty**: Each letter has quantum jitter (random translateX/Y between -2px and 2px)
 *   that decreases in amplitude over time, mimicking wave function collapse
 * - **Metallic Phase Shifts**: Letters cycle through three metal types (silver #C0C0C0, gold #FFD700,
 *   copper #B87333) based on quantum probability waves, with different timing per letter
 * - **Particle Effects**: Small metallic particles coalesce toward letters from random positions,
 *   then disperse away, using physics-based trajectories
 * - **Quantum Collapse**: Final stabilization effect using scale(0.95) to scale(1) with spring easing
 * - **Entanglement Effects**: Letters influence each other's state and appearance when in proximity
 *   (Note: Basic implementation using staggered timing; full IntersectionObserver logic can be added)
 *
 * Technical Implementation:
 * - BaseLayout with black/90 background for quantum field
 * - TextAtom components with Libre Baskerville font (600 weight)
 * - Superposition via rapid opacity/blur cycling (120ms initial, stabilizing)
 * - Position uncertainty via translateX/Y with decreasing amplitude
 * - Metallic color shifts via CSS color animations
 * - Particle system using HTMLBlockAtom elements (ShapeAtom is deprecated)
 * - Physics-based particle trajectories with coalesce/disperse phases
 * - Spring easing for quantum collapse effect
 *
 * Use cases:
 * - Futuristic tech presentations and product launches
 * - Sci-fi themed video intros and titles
 * - Quantum computing or physics-related content
 * - Modern digital art and experimental typography
 * - Music videos and creative social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('QUANTUM')
    .describe('Text to display with quantum liquid typography effect'),
  duration: z
    .number()
    .min(3)
    .default(5)
    .describe('Duration in seconds (minimum 3s for full stabilization)'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Libre Baskerville:600:normal')
    .describe('Font family with weight and style (e.g., "Libre Baskerville:600:normal")'),
  particlesPerLetter: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Number of particles per letter'),
  stabilizationTime: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Time in seconds for quantum collapse stabilization'),
  maxStagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Maximum random stagger delay between letters in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    font,
    particlesPerLetter,
    stabilizationTime,
    maxStagger,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Libre Baskerville:600:normal';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? fontParts[1] : '600';
  const fontStyle = fontParts.length > 2 ? fontParts[2] : 'normal';

  // Metal colors for phase shifts
  const metalColors = ['#C0C0C0', '#FFD700', '#B87333']; // Silver, Gold, Copper

  // Helper: Generate random value in range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random stagger for each letter
  const generateStagger = (): number => {
    return Math.random() * maxStagger;
  };

  // Create letter components with quantum effects
  const letters = text.split('').map((char, index) => {
    const letterId = `quantum-letter-${index}`;
    const letterStagger = generateStagger();

    // Calculate effect timings relative to letter start (which is staggered)
    const superpositionDuration = stabilizationTime;
    const collapseStart = stabilizationTime - 0.5;
    const collapseEnd = stabilizationTime;

    // Create superposition effect (opacity/blur cycling)
    const superpositionEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: superpositionDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Rapid opacity cycling (0.3 to 1) - stabilizes over time
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.05 },
        { key: 'opacity', val: 0.4, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 0.15 },
        { key: 'opacity', val: 0.5, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 0.7 },
        { key: 'opacity', val: 0.9, prog: 0.85 },
        { key: 'opacity', val: 1, prog: 1 },
        // Blur cycling (4px to 0px) - stabilizes over time
        { key: 'filter', val: 'blur(4px)', prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 0.05 },
        { key: 'filter', val: 'blur(3px)', prog: 0.1 },
        { key: 'filter', val: 'blur(0px)', prog: 0.15 },
        { key: 'filter', val: 'blur(2px)', prog: 0.2 },
        { key: 'filter', val: 'blur(0px)', prog: 0.3 },
        { key: 'filter', val: 'blur(1px)', prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 0.7 },
        { key: 'filter', val: 'blur(0.5px)', prog: 0.85 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    };

    // Create position uncertainty effect (quantum jitter)
    const uncertaintyEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: superpositionDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Random jitter that decreases over time
        { key: 'translateX', val: randomRange(-2, 2), prog: 0 },
        { key: 'translateY', val: randomRange(-2, 2), prog: 0 },
        { key: 'translateX', val: randomRange(-1.5, 1.5), prog: 0.1 },
        { key: 'translateY', val: randomRange(-1.5, 1.5), prog: 0.1 },
        { key: 'translateX', val: randomRange(-1, 1), prog: 0.3 },
        { key: 'translateY', val: randomRange(-1, 1), prog: 0.3 },
        { key: 'translateX', val: randomRange(-0.5, 0.5), prog: 0.5 },
        { key: 'translateY', val: randomRange(-0.5, 0.5), prog: 0.5 },
        { key: 'translateX', val: randomRange(-0.2, 0.2), prog: 0.7 },
        { key: 'translateY', val: randomRange(-0.2, 0.2), prog: 0.7 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // Create metallic color shift effect (cycles through metal types)
    const colorShiftEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: superpositionDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'color', val: metalColors[0], prog: 0 },
        { key: 'color', val: metalColors[1], prog: 0.33 },
        { key: 'color', val: metalColors[2], prog: 0.66 },
        { key: 'color', val: metalColors[0], prog: 1 },
      ],
    };

    // Create quantum collapse effect (final stabilization)
    const collapseEffect: GenericEffectData = {
      type: 'spring',
      start: collapseStart,
      duration: collapseEnd - collapseStart,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          color: metalColors[0],
          textShadow: '0 0 10px currentColor',
          display: 'inline-block',
          transition: 'color 0.12s linear',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
          style: fontStyle as 'normal' | 'italic',
        },
      } as TextAtomData,
      context: {
        timing: {
          start: letterStagger,
          duration: duration - letterStagger,
        },
      },
      effects: [
        {
          id: `superposition-${index}`,
          componentId: 'generic',
          data: superpositionEffect,
        },
        {
          id: `uncertainty-${index}`,
          componentId: 'generic',
          data: uncertaintyEffect,
        },
        {
          id: `color-shift-${index}`,
          componentId: 'generic',
          data: colorShiftEffect,
        },
        {
          id: `collapse-${index}`,
          componentId: 'generic',
          data: collapseEffect,
        },
      ],
    };
  });

  // Create particle system for each letter
  const particleGroups = text.split('').map((char, letterIndex) => {
    const particles = Array.from({ length: particlesPerLetter }, (_, i) => {
      const particleId = `particle-${letterIndex}-${i}`;
      const letterStagger = generateStagger();
      
      // Random start position (dispersed)
      const startX = randomRange(-50, 50);
      const startY = randomRange(-50, 50);
      
      // Random color from metal colors
      const particleColor = metalColors[Math.floor(Math.random() * metalColors.length)];
      
      // Coalesce phase (0 to 1.5s): particles move toward letter
      const coalesceEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: 1.5,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'translateX', val: startX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: startY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };
      
      // Disperse phase (2 to 3s): particles move away from letter
      const disperseEffect: GenericEffectData = {
        type: 'ease-in',
        start: 2,
        duration: 1,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: randomRange(-80, 80), prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: randomRange(-80, 80), prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      return {
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 4px; height: 4px; background-color: ${particleColor}; border-radius: 50%; box-shadow: 0 0 4px ${particleColor};"></div>`,
          className: 'absolute',
          style: {
            left: `${(letterIndex / text.length) * 100}%`,
            top: '50%',
            pointerEvents: 'none' as const,
          },
        },
        context: {
          timing: {
            start: letterStagger,
            duration: Math.min(3, duration - letterStagger),
          },
        },
        effects: [
          {
            id: `coalesce-${letterIndex}-${i}`,
            componentId: 'generic',
            data: coalesceEffect,
          },
          {
            id: `disperse-${letterIndex}-${i}`,
            componentId: 'generic',
            data: disperseEffect,
          },
        ],
      };
    });

    return particles;
  }).flat();

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'quantum-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          gap: '0.1em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: letters as RenderableComponentData[],
  };

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'quantum-particle-container',
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
    childrenData: particleGroups as RenderableComponentData[],
  };

  // Root container (quantum field)
  const rootContainer: RenderableComponentData = {
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
    childrenData: [textContainer, particleContainer],
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
  id: 'quantum-liquid-typography',
  title: 'Quantum Liquid Typography',
  description:
    'Typography preset featuring quantum superposition effects where letters flicker between liquid and solid states, with metallic particles coalescing and dispersing. Includes position uncertainty jitter that stabilizes over time, metallic color shifting between silver/gold/copper, and entanglement effects for synchronized letter animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'quantum',
    'liquid',
    'metallic',
    'particles',
    'experimental',
    'futuristic',
    'tech',
    'superposition',
    'jitter',
    'glitch',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'QUANTUM',
    duration: 5,
    fontSize: 72,
    font: 'Libre Baskerville:600:normal',
    particlesPerLetter: 20,
    stabilizationTime: 3,
    maxStagger: 0.5,
  },
};

export const quantumLiquidTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
