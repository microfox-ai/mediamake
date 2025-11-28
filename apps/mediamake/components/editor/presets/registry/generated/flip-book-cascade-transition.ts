/**
 * Flip Book Cascade Transition Preset
 *
 * Creates a realistic page-turning effect that transitions between two videos by simulating
 * a flip book animation. The outgoing video is divided into 10 sequential "pages" that flip
 * from right to left with 3D rotation effects, revealing the incoming video underneath.
 *
 * Features:
 * - **10 Page Frames**: Outgoing video split into 10 temporal segments, each showing a different moment
 * - **3D Page Flip**: Realistic rotateY transformation with page curl gradient overlays
 * - **Sequential Animation**: Pages flip one after another with configurable stagger delay
 * - **Depth & Shadow**: Drop-shadow filters create realistic depth perception
 * - **Rhythmic Pacing**: Brief pause between page flips for visual rhythm
 * - **Perspective Scene**: 3D perspective applied to entire container for realistic effect
 * - **Backface Hidden**: Smooth page flips with proper backface visibility handling
 *
 * Use Cases:
 * - Creative video transitions with storytelling element
 * - Documentary-style transitions showing timeline progression
 * - Educational content showing different time segments
 * - Artistic video presentations with unique visual style
 * - Memory/flashback sequences in narrative videos
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
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video (will be split into pages)'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video (revealed underneath)'),
  
  transitionDuration: z
    .number()
    .default(3)
    .describe('Total duration of the flip sequence in seconds (time subtracted from total duration)'),
  
  pageFlipDuration: z
    .number()
    .default(0.2)
    .describe('Duration of each individual page flip animation in seconds'),
  
  pageStaggerDelay: z
    .number()
    .default(0.15)
    .describe('Delay between consecutive page flips in seconds (creates rhythmic pacing)'),
  
  numberOfPages: z
    .number()
    .int()
    .min(5)
    .max(15)
    .default(10)
    .describe('Number of page frames to create from the outgoing video'),
  
  perspectiveDepth: z
    .number()
    .default(2000)
    .describe('Perspective depth in pixels for 3D effect (higher = less dramatic)'),
  
  curlIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Intensity of the page curl gradient effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Main execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    pageFlipDuration,
    pageStaggerDelay,
    numberOfPages,
    perspectiveDepth,
    curlIntensity,
  } = params;

  // Calculate total composition duration
  // Total = video1 + video2 - overlap for transition
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate when transition starts (relative to composition start)
  const transitionStartTime = video1.duration - transitionDuration;

  // Calculate video segment duration for each page
  const segmentDuration = video1.duration / numberOfPages;

  // Helper function to create page curl overlay gradient
  const createCurlOverlay = (pageIndex: number, pageId: string): RenderableComponentData => {
    const curlOpacity = curlIntensity;
    
    return {
      id: `${pageId}-curl`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `linear-gradient(90deg, rgba(0,0,0,${curlOpacity}) 0%, transparent 10%)`,
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: pageFlipDuration,
        },
      },
      effects: [
        {
          id: `${pageId}-curl-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: pageFlipDuration,
            mode: 'provider',
            targetIds: [`${pageId}-curl`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Helper function to create individual page frame
  const createPageFrame = (pageIndex: number): RenderableComponentData => {
    const pageId = `page-frame-${pageIndex}`;
    const videoId = `page-video-${pageIndex}`;
    
    // Calculate video segment timing
    const segmentStart = segmentDuration * pageIndex;
    const segmentEnd = Math.min(segmentStart + segmentDuration, video1.duration);
    
    // Calculate when this page starts flipping (relative to parent)
    const flipStartTime = transitionStartTime + (pageIndex * (pageFlipDuration + pageStaggerDelay));
    
    // Z-index management: higher index pages are on top initially
    const zIndex = 50 - pageIndex;
    
    return {
      id: pageId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
            filter: 'drop-shadow(5px 5px 15px rgba(0,0,0,0.3))',
            zIndex,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        // Video atom showing segment of video1
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            startFrom: segmentStart,
            endAt: segmentEnd,
            fit: 'cover',
            className: 'absolute inset-0 w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
        // Page curl overlay
        createCurlOverlay(pageIndex, pageId),
      ],
      effects: [
        // 3D flip effect
        {
          id: `${pageId}-flip-effect`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.645, 0.045, 0.355, 1)', // Realistic page physics easing
            start: flipStartTime,
            duration: pageFlipDuration,
            mode: 'provider',
            targetIds: [pageId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -180, prog: 1 },
            ],
          },
        },
        // Fade out during flip for smoothness
        {
          id: `${pageId}-fade-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: flipStartTime,
            duration: pageFlipDuration,
            mode: 'provider',
            targetIds: [pageId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.8 },
            ],
          },
        },
        // Z-index change after flip completes (move to back)
        {
          id: `${pageId}-zindex-effect`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flipStartTime + pageFlipDuration,
            duration: 0.01,
            mode: 'provider',
            targetIds: [pageId],
            ranges: [
              { key: 'zIndex', val: zIndex, prog: 0 },
              { key: 'zIndex', val: 10, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Create all page frames
  const pageFrames: RenderableComponentData[] = [];
  for (let i = 0; i < numberOfPages; i++) {
    pageFrames.push(createPageFrame(i));
  }

  // Build the composition structure
  const rootContainer: RenderableComponentData = {
    id: 'flip-book-cascade-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-300',
        style: {
          perspective: `${perspectiveDepth}px`,
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
      // Incoming video (base layer - always visible underneath)
      {
        id: 'incoming-video-base',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
        },
        context: {
          timing: {
            start: transitionStartTime,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      // All page frames (ordered back to front)
      ...pageFrames.reverse(), // Reverse so first page is on top
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'flip-book-cascade-transition',
  title: 'Flip Book Cascade Transition',
  description:
    'Creates a page-turning transition effect that mimics flipping through a book. The outgoing video is divided into sequential page frames that flip from right to left with 3D rotation, revealing the incoming video underneath. Features realistic page curl effects, drop shadows for depth, and rhythmic pacing between flips.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'flip-book',
    'page-turn',
    '3d-rotation',
    'cascade',
    'sequential',
    'creative',
    'storytelling',
    'video-transition',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 10,
    },
    transitionDuration: 3,
    pageFlipDuration: 0.2,
    pageStaggerDelay: 0.15,
    numberOfPages: 10,
    perspectiveDepth: 2000,
    curlIntensity: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const flipBookCascadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
