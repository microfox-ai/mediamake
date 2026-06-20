/**
 * Camera Aperture Iris Transition Preset
 *
 * This preset creates a mechanical camera shutter iris transition between two images.
 * The iris contracts from the edges toward the center (iris close) on the outgoing image,
 * then expands from center outward (iris open) to reveal the incoming image.
 *
 * Features:
 * - 8-blade aperture geometry with visible blade segments
 * - Metallic dark gray appearance
 * - Subtle rotation during closing/opening motion (15 degrees)
 * - Quick snap at fully closed position (50ms hold)
 * - 800ms total overlap with iris fully closed at midpoint
 * - Both images use 'cover' fit mode with absolute positioning
 * - Circular mask animation using clip-path
 *
 * Use cases:
 * - Creating cinematic transitions between photos
 * - Simulating real camera shutter mechanics
 * - Building professional slideshow presentations
 * - Adding mechanical photography aesthetic to videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) image'),
    duration: z.number().describe('Duration of the first image in seconds'),
  }).describe('First image configuration'),
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Duration of the second image in seconds'),
  }).describe('Second image configuration'),
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Total overlap/transition duration in seconds (default: 0.8s)'),
  irisRotation: z
    .number()
    .default(15)
    .describe('Rotation of aperture blades during transition in degrees (default: 15)'),
  snapDuration: z
    .number()
    .default(0.05)
    .describe('Duration of the snap effect at fully closed position in seconds (default: 0.05s)'),
  bladesColor: z
    .string()
    .default('#3a3a3a')
    .describe('Color of the aperture blades (default: #3a3a3a metallic dark gray)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, overlapDuration, irisRotation, snapDuration, bladesColor } = params;

  // Calculate timing
  const totalDuration = image1.duration + image2.duration - overlapDuration;
  const irisCloseStart = image1.duration - overlapDuration;
  const irisCloseDuration = overlapDuration / 2;
  const irisOpenStart = overlapDuration / 2;
  const irisOpenDuration = overlapDuration / 2;
  const snapStart = overlapDuration / 2 - snapDuration / 2;

  // Create SVG aperture blades with 8-blade geometry
  const createApertureSVG = (color: string): string => {
    return `
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; position: absolute; inset: 0;">
        <defs>
          <mask id="aperture-mask">
            <circle cx="50" cy="50" r="50" fill="white"/>
            <g id="blades" transform="translate(50,50)">
              <polygon points="0,-50 6,-44 -6,-44" fill="black"/>
              <polygon points="35.35,-35.35 39.24,-29.24 30.46,-30.46" fill="black" transform="rotate(45 0 0)"/>
              <polygon points="50,0 44,6 44,-6" fill="black" transform="rotate(90 0 0)"/>
              <polygon points="35.35,35.35 29.24,39.24 30.46,30.46" fill="black" transform="rotate(135 0 0)"/>
              <polygon points="0,50 -6,44 6,44" fill="black" transform="rotate(180 0 0)"/>
              <polygon points="-35.35,35.35 -39.24,29.24 -30.46,30.46" fill="black" transform="rotate(225 0 0)"/>
              <polygon points="-50,0 -44,-6 -44,6" fill="black" transform="rotate(270 0 0)"/>
              <polygon points="-35.35,-35.35 -29.24,-39.24 -30.46,-30.46" fill="black" transform="rotate(315 0 0)"/>
            </g>
          </mask>
        </defs>
        <rect width="100" height="100" fill="${color}" mask="url(#aperture-mask)"/>
      </svg>
    `;
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing image (image1)
    {
      id: 'iris-outgoing-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 1,
          objectPosition: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        {
          id: 'iris-close-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: irisCloseStart,
            duration: irisCloseDuration,
            mode: 'provider',
            targetIds: ['iris-outgoing-image'],
            ranges: [
              { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 0 },
              { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Aperture overlay container
    {
      id: 'aperture-overlay-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: irisCloseStart,
          duration: overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'aperture-blades',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: createApertureSVG(bladesColor),
            className: 'absolute inset-0',
            style: {
              transformOrigin: 'center center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
          effects: [
            {
              id: 'aperture-rotation-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['aperture-blades'],
                ranges: [
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: irisRotation, prog: 1 },
                ],
              },
            },
            {
              id: 'aperture-snap-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: snapStart,
                duration: snapDuration,
                mode: 'provider',
                targetIds: ['aperture-blades'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.95, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming image (image2)
    {
      id: 'iris-incoming-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 3,
          objectPosition: 'center',
        },
      },
      context: {
        timing: {
          start: irisCloseStart,
          duration: image2.duration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'iris-open-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: irisOpenStart,
            duration: irisOpenDuration,
            mode: 'provider',
            targetIds: ['iris-incoming-image'],
            ranges: [
              { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
              { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'camera-aperture-iris-container',
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
  id: 'camera-aperture-iris-transition',
  title: 'Camera Aperture Iris Transition',
  description:
    'Mechanical camera shutter transition with 8-blade iris closing/opening animation between two images, featuring metallic dark gray aperture ring with blade segments and realistic rotation mechanics',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'iris', 'camera', 'mechanical', 'aperture', 'shutter'],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 0.8,
    irisRotation: 15,
    snapDuration: 0.05,
    bladesColor: '#3a3a3a',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cameraApertureIrisTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
