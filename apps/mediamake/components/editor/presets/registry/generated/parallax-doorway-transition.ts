/**
 * Parallax Doorway Transition Preset
 *
 * Creates a cinematic parallax doorway transition where multiple depth layers of both outgoing
 * and incoming videos move at different speeds to simulate depth perception as the viewer moves
 * through a room.
 *
 * Features:
 * - **Three-Layer Depth System**: Splits each video into foreground, midground, and background layers
 * - **Differential Movement**: Each layer slides and scales at different rates for depth effect
 * - **Focus Blur Shift**: Subtle blur that shifts from background to foreground during transition
 * - **CSS Masking**: Uses linear-gradient masks to separate video into depth layers
 * - **Staggered Entrance**: Incoming layers enter with slight delay for enhanced depth
 * - **Flexible Timing**: Configurable transition duration with optimized easing per layer
 *
 * Technical Implementation:
 * - Uses 6 VideoAtom instances (3 per video) with identical source but different masks
 * - Outgoing layers slide left and scale down at varying rates
 * - Incoming layers slide in from right with opposite transforms
 * - Z-index ordering ensures proper layering (background=1, midground=2, foreground=3, etc.)
 * - Blur effects enhance depth perception during transition
 *
 * Use Cases:
 * - Cinematic video transitions with depth
 * - Room-to-room navigation effects
 * - Doorway/portal style transitions
 * - Immersive video storytelling
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(1.8).describe('Duration of the parallax transition in seconds'),
  overlapDuration: z.number().default(1.5).describe('Duration of the overlap period (how much videos overlap) in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, overlapDuration } = params;

  // Calculate BaseLayout duration: sum of videos minus overlap
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;

  // Incoming video starts before outgoing ends to create overlap
  const incomingStartTime = video1.duration - overlapDuration;

  // Staggered entrance: incoming layers start slightly later for depth effect
  const incomingStaggerDelay = 0.3;

  const childrenData: RenderableComponentData[] = [
    // ==================== OUTGOING VIDEO LAYERS ====================
    
    // Outgoing Background Layer (far wall)
    {
      id: 'outgoing-background',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 1,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 50%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 50%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-bg-transform',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-background'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-30%', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-bg-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-background'],
            ranges: [
              { key: 'filter', val: 'blur(2px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing Midground Layer (walls)
    {
      id: 'outgoing-midground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 2,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-mid-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-midground'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-60%', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.9, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing Foreground Layer (furniture)
    {
      id: 'outgoing-foreground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 3,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-fg-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-foreground'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-100%', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-fg-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-foreground'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(2px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // ==================== INCOMING VIDEO LAYERS ====================

    // Incoming Background Layer (far wall)
    {
      id: 'incoming-background',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 4,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 50%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 50%)',
        },
      },
      context: {
        timing: {
          start: incomingStartTime + incomingStaggerDelay,
          duration: video2.duration + overlapDuration - incomingStaggerDelay,
        },
      },
      effects: [
        {
          id: 'incoming-bg-transform',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 1.5,
            mode: 'provider',
            targetIds: ['incoming-background'],
            ranges: [
              { key: 'translateX', val: '30%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-bg-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 1.5,
            mode: 'provider',
            targetIds: ['incoming-background'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(2px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming Midground Layer (walls)
    {
      id: 'incoming-midground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 5,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 75%)',
        },
      },
      context: {
        timing: {
          start: incomingStartTime + incomingStaggerDelay,
          duration: video2.duration + overlapDuration - incomingStaggerDelay,
        },
      },
      effects: [
        {
          id: 'incoming-mid-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 1.5,
            mode: 'provider',
            targetIds: ['incoming-midground'],
            ranges: [
              { key: 'translateX', val: '60%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              { key: 'scale', val: 0.9, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming Foreground Layer (furniture)
    {
      id: 'incoming-foreground',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 6,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 70%, rgba(0,0,0,1) 100%)',
        },
      },
      context: {
        timing: {
          start: incomingStartTime + incomingStaggerDelay,
          duration: video2.duration + overlapDuration - incomingStaggerDelay,
        },
      },
      effects: [
        {
          id: 'incoming-fg-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: 1.5,
            mode: 'provider',
            targetIds: ['incoming-foreground'],
            ranges: [
              { key: 'translateX', val: '100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-fg-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: 1.5,
            mode: 'provider',
            targetIds: ['incoming-foreground'],
            ranges: [
              { key: 'filter', val: 'blur(2px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'parallax-doorway-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'parallax-doorway-transition',
  title: 'Parallax Doorway Transition',
  description: 'A cinematic parallax doorway transition where multiple depth layers of both outgoing and incoming videos move at different speeds to simulate depth perception. Uses 6 VideoAtom instances (3 per video) with CSS masks for layer separation. Each layer slides and scales at different rates with varying easing, while a focus blur shifts from background to foreground to enhance the 3D doorway effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'parallax', 'doorway', 'depth', 'cinematic', 'video', 'layers', 'mask'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.8,
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const parallaxDoorwayTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
