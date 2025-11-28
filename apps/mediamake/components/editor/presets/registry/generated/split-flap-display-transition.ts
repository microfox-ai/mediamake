/**
 * Split-Flap Display Transition Preset
 *
 * This preset creates a mechanical departure board inspired transition effect that divides
 * the screen into 8 horizontal strips. Each strip flips independently with staggered timing
 * (0.05s offset per strip), featuring rotateX animations with perspective(800px), shadow
 * effects during flips, and clicking sounds for each segment.
 *
 * Features:
 * - **Mechanical Split-Flap Effect**: Divides screen into horizontal segments that flip independently
 * - **Staggered Animation**: Each strip rotates with 0.05s delay from previous strip
 * - **3D Perspective**: Uses perspective(800px) for realistic depth during rotations
 * - **Dynamic Shadows**: Shadow effects appear during mid-flip for mechanical depth
 * - **Audio Feedback**: Click sounds triggered for each strip flip
 * - **Video Masking**: Uses clipPath to mask video segments to each strip region
 * - **Smooth Transitions**: 0.3s rotation duration per strip with ease-in-out timing
 *
 * Use cases:
 * - Creating retro mechanical transition effects between video clips
 * - Building nostalgic departure board style video transitions
 * - Adding tactile, physical feel to digital video transitions
 * - Creating sequential reveal effects with audio synchronization
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
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Outgoing video/image that flips away'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Incoming video/image that flips in'),
  
  stripCount: z.number()
    .min(4)
    .max(12)
    .default(8)
    .describe('Number of horizontal strips to divide the screen into'),
  
  rotationDuration: z.number()
    .min(0.1)
    .max(1.0)
    .default(0.3)
    .describe('Duration of each strip rotation in seconds'),
  
  stripDelay: z.number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Time offset between each strip flip in seconds'),
  
  clickSound: z.object({
    src: z.string().optional().describe('Optional click sound effect URL'),
    volume: z.number().min(0).max(1).default(0.6).describe('Click sound volume'),
  }).optional().describe('Click sound configuration for each strip flip'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    stripCount,
    rotationDuration,
    stripDelay,
    clickSound,
  } = params;

  // Calculate total transition duration
  // Last strip starts at (stripCount - 1) * stripDelay, then rotates for rotationDuration
  const totalDuration = (stripCount - 1) * stripDelay + rotationDuration + 0.1; // Add buffer

  // Helper: Get component ID based on media type
  const getComponentId = (type: 'video' | 'image'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Helper: Calculate clip path for strip segment
  const getClipPath = (stripIndex: number, totalStrips: number): string => {
    const stripHeightPercent = 100 / totalStrips;
    const topPercent = stripIndex * stripHeightPercent;
    const bottomPercent = 100 - (stripIndex + 1) * stripHeightPercent;
    
    return `inset(${topPercent.toFixed(1)}% 0% ${bottomPercent.toFixed(1)}% 0%)`;
  };

  // Generate strip children
  const stripsChildren: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripId = `strip-${i}`;
    const stripStartTime = i * stripDelay;
    const clipPath = getClipPath(i, stripCount);

    // Outgoing video strip (rotates away)
    const outgoingStripId = `${stripId}-outgoing`;
    const outgoingStrip: RenderableComponentData = {
      id: outgoingStripId,
      type: 'atom',
      componentId: getComponentId(outgoingVideo.type),
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          clipPath,
          transformOrigin: 'center bottom',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: stripStartTime + rotationDuration,
        },
      },
      effects: [
        {
          id: `${outgoingStripId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: stripStartTime,
            duration: rotationDuration,
            mode: 'provider',
            targetIds: [outgoingStripId],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: -90, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Incoming video strip (rotates in)
    const incomingStripId = `${stripId}-incoming`;
    const incomingStrip: RenderableComponentData = {
      id: incomingStripId,
      type: 'atom',
      componentId: getComponentId(incomingVideo.type),
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          clipPath,
          transformOrigin: 'center top',
        },
      },
      context: {
        timing: {
          start: stripStartTime,
          duration: rotationDuration + 0.1,
        },
      },
      effects: [
        {
          id: `${incomingStripId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: rotationDuration,
            mode: 'provider',
            targetIds: [incomingStripId],
            ranges: [
              { key: 'rotateX', val: 90, prog: 0 },
              { key: 'rotateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    // Shadow overlay (appears during rotation)
    const shadowId = `${stripId}-shadow`;
    const shadowOverlay: RenderableComponentData = {
      id: shadowId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: stripStartTime,
          duration: rotationDuration,
        },
      },
      effects: [
        {
          id: `${shadowId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: rotationDuration,
            mode: 'provider',
            targetIds: [shadowId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Click audio for this strip
    if (clickSound?.src) {
      const audioId = `click-audio-${i}`;
      const clickAudio: RenderableComponentData = {
        id: audioId,
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: clickSound.src,
          volume: clickSound.volume,
        },
        context: {
          timing: {
            start: stripStartTime,
            duration: 0.1,
          },
        },
      };
      stripsChildren.push(clickAudio);
    }

    // Add strip elements to children
    stripsChildren.push(outgoingStrip);
    stripsChildren.push(incomingStrip);
    stripsChildren.push(shadowOverlay);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'split-flap-display-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '800px',
          overflow: 'hidden',
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: stripsChildren,
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
  id: 'split-flap-display-transition',
  title: 'Split-Flap Display Transition',
  description:
    'A mechanical departure board inspired video transition that divides the screen into 8 horizontal strips. Each strip flips independently with staggered timing (0.05s offset per strip), featuring rotateX animations with perspective(800px), shadow effects during flips, and clicking sounds for each segment. Creates an authentic split-flap display effect transitioning between two video sources.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'mechanical', 'split-flap', 'retro', 'departure-board'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    stripCount: 8,
    rotationDuration: 0.3,
    stripDelay: 0.05,
    clickSound: {
      src: 'https://example.com/click.mp3',
      volume: 0.6,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const splitFlapDisplayTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};