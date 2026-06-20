/**
 * Film Projector Gate Jump Transition Preset
 *
 * This preset simulates authentic film projector gate jump with vertical frame misalignment,
 * intermittent black frames, edge light leaks, and subtle rotation wobble. It creates a
 * vintage film transition effect between two media items.
 *
 * Features:
 * - **Vertical Frame Displacement**: Rapid translateY jumps (-20px, 0, 20px) with stepped timing
 * - **Intermittent Black Frames**: Flashing black overlay at specific intervals
 * - **Edge Light Leaks**: Gradient light leaks on left and right edges that intensify during jump
 * - **Rotation Wobble**: Subtle rotation variations (-0.5deg to 0.5deg) for film instability
 * - **Mechanical Feel**: Uses steps() timing function for authentic projector simulation
 * - **Synchronized Displacement**: Both media atoms experience gate jump simultaneously
 *
 * Technical Approach:
 * - BaseLayout container with 0.5s overlap between media items
 * - Gate jump effects applied to media containers during overlap period
 * - Black frame overlay flashes at precise intervals (0.1s, 0.15s, 0.2s, 0.35s, 0.4s)
 * - Light leak gradients on edges with opacity animation
 * - All effects use provider mode with targetIds for clean structure
 *
 * Use cases:
 * - Creating vintage film transition effects
 * - Simulating old film projector aesthetics
 * - Adding mechanical film jump transitions
 * - Building retro video transitions with authentic film artifacts
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) media'),
      type: z.enum(['image', 'video']).describe('Type of first media'),
      duration: z.number().describe('Duration of first media in seconds'),
    })
    .describe('First media item (outgoing during transition)'),
  media2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) media'),
      type: z.enum(['image', 'video']).describe('Type of second media'),
      duration: z.number().describe('Duration of second media in seconds'),
    })
    .describe('Second media item (incoming during transition)'),
  overlapDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the gate jump overlap in seconds (default: 0.5s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate timing
  const totalDuration = media1.duration + media2.duration - overlapDuration;
  const transitionStart = media1.duration - overlapDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create gate jump displacement effect (translateY with stepped timing)
  const createGateJumpEffect = (
    targetId: string,
    effectStart: number,
  ): GenericEffectData =&gt; ({
    type: 'linear',
    start: effectStart,
    duration: overlapDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      // First jump: -20px
      { key: 'translateY', val: -20, prog: 0 },
      { key: 'translateY', val: -20, prog: 0.166 }, // Hold at -20px
      // Second jump: 0px
      { key: 'translateY', val: 0, prog: 0.167 },
      { key: 'translateY', val: 0, prog: 0.333 }, // Hold at 0px
      // Third jump: 20px
      { key: 'translateY', val: 20, prog: 0.334 },
      { key: 'translateY', val: 20, prog: 0.5 }, // Hold at 20px
      // Fourth jump: -20px
      { key: 'translateY', val: -20, prog: 0.501 },
      { key: 'translateY', val: -20, prog: 0.666 }, // Hold at -20px
      // Fifth jump: 0px
      { key: 'translateY', val: 0, prog: 0.667 },
      { key: 'translateY', val: 0, prog: 0.833 }, // Hold at 0px
      // Final jump: 20px then settle at 0
      { key: 'translateY', val: 20, prog: 0.834 },
      { key: 'translateY', val: 20, prog: 0.916 },
      { key: 'translateY', val: 0, prog: 0.917 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  });

  // Create rotation wobble effect
  const createRotationWobbleEffect = (
    targetId: string,
    effectStart: number,
  ): GenericEffectData =&gt; ({
    type: 'linear',
    start: effectStart,
    duration: overlapDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: -0.5, prog: 0.1 },
      { key: 'rotate', val: 0.3, prog: 0.25 },
      { key: 'rotate', val: -0.4, prog: 0.4 },
      { key: 'rotate', val: 0.5, prog: 0.55 },
      { key: 'rotate', val: -0.3, prog: 0.7 },
      { key: 'rotate', val: 0.2, prog: 0.85 },
      { key: 'rotate', val: 0, prog: 1 },
    ],
  });

  // Create black frame flash effect
  const createBlackFlashEffect = (targetId: string): GenericEffectData =&gt; ({
    type: 'linear',
    start: 0,
    duration: overlapDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0, prog: 0.2 }, // 0.1s mark
      { key: 'opacity', val: 1, prog: 0.3 }, // 0.15s mark (flash on)
      { key: 'opacity', val: 0, prog: 0.4 }, // 0.2s mark (flash off)
      { key: 'opacity', val: 0, prog: 0.7 }, // 0.35s mark
      { key: 'opacity', val: 1, prog: 0.8 }, // 0.4s mark (flash on)
      { key: 'opacity', val: 0, prog: 0.9 }, // Flash off
      { key: 'opacity', val: 0, prog: 1 },
    ],
  });

  // Create light leak intensification effect
  const createLightLeakEffect = (targetId: string): GenericEffectData =&gt; ({
    type: 'ease-in-out',
    start: 0,
    duration: overlapDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 0.7 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  });

  // Build media containers with effects
  const media1Container: RenderableComponentData = {
    id: 'film-gate-media1-container',
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
    effects: [
      {
        id: 'media1-gate-jump',
        componentId: 'generic',
        data: createGateJumpEffect(
          'film-gate-media1-atom',
          media1.duration - overlapDuration,
        ),
      },
      {
        id: 'media1-rotation-wobble',
        componentId: 'generic',
        data: createRotationWobbleEffect(
          'film-gate-media1-atom',
          media1.duration - overlapDuration,
        ),
      },
    ],
    childrenData: [
      {
        id: 'film-gate-media1-atom',
        type: 'atom',
        componentId: media1ComponentId,
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
          ...(media1.type === 'video' && {
            volume: 0,
            muted: true,
          }),
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const media2Container: RenderableComponentData = {
    id: 'film-gate-media2-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: media2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'media2-gate-jump',
        componentId: 'generic',
        data: createGateJumpEffect('film-gate-media2-atom', 0),
      },
      {
        id: 'media2-rotation-wobble',
        componentId: 'generic',
        data: createRotationWobbleEffect('film-gate-media2-atom', 0),
      },
    ],
    childrenData: [
      {
        id: 'film-gate-media2-atom',
        type: 'atom',
        componentId: media2ComponentId,
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
          ...(media2.type === 'video' && {
            volume: 0,
            muted: true,
          }),
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Black flash overlay
  const blackFlashOverlay: RenderableComponentData = {
    id: 'film-gate-black-flash',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'black-flash-effect',
        componentId: 'generic',
        data: createBlackFlashEffect('film-gate-black-flash-inner'),
      },
    ],
    childrenData: [
      {
        id: 'film-gate-black-flash-inner',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background: black;"></div>',
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Left light leak
  const leftLightLeak: RenderableComponentData = {
    id: 'film-gate-light-leak-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 top-0 w-12 h-full pointer-events-none',
        style: {
          zIndex: 9,
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'left-light-leak-effect',
        componentId: 'generic',
        data: createLightLeakEffect('film-gate-light-leak-left-inner'),
      },
    ],
    childrenData: [
      {
        id: 'film-gate-light-leak-left-inner',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background: linear-gradient(to right, rgba(255, 255, 255, 0.4), transparent);"></div>',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Right light leak
  const rightLightLeak: RenderableComponentData = {
    id: 'film-gate-light-leak-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute right-0 top-0 w-12 h-full pointer-events-none',
        style: {
          zIndex: 9,
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'right-light-leak-effect',
        componentId: 'generic',
        data: createLightLeakEffect('film-gate-light-leak-right-inner'),
      },
    ],
    childrenData: [
      {
        id: 'film-gate-light-leak-right-inner',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%; background: linear-gradient(to left, rgba(255, 255, 255, 0.4), transparent);"></div>',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Assemble root container
  const rootContainer: RenderableComponentData = {
    id: 'film-gate-jump-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000',
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
      media1Container,
      media2Container,
      blackFlashOverlay,
      leftLightLeak,
      rightLightLeak,
    ] as RenderableComponentData[],
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
  id: 'film-projector-gate-jump-transition',
  title: 'Film Projector Gate Jump Transition',
  description:
    'Simulates authentic film projector gate jump with vertical frame displacement, intermittent black frames, edge light leaks, and rotation wobble. Features stepped timing for mechanical feel, rapid translateY displacement (-20px to 20px), black frame flashes, gradient light leaks on edges, and subtle rotation instability. Perfect for vintage film transitions with 0.5s overlap timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'film',
    'projector',
    'gate-jump',
    'vintage',
    'mechanical',
    'displacement',
    'light-leak',
    'wobble',
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
    overlapDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const filmProjectorGateJumpTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
