/**
 * Wash Transition Preset
 *
 * Creates a horizontal liquid wave transition effect where videos transition through a watercolor
 * wash effect. The outgoing video appears to be "washed away" from left to right with a wavy,
 * organic edge, while the incoming video slides in simultaneously.
 *
 * Features:
 * - **Liquid Wave Distortion**: SVG-based turbulence filter for organic wave edges
 * - **Horizontal Wash Effect**: Videos transition from left to right with translateX
 * - **Color Bleeding**: Mix-blend-mode: multiply on incoming video for color blending
 * - **Particle Droplets**: Small animated droplets enhance the liquid feel
 * - **Smooth Timing**: 1.5-second overlap with cubic-bezier easing
 * - **Customizable**: Adjustable wave intensity, droplet count, and timing
 *
 * Use cases:
 * - Creating watercolor-style video transitions
 * - Building artistic video sequences
 * - Adding organic, fluid transitions between clips
 * - Creating painterly visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video (outgoing)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the wash transition overlap in seconds'),
  waveIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity of the wave distortion effect (0.1-2, default: 1)'),
  dropletCount: z
    .number()
    .min(3)
    .max(12)
    .default(5)
    .optional()
    .describe('Number of liquid droplets to animate (3-12, default: 5)'),
  dropletColor: z
    .string()
    .default('rgba(59, 130, 246, 0.5)')
    .optional()
    .describe('Color of the droplets (CSS color, default: blue with 50% opacity)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    waveIntensity = 1,
    dropletCount = 5,
    dropletColor = 'rgba(59, 130, 246, 0.5)',
  } = params;

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate wave distortion scale based on intensity
  const distortionScale = 50 * waveIntensity;
  const baseFrequency = 0.015 * waveIntensity;

  // Create droplets with staggered timing
  const droplets: RenderableComponentData[] = [];
  for (let i = 0; i < dropletCount; i++) {
    const dropletStartOffset = (i / (dropletCount - 1)) * 0.4; // Stagger start times over 0.4s range
    const dropletStart = video1.duration - transitionDuration + dropletStartOffset;
    const dropletDuration = transitionDuration - dropletStartOffset + 0.2; // Slightly longer for smoother exit

    // Random vertical position
    const topPercent = 10 + (i * 70) / (dropletCount - 1); // Spread from 10% to 80%

    // Random Y movement
    const translateYEnd = -10 + Math.random() * 20; // Random Y movement between -10vh and 10vh

    droplets.push({
      id: `wash-droplet-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute w-2 h-2 rounded-full pointer-events-none',
        style: {
          backgroundColor: dropletColor,
          top: `${topPercent}%`,
          left: '0%',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: dropletStart,
          duration: dropletDuration,
        },
      },
      effects: [
        {
          id: `wash-droplet-${i}-motion`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: dropletDuration,
            mode: 'provider',
            targetIds: [`wash-droplet-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: 'vw' },
              { key: 'translateX', val: 100, prog: 1, unit: 'vw' },
              { key: 'translateY', val: 0, prog: 0, unit: 'vh' },
              { key: 'translateY', val: translateYEnd, prog: 1, unit: 'vh' },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // SVG filter definition
  const svgFilterHtml = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <filter id="wash-wave-filter">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="${baseFrequency} ${baseFrequency * 2}" 
            numOctaves="3" 
            seed="2" 
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            scale="${distortionScale}" 
            xChannelSelector="R" 
            yChannelSelector="G" 
          />
        </filter>
      </defs>
    </svg>
  `;

  const childrenData: RenderableComponentData[] = [
    // SVG filter definition
    {
      id: 'wash-svg-filter-def',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterHtml,
        className: 'absolute top-0 left-0 w-0 h-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,

    // Outgoing video
    {
      id: 'wash-outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        volume: 1,
        muted: false,
        className: 'w-full h-full object-cover',
        style: {
          filter: 'url(#wash-wave-filter)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'wash-outgoing-slide',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            bezierPoints: [0.4, 0, 0.2, 1],
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['wash-outgoing-video'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: -100, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'wash-outgoing-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['wash-outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video (with mix-blend-mode)
    {
      id: 'wash-incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'multiply',
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'wash-incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            volume: 1,
            muted: false,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
          effects: [
            {
              id: 'wash-incoming-slide',
              componentId: 'generic',
              data: {
                type: 'cubic-bezier',
                bezierPoints: [0.4, 0, 0.2, 1],
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['wash-incoming-video'],
                ranges: [
                  { key: 'translateX', val: 100, prog: 0, unit: '%' },
                  { key: 'translateX', val: 0, prog: 1, unit: '%' },
                ],
              },
            },
            {
              id: 'wash-incoming-opacity',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['wash-incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Droplets
    ...droplets,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'wash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
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
  id: 'wash-transition',
  title: 'Wash Transition',
  description:
    'Horizontal liquid wave transition effect where videos transition through a watercolor wash effect with organic edges, color bleeding, and particle droplets',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'wash',
    'liquid',
    'watercolor',
    'wave',
    'organic',
    'artistic',
    'fluid',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.5,
    waveIntensity: 1,
    dropletCount: 5,
    dropletColor: 'rgba(59, 130, 246, 0.5)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const washTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
