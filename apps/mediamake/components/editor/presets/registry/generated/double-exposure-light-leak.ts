/**
 * Double Exposure Light Leak Transition Preset
 *
 * Creates an elegant 2.2-second film photography-inspired transition where
 * both videos are visible simultaneously during the middle section, creating
 * a true double exposure effect. Features organic light leak shapes that morph
 * and move across the frame, plus film grain overlay that intensifies during
 * the double exposure period.
 *
 * Features:
 * - True double exposure effect with both videos at 50% opacity mid-transition
 * - Outgoing video fades with soft glow (blur + brightness)
 * - Incoming video fades in with complementary adjustments (contrast + saturate)
 * - 3-4 organic light leak shapes with bezier curve clip-paths
 * - Light leaks use screen blend mode for authentic film light leak effect
 * - Film grain overlay that peaks during double exposure
 * - Smooth three-phase timing: dominance → double exposure → dominance
 *
 * Use cases:
 * - Film photography-style transitions
 * - Nostalgic/vintage video transitions
 * - Creative storytelling transitions
 * - Music video transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z
      .number()
      .optional()
      .describe('Start time in seconds for outgoing video'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z
      .number()
      .optional()
      .describe('Start time in seconds for incoming video'),
  }),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Total transition duration in seconds'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Maximum grain opacity during double exposure (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const transitionDuration = params.transitionDuration;
  const grainIntensity = params.grainIntensity ?? 0.3;

  // Three-phase timing
  const phase1Duration = 0.7; // Outgoing dominance
  const phase2Start = phase1Duration;
  const phase2Duration = 0.8; // Double exposure period (0.7s to 1.5s)
  const phase3Start = phase2Start + phase2Duration;
  const phase3Duration = transitionDuration - phase3Start; // Incoming dominance

  // Create organic bezier curve clip-paths for light leaks
  const lightLeakPaths = [
    // Light leak 1 - diagonal sweep from top-left
    {
      start: 'polygon(0% 0%, 30% 0%, 10% 100%, 0% 100%)',
      mid: 'polygon(30% 0%, 70% 0%, 50% 100%, 10% 100%)',
      end: 'polygon(70% 0%, 100% 0%, 100% 100%, 50% 100%)',
    },
    // Light leak 2 - curved shape from right
    {
      start: 'ellipse(20% 40% at 120% 50%)',
      mid: 'ellipse(35% 50% at 80% 50%)',
      end: 'ellipse(25% 45% at 40% 50%)',
    },
    // Light leak 3 - bottom wave
    {
      start: 'polygon(0% 80%, 100% 85%, 100% 100%, 0% 100%)',
      mid: 'polygon(0% 70%, 100% 75%, 100% 100%, 0% 100%)',
      end: 'polygon(0% 90%, 100% 85%, 100% 100%, 0% 100%)',
    },
  ];

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: params.outgoingVideo.src,
        startFrom: params.outgoingVideo.startFrom ?? 0,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Phase 1: Stay at full opacity
        // Phase 2: Fade to 50% with glow
        {
          id: 'outgoing-opacity-phase2',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2Start,
            duration: phase2Duration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1.0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          },
        },
        // Phase 3: Fade out completely
        {
          id: 'outgoing-opacity-phase3',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase3Start,
            duration: phase3Duration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Apply glow filter during phases 2 and 3
        {
          id: 'outgoing-glow',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2Start,
            duration: phase2Duration + phase3Duration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              {
                key: 'filter',
                val: 'blur(0px) brightness(1)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'blur(1px) brightness(1.4)',
                prog: 0.3,
              },
              {
                key: 'filter',
                val: 'blur(1px) brightness(1.4)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: params.incomingVideo.src,
        startFrom: params.incomingVideo.startFrom ?? 0,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Phase 1: Stay at 0 opacity
        // Phase 2: Fade to 50%
        {
          id: 'incoming-opacity-phase2',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2Start,
            duration: phase2Duration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          },
        },
        // Phase 3: Fade to full opacity
        {
          id: 'incoming-opacity-phase3',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase3Start,
            duration: phase3Duration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 1.0, prog: 1 },
            ],
          },
        },
        // Apply complementary filter during phases 2 and 3
        {
          id: 'incoming-filter',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2Start,
            duration: phase2Duration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              {
                key: 'filter',
                val: 'contrast(1) saturate(1)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'contrast(1.2) saturate(0.9)',
                prog: 1,
              },
            ],
          },
        },
        // Remove filter during phase 3
        {
          id: 'incoming-filter-phase3',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase3Start,
            duration: phase3Duration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              {
                key: 'filter',
                val: 'contrast(1.2) saturate(0.9)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'contrast(1) saturate(1)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light leak shapes
    ...lightLeakPaths.map((paths, index) => ({
      id: `light-leak-${index + 1}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute inset-0 bg-gradient-radial from-yellow-200/60 via-orange-100/40 to-transparent"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Fade in during phase 2
        {
          id: `light-leak-${index + 1}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2Start,
            duration: phase2Duration * 0.5,
            mode: 'provider',
            targetIds: [`light-leak-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        },
        // Fade out during phase 3
        {
          id: `light-leak-${index + 1}-opacity-out`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase3Start,
            duration: phase3Duration,
            mode: 'provider',
            targetIds: [`light-leak-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Morph clip-path
        {
          id: `light-leak-${index + 1}-morph`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2Start,
            duration: phase2Duration + phase3Duration,
            mode: 'provider',
            targetIds: [`light-leak-${index + 1}`],
            ranges: [
              { key: 'clipPath', val: paths.start, prog: 0 },
              { key: 'clipPath', val: paths.mid, prog: 0.5 },
              { key: 'clipPath', val: paths.end, prog: 1 },
            ],
          },
        },
        // Move position
        {
          id: `light-leak-${index + 1}-move`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase2Start,
            duration: phase2Duration + phase3Duration,
            mode: 'provider',
            targetIds: [`light-leak-${index + 1}`],
            ranges: [
              {
                key: 'translateX',
                val: `${-20 + index * 10}px`,
                prog: 0,
              },
              {
                key: 'translateX',
                val: `${20 - index * 10}px`,
                prog: 1,
              },
            ],
          },
        },
      ],
    })) as RenderableComponentData[],

    // Grain overlay
    {
      id: 'grain-overlay',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute inset-0"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 300\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\" opacity=\"0.5\" /%3E%3C/svg%3E')",
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Fade in grain during phase 2
        {
          id: 'grain-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase2Start,
            duration: phase2Duration * 0.5,
            mode: 'provider',
            targetIds: ['grain-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: grainIntensity, prog: 1 },
            ],
          },
        },
        // Fade out grain during phase 3
        {
          id: 'grain-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase3Start,
            duration: phase3Duration,
            mode: 'provider',
            targetIds: ['grain-overlay'],
            ranges: [
              { key: 'opacity', val: grainIntensity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'double-exposure-light-leak-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData,
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
  id: 'double-exposure-light-leak',
  title: 'Double Exposure Light Leak Transition',
  description:
    'Elegant 2.2s double exposure transition inspired by film photography accidents. Features simultaneous visibility with organic light leak shapes, bezier curve morphing, and film grain overlay during the double exposure period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'double-exposure',
    'light-leak',
    'film',
    'vintage',
    'organic',
    'grain',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 2.2,
    grainIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doubleExposureLightLeakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
