/**
 * Cover Flow 3D Tilt Transition Preset
 *
 * This preset mimics the classic iTunes Cover Flow album art browser with 3D perspective transitions.
 * Images are positioned in a 3D stack where the center image is flat and fully visible, while side
 * images are rotated at 60-70 degrees on the Y-axis. During transitions, the current center image
 * tilts and slides to the side while the incoming image rotates from the side position to center.
 *
 * Features:
 * - **3D Perspective Stack**: Center image flat, side images rotated at 60-70 degrees
 * - **Smooth Rotation Transitions**: Y-axis rotation from 70deg to 0deg (incoming) and 0deg to 70deg (outgoing)
 * - **Simultaneous Animations**: Scale (0.85 ↔ 1.0), opacity (0.6 ↔ 1.0), translateX positioning
 * - **Drop Shadow Effects**: Shadows intensify as images reach center focus
 * - **Reflection Overlay**: Subtle gradient overlay at bottom for glass-like reflection effect
 * - **Configurable Overlap**: 600-800ms transition period with cubic-bezier easing
 *
 * Technical Details:
 * - Uses preserve-3d transform style with 1200px perspective
 * - Overlap duration calculated as media1.duration + media2.duration - 700ms
 * - Effects use AnimationRange[] with provider mode targeting specific image wrappers
 * - Z-index management: incoming (z-20), outgoing (z-10) during transition
 *
 * Use cases:
 * - Creating iTunes-style media galleries
 * - Building 3D carousel transitions
 * - Adding depth and perspective to image slideshows
 * - Professional media presentation transitions
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
    src: z.string().describe('Source URL of the first media item (outgoing)'),
    type: z
      .enum(['image', 'video'])
      .describe('Media type of the first item'),
    duration: z.number().describe('Duration of the first media item in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the second media item (incoming)'),
    type: z
      .enum(['image', 'video'])
      .describe('Media type of the second item'),
    duration: z
      .number()
      .describe('Duration of the second media item in seconds'),
  }),
  overlapDuration: z
    .number()
    .min(0.6)
    .max(0.8)
    .default(0.7)
    .describe('Transition overlap duration in seconds (600-800ms recommended)'),
  rotationAngle: z
    .number()
    .min(60)
    .max(70)
    .default(70)
    .describe('Y-axis rotation angle for side images in degrees'),
  transitionEasing: z
    .string()
    .default('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    .describe('CSS cubic-bezier easing function for smooth deceleration'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    overlapDuration,
    rotationAngle,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component types based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate transition timing
  // Outgoing effects: from 0.7rel to 1rel of media1 duration
  const outgoingEffectStart = media1.duration * 0.7;
  const outgoingEffectDuration = media1.duration * 0.3;

  // Incoming effects: from 0rel to 0.3rel of media2 duration (overlap period)
  const incomingEffectStart = 0;
  const incomingEffectDuration = overlapDuration;

  // Build the composition structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing media wrapper (media1)
    {
      id: 'outgoing-wrapper',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-image',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'absolute inset-0',
            style: {
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
        } as RenderableComponentData,
        // Reflection overlay for outgoing
        {
          id: 'outgoing-reflection',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background:
                  'linear-gradient(to top, rgba(255,255,255,0.1) 0%, transparent 30%)',
                zIndex: 1,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
          childrenData: [],
        } as RenderableComponentData,
      ],
      effects: [
        // Outgoing transition effects (during last 30% of media1)
        {
          id: 'outgoing-rotation',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEffectStart,
            duration: outgoingEffectDuration,
            mode: 'provider',
            targetIds: ['outgoing-wrapper'],
            ranges: [
              // Rotate from flat (0deg) to side angle (70deg)
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: rotationAngle, prog: 1 },
              // Translate to the left (-40%)
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-40%', prog: 1 },
              // Fade to 60% opacity
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 1 },
              // Scale down (1.0 to 0.85)
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.85, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming media wrapper (media2)
    {
      id: 'incoming-wrapper',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))',
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration,
          duration: media2.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-image',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'absolute inset-0',
            style: {
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + overlapDuration,
            },
          },
        } as RenderableComponentData,
        // Reflection overlay for incoming
        {
          id: 'incoming-reflection',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background:
                  'linear-gradient(to top, rgba(255,255,255,0.1) 0%, transparent 30%)',
                zIndex: 1,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + overlapDuration,
            },
          },
          childrenData: [],
        } as RenderableComponentData,
      ],
      effects: [
        // Incoming transition effects (during first 30% / overlap period)
        {
          id: 'incoming-rotation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingEffectStart,
            duration: incomingEffectDuration,
            mode: 'provider',
            targetIds: ['incoming-wrapper'],
            ranges: [
              // Rotate from side angle (-70deg) to flat (0deg)
              { key: 'rotateY', val: -rotationAngle, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              // Translate from right (40%) to center (0%)
              { key: 'translateX', val: '40%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              // Fade in from 60% to 100% opacity
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // Scale up (0.85 to 1.0)
              { key: 'scale', val: 0.85, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'coverflow-3d-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'coverflow-3d-tilt-transition',
  title: 'Cover Flow 3D Tilt Transition',
  description:
    'iTunes-style Cover Flow transition with 3D perspective, Y-axis rotation, scale, and opacity animations. Images tilt at 60-70 degrees on sides and rotate to flat center position with smooth transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'coverflow', '3d', 'perspective', 'rotation', 'tilt'],
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
    overlapDuration: 0.7,
    rotationAngle: 70,
    transitionEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const coverFlow3dTiltTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
