/**
 * Hinged Door Swing Transition Preset
 *
 * This preset creates a 3D hinged door swing transition where the outgoing video
 * appears to be on a door that swings open to reveal the incoming video behind it.
 * The door rotates on the Y-axis from 0 to -90 degrees with its pivot point on the left edge.
 *
 * Features:
 * - **3D Door Swing**: Outgoing video rotates on Y-axis using CSS 3D transforms
 * - **Realistic Shadows**: Dynamic shadow overlay that moves across incoming video as door swings
 * - **Brightness Animation**: Incoming video starts darker and brightens as door opens
 * - **Door Creak Sound**: Optional audio effect timed with the swing motion
 * - **Perspective Container**: Uses CSS perspective for realistic 3D effect
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Building cinematic scene changes
 * - Adding realistic door-opening effects to presentations
 * - Creating room-to-room transition effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video (on the door)'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video that appears on the swinging door'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video (behind the door)'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video revealed behind the door'),
  
  doorCreakSound: z.object({
    src: z.string().describe('Source URL of the door creak sound effect'),
  }).optional().describe('Optional door creak sound effect for added realism'),
  
  transitionDuration: z.number().default(1.6).describe('Duration of the door swing transition in seconds'),
  
  creakVolume: z.number().min(0).max(1).default(0.3).describe('Volume level for the door creak sound (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, doorCreakSound, transitionDuration, creakVolume } = params;

  // Calculate total duration: sum of both videos minus the transition overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Incoming video starts when outgoing video begins transitioning
  const incomingVideoStart = video1.duration - transitionDuration;

  const childrenData: RenderableComponentData[] = [];

  // 1. Incoming video (behind the door) - starts darker and brightens
  childrenData.push({
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0',
      fit: 'cover',
      style: {
        filter: 'brightness(0.6)',
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-brightness-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'brightness(0.6)', prog: 0 },
            { key: 'filter', val: 'brightness(1)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 2. Shadow overlay - moves across incoming video as door swings
  childrenData.push({
    id: 'shadow-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 50%)',
          opacity: 1,
        },
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'shadow-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['shadow-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData);

  // 3. Outgoing video (on the door) - swings open with Y-axis rotation
  childrenData.push({
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0',
      fit: 'cover',
      style: {
        transformOrigin: 'left center',
        backfaceVisibility: 'hidden',
        transform: 'rotateY(0deg)',
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
        id: 'door-swing-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-cubic',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -90, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 4. Door creak audio (optional)
  if (doorCreakSound && doorCreakSound.src) {
    childrenData.push({
      id: 'door-creak-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: doorCreakSound.src,
        volume: creakVolume,
        startFrom: 0,
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'hinged-door-swing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1200px',
          transformStyle: 'preserve-3d',
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
  id: 'hinged-door-swing-transition',
  title: 'Hinged Door Swing Transition',
  description: 'A 3D door swing transition where the outgoing video appears on a door that swings open (rotates on Y-axis from 0 to -90 degrees) to reveal the incoming video behind it. Features CSS 3D transforms with perspective, realistic moving shadows, brightness animation on the incoming video, and a door creak sound effect for added realism. The door pivot point is set to the left edge using transform-origin.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'door', 'swing', 'cinematic', 'perspective'],
  defaultInputParams: {
    video1: {
      src: '',
      duration: 5,
    },
    video2: {
      src: '',
      duration: 5,
    },
    doorCreakSound: {
      src: '',
    },
    transitionDuration: 1.6,
    creakVolume: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hingedDoorSwingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};