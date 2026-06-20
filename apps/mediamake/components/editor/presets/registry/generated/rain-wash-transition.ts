/**
 * Rain Wash Transition Preset
 *
 * Creates a weather-driven transition where raindrops wash away the outgoing video like watercolor,
 * revealing the incoming video. Features vertical rain streaks that start as individual drops and
 * merge into flowing streams, with directional blur, screen shake, and splash effects at the bottom.
 *
 * Features:
 * - 2.3-second overlap timing with realistic rain progression
 * - 20-30 vertical rain streaks with varying opacity and waviness
 * - Directional motion blur on outgoing video creating melting effect
 * - Subtle screen shake during heavy rain moments
 * - Splash effects at the bottom where streams collect
 * - Natural weather-driven feel with lighter and heavier rain periods
 * - Incoming video revealed through expanding vertical clip-path regions
 *
 * Use cases:
 * - Weather-themed transitions
 * - Emotional scene changes with water symbolism
 * - Music video transitions with rain aesthetics
 * - Storytelling transitions symbolizing cleansing or renewal
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
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time in seconds for outgoing video'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds for incoming video'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(2.3).describe('Duration of transition overlap in seconds'),
  rainIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity of rain effect (0.5-2)'),
  shakeIntensity: z.number().min(0).max(5).default(2).describe('Intensity of screen shake in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, rainIntensity, shakeIntensity } = params;

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate rain streak positions and properties
  const generateRainStreaks = (count: number) => {
    const streaks = [];
    for (let i = 0; i < count; i++) {
      streaks.push({
        id: `rain-streak-${i}`,
        left: `${randomInRange(0, 100)}%`,
        opacity: randomInRange(0.2, 0.35),
        animationDuration: randomInRange(0.8, 2),
        animationDelay: randomInRange(0, transitionDuration * 0.7),
        waveOffset: randomInRange(-3, 3),
      });
    }
    return streaks;
  };

  // Helper: Generate splash positions
  const generateSplashes = (count: number) => {
    const splashes = [];
    for (let i = 0; i < count; i++) {
      splashes.push({
        id: `splash-${i}`,
        left: `${randomInRange(0, 100)}%`,
        size: randomInRange(8, 16),
        animationDelay: randomInRange(0.5, transitionDuration * 0.8),
        animationDuration: randomInRange(0.3, 0.6),
      });
    }
    return splashes;
  };

  const rainStreaks = generateRainStreaks(25);
  const splashes = generateSplashes(12);

  // Rain streak children
  const rainStreakChildren: RenderableComponentData[] = rainStreaks.map((streak) => ({
    id: streak.id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute w-1 h-full',
      style: {
        left: streak.left,
        background: `linear-gradient(180deg, transparent 0%, rgba(255,255,255,${streak.opacity}) 50%, transparent 100%)`,
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: `${streak.id}-flow`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: streak.animationDelay,
          duration: streak.animationDuration * rainIntensity,
          mode: 'provider',
          targetIds: [streak.id],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
            { key: 'translateX', val: `${streak.waveOffset}px`, prog: 0 },
            { key: 'translateX', val: `${-streak.waveOffset}px`, prog: 0.5 },
            { key: 'translateX', val: `${streak.waveOffset}px`, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.9 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Splash children
  const splashChildren: RenderableComponentData[] = splashes.map((splash) => ({
    id: splash.id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute bottom-0 rounded-full',
      style: {
        left: splash.left,
        width: `${splash.size}px`,
        height: `${splash.size}px`,
        backgroundColor: 'rgba(255,255,255,0.4)',
        transform: 'scale(0)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: `${splash.id}-splash`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: splash.animationDelay,
          duration: splash.animationDuration,
          mode: 'provider',
          targetIds: [splash.id],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.5, prog: 0.5 },
            { key: 'scale', val: 0, prog: 1 },
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Build composition
  const rootContainer: RenderableComponentData = {
    id: 'rain-wash-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000',
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
      // Outgoing video
      {
        id: 'outgoing-video-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [
          {
            id: 'outgoing-video',
            type: 'atom' as const,
            componentId: 'VideoAtom',
            data: {
              src: outgoingVideo.src,
              className: 'w-full h-full object-cover',
              startFrom: outgoingVideo.startFrom || 0,
              fit: 'cover',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            effects: [
              // Directional blur and stretch effect
              {
                id: 'outgoing-blur',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['outgoing-video'],
                  ranges: [
                    { key: 'filter', val: 'blur(0px)', prog: 0 },
                    { key: 'filter', val: 'blur(4px)', prog: 1 },
                    { key: 'scaleY', val: 1, prog: 0 },
                    { key: 'scaleY', val: 1.02, prog: 1 },
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
              // Screen shake during heavy rain moments
              {
                id: 'outgoing-shake-1',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: transitionDuration * 0.3,
                  duration: 0.3,
                  mode: 'provider',
                  targetIds: ['outgoing-video-wrapper'],
                  ranges: [
                    { key: 'translateX', val: `${shakeIntensity}px`, prog: 0 },
                    { key: 'translateX', val: `${-shakeIntensity}px`, prog: 0.25 },
                    { key: 'translateX', val: `${shakeIntensity}px`, prog: 0.5 },
                    { key: 'translateX', val: `${-shakeIntensity}px`, prog: 0.75 },
                    { key: 'translateX', val: '0px', prog: 1 },
                  ],
                },
              },
              {
                id: 'outgoing-shake-2',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: transitionDuration * 0.7,
                  duration: 0.3,
                  mode: 'provider',
                  targetIds: ['outgoing-video-wrapper'],
                  ranges: [
                    { key: 'translateX', val: `${shakeIntensity * 0.7}px`, prog: 0 },
                    { key: 'translateX', val: `${-shakeIntensity * 0.7}px`, prog: 0.25 },
                    { key: 'translateX', val: `${shakeIntensity * 0.7}px`, prog: 0.5 },
                    { key: 'translateX', val: `${-shakeIntensity * 0.7}px`, prog: 0.75 },
                    { key: 'translateX', val: '0px', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
      // Rain streaks container
      {
        id: 'rain-streaks-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: rainStreakChildren,
      } as RenderableComponentData,
      // Splash container
      {
        id: 'splash-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-0 left-0 right-0 h-24 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: splashChildren,
      } as RenderableComponentData,
      // Incoming video
      {
        id: 'incoming-video-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [
          {
            id: 'incoming-video',
            type: 'atom' as const,
            componentId: 'VideoAtom',
            data: {
              src: incomingVideo.src,
              className: 'w-full h-full object-cover',
              startFrom: incomingVideo.startFrom || 0,
              fit: 'cover',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            effects: [
              // Reveal through clip-path expansion
              {
                id: 'incoming-reveal',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['incoming-video'],
                  ranges: [
                    { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
                    { key: 'clipPath', val: 'inset(0% 0 0 0)', prog: 1 },
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.3 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
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
  id: 'rain-wash-transition',
  title: 'Rain Wash Transition',
  description: 'Weather-driven transition where raindrops wash away the outgoing video like watercolor, revealing the incoming video with vertical streaks, blur, shake, and splash effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'rain', 'weather', 'water', 'wash', 'blur', 'shake', 'splash', 'vertical-streaks'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 2.3,
    rainIntensity: 1,
    shakeIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const rainWashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
