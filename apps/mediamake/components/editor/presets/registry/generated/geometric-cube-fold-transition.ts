/**
 * Geometric Cube Fold Transition Preset
 *
 * Creates a geometric folding cube transition effect where videos appear to be on the faces
 * of a cube that unfolds, rotates to reveal the next video, and folds back flat.
 *
 * Features:
 * - **Cube Geometry Simulation**: 2D-simulated 3D cube with precise transforms
 * - **Four-Phase Animation**: Fold in (scale down), rotate (cube spin), unfold (scale up)
 * - **Sharp Edges**: Clean 90-degree angles and precise geometric structure
 * - **Depth Enhancement**: Subtle shadow overlays create 3D illusion during fold/unfold
 * - **Dual Video Support**: Outgoing video on front face, incoming on back (rotated 180°)
 * - **Smooth Transitions**: Eased animations for professional paper-folding effect
 *
 * Use Cases:
 * - Creating dramatic transitions between video segments
 * - Building geometric motion graphics
 * - Adding paper-folding style transitions
 * - Professional video transitions with 3D illusion
 *
 * Technical Implementation:
 * - Uses CSS 3D transforms (rotateY, scale) to simulate cube geometry
 * - Four animation phases with precise timing breakpoints
 * - Shadow overlays fade in/out during rotation for depth
 * - Videos positioned on front/back faces with backface-hidden
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
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Outgoing media (front face of cube)'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Incoming media (back face of cube)'),
  
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Total duration of the transition in seconds'),
  
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Intensity of shadow overlays (0-1)'),
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
    shadowIntensity = 0.6,
  } = params;

  // Determine component IDs based on media type
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Animation phase timings (relative to container start)
  // Phase 1: 0s-0.5s: Scale down to 0.8
  // Phase 2: 0.5s-1.0s: Rotate 180° (show incoming)
  // Phase 3: 1.0s-1.5s: Scale back up to 1
  const phase1Duration = transitionDuration / 3; // 0-0.5s
  const phase2Duration = transitionDuration / 3; // 0.5-1.0s
  const phase3Duration = transitionDuration / 3; // 1.0-1.5s

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (front face)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Incoming video (back face, rotated 180°)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Shadow overlay 1 (diagonal gradient, fades during rotation)
    {
      id: 'shadow-overlay-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(45deg, rgba(0,0,0,${shadowIntensity}) 0%, transparent 50%); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          opacity: 0,
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
          id: 'shadow-1-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase1Duration, // Start at 0.5s
            duration: phase2Duration, // 0.5s duration (0.5s-1.0s)
            mode: 'provider',
            targetIds: ['shadow-overlay-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Shadow overlay 2 (opposite diagonal gradient)
    {
      id: 'shadow-overlay-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(-45deg, rgba(0,0,0,${shadowIntensity}) 0%, transparent 50%); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          opacity: 0,
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
          id: 'shadow-2-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase1Duration, // Start at 0.5s
            duration: phase2Duration, // 0.5s duration (0.5s-1.0s)
            mode: 'provider',
            targetIds: ['shadow-overlay-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Cube container with 3D transforms
  const cubeContainer: RenderableComponentData = {
    id: 'cube-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData,
    effects: [
      // Complex four-phase animation:
      // Phase 1 (0-0.5s): Scale down to 0.8
      // Phase 2 (0.5-1.0s): Rotate 180° while at scale 0.8
      // Phase 3 (1.0-1.5s): Scale back up to 1
      {
        id: 'cube-transform',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['cube-container'],
          ranges: [
            // Scale animation
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 0.33 }, // End of phase 1
            { key: 'scale', val: 0.8, prog: 0.67 }, // End of phase 2
            { key: 'scale', val: 1, prog: 1 }, // End of phase 3

            // Rotation animation
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 0, prog: 0.33 }, // Hold during phase 1
            { key: 'rotateY', val: 180, prog: 0.67 }, // Rotate during phase 2
            { key: 'rotateY', val: 180, prog: 1 }, // Hold during phase 3
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'geometric-cube-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [cubeContainer],
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
  id: 'geometric-cube-fold-transition',
  title: 'Geometric Cube Fold Transition',
  description:
    'A geometric folding cube transition where videos appear on cube faces that unfold, rotate to reveal the next video, and fold back flat. Features precise 90-degree angles, shadow depth enhancement, and smooth paper-folding effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'cube', 'geometric', '3d', 'fold', 'paper-folding'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 1.5,
    shadowIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const geometricCubeFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
