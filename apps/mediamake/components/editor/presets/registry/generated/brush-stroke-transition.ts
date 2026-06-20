/**
 * Brush Stroke Transition Preset
 *
 * This preset creates a dynamic brush stroke transition that reveals the incoming video
 * as if being painted on with an artistic brush. The brush moves diagonally from 
 * bottom-left to top-right with paint-like texture and organic motion.
 *
 * Features:
 * - Diagonal brush stroke movement (bottom-left to top-right)
 * - Organic paint reveal animation with scale and opacity effects
 * - Animated paint splatter particles trailing the brush
 * - Customizable transition duration and intensity
 * - Artistic, handcrafted aesthetic
 *
 * Use cases:
 * - Creative video transitions for art/design content
 * - Organic reveals for storytelling videos
 * - Artistic transitions between video clips
 * - Paint-themed visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video clip'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video clip'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Total duration of the transition in seconds'),
  brushMovementDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of brush stroke movement in seconds'),
  splatterCount: z
    .number()
    .int()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of paint splatter particles'),
  splatterStartDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Delay before splatters start appearing (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    brushMovementDuration,
    splatterCount,
    splatterStartDelay,
  } = params;

  // Helper: Create splatter particles with staggered timing and random positioning
  const createSplatters = (count: number, startDelay: number) => {
    const splatters: RenderableComponentData[] = [];
    const delayIncrement = 0.05; // 50ms between each splatter
    const splatterDuration = 0.7; // Duration of each splatter animation

    for (let i = 0; i < count; i++) {
      const splatterId = `splatter-${i}`;
      const splatterDelay = startDelay + i * delayIncrement;

      // Random positioning along diagonal path (bottom-left to top-right)
      const progress = (i / (count - 1)) * 0.7 + 0.15; // 15% to 85% along path
      const leftPercent = progress * 100;
      const topPercent = 100 - progress * 100;

      // Random size variations
      const sizes = [8, 10, 12, 15, 18];
      const size = sizes[i % sizes.length];

      // Random opacity variations
      const opacities = [0.65, 0.7, 0.75, 0.8];
      const opacity = opacities[i % opacities.length];

      // Random movement distances
      const moveXDistances = [20, 25, 30, 35, 40, 45];
      const moveYDistances = [-20, -25, -30, -35, -40];
      const moveX = moveXDistances[i % moveXDistances.length];
      const moveY = moveYDistances[i % moveYDistances.length];

      splatters.push({
        id: splatterId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute rounded-full bg-white',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            left: `${leftPercent}%`,
            top: `${topPercent}%`,
            opacity: opacity,
          },
        },
        context: {
          timing: {
            start: splatterDelay,
            duration: splatterDuration,
          },
        },
        effects: [
          // Scale animation (pop in and out)
          {
            id: `${splatterId}-scale`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: 0,
              duration: 0.4,
              mode: 'provider',
              targetIds: [splatterId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.7 },
                { key: 'scale', val: 0, prog: 1 },
              ],
            },
          },
          // Movement along diagonal
          {
            id: `${splatterId}-move-x`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.5,
              mode: 'provider',
              targetIds: [splatterId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: moveX, prog: 1 },
              ],
            },
          },
          {
            id: `${splatterId}-move-y`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.5,
              mode: 'provider',
              targetIds: [splatterId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: moveY, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return splatters;
  };

  // Create child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (fades out)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0.4,
            duration: 0.8,
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

    // Incoming video (fades in with scale)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: brushMovementDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-scale',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: brushMovementDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 1.1, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Brush overlay (visual texture element)
    {
      id: 'brush-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)',
          mixBlendMode: 'overlay',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: brushMovementDuration,
        },
      },
      effects: [
        // Diagonal movement (bottom-left to top-right)
        {
          id: 'brush-diagonal-move-x',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: brushMovementDuration,
            mode: 'provider',
            targetIds: ['brush-overlay'],
            ranges: [
              { key: 'translateX', val: -120, prog: 0 },
              { key: 'translateX', val: 120, prog: 1 },
            ],
          },
        },
        {
          id: 'brush-diagonal-move-y',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: brushMovementDuration,
            mode: 'provider',
            targetIds: ['brush-overlay'],
            ranges: [
              { key: 'translateY', val: 120, prog: 0 },
              { key: 'translateY', val: -120, prog: 1 },
            ],
          },
        },
        // Scale for organic growth
        {
          id: 'brush-scale',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: brushMovementDuration,
            mode: 'provider',
            targetIds: ['brush-overlay'],
            ranges: [
              { key: 'scale', val: 1.5, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
            ],
          },
        },
        // Fade out at the end
        {
          id: 'brush-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0.5,
            duration: 0.3,
            mode: 'provider',
            targetIds: ['brush-overlay'],
            ranges: [
              { key: 'opacity', val: 0.9, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Paint splatter particles
    ...createSplatters(splatterCount, splatterStartDelay),
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'brush-stroke-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'children',
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

const presetMetadata: PresetMetadata = {
  id: 'brush-stroke-transition',
  title: 'Artistic Brush Stroke Transition',
  description:
    'A dynamic brush stroke transition preset that reveals the incoming video clip as if being painted on with an artistic brush. Features diagonal brush movement from bottom-left to top-right with natural paint-like texture, opacity-based crossfade with scale animation for organic reveal, and animated paint splatter particles trailing the brush edges. The transition feels handcrafted and artistic, like a painter revealing a masterpiece.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'brush',
    'paint',
    'artistic',
    'diagonal',
    'organic',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.2,
    brushMovementDuration: 0.8,
    splatterCount: 6,
    splatterStartDelay: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const brushStrokeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
