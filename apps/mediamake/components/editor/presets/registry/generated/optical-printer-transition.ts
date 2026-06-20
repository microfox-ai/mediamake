/**
 * Optical Printer Transition Preset
 *
 * This preset creates an authentic optical printer transition that simulates the layered,
 * multiple-exposure effects used in vintage film post-production. It creates a double-exposure
 * effect where both videos are visible simultaneously through different blend modes and opacity
 * levels, mimicking the optical printing process where multiple film strips are combined.
 *
 * Features:
 * - **RGB Split Effect**: Outgoing video displayed through three separate layers with color
 *   channel separation (hue-rotated at 0°, 120°, 240°) and slight position offsets
 * - **Gradual Transparency**: Outgoing video layers fade from 100% to 0% opacity over 1.8s overlap
 * - **Overexposure Effect**: Incoming video fades in with initial overexposure (150% brightness)
 *   and color bleeding (150% saturation), gradually normalizing to 100%
 * - **Edge Fogging**: White-to-transparent radial gradients at frame edges simulating light leaks
 * - **Chemical Stains**: Organic shape overlays with 'overlay' blend mode for vintage lab artifacts
 * - **Alignment Marks**: Corner crosshair marks visible briefly during transition
 * - **Film Lab Aesthetics**: Distinctive look of optical printer alignment and processing artifacts
 *
 * Use cases:
 * - Creating authentic vintage film transitions
 * - Simulating optical printing processes
 * - Adding retro film lab aesthetics to modern videos
 * - Building multi-exposure effects for artistic projects
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
    startFrom: z.number().optional().describe('Start time of outgoing video (seconds)'),
    endAt: z.number().optional().describe('End time of outgoing video (seconds)'),
  }).describe('Configuration for the outgoing video'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video (seconds)'),
    endAt: z.number().optional().describe('End time of incoming video (seconds)'),
  }).describe('Configuration for the incoming video'),
  
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the transition overlap in seconds'),
  
  chemicalStainImages: z
    .array(z.string())
    .default([])
    .optional()
    .describe('Array of URLs for organic blob/stain images (2-3 recommended)'),
  
  alignmentMarkImage: z
    .string()
    .optional()
    .describe('URL for crosshair alignment mark image'),
  
  edgeFoggingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of edge fogging effect (0-1)'),
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
    chemicalStainImages = [],
    alignmentMarkImage,
    edgeFoggingIntensity,
  } = params;

  // Calculate total duration: assume outgoing video plays fully, incoming overlaps at end
  // For simplicity, we'll set a fixed duration based on transition overlap
  const totalDuration = transitionDuration + 5; // 5 seconds after transition for demo

  // RGB split layers for outgoing video
  const outgoingRGBLayers: RenderableComponentData[] = [
    {
      id: 'outgoing-video-rgb-red',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom,
        endAt: outgoingVideo.endAt,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          filter: 'hue-rotate(0deg) saturate(2)',
          mixBlendMode: 'screen',
          transform: 'translate(-2px, -2px)',
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
          id: 'outgoing-red-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-rgb-red'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'outgoing-video-rgb-green',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom,
        endAt: outgoingVideo.endAt,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          filter: 'hue-rotate(120deg) saturate(2)',
          mixBlendMode: 'screen',
          transform: 'translate(0px, 2px)',
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
          id: 'outgoing-green-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-rgb-green'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'outgoing-video-rgb-blue',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom,
        endAt: outgoingVideo.endAt,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          filter: 'hue-rotate(240deg) saturate(2)',
          mixBlendMode: 'screen',
          transform: 'translate(4px, 0px)',
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
          id: 'outgoing-blue-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-rgb-blue'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Outgoing video container
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: outgoingRGBLayers,
  };

  // Incoming video with overexposure and color bleeding effects
  const incomingVideoMain: RenderableComponentData = {
    id: 'incoming-video-main',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom,
      endAt: incomingVideo.endAt,
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
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
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-main'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-brightness-normalize',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-main'],
          ranges: [
            { key: 'filter', val: 'brightness(1.5) saturate(1.5)', prog: 0 },
            { key: 'filter', val: 'brightness(1) saturate(1)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video container
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [incomingVideoMain],
  };

  // Edge fogging layers (using HTMLBlockAtom instead of deprecated ShapeAtom)
  const edgeFogLayers: RenderableComponentData[] = [
    {
      id: 'edge-fog-top',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width:100%;height:80px;background:radial-gradient(ellipse at top, rgba(255,255,255,${edgeFoggingIntensity}) 0%, transparent 70%);"></div>`,
        className: 'absolute top-0 left-0 w-full',
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
    {
      id: 'edge-fog-bottom',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width:100%;height:80px;background:radial-gradient(ellipse at bottom, rgba(255,255,255,${edgeFoggingIntensity}) 0%, transparent 70%);"></div>`,
        className: 'absolute bottom-0 left-0 w-full',
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
    {
      id: 'edge-fog-left',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width:60px;height:100%;background:radial-gradient(ellipse at left, rgba(255,255,255,${edgeFoggingIntensity * 0.75}) 0%, transparent 70%);"></div>`,
        className: 'absolute top-0 left-0 h-full',
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
    {
      id: 'edge-fog-right',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width:60px;height:100%;background:radial-gradient(ellipse at right, rgba(255,255,255,${edgeFoggingIntensity * 0.75}) 0%, transparent 70%);"></div>`,
        className: 'absolute top-0 right-0 h-full',
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
  ];

  // Edge fogging layer container
  const edgeFoggingLayer: RenderableComponentData = {
    id: 'edge-fogging-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: edgeFogLayers,
  };

  // Chemical stains (if provided)
  const chemicalStainLayers: RenderableComponentData[] = chemicalStainImages.slice(0, 3).map((src, index) => {
    const positions = [
      { top: '15%', left: '10%' },
      { bottom: '20%', right: '15%' },
      { top: '50%', right: '30%' },
    ];
    const sizes = ['120px', '100px', '90px'];
    const opacities = [0.25, 0.3, 0.2];

    return {
      id: `chemical-stain-${index + 1}`,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src,
        className: 'absolute',
        style: {
          ...positions[index],
          width: sizes[index],
          height: sizes[index],
          mixBlendMode: 'overlay',
          opacity: opacities[index],
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
          id: `chemical-stain-${index + 1}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionDuration * 0.3,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: [`chemical-stain-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: opacities[index], prog: 0.5 },
              { key: 'opacity', val: opacities[index] * 0.7, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Chemical stains layer container
  const chemicalStainsLayer: RenderableComponentData = {
    id: 'chemical-stains-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 25,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: chemicalStainLayers,
  };

  // Alignment marks (if provided)
  const alignmentMarkLayers: RenderableComponentData[] = alignmentMarkImage
    ? [
        { top: '20px', left: '20px' },
        { top: '20px', right: '20px' },
        { bottom: '20px', left: '20px' },
        { bottom: '20px', right: '20px' },
      ].map((position, index) => ({
        id: `alignment-mark-${index + 1}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: alignmentMarkImage,
          className: 'absolute',
          style: {
            ...position,
            width: '30px',
            height: '30px',
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
            id: `alignment-mark-${index + 1}-flash`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: transitionDuration * 0.4,
              duration: transitionDuration * 0.2,
              mode: 'provider',
              targetIds: [`alignment-mark-${index + 1}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData))
    : [];

  // Alignment marks layer container
  const alignmentMarksLayer: RenderableComponentData = {
    id: 'alignment-marks-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: alignmentMarkLayers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'optical-printer-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
    childrenData: [
      incomingVideoContainer, // z-index: 5 (back)
      outgoingVideoContainer, // z-index: 10 (front, fading out)
      edgeFoggingLayer, // z-index: 20
      chemicalStainsLayer, // z-index: 25
      alignmentMarksLayer, // z-index: 30
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
  id: 'optical-printer-transition',
  title: 'Authentic Optical Printer Transition',
  description:
    'Simulates vintage film optical printing with double-exposure effects, RGB channel separation, overexposure artifacts, edge fogging, chemical stains, and alignment marks during a 1.8-second transition overlap between videos.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'film', 'optical-printer', 'double-exposure', 'rgb-split'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
      endAt: 10,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
      endAt: 10,
    },
    transitionDuration: 1.8,
    chemicalStainImages: [
      'https://example.com/stain1.png',
      'https://example.com/stain2.png',
      'https://example.com/stain3.png',
    ],
    alignmentMarkImage: 'https://example.com/crosshair.png',
    edgeFoggingIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const opticalPrinterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
