/**
 * Liquid Morph Transition Preset
 *
 * This preset creates an advanced liquid morph transition between two videos.
 * The outgoing video appears to liquify and melt downward while the incoming video
 * crystallizes from the liquid form. The effect uses transform matrix manipulations
 * for wobble effects, combined with blur and contrast filters to enhance the
 * liquification appearance. Animated color streaks flow across the screen during
 * the transition to emphasize the liquid motion.
 *
 * Features:
 * - **Wobble Effect**: Transform matrix animations create wave-like distortions
 * - **Liquid Melting**: Outgoing video gradually melts downward with scaleY/translateY
 * - **Crystallization**: Incoming video emerges from blurred liquid form
 * - **Filter Animations**: Blur and contrast filters enhance liquification at midpoint
 * - **Color Streaks**: Animated gradient divs flow across screen during morph
 * - **2.2s Overlap**: Precise timing with cubic-bezier easing for smooth liquid motion
 *
 * Use cases:
 * - Creating dramatic video transitions with liquid effects
 * - Music videos with fluid, organic transitions
 * - Product reveals with melting/reforming animations
 * - Creative storytelling with morphing scene changes
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;

  // Calculate total duration (sum of videos minus overlap)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Color streak configurations (8 streaks with different colors and positions)
  const streakConfigs = [
    {
      id: 'streak-1',
      gradient:
        'linear-gradient(90deg, rgba(255,0,150,0.8), rgba(0,200,255,0.8))',
      top: '10%',
      delay: 0,
    },
    {
      id: 'streak-2',
      gradient:
        'linear-gradient(90deg, rgba(0,255,100,0.7), rgba(255,150,0,0.7))',
      top: '25%',
      delay: 0.1,
    },
    {
      id: 'streak-3',
      gradient:
        'linear-gradient(90deg, rgba(150,0,255,0.8), rgba(255,255,0,0.8))',
      top: '40%',
      delay: 0.15,
    },
    {
      id: 'streak-4',
      gradient:
        'linear-gradient(90deg, rgba(255,100,0,0.7), rgba(0,150,255,0.7))',
      top: '55%',
      delay: 0.2,
    },
    {
      id: 'streak-5',
      gradient:
        'linear-gradient(90deg, rgba(0,255,200,0.8), rgba(255,0,100,0.8))',
      top: '70%',
      delay: 0.25,
    },
    {
      id: 'streak-6',
      gradient:
        'linear-gradient(90deg, rgba(200,255,0,0.7), rgba(100,0,255,0.7))',
      top: '82%',
      delay: 0.3,
    },
    {
      id: 'streak-7',
      gradient:
        'linear-gradient(90deg, rgba(255,200,100,0.8), rgba(0,100,255,0.8))',
      top: '92%',
      delay: 0.35,
    },
    {
      id: 'streak-8',
      gradient:
        'linear-gradient(90deg, rgba(100,255,150,0.7), rgba(255,50,200,0.7))',
      top: '15%',
      delay: 0.4,
    },
  ];

  // Create color streak children
  const streakChildren: RenderableComponentData[] = streakConfigs.map(
    (config) => ({
      id: config.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute h-1 w-full',
        style: {
          background: config.gradient,
          top: config.top,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `${config.id}-animation`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            start: config.delay,
            duration: overlapDuration - config.delay,
            mode: 'provider',
            targetIds: [config.id],
            ranges: [
              { key: 'translateX', val: -100, prog: 0 },
              { key: 'translateX', val: 100, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create outgoing video with wobble and melt effects
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Wobble and melt transform effect
      {
        id: 'outgoing-wobble-transform',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // ScaleX wobble
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.05, prog: 0.15 },
            { key: 'scaleX', val: 0.98, prog: 0.3 },
            { key: 'scaleX', val: 1.02, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
            // ScaleY melt
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.98, prog: 0.15 },
            { key: 'scaleY', val: 1.2, prog: 0.5 },
            { key: 'scaleY', val: 1.2, prog: 1 },
            // TranslateY downward melt
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 5, prog: 0.3 },
            { key: 'translateY', val: 20, prog: 1 },
            // SkewX wobble
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: 2, prog: 0.2 },
            { key: 'skewX', val: -2, prog: 0.4 },
            { key: 'skewX', val: 0, prog: 0.6 },
          ],
        },
      },
      // Filter effects (blur and contrast)
      {
        id: 'outgoing-filter',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 8, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'contrast', val: 1, prog: 0 },
            { key: 'contrast', val: 1.5, prog: 0.5 },
            { key: 'contrast', val: 1, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with crystallization effects
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
    effects: [
      // Transform crystallization effect
      {
        id: 'incoming-transform',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // ScaleY expansion
            { key: 'scaleY', val: 0.8, prog: 0 },
            { key: 'scaleY', val: 0.9, prog: 0.5 },
            { key: 'scaleY', val: 1, prog: 1 },
            // TranslateY upward crystallization
            { key: 'translateY', val: -20, prog: 0 },
            { key: 'translateY', val: -10, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
            // ScaleX slight compression
            { key: 'scaleX', val: 1.05, prog: 0 },
            { key: 'scaleX', val: 1.02, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // Filter crystallization (blur to clear)
      {
        id: 'incoming-filter',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'blur', val: 8, prog: 0 },
            { key: 'blur', val: 4, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'contrast', val: 1.3, prog: 0 },
            { key: 'contrast', val: 1.2, prog: 0.5 },
            { key: 'contrast', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create color streaks container
  const colorStreaksContainer: RenderableComponentData = {
    id: 'color-streaks-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: streakChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-transition-container',
    type: 'layout' as const,
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
      outgoingVideoNode,
      incomingVideoNode,
      colorStreaksContainer,
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

const presetMetadata: PresetMetadata = {
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description:
    'Advanced liquid morph transition between two videos using transform, filter, and color streak animations with 2.2-second overlap timing',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'morph',
    'video',
    'advanced',
    'wobble',
    'melt',
    'crystallize',
    'streaks',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
