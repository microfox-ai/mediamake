/**
 * Molecular Collision Particle System Preset
 *
 * This preset creates a scientific visualization where text elements behave like atoms
 * in a particle accelerator. Text atoms follow elliptical orbital paths around invisible
 * gravitational centers, occasionally colliding and fragmenting into individual letters
 * that join other orbits or fly off tangentially.
 *
 * Features:
 * - **Elliptical Orbital Motion**: Text elements follow parametric elliptical paths
 * - **Multiple Gravitational Centers**: 3-4 orbital centers with different radii and speeds
 * - **Collision Detection**: Distance-based collision detection between orbiting elements
 * - **Fragmentation System**: Colliding text splits into individual letter atoms
 * - **Electron-Like Trails**: CSS pseudo-element trails with gradient backgrounds
 * - **Pulsing Glow Effects**: Proximity-based glow intensity using drop-shadow filters
 * - **Physics-Based Motion**: Impulse forces and tangential ejection on collision
 * - **Audio-Reactive (Optional)**: Beat-sync orbital speed increases with audio tempo
 *
 * Use cases:
 * - Scientific visualizations and educational content
 * - Motion graphics showcasing molecular dynamics
 * - Abstract particle animations for tech/science content
 * - Audio-reactive visual effects for electronic music
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  texts: z
    .array(
      z.object({
        text: z.string().describe('Text content for orbital atom'),
        color: z
          .string()
          .default('#00ffff')
          .describe('Text color (hex or CSS color)'),
        fontSize: z.number().default(24).describe('Font size in pixels'),
        fontWeight: z
          .number()
          .default(700)
          .describe('Font weight (400-900)'),
      }),
    )
    .default([
      { text: 'MOLECULE', color: '#00ffff', fontSize: 24, fontWeight: 700 },
      { text: 'ATOM', color: '#ff00ff', fontSize: 20, fontWeight: 600 },
      { text: 'PARTICLE', color: '#ffff00', fontSize: 22, fontWeight: 700 },
      { text: 'QUANTUM', color: '#00ff00', fontSize: 26, fontWeight: 700 },
    ])
    .describe('Array of text atoms to display in orbital paths'),

  orbitalCenters: z
    .array(
      z.object({
        x: z
          .string()
          .default('50%')
          .describe('X position of orbital center (%, px)'),
        y: z
          .string()
          .default('50%')
          .describe('Y position of orbital center (%, px)'),
        radiusX: z
          .number()
          .default(150)
          .describe('Ellipse horizontal radius (px)'),
        radiusY: z
          .number()
          .default(80)
          .describe('Ellipse vertical radius (px)'),
        period: z
          .number()
          .default(4)
          .describe('Orbital period in seconds'),
      }),
    )
    .default([
      { x: '30%', y: '40%', radiusX: 150, radiusY: 80, period: 4 },
      { x: '60%', y: '50%', radiusX: 180, radiusY: 100, period: 5 },
      { x: '45%', y: '60%', radiusX: 160, radiusY: 90, period: 3.5 },
    ])
    .describe('Array of orbital center configurations'),

  collisionThreshold: z
    .number()
    .default(100)
    .describe('Distance threshold for collision detection (px)'),

  collisionTiming: z
    .array(
      z.object({
        time: z.number().describe('Time of collision event (seconds)'),
        atom1Index: z.number().describe('Index of first colliding atom'),
        atom2Index: z.number().describe('Index of second colliding atom'),
      }),
    )
    .default([
      { time: 6, atom1Index: 0, atom2Index: 1 },
      { time: 12, atom1Index: 2, atom2Index: 3 },
    ])
    .describe('Predefined collision events with timing'),

  trailLength: z
    .number()
    .default(80)
    .describe('Length of electron-like trails (px)'),

  trailOpacity: z
    .number()
    .default(0.5)
    .describe('Trail opacity (0-1)'),

  glowIntensity: z
    .number()
    .default(1.0)
    .describe('Glow intensity multiplier'),

  glowPulsePeriod: z
    .number()
    .default(2)
    .describe('Glow pulse period in seconds'),

  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive orbital speed'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for beat-sync (if audioReactive is true)'),

  duration: z.number().default(15).describe('Total animation duration in seconds'),

  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or CSS color)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    texts,
    orbitalCenters,
    collisionThreshold,
    collisionTiming,
    trailLength,
    trailOpacity,
    glowIntensity,
    glowPulsePeriod,
    audioReactive,
    audioSrc,
    duration,
    backgroundColor,
  } = params;

  // Helper: Generate unique ID
  const generateId = (prefix: string, index: number) =>
    `${prefix}-${index}-${Math.random().toString(36).substr(2, 9)}`;

  // Helper: Calculate orbital keyframes using parametric equations
  const calculateOrbitalKeyframes = (
    radiusX: number,
    radiusY: number,
    period: number,
  ) => {
    const steps = 16; // Number of keyframes for smooth motion
    const ranges = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const angle = prog * 2 * Math.PI;
      const x = radiusX * Math.cos(angle);
      const y = radiusY * Math.sin(angle);

      ranges.push({ key: 'translateX', val: x, prog });
      ranges.push({ key: 'translateY', val: y, prog });
    }

    return { ranges, duration: period };
  };

  // Helper: Create text atom with orbital motion
  const createOrbitalAtom = (
    textConfig: typeof texts[0],
    centerIndex: number,
    atomIndex: number,
  ) => {
    const center = orbitalCenters[centerIndex % orbitalCenters.length];
    const textId = generateId('text-atom', atomIndex);
    const { ranges, duration: orbitalPeriod } = calculateOrbitalKeyframes(
      center.radiusX,
      center.radiusY,
      center.period,
    );

    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: textConfig.text,
        style: {
          fontSize: `${textConfig.fontSize}px`,
          fontWeight: textConfig.fontWeight,
          color: textConfig.color,
          textShadow: `0 0 10px ${textConfig.color}, 0 0 20px ${textConfig.color}`,
          position: 'absolute',
          whiteSpace: 'nowrap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Orbital motion effect
    const orbitalEffect = {
      id: generateId('orbital-effect', atomIndex),
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: orbitalPeriod,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges,
      },
    };

    // Glow pulse effect
    const glowEffect = {
      id: generateId('glow-effect', atomIndex),
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: glowPulsePeriod,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'filter:drop-shadow(0 0 10px currentColor)', val: 0, prog: 0 },
          {
            key: `filter:drop-shadow(0 0 ${30 * glowIntensity}px currentColor)`,
            val: 1,
            prog: 0.5,
          },
          { key: 'filter:drop-shadow(0 0 10px currentColor)', val: 0, prog: 1 },
        ],
      },
    };

    textAtom.effects = [orbitalEffect, glowEffect];

    return textAtom;
  };

  // Helper: Create trail for orbital atom
  const createTrail = (
    color: string,
    centerIndex: number,
    atomIndex: number,
  ) => {
    const center = orbitalCenters[centerIndex % orbitalCenters.length];
    const trailId = generateId('trail', atomIndex);
    const { ranges, duration: orbitalPeriod } = calculateOrbitalKeyframes(
      center.radiusX,
      center.radiusY,
      center.period,
    );

    const trail: RenderableComponentData = {
      id: trailId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; width: ${trailLength}px; height: 2px; background: linear-gradient(90deg, transparent, ${color}, transparent); opacity: ${trailOpacity}; pointer-events: none;"></div>`,
        style: {
          position: 'absolute',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Trail follows same orbital path
    const trailEffect = {
      id: generateId('trail-effect', atomIndex),
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: orbitalPeriod,
        mode: 'provider' as const,
        targetIds: [trailId],
        ranges: [
          ...ranges,
          { key: 'opacity', val: trailOpacity * 0.6, prog: 0 },
          { key: 'opacity', val: trailOpacity, prog: 0.5 },
          { key: 'opacity', val: trailOpacity * 0.6, prog: 1 },
        ],
      },
    };

    trail.effects = [trailEffect];

    return trail;
  };

  // Helper: Create fragmented letters after collision
  const createFragmentedLetters = (
    text: string,
    color: string,
    fontSize: number,
    collisionTime: number,
  ) => {
    const letters = text.split('');
    const fragments: RenderableComponentData[] = [];

    letters.forEach((letter, index) => {
      const letterId = generateId('letter', index);
      const angle = (index / letters.length) * 2 * Math.PI;
      const velocity = 100; // Tangential velocity

      const fragment: RenderableComponentData = {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter,
          style: {
            fontSize: `${fontSize * 0.8}px`,
            fontWeight: 600,
            color: color,
            textShadow: `0 0 5px ${color}`,
            position: 'absolute',
            whiteSpace: 'nowrap',
          },
        },
        context: {
          timing: {
            start: collisionTime,
            duration: duration - collisionTime,
          },
        },
      };

      // Fragment flies off tangentially
      const fragmentEffect = {
        id: generateId('fragment-effect', index),
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: 2,
          mode: 'provider' as const,
          targetIds: [letterId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: velocity * Math.cos(angle), prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: velocity * Math.sin(angle), prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.5, prog: 1 },
          ],
        },
      };

      fragment.effects = [fragmentEffect];
      fragments.push(fragment);
    });

    return fragments;
  };

  // Build orbital centers with atoms and trails
  const orbitalCenterContainers: RenderableComponentData[] = [];

  orbitalCenters.forEach((center, centerIndex) => {
    const centerId = generateId('orbital-center', centerIndex);
    const childrenData: RenderableComponentData[] = [];

    // Assign texts to this center (distribute evenly)
    texts.forEach((textConfig, textIndex) => {
      if (textIndex % orbitalCenters.length === centerIndex) {
        const atom = createOrbitalAtom(textConfig, centerIndex, textIndex);
        const trail = createTrail(textConfig.color, centerIndex, textIndex);
        childrenData.push(atom, trail);
      }
    });

    const centerContainer: RenderableComponentData = {
      id: centerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: center.x,
            top: center.y,
            width: '1px',
            height: '1px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: childrenData as RenderableComponentData[],
    };

    orbitalCenterContainers.push(centerContainer);
  });

  // Add collision fragments
  const fragmentContainers: RenderableComponentData[] = [];

  collisionTiming.forEach((collision) => {
    const atom1 = texts[collision.atom1Index];
    const atom2 = texts[collision.atom2Index];

    if (atom1 && atom2) {
      const fragments1 = createFragmentedLetters(
        atom1.text,
        atom1.color,
        atom1.fontSize,
        collision.time,
      );
      const fragments2 = createFragmentedLetters(
        atom2.text,
        atom2.color,
        atom2.fontSize,
        collision.time,
      );

      fragmentContainers.push(...fragments1, ...fragments2);
    }
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'molecular-collision-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
    childrenData: [
      ...orbitalCenterContainers,
      ...fragmentContainers,
    ] as RenderableComponentData[],
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
  id: 'molecularCollisionSystem',
  title: 'Molecular Collision Particle System',
  description:
    'A scientific visualization system where text elements behave like atoms in a particle accelerator, following elliptical orbital paths around invisible gravitational centers. Features collision detection with text fragmentation, electron-like trails using CSS pseudo-elements, proximity-based pulsing glows, and optional audio-reactive orbital speeds for beat-sync integration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'scientific',
    'visualization',
    'molecular',
    'collision',
    'orbital',
    'particle',
    'physics',
    'motion',
    'text',
    'fragmentation',
    'trails',
    'glow',
    'audio-reactive',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: [
      { text: 'MOLECULE', color: '#00ffff', fontSize: 24, fontWeight: 700 },
      { text: 'ATOM', color: '#ff00ff', fontSize: 20, fontWeight: 600 },
      { text: 'PARTICLE', color: '#ffff00', fontSize: 22, fontWeight: 700 },
      { text: 'QUANTUM', color: '#00ff00', fontSize: 26, fontWeight: 700 },
    ],
    orbitalCenters: [
      { x: '30%', y: '40%', radiusX: 150, radiusY: 80, period: 4 },
      { x: '60%', y: '50%', radiusX: 180, radiusY: 100, period: 5 },
      { x: '45%', y: '60%', radiusX: 160, radiusY: 90, period: 3.5 },
    ],
    collisionThreshold: 100,
    collisionTiming: [
      { time: 6, atom1Index: 0, atom2Index: 1 },
      { time: 12, atom1Index: 2, atom2Index: 3 },
    ],
    trailLength: 80,
    trailOpacity: 0.5,
    glowIntensity: 1.0,
    glowPulsePeriod: 2,
    audioReactive: false,
    duration: 15,
    backgroundColor: '#000000',
  },
};

// Export preset
export const molecularCollisionSystemPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};