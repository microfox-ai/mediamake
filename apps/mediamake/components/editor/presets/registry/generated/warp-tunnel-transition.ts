/**
 * Warp Tunnel Transition Preset
 *
 * This preset simulates diving through a warped visual tunnel between two media items (videos or images).
 * The outgoing media dramatically scales up (1.0 to 2.5) while fading out and applying heavy radial blur,
 * creating the sensation of flying through it. Simultaneously, the incoming media starts extremely scaled
 * up (3.0) and zoomed in, scaling down to normal (1.0) as it comes into focus with blur decreasing.
 * Both elements rotate slightly (outgoing: +3 degrees, incoming: -3 to 0 degrees) to enhance the 
 * visceral 'whoosh through space' sensation.
 *
 * Features:
 * - Dramatic scaling effects: outgoing expands (1 → 2.5), incoming contracts (3 → 1)
 * - Heavy radial blur transitions: outgoing (0 → 20px), incoming (25px → 0)
 * - Subtle rotation: outgoing clockwise (+3°), incoming counter-clockwise (-3° → 0°)
 * - Punchy overlap timing (0.6-0.9s) for dynamic YouTube-style transitions
 * - Perspective depth via CSS perspective property
 * - Perfect for energetic content: gaming videos, vlogs, action sequences
 *
 * Technical Details:
 * - BaseLayout with perspective: 1000px for depth effect
 * - Overlap duration: 0.6-0.9s (configurable, default 0.75s)
 * - Total duration: media1.duration + media2.duration - overlap
 * - Z-index layering: incoming (z-20) above outgoing (z-10)
 * - Easing: ease-in for outgoing (accelerating away), ease-out for incoming (decelerating arrival)
 * - Transform origin: center center for all effects
 * - All effects use provider mode with targetIds (no wrapper divs)
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) media'),
      type: z
        .enum(['video', 'image'])
        .describe('Type of the first media (video or image)'),
      duration: z
        .number()
        .positive()
        .describe('Duration of the first media in seconds'),
    })
    .describe('First media item (outgoing) configuration'),

  media2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) media'),
      type: z
        .enum(['video', 'image'])
        .describe('Type of the second media (video or image)'),
      duration: z
        .number()
        .positive()
        .describe('Duration of the second media in seconds'),
    })
    .describe('Second media item (incoming) configuration'),

  overlapDuration: z
    .number()
    .min(0.3)
    .max(2.0)
    .default(0.75)
    .describe(
      'Duration of the transition overlap in seconds (0.6-0.9s recommended for punchy feel, default: 0.75s)',
    ),

  outgoingMaxScale: z
    .number()
    .min(1.5)
    .max(4.0)
    .default(2.5)
    .describe('Maximum scale for outgoing media at end of transition (default: 2.5)'),

  outgoingMaxBlur: z
    .number()
    .min(5)
    .max(40)
    .default(20)
    .describe('Maximum blur for outgoing media in pixels (default: 20px)'),

  outgoingRotation: z
    .number()
    .min(-10)
    .max(10)
    .default(3)
    .describe('Rotation angle for outgoing media in degrees (default: 3° clockwise)'),

  incomingStartScale: z
    .number()
    .min(2.0)
    .max(5.0)
    .default(3.0)
    .describe('Starting scale for incoming media (default: 3.0)'),

  incomingStartBlur: z
    .number()
    .min(10)
    .max(50)
    .default(25)
    .describe('Starting blur for incoming media in pixels (default: 25px)'),

  incomingStartRotation: z
    .number()
    .min(-10)
    .max(10)
    .default(-3)
    .describe('Starting rotation angle for incoming media in degrees (default: -3° counter-clockwise)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate total composition duration
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Outgoing media (media1) - starts at 0, lasts full duration
  const outgoingMedia: RenderableComponentData = {
    id: 'warp-tunnel-outgoing',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      // Scale up effect (1.0 → 2.5)
      {
        id: 'outgoing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-outgoing'],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: params.outgoingMaxScale, prog: 1 },
          ],
        },
      },
      // Fade out effect (1.0 → 0)
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-outgoing'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blur effect (0 → 20px)
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-outgoing'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${params.outgoingMaxBlur}px)`, prog: 1 },
          ],
        },
      },
      // Rotate effect (0 → 3 degrees)
      {
        id: 'outgoing-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-outgoing'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: params.outgoingRotation, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming media (media2) - starts before media1 ends (overlap), scaled and blurred
  const incomingMedia: RenderableComponentData = {
    id: 'warp-tunnel-incoming',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: media2.duration + overlapDuration,
      },
    },
    effects: [
      // Scale down effect (3.0 → 1.0)
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming media start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-incoming'],
          ranges: [
            { key: 'scale', val: params.incomingStartScale, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
      // Fade in effect (0 → 1.0)
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-incoming'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Blur decrease effect (25px → 0)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-incoming'],
          ranges: [
            { key: 'filter', val: `blur(${params.incomingStartBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Rotate to normal (−3° → 0°)
      {
        id: 'incoming-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['warp-tunnel-incoming'],
          ranges: [
            { key: 'rotate', val: params.incomingStartRotation, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing container (z-10)
  const outgoingContainer: RenderableComponentData = {
    id: 'warp-tunnel-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    childrenData: [outgoingMedia],
  };

  // Incoming container (z-20)
  const incomingContainer: RenderableComponentData = {
    id: 'warp-tunnel-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: media2.duration + overlapDuration,
      },
    },
    childrenData: [incomingMedia],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'warp-tunnel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'warp-tunnel-transition',
  title: 'Warp Tunnel Transition',
  description:
    'Dynamic transition preset that simulates diving through a warped visual tunnel between scenes. Features dramatic scaling (outgoing: 1→2.5, incoming: 3→1), heavy radial blur (outgoing: 0→20px, incoming: 25px→0), subtle rotation, and punchy overlap (0.6-0.9s) to create a visceral "whoosh through space" sensation perfect for energetic content like gaming videos, vlogs, or action sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'warp',
    'tunnel',
    'scale',
    'blur',
    'rotation',
    'dynamic',
    'energetic',
    'gaming',
    'vlog',
    'youtube',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    overlapDuration: 0.75,
    outgoingMaxScale: 2.5,
    outgoingMaxBlur: 20,
    outgoingRotation: 3,
    incomingStartScale: 3.0,
    incomingStartBlur: 25,
    incomingStartRotation: -3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const warpTunnelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
