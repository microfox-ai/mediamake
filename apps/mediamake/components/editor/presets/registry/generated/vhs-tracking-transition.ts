/**
 * VHS Tracking Error Transition Preset
 *
 * Simulates analog VHS tracking errors with horizontal displacement bands, color bleeding,
 * hue shifts, and temporal distortion effects during video transitions between two clips.
 *
 * Features:
 * - **Horizontal Displacement Bands**: 7 tracking bands with independent horizontal shifts
 * - **Color Bleeding**: Rainbow hue rotation cycling through 360 degrees
 * - **Temporal Distortion**: Simulated temporal displacement using opacity and blur
 * - **Vertical Hold**: Subtle vertical oscillation (-5px to 5px)
 * - **Contrast & Brightness**: Enhanced filters for VHS aesthetic
 * - **1.2s Overlap Transition**: Synchronized distortion during clip overlap
 *
 * Use cases:
 * - Creating retro VHS-style video transitions
 * - Adding analog video distortion effects between clips
 * - Building nostalgic video aesthetics
 * - Simulating tracking errors for artistic effect
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
  }),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  trackingBandCount: z
    .number()
    .default(7)
    .describe('Number of horizontal tracking bands (5-7 recommended)'),
  maxHorizontalShift: z
    .number()
    .default(30)
    .describe('Maximum horizontal displacement in pixels for tracking bands'),
  hueRotationCycles: z
    .number()
    .default(1)
    .describe('Number of full hue rotation cycles (0-360 degrees per cycle)'),
  contrastBoost: z
    .number()
    .default(150)
    .describe('Contrast boost percentage (100 = normal, 150 = 1.5x)'),
  brightnessBoost: z
    .number()
    .default(110)
    .describe('Brightness boost percentage (100 = normal, 110 = 1.1x)'),
  verticalHoldAmplitude: z
    .number()
    .default(5)
    .describe('Vertical oscillation amplitude in pixels (vertical hold effect)'),
  colorBleedIntensity: z
    .number()
    .default(0.5)
    .describe('Color bleed effect intensity (0-1, higher = stronger magenta glow)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    trackingBandCount,
    maxHorizontalShift,
    hueRotationCycles,
    contrastBoost,
    brightnessBoost,
    verticalHoldAmplitude,
    colorBleedIntensity,
  } = params;

  // Calculate total duration (video1 duration + video2 duration - overlap)
  const totalDuration = video1.duration;

  // Incoming video starts at (video1.duration - transitionDuration)
  const incomingVideoStart = video1.duration - transitionDuration;

  // Generate tracking band positions (evenly distributed vertically)
  const bandPositions: number[] = [];
  for (let i = 0; i < trackingBandCount; i++) {
    bandPositions.push((i / trackingBandCount) * 100);
  }

  // Helper: Create tracking band displacement effects
  const createBandEffect = (
    bandIndex: number,
    targetId: string,
    isOutgoing: boolean,
  ) => {
    const displacement =
      (Math.sin(bandIndex * 0.7) * maxHorizontalShift) / 2 +
      (Math.cos(bandIndex * 1.3) * maxHorizontalShift) / 2;

    return {
      id: `tracking-band-${bandIndex}-effect-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: isOutgoing ? video1.duration - transitionDuration : 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          {
            key: 'translateX',
            val: isOutgoing ? '0px' : `${displacement}px`,
            prog: 0,
          },
          {
            key: 'translateX',
            val: isOutgoing ? `${displacement}px` : '0px',
            prog: 1,
          },
        ],
      },
    };
  };

  // Helper: Create hue rotation effect
  const createHueRotationEffect = (targetId: string, isOutgoing: boolean) => {
    const startDeg = 0;
    const endDeg = 360 * hueRotationCycles;

    return {
      id: `hue-rotate-effect-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: isOutgoing ? video1.duration - transitionDuration : 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          {
            key: 'filter',
            val: `hue-rotate(${startDeg}deg) contrast(${contrastBoost}%) brightness(${brightnessBoost}%)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `hue-rotate(${endDeg}deg) contrast(${contrastBoost}%) brightness(${brightnessBoost}%)`,
            prog: 1,
          },
        ],
      },
    };
  };

  // Helper: Create vertical hold oscillation effect
  const createVerticalHoldEffect = (targetId: string, isOutgoing: boolean) => {
    return {
      id: `vertical-hold-effect-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: isOutgoing ? video1.duration - transitionDuration : 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: '0px', prog: 0 },
          { key: 'translateY', val: `${verticalHoldAmplitude}px`, prog: 0.25 },
          { key: 'translateY', val: '0px', prog: 0.5 },
          { key: 'translateY', val: `${-verticalHoldAmplitude}px`, prog: 0.75 },
          { key: 'translateY', val: '0px', prog: 1 },
        ],
      },
    };
  };

  // Helper: Create temporal displacement effect (opacity + blur)
  const createTemporalDisplacementEffect = (
    bandIndex: number,
    targetId: string,
    isOutgoing: boolean,
  ) => {
    const blurAmount = 5 + (bandIndex % 3) * 2;

    return {
      id: `temporal-displacement-${bandIndex}-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: isOutgoing ? video1.duration - transitionDuration : 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          {
            key: 'opacity',
            val: isOutgoing ? 1 : 0.5,
            prog: 0,
          },
          {
            key: 'opacity',
            val: isOutgoing ? 0.5 : 1,
            prog: 1,
          },
          {
            key: 'filter',
            val: isOutgoing ? 'blur(0px)' : `blur(${blurAmount}px)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: isOutgoing ? `blur(${blurAmount}px)` : 'blur(0px)',
            prog: 1,
          },
        ],
      },
    };
  };

  // ============================================================================
  // OUTGOING VIDEO CONTAINER
  // ============================================================================

  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
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
        duration: video1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          volume: 1,
          playbackRate: 1,
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          createHueRotationEffect('outgoing-video', true),
          createVerticalHoldEffect('outgoing-video', true),
        ],
      } as RenderableComponentData,
    ],
  };

  // ============================================================================
  // INCOMING VIDEO CONTAINER
  // ============================================================================

  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
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
        start: incomingVideoStart,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          volume: 0,
          playbackRate: 1,
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          createHueRotationEffect('incoming-video', false),
          createVerticalHoldEffect('incoming-video', false),
        ],
      } as RenderableComponentData,
    ],
  };

  // ============================================================================
  // TRACKING BANDS
  // ============================================================================

  const trackingBands: RenderableComponentData[] = bandPositions.map(
    (topPosition, index) => {
      const bandId = `tracking-band-${index}`;

      return {
        id: bandId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '',
          className: 'absolute w-full pointer-events-none',
          style: {
            height: '15%',
            top: `${topPosition}%`,
            left: 0,
            zIndex: 10,
            mixBlendMode: 'normal',
            overflow: 'hidden',
            boxShadow: `0 0 20px rgba(255, 0, 255, ${colorBleedIntensity})`,
          },
        },
        context: {
          timing: {
            start: incomingVideoStart,
            duration: transitionDuration,
          },
        },
        effects: [
          createBandEffect(index, bandId, false),
          createTemporalDisplacementEffect(index, bandId, false),
        ],
      } as RenderableComponentData;
    },
  );

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'vhs-tracking-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
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
      outgoingVideoContainer,
      incomingVideoContainer,
      ...trackingBands,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vhs-tracking-transition',
  title: 'VHS Tracking Error Transition',
  description:
    'Simulates analog VHS tracking errors with horizontal displacement bands, color bleeding, hue shifts, and temporal distortion effects during video transitions. Features 7 tracking bands with independent horizontal shifts, rainbow hue rotation cycling through 360 degrees, contrast/brightness filters, vertical hold oscillation, and color bleed effects. Designed for 1.2s overlap transitions between two video clips.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vhs', 'retro', 'analog', 'glitch', 'distortion'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
    },
    transitionDuration: 1.2,
    trackingBandCount: 7,
    maxHorizontalShift: 30,
    hueRotationCycles: 1,
    contrastBoost: 150,
    brightnessBoost: 110,
    verticalHoldAmplitude: 5,
    colorBleedIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const vhsTrackingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
