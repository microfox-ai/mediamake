/**
 * Paper Shred Transition Preset
 *
 * Creates a dramatic paper shredder transition where the outgoing video is split into 14 vertical
 * strips that fall away with physics-based gravity motion, revealing the incoming video beneath.
 *
 * Features:
 * - 14 vertical strips with staggered timing for mechanical progression
 * - Physics-based falling motion with gravity acceleration (cubic-bezier easing)
 * - Parallax depth effect: edge strips fall faster than center strips
 * - Slight rotation per strip for realistic shredding motion
 * - Subtle paper texture overlays with multiply blend mode
 * - Top-to-bottom mechanical progression
 * - 1.4 second transition duration with staggered delays
 *
 * Technical Implementation:
 * - Single BaseLayout container with relative overflow-hidden
 * - Outgoing video split into 14 strips using multiple VideoAtom clones with clip-path
 * - Each strip: absolute positioning, calculated left offset, width ~7.14%
 * - Staggered animations: translateY(0) -> translateY(120%) with varying durations (0.8s-1.2s)
 * - Random rotation: -5deg to 5deg per strip
 * - Scale effect: scale(1) -> scale(0.95) for depth
 * - CSS custom properties for strip index calculations
 * - Incoming VideoAtom at z-0 (beneath strips)
 * - Paper texture overlay on strips with mix-blend-mode: multiply
 *
 * Use Cases:
 * - Dramatic scene transitions
 * - Document/paper-themed content
 * - Information reveal effects
 * - Creative video transitions
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
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Total transition duration in seconds'),
  numStrips: z
    .number()
    .default(14)
    .describe('Number of vertical strips (12-15 recommended)'),
  paperTextureSrc: z
    .string()
    .optional()
    .describe('Optional paper texture image URL'),
  paperTextureOpacity: z
    .number()
    .default(0.15)
    .min(0)
    .max(1)
    .describe('Opacity of paper texture overlay'),
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
    numStrips,
    paperTextureSrc,
    paperTextureOpacity,
  } = params;

  // Helper: Generate random rotation between -5 and 5 degrees
  const getRandomRotation = (index: number): number => {
    // Use index as seed for consistent randomness
    const seed = (index * 9301 + 49297) % 233280;
    const random = seed / 233280;
    return random * 10 - 5; // -5 to 5 degrees
  };

  // Helper: Calculate fall duration based on parallax (edge strips fall faster)
  const getFallDuration = (index: number): number => {
    const centerIndex = numStrips / 2;
    const distanceFromCenter = Math.abs(index - centerIndex);
    const normalizedDistance = distanceFromCenter / (numStrips / 2);
    // Edge strips (normalizedDistance = 1) fall in 0.8s, center strips in 1.2s
    return 1.2 - normalizedDistance * 0.4;
  };

  // Helper: Calculate stagger delay (top to bottom progression)
  const getStaggerDelay = (index: number): number => {
    // Each strip starts 0.04s after the previous one
    return index * 0.04;
  };

  // Calculate total duration: outgoing + incoming - overlap
  const overlapDuration = transitionDuration;
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Create strips
  const stripWidth = 100 / numStrips;
  const strips: RenderableComponentData[] = [];

  for (let i = 0; i < numStrips; i++) {
    const stripId = `strip-${i}`;
    const leftPosition = i * stripWidth;
    const staggerDelay = getStaggerDelay(i);
    const fallDuration = getFallDuration(i);
    const rotation = getRandomRotation(i);

    // Calculate transition start time (relative to outgoing video)
    const transitionStart = outgoingVideo.duration - transitionDuration;

    // Video offset for this strip
    const videoLeftOffset = -i * 100;

    // Create strip container
    const stripContainer: RenderableComponentData = {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            left: `${leftPosition}%`,
            width: `${stripWidth}%`,
            height: '100%',
            top: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Fall animation
        {
          id: `fall-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in', // Gravity acceleration
            start: transitionStart + staggerDelay,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '120%', prog: 1 },
            ],
          },
        },
        // Rotation animation
        {
          id: `rotate-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart + staggerDelay,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotation, prog: 1 },
            ],
          },
        },
        // Scale animation (slight shrink for depth)
        {
          id: `scale-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart + staggerDelay,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.95, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing video for this strip
        {
          id: `strip-video-${i}`,
          type: 'atom',
          componentId: outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            style: {
              position: 'absolute',
              width: `${numStrips * 100}%`,
              height: '100%',
              left: `${videoLeftOffset}%`,
              top: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
        },
        // Paper texture overlay (if provided)
        ...(paperTextureSrc
          ? [
              {
                id: `strip-texture-${i}`,
                type: 'atom' as const,
                componentId: 'ImageAtom',
                data: {
                  src: paperTextureSrc,
                  className: 'absolute inset-0',
                  style: {
                    mixBlendMode: 'multiply',
                    opacity: paperTextureOpacity,
                    pointerEvents: 'none',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: outgoingVideo.duration,
                  },
                },
              } as RenderableComponentData,
            ]
          : []),
      ],
    };

    strips.push(stripContainer);
  }

  // Create incoming video (beneath strips)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paper-shred-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
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
      incomingVideoNode,
      ...strips,
    ] as RenderableComponentData[],
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
  id: 'paper-shred-transition',
  title: 'Paper Shred Transition',
  description:
    'A dramatic paper shredder transition effect where the outgoing video is split into 14 vertical strips that fall away with physics-based gravity motion, revealing the incoming video beneath. Features staggered timing, parallax depth (edge strips fall faster), slight rotation per strip, subtle paper texture overlays with multiply blend mode, and mechanical top-to-bottom progression.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paper', 'shred', 'mechanical', 'physics', 'dramatic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.4,
    numStrips: 14,
    paperTextureOpacity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperShredTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};