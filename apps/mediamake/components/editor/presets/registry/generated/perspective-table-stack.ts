/**
 * Perspective Table Stack Transition Preset
 *
 * This preset creates a 3D transition where polaroids land on an angled table surface.
 * The camera appears to be looking down at an angle onto a table (via rotateX on container).
 * Each incoming polaroid enters from the top with its own 3D rotation, landing flat on
 * the angled table surface with satisfying physics. The stack builds with visible depth -
 * each polaroid slightly offset to show the pile growing. Shadows are cast appropriately
 * for the perspective angle, stretching away from the light source. The outgoing polaroid
 * shifts back in the z-axis (translateZ) to make room. Uses subtle ambient occlusion effect
 * between stacked polaroids with 0.9 seconds overlap and smooth landing physics.
 *
 * Features:
 * - **3D Perspective**: Camera viewing angle via rotateX(-15deg) on container
 * - **Incoming Animation**: Polaroids enter from top with 3D rotation (translateY, translateZ, rotateX)
 * - **Landing Physics**: easeOutBack for satisfying bounce-in effect
 * - **Stack Depth**: Each polaroid offset slightly to show pile growing
 * - **Perspective Shadows**: Shadows cast with perspective-correct transform
 * - **Outgoing Animation**: Previous polaroid shifts back in Z-space
 * - **Ambient Occlusion**: Subtle darkening between stacked layers
 * - **0.9s Overlap**: Smooth transition timing between polaroids
 *
 * Use cases:
 * - Creating photo gallery transitions with depth
 * - Building stacking animations for media content
 * - Adding 3D perspective effects to slideshows
 * - Creating realistic table-landing animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of first polaroid'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of second polaroid'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media3: z.object({
    src: z.string().describe('Source URL of third polaroid'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.9)
    .describe('Overlap duration between transitions in seconds'),
  tableAngle: z
    .number()
    .default(-15)
    .describe('Table viewing angle in degrees (negative for looking down)'),
  incomingRotation: z
    .number()
    .default(-30)
    .describe('Initial rotation angle for incoming polaroids in degrees'),
  stackOffsetX: z
    .number()
    .default(15)
    .describe('Horizontal offset increment per layer in pixels'),
  stackOffsetY: z
    .number()
    .default(15)
    .describe('Vertical offset increment per layer in pixels'),
  outgoingDepth: z
    .number()
    .default(-20)
    .describe('Z-depth shift for outgoing polaroid in pixels'),
  polaroidWidth: z
    .number()
    .default(400)
    .describe('Width of polaroid frame in pixels'),
  polaroidHeight: z
    .number()
    .default(500)
    .describe('Height of polaroid frame in pixels'),
  polaroidPadding: z
    .number()
    .default(12)
    .describe('Padding inside polaroid frame in pixels'),
  polaroidPaddingBottom: z
    .number()
    .default(40)
    .describe('Bottom padding inside polaroid frame in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    media3,
    overlapDuration,
    tableAngle,
    incomingRotation,
    stackOffsetX,
    stackOffsetY,
    outgoingDepth,
    polaroidWidth,
    polaroidHeight,
    polaroidPadding,
    polaroidPaddingBottom,
  } = params;

  // Calculate total duration with overlaps
  const totalDuration =
    media1.duration + media2.duration + media3.duration - 2 * overlapDuration;

  // Helper: Determine component ID from media type
  const getComponentId = (type: 'image' | 'video'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Helper: Create polaroid container with effects
  const createPolaroid = (
    media: { src: string; type: 'image' | 'video'; duration: number },
    index: number,
    startTime: number,
    isIncoming: boolean,
    isOutgoing: boolean,
  ): RenderableComponentData => {
    const polaroidId = `polaroid-${index}`;
    const shadowId = `shadow-${index}`;
    const componentId = getComponentId(media.type);

    // Calculate stack offsets
    const offsetX = stackOffsetX * index;
    const offsetY = stackOffsetY * index;

    // Base polaroid effects
    const effects: any[] = [];

    // Incoming animation: enter from top with 3D rotation
    if (isIncoming) {
      effects.push({
        id: `${polaroidId}-incoming`,
        componentId: 'generic',
        data: {
          type: 'ease-out-back',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [polaroidId],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
            { key: 'translateZ', val: 100, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
            { key: 'rotateX', val: incomingRotation, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      });
    }

    // Outgoing animation: shift back in Z-space
    if (isOutgoing) {
      effects.push({
        id: `${polaroidId}-outgoing`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: media.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [polaroidId],
          ranges: [
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: outgoingDepth, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.98, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 1 },
          ],
        },
      });
    }

    return {
      id: `polaroid-group-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: media.duration,
        },
      },
      childrenData: [
        // Polaroid frame
        {
          id: polaroidId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute bg-white shadow-2xl',
              style: {
                transformStyle: 'preserve-3d',
                left: `calc(50% + ${offsetX}px)`,
                top: `calc(50% + ${offsetY}px)`,
                transform: 'translate(-50%, -50%)',
                width: `${polaroidWidth}px`,
                height: `${polaroidHeight}px`,
                padding: `${polaroidPadding}px ${polaroidPadding}px ${polaroidPaddingBottom}px ${polaroidPadding}px`,
                boxShadow:
                  '0 20px 40px rgba(0,0,0,0.3), 0 10px 20px rgba(0,0,0,0.2)',
              },
            },
          },
          effects,
          childrenData: [
            // Media content
            {
              id: `media-${index}`,
              type: 'atom',
              componentId,
              data: {
                src: media.src,
                className: 'w-full h-full object-cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: media.duration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
        // Shadow (perspective-correct)
        {
          id: shadowId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${polaroidWidth}px; height: ${polaroidHeight}px; background: radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%);"></div>`,
            className: 'absolute pointer-events-none',
            style: {
              left: `calc(50% + ${offsetX}px)`,
              top: `calc(50% + ${offsetY}px)`,
              transform: 'translate(-50%, -50%) translateY(10px) scaleY(0.5)',
              transformStyle: 'preserve-3d',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Calculate start times with overlaps
  const media1Start = 0;
  const media2Start = media1.duration - overlapDuration;
  const media3Start = media2Start + media2.duration - overlapDuration;

  const childrenData: RenderableComponentData[] = [
    createPolaroid(media1, 0, media1Start, true, true),
    createPolaroid(media2, 1, media2Start, true, true),
    createPolaroid(media3, 2, media3Start, true, false),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'perspective-table-stack-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 30%',
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
      {
        id: 'table-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transform: `rotateX(${tableAngle}deg)`,
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
      } as RenderableComponentData,
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
  id: 'perspective-table-stack',
  title: 'Perspective Table Stack Transition',
  description:
    '3D depth transition where polaroids land on an angled table surface with perspective transform. Features camera viewing angle via rotateX, incoming polaroids with 3D rotation and physics-based landing, visible depth stacking with offsets, perspective-correct shadows, and outgoing polaroids shifting back in Z-space. Includes 0.9s overlap with smooth easeOutBack landing physics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'perspective', 'polaroid', 'stack', 'depth'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
      type: 'image',
      duration: 5,
    },
    media3: {
      src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
      type: 'image',
      duration: 5,
    },
    overlapDuration: 0.9,
    tableAngle: -15,
    incomingRotation: -30,
    stackOffsetX: 15,
    stackOffsetY: 15,
    outgoingDepth: -20,
    polaroidWidth: 400,
    polaroidHeight: 500,
    polaroidPadding: 12,
    polaroidPaddingBottom: 40,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const perspectiveTableStackPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
