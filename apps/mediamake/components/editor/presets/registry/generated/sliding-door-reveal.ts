/**
 * Sliding Door Reveal Transition
 *
 * Creates a cinematic sliding door reveal transition with multiple rectangular panels 
 * that slide apart like elevator doors to reveal the new video underneath. Features 
 * three sets of double doors at different depths (main center doors, medium side doors, 
 * and small corner doors) that open with different timing and speed for a layered reveal 
 * effect. Includes metallic textures on door edges and light beams that shine through 
 * gaps as doors open.
 *
 * Features:
 * - 3 pairs of doors (6 panels total) at different depths
 * - Sequential opening with precise timing (main → side → corner)
 * - Metallic gradient textures on all door panels
 * - Light beam effects that appear through gaps
 * - Diminishing shadow effects during slide
 * - 1.4-second overlap period between videos
 * - Mechanical precision timing
 *
 * Use cases:
 * - Professional video transitions
 * - Cinematic reveals
 * - Dramatic scene changes
 * - Product unveils
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  
  overlapDuration: z.number().default(1.4).describe('Duration of the transition overlap in seconds'),
  
  doorColors: z.object({
    from: z.string().default('#374151').describe('Start color for metallic gradient'),
    via: z.string().default('#4B5563').describe('Middle color for metallic gradient'),
    to: z.string().default('#374151').describe('End color for metallic gradient'),
  }).optional().describe('Metallic gradient colors for door panels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;
  
  // Calculate total duration: sum of both videos minus overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  
  // Door colors
  const colorFrom = params.doorColors?.from ?? '#374151';
  const colorVia = params.doorColors?.via ?? '#4B5563';
  const colorTo = params.doorColors?.to ?? '#374151';
  const metalGradient = `linear-gradient(to right, ${colorFrom}, ${colorVia}, ${colorTo})`;
  
  // Timing calculations
  const transitionStart = video1.duration - overlapDuration; // When transition starts
  
  // Main doors: 0.8s duration, start at transitionStart
  const mainDoorStart = transitionStart;
  const mainDoorDuration = 0.8;
  
  // Side doors: 0.7s duration, 0.2s delay
  const sideDoorStart = transitionStart + 0.2;
  const sideDoorDuration = 0.7;
  
  // Corner doors: 0.6s duration, 0.4s delay
  const cornerDoorStart = transitionStart + 0.4;
  const cornerDoorDuration = 0.6;
  
  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Incoming video (behind doors, z-index: 0)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: video2.duration + overlapDuration,
        },
      },
    } as RenderableComponentData,
    
    // Main door left
    {
      id: 'main-door-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-1/2 h-full top-0',
          style: {
            left: '0%',
            background: metalGradient,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video-main-left',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full',
            style: {
              clipPath: 'inset(0 50% 0 0)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'main-door-left-slide',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: mainDoorStart,
            duration: mainDoorDuration,
            mode: 'provider',
            targetIds: ['main-door-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: -60, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'main-door-left-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: mainDoorStart,
            duration: mainDoorDuration,
            mode: 'provider',
            targetIds: ['main-door-left'],
            ranges: [
              { key: 'boxShadow', val: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', prog: 0 },
              { key: 'boxShadow', val: '0 10px 20px -5px rgba(0, 0, 0, 0.3)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Main door right
    {
      id: 'main-door-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-1/2 h-full top-0',
          style: {
            right: '0%',
            background: metalGradient,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video-main-right',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full',
            style: {
              clipPath: 'inset(0 0 0 50%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'main-door-right-slide',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: mainDoorStart,
            duration: mainDoorDuration,
            mode: 'provider',
            targetIds: ['main-door-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: 60, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'main-door-right-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: mainDoorStart,
            duration: mainDoorDuration,
            mode: 'provider',
            targetIds: ['main-door-right'],
            ranges: [
              { key: 'boxShadow', val: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', prog: 0 },
              { key: 'boxShadow', val: '0 10px 20px -5px rgba(0, 0, 0, 0.3)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Side door left
    {
      id: 'side-door-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-1/3',
          style: {
            left: '0%',
            height: '75%',
            top: '12.5%',
            background: metalGradient,
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)',
            zIndex: 20,
          },
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
          id: 'side-door-left-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: sideDoorStart,
            duration: sideDoorDuration,
            mode: 'provider',
            targetIds: ['side-door-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: -80, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'side-door-left-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: sideDoorStart,
            duration: sideDoorDuration,
            mode: 'provider',
            targetIds: ['side-door-left'],
            ranges: [
              { key: 'boxShadow', val: '0 20px 40px -10px rgba(0, 0, 0, 0.7)', prog: 0 },
              { key: 'boxShadow', val: '0 8px 16px -4px rgba(0, 0, 0, 0.3)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Side door right
    {
      id: 'side-door-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-1/3',
          style: {
            right: '0%',
            height: '75%',
            top: '12.5%',
            background: metalGradient,
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)',
            zIndex: 20,
          },
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
          id: 'side-door-right-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: sideDoorStart,
            duration: sideDoorDuration,
            mode: 'provider',
            targetIds: ['side-door-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: 80, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'side-door-right-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: sideDoorStart,
            duration: sideDoorDuration,
            mode: 'provider',
            targetIds: ['side-door-right'],
            ranges: [
              { key: 'boxShadow', val: '0 20px 40px -10px rgba(0, 0, 0, 0.7)', prog: 0 },
              { key: 'boxShadow', val: '0 8px 16px -4px rgba(0, 0, 0, 0.3)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Corner door left
    {
      id: 'corner-door-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-1/4',
          style: {
            left: '0%',
            height: '50%',
            top: '25%',
            background: metalGradient,
            boxShadow: '0 15px 30px -8px rgba(0, 0, 0, 0.6)',
            zIndex: 30,
          },
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
          id: 'corner-door-left-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: cornerDoorStart,
            duration: cornerDoorDuration,
            mode: 'provider',
            targetIds: ['corner-door-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: -100, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'corner-door-left-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: cornerDoorStart,
            duration: cornerDoorDuration,
            mode: 'provider',
            targetIds: ['corner-door-left'],
            ranges: [
              { key: 'boxShadow', val: '0 15px 30px -8px rgba(0, 0, 0, 0.6)', prog: 0 },
              { key: 'boxShadow', val: '0 5px 10px -3px rgba(0, 0, 0, 0.2)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Corner door right
    {
      id: 'corner-door-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-1/4',
          style: {
            right: '0%',
            height: '50%',
            top: '25%',
            background: metalGradient,
            boxShadow: '0 15px 30px -8px rgba(0, 0, 0, 0.6)',
            zIndex: 30,
          },
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
          id: 'corner-door-right-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: cornerDoorStart,
            duration: cornerDoorDuration,
            mode: 'provider',
            targetIds: ['corner-door-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: 100, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'corner-door-right-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: cornerDoorStart,
            duration: cornerDoorDuration,
            mode: 'provider',
            targetIds: ['corner-door-right'],
            ranges: [
              { key: 'boxShadow', val: '0 15px 30px -8px rgba(0, 0, 0, 0.6)', prog: 0 },
              { key: 'boxShadow', val: '0 5px 10px -3px rgba(0, 0, 0, 0.2)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Light beam main left
    {
      id: 'light-beam-main-left',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="position: absolute; left: 50%; height: 100%; width: 1px; background: linear-gradient(to bottom, transparent, white, transparent); z-index: 5;"></div>',
      },
      context: {
        timing: {
          start: mainDoorStart,
          duration: mainDoorDuration,
        },
      },
      effects: [
        {
          id: 'light-beam-main-left-anim',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: mainDoorDuration,
            mode: 'provider',
            targetIds: ['light-beam-main-left'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'width', val: 1, prog: 0, unit: 'px' },
              { key: 'width', val: 4, prog: 0.5, unit: 'px' },
              { key: 'width', val: 1, prog: 1, unit: 'px' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Light beam main right
    {
      id: 'light-beam-main-right',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="position: absolute; right: 50%; height: 100%; width: 1px; background: linear-gradient(to bottom, transparent, white, transparent); z-index: 5;"></div>',
      },
      context: {
        timing: {
          start: mainDoorStart,
          duration: mainDoorDuration,
        },
      },
      effects: [
        {
          id: 'light-beam-main-right-anim',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: mainDoorDuration,
            mode: 'provider',
            targetIds: ['light-beam-main-right'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'width', val: 1, prog: 0, unit: 'px' },
              { key: 'width', val: 4, prog: 0.5, unit: 'px' },
              { key: 'width', val: 1, prog: 1, unit: 'px' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Light beam side left
    {
      id: 'light-beam-side-left',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="position: absolute; left: 33.33%; top: 12.5%; height: 75%; width: 1px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.6), transparent); z-index: 15;"></div>',
      },
      context: {
        timing: {
          start: sideDoorStart,
          duration: sideDoorDuration,
        },
      },
      effects: [
        {
          id: 'light-beam-side-left-anim',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: sideDoorDuration,
            mode: 'provider',
            targetIds: ['light-beam-side-left'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'width', val: 1, prog: 0, unit: 'px' },
              { key: 'width', val: 3, prog: 0.5, unit: 'px' },
              { key: 'width', val: 1, prog: 1, unit: 'px' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Light beam side right
    {
      id: 'light-beam-side-right',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="position: absolute; right: 33.33%; top: 12.5%; height: 75%; width: 1px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.6), transparent); z-index: 15;"></div>',
      },
      context: {
        timing: {
          start: sideDoorStart,
          duration: sideDoorDuration,
        },
      },
      effects: [
        {
          id: 'light-beam-side-right-anim',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: sideDoorDuration,
            mode: 'provider',
            targetIds: ['light-beam-side-right'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'width', val: 1, prog: 0, unit: 'px' },
              { key: 'width', val: 3, prog: 0.5, unit: 'px' },
              { key: 'width', val: 1, prog: 1, unit: 'px' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'sliding-door-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-zinc-900',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'sliding-door-reveal',
  title: 'Sliding Door Reveal Transition',
  description: 'Multi-layered sliding door transition with 3 sets of double doors (main, side, corner) that slide apart at different speeds and timings to reveal the new video underneath. Features metallic gradient textures, light beams shining through gaps, and mechanical precision animations. Perfect for professional transitions between video segments.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'doors', 'reveal', 'sliding', 'elevator', 'mechanical', 'metallic', 'cinematic', 'layered', 'professional'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.4,
    doorColors: {
      from: '#374151',
      via: '#4B5563',
      to: '#374151',
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const slidingDoorRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
