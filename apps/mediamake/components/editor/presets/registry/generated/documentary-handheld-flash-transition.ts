/**
 * Documentary Handheld Flash Transition Preset
 *
 * A raw, guerrilla filmmaking-style flash transition with handheld camera shake,
 * harsh on-camera flash effect, rolling shutter simulation, and auto-exposure adjustment.
 *
 * Features:
 * - **Handheld Camera Shake**: Realistic camera operator movement with Perlin noise-like jitter
 * - **Harsh Flash Effect**: Sudden on-camera flash that blows out highlights
 * - **Rolling Shutter Simulation**: Digital camera artifacts with horizontal strip timing offsets
 * - **Auto-Exposure Adjustment**: Incoming video normalizes brightness/contrast after flash
 * - **Camera Jolt Reaction**: Increased shake during flash as if operator is startled
 * - **High Contrast**: Crushed shadows and blown highlights for documentary aesthetic
 * - **Drop Shadow Effects**: Sharp shadows during flash peak for depth
 *
 * Use cases:
 * - Documentary-style transitions between scenes
 * - Raw, authentic video aesthetics
 * - Guerrilla filmmaking effects
 * - Creating tension or surprise moments
 * - Simulating on-camera flash photography in video
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
    .default(0.4)
    .describe('Duration of the flash overlap transition in seconds'),
  flashDuration: z
    .number()
    .default(0.1)
    .describe('Duration of the peak flash brightness in seconds'),
  flashFadeOut: z
    .number()
    .default(0.3)
    .describe('Duration of the flash fade out in seconds'),
  autoExposureDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the auto-exposure normalization in seconds'),
  shakeIntensity: z
    .number()
    .default(1.0)
    .describe('Intensity multiplier for camera shake (1.0 = normal)'),
  rollingShutterOffset: z
    .number()
    .default(0.02)
    .describe('Time offset between rolling shutter strips in seconds'),
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
    flashDuration,
    flashFadeOut,
    autoExposureDuration,
    shakeIntensity,
    rollingShutterOffset,
  } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration = outgoingVideoDuration + incomingVideoDuration - overlapDuration;

  // Flash starts at the overlap point
  const flashStartTime = outgoingVideoDuration - overlapDuration;

  // Helper: Generate Perlin noise-like shake keyframes
  const generateShakeKeyframes = (
    targetId: string,
    duration: number,
    intensity: number,
  ) => {
    const keyframes: Array<{ key: string; val: string; prog: number }> = [];
    const steps = 20; // Number of keyframe steps for smooth shake

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Simulate Perlin noise with pseudo-random values
      const seed = Math.sin(progress * 100) * 10000;
      const xOffset = (Math.sin(seed) * 5 * intensity).toFixed(2);
      const yOffset = (Math.sin(seed + 1.5) * 3 * intensity).toFixed(2);

      keyframes.push({ key: 'translateX', val: `${xOffset}px`, prog: progress });
      keyframes.push({ key: 'translateY', val: `${yOffset}px`, prog: progress });
    }

    return keyframes;
  };

  // Shake effect on main container (throughout entire transition)
  const shakeEffect = {
    id: 'handheld-shake-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: totalDuration,
      mode: 'provider' as const,
      targetIds: ['shake-wrapper'],
      ranges: generateShakeKeyframes('shake-wrapper', totalDuration, shakeIntensity),
    },
  };

  // Increased shake during flash (jolt reaction)
  const flashJoltEffect = {
    id: 'flash-jolt-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: flashStartTime,
      duration: 0.2,
      mode: 'provider' as const,
      targetIds: ['shake-wrapper'],
      ranges: [
        { key: 'translateX', val: '10px', prog: 0 },
        { key: 'translateX', val: '0px', prog: 1 },
        { key: 'translateY', val: '6px', prog: 0 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    },
  };

  // Outgoing video filter effect (contrast/brightness spike during flash)
  const outgoingFilterEffect = {
    id: 'outgoing-filter-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: flashStartTime - 0.05,
      duration: flashDuration + 0.05,
      mode: 'provider' as const,
      targetIds: ['outgoing-video'],
      ranges: [
        { key: 'filter', val: 'contrast(1) brightness(1)', prog: 0 },
        { key: 'filter', val: 'contrast(2) brightness(1.5)', prog: 0.5 },
        { key: 'filter', val: 'contrast(2) brightness(1.5)', prog: 1 },
      ],
    },
  };

  // Outgoing video fade out after flash
  const outgoingFadeEffect = {
    id: 'outgoing-fade-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: flashStartTime + flashDuration,
      duration: flashFadeOut,
      mode: 'provider' as const,
      targetIds: ['outgoing-video'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Flash overlay effect (instant on, hold, fade out)
  const flashOpacityEffect = {
    id: 'flash-opacity-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: flashDuration + flashFadeOut,
      mode: 'provider' as const,
      targetIds: ['flash-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.001 }, // Instant jump
        { key: 'opacity', val: 1, prog: flashDuration / (flashDuration + flashFadeOut) },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Auto-exposure effect for incoming video strips
  const createAutoExposureEffect = (stripId: string, startDelay: number) => ({
    id: `auto-exposure-${stripId}`,
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: startDelay,
      duration: autoExposureDuration,
      mode: 'provider' as const,
      targetIds: [stripId],
      ranges: [
        { key: 'filter', val: 'contrast(0.5) brightness(0.7)', prog: 0 },
        { key: 'filter', val: 'contrast(1) brightness(1)', prog: 1 },
      ],
    },
  });

  // Shadow overlay effect (drop-shadow during flash peak)
  const shadowEffect = {
    id: 'shadow-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: flashDuration + 0.1,
      mode: 'provider' as const,
      targetIds: ['shadow-overlay'],
      ranges: [
        { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 0 },
        { key: 'filter', val: 'drop-shadow(0 4px 20px rgba(0,0,0,0.8))', prog: 0.5 },
        { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 1 },
      ],
    },
  };

  // Build component tree
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [outgoingFilterEffect, outgoingFadeEffect],
  };

  // Incoming video strips (rolling shutter simulation)
  const incomingStripTop: RenderableComponentData = {
    id: 'incoming-strip-top',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        clipPath: 'inset(0 0 66.67% 0)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: incomingVideoDuration + overlapDuration,
      },
    },
    effects: [createAutoExposureEffect('incoming-strip-top', 0)],
  };

  const incomingStripMiddle: RenderableComponentData = {
    id: 'incoming-strip-middle',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        clipPath: 'inset(33.33% 0 33.33% 0)',
      },
    },
    context: {
      timing: {
        start: rollingShutterOffset,
        duration: incomingVideoDuration + overlapDuration - rollingShutterOffset,
      },
    },
    effects: [createAutoExposureEffect('incoming-strip-middle', 0)],
  };

  const incomingStripBottom: RenderableComponentData = {
    id: 'incoming-strip-bottom',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        clipPath: 'inset(66.67% 0 0 0)',
      },
    },
    context: {
      timing: {
        start: rollingShutterOffset * 2,
        duration: incomingVideoDuration + overlapDuration - rollingShutterOffset * 2,
      },
    },
    effects: [createAutoExposureEffect('incoming-strip-bottom', 0)],
  };

  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: flashStartTime,
        duration: incomingVideoDuration + overlapDuration,
      },
    },
    childrenData: [incomingStripTop, incomingStripMiddle, incomingStripBottom],
  };

  // Flash overlay (white screen)
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width:100%;height:100%;background:white;'></div>",
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: flashStartTime,
        duration: flashDuration + flashFadeOut,
      },
    },
    effects: [flashOpacityEffect],
  };

  // Shadow overlay
  const shadowOverlay: RenderableComponentData = {
    id: 'shadow-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width:100%;height:100%;'></div>",
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: flashStartTime,
        duration: flashDuration + 0.1,
      },
    },
    effects: [shadowEffect],
  };

  // Shake wrapper container
  const shakeWrapper: RenderableComponentData = {
    id: 'shake-wrapper',
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
        duration: totalDuration,
      },
    },
    effects: [shakeEffect, flashJoltEffect],
    childrenData: [
      outgoingVideo,
      incomingVideoContainer,
      flashOverlay,
      shadowOverlay,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'documentary-handheld-flash-transition-container',
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
    childrenData: [shakeWrapper],
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
  id: 'documentary-handheld-flash-transition',
  title: 'Documentary Handheld Flash Transition',
  description:
    'A raw, guerrilla filmmaking-style flash transition with handheld camera shake, harsh on-camera flash effect, rolling shutter simulation, and auto-exposure adjustment. Creates authentic documentary aesthetic with sudden flash that blows out highlights, crushed shadows, camera operator jolt reaction, and realistic digital camera artifacts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'documentary',
    'handheld',
    'flash',
    'guerrilla',
    'raw',
    'camera-shake',
    'rolling-shutter',
    'auto-exposure',
    'filmmaking',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    overlapDuration: 0.4,
    flashDuration: 0.1,
    flashFadeOut: 0.3,
    autoExposureDuration: 0.5,
    shakeIntensity: 1.0,
    rollingShutterOffset: 0.02,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const documentaryHandheldFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
