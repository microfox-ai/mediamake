/**
 * Perspective Carousel Spin Transition
 *
 * Attention-grabbing transition featuring compound 3D rotations (rotateY + rotateZ)
 * with a zoom pulse at the midpoint and vignette overlay. Creates a cylindrical
 * motion path with snappy, professional cubic-bezier easing optimized for YouTube.
 *
 * Features:
 * - Compound rotation: rotateY (-90deg primary spin) + rotateZ (15deg secondary tilt)
 * - Zoom pulse: Both images scale to 1.1 at transition midpoint
 * - 0.7s overlap with cubic-bezier(0.4, 0, 0.2, 1) easing
 * - Vignette radial gradient overlay that intensifies during transition
 * - 3D perspective container (700px) with preserved transforms
 *
 * Use cases:
 * - YouTube content transitions with high visual impact
 * - Attention-grabbing media transitions for social content
 * - Professional video montages with 3D effects
 * - Creating cylindrical motion paths between media items
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
    src: z.string().describe('Source URL of the outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Outgoing media configuration'),
  media2: z.object({
    src: z.string().describe('Source URL of the incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Incoming media configuration'),
  overlapDuration: z
    .number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds (default: 0.7)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate total duration (sum of media durations minus overlap)
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Outgoing media starts at 0, lasts for its full duration
  const outgoingStart = 0;
  const outgoingDuration = media1.duration;

  // Incoming media starts before outgoing ends (overlap), extended by overlap
  const incomingStart = media1.duration - overlapDuration;
  const incomingDuration = media2.duration;

  // Transition effect timing (for outgoing: starts at end minus overlap)
  const outgoingEffectStart = outgoingDuration - overlapDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing media (zIndex 10)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Outgoing spiral: opacity [1, 0], transform rotateY(0→-90deg) rotateZ(0→15deg) scale(1→0.6)
        {
          id: 'outgoing-spiral',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: outgoingEffectStart, // Relative to outgoing media start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              // Opacity fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              // Compound rotation + scale
              // rotateY: 0deg → -90deg
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -90, prog: 1 },
              // rotateZ: 0deg → 15deg
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: 15, prog: 1 },
              // scale: 1 → 0.6
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.6, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media (zIndex 20)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        // Incoming spiral: opacity [0, 1], transform rotateY(90deg→0→0) rotateZ(-15deg→0→0) scale(0.6→1.1→1)
        // Keyframes at 0%, 70%, 100%
        {
          id: 'incoming-spiral',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0, // Relative to incoming media start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 1, prog: 1 },
              // rotateY: 90deg → 0deg (at 70%) → 0deg (at 100%)
              { key: 'rotateY', val: 90, prog: 0 },
              { key: 'rotateY', val: 0, prog: 0.7 },
              { key: 'rotateY', val: 0, prog: 1 },
              // rotateZ: -15deg → 0deg (at 70%) → 0deg (at 100%)
              { key: 'rotateZ', val: -15, prog: 0 },
              { key: 'rotateZ', val: 0, prog: 0.7 },
              { key: 'rotateZ', val: 0, prog: 1 },
              // scale: 0.6 → 1.1 (at 70%) → 1 (at 100%)
              { key: 'scale', val: 0.6, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.7 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Vignette overlay (zIndex 30)
    {
      id: 'vignette-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="position: absolute; inset: 0; background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.7) 100%); pointer-events: none;"></div>',
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
        },
      },
      context: {
        timing: {
          start: incomingStart, // Starts with incoming media
          duration: overlapDuration,
        },
      },
      effects: [
        // Vignette opacity pulse: 0 → 0.3 → 0 during transition
        {
          id: 'vignette-pulse',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0, // Relative to vignette start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['vignette-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'perspective-carousel-spin-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '700px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'perspective-carousel-spin-transition',
  title: 'Perspective Carousel Spin Transition',
  description:
    'Attention-grabbing YouTube transition with compound 3D rotations (rotateY + rotateZ), zoom pulse at midpoint, and vignette overlay. Features cylindrical motion path with cubic-bezier easing for professional, snappy transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'perspective', '3d', 'carousel', 'spin', 'youtube', 'attention-grabbing'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    overlapDuration: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const perspectiveCarouselSpinTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
