/**
 * Double Whip Pan Transition Preset
 *
 * Creates a dynamic back-and-forth lateral movement transition between two media items.
 * The transition has two distinct phases:
 * - Phase 1 (0-0.15s): Outgoing media slides right creating anticipation
 * - Phase 2 (0.15-0.3s): Both media slide sharply left for the actual transition
 *
 * Features:
 * - Progressive motion blur that intensifies through both phases
 * - ScaleX stretching during horizontal movement for whip effect
 * - Vertical shake (2-3px wiggle) at transition point for impact
 * - Incoming media appears to 'catch' the momentum of the second swish
 *
 * Perfect for comedic timing, reaction videos, or dramatic reveals.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.3)
    .describe('Duration of double whip pan transition (default: 0.3s)'),
  blurIntensity: z
    .number()
    .default(1)
    .describe('Motion blur intensity multiplier (default: 1)'),
  shakeIntensity: z
    .number()
    .default(1)
    .describe('Vertical shake intensity multiplier (default: 1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, blurIntensity, shakeIntensity } =
    params;

  // Calculate timing
  const phase1Duration = transitionDuration / 2; // 0.15s
  const phase2Duration = transitionDuration / 2; // 0.15s
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Blur values
  const maxBlur = 25 * (blurIntensity ?? 1);
  const midBlur = 8 * (blurIntensity ?? 1);

  // Shake values
  const shakeAmount = 3 * (shakeIntensity ?? 1);

  // Create wrappers for media items
  const outgoingWrapper: RenderableComponentData = {
    id: 'outgoing-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-media',
        type: 'atom',
        componentId: media1ComponentId,
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const incomingWrapper: RenderableComponentData = {
    id: 'incoming-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: media2.duration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-media',
        type: 'atom',
        componentId: media2ComponentId,
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Phase 1 effect: Outgoing slides right (0-0.15s)
  const outgoingPhase1Effect = {
    id: 'outgoing-phase1-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: media1.duration - transitionDuration,
      duration: phase1Duration,
      mode: 'provider',
      targetIds: ['outgoing-wrapper'],
      ranges: [
        { key: 'translateX', val: '0%', prog: 0 },
        { key: 'translateX', val: '15%', prog: 1 },
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1.08, prog: 1 },
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${midBlur}px)`, prog: 1 },
      ],
    },
  };

  // Phase 2 effect: Outgoing slides sharply left (0.15-0.3s)
  const outgoingPhase2Effect = {
    id: 'outgoing-phase2-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: media1.duration - phase2Duration,
      duration: phase2Duration,
      mode: 'provider',
      targetIds: ['outgoing-wrapper'],
      ranges: [
        { key: 'translateX', val: '15%', prog: 0 },
        { key: 'translateX', val: '-120%', prog: 1 },
        { key: 'scaleX', val: 1.08, prog: 0 },
        { key: 'scaleX', val: 1.12, prog: 0.5 },
        { key: 'scaleX', val: 1, prog: 1 },
        { key: 'filter', val: `blur(${midBlur}px)`, prog: 0 },
        { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        { key: 'translateY', val: '0px', prog: 0 },
        { key: 'translateY', val: `${shakeAmount}px`, prog: 0.3 },
        { key: 'translateY', val: `${-shakeAmount}px`, prog: 0.6 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    },
  };

  // Phase 1 effect: Incoming hidden (0-0.15s)
  const incomingPhase1Effect = {
    id: 'incoming-phase1-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: phase1Duration,
      mode: 'provider',
      targetIds: ['incoming-wrapper'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Phase 2 effect: Incoming slides in from right (0.15-0.3s)
  const incomingPhase2Effect = {
    id: 'incoming-phase2-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: phase1Duration,
      duration: phase2Duration,
      mode: 'provider',
      targetIds: ['incoming-wrapper'],
      ranges: [
        { key: 'translateX', val: '120%', prog: 0 },
        { key: 'translateX', val: '0%', prog: 1 },
        { key: 'scaleX', val: 1.12, prog: 0 },
        { key: 'scaleX', val: 1.08, prog: 0.5 },
        { key: 'scaleX', val: 1, prog: 1 },
        { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
        { key: 'filter', val: `blur(${midBlur}px)`, prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'translateY', val: '0px', prog: 0 },
        { key: 'translateY', val: `${shakeAmount}px`, prog: 0.3 },
        { key: 'translateY', val: `${-shakeAmount}px`, prog: 0.6 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    },
  };

  // Attach effects to wrappers
  outgoingWrapper.effects = [outgoingPhase1Effect, outgoingPhase2Effect];
  incomingWrapper.effects = [incomingPhase1Effect, incomingPhase2Effect];

  const rootContainer: RenderableComponentData = {
    id: 'double-whip-pan-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingWrapper, incomingWrapper],
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
  id: 'double-whip-pan-transition',
  title: 'Double Whip Pan Transition',
  description:
    'A dynamic two-stage transition with back-and-forth lateral movement. First swishes right (0.15s) for anticipation, then both media slide sharply left (0.15s) for the actual transition. Features progressive motion blur, scaleX stretching, and vertical shake at the transition point. Perfect for comedic timing, reaction videos, or dramatic reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'whip-pan', 'double-whip', 'lateral', 'comedic', 'dramatic'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    transitionDuration: 0.3,
    blurIntensity: 1,
    shakeIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doubleWhipPanTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
