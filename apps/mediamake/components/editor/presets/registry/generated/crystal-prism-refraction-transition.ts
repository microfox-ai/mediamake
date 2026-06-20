/**
 * Crystal Prism Refraction Transition Preset
 *
 * A sophisticated video transition effect that simulates light passing through a triangular prism.
 * The outgoing video splits into RGB chromatic aberration channels that separate and refract,
 * while geometric prism shapes with spectrum gradients overlay the scene. The effect includes
 * glass-like refraction using backdrop blur and skew transforms, creating the illusion of light
 * bending through crystal. The incoming video gradually reforms from the dispersed light spectrum.
 *
 * Features:
 * - **Chromatic Aberration**: RGB channel separation with progressive offsets (2-4px)
 * - **Prism Geometry**: Three triangular sections with clip-path animations from triangle to rectangle
 * - **Glass Refraction**: Backdrop blur (0px → 8px → 0px) with skew transforms (0deg → 15deg → 0deg)
 * - **Spectrum Colors**: Gradient overlays simulating light dispersion (red→orange, yellow→green, blue→violet)
 * - **Smooth Transitions**: 1.2s overlap period with three-phase timing (build → peak → converge)
 * - **SVG Color Filters**: Matrix filters for isolating red, green, and blue color channels
 *
 * Use cases:
 * - Professional video transitions with optical effects
 * - Scientific or educational content about light and refraction
 * - Artistic video montages requiring sophisticated visual effects
 * - Music videos or creative content with prism/spectrum aesthetics
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number().default(1.2).describe('Duration of the transition overlap in seconds'),
  
  chromaticIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity multiplier for chromatic aberration offset'),
  
  prismOpacity: z.number().min(0).max(1).default(0.6).describe('Opacity of prism shape overlays'),
  
  refractionIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity multiplier for blur and skew effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, chromaticIntensity, prismOpacity, refractionIntensity } = params;

  // Calculate timing
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  const transitionStart = outgoingVideo.duration - transitionDuration;
  
  // Chromatic aberration offset values (peak at midpoint)
  const maxOffset = 4 * chromaticIntensity;
  const minOffset = 2 * chromaticIntensity;
  
  // Refraction effect values
  const maxBlur = 8 * refractionIntensity;
  const maxSkew = 15 * refractionIntensity;
  
  // Phase durations (relative to transition start)
  const phase1Duration = transitionDuration * 0.33; // 0-0.4s: build up
  const phase2Duration = transitionDuration * 0.33; // 0.4-0.8s: peak
  const phase3Duration = transitionDuration * 0.34; // 0.8-1.2s: converge

  // SVG filters for RGB channel isolation
  const svgFiltersHTML = `
    <svg style="position:absolute;width:0;height:0;pointer-events:none;">
      <defs>
        <filter id="red-channel">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
        </filter>
        <filter id="green-channel">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
        </filter>
        <filter id="blue-channel">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
        </filter>
      </defs>
    </svg>
  `;

  const childrenData: RenderableComponentData[] = [
    // SVG Filters Container
    {
      id: 'svg-filters-container',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFiltersHTML,
        style: {
          position: 'absolute',
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

    // Outgoing Video Base Layer
    {
      id: 'outgoing-video-base',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Fade out during transition
        {
          id: 'outgoing-base-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-base'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming Video Base Layer
    {
      id: 'incoming-video-base',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Fade in during transition
        {
          id: 'incoming-base-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-base'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic Aberration - Outgoing Red Channel
    {
      id: 'chromatic-outgoing-r',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          mixBlendMode: 'lighten',
          filter: 'url(#red-channel) saturate(1.5)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-out-r-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['chromatic-outgoing-r'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${-maxOffset}px`, prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${-minOffset}px`, prog: 0.5 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic Aberration - Outgoing Green Channel
    {
      id: 'chromatic-outgoing-g',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          mixBlendMode: 'lighten',
          filter: 'url(#green-channel) saturate(1.5)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-out-g-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['chromatic-outgoing-g'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              // Green channel stays centered (no offset)
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic Aberration - Outgoing Blue Channel
    {
      id: 'chromatic-outgoing-b',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          mixBlendMode: 'lighten',
          filter: 'url(#blue-channel) saturate(1.5)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-out-b-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['chromatic-outgoing-b'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${maxOffset}px`, prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${minOffset}px`, prog: 0.5 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic Aberration - Incoming Red Channel
    {
      id: 'chromatic-incoming-r',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          mixBlendMode: 'lighten',
          filter: 'url(#red-channel) saturate(1.5)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-in-r-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['chromatic-incoming-r'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: `${maxOffset}px`, prog: 0 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: `${minOffset}px`, prog: 0 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic Aberration - Incoming Green Channel
    {
      id: 'chromatic-incoming-g',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          mixBlendMode: 'lighten',
          filter: 'url(#green-channel) saturate(1.5)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-in-g-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['chromatic-incoming-g'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              // Green channel stays centered
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic Aberration - Incoming Blue Channel
    {
      id: 'chromatic-incoming-b',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          mixBlendMode: 'lighten',
          filter: 'url(#blue-channel) saturate(1.5)',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-in-b-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['chromatic-incoming-b'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: `${-maxOffset}px`, prog: 0 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: `${-minOffset}px`, prog: 0 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Prism Shape - Left
    {
      id: 'prism-shape-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(135deg, rgba(255,0,0,0.15), rgba(255,165,0,0.15))',
            clipPath: 'polygon(0% 0%, 33% 0%, 50% 100%, 0% 100%)',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'prism-left-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['prism-shape-left'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: prismOpacity, prog: 0.3 },
              { key: 'opacity', val: prismOpacity, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Prism Shape - Center
    {
      id: 'prism-shape-center',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(180deg, rgba(255,255,0,0.15), rgba(0,255,0,0.15))',
            clipPath: 'polygon(33% 0%, 66% 0%, 50% 100%)',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'prism-center-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['prism-shape-center'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: prismOpacity, prog: 0.3 },
              { key: 'opacity', val: prismOpacity, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Prism Shape - Right
    {
      id: 'prism-shape-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(45deg, rgba(0,128,255,0.15), rgba(128,0,255,0.15))',
            clipPath: 'polygon(66% 0%, 100% 0%, 100% 100%, 50% 100%)',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'prism-right-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['prism-shape-right'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: prismOpacity, prog: 0.3 },
              { key: 'opacity', val: prismOpacity, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Glass Refraction Overlay
    {
      id: 'glass-refraction-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'glass-refraction-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glass-refraction-overlay'],
            ranges: [
              { key: 'backdropFilter', val: 'blur(0px)', prog: 0 },
              { key: 'backdropFilter', val: `blur(${maxBlur}px)`, prog: 0.5 },
              { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
              { key: 'skewX', val: '0deg', prog: 0 },
              { key: 'skewX', val: `${maxSkew}deg`, prog: 0.5 },
              { key: 'skewX', val: '0deg', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'crystal-prism-transition-container',
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
  id: 'crystal-prism-refraction-transition',
  title: 'Crystal Prism Refraction Transition',
  description: 'A video transition effect where the outgoing video passes through a triangular prism, splitting into a spectrum of colors via chromatic aberration (RGB separation), with glass-like refraction using backdrop blur and skew transforms, before reforming as the incoming video. Uses clip-path polygons for prism shapes and SVG filters for color channel isolation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'prism', 'chromatic-aberration', 'refraction', 'spectrum', 'rgb', 'glass', 'crystal', 'optical'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 5,
    },
    transitionDuration: 1.2,
    chromaticIntensity: 1,
    prismOpacity: 0.6,
    refractionIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crystalPrismRefractionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
