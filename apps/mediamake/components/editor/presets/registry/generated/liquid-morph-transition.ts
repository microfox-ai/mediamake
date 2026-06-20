/**
 * Liquid Morph Transition Preset
 *
 * Creates a fluid transition effect where videos appear to liquefy and flow into each other like mixing paint.
 * The outgoing video distorts with wave-like ripples that increase in amplitude while fading out.
 * The incoming video emerges from the center with inverse ripples that stabilize into normal playback.
 * During the 2.2-second overlap, both videos blend using mix-blend-mode for color mixing effects.
 * Turbulence distortion peaks mid-transition for maximum fluidity.
 *
 * Features:
 * - Wave-like ripple distortion using SVG filters (feTurbulence + feDisplacementMap)
 * - Dynamic turbulence baseFrequency animation (0.01 to 0.1)
 * - Contrast and saturation adjustments via CSS filters
 * - Opacity crossfade during overlap
 * - Scale animation for incoming video (center emergence)
 * - Radial gradient mask for incoming video
 * - GPU-accelerated transforms with will-change
 *
 * Use cases:
 * - Creating fluid transitions between video clips
 * - Adding painterly morphing effects to video sequences
 * - Building creative video montages with liquid distortion
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
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
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
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration (video1 + video2 - overlap)
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate timing for incoming video (starts before video1 ends)
  const incomingStart = video1.duration - overlapDuration;

  // Create unique SVG filter IDs
  const outgoingFilterId = 'liquid-morph-outgoing-filter';
  const incomingFilterId = 'liquid-morph-incoming-filter';

  // SVG filter for outgoing video (turbulence increases)
  const outgoingSvgFilter = `
    <svg style="position: absolute; width: 0; height: 0;">
      <defs>
        <filter id="${outgoingFilterId}">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.01" 
            numOctaves="3" 
            result="turbulence"
          >
            <animate
              attributeName="baseFrequency"
              from="0.01"
              to="0.1"
              dur="${overlapDuration}s"
              fill="freeze"
            />
          </feTurbulence>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence" 
            scale="50" 
            xChannelSelector="R" 
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  // SVG filter for incoming video (turbulence decreases)
  const incomingSvgFilter = `
    <svg style="position: absolute; width: 0; height: 0;">
      <defs>
        <filter id="${incomingFilterId}">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.1" 
            numOctaves="3" 
            result="turbulence"
          >
            <animate
              attributeName="baseFrequency"
              from="0.1"
              to="0.01"
              dur="${overlapDuration}s"
              fill="freeze"
            />
          </feTurbulence>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence" 
            scale="50" 
            xChannelSelector="R" 
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  const childrenData: RenderableComponentData[] = [
    // SVG filter definitions (outgoing)
    {
      id: 'liquid-morph-svg-outgoing',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: outgoingSvgFilter,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,

    // SVG filter definitions (incoming)
    {
      id: 'liquid-morph-svg-incoming',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: incomingSvgFilter,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
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
      id: 'liquid-morph-outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform, opacity, filter',
          filter: `url(#${outgoingFilterId}) contrast(100%) saturate(100%)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Opacity fade out during overlap
        {
          id: 'outgoing-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: video1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['liquid-morph-outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Contrast increase during overlap
        {
          id: 'outgoing-contrast',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['liquid-morph-outgoing-video'],
            ranges: [
              {
                key: 'filter',
                val: `url(#${outgoingFilterId}) contrast(100%) saturate(100%)`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `url(#${outgoingFilterId}) contrast(150%) saturate(0%)`,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'liquid-morph-incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform, opacity, filter',
          filter: `url(#${incomingFilterId}) contrast(100%) saturate(100%)`,
          maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(circle, black 30%, transparent 70%)',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: [
        // Opacity fade in during overlap
        {
          id: 'incoming-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['liquid-morph-incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Scale animation (center emergence)
        {
          id: 'incoming-scale',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['liquid-morph-incoming-video'],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Radial gradient mask expansion
        {
          id: 'incoming-mask',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['liquid-morph-incoming-video'],
            ranges: [
              {
                key: 'maskImage',
                val: 'radial-gradient(circle, black 10%, transparent 30%)',
                prog: 0,
              },
              {
                key: 'maskImage',
                val: 'radial-gradient(circle, black 100%, transparent 100%)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-950',
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
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description:
    'A fluid transition effect where videos appear to liquefy and flow into each other like mixing paint. Uses SVG turbulence filters, opacity crossfade, scale animations, and radial gradient masks during a 2.2-second overlap period for maximum fluidity.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'liquid', 'morph', 'fluid', 'distortion', 'turbulence'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
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
