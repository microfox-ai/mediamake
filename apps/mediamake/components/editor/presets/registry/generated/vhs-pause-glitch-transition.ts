/**
 * VHS Pause-Glitch Transition Preset
 *
 * This preset recreates the distorted freeze frame effect when pausing a VCR.
 * The outgoing video freezes on the last frame, then distorts with horizontal
 * noise bands and color bleeding. During the 0.6 second transition, rapid frame
 * jumping occurs between the frozen outgoing frame and the first frame of incoming
 * video, with increasing glitch artifacts. The incoming video "un-pauses" with a
 * characteristic VHS wobble and stabilization period. Includes authentic VHS
 * head-switching noise at the bottom of the frame.
 *
 * Features:
 * - Frozen last frame of outgoing video with distortion filters
 * - Horizontal glitch bands with random translateX animations
 * - Rapid frame jumping (60ms intervals) between outgoing and incoming videos
 * - VHS wobble effect on incoming video (scaleX/skewY animation)
 * - Head-switch noise at bottom 10% with opacity flicker
 * - Short 0.6s overlap for snappy transition
 * - Proper z-ordering for layered glitch elements
 *
 * Use cases:
 * - Nostalgic VHS-style video transitions
 * - Retro video content with authentic VCR pause effects
 * - Music videos with vintage aesthetics
 * - 80s/90s themed content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of incoming video'),
  freezeFrameTime: z
    .number()
    .optional()
    .describe(
      'Timestamp to freeze outgoing video (endAt property). If not provided, freezes at last frame.',
    ),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of transition overlap in seconds'),
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for glitch effects (0.5-2)'),
  frameJumpInterval: z
    .number()
    .default(0.06)
    .optional()
    .describe('Interval between frame jumps in seconds (default: 0.06 = 60ms)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    freezeFrameTime,
    transitionDuration,
    glitchIntensity,
    frameJumpInterval,
  } = params;

  const duration = transitionDuration || 0.6;
  const intensity = glitchIntensity ?? 1;
  const jumpInterval = frameJumpInterval ?? 0.06;

  // Calculate number of frame jumps (alternating opacity keyframes)
  const numJumps = Math.floor(duration / jumpInterval);

  // Generate opacity keyframes for frame jumping effect
  // Alternates between outgoing (1) and incoming (0) visibility
  const generateJumpKeyframes = (isOutgoing: boolean) => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];
    for (let i = 0; i <= numJumps; i++) {
      const progress = i / numJumps;
      // Alternate opacity: outgoing starts at 1, incoming starts at 0
      const opacity = isOutgoing
        ? i % 2 === 0
          ? 1
          : 0
        : i % 2 === 0
        ? 0
        : 1;
      keyframes.push({ key: 'opacity', val: opacity, prog: progress });
    }
    return keyframes;
  };

  // Glitch band configurations with randomized properties
  const glitchBands = [
    {
      id: 'glitch-band-1',
      top: '15%',
      height: '3px',
      gradient:
        'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
      start: 0.05,
      duration: 0.5,
      translateStart: -30 * intensity,
      translateEnd: 50 * intensity,
    },
    {
      id: 'glitch-band-2',
      top: '35%',
      height: '4px',
      gradient:
        'linear-gradient(90deg, transparent, rgba(0,255,255,0.6), transparent)',
      start: 0.1,
      duration: 0.45,
      translateStart: 40 * intensity,
      translateEnd: -60 * intensity,
    },
    {
      id: 'glitch-band-3',
      top: '55%',
      height: '2px',
      gradient:
        'linear-gradient(90deg, transparent, rgba(255,0,255,0.7), transparent)',
      start: 0.15,
      duration: 0.4,
      translateStart: -50 * intensity,
      translateEnd: 30 * intensity,
    },
    {
      id: 'glitch-band-4',
      top: '72%',
      height: '5px',
      gradient:
        'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
      start: 0.08,
      duration: 0.47,
      translateStart: 20 * intensity,
      translateEnd: -70 * intensity,
    },
    {
      id: 'glitch-band-5',
      top: '88%',
      height: '3px',
      gradient:
        'linear-gradient(90deg, transparent, rgba(255,100,100,0.6), transparent)',
      start: 0.12,
      duration: 0.43,
      translateStart: -40 * intensity,
      translateEnd: 80 * intensity,
    },
  ];

  // Build glitch band components
  const glitchBandComponents: RenderableComponentData[] = glitchBands.map(
    (band) => ({
      id: band.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-0 right-0 pointer-events-none',
          style: {
            top: band.top,
            height: band.height,
            background: band.gradient,
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: band.start,
          duration: band.duration,
        },
      },
      effects: [
        {
          id: `${band.id}-glitch`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: band.duration,
            mode: 'provider',
            targetIds: [band.id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.2 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0.9, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: `${band.translateStart}px`, prog: 0 },
              { key: 'translateX', val: `${band.translateEnd}px`, prog: 0.5 },
              { key: 'translateX', val: `${band.translateStart}px`, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Outgoing video: frozen last frame with distortion
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      ...(freezeFrameTime !== undefined ? { endAt: freezeFrameTime } : {}),
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        filter: 'saturate(1.2) contrast(1.1)',
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
        id: 'outgoing-frame-jump',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: generateJumpKeyframes(true),
        },
      },
    ],
  };

  // Incoming video: starts with VHS wobble effect
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      startFrom: 0,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'incoming-frame-jump',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: generateJumpKeyframes(false),
        },
      },
      {
        id: 'incoming-vhs-wobble',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scaleX', val: 1.02 * intensity, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'skewY', val: 1 * intensity, prog: 0 },
            { key: 'skewY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Head-switch noise at bottom 10%
  const headSwitchNoise: RenderableComponentData = {
    id: 'head-switch-noise',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 right-0 bottom-0 pointer-events-none',
        style: {
          height: '10%',
          zIndex: 15,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)',
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
        id: 'noise-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['head-switch-noise'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.1 },
            { key: 'opacity', val: 0.3, prog: 0.2 },
            { key: 'opacity', val: 0.9, prog: 0.3 },
            { key: 'opacity', val: 0.4, prog: 0.5 },
            { key: 'opacity', val: 0.7, prog: 0.7 },
            { key: 'opacity', val: 0.2, prog: 0.9 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing container (z-index: 1)
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [outgoingVideo],
  };

  // Incoming container (z-index: 2)
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [incomingVideo],
  };

  // Glitch bands container (z-index: 10)
  const glitchBandsContainer: RenderableComponentData = {
    id: 'glitch-bands-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: glitchBandComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vhs-pause-glitch-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
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
      outgoingContainer,
      incomingContainer,
      glitchBandsContainer,
      headSwitchNoise,
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
  id: 'vhs-pause-glitch-transition',
  title: 'VHS Pause-Glitch Transition',
  description:
    'A nostalgic VHS pause-glitch transition that recreates the distorted freeze frame effect when pausing a VCR. Features horizontal noise bands, color bleeding, rapid frame jumping between outgoing frozen frame and incoming video, VHS wobble stabilization, and authentic head-switching noise at the bottom of the frame. The 0.6 second transition provides a snappy, authentic retro video feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vhs',
    'glitch',
    'retro',
    'vintage',
    'pause',
    'vcr',
    'nostalgic',
    'distortion',
    'noise',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 0.6,
    glitchIntensity: 1,
    frameJumpInterval: 0.06,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vhsPauseGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
