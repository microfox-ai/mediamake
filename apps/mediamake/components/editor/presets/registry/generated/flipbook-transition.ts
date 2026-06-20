/**
 * Flipbook Animation Transition Preset
 *
 * This preset creates a realistic flipbook-style transition between two videos where pages flip 
 * rapidly through a scrapbook. Features 8 intermediate page frames with motion blur effects, 
 * decreasing flip speed (fast to slow), 3D page thickness via translateZ offsets, animated 
 * corner curls, dynamic shadows, and a spiral binding spine element.
 *
 * Technical features:
 * - 3D perspective (1200px) on root container
 * - 8 intermediate pages that blend both videos using opacity transitions
 * - Pages animate with rotateY from -180deg through 0deg to 180deg sequentially
 * - Variable timing: first 3 pages 0.1s each, next 3 at 0.15s, last 2 at 0.2s
 * - translateZ offset for each page (index * 2px) for thickness illusion
 * - Animated corner curls that grow at mid-flip
 * - Dynamic shadows based on rotation angle
 * - Static spine element at left edge
 *
 * Use cases:
 * - Creating dynamic page-flip transitions between videos
 * - Building realistic scrapbook-style effects
 * - Adding physical depth to video transitions
 * - Professional flipbook animations for storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  startVideo: z.object({
    src: z.string().describe('Source URL of the starting video'),
    type: z.enum(['video', 'image']).describe('Media type of start video'),
  }).describe('Starting video configuration'),
  
  endVideo: z.object({
    src: z.string().describe('Source URL of the ending video'),
    type: z.enum(['video', 'image']).describe('Media type of end video'),
  }).describe('Ending video configuration'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.15)
    .describe('Total duration of the flipbook transition in seconds'),
  
  spineWidth: z
    .number()
    .min(20)
    .max(100)
    .default(60)
    .describe('Width of the spiral binding spine in pixels'),
  
  spineColor: z
    .string()
    .default('#2a2a2a')
    .describe('Background color of the spine element'),
  
  pageBlurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of blur applied to pages during flip (motion blur effect)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    startVideo,
    endVideo,
    transitionDuration,
    spineWidth,
    spineColor,
    pageBlurAmount,
  } = params;

  // Helper: Calculate page timings
  const calculatePageTimings = () => {
    const timings: Array<{ start: number; duration: number }> = [];
    let currentTime = 0;

    // Pages 0-2: 0.1s each
    for (let i = 0; i < 3; i++) {
      timings.push({ start: currentTime, duration: 0.1 });
      currentTime += 0.1;
    }

    // Pages 3-5: 0.15s each
    for (let i = 0; i < 3; i++) {
      timings.push({ start: currentTime, duration: 0.15 });
      currentTime += 0.15;
    }

    // Pages 6-7: 0.2s each
    for (let i = 0; i < 2; i++) {
      timings.push({ start: currentTime, duration: 0.2 });
      currentTime += 0.2;
    }

    return timings;
  };

  const pageTimings = calculatePageTimings();
  const numPages = 8;

  // Helper: Create corner curl element
  const createCornerCurl = (pageId: string, pageIndex: number) => {
    const curlId = `corner-curl-${pageIndex}`;
    
    return {
      id: curlId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          position: absolute;
          bottom: 0;
          right: 0;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%, rgba(200,200,200,0.5) 100%);
          clip-path: polygon(100% 0, 100% 100%, 0 100%);
          pointer-events: none;
        "></div>`,
        className: 'absolute bottom-0 right-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: pageTimings[pageIndex].duration,
        },
      },
      effects: [
        {
          id: `curl-scale-${pageIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: pageTimings[pageIndex].duration,
            mode: 'provider',
            targetIds: [curlId],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.5, prog: 0.5 },
              { key: 'scale', val: 0.5, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create shadow overlay
  const createShadowOverlay = (pageId: string, pageIndex: number) => {
    const shadowId = `shadow-overlay-${pageIndex}`;
    
    return {
      id: shadowId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: pageTimings[pageIndex].duration,
        },
      },
      effects: [
        {
          id: `shadow-${pageIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: pageTimings[pageIndex].duration,
            mode: 'provider',
            targetIds: [shadowId],
            ranges: [
              { key: 'boxShadow', val: '0px 0px 0px rgba(0,0,0,0)', prog: 0 },
              { key: 'boxShadow', val: '0px 10px 30px rgba(0,0,0,0.5)', prog: 0.5 },
              { key: 'boxShadow', val: '0px 0px 0px rgba(0,0,0,0)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create a flip page
  const createFlipPage = (pageIndex: number) => {
    const pageId = `flip-page-${pageIndex}`;
    const timing = pageTimings[pageIndex];
    
    // Calculate opacity blend ratios (start video fades out, end video fades in)
    const startOpacity = 1 - (pageIndex / (numPages - 1)); // 1.0 -> 0.0
    const endOpacity = pageIndex / (numPages - 1); // 0.0 -> 1.0
    
    // translateZ offset for depth
    const translateZ = pageIndex * 2;

    const startFrameId = `start-frame-${pageIndex}`;
    const endFrameId = `end-frame-${pageIndex}`;

    return {
      id: pageId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
            transform: `translateZ(${translateZ}px)`,
          },
        },
      },
      context: {
        timing: {
          start: timing.start,
          duration: timing.duration,
        },
      },
      effects: [
        // Rotation effect
        {
          id: `rotate-${pageIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: timing.duration,
            mode: 'provider',
            targetIds: [pageId],
            ranges: [
              { key: 'rotateY', val: -180, prog: 0 },
              { key: 'rotateY', val: 0, prog: 0.5 },
              { key: 'rotateY', val: 180, prog: 1 },
            ],
          },
        },
        // Blur effect (motion blur)
        {
          id: `blur-${pageIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: timing.duration,
            mode: 'provider',
            targetIds: [pageId],
            ranges: [
              { key: 'filter', val: `blur(0px)`, prog: 0 },
              { key: 'filter', val: `blur(${pageBlurAmount}px)`, prog: 0.5 },
              { key: 'filter', val: `blur(0px)`, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Blended video container
        {
          id: `video-blend-${pageIndex}`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                overflow: 'hidden',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: timing.duration,
            },
          },
          childrenData: [
            // Start video frame
            {
              id: startFrameId,
              type: 'atom' as const,
              componentId: startVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
              data: {
                src: startVideo.src,
                className: 'w-full h-full object-cover',
                fit: 'cover',
                style: {
                  position: 'absolute',
                  inset: 0,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: timing.duration,
                },
              },
              effects: [
                {
                  id: `start-opacity-${pageIndex}`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: 0,
                    duration: timing.duration,
                    mode: 'provider',
                    targetIds: [startFrameId],
                    ranges: [
                      { key: 'opacity', val: startOpacity, prog: 0 },
                      { key: 'opacity', val: startOpacity * 0.5, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
            // End video frame
            {
              id: endFrameId,
              type: 'atom' as const,
              componentId: endVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
              data: {
                src: endVideo.src,
                className: 'w-full h-full object-cover',
                fit: 'cover',
                style: {
                  position: 'absolute',
                  inset: 0,
                  mixBlendMode: 'normal',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: timing.duration,
                },
              },
              effects: [
                {
                  id: `end-opacity-${pageIndex}`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: 0,
                    duration: timing.duration,
                    mode: 'provider',
                    targetIds: [endFrameId],
                    ranges: [
                      { key: 'opacity', val: endOpacity * 0.5, prog: 0 },
                      { key: 'opacity', val: endOpacity, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
        // Corner curl
        createCornerCurl(pageId, pageIndex),
        // Shadow overlay
        createShadowOverlay(pageId, pageIndex),
      ],
    } as RenderableComponentData;
  };

  // Generate all 8 flip pages
  const flipPages: RenderableComponentData[] = [];
  for (let i = 0; i < numPages; i++) {
    flipPages.push(createFlipPage(i));
  }

  // Build the composition structure
  const childrenData: RenderableComponentData[] = [
    // Spine container
    {
      id: 'spine-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: 0,
            top: 0,
            bottom: 0,
            width: `${spineWidth}px`,
            zIndex: 100,
            backgroundColor: spineColor,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'spine-decoration',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="
              width: 100%;
              height: 100%;
              background: repeating-linear-gradient(
                to bottom,
                ${spineColor} 0px,
                ${spineColor} 30px,
                rgba(255,255,255,0.1) 30px,
                rgba(255,255,255,0.1) 35px
              );
              border-right: 2px solid rgba(0,0,0,0.3);
            "></div>`,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    // Book container with 3D perspective
    {
      id: 'book-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${spineWidth}px`,
            right: 0,
            top: 0,
            bottom: 0,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Start video page (initial state, behind flip pages)
        {
          id: 'start-video-page',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          childrenData: [
            {
              id: 'start-video',
              type: 'atom' as const,
              componentId: startVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
              data: {
                src: startVideo.src,
                className: 'w-full h-full object-cover',
                fit: 'cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
        // Flip pages container
        {
          id: 'flip-pages-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformStyle: 'preserve-3d',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          childrenData: flipPages,
        } as RenderableComponentData,
        // End video page (final state, visible after all flips)
        {
          id: 'end-video-page',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transformStyle: 'preserve-3d',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          childrenData: [
            {
              id: 'end-video',
              type: 'atom' as const,
              componentId: endVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
              data: {
                src: endVideo.src,
                className: 'w-full h-full object-cover',
                fit: 'cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'flipbook-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1200px',
          perspectiveOrigin: 'center center',
          backgroundColor: '#1a1a1a',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'flipbook-transition',
  title: 'Flipbook Animation Transition',
  description:
    'A realistic flipbook-style transition between two videos where pages flip rapidly through a scrapbook. Features 8 intermediate page frames with motion blur, decreasing flip speed (fast to slow), 3D page thickness via translateZ offsets, animated corner curls, dynamic shadows, and a spiral binding spine element. Uses perspective and rotateY animations for authentic page-turning effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'flipbook',
    'scrapbook',
    'pages',
    '3d',
    'animation',
    'video',
  ],
  defaultInputParams: {
    startVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    endVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 1.15,
    spineWidth: 60,
    spineColor: '#2a2a2a',
    pageBlurAmount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const flipbookTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
