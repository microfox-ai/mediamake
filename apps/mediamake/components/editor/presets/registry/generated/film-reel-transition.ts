/**
 * Film Reel Change Transition Preset
 *
 * Recreates the authentic experience of switching between two film reels in a vintage cinema
 * projection booth. This transition shows the tail leader of the outgoing reel with countdown
 * marks (3-2-1), registration crosses, and reel-end indicators, followed by a brief moment of
 * 'dead air' (black screen simulating manual reel change), then the head leader of the incoming
 * reel with its own countdown (1-2-3) and registration marks.
 *
 * Features:
 * - Authentic SMPTE-style countdown leaders (3-2-1 outgoing, 1-2-3 incoming)
 * - Cigarette burn cue marks in upper right corner (8s and 1s before reel end)
 * - Dead air gap (0.5s black screen) between reels
 * - Film perforation overlays on left and right edges
 * - Registration cross marks for alignment
 * - Film grain and vignette overlays for vintage cinema feel
 * - Extended 3s transition duration for full reel change effect
 *
 * Use cases:
 * - Creating authentic film projector transition effects
 * - Vintage cinema aesthetic for video projects
 * - Nostalgic film reel change simulations
 * - Educational content about film projection
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
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time in the video (seconds)'),
    endAt: z.number().optional().describe('End time in the video (seconds)'),
    playbackRate: z.number().optional().default(1).describe('Playback speed multiplier'),
    volume: z.number().optional().default(1).describe('Volume level (0-1)'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time in the video (seconds)'),
    endAt: z.number().optional().describe('End time in the video (seconds)'),
    playbackRate: z.number().optional().default(1).describe('Playback speed multiplier'),
    volume: z.number().optional().default(1).describe('Volume level (0-1)'),
  }).describe('Incoming video configuration'),
  
  outgoingVideoDuration: z.number().describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z.number().describe('Duration of the incoming video in seconds'),
  
  transitionDuration: z.number().default(3).describe('Duration of the transition effect (seconds)'),
  deadAirDuration: z.number().default(0.5).describe('Duration of the black screen gap (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    deadAirDuration,
  } = params;

  // Calculate total composition duration
  const totalDuration =
    outgoingVideoDuration + transitionDuration + deadAirDuration + transitionDuration + incomingVideoDuration;

  // Timing calculations
  const outgoingVideoEnd = outgoingVideoDuration;
  const countdownOutgoingStart = outgoingVideoEnd - transitionDuration;
  const cueMarkFirst = outgoingVideoEnd - 8; // 8 seconds before end
  const cueMarkSecond = outgoingVideoEnd - 1; // 1 second before end
  const deadAirStart = outgoingVideoEnd + transitionDuration;
  const countdownIncomingStart = deadAirStart + deadAirDuration;
  const incomingVideoStart = countdownIncomingStart + transitionDuration;

  const childrenData: RenderableComponentData[] = [];

  // 1. Outgoing video container
  childrenData.push({
    id: 'outgoing-reel-container',
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
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom || 0,
          endAt: outgoingVideo.endAt,
          playbackRate: outgoingVideo.playbackRate || 1,
          volume: outgoingVideo.volume || 1,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // 2. Countdown outgoing (3-2-1)
  childrenData.push({
    id: 'countdown-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: countdownOutgoingStart,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'countdown-3',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: '3',
          font: {
            family: 'Courier Prime',
            weights: ['700'],
          },
          style: {
            fontSize: '200px',
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 1,
          },
        },
      } as RenderableComponentData,
      {
        id: 'countdown-2',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: '2',
          font: {
            family: 'Courier Prime',
            weights: ['700'],
          },
          style: {
            fontSize: '200px',
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
        },
        context: {
          timing: {
            start: 1,
            duration: 1,
          },
        },
      } as RenderableComponentData,
      {
        id: 'countdown-1',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: '1',
          font: {
            family: 'Courier Prime',
            weights: ['700'],
          },
          style: {
            fontSize: '200px',
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
        },
        context: {
          timing: {
            start: 2,
            duration: 1,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // 3. Cue marks (cigarette burns)
  if (cueMarkFirst >= 0) {
    childrenData.push({
      id: 'cue-mark-first',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 10px; height: 10px; border-radius: 50%; background: white; box-shadow: 0 0 10px rgba(255,255,255,0.8);'></div>",
        className: 'absolute top-4 right-4',
        style: {
          zIndex: 110,
        },
      },
      context: {
        timing: {
          start: cueMarkFirst,
          duration: 0.5,
        },
      },
    } as RenderableComponentData);
  }

  if (cueMarkSecond >= 0) {
    childrenData.push({
      id: 'cue-mark-second',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 10px; height: 10px; border-radius: 50%; background: white; box-shadow: 0 0 10px rgba(255,255,255,0.8);'></div>",
        className: 'absolute top-4 right-4',
        style: {
          zIndex: 110,
        },
      },
      context: {
        timing: {
          start: cueMarkSecond,
          duration: 0.5,
        },
      },
    } as RenderableComponentData);
  }

  // 4. Dead air gap (black screen)
  childrenData.push({
    id: 'dead-air-gap',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
        style: {
          zIndex: 50,
        },
      },
    },
    context: {
      timing: {
        start: deadAirStart,
        duration: deadAirDuration,
      },
    },
    childrenData: [],
  } as RenderableComponentData);

  // 5. Countdown incoming (1-2-3)
  childrenData.push({
    id: 'countdown-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: countdownIncomingStart,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'countdown-in-1',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: '1',
          font: {
            family: 'Courier Prime',
            weights: ['700'],
          },
          style: {
            fontSize: '200px',
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 1,
          },
        },
      } as RenderableComponentData,
      {
        id: 'countdown-in-2',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: '2',
          font: {
            family: 'Courier Prime',
            weights: ['700'],
          },
          style: {
            fontSize: '200px',
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
        },
        context: {
          timing: {
            start: 1,
            duration: 1,
          },
        },
      } as RenderableComponentData,
      {
        id: 'countdown-in-3',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: '3',
          font: {
            family: 'Courier Prime',
            weights: ['700'],
          },
          style: {
            fontSize: '200px',
            fontWeight: '700',
            color: '#ffffff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
        },
        context: {
          timing: {
            start: 2,
            duration: 1,
          },
        },
      } as RenderableComponentData,
      {
        id: 'registration-cross',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<svg width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='none' stroke='white' stroke-width='2'/><line x1='50' y1='10' x2='50' y2='90' stroke='white' stroke-width='2'/><line x1='10' y1='50' x2='90' y2='50' stroke='white' stroke-width='2'/></svg>",
          className: 'absolute',
          style: {
            top: '25%',
            left: '25%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // 6. Incoming video container
  childrenData.push({
    id: 'incoming-reel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: incomingVideoDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom || 0,
          endAt: incomingVideo.endAt,
          playbackRate: incomingVideo.playbackRate || 1,
          volume: incomingVideo.volume || 1,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // 7. Film perforation overlay - left
  childrenData.push({
    id: 'perforation-overlay-left',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 20px; height: 100%; background: repeating-linear-gradient(transparent, transparent 10px, rgba(0,0,0,0.9) 10px, rgba(0,0,0,0.9) 15px); border-right: 2px solid rgba(0,0,0,0.5);'></div>",
      className: 'absolute left-0 top-0',
      style: {
        zIndex: 120,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // 8. Film perforation overlay - right
  childrenData.push({
    id: 'perforation-overlay-right',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 20px; height: 100%; background: repeating-linear-gradient(transparent, transparent 10px, rgba(0,0,0,0.9) 10px, rgba(0,0,0,0.9) 15px); border-left: 2px solid rgba(0,0,0,0.5);'></div>",
      className: 'absolute right-0 top-0',
      style: {
        zIndex: 120,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // 9. Film grain overlay
  childrenData.push({
    id: 'film-grain-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; opacity: 0.08; mix-blend-mode: overlay; pointer-events: none; background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=); background-size: 150px 150px;'></div>",
      className: 'absolute inset-0',
      style: {
        zIndex: 130,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // 10. Vignette overlay
  childrenData.push({
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 0%, transparent 50%, rgba(0,0,0,0.6) 100%); pointer-events: none;'></div>",
      className: 'absolute inset-0',
      style: {
        zIndex: 125,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'film-reel-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
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
  id: 'film-reel-transition',
  title: 'Film Reel Change Transition',
  description:
    'Recreates the authentic experience of switching between two film reels in a vintage cinema projection booth. Features countdown leaders with registration marks, cigarette burns (cue marks), perforations, dead air gap, and period-authentic SMPTE leader graphics. Includes film grain, flicker, and vignette effects for vintage cinema authenticity.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'film', 'vintage', 'cinema', 'reel', 'projector', 'smpte'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
      playbackRate: 1,
      volume: 1,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
      playbackRate: 1,
      volume: 1,
    },
    outgoingVideoDuration: 10,
    incomingVideoDuration: 10,
    transitionDuration: 3,
    deadAirDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const filmReelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
