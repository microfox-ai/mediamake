/**
 * Video Game Menu Transition with XP Progress Bar
 *
 * This preset creates a video game-style menu transition with the following features:
 * - Outgoing video pixelates progressively (using multiple overlaid versions with blur/scale) and slides left
 * - XP progress bar with animated fill based on 'XP points' parameter
 * - Particle burst effects at milestones (25%, 50%, 75%, 100%)
 * - Coin/star collection visual indicators at milestone points
 * - Incoming video assembles from pixels (starting pixelated, becoming clear) and slides in from right
 *
 * Technical Implementation:
 * - BaseLayout with 1s overlap between outgoing and incoming videos
 * - Pixelation: 3 VideoAtom layers with increasing filter blur (0px, 4px, 8px) and scale (1, 1.2, 1.5)
 * - XP bar: HTMLBlockAtom container with gradient fill, width animates 0% to 100%
 * - Particle bursts: HTMLBlockAtom elements that scale and fade at milestone points
 * - Incoming video: initial blur(8px) animates to blur(0px), translateX from 100% to 0%
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
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
  }),
  xpPoints: z
    .number()
    .min(0)
    .max(100)
    .default(100)
    .describe('XP points progress (0-100) - controls bar fill animation'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Total duration of the transition in seconds'),
  overlapDuration: z
    .number()
    .default(1)
    .describe('Duration of overlap between outgoing and incoming videos in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, xpPoints, transitionDuration, overlapDuration } = params;

  // Calculate timing
  const outgoingDuration = transitionDuration - overlapDuration / 2;
  const incomingStart = transitionDuration - overlapDuration;
  const incomingDuration = transitionDuration - incomingStart;

  // XP bar timing - bar fills over the transition
  const xpBarStart = 0;
  const xpBarDuration = transitionDuration;

  // Milestone timings (25%, 50%, 75%, 100% of XP bar fill)
  const milestones = [
    { percent: 25, time: xpBarDuration * 0.25 },
    { percent: 50, time: xpBarDuration * 0.5 },
    { percent: 75, time: xpBarDuration * 0.75 },
    { percent: 100, time: xpBarDuration * 1.0 },
  ];

  // Particle effect duration
  const particleEffectDuration = 0.4;

  // Outgoing video layers (base + 2 blurred/scaled copies)
  const outgoingVideoLayers: RenderableComponentData[] = [
    // Clear layer (no blur, scale 1)
    {
      id: 'outgoing-video-clear',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full',
        style: {
          filter: 'blur(0px)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Slide left effect
        {
          id: 'outgoing-clear-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: outgoingDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-clear'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
            ],
          },
        },
        // Fade out with staggered timing
        {
          id: 'outgoing-clear-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingDuration * 0.6,
            duration: outgoingDuration * 0.4,
            mode: 'provider',
            targetIds: ['outgoing-video-clear'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Blur 4px layer (scale 1.2)
    {
      id: 'outgoing-video-blur-4',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full absolute inset-0',
        style: {
          filter: 'blur(4px)',
          transform: 'scale(1.2)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Slide left
        {
          id: 'outgoing-blur4-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: outgoingDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-blur-4'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
            ],
          },
        },
        // Fade out staggered
        {
          id: 'outgoing-blur4-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingDuration * 0.5,
            duration: outgoingDuration * 0.5,
            mode: 'provider',
            targetIds: ['outgoing-video-blur-4'],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Blur 8px layer (scale 1.5)
    {
      id: 'outgoing-video-blur-8',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full absolute inset-0',
        style: {
          filter: 'blur(8px)',
          transform: 'scale(1.5)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Slide left
        {
          id: 'outgoing-blur8-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: outgoingDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-blur-8'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
            ],
          },
        },
        // Fade out staggered
        {
          id: 'outgoing-blur8-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingDuration * 0.4,
            duration: outgoingDuration * 0.6,
            mode: 'provider',
            targetIds: ['outgoing-video-blur-8'],
            ranges: [
              { key: 'opacity', val: 0.4, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: outgoingVideoLayers,
  };

  // XP bar background
  const xpBarBg: RenderableComponentData = {
    id: 'xp-bar-bg',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 40px; background: rgba(0, 0, 0, 0.7); border: 3px solid #FFD700; border-radius: 20px;"></div>`,
      className: 'w-full',
    },
    context: {
      timing: {
        start: 0,
        duration: xpBarDuration,
      },
    },
  };

  // XP bar fill (animates width based on xpPoints)
  const xpBarFill: RenderableComponentData = {
    id: 'xp-bar-fill',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="height: 34px; background: linear-gradient(to right, #FBBF24, #F59E0B); border-radius: 17px; position: absolute; top: 3px; left: 3px;"></div>`,
      className: 'absolute',
    },
    context: {
      timing: {
        start: 0,
        duration: xpBarDuration,
      },
    },
    effects: [
      {
        id: 'xp-bar-fill-animation',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: xpBarDuration,
          mode: 'provider',
          targetIds: ['xp-bar-fill'],
          ranges: [
            { key: 'width', val: '0%', prog: 0 },
            { key: 'width', val: `${xpPoints}%`, prog: 1 },
          ],
        },
      },
    ],
  };

  // Particle bursts at milestones
  const particleBursts: RenderableComponentData[] = milestones.map((milestone, idx) => {
    return {
      id: `particle-${milestone.percent}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 20px; height: 20px; background: #FFD700; border-radius: 50%; position: absolute; left: ${milestone.percent}%; top: -30px; transform: translate(-50%, 0);"></div>`,
        className: 'absolute',
      },
      context: {
        timing: {
          start: milestone.time,
          duration: particleEffectDuration,
        },
      },
      effects: [
        // Scale and fade effect
        {
          id: `particle-${milestone.percent}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: particleEffectDuration,
            mode: 'provider',
            targetIds: [`particle-${milestone.percent}`],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 2, prog: 0.5 },
              { key: 'scale', val: 1.5, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '-20px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Coin/star indicators at milestones
  const coinIndicators: RenderableComponentData[] = milestones.slice(0, 3).map((milestone, idx) => {
    const positions = [20, 50, 80]; // Left percentages for 3 indicators
    return {
      id: `coin-indicator-${idx + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 30px; height: 30px; background: #FFD700; border-radius: 50%; border: 2px solid #FFF; position: absolute; top: -60px; left: ${positions[idx]}%; transform: translate(-50%, 0); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #FFF;">★</div>`,
        className: 'absolute',
      },
      context: {
        timing: {
          start: milestone.time,
          duration: 0.5,
        },
      },
      effects: [
        // Pop-in effect
        {
          id: `coin-indicator-${idx + 1}-effect`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: [`coin-indicator-${idx + 1}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // XP bar container with all XP bar elements
  const xpBarContainer: RenderableComponentData = {
    id: 'xp-bar-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-20 left-1/2 transform -translate-x-1/2 w-4/5 max-w-2xl',
        style: {
          position: 'relative',
        },
      },
    },
    context: {
      timing: {
        start: xpBarStart,
        duration: xpBarDuration,
      },
    },
    childrenData: [xpBarBg, xpBarFill, ...particleBursts, ...coinIndicators],
  };

  // Incoming video (starts pixelated, becomes clear, slides in from right)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'w-full h-full',
    },
    context: {
      timing: {
        start: 0,
        duration: incomingDuration,
      },
    },
    effects: [
      // De-blur effect (pixelated to clear)
      {
        id: 'incoming-deblur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Slide in from right
      {
        id: 'incoming-slide',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
      // Fade in
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingDuration * 0.5,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    childrenData: [incomingVideo],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'video-game-menu-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingContainer, xpBarContainer, incomingContainer],
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
  id: 'video-game-menu-transition',
  title: 'Video Game Menu Transition with XP Progress Bar',
  description:
    'Game-style transition with pixelated outgoing video sliding left, animated XP progress bar with milestone particle bursts (25%, 50%, 75%, 100%), and incoming video assembling from pixels while sliding right. Features layered blur effects for pixelation, gradient XP bar with fill animation, particle effects at milestones, and coin/star collection visual indicators.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video-game', 'xp-bar', 'pixelation', 'particles', 'gaming', 'menu'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
    },
    xpPoints: 100,
    transitionDuration: 2,
    overlapDuration: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const videoGameMenuTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
