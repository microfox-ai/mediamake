/**
 * Page Turn Transition Preset
 *
 * This preset creates a minimalist page turn transition effect where videos flip like book pages.
 * The outgoing video rotates around the Y-axis (0° to ±180°) with 3D perspective, revealing the
 * incoming video underneath. A subtle gradient shadow moves across the page during the flip.
 *
 * Features:
 * - **3D Page Flip**: Outgoing video rotates with preserve-3d and backface-visibility hidden
 * - **Alternating Turns**: Left/right page turns alternate for multiple clips
 * - **Gradient Shadow**: Animated shadow overlay during flip for depth
 * - **Smooth Timing**: 0.9s transitions with cubic-bezier easing
 * - **Clean Effect**: Minimal distortion with proper perspective
 *
 * Use cases:
 * - Creating book-like video transitions
 * - Building narrative sequences with page-turn storytelling
 * - Adding elegant transitions to photo/video slideshows
 * - Professional presentation videos with clean transitions
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
  clips: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        duration: z.number().describe('Clip duration in seconds'),
      })
    )
    .min(2)
    .describe('Array of video clips to transition between'),
  transitionDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.9)
    .describe('Duration of page turn transition in seconds'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('3D perspective depth in pixels'),
  shadowOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Maximum opacity of gradient shadow during flip'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { clips, transitionDuration, perspective, shadowOpacity } = params;

  // Calculate total duration: sum of clip durations
  // Clips overlap during transitions, so we subtract overlap time
  const totalDuration =
    clips.reduce((sum, clip) => sum + clip.duration, 0) -
    transitionDuration * (clips.length - 1);

  // Build clip pairs with page turn effects
  const clipPairs: RenderableComponentData[] = [];
  let currentTime = 0;

  clips.forEach((clip, index) => {
    const isLastClip = index === clips.length - 1;
    const isEvenIndex = index % 2 === 0;

    // Determine transform origin and rotation direction
    // Even indices: left origin, rotate to -180deg
    // Odd indices: right origin, rotate to 180deg
    const transformOrigin = isEvenIndex ? 'left center' : 'right center';
    const startRotation = 0;
    const endRotation = isEvenIndex ? -180 : 180;

    // Gradient direction matches page turn
    // Left turn: gradient from left to right
    // Right turn: gradient from right to left
    const gradientDirection = isEvenIndex
      ? 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)'
      : 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)';

    const clipId = `clip-${index}`;
    const outgoingVideoId = `outgoing-video-${index}`;
    const incomingVideoId = `incoming-video-${index}`;
    const shadowOverlayId = `shadow-overlay-${index}`;

    // Clip pair container
    const clipPair: RenderableComponentData = {
      id: clipId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: currentTime,
          duration: clip.duration,
        },
      },
      childrenData: [],
    };

    // If not the last clip, we have an incoming video
    if (!isLastClip) {
      const nextClip = clips[index + 1];

      // Incoming video (revealed as outgoing flips away)
      const incomingVideo: RenderableComponentData = {
        id: incomingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: nextClip.src,
          className: 'absolute inset-0 z-0 w-full h-full object-cover',
          fit: 'cover',
          muted: false,
        },
        context: {
          timing: {
            start: clip.duration - transitionDuration,
            duration: transitionDuration,
          },
        },
      };

      clipPair.childrenData!.push(incomingVideo);
    }

    // Outgoing video (flips away)
    const outgoingVideo: RenderableComponentData = {
      id: outgoingVideoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: clip.src,
        className: 'absolute inset-0 z-10 w-full h-full object-cover',
        fit: 'cover',
        muted: false,
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          transformOrigin,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: clip.duration,
        },
      },
      effects: [],
    };

    // Add page turn rotation effect (only if not last clip)
    if (!isLastClip) {
      outgoingVideo.effects!.push({
        id: `page-turn-${index}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: clip.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            { key: 'rotateY', val: startRotation, prog: 0 },
            { key: 'rotateY', val: endRotation, prog: 1 },
          ],
        },
      });
    }

    clipPair.childrenData!.push(outgoingVideo);

    // Shadow overlay (animated during transition)
    if (!isLastClip) {
      const shadowOverlay: RenderableComponentData = {
        id: shadowOverlayId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 z-20 pointer-events-none',
          style: {
            background: gradientDirection,
          },
        },
        context: {
          timing: {
            start: clip.duration - transitionDuration,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `shadow-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [shadowOverlayId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: shadowOpacity, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      clipPair.childrenData!.push(shadowOverlay);
    }

    clipPairs.push(clipPair);

    // Update current time for next clip
    // Each clip starts where the previous one would end, minus the transition overlap
    currentTime += clip.duration - (isLastClip ? 0 : transitionDuration);
  });

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'page-turn-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: clipPairs,
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
  id: 'page-turn-transition',
  title: 'Page Turn Transition',
  description:
    'Minimalist page turn transition where videos flip like book pages using 3D transforms. Outgoing video rotates around Y-axis from 0 to ±180 degrees with perspective depth, revealing incoming video underneath. Features subtle gradient shadow during flip, 0.9s duration with smooth easing, and alternating left/right page turns for multiple clips.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'page-turn', '3d', 'flip', 'book', 'elegant'],
  defaultInputParams: {
    clips: [
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration: 5,
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        duration: 5,
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        duration: 5,
      },
    ],
    transitionDuration: 0.9,
    perspective: 1000,
    shadowOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pageTurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
