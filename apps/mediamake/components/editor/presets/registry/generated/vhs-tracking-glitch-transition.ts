/**
 * VHS Tracking Glitch Transition
 *
 * Frame-by-frame position glitch transition inspired by analog video tracking errors.
 * Creates rapid horizontal position oscillations (±15-20px) occurring 8 times during
 * a 0.4s overlap, simulating VHS tracking issues. The outgoing video shifts horizontally
 * with decreasing amplitude while RGB color channels separate slightly (using CSS filters).
 * The incoming video starts with maximum displacement and stabilizes. Includes horizontal
 * scan lines and chromatic aberration effects that peak during the middle of the transition
 * for authentic analog glitch aesthetics.
 *
 * Features:
 * - Rapid horizontal position oscillations (8 steps in 0.4s)
 * - RGB channel separation via CSS drop-shadow filters
 * - Decreasing amplitude pattern for outgoing video
 * - Inverse stabilization pattern for incoming video
 * - Horizontal scanline overlay with repeating linear gradient
 * - 0.4s overlap transition period
 *
 * Use cases:
 * - Retro VHS-style video transitions
 * - Analog glitch aesthetics for music videos
 * - Tech/glitch-themed content
 * - Vintage video effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(0.4)
    .describe('Duration of the transition overlap in seconds (default: 0.4s for VHS tracking effect)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate timing
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Generate keyframe positions for outgoing video (decreasing amplitude)
  // Pattern: [0, 20px, -15px, 18px, -12px, 10px, -5px, 0]
  const outgoingPositions = [0, 20, -15, 18, -12, 10, -5, 0];
  const incomingPositions = [-20, -18, -15, -10, -8, -5, -2, 0];

  // RGB split filter intensity progression (peaks in middle)
  const filterIntensities = [
    { offset: 0, shadowOffset: 1, opacity: 0.3 },
    { offset: 0.2, shadowOffset: 2, opacity: 0.6 },
    { offset: 0.5, shadowOffset: 3, opacity: 1 },
    { offset: 0.8, shadowOffset: 2, opacity: 0.6 },
    { offset: 1, shadowOffset: 1, opacity: 0.3 },
  ];

  // Generate outgoing video effects
  const outgoingEffects: any[] = [];

  // Position oscillation effect
  const positionRanges = outgoingPositions.map((pos, index) => ({
    key: 'translateX',
    val: `${pos}px`,
    prog: index / (outgoingPositions.length - 1),
  }));

  outgoingEffects.push({
    id: 'outgoing-position-glitch',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: video1.duration - overlapDuration,
      duration: overlapDuration,
      mode: 'provider',
      targetIds: ['outgoing-video'],
      ranges: positionRanges,
    },
  });

  // RGB split filter effect (intensifies and fades)
  const filterRanges = filterIntensities.map((intensity) => ({
    key: 'filter',
    val: `drop-shadow(-${intensity.shadowOffset}px 0 0 rgba(255, 0, 0, ${intensity.opacity})) drop-shadow(${intensity.shadowOffset}px 0 0 rgba(0, 255, 255, ${intensity.opacity}))`,
    prog: intensity.offset,
  }));

  outgoingEffects.push({
    id: 'outgoing-rgb-split',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: video1.duration - overlapDuration,
      duration: overlapDuration,
      mode: 'provider',
      targetIds: ['outgoing-video'],
      ranges: filterRanges,
    },
  });

  // Opacity fade out
  outgoingEffects.push({
    id: 'outgoing-fade',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: video1.duration - overlapDuration,
      duration: overlapDuration,
      mode: 'provider',
      targetIds: ['outgoing-video'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });

  // Generate incoming video effects
  const incomingEffects: any[] = [];

  // Position stabilization effect (starts displaced, stabilizes)
  const incomingPositionRanges = incomingPositions.map((pos, index) => ({
    key: 'translateX',
    val: `${pos}px`,
    prog: index / (incomingPositions.length - 1),
  }));

  incomingEffects.push({
    id: 'incoming-position-stabilize',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: overlapDuration,
      mode: 'provider',
      targetIds: ['incoming-video'],
      ranges: incomingPositionRanges,
    },
  });

  // RGB split filter effect (starts strong, fades out)
  const incomingFilterRanges = filterIntensities
    .slice()
    .reverse()
    .map((intensity, index) => ({
      key: 'filter',
      val: `drop-shadow(-${intensity.shadowOffset}px 0 0 rgba(255, 0, 0, ${intensity.opacity})) drop-shadow(${intensity.shadowOffset}px 0 0 rgba(0, 255, 255, ${intensity.opacity}))`,
      prog: index / (filterIntensities.length - 1),
    }));

  incomingEffects.push({
    id: 'incoming-rgb-split',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: overlapDuration,
      mode: 'provider',
      targetIds: ['incoming-video'],
      ranges: incomingFilterRanges,
    },
  });

  // Opacity fade in
  incomingEffects.push({
    id: 'incoming-fade',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: overlapDuration,
      mode: 'provider',
      targetIds: ['incoming-video'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  // Scanline overlay effect (peaks in middle of transition)
  const scanlineEffects = [
    {
      id: 'scanline-intensity',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: video1.duration - overlapDuration,
        duration: overlapDuration,
        mode: 'provider',
        targetIds: ['scanlines-overlay'],
        ranges: [
          { key: 'opacity', val: 0.1, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 0.5 },
          { key: 'opacity', val: 0.1, prog: 1 },
        ],
      },
    },
  ];

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video-container',
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
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
          effects: outgoingEffects,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: video2.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + overlapDuration,
            },
          },
          effects: incomingEffects,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Scanlines overlay
    {
      id: 'scanlines-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            opacity: 0.2,
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: scanlineEffects,
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'vhs-tracking-glitch-transition-container',
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
  id: 'vhs-tracking-glitch-transition',
  title: 'VHS Tracking Glitch Transition',
  description:
    'Frame-by-frame position glitch transition inspired by analog video tracking errors. Features rapid horizontal position oscillations (±15-20px) occurring 8 times during a 0.4s overlap, simulating VHS tracking issues. Includes RGB channel separation, scan lines, and chromatic aberration effects for authentic analog glitch aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'vhs',
    'analog',
    'retro',
    'tracking-error',
    'rgb-split',
    'chromatic-aberration',
    'scanline',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vhsTrackingGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
