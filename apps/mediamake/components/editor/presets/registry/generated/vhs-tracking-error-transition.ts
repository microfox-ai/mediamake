/**
 * VHS Tracking Error Transition Preset
 * 
 * Mimics the horizontal displacement and signal degradation that occurs when a VCR loses tracking.
 * Features:
 * - Outgoing video breaks into horizontal scan lines with random left/right displacement
 * - RGB color channel separation (chromatic aberration effect)
 * - Multiple displaced copies of outgoing video sliding at different speeds (torn signal effect)
 * - Incoming video emerges through vertical rolling static bands moving upward
 * - Tracking gradually "locks in" as the incoming video stabilizes
 * - Synchronized audio distortion effects
 * 
 * Use cases:
 * - Nostalgic VHS-style transitions between clips
 * - Retro/analog video aesthetics
 * - Glitch art and experimental video projects
 * - Period-appropriate transitions for 80s/90s content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number()
    .default(1.2)
    .describe('Duration of transition overlap in seconds'),
  
  displacementIntensity: z.number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of horizontal displacement (0-2, default: 1)'),
  
  audioDistortionSrc: z.string()
    .optional()
    .describe('Optional audio distortion sound effect source URL'),
  
  trackName: z.string()
    .default('vhs-transition')
    .describe('Name identifier for the transition track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    displacementIntensity,
    audioDistortionSrc,
    trackName,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  
  // Transition starts when outgoing video is about to end
  const transitionStartTime = outgoingVideo.duration - transitionDuration;

  // Helper: Generate random displacement values
  const generateDisplacement = (seed: number): number => {
    const min = -50 * displacementIntensity;
    const max = 50 * displacementIntensity;
    return min + (seed * (max - min));
  };

  // --- OUTGOING VIDEO LAYER ---
  const outgoingVideoMain: RenderableComponentData = {
    id: `${trackName}-outgoing-video-main`,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        filter: 'drop-shadow(2px 0 0 rgba(255,0,0,0.5)) drop-shadow(-2px 0 0 rgba(0,255,255,0.5))',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: `${trackName}-outgoing-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [`${trackName}-outgoing-video-main`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- DISPLACED COPIES (Torn Signal Effect) ---
  const displacedCopies: RenderableComponentData[] = [
    {
      id: `${trackName}-displaced-copy-1`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          opacity: 0.3,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: `${trackName}-displacement-1`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`${trackName}-displaced-copy-1`],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${generateDisplacement(0.3)}px`, prog: 0.3 },
              { key: 'translateX', val: `${generateDisplacement(0.6)}px`, prog: 0.6 },
              { key: 'translateX', val: `${generateDisplacement(0.9)}px`, prog: 0.9 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: `${trackName}-displaced-copy-2`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          opacity: 0.3,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: `${trackName}-displacement-2`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`${trackName}-displaced-copy-2`],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${generateDisplacement(0.4)}px`, prog: 0.25 },
              { key: 'translateX', val: `${generateDisplacement(0.7)}px`, prog: 0.5 },
              { key: 'translateX', val: `${generateDisplacement(0.2)}px`, prog: 0.75 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: `${trackName}-displaced-copy-3`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          opacity: 0.3,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: `${trackName}-displacement-3`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`${trackName}-displaced-copy-3`],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${generateDisplacement(0.5)}px`, prog: 0.2 },
              { key: 'translateX', val: `${generateDisplacement(0.8)}px`, prog: 0.6 },
              { key: 'translateX', val: `${generateDisplacement(0.1)}px`, prog: 0.8 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // --- STATIC BANDS (Rolling Upward) ---
  const staticBands: RenderableComponentData[] = [
    {
      id: `${trackName}-static-band-1`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '100%',
            height: '33%',
            top: '0%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.8) 50%, rgba(255,255,255,0.1) 100%)',
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: [],
      effects: [
        {
          id: `${trackName}-static-band-1-roll`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`${trackName}-static-band-1`],
            ranges: [
              { key: 'translateY', val: '100%', prog: 0 },
              { key: 'translateY', val: '-100%', prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: `${trackName}-static-band-2`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '100%',
            height: '33%',
            top: '33%',
            background: 'linear-gradient(180deg, rgba(200,200,200,0.2) 0%, rgba(0,0,0,0.6) 50%, rgba(180,180,180,0.15) 100%)',
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime + 0.2,
          duration: transitionDuration - 0.2,
        },
      },
      childrenData: [],
      effects: [
        {
          id: `${trackName}-static-band-2-roll`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration - 0.2,
            mode: 'provider',
            targetIds: [`${trackName}-static-band-2`],
            ranges: [
              { key: 'translateY', val: '100%', prog: 0 },
              { key: 'translateY', val: '-100%', prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: `${trackName}-static-band-3`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '100%',
            height: '33%',
            top: '66%',
            background: 'linear-gradient(180deg, rgba(150,150,150,0.25) 0%, rgba(0,0,0,0.7) 50%, rgba(120,120,120,0.2) 100%)',
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime + 0.4,
          duration: transitionDuration - 0.4,
        },
      },
      childrenData: [],
      effects: [
        {
          id: `${trackName}-static-band-3-roll`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration - 0.4,
            mode: 'provider',
            targetIds: [`${trackName}-static-band-3`],
            ranges: [
              { key: 'translateY', val: '100%', prog: 0 },
              { key: 'translateY', val: '-100%', prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // --- INCOMING VIDEO (Tracking Lock-In) ---
  const incomingVideoMain: RenderableComponentData = {
    id: `${trackName}-incoming-video-main`,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: `${trackName}-incoming-fade-in`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: [`${trackName}-incoming-video-main`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'skewX', val: '5deg', prog: 0 },
            { key: 'skewX', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // --- AUDIO DISTORTION (Optional) ---
  const audioDistortion: RenderableComponentData[] = audioDistortionSrc
    ? [
        {
          id: `${trackName}-audio-distortion`,
          type: 'atom',
          componentId: 'AudioAtom',
          data: {
            src: audioDistortionSrc,
            volume: 0.7,
          },
          context: {
            timing: {
              start: transitionStartTime,
              duration: transitionDuration,
            },
          },
        },
      ]
    : [];

  // --- ROOT CONTAINER ---
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-vhs-transition-root`,
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
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoMain,
      ...displacedCopies,
      ...staticBands,
      incomingVideoMain,
      ...audioDistortion,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vhs-tracking-error-transition',
  title: 'VHS Tracking Error Transition',
  description:
    'A nostalgic VHS tracking error transition effect that mimics horizontal displacement and signal degradation when a VCR loses tracking. Features outgoing video breaking into displaced horizontal scan lines with RGB color channel separation, rolling static bands that reveal the incoming video, and synchronized audio distortion. The transition creates authentic analog video artifacts including torn signal effects and tracking lock-in animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vhs',
    'retro',
    'analog',
    'glitch',
    'tracking-error',
    'chromatic-aberration',
    'vintage',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.2,
    displacementIntensity: 1,
    trackName: 'vhs-transition',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const vhsTrackingErrorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
