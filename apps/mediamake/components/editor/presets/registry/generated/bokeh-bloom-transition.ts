/**
 * Bokeh Bloom Transition Preset
 *
 * This preset creates a dreamy, cinema-quality transition between two videos using a
 * dual-layer Gaussian blur technique. The outgoing video gradually increases blur from
 * 0px to 40px while fading out, while the incoming video starts with heavy blur (60px)
 * and progressively sharpens to 0px while fading in. A subtle bloom effect (brightness
 * and contrast adjustment) peaks at the midpoint to create an ethereal light-bleeding
 * effect reminiscent of a camera lens refocusing.
 *
 * Features:
 * - **Dual-Layer Gaussian Blur**: Independent blur animations for outgoing and incoming videos
 * - **Smooth Opacity Transitions**: Synchronized fade-out and fade-in during 2-second overlap
 * - **Bloom Effect Peak**: Brightness (1.2) and contrast (0.9) peak at transition midpoint
 * - **Provider Mode Effects**: All effects use provider mode with targetIds for clean DOM
 * - **Flexible Media Support**: Works with both video and image media sources
 *
 * Use cases:
 * - Creating cinematic transitions between video clips
 * - Simulating camera focus shifts between subjects
 * - Adding dreamy, ethereal transitions to montages
 * - Professional video editing with soft, high-end transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the outgoing video/image'),
    type: z.enum(['video', 'image']).describe('Media type (video or image)'),
    duration: z.number().describe('Duration of the outgoing media in seconds'),
  }).describe('Outgoing media configuration'),
  
  media2: z.object({
    src: z.string().describe('Source URL of the incoming video/image'),
    type: z.enum(['video', 'image']).describe('Media type (video or image)'),
    duration: z.number().describe('Duration of the incoming media in seconds'),
  }).describe('Incoming media configuration'),
  
  transitionDuration: z.number().default(2).describe('Duration of the transition overlap in seconds'),
  
  outgoingBlurMax: z.number().default(40).describe('Maximum blur for outgoing video in pixels'),
  incomingBlurStart: z.number().default(60).describe('Starting blur for incoming video in pixels'),
  
  bloomBrightness: z.number().default(1.2).describe('Brightness value at bloom peak (1.0 = normal)'),
  bloomContrast: z.number().default(0.9).describe('Contrast value at bloom peak (1.0 = normal)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    outgoingBlurMax,
    incomingBlurStart,
    bloomBrightness,
    bloomContrast,
  } = params;

  // Calculate BaseLayout duration (overlap reduces total time)
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // Outgoing video/image
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        ...(media1.type === 'video' && {
          volume: 1,
          muted: false,
        }),
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Blur effect: 0px -> 40px during last 2 seconds
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'blur', val: '0px', prog: 0 },
              { key: 'blur', val: `${outgoingBlurMax}px`, prog: 1 },
            ],
          },
        },
        // Opacity effect: 1 -> 0 during last 2 seconds
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video/image
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        ...(media2.type === 'video' && {
          volume: 1,
          muted: false,
        }),
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration,
        },
      },
      effects: [
        // Blur effect: 60px -> 0px during first 2 seconds
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'blur', val: `${incomingBlurStart}px`, prog: 0 },
              { key: 'blur', val: '0px', prog: 1 },
            ],
          },
        },
        // Opacity effect: 0 -> 1 during first 2 seconds
        {
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Bloom brightness effect: 1 -> 1.2 -> 1 (peaks at midpoint)
        {
          id: 'incoming-bloom-brightness-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: bloomBrightness, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
        // Bloom contrast effect: 1 -> 0.9 -> 1 (peaks at midpoint)
        {
          id: 'incoming-bloom-contrast-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'contrast', val: 1, prog: 0 },
              { key: 'contrast', val: bloomContrast, prog: 0.5 },
              { key: 'contrast', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bokeh-bloom-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gradient-to-br from-purple-900/10 to-pink-900/10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'bokeh-bloom-transition',
  title: 'Bokeh Bloom Transition',
  description: 'A dreamy dual-layer gaussian blur transition with bloom effect. Two videos transition with the outgoing video blurring from 0px to 40px while fading out, and the incoming video deblurring from 60px to 0px while fading in. A subtle bloom effect (brightness/contrast filter) peaks at the midpoint, creating an ethereal bokeh lens effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'bokeh', 'blur', 'bloom', 'gaussian', 'dreamy', 'cinematic', 'ethereal'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 10,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 8,
    },
    transitionDuration: 2,
    outgoingBlurMax: 40,
    incomingBlurStart: 60,
    bloomBrightness: 1.2,
    bloomContrast: 0.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export
export const bokehBloomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
