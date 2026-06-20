/**
 * Kaleidoscope Crystal Transition Preset
 *
 * This preset creates a mesmerizing kaleidoscope effect where videos fragment into 8 triangular
 * crystalline segments that mirror, rotate, and spiral outward creating mandala patterns. Each
 * segment rotates at different speeds and directions with prismatic color shifts and rainbow
 * refractions on crystal edges.
 *
 * Features:
 * - **8 Triangular Wedges**: Video splits into 8 mirrored triangular segments
 * - **Mandala Patterns**: Segments rotate around center point creating kaleidoscope effect
 * - **Variable Rotation**: Each segment rotates at different speed/direction
 * - **Spiral Motion**: Segments spiral outward during transition using polar coordinates
 * - **Mirror Effect**: Alternate segments mirrored with scaleX(-1)
 * - **Prismatic Colors**: Hue-rotate filter animations for rainbow effects
 * - **Crystal Edges**: Mix-blend-mode: screen for light interaction
 * - **Seamless Transition**: 1.6s overlap between videos
 *
 * Use cases:
 * - Creating psychedelic video transitions
 * - Building kaleidoscope-style visual effects
 * - Adding crystalline fragmentation effects
 * - Creating mesmerizing mandala animations
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
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  transitionDuration: z.number().default(1.6).describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Define 8 triangular wedge clip-paths (45-degree segments around center)
  const wedgeClipPaths = [
    'polygon(50% 50%, 100% 50%, 92.68% 70.71%)', // 0° - 45° (right)
    'polygon(50% 50%, 92.68% 70.71%, 70.71% 92.68%)', // 45° - 90° (bottom-right)
    'polygon(50% 50%, 70.71% 92.68%, 50% 100%)', // 90° - 135° (bottom)
    'polygon(50% 50%, 50% 100%, 29.29% 92.68%)', // 135° - 180° (bottom-left)
    'polygon(50% 50%, 29.29% 92.68%, 7.32% 70.71%)', // 180° - 225° (left)
    'polygon(50% 50%, 7.32% 70.71%, 0% 50%)', // 225° - 270° (left-top)
    'polygon(50% 50%, 0% 50%, 7.32% 29.29%)', // 270° - 315° (top-left)
    'polygon(50% 50%, 7.32% 29.29%, 29.29% 7.32%)', // 315° - 360° (top)
  ];

  // Spiral outward coordinates (polar to cartesian)
  const spiralCoords = [
    { x: 150, y: 0 }, // 0° (right)
    { x: 106, y: 106 }, // 45° (bottom-right)
    { x: 0, y: 150 }, // 90° (bottom)
    { x: -106, y: 106 }, // 135° (bottom-left)
    { x: -150, y: 0 }, // 180° (left)
    { x: -106, y: -106 }, // 225° (top-left)
    { x: 0, y: -150 }, // 270° (top)
    { x: 106, y: -106 }, // 315° (top-right)
  ];

  // Create video1 wedges (outgoing)
  const video1Wedges = wedgeClipPaths.map((clipPath, index) => {
    const isMirrored = index % 2 === 1; // Mirror alternate segments
    const rotationDirection = isMirrored ? -360 : 360; // Alternate rotation direction
    const coords = spiralCoords[index];

    return {
      id: `video1-wedge-${index}`,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          clipPath,
          transformOrigin: 'center center',
          mixBlendMode: 'screen',
          ...(isMirrored && { transform: 'scaleX(-1)' }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Rotate and spiral out during transition
        {
          id: `wedge-${index}-rotate-out`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`video1-wedge-${index}`],
            type: 'ease-out',
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationDirection, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: coords.x, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: coords.y, prog: 1 },
            ],
          },
        },
        // Prismatic hue rotation
        {
          id: `wedge-${index}-hue-rotate`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`video1-wedge-${index}`],
            type: 'linear',
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
            ranges: [
              { key: 'hue-rotate', val: 0, prog: 0 },
              { key: 'hue-rotate', val: 360, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create video2 wedges (incoming)
  const video2Wedges = wedgeClipPaths.map((clipPath, index) => {
    const isMirrored = index % 2 === 1;
    const rotationDirection = isMirrored ? -360 : 360;
    const coords = spiralCoords[index];

    return {
      id: `video2-wedge-${index}`,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          clipPath,
          transformOrigin: 'center center',
          mixBlendMode: 'screen',
          ...(isMirrored && { transform: 'scaleX(-1)' }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video2.duration,
        },
      },
      effects: [
        // Spiral in from outward position
        {
          id: `wedge2-${index}-rotate-in`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`video2-wedge-${index}`],
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'rotate', val: rotationDirection, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'translateX', val: coords.x, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: coords.y, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Reverse hue rotation
        {
          id: `wedge2-${index}-hue-rotate`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`video2-wedge-${index}`],
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'hue-rotate', val: 360, prog: 0 },
              { key: 'hue-rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Video 1 container
  const video1Container: RenderableComponentData = {
    id: 'video1-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: video1Wedges,
  };

  // Video 2 container (starts during transition overlap)
  const video2Container: RenderableComponentData = {
    id: 'video2-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: video2Wedges,
  };

  // Rainbow overlay for crystal edge effects
  const rainbowOverlay: RenderableComponentData = {
    id: 'rainbow-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at center, transparent 30%, rgba(255,0,255,0.1) 40%, rgba(0,255,255,0.1) 50%, rgba(255,255,0,0.1) 60%, rgba(255,0,0,0.1) 70%, rgba(0,255,0,0.1) 80%, rgba(0,0,255,0.1) 90%); mix-blend-mode: screen; opacity: 0.4;"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-crystal-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
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
    childrenData: [video1Container, video2Container, rainbowOverlay],
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
  id: 'kaleidoscope-crystal-transition',
  title: 'Kaleidoscope Crystal Transition',
  description: 'Mesmerizing kaleidoscope effect where videos fragment into 8 triangular crystalline segments that mirror, rotate at different speeds, and spiral outward creating mandala patterns with prismatic color shifts and rainbow refractions',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'kaleidoscope', 'crystal', 'mandala', 'prismatic', 'psychedelic', 'mirror', 'spiral', 'fragment'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kaleidoscopeCrystalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};