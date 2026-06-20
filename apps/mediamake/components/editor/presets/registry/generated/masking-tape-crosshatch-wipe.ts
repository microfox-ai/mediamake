/**
 * Masking Tape Cross-Hatch Wipe Transition Preset
 *
 * This preset creates a unique wipe transition where two strips of masking tape
 * form an X pattern that rotates while revealing the incoming video through an
 * expanding circular portal at the intersection point.
 *
 * Features:
 * - Two masking tape strips forming an X pattern
 * - Rotating X formation (180 degrees over transition duration)
 * - Expanding circular reveal at intersection point
 * - Realistic tape texture with matte finish and translucent edges
 * - Slight distortion effect on outgoing video where tape overlaps
 * - Tape strips scale from 1.0 to 1.2 during rotation
 * - Smooth ease-in-out timing for all animations
 *
 * Technical Implementation:
 * - BaseLayout container with relative positioning and overflow hidden
 * - Incoming video at z-0 with circular clip-path animation (0% to 75% radius)
 * - Outgoing video at z-5 with subtle scale distortion (1.0 → 0.98 → 1.0)
 * - Two HTMLBlockAtom strips for tape (amber-100 with 85% opacity)
 * - Initial rotations of 45deg and -45deg, rotating to 225deg and 135deg
 * - Simultaneous scale animation (1.0 to 1.2) on tape strips
 * - 1.5-second transition duration with ease-in-out timing
 *
 * Use cases:
 * - Creative video transitions with a crafted, tactile feel
 * - Adding visual interest to scene changes
 * - Creating memorable transitions for DIY or creative content
 * - Building unique video editing effects with a physical metaphor
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video that will be revealed'),
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that will transition out'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition effect in seconds'),
  tapeColor: z
    .string()
    .default('rgba(255, 235, 205, 0.85)')
    .optional()
    .describe('Color of the masking tape strips (with alpha for translucency)'),
  circleMaxRadius: z
    .number()
    .default(75)
    .optional()
    .describe('Maximum radius of the circular reveal as a percentage (0-100)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingVideoSrc,
    outgoingVideoSrc,
    transitionDuration,
    tapeColor = 'rgba(255, 235, 205, 0.85)',
    circleMaxRadius = 75,
  } = params;

  // Create child components
  const childrenData: RenderableComponentData[] = [
    // Incoming video at z-0 with circular mask expansion
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 0,
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
          id: 'circular-mask-expansion',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['incoming-video'],
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            ranges: [
              {
                key: 'clipPath',
                val: 'circle(0% at 50% 50%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: `circle(${circleMaxRadius}% at 50% 50%)`,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing video at z-5 with subtle distortion
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 5,
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
          id: 'subtle-distortion',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['outgoing-video'],
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            ranges: [
              {
                key: 'scale',
                val: 1,
                prog: 0,
              },
              {
                key: 'scale',
                val: 0.98,
                prog: 0.5,
              },
              {
                key: 'scale',
                val: 1,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Tape strip 1 (45deg initial rotation)
    {
      id: 'tape-strip-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="tape-strip"></div>',
        className: 'absolute w-full h-32',
        style: {
          zIndex: 10,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          backgroundColor: tapeColor,
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(2px)',
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
          id: 'tape-1-rotation',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['tape-strip-1'],
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            ranges: [
              {
                key: 'rotate',
                val: 45,
                prog: 0,
              },
              {
                key: 'rotate',
                val: 225,
                prog: 1,
              },
              {
                key: 'scale',
                val: 1,
                prog: 0,
              },
              {
                key: 'scale',
                val: 1.2,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Tape strip 2 (-45deg initial rotation)
    {
      id: 'tape-strip-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="tape-strip"></div>',
        className: 'absolute w-full h-32',
        style: {
          zIndex: 10,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          backgroundColor: tapeColor,
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(2px)',
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
          id: 'tape-2-rotation',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: ['tape-strip-2'],
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            ranges: [
              {
                key: 'rotate',
                val: -45,
                prog: 0,
              },
              {
                key: 'rotate',
                val: 135,
                prog: 1,
              },
              {
                key: 'scale',
                val: 1,
                prog: 0,
              },
              {
                key: 'scale',
                val: 1.2,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-crosshatch-container',
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
        duration: transitionDuration,
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
  id: 'masking-tape-crosshatch-wipe',
  title: 'Masking Tape Cross-Hatch Wipe Transition',
  description:
    'A unique transition where two strips of masking tape form an X pattern that rotates while revealing the incoming video through an expanding circular portal at the intersection. Features realistic tape texture with matte finish and translucent edges, creating a spiral reveal effect with subtle distortion on the outgoing video.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'masking-tape', 'crosshatch', 'circular-reveal'],
  defaultInputParams: {
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    transitionDuration: 1.5,
    tapeColor: 'rgba(255, 235, 205, 0.85)',
    circleMaxRadius: 75,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapeCrosshatchWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};