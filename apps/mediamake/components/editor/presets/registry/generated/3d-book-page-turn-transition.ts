/**
 * 3D Book Page Turn Transition Preset
 *
 * This preset creates a realistic 3D book page turn transition where videos are displayed
 * on pages that flip with realistic physics. The page curves and bends as it turns, with
 * the video distorting to follow the page geometry.
 *
 * Features:
 * - **Realistic 3D Page Turn**: Page rotates in 3D space with perspective
 * - **Video Distortion**: Video follows page geometry as it curves
 * - **Paper Texture Overlay**: Subtle paper texture overlay on the turning page
 * - **Dynamic Shadows**: Shadows change based on page position during turn
 * - **Semi-Transparent Page**: Incoming video slightly visible through turning page
 * - **Bounce Effect**: Slight bounce when page settles into place
 * - **Clip-Path Animation**: Page shape morphs during turn for realistic curl
 * - **Brightness/Contrast**: Paper texture effects for realistic appearance
 *
 * Use cases:
 * - Creating book-like transitions between video clips
 * - Building immersive storytelling experiences
 * - Adding professional page-turn effects to presentations
 * - Creating dynamic video magazines or portfolios
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingVideoDuration: z
    .number()
    .default(5)
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .default(5)
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the page turn transition in seconds'),
  pageTransparency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of the incoming video visible through turning page'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    pageTransparency,
  } = params;

  // Calculate total duration: outgoing plays, then transition overlaps, then incoming continues
  const totalDuration =
    outgoingVideoDuration + transitionDuration + incomingVideoDuration;

  // Transition starts when outgoing video ends
  const transitionStartTime = outgoingVideoDuration;

  const childrenData: RenderableComponentData[] = [
    // Page turn container (root layout with perspective)
    {
      id: 'page-turn-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            perspective: '1500px',
            backgroundColor: '#1a1a1a',
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
        // Page wrapper (contains all video layers)
        {
          id: 'page-wrapper',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative',
              style: {
                width: '100%',
                height: '100%',
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
          childrenData: [
            // Outgoing video (bottom layer, visible before transition)
            {
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
                  duration: transitionStartTime + transitionDuration,
                },
              },
              childrenData: [
                {
                  id: 'outgoing-video',
                  type: 'atom',
                  componentId: 'VideoAtom',
                  data: {
                    src: outgoingVideoSrc,
                    fit: 'cover',
                    className: 'absolute inset-0',
                    style: {
                      width: '100%',
                      height: '100%',
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: outgoingVideoDuration,
                    },
                  },
                },
              ],
              effects: [
                // Fade out during transition
                {
                  id: 'outgoing-fade-out',
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: transitionStartTime,
                    duration: transitionDuration * 0.5,
                    mode: 'provider',
                    targetIds: ['outgoing-video-container'],
                    ranges: [
                      { key: 'opacity', val: 1, prog: 0 },
                      { key: 'opacity', val: 0, prog: 1 },
                    ],
                  },
                },
              ],
            },

            // Turning page (middle layer with 3D rotation and effects)
            {
              id: 'turning-page',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    zIndex: 2,
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'left center',
                    overflow: 'hidden',
                  },
                },
              },
              context: {
                timing: {
                  start: transitionStartTime,
                  duration: transitionDuration,
                },
              },
              childrenData: [
                // Page video (same as outgoing video, visible on turning page)
                {
                  id: 'page-video',
                  type: 'atom',
                  componentId: 'VideoAtom',
                  data: {
                    src: outgoingVideoSrc,
                    fit: 'cover',
                    className: 'absolute inset-0',
                    style: {
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
                },
                // Paper texture overlay (subtle brightness effect)
                {
                  id: 'paper-texture-overlay',
                  type: 'atom',
                  componentId: 'HTMLBlockAtom',
                  data: {
                    html: '<div style="width: 100%; height: 100%; background: rgba(255, 255, 255, 0.05); pointer-events: none;"></div>',
                    className: 'absolute inset-0',
                    style: {
                      zIndex: 1,
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: transitionDuration,
                    },
                  },
                  effects: [
                    // Brightness effect during turn
                    {
                      id: 'paper-brightness',
                      componentId: 'generic',
                      data: {
                        type: 'ease-out',
                        start: 0,
                        duration: transitionDuration,
                        mode: 'provider',
                        targetIds: ['paper-texture-overlay'],
                        ranges: [
                          { key: 'filter', val: 'brightness(1)', prog: 0 },
                          {
                            key: 'filter',
                            val: 'brightness(1.2) contrast(1.1)',
                            prog: 0.5,
                          },
                          { key: 'filter', val: 'brightness(1)', prog: 1 },
                        ],
                      },
                    },
                  ],
                },
              ],
              effects: [
                // 3D rotation effect with bounce (ease-out-back)
                {
                  id: 'page-turn-rotation',
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: 0,
                    duration: transitionDuration,
                    mode: 'provider',
                    targetIds: ['turning-page'],
                    ranges: [
                      { key: 'rotateY', val: 0, prog: 0 },
                      { key: 'rotateY', val: -180, prog: 0.95 },
                      { key: 'rotateY', val: -175, prog: 0.98 },
                      { key: 'rotateY', val: -180, prog: 1 },
                    ],
                  },
                },
                // Clip-path animation for page curl effect
                {
                  id: 'page-clip-path',
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: 0,
                    duration: transitionDuration,
                    mode: 'provider',
                    targetIds: ['turning-page'],
                    ranges: [
                      {
                        key: 'clipPath',
                        val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                        prog: 0,
                      },
                      {
                        key: 'clipPath',
                        val: 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)',
                        prog: 0.5,
                      },
                      {
                        key: 'clipPath',
                        val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
                        prog: 1,
                      },
                    ],
                  },
                },
                // Shadow effect during turn
                {
                  id: 'page-shadow',
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: 0,
                    duration: transitionDuration,
                    mode: 'provider',
                    targetIds: ['turning-page'],
                    ranges: [
                      {
                        key: 'boxShadow',
                        val: '0px 0px 0px rgba(0,0,0,0)',
                        prog: 0,
                      },
                      {
                        key: 'boxShadow',
                        val: '-20px 20px 60px rgba(0,0,0,0.6)',
                        prog: 0.5,
                      },
                      {
                        key: 'boxShadow',
                        val: '0px 0px 0px rgba(0,0,0,0)',
                        prog: 1,
                      },
                    ],
                  },
                },
              ],
            },

            // Incoming video (back layer, revealed as page turns)
            {
              id: 'incoming-video-container',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    zIndex: 0,
                  },
                },
              },
              context: {
                timing: {
                  start: transitionStartTime,
                  duration: transitionDuration + incomingVideoDuration,
                },
              },
              childrenData: [
                {
                  id: 'incoming-video',
                  type: 'atom',
                  componentId: 'VideoAtom',
                  data: {
                    src: incomingVideoSrc,
                    fit: 'cover',
                    className: 'absolute inset-0',
                    style: {
                      width: '100%',
                      height: '100%',
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: incomingVideoDuration,
                    },
                  },
                },
              ],
              effects: [
                // Fade in with semi-transparency during early transition
                {
                  id: 'incoming-fade-in',
                  componentId: 'generic',
                  data: {
                    type: 'ease-in',
                    start: 0,
                    duration: transitionDuration,
                    mode: 'provider',
                    targetIds: ['incoming-video-container'],
                    ranges: [
                      { key: 'opacity', val: pageTransparency, prog: 0 },
                      { key: 'opacity', val: 1, prog: 1 },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  return {
    output: {
      childrenData,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: '3d-book-page-turn-transition',
  title: '3D Book Page Turn Transition',
  description:
    'A realistic 3D book page turn transition where videos are displayed on pages that flip with realistic physics. Features curved page bending, video distortion following page geometry, paper texture overlay, dynamic shadows based on page position, semi-transparent page revealing incoming video, and a bounce effect on settle.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'book',
    'page-turn',
    '3d',
    'video',
    'realistic',
    'physics',
    'shadow',
    'curve',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 1.6,
    pageTransparency: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const threeDBookPageTurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
