/**
 * Diamond Wipe Transition Preset
 *
 * Creates a geometric diamond-shaped wipe transition that expands from the center outward.
 * The diamond maintains perfect symmetry while expanding, with crisp edges and no blur.
 * Features a thin white border accent and subtle darkening of the outgoing video for depth.
 *
 * Features:
 * - **Geometric Diamond Shape**: Perfect 45-degree rotated square that scales from point to beyond frame
 * - **Crisp Edges**: No blur or antialiasing issues, sharp diamond boundaries
 * - **Border Accent**: Thin white border that follows the diamond expansion
 * - **Depth Effect**: Outgoing video darkens to 70% brightness during transition
 * - **Aspect Ratio Agnostic**: Handles any aspect ratio gracefully
 * - **Centered Scaling**: Diamond scales from exact center with proper positioning
 *
 * Use cases:
 * - Creating dynamic scene transitions with geometric style
 * - Professional video editing with clean wipe effects
 * - Music videos and motion graphics with sharp geometric transitions
 * - Corporate presentations requiring refined transition effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time of outgoing video in seconds'),
      endAt: z
        .number()
        .optional()
        .describe('End time of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time of incoming video in seconds'),
      endAt: z
        .number()
        .optional()
        .describe('End time of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the diamond wipe transition in seconds'),
  transitionStart: z
    .number()
    .default(0)
    .describe('Start time of the transition relative to parent in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, transitionStart } =
    params;

  // Calculate total duration (transition duration only, videos overlap)
  const totalDuration = transitionDuration;

  // Create brightness effect for outgoing video (darkens to 70%)
  const brightnessEffect = {
    id: 'outgoing-brightness-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-video'],
      ranges: [
        { key: 'filter', val: 'brightness(1)', prog: 0 },
        { key: 'filter', val: 'brightness(0.7)', prog: 1 },
      ],
    },
  };

  // Create scale/rotation effect for diamond clip container
  const scaleRotationEffect = {
    id: 'diamond-scale-rotation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['diamond-clip-container'],
      ranges: [
        { key: 'transform', val: 'scale(0) rotate(45deg)', prog: 0 },
        { key: 'transform', val: 'scale(2) rotate(45deg)', prog: 1 },
      ],
    },
  };

  // Outgoing video (bottom layer, darkens during transition)
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom,
      endAt: outgoingVideo.endAt,
      fit: 'cover' as const,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [brightnessEffect],
  };

  // Incoming video (inside diamond clip container)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom,
      endAt: incomingVideo.endAt,
      fit: 'cover' as const,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Diamond border element (white 2px border following diamond shape)
  const diamondBorderNode: RenderableComponentData = {
    id: 'diamond-border',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          border: '2px solid white',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [],
  };

  // Diamond clip container (rotated square, scales from 0 to 2)
  const diamondClipContainer: RenderableComponentData = {
    id: 'diamond-clip-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [incomingVideoNode, diamondBorderNode],
    effects: [scaleRotationEffect],
  };

  // Incoming wrapper (centers the diamond)
  const incomingWrapper: RenderableComponentData = {
    id: 'incoming-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [diamondClipContainer],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'diamond-wipe-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoNode, incomingWrapper],
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
  id: 'diamond-wipe-transition',
  title: 'Diamond Wipe Transition',
  description:
    'Geometric diamond-shaped wipe transition that expands from center with crisp edges, white border accent, and subtle outgoing video darkening. Maintains perfect symmetry and handles any aspect ratio gracefully.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'diamond', 'geometric', 'shape', 'crisp'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
    },
    transitionDuration: 0.6,
    transitionStart: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const diamondWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
