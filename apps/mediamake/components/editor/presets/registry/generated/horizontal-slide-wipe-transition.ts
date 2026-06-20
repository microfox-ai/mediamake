/**
 * Horizontal Slide Wipe Transition Preset
 *
 * This preset creates a carousel-inspired horizontal slide wipe transition that physically
 * pushes the outgoing image left while the incoming image slides in from the right. Both
 * images are visible simultaneously during the overlap, simulating the physical movement
 * of slides on a carousel track.
 *
 * Features:
 * - **Physical Slide Mechanism**: Outgoing image slides left while incoming slides right
 * - **Synchronized Movement**: Both images move in perfect synchronization
 * - **Frame Edge Divider**: Thin black vertical bar (2-4px) between images during transition
 * - **Motion Blur**: Subtle blur effect on both images during movement, peaking at 50%
 * - **GPU Acceleration**: Uses will-change transform for smooth performance
 * - **Configurable Overlap**: Adjustable transition duration (default 0.5s)
 *
 * Use cases:
 * - Creating smooth carousel-like transitions between images
 * - Building slideshow presentations with mechanical feel
 * - Adding cinematic slide transitions to video content
 * - Creating photo gallery animations
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
  image1: z.object({
    src: z.string().describe('Source URL of the outgoing (first) image'),
    duration: z.number().describe('Duration of the outgoing image in seconds'),
  }).describe('First image configuration'),
  
  image2: z.object({
    src: z.string().describe('Source URL of the incoming (second) image'),
    duration: z.number().describe('Duration of the incoming image in seconds'),
  }).describe('Second image configuration'),
  
  overlapDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Duration of the transition overlap in seconds (0.1-2s)'),
  
  dividerWidth: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Width of the black divider bar in pixels (2-8px)'),
  
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Motion blur intensity in pixels at peak (0-5px)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image1,
    image2,
    overlapDuration,
    dividerWidth,
    motionBlurIntensity,
  } = params;

  // Calculate total duration
  const totalDuration = image1.duration + image2.duration - overlapDuration;

  // Calculate transition start time (when overlap begins)
  const transitionStartTime = image1.duration - overlapDuration;

  // Create outgoing image with slide-out and blur effects
  const outgoingImage: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: image1.duration,
      },
    },
    effects: [
      // Slide out effect (translateX: 0% → -100%)
      {
        id: 'outgoing-slide-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0, unit: '%' },
            { key: 'translateX', val: -100, prog: 1, unit: '%' },
          ],
        },
      },
      // Motion blur effect (0 → peak → 0)
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'blur', val: 0, prog: 0, unit: 'px' },
            { key: 'blur', val: motionBlurIntensity, prog: 0.5, unit: 'px' },
            { key: 'blur', val: 0, prog: 1, unit: 'px' },
          ],
        },
      },
    ],
  };

  // Create incoming image with slide-in and blur effects
  const incomingImage: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: image2.duration,
      },
    },
    effects: [
      // Slide in effect (translateX: 100% → 0%)
      {
        id: 'incoming-slide-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: 0, // Relative to incoming image start time
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'translateX', val: 100, prog: 0, unit: '%' },
            { key: 'translateX', val: 0, prog: 1, unit: '%' },
          ],
        },
      },
      // Motion blur effect (0 → peak → 0)
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: 0, // Relative to incoming image start time
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'blur', val: 0, prog: 0, unit: 'px' },
            { key: 'blur', val: motionBlurIntensity, prog: 0.5, unit: 'px' },
            { key: 'blur', val: 0, prog: 1, unit: 'px' },
          ],
        },
      },
    ],
  };

  // Create black divider bar
  const dividerBar: RenderableComponentData = {
    id: 'divider-bar',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute top-0 bottom-0 bg-black" style="width: ${dividerWidth}px; will-change: transform;"></div>`,
      className: 'absolute top-0 bottom-0',
      style: {
        zIndex: 30,
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: overlapDuration,
      },
    },
    effects: [
      // Divider tracks the transition edge (translateX: 100% → 0%)
      {
        id: 'divider-track-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: 0, // Relative to divider start time
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['divider-bar'],
          ranges: [
            { key: 'translateX', val: 100, prog: 0, unit: '%' },
            { key: 'translateX', val: 0, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'horizontal-slide-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingImage, incomingImage, dividerBar],
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
  id: 'horizontal-slide-wipe-transition',
  title: 'Horizontal Slide Wipe Transition',
  description:
    'A carousel-inspired horizontal slide wipe transition that physically pushes the outgoing image left while the incoming image slides in from the right. Features synchronized motion, a thin black divider bar simulating a slide frame edge, and subtle motion blur during movement for enhanced mechanical feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'slide',
    'wipe',
    'carousel',
    'horizontal',
    'mechanical',
    'motion-blur',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 0.5,
    dividerWidth: 4,
    motionBlurIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const horizontalSlideWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
