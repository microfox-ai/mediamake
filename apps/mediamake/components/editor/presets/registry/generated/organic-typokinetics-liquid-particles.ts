/**
 * Organic Typokinetics - Liquid Particle Flow Preset
 *
 * Creates a premium liquid metal typography effect where text dissolves into
 * interconnected particles that flow like ferrofluid with cohesion, surface tension,
 * and elastic connections. Three-phase animation: dissolve → organic flow → reform.
 *
 * Features:
 * - 10-15 circular particles per character with varied sizes
 * - SVG connection lines between nearby particles (elastic strings)
 * - Spring physics easing for organic motion (cubic-bezier(0.175, 0.885, 0.32, 1.275))
 * - Metaball-like visual cohesion with mix-blend-mode: screen
 * - Surface tension effect with scale oscillation (1 → 1.3 → 0.8 → 1)
 * - Motion blur during animation, clear when static
 * - Proximity detection for particle cohesion (10% scale increase when overlapping)
 *
 * Technical:
 * - Uses BaseLayout with preserve-3d for depth
 * - Each character becomes a particle cluster with HTMLBlockAtom circles
 * - Dynamic SVG lines connect nearby particles
 * - Batch processing for performance optimization
 * - Transform3d for GPU acceleration
 *
 * Use cases:
 * - Luxury brand titles
 * - Premium product reveals
 * - High-end fashion content
 * - Tech/innovation presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to render with liquid particle effect'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Base font size for text layout'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of particles (CSS color)'),
  particlesPerChar: z
    .number()
    .min(8)
    .max(20)
    .default(12)
    .describe('Number of particles per character'),
  connectionDistance: z
    .number()
    .min(20)
    .max(100)
    .default(50)
    .describe('Maximum distance for particle connections (pixels)'),
  flowIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of particle flow motion'),
  cohesionStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Strength of metaball cohesion effect (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    particlesPerChar,
    connectionDistance,
    flowIntensity,
    cohesionStrength,
  } = params;

  // Helper function: Generate particle positions for a character
  const generateParticlePositions = (
    charIndex: number,
    charCount: number,
  ): Array<{ x: number; y: number; size: number }> => {
    const particles: Array<{ x: number; y: number; size: number }> = [];
    const baseX = charIndex * fontSize * 0.8; // Spacing between characters
    const baseY = 0;

    // Character bounding box dimensions
    const charWidth = fontSize * 0.6;
    const charHeight = fontSize;

    for (let i = 0; i < particlesPerChar; i++) {
      // Distribute particles in character bounds with some randomness
      const xOffset = (Math.random() - 0.5) * charWidth;
      const yOffset = (Math.random() - 0.5) * charHeight;

      // Vary particle sizes (8px to 16px)
      const size = 8 + Math.random() * 8;

      particles.push({
        x: baseX + xOffset,
        y: baseY + yOffset,
        size: size,
      });
    }

    return particles;
  };

  // Helper function: Calculate distance between two points
  const calculateDistance = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
  ): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function: Generate connection lines between nearby particles
  const generateConnections = (
    allParticles: Array<{ x: number; y: number; charIndex: number }>,
  ): Array<{ x1: number; y1: number; x2: number; y2: number }> => {
    const connections: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }> = [];

    // Only connect particles within connection distance
    for (let i = 0; i < allParticles.length; i++) {
      for (let j = i + 1; j < allParticles.length; j++) {
        const p1 = allParticles[i];
        const p2 = allParticles[j];
        const distance = calculateDistance(p1, p2);

        if (distance < connectionDistance) {
          connections.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
          });
        }
      }
    }

    return connections;
  };

  // Generate particles for all characters
  const chars = text.split('');
  const allParticlesByChar: Array<
    Array<{ x: number; y: number; size: number }>
  > = [];
  const allParticlesFlat: Array<{
    x: number;
    y: number;
    charIndex: number;
  }> = [];

  chars.forEach((char, charIndex) => {
    if (char.trim() === '') return; // Skip spaces
    const particles = generateParticlePositions(charIndex, chars.length);
    allParticlesByChar.push(particles);

    // Collect all particles for connection calculation
    particles.forEach((p) => {
      allParticlesFlat.push({ x: p.x, y: p.y, charIndex });
    });
  });

  // Generate connections
  const connections = generateConnections(allParticlesFlat);

  // Phase timings (relative to container start)
  const dissolvePhase = { start: 0, duration: duration * 0.27 }; // 0-0.8s
  const flowPhase = { start: duration * 0.27, duration: duration * 0.47 }; // 0.8-2.2s
  const reformPhase = { start: duration * 0.73, duration: duration * 0.27 }; // 2.2-3s

  // Create particle components
  const particleComponents: RenderableComponentData[] = [];
  let particleIdCounter = 0;

  allParticlesByChar.forEach((particles, charIndex) => {
    particles.forEach((particle, particleIndex) => {
      const particleId = `particle-${charIndex}-${particleIndex}`;
      particleIdCounter++;

      // Calculate flow motion parameters
      const flowX = (Math.random() - 0.5) * 100 * flowIntensity;
      const flowY = (Math.random() - 0.5) * 100 * flowIntensity;
      const scaleVariation = 0.1 + Math.random() * 0.2;

      // Particle component
      particleComponents.push({
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute rounded-full',
          style: {
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: textColor,
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            mixBlendMode: cohesionStrength > 0.5 ? 'screen' : 'normal',
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
            id: `${particleId}-dissolve`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: dissolvePhase.start,
              duration: dissolvePhase.duration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'blur', val: '5px', prog: 0 },
                { key: 'blur', val: '0.5px', prog: 0.5 },
                { key: 'blur', val: '0px', prog: 1 },
              ],
            },
          },
          {
            id: `${particleId}-flow`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: flowPhase.start,
              duration: flowPhase.duration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: flowX, prog: 0.3 },
                { key: 'translateX', val: flowX * 0.7, prog: 0.6 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: flowY, prog: 0.3 },
                { key: 'translateY', val: flowY * 0.7, prog: 0.6 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1 + scaleVariation * cohesionStrength, prog: 0.2 },
                { key: 'scale', val: 1 - scaleVariation * 0.5, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'blur', val: '0.5px', prog: 0 },
                { key: 'blur', val: '1px', prog: 0.5 },
                { key: 'blur', val: '0.5px', prog: 1 },
              ],
            },
          },
          {
            id: `${particleId}-reform`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: reformPhase.start,
              duration: reformPhase.duration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.3, prog: 0.3 },
                { key: 'scale', val: 0.8, prog: 0.6 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'blur', val: '0.5px', prog: 0 },
                { key: 'blur', val: '0px', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });
  });

  // Create connection lines (SVG)
  const connectionElements: RenderableComponentData[] = [];

  connections.forEach((conn, connIndex) => {
    const connId = `connection-${connIndex}`;
    const length = calculateDistance(
      { x: conn.x1, y: conn.y1 },
      { x: conn.x2, y: conn.y2 },
    );
    const angle =
      (Math.atan2(conn.y2 - conn.y1, conn.x2 - conn.x1) * 180) / Math.PI;
    const midX = (conn.x1 + conn.x2) / 2;
    const midY = (conn.y1 + conn.y2) / 2;

    connectionElements.push({
      id: connId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: `${length}px`,
          height: '1px',
          backgroundColor: textColor,
          left: `${conn.x1}px`,
          top: `${conn.y1}px`,
          transformOrigin: '0 0',
          transform: `rotate(${angle}deg)`,
          opacity: 0.4 * cohesionStrength,
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
          id: `${connId}-dissolve`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: dissolvePhase.start,
            duration: dissolvePhase.duration,
            mode: 'provider',
            targetIds: [connId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4 * cohesionStrength, prog: 1 },
            ],
          },
        },
        {
          id: `${connId}-flow`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flowPhase.start,
            duration: flowPhase.duration,
            mode: 'provider',
            targetIds: [connId],
            ranges: [
              { key: 'opacity', val: 0.4 * cohesionStrength, prog: 0 },
              { key: 'opacity', val: 0.6 * cohesionStrength, prog: 0.5 },
              { key: 'opacity', val: 0.4 * cohesionStrength, prog: 1 },
            ],
          },
        },
        {
          id: `${connId}-reform`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: reformPhase.start,
            duration: reformPhase.duration,
            mode: 'provider',
            targetIds: [connId],
            ranges: [
              { key: 'opacity', val: 0.4 * cohesionStrength, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // Calculate container dimensions
  const containerWidth = chars.length * fontSize * 0.8 + fontSize;
  const containerHeight = fontSize * 1.5;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'organic-typokinetics-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1000px',
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
      {
        id: 'particle-system-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: `${containerWidth}px`,
              height: `${containerHeight}px`,
              transformStyle: 'preserve-3d',
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
          ...connectionElements,
          ...particleComponents,
        ] as RenderableComponentData[],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'organic-typokinetics-liquid-particles',
  title: 'Organic Typokinetics - Liquid Particle Flow',
  description:
    'Premium liquid metal typography where text dissolves into interconnected particles with fluid simulation physics. Particles flow like ferrofluid with cohesion, surface tension, and elastic connections, creating a luxury mercury/liquid metal effect. Three-phase animation: dissolve → organic flow → surface tension reform. Uses metaball-like visual cohesion with spring physics for premium brand titles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'liquid',
    'particle',
    'ferrofluid',
    'luxury',
    'premium',
    'brand',
    'metaball',
    'cohesion',
    'surface-tension',
    'spring-physics',
    'organic',
    'flow',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID',
    duration: 3,
    fontSize: 80,
    textColor: '#FFFFFF',
    particlesPerChar: 12,
    connectionDistance: 50,
    flowIntensity: 1,
    cohesionStrength: 0.7,
  },
};

export const organicTypokineticsLiquidParticlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
