/**
 * Kaleidoscope Prism Transition Preset
 *
 * Creates a mesmerizing kaleidoscope-style transition where videos fragment into
 * multiple rotating triangular segments with mirror reflections and prismatic color shifts.
 * 
 * Features:
 * - Multiple video segments with triangular clipping and rotation (0-120 degrees)
 * - Mirrored copies using scaleX(-1) for kaleidoscope symmetry effect
 * - Chromatic aberration using RGB color overlays during transition peak
 * - Progressive rotation, scaling, and opacity animations for smooth transitions
 * - Configurable overlap duration and transition intensity
 * 
 * Technical Implementation:
 * - Uses rotation, scale, and opacity effects (clip-path is not animatable)
 * - 6 video segments per source (outgoing and incoming) at different rotation angles
 * - Alternating mirrored segments for kaleidoscope pattern
 * - RGB color overlay layers animate during transition peak for chromatic effect
 * - All animations use provider mode with targetIds
 * 
 * Use cases:
 * - Creating dynamic kaleidoscope-style video transitions
 * - Music video transitions with psychedelic effects
 * - Creative transitions for visual storytelling
 * - Artistic video montages with prism effects
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
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.4)
    .describe('Duration of the transition overlap in seconds'),
  
  rotationIntensity: z
    .number()
    .min(60)
    .max(180)
    .default(120)
    .describe('Maximum rotation angle in degrees for segments'),
  
  scaleRange: z
    .number()
    .min(0.3)
    .max(0.8)
    .default(0.5)
    .describe('Minimum scale value during transition (0-1)'),
  
  chromaticIntensity: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Intensity of chromatic aberration effect (opacity)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    rotationIntensity,
    scaleRange,
    chromaticIntensity,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;
  
  // Calculate when incoming video starts (overlaps with outgoing)
  const incomingStartTime = outgoingVideo.duration - overlapDuration;
  
  // Calculate transition timing for chromatic effect
  const chromaticStart = incomingStartTime + 0.3;
  const chromaticDuration = Math.min(0.8, overlapDuration - 0.3);
  
  // Define rotation angles for 6 segments (60-degree increments)
  const segmentAngles = [0, 60, 120, 180, 240, 300];
  
  // Create outgoing video segments
  const outgoingSegments: RenderableComponentData[] = segmentAngles.map((angle, index) => {
    const isMirrored = index % 2 === 1;
    const segmentId = `outgoing-segment-${index}`;
    
    return {
      id: segmentId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          opacity: 1 - (index * 0.1), // Decreasing opacity for depth
          transform: isMirrored ? 'scaleX(-1)' : undefined,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Rotation effect during transition
        {
          id: `outgoing-rotate-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: incomingStartTime,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'rotate', val: angle, prog: 0 },
              { key: 'rotate', val: angle + rotationIntensity, prog: 1 },
            ],
          },
        },
        // Scale effect during transition
        {
          id: `outgoing-scale-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: incomingStartTime,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: scaleRange, prog: 1 },
            ],
          },
        },
        // Opacity fade out during transition
        {
          id: `outgoing-opacity-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: incomingStartTime,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'opacity', val: 1 - (index * 0.1), prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Brightness reduction for edge enhancement
        {
          id: `outgoing-brightness-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: incomingStartTime,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0 },
              { key: 'filter', val: 'brightness(0.7) contrast(1.2)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });
  
  // Create incoming video segments
  const incomingSegments: RenderableComponentData[] = segmentAngles.map((angle, index) => {
    const isMirrored = index % 2 === 1;
    const segmentId = `incoming-segment-${index}`;
    
    return {
      id: segmentId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          opacity: 0,
          transform: isMirrored ? 'scaleX(-1)' : undefined,
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: incomingVideo.duration + overlapDuration,
        },
      },
      effects: [
        // Rotation effect during transition
        {
          id: `incoming-rotate-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'rotate', val: angle - rotationIntensity, prog: 0 },
              { key: 'rotate', val: angle, prog: 1 },
            ],
          },
        },
        // Scale effect during transition
        {
          id: `incoming-scale-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'scale', val: scaleRange, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Opacity fade in during transition
        {
          id: `incoming-opacity-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1 - (index * 0.1), prog: 1 },
            ],
          },
        },
        // Brightness increase for edge enhancement
        {
          id: `incoming-brightness-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'filter', val: 'brightness(1.3) contrast(1.2)', prog: 0 },
              { key: 'filter', val: 'brightness(1) contrast(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });
  
  // Create chromatic aberration overlay layers (RGB)
  const chromaticLayers: RenderableComponentData[] = [
    // Red layer
    {
      id: 'chromatic-red',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: '#ff0000',
            mixBlendMode: 'screen',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: chromaticStart,
          duration: chromaticDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-red-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: chromaticDuration,
            mode: 'provider',
            targetIds: ['chromatic-red'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: chromaticIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: '-2px', prog: 0 },
              { key: 'translateX', val: '2px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Green layer
    {
      id: 'chromatic-green',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: '#00ff00',
            mixBlendMode: 'screen',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: chromaticStart,
          duration: chromaticDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-green-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: chromaticDuration,
            mode: 'provider',
            targetIds: ['chromatic-green'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: chromaticIntensity * 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateY', val: '-1px', prog: 0 },
              { key: 'translateY', val: '1px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Blue layer
    {
      id: 'chromatic-blue',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: '#0000ff',
            mixBlendMode: 'screen',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: chromaticStart,
          duration: chromaticDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-blue-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: chromaticDuration,
            mode: 'provider',
            targetIds: ['chromatic-blue'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: chromaticIntensity * 0.9, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: '1px', prog: 0 },
              { key: 'translateX', val: '-1px', prog: 0.5 },
              { key: 'translateX', val: '1px', prog: 1 },
              { key: 'translateY', val: '1px', prog: 0 },
              { key: 'translateY', val: '-1px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];
  
  // Assemble root container
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-prism-container',
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
    childrenData: [
      ...outgoingSegments,
      ...incomingSegments,
      ...chromaticLayers,
    ] as RenderableComponentData[],
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
  id: 'kaleidoscope-prism-transition',
  title: 'Kaleidoscope Prism Transition',
  description:
    'A mesmerizing kaleidoscope-style video transition where footage fragments into multiple rotating segments with mirror reflections. Creates a prism effect with chromatic color shifts using overlapping video layers at different rotation angles (60° increments), mirrored copies for kaleidoscope symmetry, and RGB color overlay layers that animate during the transition peak.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'kaleidoscope',
    'prism',
    'chromatic',
    'rotation',
    'mirror',
    'fragment',
    'psychedelic',
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
    overlapDuration: 1.4,
    rotationIntensity: 120,
    scaleRange: 0.5,
    chromaticIntensity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kaleidoscopePrismTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
