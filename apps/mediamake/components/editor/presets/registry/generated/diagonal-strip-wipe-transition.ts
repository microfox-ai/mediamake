/**
 * Diagonal Strip Wipe Transition Preset
 *
 * This preset creates a dynamic diagonal line wipe transition where 8 parallel diagonal strips
 * sweep across the screen from bottom-left to top-right, revealing the incoming video in strips.
 * 
 * Features:
 * - **8 Diagonal Strips**: Parallel strips that move with different speeds creating a wave-like reveal
 * - **Venetian Blind Effect**: Strips reveal incoming video progressively with staggered timing
 * - **Gradient Edges**: 10px gradient edges on each strip for smooth blending (transparent to opaque)
 * - **Staggered Speed**: Fastest strip completes in 0.8s, slowest in 1.6s (0.1s increment per strip)
 * - **Dynamic Rotation**: Both videos rotate slightly (2 degrees) during transition for movement
 * - **Smooth Reveal**: Incoming video revealed progressively as strips sweep across
 * 
 * Technical Implementation:
 * - BaseLayout container with overflow hidden
 * - 8 diagonal strip masks using HTMLBlockAtom (positioned absolutely with rotation)
 * - Linear gradient backgrounds on strips (transparent to black)
 * - TranslateX animations from -100% to 100% with staggered durations
 * - Outgoing video with 2deg rotation effect
 * - Incoming video with -2deg rotation and progressive reveal
 * - Provider mode effects targeting all strips with staggered timing
 * 
 * Use Cases:
 * - Creating dynamic video transitions with organic movement
 * - Building stylized scene changes with diagonal wipes
 * - Adding cinematic transitions to video montages
 * - Creating unique reveal effects for video content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of transition overlap in seconds (slowest strip duration)'),
  stripCount: z
    .number()
    .default(8)
    .describe('Number of diagonal strips (default: 8)'),
  fastestStripDuration: z
    .number()
    .default(0.8)
    .describe('Duration for fastest strip in seconds (default: 0.8s)'),
  gradientWidth: z
    .number()
    .default(10)
    .describe('Width of gradient edge on strips in pixels (default: 10px)'),
  rotationAngle: z
    .number()
    .default(2)
    .describe('Rotation angle for videos during transition in degrees (default: 2deg)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    stripCount,
    fastestStripDuration,
    gradientWidth,
    rotationAngle,
  } = params;

  // Calculate BaseLayout duration (sum of videos minus overlap)
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate strip positions and durations
  const stripHeight = 20; // % height per strip
  const stripRotation = -45; // degrees
  const stripDurationIncrement = (transitionDuration - fastestStripDuration) / (stripCount - 1);

  // Helper function to calculate strip top position
  const calculateStripTop = (index: number): string => {
    // Distribute strips evenly across viewport with overlap
    const baseTop = (index / stripCount) * 100 - 10;
    return `${baseTop}%`;
  };

  // Helper function to calculate strip duration
  const calculateStripDuration = (index: number): number => {
    return fastestStripDuration + index * stripDurationIncrement;
  };

  // Create diagonal strip elements
  const stripElements: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripDuration = calculateStripDuration(i);
    const stripTop = calculateStripTop(i);

    stripElements.push({
      id: `diagonal-strip-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <div style="
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, 
              transparent 0%, 
              black ${gradientWidth}px, 
              black calc(100% - ${gradientWidth}px), 
              transparent 100%
            );
          "></div>
        `,
        className: 'absolute',
        style: {
          width: '200%',
          height: `${stripHeight}%`,
          top: stripTop,
          left: '-50%',
          transform: `rotate(${stripRotation}deg)`,
          zIndex: 30,
          pointerEvents: 'none' as const,
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `strip-wipe-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: stripDuration,
            mode: 'provider',
            targetIds: [`diagonal-strip-${i}`],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Outgoing video with rotation effect
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute' as const,
        inset: 0,
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationAngle, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with counter-rotation effect
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute' as const,
        inset: 0,
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'rotate', val: -rotationAngle, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'diagonal-strip-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo, ...stripElements],
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
  id: 'diagonal-strip-wipe-transition',
  title: 'Diagonal Strip Wipe Transition',
  description:
    'A diagonal line wipe transition where 8 parallel diagonal strips sweep across the screen from bottom-left to top-right with staggered speeds (0.8s to 1.6s), creating a venetian blind effect. The incoming video is revealed progressively as strips pass. Both videos have subtle 2-degree rotation during transition for dynamic movement. Uses gradient edges on strips for smooth blending.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'diagonal', 'strips', 'venetian-blind', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.6,
    stripCount: 8,
    fastestStripDuration: 0.8,
    gradientWidth: 10,
    rotationAngle: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const diagonalStripWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
