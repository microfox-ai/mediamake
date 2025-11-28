/**
 * Industrial Emergency Light Transition Preset
 *
 * Simulates a tense facility lockdown scenario with rotating warning lights, emergency strobes,
 * and pulsating red/white lighting effects between two videos.
 *
 * Features:
 * - Rotating amber/red warning light background with conic gradient
 * - Pulsating red warning light effect on outgoing video
 * - White emergency strobe flashes on incoming video with increasing frequency
 * - Spinning light source with orbital motion and blur
 * - Rotating shadow overlay creating spinning shadow beams
 * - Emergency white flare synchronized with strobes
 * - 3-second overlap with mounting urgency and tension
 *
 * Use cases:
 * - Action/thriller video transitions
 * - Emergency alert sequences
 * - Industrial/technical video effects
 * - Dramatic scene changes
 * - Alarm/warning visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of the emergency transition overlap in seconds'),
  warningLightSpeed: z
    .number()
    .default(1)
    .describe('Rotation speed multiplier for warning lights (1 = normal)'),
  strobeBrightness: z
    .number()
    .default(1.8)
    .describe('Brightness multiplier for white strobe flashes'),
  strobeContrast: z
    .number()
    .default(1.5)
    .describe('Contrast multiplier for white strobe flashes'),
  pulseIntensity: z
    .number()
    .default(0.8)
    .describe('Minimum brightness for outgoing video pulse effect'),
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
    warningLightSpeed,
    strobeBrightness,
    strobeContrast,
    pulseIntensity,
  } = params;

  // Calculate base layout duration (overlap reduces total time)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Calculate rotation degrees over transition
  const totalRotation = 1080 * warningLightSpeed; // 3 full rotations

  // Helper to create strobe keyframes with increasing frequency
  const createStrobeKeyframes = () => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];

    // First half: strobes every ~400ms (0.4s)
    const firstHalfStrobes = 6; // ~0-1.5s
    for (let i = 0; i < firstHalfStrobes; i++) {
      const baseTime = i * 0.4;
      const prog = baseTime / transitionDuration;
      if (prog >= 0.5) break;

      // Flash on
      keyframes.push({ key: 'opacity', val: 0, prog: prog });
      keyframes.push({
        key: 'opacity',
        val: 1,
        prog: Math.min(prog + 0.033, 0.5),
      });
      // Flash off
      keyframes.push({
        key: 'opacity',
        val: 0,
        prog: Math.min(prog + 0.066, 0.5),
      });
    }

    // Second half: strobes every ~200ms (faster)
    const secondHalfStart = 0.5;
    const secondHalfStrobes = 10; // 1.5s-3s
    for (let i = 0; i < secondHalfStrobes; i++) {
      const baseTime = secondHalfStart + i * 0.2;
      const prog = baseTime;
      if (prog >= 1) break;

      // Flash on
      keyframes.push({ key: 'opacity', val: 0, prog: prog });
      keyframes.push({
        key: 'opacity',
        val: 1,
        prog: Math.min(prog + 0.02, 0.99),
      });
      // Flash off
      keyframes.push({
        key: 'opacity',
        val: 0,
        prog: Math.min(prog + 0.04, 0.99),
      });
    }

    // End at full opacity
    keyframes.push({ key: 'opacity', val: 1, prog: 1 });

    return keyframes;
  };

  // Create pulsating brightness keyframes for outgoing video
  const createPulseKeyframes = () => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];
    const pulseCount = 12; // 12 pulses over 3 seconds (~4 per second)

    for (let i = 0; i <= pulseCount; i++) {
      const prog = i / pulseCount;
      const brightness = i % 2 === 0 ? pulseIntensity : 1;
      keyframes.push({ key: 'brightness', val: brightness, prog });
    }

    return keyframes;
  };

  const childrenData: RenderableComponentData[] = [
    // 1. Rotating warning light background (conic gradient)
    {
      id: 'rotating-warning-light-bg',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: conic-gradient(from 0deg, #ff0000 0deg, #ff6600 60deg, #ff0000 120deg, #660000 180deg, #ff0000 240deg, #ff6600 300deg, #ff0000 360deg);"></div>',
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rotate-warning-light',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rotating-warning-light-bg'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: totalRotation, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 2. Outgoing video with red cast and pulsating brightness
    {
      id: 'outgoing-video-container',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: `sepia(100%) saturate(200%) hue-rotate(320deg) brightness(${pulseIntensity})`,
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: 'pulsate-outgoing',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: createPulseKeyframes(),
          },
        },
        {
          id: 'fade-out-outgoing',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingVideo.duration - transitionDuration / 2,
            duration: transitionDuration / 2,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 3. Rotating shadow overlay (spinning shadow beams)
    {
      id: 'rotating-shadow-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(0,0,0,0.7) 31%, rgba(0,0,0,0.7) 35%, transparent 36%, transparent 60%, rgba(0,0,0,0.7) 61%, rgba(0,0,0,0.7) 65%, transparent 66%, transparent 100%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rotate-shadow-mask',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rotating-shadow-overlay'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: totalRotation, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 4. Incoming video with strobe flashes
    {
      id: 'incoming-video-container',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'strobe-incoming',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: createStrobeKeyframes(),
          },
        },
        {
          id: 'strobe-brightness',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'brightness', val: strobeBrightness, prog: 0 },
              { key: 'brightness', val: strobeBrightness, prog: 1 },
            ],
          },
        },
        {
          id: 'strobe-contrast',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'contrast', val: strobeContrast, prog: 0 },
              { key: 'contrast', val: strobeContrast, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 5. Spinning light source with orbital motion
    {
      id: 'spinning-light-source',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 200px; height: 200px; background: radial-gradient(circle, #ff3300 0%, #ff6600 30%, transparent 70%); filter: blur(40px); border-radius: 50%;"></div>',
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rotate-light-source',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['spinning-light-source'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: totalRotation, prog: 1 },
            ],
          },
        },
        {
          id: 'orbit-light-source',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['spinning-light-source'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 150, prog: 0.25 },
              { key: 'translateX', val: 0, prog: 0.5 },
              { key: 'translateX', val: -150, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 6. Emergency white flare (synchronized with strobes)
    {
      id: 'emergency-flare',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 30%, transparent 60%); filter: blur(100px);"></div>',
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'flare-strobe',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['emergency-flare'],
            ranges: createStrobeKeyframes().map((range) => ({
              ...range,
              val: range.val === 1 ? 0.8 : 0, // Slightly dimmer than video strobe
            })),
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'industrial-emergency-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'industrial-emergency-transition',
  title: 'Industrial Emergency Light Transition',
  description:
    'Simulates warning lights and alarm strobes between videos with rotating amber/red warning lights, white emergency strobe flashes, and spinning shadow patterns. Creates tense, urgent mood like a facility lockdown with pulsating red warning light on outgoing video and stark white strobes on incoming video.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'emergency',
    'warning',
    'industrial',
    'alarm',
    'strobe',
    'lockdown',
    'urgent',
    'dramatic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 3,
    warningLightSpeed: 1,
    strobeBrightness: 1.8,
    strobeContrast: 1.5,
    pulseIntensity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const industrialEmergencyTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
