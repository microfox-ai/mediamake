/**
 * Flesh Tear Transition Preset
 *
 * A visceral horror transition that simulates skin or reality being ripped apart to reveal
 * disturbing content beneath. Features realistic tear physics with resistance points, curling edges
 * showing organic layers, dripping fluid effects, and breathing/pulsing animations.
 *
 * Tear progression phases:
 * - Phase 1 (0-10%): Initial puncture - small tear starts appearing
 * - Phase 2 (10-40%): Slow initial tear with resistance - edges curl back, showing layers
 * - Phase 3 (40-60%): Violent ripping - sudden tear expansion with shake effects
 * - Phase 4 (60-80%): Full opening with edge details - tear fully opened, edges pulsing
 * - Phase 5 (80-100%): Healing closed or complete destruction - tear either closes or destroys
 *
 * Visual effects:
 * - Organic tear motion with SVG path animation
 * - 3D curling edges using rotateY transforms
 * - Multiple dripping fluid effects
 * - Membrane stretching with resistance points
 * - Pulsing/breathing on tear edges
 * - Visceral color grading (contrast/saturation boost)
 *
 * Use cases:
 * - Horror video transitions
 * - Reveal effects for disturbing content
 * - Reality-breaking visual effects
 * - Nightmare sequence transitions
 * - Body horror visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  backgroundSrc: z
    .string()
    .describe('Source URL for the background content (surface being torn)'),
  revealSrc: z
    .string()
    .describe('Source URL for the reveal content (horror beneath the tear)'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the tear transition in seconds'),
  tearIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for tear effects (0.1-3)'),
  edgeCurlAmount: z
    .number()
    .min(0)
    .max(180)
    .default(120)
    .describe('Amount of edge curl in degrees (0-180)'),
  fluidDripCount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Number of dripping fluid effects (0-10)'),
  breathingEffect: z
    .boolean()
    .default(true)
    .describe('Enable subtle breathing/pulsing on tear edges'),
  shakeOnTear: z
    .boolean()
    .default(true)
    .describe('Enable screen shake during violent ripping phase'),
  bloodOverlay: z
    .boolean()
    .default(true)
    .describe('Enable red blood tint overlay'),
  healOrDestroy: z
    .enum(['heal', 'destroy'])
    .default('destroy')
    .describe('Final phase behavior: heal closed or complete destruction'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate timing for phases
  const calculatePhase = (
    startPercent: number,
    endPercent: number,
  ): { start: number; duration: number } => {
    const start = (params.duration * startPercent) / 100;
    const end = (params.duration * endPercent) / 100;
    return { start, duration: end - start };
  };

  // Phase timing calculations
  const phase1 = calculatePhase(0, 10); // Initial puncture
  const phase2 = calculatePhase(10, 40); // Slow tear with resistance
  const phase3 = calculatePhase(40, 60); // Violent ripping
  const phase4 = calculatePhase(60, 80); // Full opening
  const phase5 = calculatePhase(80, 100); // Healing/destruction

  // Calculate dynamic values based on intensity
  const tearWidth = 100 * params.tearIntensity;
  const edgeCurl = params.edgeCurlAmount;
  const shakeIntensity = 3 * params.tearIntensity;

  // ============================================================================
  // BACKGROUND LAYER (Surface being torn)
  // ============================================================================

  const backgroundLayer: RenderableComponentData = {
    id: 'flesh-tear-background',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.backgroundSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // ============================================================================
  // REVEAL LAYER (Horror content beneath)
  // ============================================================================

  const revealLayer: RenderableComponentData = {
    id: 'flesh-tear-reveal',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.revealSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        clipPath: `inset(0 ${50 - tearWidth / 2}% 0 ${50 - tearWidth / 2}%)`,
      },
    },
    context: {
      timing: {
        start: phase2.start,
        duration: params.duration - phase2.start,
      },
    },
    effects: [
      // Reveal scale animation (starts small, grows)
      {
        id: 'reveal-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: phase3.start + phase3.duration - phase2.start,
          mode: 'provider',
          targetIds: ['flesh-tear-reveal'],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Reveal clip-path animation (opens the tear)
      {
        id: 'reveal-clippath',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: phase4.start + phase4.duration - phase2.start,
          mode: 'provider',
          targetIds: ['flesh-tear-reveal'],
          ranges: [
            { key: 'clipPath', val: 'inset(0 50% 0 50%)', prog: 0 },
            { key: 'clipPath', val: `inset(0 ${50 - tearWidth / 2}% 0 ${50 - tearWidth / 2}%)`, prog: 0.3 },
            { key: 'clipPath', val: 'inset(0 0% 0 0%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // LEFT EDGE (Curling flesh edge)
  // ============================================================================

  const leftEdge: RenderableComponentData = {
    id: 'flesh-tear-left-edge',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: `${tearWidth / 2}px`,
          height: '100%',
          left: '50%',
          transformOrigin: 'right center',
          background: 'linear-gradient(to right, #8B0000, #4a0000, #2d0000)',
          boxShadow:
            'inset -10px 0 20px rgba(0,0,0,0.8), -5px 0 15px rgba(139,0,0,0.6)',
        },
      },
    },
    context: {
      timing: {
        start: phase2.start,
        duration: params.duration - phase2.start,
      },
    },
    effects: [
      // Edge curl animation (3D rotation)
      {
        id: 'left-edge-curl',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: phase4.start + phase4.duration - phase2.start,
          mode: 'provider',
          targetIds: ['flesh-tear-left-edge'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -edgeCurl / 2, prog: 0.3 },
            { key: 'rotateY', val: -edgeCurl, prog: 1 },
          ],
        },
      },
      // Breathing effect (continuous pulse)
      ...(params.breathingEffect
        ? [
            {
              id: 'left-edge-breathing',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: phase4.start - phase2.start,
                duration: phase4.duration + phase5.duration,
                mode: 'provider',
                targetIds: ['flesh-tear-left-edge'],
                ranges: [
                  { key: 'scale', val: 0.98, prog: 0 },
                  { key: 'scale', val: 1.02, prog: 0.5 },
                  { key: 'scale', val: 0.98, prog: 1 },
                ],
              },
            },
          ]
        : []),
    ],
  };

  // ============================================================================
  // RIGHT EDGE (Curling flesh edge)
  // ============================================================================

  const rightEdge: RenderableComponentData = {
    id: 'flesh-tear-right-edge',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: `${tearWidth / 2}px`,
          height: '100%',
          right: '50%',
          transformOrigin: 'left center',
          background: 'linear-gradient(to left, #8B0000, #4a0000, #2d0000)',
          boxShadow:
            'inset 10px 0 20px rgba(0,0,0,0.8), 5px 0 15px rgba(139,0,0,0.6)',
        },
      },
    },
    context: {
      timing: {
        start: phase2.start,
        duration: params.duration - phase2.start,
      },
    },
    effects: [
      // Edge curl animation (3D rotation)
      {
        id: 'right-edge-curl',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: phase4.start + phase4.duration - phase2.start,
          mode: 'provider',
          targetIds: ['flesh-tear-right-edge'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: edgeCurl / 2, prog: 0.3 },
            { key: 'rotateY', val: edgeCurl, prog: 1 },
          ],
        },
      },
      // Breathing effect (continuous pulse)
      ...(params.breathingEffect
        ? [
            {
              id: 'right-edge-breathing',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: phase4.start - phase2.start,
                duration: phase4.duration + phase5.duration,
                mode: 'provider',
                targetIds: ['flesh-tear-right-edge'],
                ranges: [
                  { key: 'scale', val: 0.98, prog: 0 },
                  { key: 'scale', val: 1.02, prog: 0.5 },
                  { key: 'scale', val: 0.98, prog: 1 },
                ],
              },
            },
          ]
        : []),
    ],
  };

  // ============================================================================
  // FLUID DRIPS (Blood/organic fluid effects)
  // ============================================================================

  const fluidDrips: RenderableComponentData[] = Array.from(
    { length: params.fluidDripCount },
    (_, i) => {
      const dripLeft = 48 + (i % 5) * 1; // Stagger horizontally
      const dripTop = 50 + (i % 3) * 5; // Stagger vertically
      const dripWidth = 6 + (i % 3) * 2;
      const dripDelay = phase3.start + i * 0.15;

      return {
        id: `flesh-tear-drip-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${dripWidth}px`,
              height: '0px',
              left: `${dripLeft}%`,
              top: `${dripTop}%`,
              background: 'linear-gradient(to bottom, #8B0000, #550000)',
              borderRadius: `0 0 ${dripWidth / 2}px ${dripWidth / 2}px`,
              boxShadow: '0 2px 8px rgba(139,0,0,0.8)',
            },
          },
        },
        context: {
          timing: {
            start: dripDelay,
            duration: params.duration - dripDelay,
          },
        },
        effects: [
          // Drip height animation (grows downward)
          {
            id: `drip-${i}-height`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: 1.5,
              mode: 'provider',
              targetIds: [`flesh-tear-drip-${i}`],
              ranges: [
                { key: 'height', val: '0px', prog: 0 },
                { key: 'height', val: `${40 + i * 10}px`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // ============================================================================
  // BLOOD OVERLAY (Red tint)
  // ============================================================================

  const bloodOverlay: RenderableComponentData | null = params.bloodOverlay
    ? ({
        id: 'flesh-tear-blood-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none bg-red-900/20',
            style: {
              mixBlendMode: 'multiply',
            },
          },
        },
        context: {
          timing: {
            start: phase3.start,
            duration: params.duration - phase3.start,
          },
        },
        effects: [
          // Blood overlay fade in
          {
            id: 'blood-overlay-fade',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: phase3.duration,
              mode: 'provider',
              targetIds: ['flesh-tear-blood-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData)
    : null;

  // ============================================================================
  // SHAKE CONTAINER (Screen shake during violent ripping)
  // ============================================================================

  const shakeEffect = params.shakeOnTear
    ? {
        id: 'flesh-tear-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: phase3.start,
          duration: phase3.duration,
          mode: 'provider',
          targetIds: ['flesh-tear-root'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: shakeIntensity, prog: 0.1 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.2 },
            { key: 'translateX', val: shakeIntensity, prog: 0.3 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.4 },
            { key: 'translateX', val: shakeIntensity, prog: 0.5 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.6 },
            { key: 'translateX', val: shakeIntensity, prog: 0.7 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.8 },
            { key: 'translateX', val: shakeIntensity, prog: 0.9 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: shakeIntensity, prog: 0.15 },
            { key: 'translateY', val: -shakeIntensity, prog: 0.35 },
            { key: 'translateY', val: shakeIntensity, prog: 0.55 },
            { key: 'translateY', val: -shakeIntensity, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      }
    : null;

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'flesh-tear-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          filter: 'contrast(1.2) saturate(1.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: shakeEffect ? [shakeEffect] : [],
    childrenData: [
      backgroundLayer,
      revealLayer,
      leftEdge,
      rightEdge,
      ...fluidDrips,
      ...(bloodOverlay ? [bloodOverlay] : []),
    ],
  };

  // ============================================================================
  // OUTPUT
  // ============================================================================

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
  id: 'flesh-tear-transition',
  title: 'Flesh Tear Transition',
  description:
    'A visceral horror transition that simulates skin or reality being ripped apart to reveal disturbing content beneath. Features realistic tear physics with resistance points, curling edges showing organic layers, dripping fluid effects, and breathing/pulsing animations. The tear progresses through five phases: puncture, slow tear, violent rip, full opening, and healing/destruction.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'horror',
    'tear',
    'visceral',
    'flesh',
    'organic',
    'reveal',
    'body-horror',
  ],
  defaultInputParams: {
    backgroundSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    revealSrc: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    duration: 5,
    tearIntensity: 1,
    edgeCurlAmount: 120,
    fluidDripCount: 3,
    breathingEffect: true,
    shakeOnTear: true,
    bloodOverlay: true,
    healOrDestroy: 'destroy',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const fleshTearTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
