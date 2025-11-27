/**
 * Haunting Fog Transition Effect Preset
 *
 * This preset creates a horror-style fog transition effect with organic tendrils of dark smoke
 * creeping from multiple edges. Features multi-layered fog with varying opacity and speeds,
 * drifting particles, breathing pulse effects, and eerie color shifts from deep blacks to dark purples.
 *
 * Features:
 * - **Organic Tendrils**: Dark smoke creeping in from left, right, top, and bottom edges
 * - **Multi-Layered Fog**: Background, mid, and foreground layers moving at different speeds
 * - **Drifting Particles**: Particle-like elements that drift and swirl through the fog
 * - **Breathing Effect**: Subtle pulsing opacity to create a living, breathing feel
 * - **Eerie Color Shifts**: Deep blacks transitioning to dark purples and grays
 * - **Four Distinct Phases**:
 *   - Phase 1 (0-20%): Subtle wisps at edges
 *   - Phase 2 (20-60%): Accelerating fog coverage
 *   - Phase 3 (60-80%): Complete obscuring
 *   - Phase 4 (80-100%): Reveal through dissipating gaps
 *
 * Use cases:
 * - Horror movie transitions
 * - Suspenseful scene changes
 * - Gothic atmosphere creation
 * - Halloween or dark-themed content
 * - Dramatic reveal effects
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
    .min(2)
    .max(10)
    .default(5)
    .describe('Total duration of the fog transition effect in seconds'),
  intensity: z
    .number()
    .min(0.3)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for fog opacity and effects (0.3-2.0)'),
  particleCount: z
    .number()
    .int()
    .min(4)
    .max(20)
    .default(8)
    .describe('Number of drifting particle elements (4-20)'),
  breathingSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for breathing pulse effect (0.5-3.0)'),
  colorShiftIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of eerie color shifts from black to purple (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    particleCount,
    breathingSpeed,
    colorShiftIntensity,
  } = params;

  // Phase timing breakpoints (as percentages of duration)
  const phase1End = duration * 0.2; // 20% - Subtle wisps
  const phase2End = duration * 0.6; // 60% - Accelerating coverage
  const phase3End = duration * 0.8; // 80% - Complete obscuring
  // phase4End = duration (100% - Reveal through gaps)

  // Helper function to create particle components
  const createParticle = (index: number) => {
    const particleId = `fog-particle-${index}`;
    const size = 6 + Math.random() * 12; // 6-18px
    const startX = Math.random() * 100;
    const startY = Math.random() * 100;
    const opacity = 0.3 + Math.random() * 0.4; // 0.3-0.7
    const blur = 2 + Math.random() * 4; // 2-6px
    const hue = 260 + Math.random() * 20; // Purple range: 260-280

    // Drift path (random circular motion)
    const driftRadius = 30 + Math.random() * 50; // 30-80px
    const driftSpeed = 0.5 + Math.random() * 1.5; // 0.5-2.0x
    const rotationOffset = Math.random() * 360;

    return {
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: hsla(${hue}, 40%, 50%, ${opacity * intensity}); filter: blur(${blur}px);"></div>`,
        className: 'absolute',
        style: {
          left: `${startX}%`,
          top: `${startY}%`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Drift animation (circular motion)
        {
          id: `${particleId}-drift-x`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration / driftSpeed,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              {
                key: 'translateX',
                val: `${Math.cos((rotationOffset * Math.PI) / 180) * driftRadius}px`,
                prog: 0,
              },
              {
                key: 'translateX',
                val: `${Math.cos(((rotationOffset + 180) * Math.PI) / 180) * driftRadius}px`,
                prog: 0.5,
              },
              {
                key: 'translateX',
                val: `${Math.cos((rotationOffset * Math.PI) / 180) * driftRadius}px`,
                prog: 1,
              },
            ],
          },
        },
        {
          id: `${particleId}-drift-y`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration / driftSpeed,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              {
                key: 'translateY',
                val: `${Math.sin((rotationOffset * Math.PI) / 180) * driftRadius}px`,
                prog: 0,
              },
              {
                key: 'translateY',
                val: `${Math.sin(((rotationOffset + 180) * Math.PI) / 180) * driftRadius}px`,
                prog: 0.5,
              },
              {
                key: 'translateY',
                val: `${Math.sin((rotationOffset * Math.PI) / 180) * driftRadius}px`,
                prog: 1,
              },
            ],
          },
        },
        // Fade in (Phase 1)
        {
          id: `${particleId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: phase1End,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Fade out (Phase 4)
        {
          id: `${particleId}-fade-out`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: phase3End,
            duration: duration - phase3End,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create particle cluster
  const particles: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(createParticle(i));
  }

  // Fog layer components
  const fogLayerBack: RenderableComponentData = {
    id: 'fog-layer-back',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `radial-gradient(ellipse at center, rgba(${30 + colorShiftIntensity * 20}, 20, ${40 + colorShiftIntensity * 30}, ${0.9 * intensity}) 0%, rgba(10, 5, 15, ${0.95 * intensity}) 50%, rgba(0, 0, 0, ${intensity}) 100%)`,
          filter: 'blur(40px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      // Breathing pulse
      {
        id: 'fog-back-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration / breathingSpeed,
          mode: 'provider',
          targetIds: ['fog-layer-back'],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      },
      // Phase progression
      {
        id: 'fog-back-phase',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['fog-layer-back'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0.2, prog: 1 },
          ],
        },
      },
    ],
  };

  const fogLayerMid: RenderableComponentData = {
    id: 'fog-layer-mid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `radial-gradient(ellipse at 30% 70%, rgba(${50 + colorShiftIntensity * 30}, 30, ${60 + colorShiftIntensity * 40}, ${0.7 * intensity}) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(${40 + colorShiftIntensity * 20}, 25, ${55 + colorShiftIntensity * 35}, ${0.6 * intensity}) 0%, transparent 50%)`,
          filter: 'blur(25px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      // Breathing pulse (slightly offset)
      {
        id: 'fog-mid-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: duration * 0.1,
          duration: duration / breathingSpeed,
          mode: 'provider',
          targetIds: ['fog-layer-mid'],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      },
      // Phase progression
      {
        id: 'fog-mid-phase',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['fog-layer-mid'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.4, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  const fogLayerFront: RenderableComponentData = {
    id: 'fog-layer-front',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `radial-gradient(ellipse at 50% 50%, rgba(${60 + colorShiftIntensity * 40}, 40, ${70 + colorShiftIntensity * 50}, ${0.5 * intensity}) 0%, transparent 40%)`,
          filter: 'blur(15px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      // Breathing pulse (more offset)
      {
        id: 'fog-front-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: duration * 0.2,
          duration: duration / breathingSpeed,
          mode: 'provider',
          targetIds: ['fog-layer-front'],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        },
      },
      // Phase progression
      {
        id: 'fog-front-phase',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['fog-layer-front'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0.4, prog: 1 },
          ],
        },
      },
    ],
  };

  // Tendril components
  const tendrilLeft: RenderableComponentData = {
    id: 'tendril-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '0',
          left: '-50%',
          width: '80%',
          height: '100%',
          background: `linear-gradient(to right, rgba(${20 + colorShiftIntensity * 15}, 10, ${30 + colorShiftIntensity * 25}, ${0.95 * intensity}) 0%, rgba(${40 + colorShiftIntensity * 25}, 25, ${55 + colorShiftIntensity * 35}, ${0.7 * intensity}) 40%, transparent 100%)`,
          filter: 'blur(20px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'tendril-left-creep',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['tendril-left'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '10%', prog: 0.2 },
            { key: 'translateX', val: '60%', prog: 0.6 },
            { key: 'translateX', val: '60%', prog: 0.8 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
    ],
  };

  const tendrilRight: RenderableComponentData = {
    id: 'tendril-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '0',
          right: '-50%',
          width: '80%',
          height: '100%',
          background: `linear-gradient(to left, rgba(${25 + colorShiftIntensity * 18}, 15, ${35 + colorShiftIntensity * 28}, ${0.95 * intensity}) 0%, rgba(${45 + colorShiftIntensity * 28}, 30, ${60 + colorShiftIntensity * 38}, ${0.7 * intensity}) 40%, transparent 100%)`,
          filter: 'blur(20px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'tendril-right-creep',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['tendril-right'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-10%', prog: 0.2 },
            { key: 'translateX', val: '-60%', prog: 0.6 },
            { key: 'translateX', val: '-60%', prog: 0.8 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
    ],
  };

  const tendrilBottom: RenderableComponentData = {
    id: 'tendril-bottom',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          bottom: '-40%',
          left: '0',
          width: '100%',
          height: '70%',
          background: `linear-gradient(to top, rgba(${15 + colorShiftIntensity * 12}, 8, ${25 + colorShiftIntensity * 22}, ${0.95 * intensity}) 0%, rgba(${35 + colorShiftIntensity * 22}, 20, ${50 + colorShiftIntensity * 32}, ${0.6 * intensity}) 50%, transparent 100%)`,
          filter: 'blur(25px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'tendril-bottom-creep',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['tendril-bottom'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-10%', prog: 0.2 },
            { key: 'translateY', val: '-50%', prog: 0.6 },
            { key: 'translateY', val: '-50%', prog: 0.8 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
    ],
  };

  const tendrilTop: RenderableComponentData = {
    id: 'tendril-top',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '-40%',
          left: '0',
          width: '100%',
          height: '70%',
          background: `linear-gradient(to bottom, rgba(${18 + colorShiftIntensity * 14}, 10, ${28 + colorShiftIntensity * 24}, ${0.9 * intensity}) 0%, rgba(${38 + colorShiftIntensity * 24}, 22, ${52 + colorShiftIntensity * 34}, ${0.5 * intensity}) 50%, transparent 100%)`,
          filter: 'blur(25px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'tendril-top-creep',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['tendril-top'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '10%', prog: 0.2 },
            { key: 'translateY', val: '50%', prog: 0.6 },
            { key: 'translateY', val: '50%', prog: 0.8 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'haunting-fog-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      fogLayerBack,
      fogLayerMid,
      fogLayerFront,
      ...particles,
      tendrilLeft,
      tendrilRight,
      tendrilBottom,
      tendrilTop,
    ],
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
  id: 'hauntingFogTransition',
  title: 'Haunting Fog Transition',
  description:
    'A horror-style fog transition effect with organic tendrils of dark smoke creeping from multiple edges, multi-layered fog with varying opacity and speeds, drifting particles, breathing pulse effects, and eerie color shifts from deep blacks to dark purples. Features four distinct phases: subtle edge wisps, accelerating coverage, complete obscuring, and reveal through dissipating gaps.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'fog',
    'horror',
    'smoke',
    'atmospheric',
    'dark',
    'eerie',
    'haunting',
    'tendrils',
    'particles',
    'breathing',
    'pulse',
    'organic',
  ],
  defaultInputParams: {
    duration: 5,
    intensity: 1,
    particleCount: 8,
    breathingSpeed: 1,
    colorShiftIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hauntingFogTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};