/**
 * Glitchy Negative Color Slide Transition Preset
 *
 * A CRT-style glitch transition where videos slide horizontally while vertical bands
 * of color inversion sweep across them in a rolling wave pattern. The outgoing video
 * slides left with scanning bands inverting colors like a malfunctioning monitor,
 * while the incoming video slides in from the right with inverse bands that normalize
 * as it reaches center.
 *
 * Features:
 * - Horizontal slide transition (outgoing left, incoming right)
 * - Vertical scanning bands of color inversion (5 bands covering 0-20%, 20-40%, etc.)
 * - Rolling wave effect with staggered timing (50ms offsets between bands)
 * - 1.2-second overlap period where both videos are visible
 * - Solarization effect using hue-rotate during peak inversion
 * - CRT monitor malfunction aesthetic
 *
 * Use cases:
 * - Tech/glitch aesthetic video transitions
 * - Retro/analog horror effects
 * - Music videos with digital distortion
 * - Creative storytelling with visual artifacts
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
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time in seconds for outgoing video'),
    endAt: z.number().optional().describe('End time in seconds for outgoing video'),
  }).describe('Configuration for the outgoing video'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds for incoming video'),
    endAt: z.number().optional().describe('End time in seconds for incoming video'),
  }).describe('Configuration for the incoming video'),
  
  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the overlap transition period in seconds'),
  
  bandCount: z
    .number()
    .default(5)
    .describe('Number of vertical inversion bands'),
  
  bandStagger: z
    .number()
    .default(0.05)
    .describe('Time offset between band animations in seconds (default 50ms)'),
  
  solarizationIntensity: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .describe('Hue rotation amount for solarization effect in degrees'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    bandCount,
    bandStagger,
    solarizationIntensity,
  } = params;

  // Helper to get video duration (simplified - in real implementation would fetch actual duration)
  const getVideoDuration = (video: typeof outgoingVideo): number => {
    if (video.endAt && video.startFrom) {
      return video.endAt - video.startFrom;
    }
    // Default fallback duration
    return 5;
  };

  const outgoingDuration = getVideoDuration(outgoingVideo);
  const incomingDuration = getVideoDuration(incomingVideo);

  // Calculate timing
  const overlapStart = outgoingDuration - overlapDuration;
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Create vertical band clip paths
  const createBandClipPath = (index: number): string => {
    const bandWidth = 100 / bandCount;
    const startPercent = index * bandWidth;
    const endPercent = (index + 1) * bandWidth;
    return `polygon(${startPercent}% 0%, ${endPercent}% 0%, ${endPercent}% 100%, ${startPercent}% 100%)`;
  };

  // Create outgoing video bands (invert during transition)
  const outgoingBands: RenderableComponentData[] = [];
  for (let i = 0; i < bandCount; i++) {
    const bandDelay = i * bandStagger;
    
    outgoingBands.push({
      id: `outgoing-band-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 pointer-events-none mix-blend-difference',
        style: {
          clipPath: createBandClipPath(i),
          backgroundColor: '#ffffff',
        },
      },
      context: {
        timing: {
          start: overlapStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `outgoing-band-${i}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: bandDelay,
            duration: overlapDuration - bandDelay,
            mode: 'provider',
            targetIds: [`outgoing-band-${i}`],
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
  }

  // Create incoming video bands (start inverted, normalize)
  const incomingBands: RenderableComponentData[] = [];
  for (let i = 0; i < bandCount; i++) {
    const bandDelay = i * bandStagger;
    
    incomingBands.push({
      id: `incoming-band-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 pointer-events-none mix-blend-difference',
        style: {
          clipPath: createBandClipPath(i),
          backgroundColor: '#ffffff',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `incoming-band-${i}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: bandDelay,
            duration: overlapDuration - bandDelay,
            mode: 'provider',
            targetIds: [`incoming-band-${i}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Outgoing video wrapper
  const outgoingVideoWrapper: RenderableComponentData = {
    id: 'outgoing-video-wrapper',
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
        duration: outgoingDuration,
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
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-video-slide',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: overlapStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'translateX', val: '0%', prog: 0 },
                { key: 'translateX', val: '-100%', prog: 1 },
              ],
            },
          },
          {
            id: 'outgoing-video-hue',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: overlapStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter', val: `hue-rotate(0deg)`, prog: 0 },
                { key: 'filter', val: `hue-rotate(${solarizationIntensity}deg)`, prog: 0.5 },
                { key: 'filter', val: `hue-rotate(0deg)`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      ...outgoingBands,
    ],
  };

  // Incoming video wrapper
  const incomingVideoWrapper: RenderableComponentData = {
    id: 'incoming-video-wrapper',
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
        start: overlapStart,
        duration: incomingDuration,
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
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
        effects: [
          {
            id: 'incoming-video-slide',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'translateX', val: '100%', prog: 0 },
                { key: 'translateX', val: '0%', prog: 1 },
              ],
            },
          },
          {
            id: 'incoming-video-hue',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'filter', val: `hue-rotate(${solarizationIntensity}deg)`, prog: 0 },
                { key: 'filter', val: `hue-rotate(0deg)`, prog: 0.5 },
                { key: 'filter', val: `hue-rotate(0deg)`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      ...incomingBands,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitchy-negative-slide-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
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
    childrenData: [outgoingVideoWrapper, incomingVideoWrapper],
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
  id: 'glitchy-negative-slide-transition',
  title: 'Glitchy Negative Color Slide Transition',
  description:
    'A CRT-style glitch transition where videos slide horizontally while vertical bands of color inversion sweep across them in a rolling wave pattern, creating a retro monitor malfunction aesthetic',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'negative',
    'color-inversion',
    'slide',
    'crt',
    'retro',
    'scanning',
    'video',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      endAt: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      endAt: 5,
    },
    overlapDuration: 1.2,
    bandCount: 5,
    bandStagger: 0.05,
    solarizationIntensity: 180,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchyNegativeSlideTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
