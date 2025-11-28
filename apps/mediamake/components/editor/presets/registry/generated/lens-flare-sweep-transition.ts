/**
 * Lens Flare Sweep Transition Preset
 *
 * This preset creates a cinematic lens flare transition that simulates a camera catching bright light 
 * as it pans between two video scenes. The transition features:
 * 
 * - Horizontal light streak traveling across the frame
 * - Soft bokeh orbs and chromatic aberrations following the flare
 * - Progressive overexposure and blur on the outgoing video
 * - Incoming video emerges from overexposed state with lens artifacts
 * - Rainbow-colored light leaks and hexagonal bokeh shapes
 * - Subtle anamorphic streaks for cinematic feel
 * 
 * Use cases:
 * - Professional video transitions with cinematographer-style light effects
 * - Music videos and artistic content
 * - Fashion or lifestyle video editing
 * - Any content requiring elegant, light-based scene changes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the first/outgoing video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video that transitions out'),
  media2: z.object({
    src: z.string().describe('Source URL of the second/incoming video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video that transitions in'),
  transitionDuration: z.number().default(1.8).describe('Duration of the lens flare transition effect in seconds'),
  flareSpeed: z.number().default(1.5).describe('Speed of the main flare streak (higher = faster)'),
  bokehCount: z.number().default(5).describe('Number of bokeh orbs to generate'),
  chromaticIntensity: z.number().default(0.8).describe('Intensity of chromatic aberration effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, flareSpeed, bokehCount, chromaticIntensity } = params;

  // Calculate total duration with overlap
  const totalDuration = media1.duration + media2.duration - transitionDuration;

  // Flare starts slightly before media1 ends
  const flareStartTime = media1.duration - transitionDuration;

  // Create bokeh orbs with varied properties
  const createBokehOrbs = (count: number): RenderableComponentData[] => {
    const bokehs: RenderableComponentData[] = [];
    
    for (let i = 0; i < count; i++) {
      const isHexagonal = i % 3 === 0; // Every 3rd bokeh is hexagonal
      const size = 60 + Math.random() * 60; // Random size 60-120px
      const topPosition = 20 + Math.random() * 60; // Random vertical position 20-80%
      const delay = i * 0.05; // Staggered delays
      const duration = 1.3 + Math.random() * 0.3; // Varied durations
      const hue = 180 + Math.random() * 60; // Blue-cyan-purple hues
      
      const bokehId = `bokeh-${i}`;
      
      if (isHexagonal) {
        // Hexagonal bokeh using clip-path
        bokehs.push({
          id: bokehId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${size}px; height: ${size}px; background: radial-gradient(circle, hsla(${hue}, 80%, 70%, 0.5), transparent); clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);"></div>`,
            className: 'absolute',
            style: {
              top: `${topPosition}%`,
              left: '20%',
            },
          },
          context: {
            timing: {
              start: delay,
              duration: duration,
            },
          },
          effects: [
            {
              id: `${bokehId}-move`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: [bokehId],
                ranges: [
                  { key: 'translateX', val: -50, prog: 0, unit: '%' },
                  { key: 'translateX', val: 150, prog: 1, unit: '%' },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.7, prog: 0.3 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0, unit: 'deg' },
                  { key: 'rotate', val: 180, prog: 1, unit: 'deg' },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      } else {
        // Circular bokeh
        bokehs.push({
          id: bokehId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${size}px; height: ${size}px; background: radial-gradient(circle, hsla(${hue}, 70%, 65%, 0.4), transparent); border-radius: 50%;"></div>`,
            className: 'absolute',
            style: {
              top: `${topPosition}%`,
              left: '30%',
            },
          },
          context: {
            timing: {
              start: delay,
              duration: duration,
            },
          },
          effects: [
            {
              id: `${bokehId}-move`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: [bokehId],
                ranges: [
                  { key: 'translateX', val: -60, prog: 0, unit: '%' },
                  { key: 'translateX', val: 160, prog: 1, unit: '%' },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.65, prog: 0.35 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }
    }
    
    return bokehs;
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing video wrapper
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
          duration: media1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: media1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-brightness-blur',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: media1.duration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'brightness', val: 1, prog: 0 },
                  { key: 'brightness', val: 3, prog: 1 },
                  { key: 'blur', val: 0, prog: 0 },
                  { key: 'blur', val: 25, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Flare effects layer
    {
      id: 'flare-effects-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: flareStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Main flare streak
        {
          id: 'main-flare-streak',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; top: 50%; left: 0; transform: translateY(-50%); width: 100%; height: 2px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), white, rgba(255,255,255,0.3), transparent); box-shadow: 0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6), 0 0 90px rgba(255,255,255,0.3);"></div>`,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: flareSpeed,
            },
          },
          effects: [
            {
              id: 'flare-sweep',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: flareSpeed,
                mode: 'provider',
                targetIds: ['main-flare-streak'],
                ranges: [
                  { key: 'translateX', val: -100, prog: 0, unit: '%' },
                  { key: 'translateX', val: 200, prog: 1, unit: '%' },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Bokeh orbs
        ...createBokehOrbs(bokehCount),

        // Chromatic aberration overlay
        {
          id: 'chromatic-aberration-overlay',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,0,100,${chromaticIntensity * 0.15}) 0%, transparent 20%, transparent 80%, rgba(0,150,255,${chromaticIntensity * 0.15}) 100%); mix-blend-mode: screen;"></div>`,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0.3,
              duration: 1.2,
            },
          },
          effects: [
            {
              id: 'chromatic-fade',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: 1.2,
                mode: 'provider',
                targetIds: ['chromatic-aberration-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: chromaticIntensity, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Rainbow light leak
        {
          id: 'rainbow-light-leak',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; top: 0; right: 0; width: 40%; height: 100%; background: linear-gradient(135deg, rgba(255,100,255,0.3), rgba(255,200,100,0.2), transparent 60%); mix-blend-mode: screen;"></div>`,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0.5,
              duration: 1.0,
            },
          },
          effects: [
            {
              id: 'light-leak-fade',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: 1.0,
                mode: 'provider',
                targetIds: ['rainbow-light-leak'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.7, prog: 0.4 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Anamorphic horizontal streaks
        {
          id: 'anamorphic-streaks',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; top: 30%; left: 0; width: 100%; height: 1px; background: linear-gradient(to right, transparent, rgba(100,200,255,0.6), transparent); box-shadow: 0 0 20px rgba(100,200,255,0.4);"></div><div style="position: absolute; top: 70%; left: 0; width: 100%; height: 1px; background: linear-gradient(to right, transparent, rgba(255,150,100,0.5), transparent); box-shadow: 0 0 20px rgba(255,150,100,0.3);"></div>`,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0.6,
              duration: 0.9,
            },
          },
          effects: [
            {
              id: 'streaks-fade',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: 0.9,
                mode: 'provider',
                targetIds: ['anamorphic-streaks'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.8, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video wrapper
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
          start: flareStartTime,
          duration: media2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: media2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + transitionDuration,
            },
          },
          effects: [
            {
              id: 'incoming-brightness-blur',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'brightness', val: 3, prog: 0 },
                  { key: 'brightness', val: 1, prog: 1 },
                  { key: 'blur', val: 30, prog: 0 },
                  { key: 'blur', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'lens-flare-sweep-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-white/5 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'lens-flare-sweep-transition',
  title: 'Lens Flare Sweep Transition',
  description: 'Cinematic lens flare transition that simulates a camera catching bright light as it pans between scenes. Features horizontal light streak, soft bokeh orbs, chromatic aberrations, and overexposure effects that bridge two videos naturally.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'lens-flare', 'cinematic', 'light', 'bokeh', 'chromatic-aberration', 'video'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 1.8,
    flareSpeed: 1.5,
    bokehCount: 5,
    chromaticIntensity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lensFlareSweepTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};