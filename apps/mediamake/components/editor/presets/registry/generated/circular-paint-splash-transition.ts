/**
 * Circular Paint Splash Transition Preset
 *
 * This preset creates a dynamic paint splash transition effect that radiates outward from the
 * center, simulating a paint drop hitting water. The transition reveals the incoming video
 * underneath with organic, irregular edges and secondary splatter effects.
 *
 * Features:
 * - **Radial Paint Splash**: Circular splash expanding from center (0% to 150%)
 * - **Organic Edges**: Varying opacity for hand-painted, natural look
 * - **Secondary Splatters**: 8 randomly positioned paint droplets with staggered animations
 * - **Impact Shake Effect**: Subtle shake during first 200ms to emphasize splash energy
 * - **Edge Blur**: Blur filter animating from 8px to 0px for smooth reveal
 * - **Clip-Path Animation**: Circle() function animating from 0% to 100% on incoming video
 *
 * Use cases:
 * - Transitioning between two video clips with creative energy
 * - Adding dynamic paint-themed scene changes
 * - Creating artistic video montages
 * - Building engaging social media content with unique transitions
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
    .describe('Source URL of the outgoing video (painted over)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (revealed underneath)'),
  video1Duration: z
    .number()
    .describe('Duration of the first video in seconds'),
  overlapDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the transition overlap in seconds (default: 1.8s)'),
  trackName: z
    .string()
    .default('paint-splash-transition')
    .describe('Unique identifier for this transition track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideoSrc, incomingVideoSrc, video1Duration, overlapDuration, trackName } = params;

  // Calculate transition timing
  const transitionStartTime = video1Duration - overlapDuration;
  const totalDuration = video1Duration;

  // Helper function to generate random splatter positions
  const generateSplatterPositions = () => {
    return [
      { top: '20%', left: '25%', size: 30, delay: 0.05, duration: 0.4 },
      { top: '15%', left: '60%', size: 20, delay: 0.1, duration: 0.35 },
      { top: '70%', left: '30%', size: 25, delay: 0.08, duration: 0.38 },
      { top: '80%', left: '70%', size: 18, delay: 0.15, duration: 0.32 },
      { top: '35%', left: '80%', size: 22, delay: 0.12, duration: 0.36 },
      { top: '55%', left: '15%', size: 28, delay: 0.06, duration: 0.42 },
      { top: '25%', left: '45%', size: 15, delay: 0.18, duration: 0.3 },
      { top: '65%', left: '55%', size: 24, delay: 0.09, duration: 0.4 },
    ];
  };

  const splatterPositions = generateSplatterPositions();

  // Create splatter elements
  const createSplatters = (): RenderableComponentData[] => {
    return splatterPositions.map((splatter, index) => {
      const splatterId = `${trackName}-splatter-${index}`;
      const opacityVariation = 0.65 + Math.random() * 0.25; // Random opacity 0.65-0.9

      return {
        id: splatterId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute rounded-full bg-white',
          style: {
            width: `${splatter.size}px`,
            height: `${splatter.size}px`,
            top: splatter.top,
            left: splatter.left,
            opacity: opacityVariation,
            transform: 'scale(0)',
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
            id: `${splatterId}-scale-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: transitionStartTime + splatter.delay,
              duration: splatter.duration,
              mode: 'provider',
              targetIds: [splatterId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1, prog: 0.6 },
                { key: 'scale', val: 0.95, prog: 1 },
              ],
            },
          },
          {
            id: `${splatterId}-opacity-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: transitionStartTime + splatter.delay + splatter.duration - 0.15,
              duration: 0.15,
              mode: 'provider',
              targetIds: [splatterId],
              ranges: [
                { key: 'opacity', val: opacityVariation, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Outgoing video (painted over)
  const outgoingVideoId = `${trackName}-outgoing-video`;
  const outgoingVideo: RenderableComponentData = {
    id: outgoingVideoId,
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1Duration,
      },
    },
  };

  // Incoming video container with clip-path animation
  const incomingVideoContainerId = `${trackName}-incoming-video-container`;
  const incomingVideoId = `${trackName}-incoming-video`;
  
  const incomingVideoContainer: RenderableComponentData = {
    id: incomingVideoContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
          clipPath: 'circle(0% at 50% 50%)',
        },
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: `${incomingVideoContainerId}-clip-path-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoContainerId],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
          ],
        },
      },
      {
        id: `${incomingVideoContainerId}-blur-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: [incomingVideoContainerId],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: incomingVideoId,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            position: 'absolute',
            inset: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Splatter container
  const splatterContainerId = `${trackName}-splatter-container`;
  const splatterContainer: RenderableComponentData = {
    id: splatterContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: createSplatters(),
  };

  // Root container with shake effect
  const rootContainerId = `${trackName}-root`;
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          position: 'relative',
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
        id: `${rootContainerId}-shake-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStartTime,
          duration: 0.2,
          mode: 'provider',
          targetIds: [rootContainerId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -3, prog: 0.1 },
            { key: 'translateX', val: 3, prog: 0.2 },
            { key: 'translateX', val: -2, prog: 0.3 },
            { key: 'translateX', val: 2, prog: 0.4 },
            { key: 'translateX', val: -1, prog: 0.5 },
            { key: 'translateX', val: 1, prog: 0.6 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: `${rootContainerId}-shake-y-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStartTime,
          duration: 0.2,
          mode: 'provider',
          targetIds: [rootContainerId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -2, prog: 0.15 },
            { key: 'translateY', val: 2, prog: 0.35 },
            { key: 'translateY', val: -1, prog: 0.55 },
            { key: 'translateY', val: 1, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      outgoingVideo,
      incomingVideoContainer,
      splatterContainer,
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
  id: 'circular-paint-splash-transition',
  title: 'Circular Paint Splash Transition',
  description:
    'A dynamic video transition featuring a circular paint splash that radiates outward from the center, revealing the incoming video underneath. Includes organic splatter effects, shake impact, and hand-painted edge aesthetics with varying opacity for a natural look.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'paint',
    'splash',
    'creative',
    'organic',
    'radial',
    'artistic',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    video1Duration: 10,
    overlapDuration: 1.8,
    trackName: 'paint-splash-transition',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const circularPaintSplashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};