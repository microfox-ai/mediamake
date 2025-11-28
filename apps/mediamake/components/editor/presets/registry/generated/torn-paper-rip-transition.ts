/**
 * Torn Paper Rip Transition Preset
 *
 * This preset creates a collage-style transition where multiple torn paper strips peel away
 * to reveal the next video. It features 7 vertical strips with unique torn edge shapes,
 * staggered animation timing, 3D curl transforms, paper fiber texture overlays, and
 * sound trigger points for paper crinkle effects.
 *
 * Features:
 * - 7 vertical torn paper strips with unique SVG torn edge shapes
 * - Staggered peel-away animation (0.1s delay between strips)
 * - 3D curl transforms (rotateX, translateY, scale)
 * - Paper fiber texture overlays at tear edges
 * - Sound trigger data attributes for paper crinkle effects
 * - Organic tearing motion with ease-in-back easing
 *
 * Use cases:
 * - Creating dramatic video transitions with a physical tearing effect
 * - Adding organic, collage-style transitions between video clips
 * - Building cinematic transitions with sound design integration
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
  video1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video configuration'),
  transitionOverlap: z
    .number()
    .default(2.5)
    .describe('Overlap duration for transition in seconds'),
  stripCount: z
    .number()
    .default(7)
    .describe('Number of vertical torn paper strips'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each strip animation in seconds'),
  animationDuration: z
    .number()
    .default(0.8)
    .describe('Duration of strip peel animation in seconds'),
  stripColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the torn paper strips'),
  fiberOpacity: z
    .number()
    .default(0.6)
    .describe('Opacity of paper fiber texture overlays'),
  enableSoundTriggers: z
    .boolean()
    .default(true)
    .describe('Enable sound trigger data attributes'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionOverlap,
    stripCount,
    staggerDelay,
    animationDuration,
    stripColor,
    fiberOpacity,
    enableSoundTriggers,
  } = params;

  // Calculate total duration (overlap reduces total time)
  const totalDuration = video1.duration + video2.duration - transitionOverlap;

  // Calculate transition start time
  const transitionStart = video1.duration - transitionOverlap;

  // Helper function to generate torn edge SVG
  const generateTornEdgeSvg = (index: number): string => {
    const width = 100;
    const height = 1080; // Standard height
    const tearAmplitude = 10 + (index % 3) * 5; // Vary tear intensity
    const seed = index * 123; // Pseudo-random seed

    // Generate jagged path for torn edge
    const points: string[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * height;
      const x =
        width -
        tearAmplitude +
        Math.sin((i + seed) * 0.5) * tearAmplitude +
        Math.cos((i + seed) * 0.7) * (tearAmplitude * 0.5);
      points.push(`${x},${y}`);
    }

    // Complete the path
    points.push(`${width},${height}`);
    points.push(`${width},0`);

    const pathData = `M ${points.join(' L ')} Z`;

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <path d="${pathData}" fill="${stripColor}" />
      </svg>
    `)}`;
  };

  // Helper function to generate fiber texture SVG
  const generateFiberTexture = (): string => {
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1080" preserveAspectRatio="none">
        <rect x="0" y="0" width="10" height="1080" fill="white" opacity="${fiberOpacity}" />
        <line x1="5" y1="0" x2="5" y2="1080" stroke="white" stroke-width="1" opacity="0.8" />
      </svg>
    `)}`;
  };

  // Calculate strip width percentage
  const stripWidth = 100 / stripCount;

  // Generate strips and effects
  const strips: RenderableComponentData[] = [];
  const fibers: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripId = `strip-${i}`;
    const fiberId = `fiber-${i}`;
    const leftPosition = i * stripWidth;
    const stripStartTime = transitionStart + i * staggerDelay;

    // Create strip component
    const strip: RenderableComponentData = {
      id: stripId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: generateTornEdgeSvg(i),
        className: 'absolute top-0 bottom-0',
        style: {
          left: `${leftPosition}%`,
          width: `${stripWidth}%`,
        },
        ...(enableSoundTriggers
          ? { 'data-sound-trigger': `crinkle-${i}` }
          : {}),
      },
      context: {
        timing: {
          start: stripStartTime,
          duration: animationDuration,
        },
      },
      effects: [
        {
          id: `${stripId}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-back',
            start: 0,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 45, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -120, unit: '%', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    strips.push(strip);

    // Create fiber overlay at strip edge
    if (i < stripCount - 1) {
      const fiberLeftPosition = leftPosition + stripWidth - 0.5;
      const fiber: RenderableComponentData = {
        id: fiberId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: generateFiberTexture(),
          className: 'absolute top-0 bottom-0',
          style: {
            left: `${fiberLeftPosition}%`,
            width: '1%',
            opacity: fiberOpacity,
          },
        },
        context: {
          timing: {
            start: stripStartTime,
            duration: animationDuration * 1.75, // Longer duration for fade out
          },
        },
        effects: [
          {
            id: `${fiberId}-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: animationDuration * 1.75,
              mode: 'provider',
              targetIds: [fiberId],
              ranges: [
                { key: 'opacity', val: fiberOpacity, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      fibers.push(fiber);
    }
  }

  // Create incoming video (starts at overlap)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionOverlap,
      },
    },
  };

  // Create outgoing video (starts at 0)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
  };

  // Create strips container
  const stripsContainer: RenderableComponentData = {
    id: 'strips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...strips, ...fibers] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'torn-paper-transition-root',
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
    childrenData: [
      incomingVideo,
      outgoingVideo,
      stripsContainer,
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
  id: 'torn-paper-rip-transition',
  title: 'Torn Paper Rip Transition',
  description:
    'A collage-style video transition where 7 vertical torn paper strips peel away with staggered timing and 3D curl transforms to reveal the incoming video underneath. Features organic torn edges, paper fiber texture overlays at tear boundaries, and sound trigger points for paper crinkle effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'torn-paper', 'collage', 'video', 'organic', '3d'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionOverlap: 2.5,
    stripCount: 7,
    staggerDelay: 0.1,
    animationDuration: 0.8,
    stripColor: '#FFFFFF',
    fiberOpacity: 0.6,
    enableSoundTriggers: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const tornPaperRipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
