/**
 * Split-Screen Slide Reveal Preset
 *
 * A dynamic split-screen composition with sliding panel reveals inspired by modern documentary-style editing.
 * Two parallel video tracks reveal themselves through animated masking with smooth slide-in animations
 * and subtle bounce-back effects.
 *
 * Features:
 * - **Dual Panel System**: Left and right panels slide in from opposite directions
 * - **Smooth Animations**: 0.8s ease-out slide-in followed by 0.1s bounce-back effect
 * - **Center Divider**: Thin animated dividing line with vertical wipe effect
 * - **Depth Effects**: Subtle drop shadows on overlapping edges
 * - **Editorial Feel**: Purposeful animations that feel like high-end production choices
 * - **GPU Accelerated**: Uses transform and clip-path for optimal performance
 *
 * Use cases:
 * - Documentary-style split-screen comparisons
 * - Before/after reveals
 * - Dual perspective storytelling
 * - Interview split screens
 * - Side-by-side product demonstrations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  leftPanelSrc: z.string().describe('Video or image source for left panel'),
  rightPanelSrc: z.string().describe('Video or image source for right panel'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the split-screen in seconds'),
  slideInDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Duration of the main slide-in animation in seconds'),
  bounceBackDuration: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Duration of the bounce-back effect in seconds'),
  dividerDelay: z
    .number()
    .min(0)
    .default(0.9)
    .describe('Delay before divider animation starts (relative to start)'),
  dividerDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.2)
    .describe('Duration of the divider vertical wipe animation'),
  dividerWidth: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Width of the center divider line in pixels'),
  dividerOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of the divider line'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of drop shadows on panel edges'),
  bounceOvershoot: z
    .number()
    .min(0)
    .max(20)
    .default(3)
    .describe('Percentage of bounce-back overshoot effect'),
  trackName: z
    .string()
    .default('split-screen-track')
    .describe('Unique identifier for this split-screen instance'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftPanelSrc,
    rightPanelSrc,
    duration,
    slideInDuration,
    bounceBackDuration,
    dividerDelay,
    dividerDuration,
    dividerWidth,
    dividerOpacity,
    shadowIntensity,
    bounceOvershoot,
    trackName,
  } = params;

  // Calculate animation timing
  const totalAnimDuration = slideInDuration + bounceBackDuration;
  const slideProgress = slideInDuration / totalAnimDuration;

  // Helper: Detect media type from source
  const detectMediaType = (src: string): 'video' | 'image' => {
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const isVideo = videoExts.some((ext) => src.toLowerCase().includes(ext));
    return isVideo ? 'video' : 'image';
  };

  const leftMediaType = detectMediaType(leftPanelSrc);
  const rightMediaType = detectMediaType(rightPanelSrc);

  // Root container ID
  const rootId = `${trackName}-container`;
  const leftPanelId = `${trackName}-left-panel`;
  const rightPanelId = `${trackName}-right-panel`;
  const leftMediaId = `${trackName}-left-media`;
  const rightMediaId = `${trackName}-right-media`;
  const dividerId = `${trackName}-divider`;

  // Left panel slide-in effect (from left)
  const leftPanelEffect = {
    id: `${leftPanelId}-slide`,
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: totalAnimDuration,
      mode: 'provider',
      targetIds: [leftPanelId],
      ranges: [
        // Main slide-in (0 to slideProgress)
        { key: 'translateX', val: -100, prog: 0 }, // -100% (off-screen left)
        { key: 'translateX', val: bounceOvershoot, prog: slideProgress }, // Overshoot right
        // Bounce-back (slideProgress to 1)
        { key: 'translateX', val: 0, prog: 1 }, // Settle at 0
      ],
    },
  };

  // Right panel slide-in effect (from right)
  const rightPanelEffect = {
    id: `${rightPanelId}-slide`,
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: totalAnimDuration,
      mode: 'provider',
      targetIds: [rightPanelId],
      ranges: [
        // Main slide-in (0 to slideProgress)
        { key: 'translateX', val: 100, prog: 0 }, // 100% (off-screen right)
        { key: 'translateX', val: -bounceOvershoot, prog: slideProgress }, // Overshoot left
        // Bounce-back (slideProgress to 1)
        { key: 'translateX', val: 0, prog: 1 }, // Settle at 0
      ],
    },
  };

  // Divider vertical wipe effect
  const dividerEffect = {
    id: `${dividerId}-wipe`,
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: dividerDelay,
      duration: dividerDuration,
      mode: 'provider',
      targetIds: [dividerId],
      ranges: [
        { key: 'scaleY', val: 0, prog: 0 }, // Start at 0 height
        { key: 'scaleY', val: 1, prog: 1 }, // Expand to full height
        { key: 'opacity', val: 0, prog: 0 }, // Fade in
        { key: 'opacity', val: dividerOpacity, prog: 1 },
      ],
    },
  };

  // Left media atom
  const leftMediaAtom = {
    id: leftMediaId,
    type: 'atom' as const,
    componentId: leftMediaType === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: leftPanelSrc,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      ...(leftMediaType === 'video' && {
        muted: false,
        volume: 1,
        playbackRate: 1,
      }),
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Right media atom
  const rightMediaAtom = {
    id: rightMediaId,
    type: 'atom' as const,
    componentId: rightMediaType === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: rightPanelSrc,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      ...(rightMediaType === 'video' && {
        muted: false,
        volume: 1,
        playbackRate: 1,
      }),
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Left panel container
  const leftPanel = {
    id: leftPanelId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 left-0 h-full w-1/2',
        style: {
          clipPath: 'inset(0)',
          boxShadow: `4px 0 8px rgba(0, 0, 0, ${shadowIntensity})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [leftPanelEffect],
    childrenData: [leftMediaAtom],
  } as RenderableComponentData;

  // Right panel container
  const rightPanel = {
    id: rightPanelId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 right-0 h-full w-1/2',
        style: {
          clipPath: 'inset(0)',
          boxShadow: `-4px 0 8px rgba(0, 0, 0, ${shadowIntensity})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [rightPanelEffect],
    childrenData: [rightMediaAtom],
  } as RenderableComponentData;

  // Center divider
  const divider = {
    id: dividerId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="w-full h-full bg-white" style="opacity: ${dividerOpacity}"></div>`,
      className: `absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-10`,
      style: {
        width: `${dividerWidth}px`,
        transformOrigin: 'top center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [dividerEffect],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [leftPanel, rightPanel, divider],
  } as RenderableComponentData;

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
  id: 'split-screen-slide-reveal',
  title: 'Dynamic Split-Screen with Sliding Panel Reveals',
  description:
    'Modern documentary-style split-screen preset with animated masking, sliding panels from opposite directions, subtle bounce-back, animated center divider with vertical wipe effect, and depth shadows. Features smooth ease-out slide-in followed by gentle bounce for editorial feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'documentary',
    'editorial',
    'slide-reveal',
    'panel',
    'animation',
    'modern',
    'dual-video',
  ],
  defaultInputParams: {
    leftPanelSrc: 'https://example.com/video-left.mp4',
    rightPanelSrc: 'https://example.com/video-right.mp4',
    duration: 10,
    slideInDuration: 0.8,
    bounceBackDuration: 0.1,
    dividerDelay: 0.9,
    dividerDuration: 0.2,
    dividerWidth: 2,
    dividerOpacity: 0.2,
    shadowIntensity: 0.3,
    bounceOvershoot: 3,
    trackName: 'split-screen-track',
  },
  dependencies: {},
};

// Export preset
export const splitScreenSlideRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
