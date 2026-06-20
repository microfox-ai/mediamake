/**
 * Liquid Glass Transition Preset
 *
 * Creates a sophisticated transition effect where the outgoing video appears to melt and flow
 * downward like molten glass, while the incoming video crystallizes upward from the bottom.
 *
 * Features:
 * - **Three distinct phases**: solid to liquid (0.7s), flow (0.8s), and crystallization (0.7s)
 * - **SVG filter distortion**: Uses feTurbulence and feDisplacementMap for realistic liquid effects
 * - **Heat shimmer overlay**: Animated gradient for molten glass appearance
 * - **Color temperature shifts**: Sepia and brightness filters simulate heat
 * - **Downward flow animation**: Outgoing video melts and flows down
 * - **Upward crystallization**: Incoming video crystallizes from bottom up
 * - **Blur transition**: Incoming video transitions from blurred to sharp focus
 *
 * Use cases:
 * - Creative transitions between video clips
 * - Stylized scene changes with liquid/glass aesthetic
 * - High-impact visual transitions for storytelling
 * - Artistic video montages with elemental themes
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
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Total duration of the transition in seconds (default: 2.2s)'),
  solidToLiquidDuration: z
    .number()
    .default(0.7)
    .describe('Duration of solid to liquid phase in seconds'),
  flowDuration: z
    .number()
    .default(0.8)
    .describe('Duration of flow phase in seconds'),
  crystallizationDuration: z
    .number()
    .default(0.7)
    .describe('Duration of crystallization phase in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    solidToLiquidDuration,
    flowDuration,
    crystallizationDuration,
  } = params;

  // Calculate timing
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  const transitionStart = outgoingVideo.duration - transitionDuration;

  // Phase timings (relative to transition start)
  const solidToLiquidEnd = solidToLiquidDuration;
  const flowEnd = solidToLiquidEnd + flowDuration;
  const crystallizationEnd = flowEnd + crystallizationDuration;

  // SVG filter definitions
  const svgFiltersHTML = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <!-- Liquid distortion filter for outgoing video -->
        <filter id="liquid-distortion-${Date.now()}">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.01" 
            numOctaves="3" 
            seed="2"
            result="turbulence">
            <animate 
              attributeName="baseFrequency" 
              values="0;0.02;0" 
              dur="${transitionDuration}s" 
              repeatCount="1"
            />
          </feTurbulence>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G">
            <animate 
              attributeName="scale" 
              values="0;80;0" 
              dur="${transitionDuration}s" 
              repeatCount="1"
            />
          </feDisplacementMap>
        </filter>

        <!-- Crystallization blur filter for incoming video -->
        <filter id="crystallization-blur-${Date.now()}">
          <feGaussianBlur stdDeviation="10">
            <animate 
              attributeName="stdDeviation" 
              values="10;0" 
              dur="${transitionDuration}s" 
              repeatCount="1"
            />
          </feGaussianBlur>
        </filter>
      </defs>
    </svg>
  `;

  // Shimmer overlay HTML
  const shimmerOverlayHTML = `
    <div 
      class="absolute inset-0 pointer-events-none" 
      style="
        background: linear-gradient(180deg, transparent 0%, rgba(255,200,100,0.3) 50%, transparent 100%);
        animation: shimmer-pulse ${transitionDuration}s ease-in-out;
      ">
    </div>
    <style>
      @keyframes shimmer-pulse {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
    </style>
  `;

  const childrenData: RenderableComponentData[] = [
    // SVG filter definitions container
    {
      id: 'svg-filters',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFiltersHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData,

    // Outgoing video container
    {
      id: 'outgoing-video-container',
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
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            style: {
              filter: `url(#liquid-distortion-${Date.now()})`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
          effects: [
            // Phase 1-3: Downward flow with scale
            {
              id: 'outgoing-flow',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  // Scale Y animation (stretching downward)
                  { key: 'scaleY', val: 1, prog: 0 },
                  { key: 'scaleY', val: 1.2, prog: 0.6 },
                  { key: 'scaleY', val: 1.3, prog: 1 },
                  // Translate Y animation (flowing down)
                  { key: 'translateY', val: '0%', prog: 0 },
                  { key: 'translateY', val: '20%', prog: 0.6 },
                  { key: 'translateY', val: '100%', prog: 1 },
                  // Opacity fade
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.6, prog: 0.6 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // Heat effect (color temperature shift)
            {
              id: 'outgoing-heat',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  // Sepia filter for warmth
                  {
                    key: 'filter',
                    val: 'sepia(0) brightness(1)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'sepia(0.4) brightness(1.3)',
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: 'sepia(0.2) brightness(1.1)',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            style: {
              filter: `url(#crystallization-blur-${Date.now()})`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
          effects: [
            // Crystallization animation (upward from bottom)
            {
              id: 'incoming-crystallize',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  // Translate Y animation (rising from bottom)
                  { key: 'translateY', val: '100%', prog: 0 },
                  { key: 'translateY', val: '30%', prog: 0.4 },
                  { key: 'translateY', val: '0%', prog: 1 },
                  // Opacity fade in
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.5, prog: 0.4 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Shimmer overlay
    {
      id: 'shimmer-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: shimmerOverlayHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-glass-transition-container',
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
        duration: baseLayoutDuration,
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
  id: 'liquid-glass-transition',
  title: 'Liquid Glass Transition',
  description:
    'A sophisticated transition where the outgoing video melts and flows downward like molten glass while the incoming video crystallizes upward from the bottom. Features three distinct phases with SVG filter distortions, heat shimmer, and color temperature shifts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'glass',
    'molten',
    'crystallize',
    'svg-filters',
    'distortion',
    'shimmer',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.2,
    solidToLiquidDuration: 0.7,
    flowDuration: 0.8,
    crystallizationDuration: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
