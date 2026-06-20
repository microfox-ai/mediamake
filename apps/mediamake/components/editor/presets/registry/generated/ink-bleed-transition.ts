/**
 * Ink Bleed Transition Preset
 *
 * This preset creates a creative transition where the outgoing video dissolves into liquid ink
 * that spreads across a canvas texture, revealing the incoming video underneath. The transition
 * uses a 2-second overlap period where the outgoing video applies a custom ink dissolve filter
 * effect (using SVG filters for liquid distortion) while simultaneously fading out. The incoming
 * video starts with a grainy canvas texture overlay that gradually becomes clear as the ink
 * effect completes.
 *
 * Features:
 * - **Ink Dissolve Effect**: SVG turbulence filter creates liquid ink bleeding effect
 * - **Canvas Texture**: Background and overlay canvas texture for artistic look
 * - **Blend Mode Transition**: Incoming video uses multiply blend mode transitioning to normal
 * - **2-Second Overlap**: Smooth transition with configurable overlap duration
 * - **Opacity Fading**: Outgoing video fades out while incoming video fades in
 * - **Z-Index Layering**: Proper layering with incoming video below outgoing video
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Adding creative ink/paint effects to video sequences
 * - Building dynamic video montages with unique transitions
 * - Implementing cinematic transitions with texture overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
    volume: z.number().optional().default(1).describe('Volume level (0-1)'),
    startFrom: z.number().optional().describe('Start playback from this time'),
    endAt: z.number().optional().describe('End playback at this time'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
    volume: z.number().optional().default(1).describe('Volume level (0-1)'),
    startFrom: z.number().optional().describe('Start playback from this time'),
    endAt: z.number().optional().describe('End playback at this time'),
  }),
  canvasTexture: z.object({
    src: z.string().describe('Canvas texture image URL'),
  }),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds'),
  inkIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Intensity of ink turbulence effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, canvasTexture, overlapDuration, inkIntensity } =
    params;

  // Calculate timing
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const outgoingEnd = video1.duration;
  const incomingStart = video1.duration - overlapDuration;

  // SVG filter ID
  const turbulenceFilterId = 'ink-turbulence-filter';
  const inkIntensityValue = inkIntensity ?? 0.5;

  // Create SVG filter definition for ink effect
  const svgFilterDef = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${turbulenceFilterId}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01"
            numOctaves="3"
            seed="2"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          >
            <animate
              attributeName="scale"
              from="0"
              to="${inkIntensityValue * 100}"
              dur="${overlapDuration}s"
              fill="freeze"
            />
          </feDisplacementMap>
        </filter>
      </defs>
    </svg>
  `;

  const childrenData: RenderableComponentData[] = [
    // SVG filter definition
    {
      id: 'svg-filter-def',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterDef,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,

    // Canvas texture background
    {
      id: 'canvas-background',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: canvasTexture.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.3,
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,

    // Incoming video (lower z-index, appears below outgoing)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        volume: video2.volume ?? 1,
        startFrom: video2.startFrom,
        endAt: video2.endAt,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: video2.duration,
        },
      },
      effects: [
        // Fade in effect
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
        // Blend mode transition (multiply to normal)
        {
          id: 'incoming-blend-transition',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'mixBlendMode', val: 'multiply', prog: 0 },
              { key: 'mixBlendMode', val: 'normal', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing video (higher z-index, appears above incoming)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        volume: video1.volume ?? 1,
        startFrom: video1.startFrom,
        endAt: video1.endAt,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Opacity fade out effect
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEnd - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Ink turbulence filter effect (applied via CSS filter)
        {
          id: 'outgoing-ink-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingEnd - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: `url(#${turbulenceFilterId})`, prog: 0 },
              { key: 'filter', val: `url(#${turbulenceFilterId})`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Canvas texture overlay (fades in and out during transition)
    {
      id: 'canvas-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: canvasTexture.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          mixBlendMode: 'multiply',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 3,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'canvas-overlay-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['canvas-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'ink-bleed-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-amber-50',
        style: {
          width: '100%',
          height: '100%',
          overflow: 'hidden',
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
  id: 'ink-bleed-transition',
  title: 'Ink Bleed Transition',
  description:
    'Creative transition where outgoing video dissolves into liquid ink spreading across canvas texture, revealing incoming video underneath with blend mode transition',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'ink',
    'bleed',
    'canvas',
    'texture',
    'artistic',
    'creative',
    'svg-filter',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
      volume: 1,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
      volume: 1,
    },
    canvasTexture: {
      src: 'https://example.com/canvas-texture.jpg',
    },
    overlapDuration: 2,
    inkIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const inkBleedTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
