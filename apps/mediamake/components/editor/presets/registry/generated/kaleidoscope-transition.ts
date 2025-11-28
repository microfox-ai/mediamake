/**
 * Kaleidoscope Transition Preset
 *
 * Creates a stunning kaleidoscope transition where media fragments into geometric triangular pieces
 * that rotate and reassemble. The outgoing media splits into 6 triangular segments that spin outward
 * while fading, and the incoming media's fragments spin inward and combine. Each piece features
 * prismatic color shifts (hue-rotate) to create a crystalline, psychedelic transition effect.
 *
 * Features:
 * - 6 triangular fragments with unique clip-paths (polygon)
 * - Outgoing: Rotate 720deg while translating outward, with opacity fade
 * - Incoming: Rotate -720deg while translating inward from off-screen, with opacity fade in
 * - Prismatic color effects: Each fragment has different hue-rotate values (0deg, 60deg, 120deg, etc.)
 * - 1 second overlap transition period between media items
 *
 * Technical Details:
 * - BaseLayout with 'relative overflow-hidden' for proper clipping
 * - Duration: media1.duration + media2.duration - 1s (1s overlap)
 * - Outgoing fragments: Start transition at (media1.duration - 1s), animate for 1s
 * - Incoming fragments: Start at (media1.duration - 1s), animate for 1s
 * - Each fragment uses generic effects for transform (rotation + translation), opacity, and filter (hue-rotate)
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
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media (video or image)'),
    type: z.enum(['image', 'video']).describe('Type of media'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }).describe('Outgoing media configuration'),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media (video or image)'),
    type: z.enum(['image', 'video']).describe('Type of media'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }).describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the kaleidoscope transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate total duration (sum of media durations minus overlap)
  const totalDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Outgoing media transition starts at (media1.duration - transitionDuration)
  const outgoingTransitionStart = media1.duration - transitionDuration;

  // Fragment clip-paths (6 triangular segments forming a kaleidoscope pattern)
  const fragmentClipPaths = [
    'polygon(50% 50%, 100% 50%, 75% 100%)',   // Fragment 1 (right-bottom)
    'polygon(50% 50%, 75% 100%, 25% 100%)',   // Fragment 2 (bottom)
    'polygon(50% 50%, 25% 100%, 0% 50%)',     // Fragment 3 (left-bottom)
    'polygon(50% 50%, 0% 50%, 25% 0%)',       // Fragment 4 (left-top)
    'polygon(50% 50%, 25% 0%, 75% 0%)',       // Fragment 5 (top)
    'polygon(50% 50%, 75% 0%, 100% 50%)',     // Fragment 6 (right-top)
  ];

  // Translation directions for each fragment (matching clip-path positions)
  const outgoingTranslations = [
    'rotate(720deg) translate(200%, 200%)',   // Fragment 1 (right-bottom)
    'rotate(720deg) translate(0%, 250%)',     // Fragment 2 (bottom)
    'rotate(720deg) translate(-200%, 200%)',  // Fragment 3 (left-bottom)
    'rotate(720deg) translate(-200%, -200%)', // Fragment 4 (left-top)
    'rotate(720deg) translate(0%, -250%)',    // Fragment 5 (top)
    'rotate(720deg) translate(200%, -200%)',  // Fragment 6 (right-top)
  ];

  const incomingTranslations = [
    'rotate(-720deg) translate(200%, 200%)',   // Fragment 1 (right-bottom)
    'rotate(-720deg) translate(0%, 250%)',     // Fragment 2 (bottom)
    'rotate(-720deg) translate(-200%, 200%)',  // Fragment 3 (left-bottom)
    'rotate(-720deg) translate(-200%, -200%)', // Fragment 4 (left-top)
    'rotate(-720deg) translate(0%, -250%)',    // Fragment 5 (top)
    'rotate(-720deg) translate(200%, -200%)',  // Fragment 6 (right-top)
  ];

  // Hue-rotate values for prismatic color effects (0deg, 60deg, 120deg, 180deg, 240deg, 300deg)
  const hueRotateValues = [0, 60, 120, 180, 240, 300];

  // Create outgoing media fragments
  const outgoingFragments: RenderableComponentData[] = fragmentClipPaths.map(
    (clipPath, index) => ({
      id: `outgoing-fragment-${index + 1}`,
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          clipPath,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Transform effect (rotation + translation outward)
        {
          id: `outgoing-transform-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingTransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`outgoing-fragment-${index + 1}`],
            ranges: [
              {
                key: 'transform',
                val: 'rotate(0deg) translate(0, 0)',
                prog: 0,
              },
              {
                key: 'transform',
                val: outgoingTranslations[index],
                prog: 1,
              },
            ],
          },
        },
        // Opacity effect (fade out)
        {
          id: `outgoing-opacity-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingTransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`outgoing-fragment-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Filter effect (hue-rotate for prismatic colors)
        {
          id: `outgoing-filter-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: media1.duration,
            mode: 'provider',
            targetIds: [`outgoing-fragment-${index + 1}`],
            ranges: [
              {
                key: 'filter',
                val: `hue-rotate(${hueRotateValues[index]}deg)`,
                prog: 0,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData),
  );

  // Create incoming media fragments
  const incomingFragments: RenderableComponentData[] = fragmentClipPaths.map(
    (clipPath, index) => ({
      id: `incoming-fragment-${index + 1}`,
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          clipPath,
        },
      },
      context: {
        timing: {
          start: 0, // Relative to incoming container (which starts at outgoingTransitionStart)
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        // Transform effect (rotation + translation inward)
        {
          id: `incoming-transform-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0, // Relative to incoming container
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`incoming-fragment-${index + 1}`],
            ranges: [
              {
                key: 'transform',
                val: incomingTranslations[index],
                prog: 0,
              },
              {
                key: 'transform',
                val: 'rotate(0deg) translate(0, 0)',
                prog: 1,
              },
            ],
          },
        },
        // Opacity effect (fade in)
        {
          id: `incoming-opacity-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0, // Relative to incoming container
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`incoming-fragment-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Filter effect (hue-rotate for prismatic colors)
        {
          id: `incoming-filter-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: media2.duration + transitionDuration,
            mode: 'provider',
            targetIds: [`incoming-fragment-${index + 1}`],
            ranges: [
              {
                key: 'filter',
                val: `hue-rotate(${hueRotateValues[index]}deg)`,
                prog: 0,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData),
  );

  // Container for outgoing media fragments
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-media-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    childrenData: outgoingFragments,
  };

  // Container for incoming media fragments
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-media-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingTransitionStart, // Start 1s before media1 ends
        duration: media2.duration + transitionDuration,
      },
    },
    childrenData: incomingFragments,
  };

  // Root container with overflow-hidden for proper clipping
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-transition-root',
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

const presetMetadata: PresetMetadata = {
  id: 'kaleidoscope-transition',
  title: 'Kaleidoscope Transition',
  description:
    'A prismatic kaleidoscope transition where media fragments into geometric triangular pieces that rotate and reassemble with color-shifting crystalline effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'kaleidoscope', 'geometric', 'prismatic', 'psychedelic', 'fragments', 'rotation'],
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
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kaleidoscopeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
