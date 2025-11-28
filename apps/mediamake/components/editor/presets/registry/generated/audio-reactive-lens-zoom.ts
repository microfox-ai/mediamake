/**
 * Audio-Reactive Lens Zoom Preset
 *
 * This preset creates a sophisticated audio-reactive lens zoom effect that synchronizes
 * dynamic zoom bursts and subtle rotations with music frequencies. The effect reacts to
 * both bass and treble, creating a camera viewfinder-like experience that pulses with the beat.
 *
 * Features:
 * - **Bass-Driven Zoom**: Scale transformations controlled by bass frequencies
 * - **Treble-Driven Rotation**: Subtle tilt/rotation synchronized with treble
 * - **Reactive Vignetting**: Dynamic edge darkening on strong bass beats
 * - **Multi-Frequency Reactive**: Combines multiple waveform effects for rich audio synchronization
 * - **Smoothing Control**: Configurable smoothing for smooth or responsive reactions
 * - **Customizable Ranges**: Adjustable zoom range and rotation amount
 *
 * Use cases:
 * - Music video overlays with audio-reactive camera movement
 * - DJ/producer visual content with beat-synchronized effects
 * - Concert/performance visuals with dynamic lens effects
 * - Audio-reactive content wrapping for any composition
 * - Creating immersive music-synchronized viewing experiences
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .default([])
    .describe(
      'Array of component IDs to apply the lens zoom effects to. If empty, effects apply to the lens container which wraps all content.',
    ),
  audioSrc: z
    .string()
    .describe(
      'Audio source URL or ref:componentId for frequency analysis. This audio drives all the reactive effects.',
    ),
  bassSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.6)
    .describe(
      'Sensitivity multiplier for bass frequency detection (0.1-5). Higher values make the zoom and vignette more responsive to bass.',
    ),
  trebleSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.3)
    .describe(
      'Sensitivity multiplier for treble frequency detection (0.1-5). Higher values make the rotation more responsive to treble.',
    ),
  zoomRange: z
    .object({
      min: z
        .number()
        .min(0.5)
        .max(2)
        .default(1)
        .describe('Minimum zoom scale value (0.5-2). 1 = normal size, <1 = zoomed out, >1 = zoomed in.'),
      max: z
        .number()
        .min(0.5)
        .max(3)
        .default(1.5)
        .describe(
          'Maximum zoom scale value (0.5-3). The effect scales between min and max based on bass intensity.',
        ),
    })
    .default({ min: 1, max: 1.5 })
    .describe('Range for zoom scale values. Min is the base scale, max is reached on strong bass hits.'),
  rotationMax: z
    .number()
    .min(0)
    .max(45)
    .default(5)
    .describe(
      'Maximum rotation angle in degrees (0-45). The effect rotates between -rotationMax and +rotationMax based on treble.',
    ),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe(
      'Smoothing factor for audio reactivity (0-1). Lower values = more responsive/jittery, higher values = smoother/slower response.',
    ),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe(
      'Minimum audio intensity threshold (0-1) to trigger effects. Lower values make effects more sensitive to quiet sounds.',
    ),
  duration: z
    .number()
    .positive()
    .optional()
    .describe('Duration in seconds for the effect. If not specified, matches audio duration or uses fitDurationTo.'),
  start: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time in seconds relative to parent component timeline.'),
  fitDurationTo: z
    .string()
    .optional()
    .describe(
      'Component ID to match duration to (e.g., audio track ID). Overrides duration parameter if specified.',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    bassSensitivity,
    trebleSensitivity,
    zoomRange,
    rotationMax,
    smoothing,
    threshold,
    duration,
    start,
    fitDurationTo,
  } = params;

  // Determine which targets to apply effects to
  const effectTargetIds =
    targetIds && targetIds.length > 0 ? targetIds : ['lens-zoom-container'];

  // Create zoom waveform effect (bass-driven)
  const zoomEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: bassSensitivity,
    threshold,
    smoothing,
    baseScale: zoomRange.min,
    minValue: zoomRange.min,
    maxValue: zoomRange.max,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: effectTargetIds,
    start: 0,
    duration: duration || 10,
    smoothNormalisation: 1,
  };

  const zoomEffect = {
    id: 'lens-zoom-effect',
    componentId: 'waveform',
    data: zoomEffectData,
  };

  // Create rotation waveform effect (treble-driven)
  const rotateEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'treble',
    effectType: 'rotate',
    sensitivity: trebleSensitivity,
    threshold: 0.5,
    smoothing,
    rotationRange: rotationMax,
    minValue: -rotationMax,
    maxValue: rotationMax,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: effectTargetIds,
    start: 0,
    duration: duration || 10,
    smoothNormalisation: 1,
  };

  const rotateEffect = {
    id: 'lens-rotate-effect',
    componentId: 'waveform',
    data: rotateEffectData,
  };

  // Create vignette waveform effect (bass-driven)
  // This uses custom props to interpolate boxShadow based on bass intensity
  const vignetteEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    sensitivity: bassSensitivity,
    threshold,
    smoothing,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: ['vignette-overlay'],
    start: 0,
    duration: duration || 10,
    smoothNormalisation: 1,
    // Custom props for boxShadow interpolation
    props: {
      boxShadow: {
        min: 'inset 0 0 50px rgba(0,0,0,0.2)',
        max: 'inset 0 0 150px rgba(0,0,0,0.6)',
      },
    },
  };

  const vignetteEffect = {
    id: 'lens-vignette-effect',
    componentId: 'waveform',
    data: vignetteEffectData,
  };

  // Build the composition structure
  const lensZoomContainer: RenderableComponentData = {
    id: 'lens-zoom-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        ...(fitDurationTo
          ? { fitDurationTo }
          : duration
            ? { duration }
            : { duration: 10 }),
      },
    },
    effects: [zoomEffect, rotateEffect],
    childrenData: [],
  };

  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          boxShadow: 'inset 0 0 50px rgba(0,0,0,0.2)',
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        ...(fitDurationTo
          ? { fitDurationTo }
          : duration
            ? { duration }
            : { duration: 10 }),
      },
    },
    effects: [vignetteEffect],
    childrenData: [],
  };

  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-lens-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start,
        ...(fitDurationTo
          ? { fitDurationTo }
          : duration
            ? { duration }
            : { duration: 10 }),
      },
    },
    childrenData: [lensZoomContainer, vignetteOverlay] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'audio-reactive-lens-zoom',
  title: 'Audio-Reactive Lens Zoom',
  description:
    'Creates dynamic zoom bursts and subtle rotations synchronized with music frequencies (bass and treble). Includes reactive vignetting that darkens edges on strong beats, creating a camera viewfinder-like experience.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'waveform', 'zoom', 'rotation', 'reactive', 'music', 'effects', 'lens', 'camera'],
  defaultInputParams: {
    targetIds: [],
    audioSrc: 'https://example.com/audio.mp3',
    bassSensitivity: 0.6,
    trebleSensitivity: 0.3,
    zoomRange: {
      min: 1,
      max: 1.5,
    },
    rotationMax: 5,
    smoothing: 0.15,
    threshold: 0.4,
    start: 0,
    duration: 10,
  },
  dependencies: {},
};

// Export preset
export const audioReactiveLensZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
