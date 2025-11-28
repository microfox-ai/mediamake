/**
 * Parallax Scroll Video Transition Preset
 *
 * This preset creates a continuous scroll-driven parallax transition where video scenes appear
 * to be on different depth planes that scroll past each other vertically. The outgoing video
 * moves up at normal speed while the incoming video rises from below at 1.5x speed, creating
 * a depth illusion. Subtle rotateX transforms enhance the 3D card-flip feeling as videos pass
 * each other.
 *
 * Features:
 * - **Parallax Scrolling**: Outgoing video moves up at normal speed, incoming at 1.5x speed
 * - **3D Depth Illusion**: rotateX transforms create card-flip effect during transition
 * - **Atmospheric Gradient Overlay**: Semi-transparent gradient moves with scroll
 * - **Layered Positioning**: Different initial y-positions enhance depth feeling
 * - **Perspective Container**: 3D perspective applied to root container
 * - **2-Second Overlap**: Configurable transition overlap period
 * - **GPU-Accelerated**: transform-gpu classes for smooth performance
 *
 * Use cases:
 * - Creating scroll-driven video transitions with depth
 * - Building immersive video sequences with parallax effects
 * - Adding 3D card-flip feeling to video transitions
 * - Creating atmospheric video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1Src: z.string().describe('Source URL of the first (outgoing) video'),
  video2Src: z.string().describe('Source URL of the second (incoming) video'),
  video1Duration: z
    .number()
    .describe('Duration of the first video in seconds'),
  video2Duration: z
    .number()
    .describe('Duration of the second video in seconds'),
  transitionOverlap: z
    .number()
    .default(2)
    .describe('Transition overlap duration in seconds'),
  outgoingRotateX: z
    .number()
    .default(-15)
    .describe('Maximum rotateX angle for outgoing video (degrees)'),
  incomingRotateX: z
    .number()
    .default(15)
    .describe('Initial rotateX angle for incoming video (degrees)'),
  gradientOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of the gradient overlay'),
  incomingSpeedMultiplier: z
    .number()
    .default(1.5)
    .describe('Speed multiplier for incoming video animation (1.5 = 1.5x speed)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1Src,
    video2Src,
    video1Duration,
    video2Duration,
    transitionOverlap,
    outgoingRotateX,
    incomingRotateX,
    gradientOpacity,
    incomingSpeedMultiplier,
  } = params;

  // Calculate total container duration
  const totalDuration = video1Duration + video2Duration - transitionOverlap;

  // Calculate incoming video timing
  const incomingStart = video1Duration - transitionOverlap;
  const incomingDuration = video2Duration + transitionOverlap;

  // Calculate effect durations
  const outgoingEffectStart = video1Duration - transitionOverlap;
  const incomingEffectDuration = transitionOverlap / incomingSpeedMultiplier;

  // Outgoing video section
  const outgoingVideoSection: RenderableComponentData = {
    id: 'video-section-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 transform-gpu',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1Duration,
      },
    },
    effects: [
      {
        id: 'outgoing-parallax-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingEffectStart,
          duration: transitionOverlap,
          mode: 'provider',
          targetIds: ['video-section-1'],
          ranges: [
            { key: 'translateY', val: '0vh', prog: 0 },
            { key: 'translateY', val: '-100vh', prog: 1 },
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: outgoingRotateX, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'video-1',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1Src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1Duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming video section
  const incomingVideoSection: RenderableComponentData = {
    id: 'video-section-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 transform-gpu',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      {
        id: 'incoming-parallax-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: incomingEffectDuration,
          mode: 'provider',
          targetIds: ['video-section-2'],
          ranges: [
            { key: 'translateY', val: '100vh', prog: 0 },
            { key: 'translateY', val: '0vh', prog: 1 },
            { key: 'rotateX', val: incomingRotateX, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'video-2',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2Src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2Duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Gradient overlay
  const gradientOverlay: RenderableComponentData = {
    id: 'gradient-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `linear-gradient(to bottom, rgba(0,0,0,${gradientOpacity}), transparent 30%, transparent 70%, rgba(0,0,0,${gradientOpacity}))`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'gradient-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingEffectStart,
          duration: transitionOverlap,
          mode: 'provider',
          targetIds: ['gradient-overlay'],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'parallax-scroll-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-screen w-full overflow-hidden',
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
    childrenData: [outgoingVideoSection, incomingVideoSection, gradientOverlay],
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
  id: 'parallax-scroll-video-transition',
  title: 'Parallax Scroll Video Transition',
  description:
    'A continuous scroll-driven parallax transition preset where video scenes appear on different depth planes. Outgoing video scrolls up at normal speed while incoming video rises from below at 1.5x speed, with subtle rotateX transforms creating a 3D card-flip depth illusion. Includes atmospheric gradient overlays that animate during transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'video',
    'transition',
    'parallax',
    'scroll',
    '3d',
    'depth',
    'card-flip',
    'perspective',
    'atmospheric',
  ],
  defaultInputParams: {
    video1Src: 'https://example.com/video1.mp4',
    video2Src: 'https://example.com/video2.mp4',
    video1Duration: 10,
    video2Duration: 10,
    transitionOverlap: 2,
    outgoingRotateX: -15,
    incomingRotateX: 15,
    gradientOpacity: 0.2,
    incomingSpeedMultiplier: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const parallaxScrollVideoTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
