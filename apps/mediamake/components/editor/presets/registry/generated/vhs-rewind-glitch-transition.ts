/**
 * VHS Rewind Glitch Transition Preset
 * 
 * A nostalgic VHS-style transition effect featuring rapid rewind with horizontal distortion bands,
 * ghost frame overlaps, signal loss flash, and mechanical tape switching. The outgoing video
 * accelerates backwards with increasing blur while ghost frames create motion trails. At the
 * midpoint, brief signal loss simulates tape mechanism engagement. The incoming video enters
 * with initial warble and gradually stabilizes, creating an authentic analog tape transition feel.
 * 
 * Technical Features:
 * - Outgoing video with reverse playback and increasing blur
 * - 3 ghost frames with decreasing opacity and horizontal offsets
 * - Horizontal distortion bands using repeating gradients
 * - Signal loss flash at midpoint (black screen with static noise texture)
 * - Incoming video with initial playback warble and skew effects
 * - Mechanical rewind audio cue
 * - Precise 0.9 second transition timing
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
  
  transitionDuration: z
    .number()
    .default(0.9)
    .describe('Duration of transition in seconds'),
  
  rewindAudioSrc: z
    .string()
    .optional()
    .describe('Optional VHS rewind mechanical sound effect URL'),
  
  distortionIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for distortion effects (0.1-3.0)'),
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
    rewindAudioSrc,
    distortionIntensity,
  } = params;

  // Calculate timing points
  const midpoint = transitionDuration / 2; // 0.45s
  const signalLossStart = midpoint - 0.05; // 0.4s
  const signalLossDuration = 0.1; // 0.1s
  const incomingStartTime = midpoint; // 0.45s
  const warbleStabilizationDuration = 0.3; // 0.3s

  // Calculate total container duration
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Build children data array
  const childrenData: RenderableComponentData[] = [];

  // 1. Outgoing video (main)
  const outgoingVideoId = 'outgoing-video-main';
  childrenData.push({
    id: outgoingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      playbackRate: -3, // Reverse playback at 3x speed
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${8 * distortionIntensity}px)`, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 2. Ghost frames (3 duplicates with decreasing opacity and translateX offsets)
  const ghostFrameConfigs = [
    { opacity: 0.5, translateX: -15 * distortionIntensity },
    { opacity: 0.3, translateX: -30 * distortionIntensity },
    { opacity: 0.1, translateX: -45 * distortionIntensity },
  ];

  ghostFrameConfigs.forEach((config, index) => {
    const ghostId = `ghost-frame-${index + 1}`;
    childrenData.push({
      id: ghostId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        playbackRate: -3,
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `ghost-${index + 1}-effect`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [ghostId],
            ranges: [
              { key: 'opacity', val: config.opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: `${config.translateX}px`, prog: 0 },
              { key: 'translateX', val: `${config.translateX * 2}px`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // 3. Distortion bands layer (repeating horizontal gradient overlay)
  const distortionBandsId = 'distortion-bands-layer';
  childrenData.push({
    id: distortionBandsId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 4px, rgba(255,255,255,0.08) 4px, rgba(255,255,255,0.08) 8px)',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration * 0.6, // Fade out before end
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'distortion-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.6,
          mode: 'provider',
          targetIds: [distortionBandsId],
          ranges: [
            { key: 'opacity', val: 0.6 * distortionIntensity, prog: 0 },
            { key: 'opacity', val: 1 * distortionIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 4. Signal loss layer (black screen with static noise texture at midpoint)
  const signalLossId = 'signal-loss-layer';
  childrenData.push({
    id: signalLossId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#000000',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        },
      },
    },
    context: {
      timing: {
        start: signalLossStart,
        duration: signalLossDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'signal-loss-flash-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: signalLossDuration,
          mode: 'provider',
          targetIds: [signalLossId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 5. Incoming video (with warble and stabilization)
  const incomingVideoId = 'incoming-video';
  childrenData.push({
    id: incomingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration + incomingStartTime,
        duration: incomingVideo.duration,
      },
    },
    effects: [
      {
        id: 'incoming-playback-rate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: warbleStabilizationDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      },
      {
        id: 'incoming-warble-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: warbleStabilizationDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            { key: 'skewY', val: `${2 * distortionIntensity}deg`, prog: 0 },
            { key: 'skewY', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 6. Rewind audio (optional)
  if (rewindAudioSrc) {
    childrenData.push({
      id: 'rewind-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: rewindAudioSrc,
        volume: 0.8,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration * 0.7,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vhs-rewind-transition-root',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vhs-rewind-glitch-transition',
  title: 'VHS Rewind Glitch Transition',
  description:
    'A nostalgic VHS-style transition effect featuring rapid rewind with horizontal distortion bands, ghost frame overlaps, signal loss flash, and mechanical tape switching. The outgoing video accelerates backwards with increasing blur while ghost frames create motion trails. At the midpoint, brief signal loss simulates tape mechanism engagement. The incoming video enters with initial warble and gradually stabilizes, creating an authentic analog tape transition feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vhs',
    'rewind',
    'glitch',
    'retro',
    'analog',
    'distortion',
    'tape',
    'mechanical',
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
    transitionDuration: 0.9,
    rewindAudioSrc: undefined,
    distortionIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const vhsRewindGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
