/**
 * Perspective Corridor Transition Preset
 *
 * This preset creates a dynamic perspective corridor transition effect that simulates running through a long hallway.
 * The outgoing video shrinks into the distance with perspective distortion while door panels on both sides rush past
 * the viewer with motion blur. The incoming video emerges from a tiny point in the distance and rapidly expands to
 * fill the frame. Alternating light bands move across the scene to simulate passing under corridor lights.
 *
 * Features:
 * - **3D Perspective**: Uses CSS perspective to create depth illusion
 * - **Door Panels**: Multiple side panels that slide past with motion blur
 * - **Distance Shrinking**: Outgoing video shrinks to vanishing point
 * - **Distance Expansion**: Incoming video grows from distance
 * - **Dynamic Lighting**: Animated light bands simulate corridor lights
 * - **Motion Blur**: Applied during rapid movement phases
 * - **Customizable Duration**: Configurable transition timing
 *
 * Use cases:
 * - Creating immersive video transitions
 * - Simulating forward motion through spaces
 * - Building cinematic corridor effects
 * - Adding depth to video transitions
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number()
    .default(1.8)
    .describe('Duration of the perspective transition effect in seconds'),
  
  overlapDuration: z.number()
    .default(1)
    .describe('Duration of overlap between videos in seconds (transition start offset)'),
  
  doorCount: z.number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Number of door pairs to generate on each side of the corridor'),
  
  lightBandCount: z.number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Number of light bands to simulate corridor lighting'),
  
  perspective: z.number()
    .default(800)
    .describe('CSS perspective value in pixels (lower = more dramatic)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    overlapDuration,
    doorCount,
    lightBandCount,
    perspective,
  } = params;

  // Calculate total duration: sum of videos minus overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Generate door panels with staggered timing
  const generateDoorPanels = (): RenderableComponentData[] => {
    const doors: RenderableComponentData[] = [];
    const doorStagger = 0.3; // Time between each door pair starting
    const doorDuration = 0.6; // How long each door takes to pass
    
    for (let i = 0; i < doorCount; i++) {
      const doorStartTime = i * doorStagger;
      
      // Left door
      doors.push({
        id: `door-left-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background: rgba(30, 30, 40, 0.9); border-right: 2px solid rgba(100, 100, 120, 0.5);"></div>',
          className: 'absolute left-0 h-full',
          style: {
            width: '80px',
            transformStyle: 'preserve-3d',
          },
        },
        context: {
          timing: {
            start: doorStartTime,
            duration: doorDuration,
          },
        },
        effects: [
          {
            id: `door-left-${i}-move`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: doorDuration,
              mode: 'provider',
              targetIds: [`door-left-${i}`],
              ranges: [
                { key: 'translateZ', val: 200, prog: 0 },
                { key: 'translateZ', val: -300, prog: 1 },
              ],
            },
          },
          {
            id: `door-left-${i}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: doorDuration,
              mode: 'provider',
              targetIds: [`door-left-${i}`],
              ranges: [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(3px)', prog: 0.5 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
      
      // Right door
      doors.push({
        id: `door-right-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background: rgba(30, 30, 40, 0.9); border-left: 2px solid rgba(100, 100, 120, 0.5);"></div>',
          className: 'absolute right-0 h-full',
          style: {
            width: '80px',
            transformStyle: 'preserve-3d',
          },
        },
        context: {
          timing: {
            start: doorStartTime,
            duration: doorDuration,
          },
        },
        effects: [
          {
            id: `door-right-${i}-move`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: doorDuration,
              mode: 'provider',
              targetIds: [`door-right-${i}`],
              ranges: [
                { key: 'translateZ', val: 200, prog: 0 },
                { key: 'translateZ', val: -300, prog: 1 },
              ],
            },
          },
          {
            id: `door-right-${i}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: doorDuration,
              mode: 'provider',
              targetIds: [`door-right-${i}`],
              ranges: [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(3px)', prog: 0.5 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return doors;
  };

  // Generate light bands with staggered animation
  const generateLightBands = (): RenderableComponentData[] => {
    const bands: RenderableComponentData[] = [];
    const bandStagger = 0.15; // Time offset between bands
    const bandDuration = 0.5; // Base duration for each band
    
    for (let i = 0; i < lightBandCount; i++) {
      const bandStartTime = i * bandStagger;
      const bandSpeed = bandDuration + (i * 0.05); // Vary speed slightly
      
      bands.push({
        id: `light-band-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.15), transparent);"></div>',
          className: 'absolute w-full',
          style: {
            height: '80px',
            opacity: 0.6,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: bandStartTime,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `light-band-${i}-move`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: bandSpeed,
              mode: 'provider',
              targetIds: [`light-band-${i}`],
              ranges: [
                { key: 'translateY', val: '-100px', prog: 0 },
                { key: 'translateY', val: '110vh', prog: 1 },
              ],
            },
          },
          {
            id: `light-band-${i}-pulse`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: bandSpeed * 0.6,
              mode: 'provider',
              targetIds: [`light-band-${i}`],
              ranges: [
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 0.5 },
                { key: 'opacity', val: 0.3, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return bands;
  };

  const doorPanels = generateDoorPanels();
  const lightBands = generateLightBands();

  // Outgoing video - shrinks to distance
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
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
        id: 'outgoing-perspective',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.1, prog: 1 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: -500, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video - expands from distance
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'incoming-perspective',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration - overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'translateZ', val: -500, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Door panels container
  const doorPanelsContainer: RenderableComponentData = {
    id: 'door-panels-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: doorPanels,
  };

  // Light bands container
  const lightBandsContainer: RenderableComponentData = {
    id: 'light-bands-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: lightBands,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'perspective-corridor-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-900',
        style: {
          perspective: `${perspective}px`,
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
      outgoingVideo,
      doorPanelsContainer,
      incomingVideo,
      lightBandsContainer,
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
  id: 'perspective-corridor-transition',
  title: 'Perspective Corridor Transition',
  description: 'A dynamic video transition that simulates running through a long hallway. The outgoing video shrinks into the distance with perspective distortion while door panels rush past on both sides. The incoming video emerges from a tiny point in the distance and expands to fill the frame. Features alternating light bands that simulate passing under corridor lights, with motion blur effects during rapid movement phases.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'perspective', '3d', 'corridor', 'hallway', 'depth', 'motion-blur', 'cinematic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.8,
    overlapDuration: 1,
    doorCount: 4,
    lightBandCount: 4,
    perspective: 800,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const perspectiveCorridorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
