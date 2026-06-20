/**
 * Organic Nature Flow Preset
 *
 * This preset creates an immersive nature-inspired animation where:
 * - Background image has a gentle pendulum sway motion (rotation + translateX)
 * - Text flows across the screen like a river with undulating movement using bezier curves
 * - Particle effects simulate drifting leaves or snow with varying speeds
 * - Multiple layers of movement at different speeds create depth
 * - Color grade shifts from golden hour to blue hour throughout the duration
 *
 * Use cases:
 * - Nature documentaries with atmospheric overlays
 * - Environmental campaigns with organic motion aesthetics
 * - Meditative content with calming natural movements
 * - Ambient visualizations simulating natural phenomena
 *
 * Technical implementation:
 * - Background: Scale 1.1 with sway effect (rotate -2deg→2deg, translateX -2%→2%)
 * - Particles: 8 semi-transparent circles drifting across with sine wave vertical movement
 * - Color filter: Multiply blend mode with color shift (#fbbf24 → #3b82f6)
 * - Text: River flow path with horizontal movement + sine wave vertical undulation
 * - All effects use provider mode with targetIds for clean structure
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  ImageAtomData,
  TextAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  backgroundImage: z
    .string()
    .describe('URL or path to the background nature image'),
  flowText: z
    .string()
    .default('Nature in Motion')
    .describe('Text that flows across like a river'),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(12)
    .describe('Total duration of the preset in seconds'),
  textFont: z
    .string()
    .default('Merriweather')
    .optional()
    .describe(
      'Font family for the flowing text (e.g., "Merriweather", "Playfair Display")',
    ),
  textSize: z
    .number()
    .min(20)
    .max(200)
    .default(60)
    .optional()
    .describe('Font size for the flowing text in pixels'),
  particleCount: z
    .number()
    .min(3)
    .max(15)
    .default(8)
    .optional()
    .describe('Number of particle effects (leaves/snow) drifting across'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration || 12;
  const textSize = params.textSize || 60;
  const particleCount = params.particleCount || 8;

  // Helper: Generate particle data with varying properties
  const generateParticles = () => {
    const particles: any[] = [];
    const sizes = [12, 14, 16, 18, 20];
    const opacities = [0.15, 0.17, 0.18, 0.19, 0.2, 0.21, 0.22];
    const durations = [8, 9, 10, 11, 12, 13, 14, 15];
    const verticalPositions = [10, 15, 25, 40, 50, 55, 70, 80];

    for (let i = 0; i < particleCount; i++) {
      const size = sizes[i % sizes.length];
      const opacity = opacities[i % opacities.length];
      const particleDuration = durations[i % durations.length];
      const topPosition = verticalPositions[i % verticalPositions.length];
      const sineAmplitude = 30 + (i % 3) * 10; // Vary sine wave amplitude
      const sineFrequency = 0.5 + (i % 2) * 0.3; // Vary sine frequency

      particles.push({
        id: `particle-${i + 1}`,
        size,
        opacity,
        duration: particleDuration,
        topPosition,
        sineAmplitude,
        sineFrequency,
      });
    }

    return particles;
  };

  const particles = generateParticles();

  // ============================================================================
  // EFFECT DEFINITIONS
  // ============================================================================

  // Background sway effect: pendulum motion (rotation + translateX)
  const backgroundSwayEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['background-image'],
    ranges: [
      // Rotation: -2deg → 2deg → -2deg
      { key: 'rotate', val: -2, prog: 0 },
      { key: 'rotate', val: 2, prog: 0.5 },
      { key: 'rotate', val: -2, prog: 1 },
      // TranslateX: -2% → 2% → -2%
      { key: 'translateX', val: '-2%', prog: 0 },
      { key: 'translateX', val: '2%', prog: 0.5 },
      { key: 'translateX', val: '-2%', prog: 1 },
    ],
  };

  // Particle drift effects: each particle drifts from left to right with sine wave vertical movement
  const createParticleDriftEffect = (
    particleId: string,
    particleDuration: number,
    sineAmplitude: number,
  ): GenericEffectData => {
    // Sine wave: translateY oscillates ±amplitude
    const steps = 10; // Number of keyframes for sine wave
    const ranges: any[] = [];

    // Horizontal drift: -10% → 110%
    ranges.push({ key: 'translateX', val: '-10%', prog: 0 });
    ranges.push({ key: 'translateX', val: '110%', prog: 1 });

    // Vertical sine wave
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const angle = prog * Math.PI * 4; // 2 full cycles
      const yOffset = Math.sin(angle) * sineAmplitude;
      ranges.push({ key: 'translateY', val: `${yOffset}px`, prog });
    }

    return {
      type: 'linear',
      start: 0,
      duration: particleDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges,
    };
  };

  // Color filter shift: golden hour (#fbbf24) → blue hour (#3b82f6)
  const colorShiftEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['color-filter-overlay'],
    ranges: [
      { key: 'backgroundColor', val: '#fbbf24', prog: 0 },
      { key: 'backgroundColor', val: '#f59e0b', prog: 0.25 },
      { key: 'backgroundColor', val: '#6366f1', prog: 0.75 },
      { key: 'backgroundColor', val: '#3b82f6', prog: 1 },
    ],
  };

  // Text flow effect: river-like horizontal movement with vertical sine wave undulation
  const textFlowEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 8,
    mode: 'provider',
    targetIds: ['text-flow'],
    ranges: [
      // Horizontal: 100% → -100%
      { key: 'translateX', val: '100%', prog: 0 },
      { key: 'translateX', val: '-100%', prog: 1 },
      // Vertical sine wave: ±40px
      { key: 'translateY', val: '0px', prog: 0 },
      { key: 'translateY', val: '40px', prog: 0.125 },
      { key: 'translateY', val: '0px', prog: 0.25 },
      { key: 'translateY', val: '-40px', prog: 0.375 },
      { key: 'translateY', val: '0px', prog: 0.5 },
      { key: 'translateY', val: '40px', prog: 0.625 },
      { key: 'translateY', val: '0px', prog: 0.75 },
      { key: 'translateY', val: '-40px', prog: 0.875 },
      { key: 'translateY', val: '0px', prog: 1 },
    ],
  };

  // ============================================================================
  // COMPONENT TREE STRUCTURE
  // ============================================================================

  // Background image with sway effect
  const backgroundImage: RenderableComponentData = {
    id: 'background-image',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: params.backgroundImage,
      className: 'absolute inset-0 object-cover',
      style: {
        width: '100%',
        height: '100%',
        scale: 1.1,
        willChange: 'transform',
      },
    } as ImageAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'background-sway',
        componentId: 'generic',
        data: backgroundSwayEffect,
      },
    ],
  };

  // Particles
  const particleComponents: RenderableComponentData[] = particles.map(
    (particle) => ({
      id: particle.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: ${particle.size}px; height: ${particle.size}px; border-radius: 50%; background-color: rgba(255, 255, 255, ${particle.opacity});'></div>`,
        className: 'absolute',
        style: {
          top: `${particle.topPosition}%`,
          left: '-10%',
          willChange: 'transform',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: particle.duration,
        },
      },
      effects: [
        {
          id: `drift-${particle.id}`,
          componentId: 'generic',
          data: createParticleDriftEffect(
            particle.id,
            particle.duration,
            particle.sineAmplitude,
          ),
        },
      ],
    }),
  );

  // Color filter overlay
  const colorFilterOverlay: RenderableComponentData = {
    id: 'color-filter-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
          backgroundColor: '#fbbf24',
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
        id: 'color-shift',
        componentId: 'generic',
        data: colorShiftEffect,
      },
    ],
    childrenData: [],
  };

  // Flowing text
  const textFlow: RenderableComponentData = {
    id: 'text-flow',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.flowText,
      className: 'absolute text-white font-serif',
      style: {
        fontSize: `${textSize}px`,
        textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)',
        willChange: 'transform',
        fontWeight: 'bold',
      },
      font: {
        family: params.textFont || 'Merriweather',
        weights: ['400', '700'],
        subsets: ['latin'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: 8,
      },
    },
    effects: [
      {
        id: 'text-river-flow',
        componentId: 'generic',
        data: textFlowEffect,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'organic-nature-flow-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Background sway container
      {
        id: 'background-sway-container',
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
        childrenData: [backgroundImage],
      } as RenderableComponentData,
      // Particles container
      {
        id: 'particles-container',
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
        childrenData: particleComponents as RenderableComponentData[],
      } as RenderableComponentData,
      // Color filter overlay
      colorFilterOverlay,
      // Text flow container
      {
        id: 'text-flow-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 8,
          },
        },
        childrenData: [textFlow],
      } as RenderableComponentData,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'organic-nature-flow',
  title: 'Organic Nature Flow',
  description:
    'A nature-inspired preset with gentle sway motion on background image (pendulum-like rotation + translateX), flowing river text animation using bezier curves, drifting particle effects simulating leaves/snow, and color grade shifting from golden hour to blue hour. Features multiple layers at different speeds for depth simulation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'nature',
    'organic',
    'sway',
    'particles',
    'flow',
    'river',
    'leaves',
    'snow',
    'golden-hour',
    'blue-hour',
    'atmospheric',
    'documentary',
    'environmental',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
    flowText: 'Nature in Motion',
    duration: 12,
    textFont: 'Merriweather',
    textSize: 60,
    particleCount: 8,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const organicNatureFlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
