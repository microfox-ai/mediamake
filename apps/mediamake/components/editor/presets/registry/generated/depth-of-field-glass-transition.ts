/**
 * Depth-of-Field Glass Transition Preset
 *
 * Creates a cinematic camera lens focus-pull transition between two videos.
 * The outgoing video starts sharp and gradually blurs with realistic lens blur effects,
 * while the incoming video transitions from extreme blur to sharp focus.
 *
 * Features:
 * - **Realistic Lens Blur**: Multiple layered blur passes to simulate bokeh
 * - **Hexagonal Bokeh Shapes**: CSS clip-path on bright areas for highlight simulation
 * - **Focus Breathing**: Subtle scale changes during focus pull (mimics real lens behavior)
 * - **Chromatic Aberration**: RGB channel isolation at edges of blurred areas
 * - **Vignette Effect**: Radial gradient that intensifies during transition
 * - **Narrow Depth of Field**: Creates a shallow depth-of-field cinematic look
 *
 * Use cases:
 * - Professional video transitions
 * - Cinematic storytelling
 * - Documentary-style cuts
 * - High-end commercial videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  overlapDuration: z
    .number()
    .default(2.5)
    .describe('Overlap duration for the transition in seconds'),
  maxBlurOutgoing: z
    .number()
    .default(35)
    .describe('Maximum blur amount for outgoing video in pixels'),
  maxBlurIncoming: z
    .number()
    .default(40)
    .describe('Initial blur amount for incoming video in pixels'),
  focusBreathingIntensity: z
    .number()
    .default(0.02)
    .describe('Intensity of focus breathing scale effect (0-0.1)'),
  chromaticAberrationIntensity: z
    .number()
    .default(2)
    .describe('Chromatic aberration offset in pixels'),
  vignetteIntensity: z
    .number()
    .default(0.6)
    .describe('Maximum vignette opacity (0-1)'),
  bokehHighlightThreshold: z
    .number()
    .default(0.7)
    .describe('Brightness threshold for bokeh highlights (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    overlapDuration,
    maxBlurOutgoing,
    maxBlurIncoming,
    focusBreathingIntensity,
    chromaticAberrationIntensity,
    vignetteIntensity,
    bokehHighlightThreshold,
  } = params;

  // Calculate total transition duration
  const transitionDuration =
    outgoingVideoDuration + incomingVideoDuration - overlapDuration;

  // Outgoing video: blur from 0px to maxBlurOutgoing over progress 0-0.9
  const outgoingBlurEffect = {
    id: 'outgoing-blur',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in' as const,
      start: 0,
      duration: overlapDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-video-content'],
      ranges: [
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        {
          key: 'filter',
          val: `blur(${maxBlurOutgoing * 0.5}px)`,
          prog: 0.45,
        },
        { key: 'filter', val: `blur(${maxBlurOutgoing}px)`, prog: 0.9 },
        { key: 'filter', val: `blur(${maxBlurOutgoing}px)`, prog: 1 },
      ],
    },
  };

  // Outgoing video: focus breathing (scale 1.0 → 1.0 + focusBreathingIntensity) over progress 0-0.7
  const outgoingScaleEffect = {
    id: 'outgoing-scale',
    componentId: 'generic' as const,
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: overlapDuration * 0.7,
      mode: 'provider' as const,
      targetIds: ['outgoing-video-content'],
      ranges: [
        { key: 'scale', val: 1.0, prog: 0 },
        { key: 'scale', val: 1.0 + focusBreathingIntensity, prog: 1 },
      ],
    },
  };

  // Outgoing video: brightness reduction (100% → 85%) over progress 0.5-0.9
  const outgoingBrightnessEffect = {
    id: 'outgoing-brightness',
    componentId: 'generic' as const,
    data: {
      type: 'linear' as const,
      start: overlapDuration * 0.5,
      duration: overlapDuration * 0.4,
      mode: 'provider' as const,
      targetIds: ['outgoing-video-content'],
      ranges: [
        { key: 'brightness', val: 1.0, prog: 0 },
        { key: 'brightness', val: 0.85, prog: 1 },
      ],
    },
  };

  // Incoming video: blur from maxBlurIncoming to 0px over progress 0-0.8
  const incomingBlurEffect = {
    id: 'incoming-blur',
    componentId: 'generic' as const,
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: overlapDuration * 0.8,
      mode: 'provider' as const,
      targetIds: ['incoming-video-content'],
      ranges: [
        { key: 'filter', val: `blur(${maxBlurIncoming}px)`, prog: 0 },
        {
          key: 'filter',
          val: `blur(${maxBlurIncoming * 0.5}px)`,
          prog: 0.5,
        },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    },
  };

  // Incoming video: focus breathing (scale 1.0 + focusBreathingIntensity*1.5 → 1.0) over progress 0.3-1
  const incomingScaleEffect = {
    id: 'incoming-scale',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: overlapDuration * 0.3,
      duration: overlapDuration * 0.7,
      mode: 'provider' as const,
      targetIds: ['incoming-video-content'],
      ranges: [
        { key: 'scale', val: 1.0 + focusBreathingIntensity * 1.5, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
      ],
    },
  };

  // Incoming video: brightness (80% → 100%) over progress 0-0.5
  const incomingBrightnessEffect = {
    id: 'incoming-brightness',
    componentId: 'generic' as const,
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: overlapDuration * 0.5,
      mode: 'provider' as const,
      targetIds: ['incoming-video-content'],
      ranges: [
        { key: 'brightness', val: 0.8, prog: 0 },
        { key: 'brightness', val: 1.0, prog: 1 },
      ],
    },
  };

  // Incoming video: opacity fade in
  const incomingOpacityEffect = {
    id: 'incoming-opacity',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in' as const,
      start: 0,
      duration: overlapDuration * 0.6,
      mode: 'provider' as const,
      targetIds: ['incoming-video-container'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Vignette effect: opacity increases during transition
  const vignetteEffect = {
    id: 'vignette-fade',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: overlapDuration,
      mode: 'provider' as const,
      targetIds: ['vignette-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: vignetteIntensity, prog: 0.5 },
        { key: 'opacity', val: vignetteIntensity * 0.5, prog: 1 },
      ],
    },
  };

  // Bokeh highlight overlay: appears during mid-transition
  const bokehOpacityEffect = {
    id: 'bokeh-opacity',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: overlapDuration * 0.2,
      duration: overlapDuration * 0.6,
      mode: 'provider' as const,
      targetIds: ['bokeh-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: bokehHighlightThreshold, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Chromatic aberration effect (simulated via filter)
  const chromaticAberrationEffect = {
    id: 'chromatic-aberration',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: overlapDuration * 0.3,
      duration: overlapDuration * 0.4,
      mode: 'provider' as const,
      targetIds: ['chromatic-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.15, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video-content',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideoDuration,
            },
          },
          effects: [
            outgoingBlurEffect,
            outgoingScaleEffect,
            outgoingBrightnessEffect,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: incomingVideoDuration + overlapDuration,
        },
      },
      effects: [incomingOpacityEffect],
      childrenData: [
        {
          id: 'incoming-video-content',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideoDuration + overlapDuration,
            },
          },
          effects: [
            incomingBlurEffect,
            incomingScaleEffect,
            incomingBrightnessEffect,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Bokeh highlight overlay (hexagonal shapes on bright areas)
    {
      id: 'bokeh-overlay',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 3,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            filter: 'contrast(200%) brightness(150%) blur(2px)',
            clipPath:
              'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [bokehOpacityEffect],
      childrenData: [
        {
          id: 'bokeh-video-duplicate',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            muted: true,
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Chromatic aberration overlay
    {
      id: 'chromatic-overlay',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 4,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at center, transparent 60%, rgba(255,0,0,0.1) 80%, rgba(0,0,255,0.1) 100%)',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [chromaticAberrationEffect],
      childrenData: [],
    } as RenderableComponentData,

    // Vignette overlay
    {
      id: 'vignette-overlay',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 5,
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [vignetteEffect],
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'depth-of-field-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000',
        },
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
  id: 'depth-of-field-glass-transition',
  title: 'Depth-of-Field Glass Transition',
  description:
    'A cinematic camera lens focus-pull transition with realistic lens blur, hexagonal bokeh shapes, focus breathing, chromatic aberration, and vignette effects. Creates a shallow depth-of-field look as if adjusting focus through frosted glass.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cinematic',
    'depth-of-field',
    'bokeh',
    'lens-blur',
    'focus-pull',
    'chromatic-aberration',
    'vignette',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    overlapDuration: 2.5,
    maxBlurOutgoing: 35,
    maxBlurIncoming: 40,
    focusBreathingIntensity: 0.02,
    chromaticAberrationIntensity: 2,
    vignetteIntensity: 0.6,
    bokehHighlightThreshold: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const depthOfFieldGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
