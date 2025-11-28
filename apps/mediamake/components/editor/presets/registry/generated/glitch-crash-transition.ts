/**
 * Glitch-Style System Crash Transition Preset
 *
 * A glitch-style window corruption transition that mimics a system crash with loading recovery.
 * Features intensifying shake effects (1px to 8px amplitude), RGB channel separation using CSS filters
 * (hue-rotate from 0 to 180deg), random opacity flickers (alternating between 1 and 0.3) during the
 * last 0.5 seconds, terminal-style loading text overlay that types out 'LOADING...' character by character,
 * and incoming video slides in from the left with a digital scan line effect (horizontal lines moving vertically).
 *
 * Technical features:
 * - BaseLayout with 1.2s overlap period
 * - Outgoing VideoAtom: shake effect with AnimationRange[] for x/y transforms, filter effect with hue-rotate animation, opacity flicker using stepped keyframes
 * - Loading TextAtom: fixed position (centered), font-mono text-green-400, typewriter animation using clip-path
 * - Scan lines: 3-5 HTMLBlockAtoms with h-px bg-white/20, animated translateY from -100% to 200%
 * - Incoming VideoAtom: translateX from -100% to 0, combined with opacity fade-in
 *
 * Use cases:
 * - Creating dramatic video transitions with a technical/cyber aesthetic
 * - Adding glitch effects to video cuts
 * - Building tech-themed video presentations
 * - Creating system error or loading screen effects
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
    startFrom: z.number().optional().describe('Start time of outgoing video in seconds'),
    endAt: z.number().optional().describe('End time of outgoing video in seconds'),
  }).describe('Configuration for the outgoing video that will experience glitch effects'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video in seconds'),
    endAt: z.number().optional().describe('End time of incoming video in seconds'),
  }).describe('Configuration for the incoming video that slides in from the left'),
  
  transitionDuration: z.number()
    .default(1.2)
    .describe('Duration of the transition overlap period in seconds'),
  
  shakeIntensity: z.number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Multiplier for shake effect intensity (1 = normal, 2 = double intensity)'),
  
  scanlineCount: z.number()
    .int()
    .min(3)
    .max(5)
    .default(4)
    .describe('Number of horizontal scan lines to display during transition'),
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
    shakeIntensity,
    scanlineCount,
  } = params;

  // Calculate shake values with intensity multiplier
  const calculateShakeValue = (baseValue: number): number => {
    return baseValue * shakeIntensity;
  };

  // Outgoing video shake effect - intensifying from 1px to 8px
  const shakeEffectData = {
    type: 'linear' as const,
    start: 0,
    duration: transitionDuration,
    mode: 'provider' as const,
    targetIds: ['outgoing-video'],
    ranges: [
      // translateX - random shake pattern intensifying
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: calculateShakeValue(-2), prog: 0.1 },
      { key: 'translateX', val: calculateShakeValue(2), prog: 0.2 },
      { key: 'translateX', val: calculateShakeValue(-4), prog: 0.4 },
      { key: 'translateX', val: calculateShakeValue(4), prog: 0.6 },
      { key: 'translateX', val: calculateShakeValue(-8), prog: 0.8 },
      { key: 'translateX', val: calculateShakeValue(8), prog: 1 },
      // translateY - random shake pattern intensifying
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: calculateShakeValue(1), prog: 0.1 },
      { key: 'translateY', val: calculateShakeValue(-1), prog: 0.2 },
      { key: 'translateY', val: calculateShakeValue(3), prog: 0.4 },
      { key: 'translateY', val: calculateShakeValue(-3), prog: 0.6 },
      { key: 'translateY', val: calculateShakeValue(6), prog: 0.8 },
      { key: 'translateY', val: calculateShakeValue(-8), prog: 1 },
    ],
  };

  // Hue-rotate effect for RGB channel separation (0 to 180deg)
  const hueRotateEffectData = {
    type: 'ease-in' as const,
    start: 0,
    duration: transitionDuration,
    mode: 'provider' as const,
    targetIds: ['outgoing-video'],
    ranges: [
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(180deg)', prog: 1 },
    ],
  };

  // Opacity flicker effect - last 0.5 seconds (58.3% to 100% of transition)
  const flickerStartProg = 0.583; // (1.2 - 0.5) / 1.2
  const flickerEffectData = {
    type: 'linear' as const,
    start: 0,
    duration: transitionDuration,
    mode: 'provider' as const,
    targetIds: ['outgoing-video'],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 1, prog: flickerStartProg },
      { key: 'opacity', val: 0.3, prog: 0.6 },
      { key: 'opacity', val: 1, prog: 0.65 },
      { key: 'opacity', val: 0.3, prog: 0.7 },
      { key: 'opacity', val: 1, prog: 0.75 },
      { key: 'opacity', val: 0.3, prog: 0.8 },
      { key: 'opacity', val: 1, prog: 0.85 },
      { key: 'opacity', val: 0.3, prog: 0.9 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Typewriter effect for loading text - clip-path animation
  const typewriterEffectData = {
    type: 'linear' as const,
    start: 0,
    duration: transitionDuration * 0.7, // Types out over 70% of transition
    mode: 'provider' as const,
    targetIds: ['loading-text'],
    ranges: [
      { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
      { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
    ],
  };

  // Create scan line effects - staggered timing
  const createScanlineEffect = (scanlineId: string, delayFactor: number) => {
    return {
      id: `${scanlineId}-effect`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: delayFactor * 0.1, // Staggered start (0s, 0.1s, 0.2s, 0.3s, 0.4s)
        duration: transitionDuration * 0.7,
        mode: 'provider' as const,
        targetIds: [scanlineId],
        ranges: [
          { key: 'translateY', val: '-100%', prog: 0 },
          { key: 'translateY', val: '200%', prog: 1 },
        ],
      },
    };
  };

  // Incoming video slide effect
  const incomingSlideEffectData = {
    type: 'ease-out' as const,
    start: 0,
    duration: transitionDuration * 0.8,
    mode: 'provider' as const,
    targetIds: ['incoming-video'],
    ranges: [
      { key: 'translateX', val: '-100%', prog: 0 },
      { key: 'translateX', val: '0%', prog: 1 },
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
    ],
  };

  // Generate scan lines
  const scanlineComponents: RenderableComponentData[] = [];
  for (let i = 0; i < scanlineCount; i++) {
    const scanlineId = `scanline-${i}`;
    scanlineComponents.push({
      id: scanlineId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute left-0 right-0 h-px bg-white/20',
        style: {
          top: '-10%',
          zIndex: 40,
        },
      },
      context: {
        timing: {
          start: transitionDuration * 0.3, // Scan lines start 30% into transition
          duration: transitionDuration * 0.7,
        },
      },
      effects: [createScanlineEffect(scanlineId, i)],
    } as RenderableComponentData);
  }

  const childrenData: RenderableComponentData[] = [
    // Outgoing video with glitch effects
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        startFrom: outgoingVideo.startFrom,
        endAt: outgoingVideo.endAt,
        muted: true,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-shake',
          componentId: 'generic',
          data: shakeEffectData,
        },
        {
          id: 'outgoing-hue',
          componentId: 'generic',
          data: hueRotateEffectData,
        },
        {
          id: 'outgoing-flicker',
          componentId: 'generic',
          data: flickerEffectData,
        },
      ],
    } as RenderableComponentData,

    // Loading text overlay
    {
      id: 'loading-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: 'LOADING...',
        className: 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-green-400 text-4xl',
        style: {
          textShadow: '0 0 10px rgba(34, 197, 94, 0.8)',
          zIndex: 50,
        },
      },
      context: {
        timing: {
          start: transitionDuration * 0.25, // Appears 25% into transition
          duration: transitionDuration * 0.75,
        },
      },
      effects: [
        {
          id: 'typewriter-effect',
          componentId: 'generic',
          data: typewriterEffectData,
        },
      ],
    } as RenderableComponentData,

    // Scan lines
    ...scanlineComponents,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        startFrom: incomingVideo.startFrom,
        endAt: incomingVideo.endAt,
        muted: true,
      },
      context: {
        timing: {
          start: transitionDuration * 0.5, // Starts halfway through transition
          duration: transitionDuration * 0.5 + 2, // Continues beyond transition
        },
      },
      effects: [
        {
          id: 'incoming-slide',
          componentId: 'generic',
          data: incomingSlideEffectData,
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'glitch-crash-transition-container',
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
        duration: transitionDuration + 2, // Transition duration + incoming video continuation
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
  id: 'glitch-crash-transition',
  title: 'Glitch-Style System Crash Transition',
  description:
    'A glitch-style window corruption transition that mimics a system crash with loading recovery. Features intensifying shake effects, RGB channel separation, opacity flickers, terminal-style loading text, and incoming video with digital scan line effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'crash',
    'system',
    'loading',
    'cyber',
    'tech',
    'shake',
    'corruption',
    'scanline',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.2,
    shakeIntensity: 1,
    scanlineCount: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchCrashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};