/**
 * Page Turn 3D Transition Preset
 *
 * This preset creates a realistic 3D page-turn transition effect between two videos.
 * The outgoing video appears to fold along a vertical axis at 40% from the left edge,
 * with the right portion rotating on the Y-axis from 0 to -90 degrees while fading out.
 * The incoming video's left 60% starts visible while its right 40% rotates in from 90
 * to 0 degrees on the Y-axis. The effect uses perspective transforms and gradient shadows
 * to enhance the 3D depth, with a moving shadow gradient that travels across the fold line
 * during the page turn.
 *
 * Features:
 * - **3D Perspective**: 1000px perspective for realistic depth
 * - **Split Video Rendering**: Videos split into left/right sections at 40% mark
 * - **Y-Axis Rotation**: Right sections rotate on Y-axis with proper transform-origin
 * - **Gradient Shadows**: Moving shadow gradient follows the fold line
 * - **Darkening Effect**: Left section of outgoing video darkens during transition
 * - **Preserve-3D**: All containers use preserve-3d for proper 3D rendering
 * - **Smooth Timing**: ease-in-out timing for realistic page physics
 *
 * Use cases:
 * - Creating book-like page turn effects between video clips
 * - Building cinematic transitions for storytelling content
 * - Adding depth and dimension to video transitions
 * - Simulating physical page-flip interactions in digital content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the page turn transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate total duration (sum of videos minus overlap)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Create outgoing video left section (static, 40% width)
  const createOutgoingLeftSection = (): RenderableComponentData => {
    return {
      id: 'outgoing-left-section',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-0 top-0 h-full overflow-hidden',
          style: {
            width: '40%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-left-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            className: 'absolute top-0 left-0 h-full',
            style: {
              width: '250%', // 100% / 40% = 250%
              objectPosition: 'left center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Darkening effect on left section during transition
        {
          id: 'outgoing-left-darken',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-left-section'],
            ranges: [
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 0.7, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create outgoing video right section (rotates out, 60% width)
  const createOutgoingRightSection = (): RenderableComponentData => {
    return {
      id: 'outgoing-right-section',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 h-full overflow-hidden',
          style: {
            left: '40%',
            width: '60%',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-right-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            className: 'absolute top-0 h-full',
            style: {
              left: '-66.67%', // Offset to align with right 60% of video
              width: '166.67%', // 100% / 60% = 166.67%
              objectPosition: 'right center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Rotate Y-axis from 0 to -90 degrees
        {
          id: 'outgoing-right-rotate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-right-section'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -90, prog: 1 },
            ],
          },
        },
        // Fade out
        {
          id: 'outgoing-right-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-right-section'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create incoming video left section (visible from start, 60% width)
  const createIncomingLeftSection = (): RenderableComponentData => {
    return {
      id: 'incoming-left-section',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-0 top-0 h-full overflow-hidden',
          style: {
            width: '60%',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-left-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            className: 'absolute top-0 left-0 h-full',
            style: {
              width: '166.67%', // 100% / 60% = 166.67%
              objectPosition: 'left center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Helper: Create incoming video right section (rotates in, 40% width)
  const createIncomingRightSection = (): RenderableComponentData => {
    return {
      id: 'incoming-right-section',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 h-full overflow-hidden',
          style: {
            left: '60%',
            width: '40%',
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-right-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            className: 'absolute top-0 h-full',
            style: {
              left: '-150%', // Offset to align with right 40% of video
              width: '250%', // 100% / 40% = 250%
              objectPosition: 'right center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Rotate Y-axis from 90 to 0 degrees
        {
          id: 'incoming-right-rotate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-right-section'],
            ranges: [
              { key: 'rotateY', val: 90, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
            ],
          },
        },
        // Fade in
        {
          id: 'incoming-right-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-right-section'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create moving shadow gradient
  const createShadowGradient = (): RenderableComponentData => {
    return {
      id: 'shadow-gradient-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute top-0 h-full pointer-events-none',
        style: {
          width: '100px',
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)',
          left: '40%',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // Move shadow from 40% to 100% (60% travel distance)
        {
          id: 'shadow-gradient-move',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['shadow-gradient-overlay'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '60vw', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Build outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      createOutgoingLeftSection(),
      createOutgoingRightSection(),
    ],
  };

  // Build incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: [
      createIncomingLeftSection(),
      createIncomingRightSection(),
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'page-turn-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
      outgoingContainer,
      incomingContainer,
      createShadowGradient(),
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
  id: 'page-turn-3d-transition',
  title: 'Page Turn 3D Transition',
  description:
    'A 3D page-turn transition effect that simulates a book page flip between two videos. The outgoing video folds along a vertical axis at 40% from left, with the right portion rotating on the Y-axis while fading out. The incoming video reveals with its right 40% rotating in. Features perspective transforms, gradient shadows, and a moving shadow line for enhanced 3D realism.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'page-turn', '3d', 'rotation', 'perspective', 'fold'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pageTurn3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
