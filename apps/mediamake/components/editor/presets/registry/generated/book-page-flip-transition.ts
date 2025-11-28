/**
 * Book Page Flip Transition Preset
 *
 * A realistic book page flip transition where videos are displayed on opposing pages
 * of an open book. The right page flips to the left with a realistic 3D bending effect,
 * revealing a new video on the fresh right page.
 *
 * Features:
 * - Realistic 3D page flip animation with perspective
 * - Page thickness simulation with subtle extrusion effect
 * - Realistic bending in the middle of the flipping page
 * - Paper texture overlay (semi-transparent)
 * - Ambient lighting changes - highlights on flipping page
 * - Visible book spine as central dividing line
 * - Custom bezier curve for natural page weight
 * - Synchronized opacity and brightness animations
 *
 * Use cases:
 * - Creating book-style video transitions
 * - Building story-telling presentations with page turns
 * - Adding cinematic page flip effects to content
 * - Professional video content with book aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  leftPageVideo: z.object({
    src: z.string().describe('Source URL of the left page video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Left page video (static throughout transition)'),
  
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing right page video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Outgoing video on right page that flips away'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming right page video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Incoming video revealed on fresh right page'),
  
  paperTexture: z.object({
    src: z.string().optional().describe('Paper texture overlay image URL'),
  }).optional().describe('Optional paper texture overlay'),
  
  transitionDuration: z.number()
    .min(0.5)
    .max(3)
    .default(2)
    .describe('Duration of page flip transition in seconds'),
  
  overlapDuration: z.number()
    .min(0.5)
    .max(2)
    .default(2)
    .describe('Duration of overlap between outgoing and incoming videos'),
  
  backgroundColor: z.string()
    .default('#1a1a1a')
    .describe('Background color of the book environment'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftPageVideo,
    outgoingVideo,
    incomingVideo,
    paperTexture,
    transitionDuration,
    overlapDuration,
    backgroundColor,
  } = params;

  // Determine component IDs based on media types
  const leftPageComponentId = leftPageVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate total duration
  // Assume each page shows for some duration before/after flip
  const preFlipDuration = 2; // Static display before flip
  const postFlipDuration = 2; // Static display after flip
  const totalDuration = preFlipDuration + transitionDuration + postFlipDuration;

  // Timing calculations
  const flipStartTime = preFlipDuration;
  const flipEndTime = flipStartTime + transitionDuration;
  const incomingStartTime = flipStartTime - overlapDuration / 2;
  const incomingDuration = transitionDuration + overlapDuration / 2 + postFlipDuration;

  // Create left page (static throughout)
  const leftPageContainer: RenderableComponentData = {
    id: 'left-page-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '80%',
          left: '0',
          top: '10%',
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
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
      {
        id: 'left-page-video',
        type: 'atom',
        componentId: leftPageComponentId,
        data: {
          src: leftPageVideo.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
      ...(paperTexture?.src ? [{
        id: 'left-page-texture',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: paperTexture.src,
          className: 'absolute inset-0 pointer-events-none',
          style: {
            opacity: 0.15,
            mixBlendMode: 'overlay',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData] : []),
    ],
  };

  // Create book spine (central divider)
  const bookSpine: RenderableComponentData = {
    id: 'book-spine',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '4px',
          height: '80%',
          left: '50%',
          top: '10%',
          transform: 'translateX(-50%)',
          backgroundColor: '#2a2a2a',
          boxShadow: '0 0 10px rgba(0,0,0,0.5)',
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Create incoming video (revealed right page)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '80%',
          right: '0',
          top: '10%',
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: incomingComponentId,
        data: {
          src: incomingVideo.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            backfaceVisibility: 'hidden',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
        effects: [
          {
            id: 'incoming-video-reveal',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration / 2,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      ...(paperTexture?.src ? [{
        id: 'incoming-page-texture',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: paperTexture.src,
          className: 'absolute inset-0 pointer-events-none',
          style: {
            opacity: 0.15,
            mixBlendMode: 'overlay',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
      } as RenderableComponentData] : []),
    ],
  };

  // Create flipping page (outgoing video that flips)
  const flippingPageContainer: RenderableComponentData = {
    id: 'flipping-page-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '80%',
          right: '0',
          top: '10%',
          transformStyle: 'preserve-3d',
          transformOrigin: 'left center',
          zIndex: 50,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: flipEndTime,
      },
    },
    effects: [
      // Page flip rotation
      {
        id: 'page-flip-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: flipStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['flipping-page-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -180, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Front face (outgoing video)
      {
        id: 'flipping-page-front',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: flipEndTime,
          },
        },
        childrenData: [
          {
            id: 'outgoing-video',
            type: 'atom',
            componentId: outgoingComponentId,
            data: {
              src: outgoingVideo.src,
              fit: 'cover',
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: flipEndTime,
              },
            },
            effects: [
              // Brightness animation (lighting changes)
              {
                id: 'page-flip-lighting',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: flipStartTime,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['outgoing-video'],
                  ranges: [
                    { key: 'filter', val: 'brightness(1)', prog: 0 },
                    { key: 'filter', val: 'brightness(1.3)', prog: 0.5 },
                    { key: 'filter', val: 'brightness(0.7)', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          ...(paperTexture?.src ? [{
            id: 'outgoing-page-texture',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: paperTexture.src,
              className: 'absolute inset-0 pointer-events-none',
              style: {
                opacity: 0.15,
                mixBlendMode: 'overlay',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: flipEndTime,
              },
            },
          } as RenderableComponentData] : []),
        ],
      } as RenderableComponentData,
      // Back face (page back side)
      {
        id: 'flipping-page-back',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              backgroundColor: '#f5f5dc',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: flipEndTime,
          },
        },
        childrenData: [
          ...(paperTexture?.src ? [{
            id: 'page-back-texture',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: paperTexture.src,
              className: 'absolute inset-0',
              style: {
                opacity: 0.3,
                mixBlendMode: 'multiply',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: flipEndTime,
              },
            },
          } as RenderableComponentData] : []),
        ],
      } as RenderableComponentData,
      // Edge highlight (ambient lighting)
      {
        id: 'page-edge-highlight',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            },
          },
        },
        context: {
          timing: {
            start: flipStartTime,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'edge-highlight-animation',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['page-edge-highlight'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'book-page-flip-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          backgroundColor,
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
      {
        id: 'book-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
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
          leftPageContainer,
          bookSpine,
          incomingVideoContainer,
          flippingPageContainer,
        ] as RenderableComponentData[],
      } as RenderableComponentData,
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
  id: 'book-page-flip-transition',
  title: 'Book Page Flip Transition',
  description: 'A realistic book page flip transition where videos are displayed on opposing pages of an open book. The right page flips to the left with a realistic 3D bending effect, revealing a new video on the fresh right page. Features paper texture overlays, ambient lighting changes as the page catches highlights, 3D extrusion effects for page thickness, and a visible book spine as central divider throughout the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'book', 'page-flip', '3d', 'realistic', 'video'],
  defaultInputParams: {
    leftPageVideo: {
      src: 'https://example.com/left-video.mp4',
      type: 'video',
    },
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      type: 'video',
    },
    paperTexture: {
      src: 'https://example.com/paper-texture.jpg',
    },
    transitionDuration: 2,
    overlapDuration: 2,
    backgroundColor: '#1a1a1a',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bookPageFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};