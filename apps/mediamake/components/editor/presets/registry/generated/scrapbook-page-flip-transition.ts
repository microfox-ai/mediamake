/**
 * Scrapbook Page Flip Transition Preset
 *
 * Creates a dynamic scrapbook page flip transition where videos appear to be taped onto
 * scrapbook pages that flip over with 3D perspective. Features decorative tape strips at
 * video corners that animate with the pages, and a subtle shake effect at the midpoint
 * to simulate paper settling.
 *
 * Features:
 * - 3D page turn animation using rotateY and perspective transforms
 * - Scale animation (0.8 to 1.0) during transition
 * - Decorative tape strips at all four corners of each video
 * - Shake effect at transition midpoint for paper settling
 * - Kraft paper textured background
 * - 2-second overlap period for smooth transition
 *
 * Technical Details:
 * - Uses perspective(1000px) for 3D depth
 * - Transform origin set appropriately for page flip effect
 * - Outgoing page rotates from 0 to -90deg (flips away)
 * - Incoming page rotates from 90deg to 0 (flips in)
 * - Tape strips positioned at top-left, top-right, bottom-left, bottom-right
 * - Shake effect triggers at 50% progress (1s into 2s transition)
 *
 * Use cases:
 * - Creating scrapbook-style video transitions
 * - Building nostalgic memory-based video sequences
 * - Adding tactile, paper-like feel to video content
 * - Creating dynamic video montages with personality
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
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video (outgoing page)'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming page)'),
  
  transitionDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the page flip transition overlap in seconds'),
  
  tapeStripSrc: z
    .string()
    .optional()
    .describe('Optional source URL for tape strip image (if not provided, uses CSS to create tape strips)'),
  
  kraftPaperTexture: z
    .string()
    .optional()
    .describe('Optional kraft paper texture image URL for background'),
  
  shakeIntensity: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .optional()
    .describe('Intensity of shake effect in pixels (1-20)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, tapeStripSrc, kraftPaperTexture, shakeIntensity } = params;

  // Calculate total duration (overlap reduces total time)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper function to create tape strip
  const createTapeStrip = (
    id: string,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  ): RenderableComponentData => {
    const positionClasses = {
      'top-left': 'absolute top-0 left-0',
      'top-right': 'absolute top-0 right-0',
      'bottom-left': 'absolute bottom-0 left-0',
      'bottom-right': 'absolute bottom-0 right-0',
    };

    const rotations = {
      'top-left': -15,
      'top-right': 15,
      'bottom-left': 15,
      'bottom-right': -15,
    };

    if (tapeStripSrc) {
      // Use provided tape strip image
      return {
        id,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: tapeStripSrc,
          className: `${positionClasses[position]} w-20 h-8`,
          style: {
            transform: `rotate(${rotations[position]}deg)`,
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData;
    } else {
      // Create tape strip using HTML/CSS
      return {
        id,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(240,240,220,0.7) 50%, rgba(255,255,255,0.6) 100%); border: 1px solid rgba(200,200,180,0.5); box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>',
          className: `${positionClasses[position]} w-20 h-8`,
          style: {
            transform: `rotate(${rotations[position]}deg)`,
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData;
    }
  };

  // Create shake effect at midpoint
  const createShakeEffect = (
    targetId: string,
    startTime: number,
  ): any => {
    const shakeDuration = 0.2;
    const intensity = shakeIntensity ?? 5;

    return {
      id: `shake-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: shakeDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: intensity, prog: 0 },
          { key: 'translateX', val: -intensity, prog: 0.2 },
          { key: 'translateX', val: intensity, prog: 0.4 },
          { key: 'translateX', val: -intensity, prog: 0.6 },
          { key: 'translateX', val: intensity, prog: 0.8 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: -intensity / 2, prog: 0 },
          { key: 'translateY', val: intensity / 2, prog: 0.2 },
          { key: 'translateY', val: -intensity / 2, prog: 0.4 },
          { key: 'translateY', val: intensity / 2, prog: 0.6 },
          { key: 'translateY', val: -intensity / 2, prog: 0.8 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Outgoing page container (video1)
  const outgoingPageContainer: RenderableComponentData = {
    id: 'scrapbook-outgoing-page',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          transformOrigin: 'left center',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Page flip out effect (scale down and rotate)
      {
        id: 'outgoing-page-flip',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scrapbook-outgoing-page'],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: 0.8, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -90, prog: 1 },
          ],
        },
      },
      // Shake at midpoint
      createShakeEffect('scrapbook-outgoing-page', video1.duration - transitionDuration + transitionDuration * 0.5),
    ],
    childrenData: [
      // Video 1
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
      // Tape strips for outgoing page
      createTapeStrip('tape-outgoing-top-left', 'top-left'),
      createTapeStrip('tape-outgoing-top-right', 'top-right'),
      createTapeStrip('tape-outgoing-bottom-left', 'bottom-left'),
      createTapeStrip('tape-outgoing-bottom-right', 'bottom-right'),
    ],
  };

  // Incoming page container (video2)
  const incomingPageContainer: RenderableComponentData = {
    id: 'scrapbook-incoming-page',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          transformOrigin: 'right center',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      // Page flip in effect (rotate and scale up)
      {
        id: 'incoming-page-flip',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scrapbook-incoming-page'],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
            { key: 'rotateY', val: 90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      // Shake at midpoint (relative to incoming page start)
      createShakeEffect('scrapbook-incoming-page', transitionDuration * 0.5),
    ],
    childrenData: [
      // Video 2
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Tape strips for incoming page
      createTapeStrip('tape-incoming-top-left', 'top-left'),
      createTapeStrip('tape-incoming-top-right', 'top-right'),
      createTapeStrip('tape-incoming-bottom-left', 'bottom-left'),
      createTapeStrip('tape-incoming-bottom-right', 'bottom-right'),
    ],
  };

  // Root container with kraft paper background
  const rootContainer: RenderableComponentData = {
    id: 'scrapbook-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#fef3c7',
          ...(kraftPaperTexture ? {
            backgroundImage: `url(${kraftPaperTexture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : {}),
          perspective: '1000px',
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
    childrenData: [outgoingPageContainer, incomingPageContainer],
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
  id: 'scrapbook-page-flip-transition',
  title: 'Scrapbook Page Flip Transition',
  description:
    'A dynamic scrapbook-style page flip transition where videos appear taped onto scrapbook pages. Features 3D page turn simulation using scale and rotateY transforms with perspective, decorative tape strips at video corners, paper settling shake effect at transition midpoint, and kraft paper textured background.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'scrapbook', '3d', 'page-flip', 'video', 'nostalgic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.0,
    shakeIntensity: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scrapbookPageFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
