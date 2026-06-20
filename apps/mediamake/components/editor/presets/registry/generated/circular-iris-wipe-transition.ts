/**
 * Circular Iris Wipe Transition Preset
 * 
 * This preset creates a multi-circle iris wipe transition that reveals incoming video
 * like camera aperture blades opening. Features 5 expanding circles (1 main center + 4 corners)
 * with feathered edges creating a bokeh-like effect during the 2.5-second overlap period.
 * 
 * Features:
 * - **5 Expanding Circles**: Main circle from center (150% scale), 4 corner circles (80% scale)
 * - **Feathered Edges**: Radial gradient masks create smooth blending between videos
 * - **Bokeh Effect**: Outgoing video dims while circles reveal bright spots of incoming video
 * - **Staggered Animation**: Corner circles expand with 0.3s stagger intervals
 * - **Glow Effects**: Animated shadow glow during expansion for enhanced visual appeal
 * 
 * Use cases:
 * - Professional video transitions with cinematic aperture effect
 * - Smooth video-to-video transitions with multiple reveal points
 * - Creative transitions mimicking camera iris mechanics
 * - Multi-source reveal effects with strategic positioning
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
  overlapDuration: z
    .number()
    .default(2.5)
    .describe('Duration of transition overlap in seconds'),
  mainCircleScale: z
    .number()
    .default(1.5)
    .describe('Maximum scale of main center circle (1.5 = 150%)'),
  cornerCircleScale: z
    .number()
    .default(0.8)
    .describe('Maximum scale of corner circles (0.8 = 80%)'),
  expansionDuration: z
    .number()
    .default(2)
    .describe('Duration of circle expansion animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.3)
    .describe('Stagger delay between corner circle expansions in seconds'),
  featherAmount: z
    .number()
    .min(0)
    .max(100)
    .default(70)
    .describe('Feather amount for circle edges (0-100, higher = more feather)'),
  outgoingFadeTo: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity to fade outgoing video to (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    mainCircleScale,
    cornerCircleScale,
    expansionDuration,
    staggerDelay,
    featherAmount,
    outgoingFadeTo,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate transition start time (when incoming video starts)
  const transitionStart = video1.duration - overlapDuration;

  // Convert scale to percentage strings for width/height
  const mainCircleMaxSize = `${mainCircleScale * 100}%`;
  const cornerCircleMaxSize = `${cornerCircleScale * 100}%`;

  // Create mask gradient style
  const maskGradient = `radial-gradient(circle, black ${featherAmount}%, transparent 100%)`;

  // Outgoing video with fade effect
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStart, // Relative to outgoing video start (0)
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: outgoingFadeTo, prog: 1 },
          ],
        },
      },
    ],
  };

  // Helper to create circle mask with incoming video
  const createCircleMask = (
    id: string,
    positionClass: string,
    startDelay: number,
    maxSize: string,
  ): RenderableComponentData => {
    return {
      id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute ${positionClass} rounded-full overflow-hidden`,
          style: {
            width: '0%',
            height: '0%',
            boxShadow: '0 0 50px rgba(255,255,255,0.5)',
          },
        },
      },
      context: {
        timing: {
          start: 0, // Relative to transition container
          duration: video2.duration,
        },
      },
      effects: [
        {
          id: `${id}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: startDelay, // Relative to circle container start
            duration: expansionDuration,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'width', val: '0%', prog: 0 },
              { key: 'width', val: maxSize, prog: 1 },
              { key: 'height', val: '0%', prog: 0 },
              { key: 'height', val: maxSize, prog: 1 },
              { key: 'boxShadow', val: '0 0 50px rgba(255,255,255,0)', prog: 0 },
              { key: 'boxShadow', val: '0 0 50px rgba(255,255,255,0.5)', prog: 0.5 },
              { key: 'boxShadow', val: '0 0 50px rgba(255,255,255,0)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `${id}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            className: 'absolute inset-0 object-cover',
            fit: 'cover',
            style: {
              maskImage: maskGradient,
              WebkitMaskImage: maskGradient,
            },
          },
          context: {
            timing: {
              start: 0, // Relative to circle mask start
              duration: video2.duration,
            },
          },
        } as RenderableComponentData,
      ],
    };
  };

  // Create all 5 circle masks
  const circleMain = createCircleMask(
    'circle-main',
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    0, // No delay for main circle
    mainCircleMaxSize,
  );

  const circleTopLeft = createCircleMask(
    'circle-top-left',
    'top-0 left-0',
    staggerDelay,
    cornerCircleMaxSize,
  );

  const circleTopRight = createCircleMask(
    'circle-top-right',
    'top-0 right-0',
    staggerDelay * 2,
    cornerCircleMaxSize,
  );

  const circleBottomLeft = createCircleMask(
    'circle-bottom-left',
    'bottom-0 left-0',
    staggerDelay * 3,
    cornerCircleMaxSize,
  );

  const circleBottomRight = createCircleMask(
    'circle-bottom-right',
    'bottom-0 right-0',
    staggerDelay * 4,
    cornerCircleMaxSize,
  );

  // Transition container holding all circles
  const transitionContainer: RenderableComponentData = {
    id: 'transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: transitionStart, // Relative to root
        duration: video2.duration,
      },
    },
    childrenData: [
      circleMain,
      circleTopLeft,
      circleTopRight,
      circleBottomLeft,
      circleBottomRight,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'circular-iris-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, transitionContainer],
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
  id: 'circular-iris-wipe-transition',
  title: 'Circular Iris Wipe Transition',
  description:
    'A circular iris wipe transition with multiple expanding circles that reveal the incoming video like camera aperture blades opening. Features 5 circles (1 main center, 4 corner circles) with feathered edges, creating a bokeh-like effect during the 2.5-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'iris', 'wipe', 'circular', 'aperture', 'bokeh', 'multi-circle'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2.5,
    mainCircleScale: 1.5,
    cornerCircleScale: 0.8,
    expansionDuration: 2,
    staggerDelay: 0.3,
    featherAmount: 70,
    outgoingFadeTo: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const circularIrisWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};