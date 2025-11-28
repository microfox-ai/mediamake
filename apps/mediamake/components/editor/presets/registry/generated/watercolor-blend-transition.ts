/**
 * Watercolor Blend Transition Preset
 *
 * Advanced transition effect where videos dissolve into each other like wet paint bleeding on paper.
 * Features:
 * - Progressive blur and liquify effects on outgoing video using SVG filters
 * - Animated paint drips flowing downward during transition (5 divs with gradient colors)
 * - Incoming video emerges as abstract color washes that gradually gain detail and clarity
 * - Paper texture overlay and subtle color mixing at the boundaries
 * - Authentic watercolor blending with contrast and saturation adjustments
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Building watercolor-style video montages
 * - Adding organic, flowing transitions with paint-like effects
 * - Creating artistic video sequences with paper texture overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds (default: 2)'),
  maxBlur: z
    .number()
    .default(35)
    .describe('Maximum blur intensity for outgoing video in pixels (default: 35)'),
  dripCount: z
    .number()
    .default(5)
    .describe('Number of paint drip divs (default: 5)'),
  incomingBlurStart: z
    .number()
    .default(50)
    .describe('Initial blur for incoming video in pixels (default: 50)'),
  turbulenceScale: z
    .number()
    .default(80)
    .describe('Displacement map scale for liquify effect (default: 80)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    overlapDuration,
    maxBlur,
    dripCount,
    incomingBlurStart,
    turbulenceScale,
  } = params;

  // Calculate total duration (sum minus overlap)
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Transition starts at media1.duration - overlapDuration
  const transitionStart = media1.duration - overlapDuration;

  // Paint drips start slightly before transition for smooth effect
  const dripStartTime = Math.max(0, transitionStart - 0.5);
  const dripDuration = overlapDuration + 0.5;

  // Drip colors (vibrant watercolor palette)
  const dripColors = [
    'from-blue-400',
    'from-purple-400',
    'from-pink-400',
    'from-orange-400',
    'from-yellow-400',
  ];

  // Drip positions (left percentage)
  const dripPositions = [15, 35, 55, 75, 90];

  // Build paint drip children
  const paintDrips: RenderableComponentData[] = [];
  for (let i = 0; i < dripCount; i++) {
    const dripId = `paint-drip-${i}`;
    const colorClass = dripColors[i % dripColors.length];
    const leftPos = dripPositions[i % dripPositions.length];

    paintDrips.push({
      id: dripId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute w-8 h-4 bg-gradient-to-b ${colorClass} to-transparent opacity-70" style="left: ${leftPos}%; top: ${10 + i * 5}%; transform-origin: top center;"></div>`,
      },
      context: {
        timing: {
          start: 0,
          duration: dripDuration,
        },
      },
      effects: [
        {
          id: `drip-scale-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: i * 0.1, // Stagger drips
            duration: dripDuration - i * 0.1,
            mode: 'provider',
            targetIds: [dripId],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 10, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // SVG filter for liquify/turbulence effect
  const svgFilterHtml = `
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <filter id="watercolor-distort">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="turbulence"/>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="0" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
  `;

  // Outgoing video container with liquify/blur effects
  const outgoingVideoContainer: RenderableComponentData = {
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
        duration: media1.duration,
      },
    },
    childrenData: [
      // SVG filter definitions
      {
        id: 'svg-filter-defs',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: svgFilterHtml,
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      } as RenderableComponentData,
      // Outgoing video
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
          style: {
            filter: `url(#watercolor-distort) contrast(0.9) saturate(1.2)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
        effects: [
          // Blur effect during transition
          {
            id: 'outgoing-blur',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: transitionStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
              ],
            },
          },
          // Liquify effect (displacement scale animation)
          {
            id: 'outgoing-liquify',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: transitionStart,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter', val: `url(#watercolor-distort)`, prog: 0 },
                {
                  key: 'filter',
                  val: `url(#watercolor-distort) blur(${maxBlur}px)`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Paint drips container (starts slightly before transition)
  const paintDripsContainer: RenderableComponentData = {
    id: 'paint-drips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: dripStartTime,
        duration: dripDuration,
      },
    },
    childrenData: paintDrips,
  };

  // Incoming video container with fade-in and blur reveal
  const incomingVideoContainer: RenderableComponentData = {
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
        duration: media2.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
          style: {
            filter: `contrast(0.9) saturate(1.2)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + overlapDuration,
          },
        },
        effects: [
          // Initial blur that clears to reveal detail
          {
            id: 'incoming-blur-reveal',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'filter', val: `blur(${incomingBlurStart}px)`, prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
          // Fade in from transparent
          {
            id: 'incoming-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // ClipPath reveal from top to bottom
          {
            id: 'incoming-clip-reveal',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
                { key: 'clipPath', val: 'inset(0% 0 0 0)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Watercolor blend zone (color mixing overlay)
  const watercolorBlendZone: RenderableComponentData = {
    id: 'watercolor-blend-zone',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 opacity-30" style="mix-blend-mode: multiply; background: radial-gradient(circle at 50% 50%, rgba(255,200,150,0.3), transparent 70%);"></div>`,
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
  };

  // Paper texture overlay (available throughout composition)
  const paperTextureOverlay: RenderableComponentData = {
    id: 'paper-texture-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 w-full h-full pointer-events-none" style="opacity: 0.15; mix-blend-mode: multiply; background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Cfilter id=%27noise%27%3E%3CfeTurbulence baseFrequency=%270.9%27 numOctaves=%274%27/%3E%3C/filter%3E%3Crect width=%27200%27 height=%27200%27 filter=%27url(%23noise)%27 opacity=%270.1%27/%3E%3C/svg%3E'); background-size: 200px 200px;"></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-blend-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-b from-amber-50 to-white',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      paintDripsContainer,
      incomingVideoContainer,
      watercolorBlendZone,
      paperTextureOverlay,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'watercolor-blend-transition',
  title: 'Watercolor Blend Transition',
  description:
    'Advanced transition effect where videos dissolve into each other like wet paint bleeding on paper. Features progressive blur and liquify effects on outgoing video, animated paint drips flowing downward, incoming video emerging as abstract color washes gaining detail, paper texture overlay, and authentic watercolor color mixing at boundaries.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'watercolor',
    'artistic',
    'paint',
    'blur',
    'liquify',
    'drip',
    'texture',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 2,
    maxBlur: 35,
    dripCount: 5,
    incomingBlurStart: 50,
    turbulenceScale: 80,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const watercolorBlendTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
