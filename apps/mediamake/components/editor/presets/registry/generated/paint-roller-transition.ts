/**
 * Paint Roller Transition Preset
 *
 * This preset simulates a paint roller moving vertically down the screen in 3 passes,
 * revealing the incoming video progressively. Each pass has a bounce effect at start/end,
 * visible paint texture with transparency variations, and paint splatter particles.
 *
 * Features:
 * - 3 roller passes at different horizontal positions with overlapping coverage
 * - Paint texture with repeating linear-gradient for roller marks
 * - Bounce effect using cubic-bezier easing
 * - Paint streak artifacts on outgoing video where roller has passed
 * - Paint splatter particles that fly off during roller movement
 * - Backdrop blur on roller divs
 * - 2-second overlap transition period
 *
 * Use cases:
 * - Creative video transitions with a painting/artistic theme
 * - Adding texture and character to scene changes
 * - Creating engaging visual storytelling with handcrafted feel
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
    .describe('Source URL of the outgoing video (being painted over)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (being revealed)'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideoSrc, incomingVideoSrc, transitionDuration } = params;

  // Stagger timings for 3 roller passes
  const rollerStartTimes = [0, 0.2, 0.4]; // Seconds
  const rollerDuration = 1.5; // Duration for each roller to move from top to bottom
  const totalDuration = transitionDuration;

  // Particle animation timings
  const particleAnimations = [
    { left: '15%', top: '20%', startTime: 0.3, endX: -30, endY: 50, rotation: 45 },
    { left: '18%', top: '35%', startTime: 0.5, endX: 20, endY: 40, rotation: -30 },
    { left: '12%', top: '50%', startTime: 0.7, endX: -40, endY: 60, rotation: 60 },
    { left: '48%', top: '25%', startTime: 0.5, endX: 30, endY: 50, rotation: -45 },
    { left: '52%', top: '40%', startTime: 0.7, endX: -20, endY: 45, rotation: 30 },
    { left: '45%', top: '55%', startTime: 0.9, endX: 35, endY: 55, rotation: -60 },
    { left: '82%', top: '30%', startTime: 0.7, endX: 25, endY: 48, rotation: 50 },
    { left: '78%', top: '45%', startTime: 0.9, endX: -35, endY: 52, rotation: -40 },
    { left: '85%', top: '60%', startTime: 1.1, endX: 40, endY: 58, rotation: 35 },
    { left: '20%', top: '70%', startTime: 1.0, endX: -25, endY: 50, rotation: -50 },
    { left: '55%', top: '75%', startTime: 1.2, endX: 30, endY: 55, rotation: 40 },
    { left: '75%', top: '80%', startTime: 1.3, endX: -30, endY: 60, rotation: -35 },
  ];

  // Create particle components
  const particleComponents: RenderableComponentData[] = particleAnimations.map(
    (particle, index) => ({
      id: `particle-${index + 1}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full',
          style: {
            width: index % 3 === 0 ? '5px' : index % 2 === 0 ? '4px' : '3px',
            height: index % 3 === 0 ? '5px' : index % 2 === 0 ? '4px' : '3px',
            backgroundColor: `rgba(255, 255, 255, ${0.6 + (index % 4) * 0.1})`,
            left: particle.left,
            top: particle.top,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `particle-effect-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: particle.startTime,
            duration: 0.6,
            mode: 'provider',
            targetIds: [`particle-${index + 1}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: particle.endX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: particle.endY, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: particle.rotation, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    })
  );

  // Create roller pass components with effects
  const rollerComponents: RenderableComponentData[] = [
    { left: '0%', width: '35%', index: 1 },
    { left: '32%', width: '35%', index: 2 },
    { left: '65%', width: '35%', index: 3 },
  ].map((roller) => ({
    id: `roller-zone-${roller.index}`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full',
        style: {
          width: roller.width,
          left: roller.left,
          zIndex: 10,
          background:
            'repeating-linear-gradient(180deg, rgba(180,180,180,0.6) 0px, rgba(220,220,220,0.4) 2px, rgba(180,180,180,0.6) 4px)',
          backdropFilter: 'blur(2px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `roller-animation-${roller.index}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: rollerStartTimes[roller.index - 1],
          duration: rollerDuration,
          mode: 'provider',
          targetIds: [`roller-zone-${roller.index}`],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  }));

  // Create incoming video layers (revealed by rollers)
  const incomingVideoLayers: RenderableComponentData[] = [
    { left: '0%', width: '35%', index: 1, videoLeft: '0%', fadeStart: 0.3 },
    { left: '32%', width: '35%', index: 2, videoLeft: '-91.4%', fadeStart: 0.5 },
    { left: '65%', width: '35%', index: 3, videoLeft: '-185.7%', fadeStart: 0.7 },
  ].map((layer) => ({
    id: `incoming-video-layer-${layer.index}`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full overflow-hidden',
        style: {
          width: layer.width,
          left: layer.left,
          zIndex: 5,
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `incoming-fade-${layer.index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: layer.fadeStart,
          duration: 0.4,
          mode: 'provider',
          targetIds: [`incoming-video-layer-${layer.index}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: `incoming-video-${layer.index}`,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            width: '300%',
            left: layer.videoLeft,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      },
    ],
  }));

  // Create streak overlays on outgoing video
  const streakComponents: RenderableComponentData[] = [
    { left: '0%', index: 1, fadeStart: 0.5 },
    { left: '33.33%', index: 2, fadeStart: 0.7 },
    { left: '66.66%', index: 3, fadeStart: 0.9 },
  ].map((streak) => ({
    id: `streak-${streak.index}`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full',
        style: {
          width: '33.33%',
          left: streak.left,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(200,200,200,0.15) 50%, rgba(255,255,255,0.1) 100%)',
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `streak-fade-${streak.index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: streak.fadeStart,
          duration: 0.3,
          mode: 'provider',
          targetIds: [`streak-${streak.index}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Outgoing video layer with streaks
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      },
      {
        id: 'streak-overlay',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 2,
              mixBlendMode: 'multiply',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: streakComponents,
      },
    ],
  };

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 15,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: particleComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paint-roller-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-100 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoLayer,
      ...rollerComponents,
      ...incomingVideoLayers,
      particleContainer,
    ],
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
  id: 'paint-roller-transition',
  title: 'Paint Roller Transition',
  description:
    'A transition effect simulating a paint roller moving vertically down the screen in 3 staggered passes, each revealing more of the incoming video. Features paint texture with transparency variations, bounce effects at start/end, paint streak artifacts on outgoing video, and paint splatter particles flying off during movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'paint',
    'roller',
    'artistic',
    'texture',
    'particles',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paintRollerTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};