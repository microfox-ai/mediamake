/**
 * Stacking Slide Transition Preset
 *
 * A card-dealing inspired transition effect where videos slide and stack like playing cards.
 * The outgoing video slides to the right while scaling down (to 0.9) and rotating (0deg to 15deg),
 * while the incoming video slides in from the left, scaling up (0.8 to 1) and rotating (-15deg to 0deg).
 * 
 * Features:
 * - Card-like stacking animation with 3D perspective
 * - Parallax depth layers moving at different speeds during transition
 * - Smooth scale and rotation transformations
 * - 2-second overlap period for the transition effect
 * - Z-index layering for proper depth perception
 * 
 * Technical Details:
 * - Uses 3D perspective (1000px) for enhanced depth illusion
 * - Outgoing video: translateX 0 to 100%, scale 1 to 0.9, rotateY 0deg to 15deg
 * - Incoming video: translateX -100% to 0, scale 0.8 to 1, rotateY -15deg to 0deg
 * - Parallax layers at 50% and 75% speeds with partial opacity (0.3-0.5)
 * - Total duration: video1.duration + video2.duration - 2s overlap
 * 
 * Use Cases:
 * - Dynamic video transitions for montages
 * - Card-shuffle style scene changes
 * - Presentation-style video sequences
 * - Creative storytelling transitions
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
  }).describe('First video (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate when transition starts (relative to container start)
  const transitionStart = video1.duration - transitionDuration;

  // Outgoing video layer (z-index: 0)
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0 transform-gpu',
      style: {
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
        id: 'outgoing-slide-scale-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            // Slide right
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.9, prog: 1 },
            // Rotate Y
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 15, prog: 1 },
          ],
        },
      },
    ],
  };

  // Parallax layer 1 - Outgoing video duplicate (z-index: 10)
  const parallaxLayer1: RenderableComponentData = {
    id: 'parallax-layer-1',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0 transform-gpu',
      style: {
        opacity: 0.3,
        transformOrigin: 'center center',
        zIndex: 10,
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
        id: 'parallax-1-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['parallax-layer-1'],
          ranges: [
            // Move at 50% speed
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '50%', prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.95, prog: 1 },
          ],
        },
      },
    ],
  };

  // Parallax layer 2 - Incoming video preview (z-index: 20)
  const parallaxLayer2: RenderableComponentData = {
    id: 'parallax-layer-2',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0 transform-gpu',
      style: {
        opacity: 0.5,
        transformOrigin: 'center center',
        zIndex: 20,
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
        id: 'parallax-2-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['parallax-layer-2'],
          ranges: [
            // Move at 75% speed
            { key: 'translateX', val: '-75%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 0.95, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video layer (z-index: 30)
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0 transform-gpu',
      style: {
        transformOrigin: 'center center',
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-slide-scale-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            // Slide from left
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
            // Scale up
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Rotate Y
            { key: 'rotateY', val: -15, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'stacking-slide-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
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
    childrenData: [
      outgoingVideoLayer,
      parallaxLayer1,
      parallaxLayer2,
      incomingVideoLayer,
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
  id: 'stacking-slide-transition',
  title: 'Stacking Slide Transition',
  description:
    'A card-dealing inspired video transition where outgoing video slides right with scale-down (to 0.9) and rotateY (0 to 15deg), while incoming video slides in from left scaling up (0.8 to 1) with rotateY (-15deg to 0deg). Features parallax depth layers at different speeds during the 2-second overlap, creating a 3D stacking illusion with perspective transform.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'stacking', 'slide', '3d', 'parallax', 'cards'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stackingSlideTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
