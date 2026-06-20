/**
 * Scrapbook Polaroid Collage Transition Preset
 *
 * This preset creates a dynamic transition where the outgoing video breaks into multiple
 * Polaroid-style frames that scatter and fade out, while new Polaroid frames containing
 * the incoming video assemble from scattered positions into a grid layout.
 *
 * Features:
 * - **Polaroid Frame Design**: White borders, slight rotations, and drop shadows
 * - **Scatter Animation**: Outgoing frames scatter with random rotations and translations
 * - **Assembly Animation**: Incoming frames assemble from scattered positions
 * - **Handwritten Labels**: Text labels with handwriting font that fade in/out with frames
 * - **Staggered Timing**: 100ms delays between frame animations for organic feel
 * - **Cropped Video Sections**: Each Polaroid shows a different portion of the video
 *
 * Use cases:
 * - Creating memorable/nostalgic transitions between video clips
 * - Building photo collage style video sequences
 * - Adding playful transitions with personality
 * - Creating scrapbook-style video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
  }),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  labelFont: z
    .string()
    .default('Kalam')
    .describe(
      'Handwriting font family for labels (e.g., "Kalam", "Caveat", "Patrick Hand")',
    ),
  labelColor: z
    .string()
    .default('#333333')
    .describe('Color of the label text'),
  outgoingLabels: z
    .array(z.string())
    .default([
      'Memory 1',
      'Memory 2',
      'Memory 3',
      'Memory 4',
      'Memory 5',
      'Memory 6',
    ])
    .describe('Labels for outgoing Polaroid frames'),
  incomingLabels: z
    .array(z.string())
    .default(['New 1', 'New 2', 'New 3', 'New 4', 'New 5', 'New 6'])
    .describe('Labels for incoming Polaroid frames'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    labelFont,
    labelColor,
    outgoingLabels,
    incomingLabels,
  } = params;

  // Frame configuration: positions, rotations, video crop regions
  const frameConfigs = [
    {
      left: 60,
      top: 60,
      rotation: -3,
      clipPath: 'inset(0% 66.67% 66.67% 0%)',
    }, // Top-left
    {
      left: 360,
      top: 60,
      rotation: 5,
      clipPath: 'inset(0% 33.34% 66.67% 33.33%)',
    }, // Top-center
    {
      left: 660,
      top: 60,
      rotation: -7,
      clipPath: 'inset(0% 0% 66.67% 66.66%)',
    }, // Top-right
    {
      left: 60,
      top: 400,
      rotation: 8,
      clipPath: 'inset(33.33% 66.67% 33.34% 0%)',
    }, // Bottom-left
    {
      left: 360,
      top: 400,
      rotation: -4,
      clipPath: 'inset(33.33% 33.34% 33.34% 33.33%)',
    }, // Bottom-center
    {
      left: 660,
      top: 400,
      rotation: 6,
      clipPath: 'inset(33.33% 0% 33.34% 66.66%)',
    }, // Bottom-right
  ];

  // Scatter animations for outgoing frames (random directions and rotations)
  const outgoingScatterConfigs = [
    { translateX: -300, translateY: 200, rotateEnd: -25 },
    { translateX: 250, translateY: -180, rotateEnd: 30 },
    { translateX: 400, translateY: 150, rotateEnd: 20 },
    { translateX: -350, translateY: -220, rotateEnd: -28 },
    { translateX: 200, translateY: 300, rotateEnd: 18 },
    { translateX: 320, translateY: -250, rotateEnd: -32 },
  ];

  // Assembly animations for incoming frames (come from scattered positions)
  const incomingAssembleConfigs = [
    { translateXStart: -400, translateYStart: 250, rotateStart: -35 },
    { translateXStart: 320, translateYStart: -280, rotateStart: 40 },
    { translateXStart: 500, translateYStart: 200, rotateStart: 28 },
    { translateXStart: -450, translateYStart: -300, rotateStart: -42 },
    { translateXStart: 280, translateYStart: 350, rotateStart: 25 },
    { translateXStart: 380, translateYStart: -320, rotateStart: -45 },
  ];

  const childrenData: RenderableComponentData[] = [];

  // ============================================================================
  // CREATE OUTGOING POLAROID FRAMES
  // ============================================================================

  frameConfigs.forEach((config, index) => {
    const frameId = `outgoing-frame-${index + 1}`;
    const videoId = `outgoing-video-${index + 1}`;
    const labelId = `outgoing-label-${index + 1}`;
    const scatterConfig = outgoingScatterConfigs[index];
    const staggerDelay = index * 0.1; // 100ms stagger

    childrenData.push({
      id: frameId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bg-white p-2 shadow-xl',
          style: {
            width: '280px',
            height: '320px',
            left: `${config.left}px`,
            top: `${config.top}px`,
            transform: `rotate(${config.rotation}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Video section
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            startFrom: 0,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              clipPath: config.clipPath,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Label
        {
          id: labelId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: outgoingLabels[index] || `Memory ${index + 1}`,
            style: {
              fontSize: '18px',
              color: labelColor,
              textAlign: 'center' as const,
              marginTop: '8px',
            },
            font: {
              family: labelFont,
              weights: ['400'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Scatter and fade out effect
        {
          id: `effect-${frameId}-scatter`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: staggerDelay,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: [frameId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: scatterConfig.translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: scatterConfig.translateY, prog: 1 },
              { key: 'rotate', val: config.rotation, prog: 0 },
              { key: 'rotate', val: scatterConfig.rotateEnd, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // ============================================================================
  // CREATE INCOMING POLAROID FRAMES
  // ============================================================================

  frameConfigs.forEach((config, index) => {
    const frameId = `incoming-frame-${index + 1}`;
    const videoId = `incoming-video-${index + 1}`;
    const labelId = `incoming-label-${index + 1}`;
    const assembleConfig = incomingAssembleConfigs[index];
    const staggerDelay = index * 0.1; // 100ms stagger

    childrenData.push({
      id: frameId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bg-white p-2 shadow-xl',
          style: {
            width: '280px',
            height: '320px',
            left: `${config.left}px`,
            top: `${config.top}px`,
            transform: `rotate(${config.rotation}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Video section
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: 0,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              clipPath: config.clipPath,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Label
        {
          id: labelId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: incomingLabels[index] || `New ${index + 1}`,
            style: {
              fontSize: '18px',
              color: labelColor,
              textAlign: 'center' as const,
              marginTop: '8px',
            },
            font: {
              family: labelFont,
              weights: ['400'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Assemble from scattered position effect
        {
          id: `effect-${frameId}-assemble`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: staggerDelay,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: [frameId],
            ranges: [
              { key: 'translateX', val: assembleConfig.translateXStart, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: assembleConfig.translateYStart, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'rotate', val: assembleConfig.rotateStart, prog: 0 },
              { key: 'rotate', val: config.rotation, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'scrapbook-polaroid-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#f5f5f0', // Subtle off-white background
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'scrapbook-polaroid-transition',
  title: 'Scrapbook Polaroid Collage Transition',
  description:
    'A transition effect where the outgoing video breaks into 6 Polaroid-style frames that scatter and fade out while 6 new Polaroid frames containing the incoming video assemble from scattered positions into a grid. Each frame has white borders, slight rotation, drop shadow, and handwritten labels with staggered animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'polaroid',
    'scrapbook',
    'collage',
    'scatter',
    'animation',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
    },
    transitionDuration: 2.5,
    labelFont: 'Kalam',
    labelColor: '#333333',
    outgoingLabels: [
      'Memory 1',
      'Memory 2',
      'Memory 3',
      'Memory 4',
      'Memory 5',
      'Memory 6',
    ],
    incomingLabels: ['New 1', 'New 2', 'New 3', 'New 4', 'New 5', 'New 6'],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const scrapbookPolaroidTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
