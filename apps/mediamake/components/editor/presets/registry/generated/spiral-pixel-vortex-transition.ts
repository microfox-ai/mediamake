/**
 * Spiral Pixel Vortex Corruption Transition Preset
 *
 * A complex transition effect where videos twist into a data corruption spiral with datamoshing-style
 * frame blending. The outgoing video spirals outward while pixels stretch and distort along the spiral
 * path, creating a vortex of corrupted data. The incoming video spirals inward from the edges with
 * inverse corruption that resolves as it reaches the center.
 *
 * Features:
 * - Circular/spiral segments using clip-path and transform-origin
 * - Outgoing video animates with rotation and scale (spiral outward)
 * - Incoming video spirals inward with inverse corruption
 * - Filter effects including blur and contrast variations along spiral radius
 * - Frame blending effect with multiple video copies at low opacity
 * - Mix-blend-mode for glow effect at spiral edges
 * - Datamoshing-style frame blending during spiral motion
 * - Incremental rotation offsets for organic spiral effect
 * - Different animation timing for each segment
 *
 * Use cases:
 * - Creating visually stunning transitions between video clips
 * - Adding glitch/corruption aesthetic to video content
 * - Building cinematic transitions with digital artifacts
 * - Creating experimental video art with spiral distortion
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
    startFrom: z.number().optional().describe('Start time in seconds for the outgoing video'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds for the incoming video'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Number of spiral segments (6 for 60-degree slices)
  const numSegments = 6;

  // Helper function to create clip-path polygon for spiral segments
  const createSegmentClipPath = (segmentIndex: number): string => {
    const angleStart = (segmentIndex * 360) / numSegments;
    const angleEnd = ((segmentIndex + 1) * 360) / numSegments;

    // Convert angles to radians
    const radStart = (angleStart * Math.PI) / 180;
    const radEnd = (angleEnd * Math.PI) / 180;

    // Calculate points on a circle (using percentages)
    const x1 = 50 + 50 * Math.cos(radStart);
    const y1 = 50 + 50 * Math.sin(radStart);
    const x2 = 50 + 50 * Math.cos(radEnd);
    const y2 = 50 + 50 * Math.sin(radEnd);

    return `polygon(50% 50%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  };

  // Create outgoing video segments with spiral distortion
  const outgoingSegments: RenderableComponentData[] = [];
  for (let i = 0; i < numSegments; i++) {
    const rotationOffset = i * (360 / numSegments);
    const animationDelay = i * 0.05; // Staggered timing (50ms per segment)
    const blurIntensity = 2 + i * 1.5; // Increasing blur towards outer segments

    outgoingSegments.push({
      id: `outgoing-segment-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom || 0,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          clipPath: createSegmentClipPath(i),
          transformOrigin: 'center center',
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
          id: `outgoing-spiral-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: animationDelay,
            duration: transitionDuration - animationDelay,
            mode: 'provider',
            targetIds: [`outgoing-segment-${i}`],
            ranges: [
              // Rotation - spiral outward with 720 degrees
              { key: 'rotate', val: rotationOffset, prog: 0 },
              { key: 'rotate', val: rotationOffset + 720, prog: 1 },
              // Scale - expand outward
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 2 + i * 0.2, prog: 1 },
              // Opacity fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              // Blur distortion
              { key: 'filter', val: 'blur(0px) contrast(1)', prog: 0 },
              { key: 'filter', val: `blur(${blurIntensity}px) contrast(0.8)`, prog: 0.5 },
              { key: 'filter', val: `blur(${blurIntensity * 2}px) contrast(0.6)`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video segments with inverse spiral
  const incomingSegments: RenderableComponentData[] = [];
  for (let i = 0; i < numSegments; i++) {
    const rotationOffset = i * (360 / numSegments);
    const animationDelay = i * 0.05; // Staggered timing
    const blurIntensity = 8 - i * 1.2; // Decreasing blur towards center

    incomingSegments.push({
      id: `incoming-segment-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: incomingVideo.startFrom || 0,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          clipPath: createSegmentClipPath(i),
          transformOrigin: 'center center',
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
          id: `incoming-spiral-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: animationDelay,
            duration: transitionDuration - animationDelay,
            mode: 'provider',
            targetIds: [`incoming-segment-${i}`],
            ranges: [
              // Rotation - spiral inward (negative rotation)
              { key: 'rotate', val: rotationOffset - 720, prog: 0 },
              { key: 'rotate', val: rotationOffset, prog: 1 },
              // Scale - contract inward
              { key: 'scale', val: 0.5 - i * 0.05, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 1 },
              // Blur resolution
              { key: 'filter', val: `blur(${blurIntensity}px) contrast(0.7)`, prog: 0 },
              { key: 'filter', val: `blur(${blurIntensity / 2}px) contrast(0.9)`, prog: 0.5 },
              { key: 'filter', val: 'blur(0px) contrast(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Frame blending layers (datamoshing effect)
  const blendLayers: RenderableComponentData[] = [
    // Outgoing blend layer 1
    {
      id: 'blend-layer-outgoing-1',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: outgoingVideo.startFrom || 0,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          pointerEvents: 'none',
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
          id: 'blend-effect-outgoing-1',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['blend-layer-outgoing-1'],
            ranges: [
              { key: 'opacity', val: 0.15, prog: 0 },
              { key: 'opacity', val: 0.25, prog: 0.3 },
              { key: 'opacity', val: 0.1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Outgoing blend layer 2 (slightly offset)
    {
      id: 'blend-layer-outgoing-2',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        startFrom: (outgoingVideo.startFrom || 0) + 0.05,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          pointerEvents: 'none',
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
          id: 'blend-effect-outgoing-2',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['blend-layer-outgoing-2'],
            ranges: [
              { key: 'opacity', val: 0.1, prog: 0 },
              { key: 'opacity', val: 0.2, prog: 0.4 },
              { key: 'opacity', val: 0.05, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 180, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming blend layer 1
    {
      id: 'blend-layer-incoming-1',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: incomingVideo.startFrom || 0,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          pointerEvents: 'none',
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
          id: 'blend-effect-incoming-1',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['blend-layer-incoming-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.1, prog: 0.3 },
              { key: 'opacity', val: 0.25, prog: 0.6 },
              { key: 'opacity', val: 0.15, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming blend layer 2 (slightly offset)
    {
      id: 'blend-layer-incoming-2',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        startFrom: (incomingVideo.startFrom || 0) + 0.05,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          pointerEvents: 'none',
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
          id: 'blend-effect-incoming-2',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['blend-layer-incoming-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.05, prog: 0.2 },
              { key: 'opacity', val: 0.2, prog: 0.5 },
              { key: 'opacity', val: 0.1, prog: 1 },
              { key: 'rotate', val: -180, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Corruption overlay (adds extra glow/distortion at spiral edges)
  const corruptionOverlay: RenderableComponentData = {
    id: 'corruption-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(circle at center, transparent 30%, rgba(255, 0, 100, 0.1) 60%, rgba(0, 255, 255, 0.15) 100%)',
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
    effects: [
      {
        id: 'corruption-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['corruption-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.5 },
            { key: 'scale', val: 0.9, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Assemble all children in correct layering order
  const allChildren: RenderableComponentData[] = [
    // Bottom layer: Outgoing video segments
    ...outgoingSegments,
    // Middle layer: Incoming video segments
    ...incomingSegments,
    // Top layers: Blend layers for datamoshing
    ...blendLayers,
    // Overlay: Corruption glow effect
    corruptionOverlay,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'spiral-vortex-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: allChildren,
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
  id: 'spiral-pixel-vortex-transition',
  title: 'Spiral Pixel Vortex Corruption Transition',
  description:
    'A transition effect where videos twist into a data corruption spiral with datamoshing-style frame blending. The outgoing video spirals outward with pixel stretching and distortion, while the incoming video spirals inward with inverse corruption that resolves at the center.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'spiral',
    'vortex',
    'corruption',
    'glitch',
    'datamosh',
    'visual-effects',
    'cinematic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralPixelVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
