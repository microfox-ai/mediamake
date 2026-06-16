/**
 * Streaming Platform Buffering Transition Preset
 *
 * This preset creates a realistic streaming platform buffering experience that mimics
 * adaptive bitrate streaming behavior. It simulates the quality degradation and improvement
 * that occurs during network buffering events.
 *
 * Features:
 * - **Outgoing Video Quality Degradation**: Progressive blur and pixelation effects
 * - **Modern Buffering Animation**: Three bouncing dots with "Loading HD" text
 * - **Incoming Video Quality Improvement**: Gradual sharpening from 360p → 720p → 1080p
 * - **Quality Indicator Badges**: Visual feedback showing resolution stepping up
 * - **Smooth Transitions**: 0.8s overlap period for seamless visual experience
 *
 * Use cases:
 * - Video streaming platform demos
 * - Educational content about video streaming
 * - Creative transitions that simulate buffering
 * - Tech product presentations
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the overlap/transition period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;

  // Calculate timing
  const outgoingDuration = outgoingVideo.duration;
  const incomingDuration = incomingVideo.duration;
  const totalDuration = outgoingDuration + incomingDuration;

  // Outgoing video timing (0 to outgoingDuration)
  const outgoingStart = 0;
  const degradationStart = outgoingDuration - 1.4; // Start degradation 1.4s before end
  const blurStart = degradationStart + 0.4; // Start blur at 0.8s before end
  const pixelationStart = blurStart + 0.4; // Start pixelation at 0.6s before end
  const freezeStart = pixelationStart + 0.4; // Freeze at 0.2s before end
  const fadeOutStart = outgoingDuration - 0.2; // Fade out in last 0.2s

  // Buffer animation timing (overlaps with end of outgoing and start of incoming)
  const bufferStart = outgoingDuration - overlapDuration;
  const bufferDuration = overlapDuration + 0.8; // Extend slightly into incoming

  // Incoming video timing (starts with overlap)
  const incomingStart = outgoingDuration - overlapDuration;
  const quality360pDuration = 0.6;
  const quality720pStart = quality360pDuration;
  const quality720pDuration = 0.7;
  const quality1080pStart = quality360pDuration + quality720pDuration;
  const quality1080pDuration = 0.7;

  // Create child components
  const childrenData: RenderableComponentData[] = [];

  // 1. Outgoing video with degradation effects
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
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
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Blur degradation effect (0 to 12px over 1s)
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: blurStart,
          duration: 1.0,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter:blur', val: 0, prog: 0 },
            { key: 'filter:blur', val: 12, prog: 1 },
          ],
        },
      },
      // Pixelation effect (imageRendering)
      {
        id: 'outgoing-pixelation-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: pixelationStart,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'imageRendering', val: 'auto', prog: 0 },
            { key: 'imageRendering', val: 'pixelated', prog: 1 },
          ],
        },
      },
      // Fade out effect
      {
        id: 'outgoing-fadeout-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: fadeOutStart,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['outgoing-video-wrapper'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(outgoingVideoNode);

  // 2. Buffer animation (3 bouncing dots + "Loading HD" text)
  const bufferContainerNode: RenderableComponentData = {
    id: 'buffer-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col items-center justify-center gap-4',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
    },
    context: {
      timing: {
        start: bufferStart,
        duration: bufferDuration,
      },
    },
    childrenData: [
      // "Loading HD" text
      {
        id: 'loading-text',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: 'Loading HD',
          className: 'text-white text-2xl font-semibold',
          style: {
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: bufferDuration,
          },
        },
      } as RenderableComponentData,
      // Dots wrapper
      {
        id: 'dots-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row gap-2 items-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: bufferDuration,
          },
        },
        childrenData: [
          // Dot 1
          {
            id: 'dot-1',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div class="w-3 h-3 rounded-full bg-white"></div>',
            },
            context: {
              timing: {
                start: 0,
                duration: bufferDuration,
              },
            },
            effects: [
              {
                id: 'dot-1-bounce',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: 0.6,
                  loop: true,
                  mode: 'provider',
                  targetIds: ['dot-1'],
                  ranges: [
                    { key: 'translateY', val: 0, prog: 0 },
                    { key: 'translateY', val: -12, prog: 0.5 },
                    { key: 'translateY', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // Dot 2
          {
            id: 'dot-2',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div class="w-3 h-3 rounded-full bg-white"></div>',
            },
            context: {
              timing: {
                start: 0,
                duration: bufferDuration,
              },
            },
            effects: [
              {
                id: 'dot-2-bounce',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0.2,
                  duration: 0.6,
                  loop: true,
                  mode: 'provider',
                  targetIds: ['dot-2'],
                  ranges: [
                    { key: 'translateY', val: 0, prog: 0 },
                    { key: 'translateY', val: -12, prog: 0.5 },
                    { key: 'translateY', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // Dot 3
          {
            id: 'dot-3',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div class="w-3 h-3 rounded-full bg-white"></div>',
            },
            context: {
              timing: {
                start: 0,
                duration: bufferDuration,
              },
            },
            effects: [
              {
                id: 'dot-3-bounce',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0.4,
                  duration: 0.6,
                  loop: true,
                  mode: 'provider',
                  targetIds: ['dot-3'],
                  ranges: [
                    { key: 'translateY', val: 0, prog: 0 },
                    { key: 'translateY', val: -12, prog: 0.5 },
                    { key: 'translateY', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
    effects: [
      // Buffer fade in
      {
        id: 'buffer-fadein',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['buffer-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Buffer fade out
      {
        id: 'buffer-fadeout',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: bufferDuration - 0.3,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['buffer-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(bufferContainerNode);

  // 3. Incoming video with quality improvement
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration + overlapDuration,
      },
    },
    childrenData: [
      // Incoming video
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + overlapDuration,
          },
        },
      } as RenderableComponentData,
      // Quality badges
      {
        id: 'quality-badge-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute top-4 right-4',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: quality360pDuration + quality720pDuration + quality1080pDuration,
          },
        },
        childrenData: [
          // 360p badge
          {
            id: 'badge-360p',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '360p',
              className: 'text-white font-bold text-sm px-2 py-1 rounded',
              style: {
                backgroundColor: 'rgba(255, 100, 100, 0.8)',
                backdropFilter: 'blur(4px)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: quality360pDuration,
              },
            },
            effects: [
              {
                id: 'badge-360p-fadein',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: 0.2,
                  mode: 'provider',
                  targetIds: ['badge-360p'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: 'badge-360p-fadeout',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: quality360pDuration - 0.2,
                  duration: 0.2,
                  mode: 'provider',
                  targetIds: ['badge-360p'],
                  ranges: [
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // 720p badge
          {
            id: 'badge-720p',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '720p',
              className: 'text-white font-bold text-sm px-2 py-1 rounded',
              style: {
                backgroundColor: 'rgba(255, 180, 100, 0.8)',
                backdropFilter: 'blur(4px)',
              },
            },
            context: {
              timing: {
                start: quality720pStart,
                duration: quality720pDuration,
              },
            },
            effects: [
              {
                id: 'badge-720p-fadein',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: 0.2,
                  mode: 'provider',
                  targetIds: ['badge-720p'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: 'badge-720p-fadeout',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: quality720pDuration - 0.2,
                  duration: 0.2,
                  mode: 'provider',
                  targetIds: ['badge-720p'],
                  ranges: [
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // 1080p badge
          {
            id: 'badge-1080p',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '1080p',
              className: 'text-white font-bold text-sm px-2 py-1 rounded',
              style: {
                backgroundColor: 'rgba(100, 200, 100, 0.8)',
                backdropFilter: 'blur(4px)',
              },
            },
            context: {
              timing: {
                start: quality1080pStart,
                duration: quality1080pDuration,
              },
            },
            effects: [
              {
                id: 'badge-1080p-fadein',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: 0.2,
                  mode: 'provider',
                  targetIds: ['badge-1080p'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
    effects: [
      // 360p quality (blurred 12px)
      {
        id: 'incoming-blur-360p',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: quality360pDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter:blur', val: 12, prog: 0 },
            { key: 'filter:blur', val: 12, prog: 1 },
          ],
        },
      },
      // 720p quality (blur from 12px to 6px)
      {
        id: 'incoming-blur-720p',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: quality720pStart,
          duration: quality720pDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter:blur', val: 12, prog: 0 },
            { key: 'filter:blur', val: 6, prog: 1 },
          ],
        },
      },
      // 1080p quality (blur from 6px to 0px)
      {
        id: 'incoming-blur-1080p',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: quality1080pStart,
          duration: quality1080pDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter:blur', val: 6, prog: 0 },
            { key: 'filter:blur', val: 0, prog: 1 },
          ],
        },
      },
      // Incoming fade in
      {
        id: 'incoming-fadein',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['incoming-video-wrapper'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(incomingVideoNode);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'streaming-buffer-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'streaming-buffer-transition',
  title: 'Streaming Platform Buffering Transition',
  description:
    'Advanced streaming platform transition that mimics adaptive bitrate behavior with quality degradation, buffering animation, and progressive quality improvement',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'streaming', 'buffering', 'adaptive-bitrate', 'quality-indicators'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const streamingBufferTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
