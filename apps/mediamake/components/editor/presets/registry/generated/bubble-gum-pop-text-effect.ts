/**
 * Bubble Gum Pop Text Effect Preset
 *
 * A dynamic text effect that simulates bubble gum being inflated, stretched to breaking point,
 * and popped back to normal size. Features multi-phase animation with uniform expansion,
 * asymmetric bulge, semi-transparency at maximum stretch, moving surface highlights,
 * sudden pop with overshoot/vibration, and optional particle burst.
 *
 * Animation Phases:
 * - [0-40%]: Uniform scale 1 → 1.8 with ease-out
 * - [40-70%]: Asymmetric bulge using scaleX 1.8 → 2.2, scaleY 1.8 → 2.5
 * - [70-75%]: Hold at maximum stretch
 * - [75-80%]: Rapid pop to scale 0.9
 * - [80-90%]: Overshoot to 1.15
 * - [90-100%]: Settle to 1 with vibration
 *
 * Features:
 * - Multi-phase bubble gum animation with realistic stretch
 * - Opacity transition (1 → 0.6 → 1) simulating thin bubble gum
 * - Moving highlight effect for shiny bubble surface
 * - Slight blur at maximum stretch
 * - Pop with overshoot and vibration
 * - Optional particle burst effect at pop moment
 * - Configurable text, colors, fonts, and timing
 *
 * Use cases:
 * - Creating playful text animations
 * - Adding bubble gum effects to titles
 * - Creating fun intro/outro sequences
 * - Social media content with pop effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('POP!').describe('Text to display'),
  fontSize: z.number().default(120).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  fontWeight: z.string().default('800').describe('Font weight (e.g., "700", "800")'),
  color: z.string().default('#FF1493').describe('Text color (CSS color value)'),
  duration: z.number().default(2).describe('Total animation duration in seconds'),
  showParticles: z.boolean().default(true).describe('Whether to show particle burst on pop'),
  particleColor: z.string().default('#FFFFFF').describe('Particle color (CSS color value)'),
  particleCount: z.number().default(8).describe('Number of particles in burst'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration;

  // Calculate phase timings (all relative to root container)
  const phase1End = duration * 0.4; // Uniform scale
  const phase2End = duration * 0.7; // Asymmetric bulge
  const phase3End = duration * 0.75; // Hold at max
  const phase4End = duration * 0.8; // Rapid pop
  const phase5End = duration * 0.9; // Overshoot
  // phase6End = duration (settle with vibration)

  // Pop moment for particles
  const popMoment = duration * 0.75;

  // IDs
  const rootId = 'bubble-gum-pop-root';
  const textWrapperId = 'bubble-gum-text-wrapper';
  const textAtomId = 'bubble-gum-text';
  const highlightId = 'bubble-gum-highlight';
  const particleContainerId = 'bubble-gum-particles';

  // Create text wrapper with animation effects
  const textWrapperEffects = [
    {
      id: 'bubble-inflate-phase1',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: phase1End,
        mode: 'provider',
        targetIds: [textWrapperId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.8, prog: 1 },
        ],
      },
    },
    {
      id: 'bubble-bulge-phase2',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: phase1End,
        duration: phase2End - phase1End,
        mode: 'provider',
        targetIds: [textWrapperId],
        ranges: [
          { key: 'scaleX', val: 1.8, prog: 0 },
          { key: 'scaleX', val: 2.2, prog: 1 },
          { key: 'scaleY', val: 1.8, prog: 0 },
          { key: 'scaleY', val: 2.5, prog: 1 },
        ],
      },
    },
    {
      id: 'bubble-opacity-fade',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: duration * 0.6,
        duration: duration * 0.1, // 60-70%
        mode: 'provider',
        targetIds: [textWrapperId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 1 },
        ],
      },
    },
    {
      id: 'bubble-blur-max',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: duration * 0.65,
        duration: duration * 0.05, // 65-70%
        mode: 'provider',
        targetIds: [textWrapperId],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(3px)', prog: 1 },
        ],
      },
    },
    {
      id: 'bubble-pop-phase4',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: phase3End,
        duration: phase4End - phase3End,
        mode: 'provider',
        targetIds: [textWrapperId],
        ranges: [
          { key: 'scaleX', val: 2.2, prog: 0 },
          { key: 'scaleX', val: 0.9, prog: 1 },
          { key: 'scaleY', val: 2.5, prog: 0 },
          { key: 'scaleY', val: 0.9, prog: 1 },
          { key: 'opacity', val: 0.6, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'filter', val: 'blur(3px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    },
    {
      id: 'bubble-overshoot-phase5',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: phase4End,
        duration: phase5End - phase4End,
        mode: 'provider',
        targetIds: [textWrapperId],
        ranges: [
          { key: 'scale', val: 0.9, prog: 0 },
          { key: 'scale', val: 1.15, prog: 1 },
        ],
      },
    },
    {
      id: 'bubble-settle-phase6',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: phase5End,
        duration: duration - phase5End,
        mode: 'provider',
        targetIds: [textWrapperId],
        ranges: [
          { key: 'scale', val: 1.15, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.3 },
          { key: 'scale', val: 0.98, prog: 0.6 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
  ];

  // Moving highlight effect
  const highlightEffect = {
    id: 'highlight-sweep',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration * 0.7, // Stop highlight at pop
      mode: 'provider',
      targetIds: [highlightId],
      ranges: [
        { key: 'backgroundPositionX', val: '-100%', prog: 0 },
        { key: 'backgroundPositionX', val: '200%', prog: 1 },
      ],
    },
  };

  // Text wrapper
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: textWrapperEffects,
    childrenData: [
      {
        id: textAtomId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: params.fontWeight,
            color: params.color,
          },
          font: {
            family: params.fontFamily,
            weights: [params.fontWeight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Highlight overlay
  const highlightOverlay: RenderableComponentData = {
    id: highlightId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        mixBlendMode: 'overlay',
        backgroundPositionX: '-100%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [highlightEffect],
  };

  // Particle burst (optional)
  const particleChildren: RenderableComponentData[] = [];

  if (params.showParticles) {
    const particleAngles = Array.from(
      { length: params.particleCount },
      (_, i) => (360 / params.particleCount) * i,
    );

    particleAngles.forEach((angle, index) => {
      const radian = (angle * Math.PI) / 180;
      const distance = 100; // pixels
      const translateX = Math.cos(radian) * distance;
      const translateY = Math.sin(radian) * distance;

      const particleEffect = {
        id: `particle-${index}-burst`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: [`particle-${index}`],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: translateX, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: translateY, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.5, prog: 1 },
          ],
        },
      };

      particleChildren.push({
        id: `particle-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute w-3 h-3 rounded-full',
          style: {
            backgroundColor: params.particleColor,
            opacity: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 0.5,
          },
        },
        effects: [particleEffect],
      } as RenderableComponentData);
    });
  }

  // Particle container
  const particleContainer: RenderableComponentData | null = params.showParticles
    ? {
        id: particleContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: popMoment,
            duration: 0.5,
          },
        },
        childrenData: particleChildren,
      }
    : null;

  // Root container children
  const rootChildren: RenderableComponentData[] = [textWrapper, highlightOverlay];
  if (particleContainer) {
    rootChildren.push(particleContainer);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: rootChildren,
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
  id: 'bubbleGumPopTextEffect',
  title: 'Bubble Gum Pop Text Effect',
  description:
    'Dynamic text effect simulating bubble gum inflation, stretch, and pop. Features multi-phase animation with uniform expansion, asymmetric bulge, semi-transparency at maximum stretch, moving surface highlights, sudden pop with overshoot/vibration, and optional particle burst.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'bubble-gum',
    'pop',
    'inflate',
    'stretch',
    'particle',
    'fun',
    'playful',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'POP!',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#FF1493',
    duration: 2,
    showParticles: true,
    particleColor: '#FFFFFF',
    particleCount: 8,
  },
};

// Export preset
export const bubbleGumPopTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
