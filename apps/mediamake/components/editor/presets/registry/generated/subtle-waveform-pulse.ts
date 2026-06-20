/**
 * SubtleWaveformPulse Internal Effect Preset
 *
 * SINGLE EFFECT:
 * An internal audio-reactive waveform effect preset that creates minimal, elegant reactions
 * to audio for video and image elements. Combines gentle scale animation (1.0 to 1.02 max)
 * with subtle brightness adjustment that makes elements 'breathe' with the music.
 * Responds primarily to bass frequencies with extreme subtlety - like a natural heartbeat
 * rather than mechanical pulsing.
 *
 * Features:
 * - Gentle scale animation (1.0 to 1.02 max by default)
 * - Subtle brightness adjustment for breathing effect
 * - Responds primarily to bass frequencies
 * - Extreme subtlety - feels like natural breathing
 * - Configurable sensitivity, pulseScale, and brightnessRange
 *
 * Use cases:
 * - Adding subtle audio reactions to video backgrounds
 * - Creating minimal audio-reactive image overlays
 * - Building elegant, understated audio visualizations
 * - Enhancing videos with subtle rhythmic breathing
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the subtle pulse effect to'),
  duration: z
    .number()
    .optional()
    .describe(
      'Duration of the effect in seconds. Use -1 for infinite/full duration. Default: -1',
    ),
  sensitivity: z
    .number()
    .min(0.01)
    .max(5)
    .optional()
    .describe(
      'Sensitivity multiplier for audio reactivity. Lower values = more subtle. Default: 0.15',
    ),
  pulseScale: z
    .number()
    .min(1.0)
    .max(1.1)
    .optional()
    .describe(
      'Maximum scale multiplier for zoom effect. Higher values = more noticeable pulse. Default: 1.02',
    ),
  brightnessRange: z
    .number()
    .min(0)
    .max(0.5)
    .optional()
    .describe(
      'Maximum brightness adjustment range. Higher values = more brightness variation. Default: 0.1',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID. Auto-generated if not provided'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const sensitivity = params.sensitivity ?? 0.15;
  const pulseScale = params.pulseScale ?? 1.02;
  const brightnessRange = params.brightnessRange ?? 0.1;
  const duration = params.duration ?? -1;

  // Calculate exposure sensitivity (half of main sensitivity for subtler brightness changes)
  const exposureSensitivity = sensitivity * 0.5;

  // Construct waveform effect data
  const effectData: WaveformEffectData = {
    type: 'waveform',
    mode: 'provider',
    targetIds: params.targetIds,
    start: 0,
    duration: duration,
    props: {
      zoom: {
        enabled: true,
        audioProperty: 'bass',
        sensitivity: sensitivity,
        threshold: 0.3,
        maxZoom: pulseScale,
      },
      exposure: {
        enabled: true,
        audioProperty: 'bass',
        sensitivity: exposureSensitivity,
        maxExposure: brightnessRange,
      },
    },
  };

  // Create effect node
  const effect = {
    id:
      params.effectId ||
      `subtle-waveform-pulse-${params.targetIds.join('-')}`,
    componentId: 'waveform',
    data: effectData,
  };

  // Root container for effect
  const rootContainer: RenderableComponentData = {
    id: 'subtle-waveform-pulse-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: duration === -1 ? 10 : duration,
      },
    },
  } as RenderableComponentData;

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
  id: 'subtle-waveform-pulse',
  title: 'SubtleWaveformPulse',
  description:
    'An internal audio-reactive waveform effect preset that creates minimal, elegant reactions to audio for video and image elements. Combines gentle scale animation (1.0 to 1.02 max) with subtle brightness adjustment that makes elements "breathe" with the music. Responds primarily to bass frequencies with extreme subtlety - like a natural heartbeat rather than mechanical pulsing. Parameters include sensitivity (default 0.15), pulseScale (max scale multiplier), and brightnessRange (brightness variation amount).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio', 'subtle', 'pulse', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['video-1'],
    duration: -1,
    sensitivity: 0.15,
    pulseScale: 1.02,
    brightnessRange: 0.1,
  },
};

// Export preset
export const subtleWaveformPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
