/**
 * Ken Burns Rack Focus Transition Preset
 *
 * This preset creates a multi-stage transition that simulates a camera rack focus effect
 * between two video depths. The outgoing video starts wide and zooms to extreme close-up
 * with blur ramping in the final second (losing focus). The incoming video appears already
 * at 200% scale with 12px blur (simulating background bokeh), then pulls focus over 2 seconds
 * as blur drops to 0 and scale reduces to 110% for a medium shot.
 *
 * Features:
 * - **Multi-stage zoom transitions**: Outgoing video zooms 100%→180%, incoming video scales 200%→110%
 * - **Focus pull simulation**: Blur ramps 0→12px on outgoing, 12px→0 on incoming
 * - **Dreamy overlap phase**: 0.8s overlap where both videos are heavily blurred
 * - **Dynamic vignetting**: Vignette intensity follows blur phase (0→0.6→0.3)
 * - **Precise timing control**: Cubic-bezier easing for smooth, cinematic motion
 *
 * Use cases:
 * - Cinematic transitions between video clips
 * - Simulating depth-of-field camera effects
 * - Creating dreamy, artistic transitions
 * - Professional video montages with focus effects
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
  
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the overlap/transition phase in seconds'),
  
  outgoingZoomDuration: z
    .number()
    .default(3)
    .describe('Duration of the outgoing video zoom effect in seconds'),
  
  incomingFocusDuration: z
    .number()
    .default(2)
    .describe('Duration of the incoming video focus pull effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    outgoingZoomDuration,
    incomingFocusDuration,
  } = params;

  // Calculate total duration
  // BaseLayout duration = outgoing duration + incoming duration - overlap
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Outgoing video starts at 0 and plays for its full duration
  const outgoingStart = 0;
  const outgoingDuration = outgoingVideo.duration;

  // Incoming video starts before outgoing ends (creating overlap)
  const incomingStart = outgoingVideo.duration - overlapDuration;
  const incomingDuration = incomingVideo.duration + overlapDuration;

  // Blur phase timing for outgoing video (final 1 second)
  const outgoingBlurStart = outgoingZoomDuration - 1; // Start blur 1s before zoom ends
  const outgoingBlurDuration = 1;

  // Fade out timing for outgoing video (final 0.8s = overlap)
  const outgoingFadeStart = outgoingDuration - overlapDuration;
  const outgoingFadeDuration = overlapDuration;

  // Vignette timing for outgoing (synchronized with blur)
  const vignetteOutStart = outgoingBlurStart;
  const vignetteOutDuration = outgoingBlurDuration;

  // Incoming effects start at 0 (relative to incoming container start)
  const incomingScaleStart = 0;
  const incomingScaleDuration = incomingFocusDuration;
  const incomingBlurStart = 0;
  const incomingBlurDuration = incomingFocusDuration;
  const incomingFadeStart = 0;
  const incomingFadeDuration = overlapDuration;

  // Vignette timing for incoming (starts high, fades to medium)
  const vignetteInStart = 0;
  const vignetteInDuration = incomingFocusDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      childrenData: [
        // Outgoing video atom
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            loop: false,
            muted: false,
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
        } as RenderableComponentData,
        // Vignette overlay for outgoing
        {
          id: 'outgoing-vignette',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: "<div style='position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 100%); pointer-events: none;'></div>",
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Scale/zoom effect: 100% → 180% over full outgoing duration
        {
          id: 'outgoing-scale-effect',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0,
            duration: outgoingZoomDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.8, prog: 1 },
            ],
          },
        },
        // Blur effect: 0 → 12px in final 1 second
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingBlurStart,
            duration: outgoingBlurDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(12px)', prog: 1 },
            ],
          },
        },
        // Fade out effect: 1 → 0 in final 0.8s (overlap phase)
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingFadeStart,
            duration: outgoingFadeDuration,
            mode: 'provider',
            targetIds: ['outgoing-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Vignette intensity: 0 → 0.6 → 0.3 (synchronized with blur)
        {
          id: 'vignette-opacity-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: vignetteOutStart,
            duration: vignetteOutDuration,
            mode: 'provider',
            targetIds: ['outgoing-vignette'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video container
    {
      id: 'incoming-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      childrenData: [
        // Incoming video atom
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            loop: false,
            muted: false,
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
        } as RenderableComponentData,
        // Vignette overlay for incoming
        {
          id: 'incoming-vignette',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: "<div style='position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 100%); pointer-events: none;'></div>",
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Scale effect: 200% → 110% over focus duration
        {
          id: 'incoming-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingScaleStart,
            duration: incomingScaleDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 2, prog: 0 },
              { key: 'scale', val: 1.1, prog: 1 },
            ],
          },
        },
        // Blur effect: 12px → 0 over focus duration (pulling focus)
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingBlurStart,
            duration: incomingBlurDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'blur(12px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Fade in effect: 0 → 1 in first 0.8s (overlap phase)
        {
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: incomingFadeStart,
            duration: incomingFadeDuration,
            mode: 'provider',
            targetIds: ['incoming-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Vignette intensity: 0.6 → 0.3 (fades as focus clears)
        {
          id: 'vignette-opacity-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: vignetteInStart,
            duration: vignetteInDuration,
            mode: 'provider',
            targetIds: ['incoming-vignette'],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'ken-burns-rack-focus-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'ken-burns-rack-focus-transition',
  title: 'Ken Burns Rack Focus Transition',
  description:
    'Multi-stage Ken Burns transition that mimics camera rack focus between video depths. First video zooms from 100% to 180% scale over 3s with blur ramping 0→12px in final second. Incoming video starts at 200% scale with 12px blur, then pulls focus over 2s (blur 12px→0, scale 200%→110%). Includes 0.8s overlap with dreamy blur phase and synchronized vignette effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'ken-burns', 'rack-focus', 'cinematic', 'zoom', 'blur', 'vignette'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 0.8,
    outgoingZoomDuration: 3,
    incomingFocusDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kenBurnsRackFocusTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
