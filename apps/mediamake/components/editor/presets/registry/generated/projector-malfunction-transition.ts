/**
 * Dramatic Projector Malfunction Transition Preset
 * 
 * Simulates authentic vintage film projector failures with realistic degradation effects.
 * Features:
 * - Outgoing video freezes using endAt property (stops playback)
 * - Progressive burn effects: brightness, contrast, sepia, blur escalation
 * - Orange/brown color overlay with increasing opacity (film burn)
 * - Incoming video with projector gate flicker (rapid opacity oscillations)
 * - Mechanical jitter via scale oscillation (0.98-1.02)
 * - Gate mask frame (black border simulating projector gate)
 * - Flickering light spill effect (blurred white glow)
 * 
 * Technical Implementation:
 * - BaseLayout with 2-second overlap period
 * - Filter animations progress from normal to extreme values
 * - Color overlay gradient animates from transparent to 60% opacity
 * - Incoming video starts with 6-keyframe flicker pattern over 0.5s
 * - All effects use provider mode with targetIds for proper layering
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Total duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Total duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number()
    .default(2)
    .describe('Duration of the projector malfunction transition in seconds (overlap period)'),
  
  burnIntensity: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for burn effects (brightness, contrast, sepia)'),
  
  flickerIntensity: z.number()
    .min(0.5)
    .max(1.5)
    .default(1)
    .describe('Intensity multiplier for incoming video flicker effect'),
  
  jitterAmount: z.number()
    .min(0.01)
    .max(0.05)
    .default(0.02)
    .describe('Amount of mechanical jitter (scale oscillation range)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    burnIntensity,
    flickerIntensity,
    jitterAmount,
  } = params;

  // Calculate timings
  const transitionStart = outgoingVideo.duration - transitionDuration;
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Calculate burn effect values
  const maxBrightness = 100 + (200 * burnIntensity); // 100% to 300%
  const maxContrast = 100 + (150 * burnIntensity); // 100% to 250%
  const maxSepia = 80 * burnIntensity; // 0% to 80%
  const maxBlur = 3 * burnIntensity; // 0px to 3px

  // Flicker pattern for incoming video (6 keyframes over 0.5s)
  const flickerPattern = [
    { opacity: 0, prog: 0 },
    { opacity: 1 * flickerIntensity, prog: 0.16 },
    { opacity: 0.2 * flickerIntensity, prog: 0.33 },
    { opacity: 1 * flickerIntensity, prog: 0.5 },
    { opacity: 0.5 * flickerIntensity, prog: 0.66 },
    { opacity: 1, prog: 1 }, // Stabilize at full opacity
  ];

  // Jitter scale values
  const minScale = 1 - jitterAmount;
  const maxScale = 1 + jitterAmount;

  const childrenData: RenderableComponentData[] = [
    // Light spill layer (background glow)
    {
      id: 'light-spill-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%); filter: blur(40px);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'light-spill-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['light-spill-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    },

    // Outgoing video (freezes and burns)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        muted: false,
        endAt: outgoingVideo.duration, // Video stops playing (freezes frame)
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Brightness escalation (100% to 300%)
        {
          id: 'outgoing-brightness',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: maxBrightness / 100, prog: 1 },
            ],
          },
        },
        // Contrast escalation (100% to 250%)
        {
          id: 'outgoing-contrast',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'contrast', val: 1, prog: 0 },
              { key: 'contrast', val: maxContrast / 100, prog: 1 },
            ],
          },
        },
        // Sepia escalation (0% to 80%)
        {
          id: 'outgoing-sepia',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'sepia', val: 0, prog: 0 },
              { key: 'sepia', val: maxSepia / 100, prog: 1 },
            ],
          },
        },
        // Blur escalation (0px to 3px)
        {
          id: 'outgoing-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'blur', val: 0, prog: 0 },
              { key: 'blur', val: maxBlur, prog: 1 },
            ],
          },
        },
      ],
    },

    // Burn overlay (orange/brown gradient)
    {
      id: 'burn-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, rgba(255,120,0,0.6) 0%, rgba(139,69,19,0.4) 50%, transparent 100%);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'burn-overlay-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['burn-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        },
      ],
    },

    // Incoming video (flickers and jitters)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        muted: false,
        startFrom: 0,
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Opacity flicker (6-keyframe pattern over first 0.5s)
        {
          id: 'incoming-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: flickerPattern.map(f => ({ key: 'opacity', val: f.opacity, prog: f.prog })),
          },
        },
        // Mechanical jitter (scale oscillation 0.98-1.02)
        {
          id: 'incoming-jitter',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: minScale, prog: 0 },
              { key: 'scale', val: maxScale, prog: 0.2 },
              { key: 'scale', val: minScale, prog: 0.4 },
              { key: 'scale', val: maxScale, prog: 0.6 },
              { key: 'scale', val: minScale, prog: 0.8 },
              { key: 'scale', val: 1, prog: 1 }, // Stabilize
            ],
          },
        },
      ],
    },

    // Gate mask frame (black border with inset shadow)
    {
      id: 'gate-mask-frame',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; inset: 0; border: 40px solid rgba(0,0,0,0.95); box-shadow: inset 0 0 30px rgba(0,0,0,0.8);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'projector-malfunction-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
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
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'projector-malfunction-transition',
  title: 'Dramatic Projector Malfunction Transition',
  description: 'Simulates vintage film projector failures with burning frames, melting emulsion, and mechanical stuttering. Features outgoing video freeze with burn effects (color distortion, sepia, blur), incoming video with projector gate flicker and mechanical jitter, plus authentic projector elements including gate masks and light spill.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'projector', 'vintage', 'burn', 'flicker', 'mechanical', 'film', 'malfunction'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2,
    burnIntensity: 1,
    flickerIntensity: 1,
    jitterAmount: 0.02,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const projectorMalfunctionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};