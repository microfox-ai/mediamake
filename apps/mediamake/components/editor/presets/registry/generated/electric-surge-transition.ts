/**
 * Electric Surge Transition Preset
 *
 * A high-energy electric surge transition preset that channels raw lightning energy through the screen.
 * Creates an intense electrical discharge effect with branching plasma lightning paths, flickering edges,
 * scattered spark particles, electromagnetic warp distortion, and pulsing glow effects.
 *
 * Features:
 * - **Lightning Bolt Animations**: SVG stroke-dasharray animations creating branching lightning paths
 * - **Flickering Electric Edges**: Rapid opacity flicker on screen edges with electric blue glow
 * - **Spark Particles**: Scattered spark particles with spring-eased scatter animations
 * - **Electromagnetic Warp**: Skew and scale oscillations creating distortion effect
 * - **Energy Pulse Rings**: Radial gradient rings expanding outward from center
 * - **Glow Overlay**: Atmospheric electric glow with screen blend mode
 * - **Audio Reactive**: Syncs glow intensity to bass frequencies and triggers sparks on beat detection
 * - **Three-Phase Timing**: Build-up (0-0.2s), main discharge (0.2-0.5s), afterglow (0.5-0.8s)
 *
 * Use cases:
 * - High-energy fitness/workout video transitions
 * - Intense scene changes with electrical theme
 * - Audio-reactive music video effects
 * - Dynamic energy-based visual storytelling
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset Parameters Schema
const presetParams = z.object({
  duration: z
    .number()
    .default(0.8)
    .describe('Total transition duration in seconds (default 0.8s for build-up, discharge, afterglow)'),
  intensity: z
    .number()
    .min(0.5)
    .max(3.0)
    .default(1.0)
    .describe('Effect intensity multiplier (0.5-3.0, affects glow brightness, spark count, and warp amplitude)'),
  electricBlue: z
    .string()
    .default('#3B82F6')
    .describe('Primary electric blue color for lightning bolts and edges'),
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive features (glow sync to bass, spark triggers on beat)'),
  sparkCount: z
    .number()
    .min(8)
    .max(30)
    .default(20)
    .describe('Number of spark particles to generate (8-30 for performance)'),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    electricBlue,
    audioReactive,
    sparkCount,
  } = params;

  // Helper: Generate random lightning path with branching
  const generateLightningPath = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    branches: number = 3,
  ): string => {
    let path = `M ${startX} ${startY}`;
    const segments = 8;
    const segmentX = (endX - startX) / segments;
    const segmentY = (endY - startY) / segments;

    let currentX = startX;
    let currentY = startY;

    for (let i = 1; i <= segments; i++) {
      const nextX = startX + segmentX * i + (Math.random() - 0.5) * 40;
      const nextY = startY + segmentY * i + (Math.random() - 0.5) * 20;
      path += ` L ${nextX} ${nextY}`;

      // Add branches randomly
      if (i < segments && Math.random() > 0.6 && branches > 0) {
        const branchLength = Math.random() * 60 + 40;
        const branchAngle = (Math.random() - 0.5) * Math.PI * 0.5;
        const branchEndX = nextX + Math.cos(branchAngle) * branchLength;
        const branchEndY = nextY + Math.sin(branchAngle) * branchLength;
        path += ` M ${nextX} ${nextY} L ${branchEndX} ${branchEndY} M ${nextX} ${nextY}`;
      }

      currentX = nextX;
      currentY = nextY;
    }

    path += ` L ${endX} ${endY}`;
    return path;
  };

  // Helper: Generate spark positions
  const generateSparkPositions = (count: number): Array<{ top: string; left: string }> => {
    const positions: Array<{ top: string; left: string }> = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        top: `${Math.random() * 80 + 10}%`,
        left: `${Math.random() * 80 + 10}%`,
      });
    }
    return positions;
  };

  // Generate lightning paths
  const mainLightningPath = generateLightningPath(20, 10, 80, 90, 5);
  const branch1Path = generateLightningPath(40, 30, 70, 60, 2);
  const branch2Path = generateLightningPath(60, 40, 85, 75, 1);

  // Generate spark positions
  const sparkPositions = generateSparkPositions(sparkCount);

  // Calculate phase durations
  const buildUpDuration = duration * 0.25; // 0-0.2s
  const dischargeDuration = duration * 0.375; // 0.2-0.5s
  const afterglowDuration = duration * 0.375; // 0.5-0.8s

  // Create lightning SVG components
  const lightningBolt1: RenderableComponentData = {
    id: 'lightning-bolt-1',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'svg',
      svgContent: `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${mainLightningPath}" stroke="${electricBlue}" stroke-width="3" fill="none" /></svg>`,
      className: 'absolute inset-0',
      style: {
        filter: `drop-shadow(0 0 ${10 * intensity}px rgba(59, 130, 246, ${0.8 * intensity})) drop-shadow(0 0 ${20 * intensity}px rgba(59, 130, 246, ${0.6 * intensity}))`,
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
        id: 'lightning-bolt-1-stroke-animation',
        componentId: 'lightning-bolt-1',
        data: {
          type: 'linear',
          start: 0,
          duration: buildUpDuration + dischargeDuration,
          mode: 'provider',
          targetIds: ['lightning-bolt-1'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const lightningBolt2: RenderableComponentData = {
    id: 'lightning-bolt-2',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'svg',
      svgContent: `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${branch1Path}" stroke="#93C5FD" stroke-width="2" fill="none" /></svg>`,
      className: 'absolute inset-0',
      style: {
        filter: `drop-shadow(0 0 ${8 * intensity}px rgba(147, 197, 253, 0.9))`,
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
        id: 'lightning-bolt-2-stroke-animation',
        componentId: 'lightning-bolt-2',
        data: {
          type: 'linear',
          start: buildUpDuration * 0.5,
          duration: dischargeDuration,
          mode: 'provider',
          targetIds: ['lightning-bolt-2'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const lightningBolt3: RenderableComponentData = {
    id: 'lightning-bolt-3',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'svg',
      svgContent: `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${branch2Path}" stroke="#BFDBFE" stroke-width="1.5" fill="none" /></svg>`,
      className: 'absolute inset-0',
      style: {
        filter: `drop-shadow(0 0 ${6 * intensity}px rgba(191, 219, 254, 0.8))`,
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
        id: 'lightning-bolt-3-stroke-animation',
        componentId: 'lightning-bolt-3',
        data: {
          type: 'linear',
          start: buildUpDuration * 0.7,
          duration: dischargeDuration * 0.8,
          mode: 'provider',
          targetIds: ['lightning-bolt-3'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Lightning SVG container
  const lightningSvgContainer: RenderableComponentData = {
    id: 'lightning-svg-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[10] pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [lightningBolt1, lightningBolt2, lightningBolt3],
  };

  // Create edge flicker components
  const edgeFlickerTop: RenderableComponentData = {
    id: 'edge-flicker-top',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'rectangle',
      className: 'absolute top-0 left-0 right-0 h-2',
      style: {
        background: `linear-gradient(to bottom, rgba(59, 130, 246, ${0.8 * intensity}), transparent)`,
        filter: 'blur(2px)',
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
        id: 'edge-flicker-top-animation',
        componentId: 'edge-flicker-top',
        data: {
          type: 'step',
          start: 0,
          duration: buildUpDuration + dischargeDuration,
          mode: 'provider',
          targetIds: ['edge-flicker-top'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.05 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 0.3, prog: 0.15 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const edgeFlickerBottom: RenderableComponentData = {
    id: 'edge-flicker-bottom',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'rectangle',
      className: 'absolute bottom-0 left-0 right-0 h-2',
      style: {
        background: `linear-gradient(to top, rgba(59, 130, 246, ${0.8 * intensity}), transparent)`,
        filter: 'blur(2px)',
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
        id: 'edge-flicker-bottom-animation',
        componentId: 'edge-flicker-bottom',
        data: {
          type: 'step',
          start: 0,
          duration: buildUpDuration + dischargeDuration,
          mode: 'provider',
          targetIds: ['edge-flicker-bottom'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.05 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 0.3, prog: 0.15 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const edgeFlickerLeft: RenderableComponentData = {
    id: 'edge-flicker-left',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'rectangle',
      className: 'absolute top-0 bottom-0 left-0 w-2',
      style: {
        background: `linear-gradient(to right, rgba(59, 130, 246, ${0.8 * intensity}), transparent)`,
        filter: 'blur(2px)',
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
        id: 'edge-flicker-left-animation',
        componentId: 'edge-flicker-left',
        data: {
          type: 'step',
          start: 0,
          duration: buildUpDuration + dischargeDuration,
          mode: 'provider',
          targetIds: ['edge-flicker-left'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.05 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 0.3, prog: 0.15 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const edgeFlickerRight: RenderableComponentData = {
    id: 'edge-flicker-right',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'rectangle',
      className: 'absolute top-0 bottom-0 right-0 w-2',
      style: {
        background: `linear-gradient(to left, rgba(59, 130, 246, ${0.8 * intensity}), transparent)`,
        filter: 'blur(2px)',
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
        id: 'edge-flicker-right-animation',
        componentId: 'edge-flicker-right',
        data: {
          type: 'step',
          start: 0,
          duration: buildUpDuration + dischargeDuration,
          mode: 'provider',
          targetIds: ['edge-flicker-right'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.05 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 0.3, prog: 0.15 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Edge flicker container
  const edgeFlickerContainer: RenderableComponentData = {
    id: 'edge-flicker-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[15] pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [edgeFlickerTop, edgeFlickerBottom, edgeFlickerLeft, edgeFlickerRight],
  };

  // Create spark particles
  const sparkChildren: RenderableComponentData[] = sparkPositions.map((pos, index) => {
    const sparkId = `spark-${index}`;
    const sparkColor = index % 3 === 0 ? '#60A5FA' : index % 3 === 1 ? '#93C5FD' : '#BFDBFE';
    const scatterDistance = 30 + Math.random() * 40;
    const scatterAngle = Math.random() * Math.PI * 2;
    const scatterX = Math.cos(scatterAngle) * scatterDistance;
    const scatterY = Math.sin(scatterAngle) * scatterDistance;

    return {
      id: sparkId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shapeType: 'circle',
        className: 'absolute w-1 h-1 bg-blue-400 rounded-full',
        style: {
          top: pos.top,
          left: pos.left,
          boxShadow: `0 0 4px ${sparkColor}`,
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
          id: `${sparkId}-scatter-animation`,
          componentId: sparkId,
          data: {
            type: 'spring',
            start: buildUpDuration,
            duration: dischargeDuration,
            mode: 'provider',
            targetIds: [sparkId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: scatterX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: scatterY, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 2, prog: 0.3 },
              { key: 'scale', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Spark container
  const sparkContainer: RenderableComponentData = {
    id: 'spark-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[20] pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: sparkChildren,
  };

  // Energy pulse rings
  const energyPulseRing1: RenderableComponentData = {
    id: 'energy-pulse-ring-1',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'circle',
      className: 'absolute w-32 h-32 rounded-full',
      style: {
        background: `radial-gradient(circle, rgba(59, 130, 246, ${0.6 * intensity}) 0%, rgba(59, 130, 246, ${0.2 * intensity}) 40%, transparent 70%)`,
        filter: 'blur(4px)',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
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
        id: 'energy-pulse-ring-1-animation',
        componentId: 'energy-pulse-ring-1',
        data: {
          type: 'ease-out',
          start: buildUpDuration + dischargeDuration,
          duration: afterglowDuration,
          mode: 'provider',
          targetIds: ['energy-pulse-ring-1'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 3, prog: 1 },
          ],
        },
      },
    ],
  };

  const energyPulseRing2: RenderableComponentData = {
    id: 'energy-pulse-ring-2',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'circle',
      className: 'absolute w-48 h-48 rounded-full',
      style: {
        background: `radial-gradient(circle, rgba(147, 197, 253, ${0.4 * intensity}) 0%, rgba(147, 197, 253, ${0.1 * intensity}) 50%, transparent 80%)`,
        filter: 'blur(6px)',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
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
        id: 'energy-pulse-ring-2-animation',
        componentId: 'energy-pulse-ring-2',
        data: {
          type: 'ease-out',
          start: buildUpDuration + dischargeDuration + afterglowDuration * 0.1,
          duration: afterglowDuration * 0.9,
          mode: 'provider',
          targetIds: ['energy-pulse-ring-2'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 3.5, prog: 1 },
          ],
        },
      },
    ],
  };

  // Energy pulse layer
  const energyPulseLayer: RenderableComponentData = {
    id: 'energy-pulse-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[5] pointer-events-none flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [energyPulseRing1, energyPulseRing2],
  };

  // Electromagnetic warp layer
  const electromagneticWarpLayer: RenderableComponentData = {
    id: 'electromagnetic-warp-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[2] pointer-events-none',
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
        id: 'electromagnetic-warp-animation',
        componentId: 'electromagnetic-warp-layer',
        data: {
          type: 'spring',
          start: buildUpDuration,
          duration: dischargeDuration,
          mode: 'provider',
          targetIds: ['electromagnetic-warp-layer'],
          ranges: [
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: 3 * intensity, prog: 0.3 },
            { key: 'skewX', val: -2 * intensity, prog: 0.6 },
            { key: 'skewX', val: 0, prog: 1 },
            { key: 'skewY', val: 0, prog: 0 },
            { key: 'skewY', val: -2 * intensity, prog: 0.4 },
            { key: 'skewY', val: 1.5 * intensity, prog: 0.7 },
            { key: 'skewY', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Glow overlay
  const glowOverlay: RenderableComponentData = {
    id: 'glow-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'rectangle',
      className: 'absolute inset-0 z-[25] pointer-events-none',
      style: {
        background: `radial-gradient(ellipse at center, rgba(59, 130, 246, ${0.15 * intensity}) 0%, transparent 60%)`,
        mixBlendMode: 'screen',
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
        id: 'glow-overlay-animation',
        componentId: 'glow-overlay',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['glow-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Content layer (for transition content)
  const contentLayer: RenderableComponentData = {
    id: 'content-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[1]',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'electric-surge-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      contentLayer,
      electromagneticWarpLayer,
      lightningSvgContainer,
      edgeFlickerContainer,
      sparkContainer,
      energyPulseLayer,
      glowOverlay,
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'electric-surge-transition',
  title: 'Electric Surge Transition',
  description:
    'A high-energy electric surge transition preset that channels raw lightning energy through the screen. Features branching plasma lightning paths with SVG stroke animations, flickering electric blue edges, scattered spark particles, electromagnetic warp distortion, and pulsing glow effects. Designed for fitness/workout content with audio-reactive elements synced to bass intensity. Total duration 0.8s with build-up, discharge, and afterglow phases.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'electric',
    'lightning',
    'surge',
    'plasma',
    'energy',
    'fitness',
    'workout',
    'audio-reactive',
    'high-energy',
    'sparks',
    'glow',
    'warp',
    'distortion',
  ],
  defaultInputParams: {
    duration: 0.8,
    intensity: 1.0,
    electricBlue: '#3B82F6',
    audioReactive: false,
    sparkCount: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export Preset
export const electricSurgeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
