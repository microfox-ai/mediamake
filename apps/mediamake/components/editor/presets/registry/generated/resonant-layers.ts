/**
 * ResonantLayers - Internal Waveform Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset creates overlapping transparency effects responding to different
 * frequency bands (bass, mid, treble) simultaneously. Each layer reacts to a
 * specific audio frequency, creating multi-dimensional opacity shifts based on music.
 *
 * Features:
 * - Multiple Frequency Layers: Bass, mid, and treble frequency responses
 * - Visual Modes: Additive, subtractive, and interference patterns
 * - Phase Relationships: Synchronized, offset, or random phase interactions
 * - Resonance Decay: Configurable fade-out time after beats
 * - Multi-dimensional Effects: Complex overlapping patterns driven by music
 *
 * Use cases:
 * - Audio visualizers with multi-frequency responses
 * - Music-driven video effects with layered transparency
 * - Complex audio-reactive overlays
 * - Multi-dimensional visual feedback systems
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  frequencyMapping: z
    .array(z.enum(['bass', 'mid', 'treble']))
    .describe(
      'Array of frequency bands for each layer (e.g., ["bass", "mid", "treble"])',
    ),
  opacityResponse: z
    .number()
    .min(0.1)
    .max(1)
    .describe('How much opacity changes in response to audio (0.1-1.0)'),
  phaseRelationship: z
    .enum(['synchronized', 'offset', 'random'])
    .describe('How layers interact: synchronized, offset, or random phase'),
  resonanceDecay: z
    .number()
    .min(0.1)
    .max(2)
    .describe('Fade-out time after beat in seconds (0.1-2.0)'),
  visualMode: z
    .enum(['additive', 'subtractive', 'interference'])
    .describe('Visual blending mode: additive, subtractive, or interference'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    frequencyMapping,
    opacityResponse,
    phaseRelationship,
    resonanceDecay,
    visualMode,
  } = params;

  // Calculate sensitivity based on frequency type and visual mode
  const calculateSensitivity = (
    frequency: 'bass' | 'mid' | 'treble',
  ): number => {
    const baseSensitivity: Record<'bass' | 'mid' | 'treble', number> = {
      bass: 2.0,
      mid: 1.5,
      treble: 1.2,
    };

    return baseSensitivity[frequency] * opacityResponse;
  };

  // Calculate phase offset based on relationship mode
  const calculatePhaseOffset = (index: number): number => {
    if (phaseRelationship === 'synchronized') {
      return 0; // All layers in sync
    } else if (phaseRelationship === 'offset') {
      return index * 0.1; // Progressive offset (0.1s per layer)
    } else {
      // Random offset between 0 and 0.3 seconds
      return Math.random() * 0.3;
    }
  };

  // Create effects array
  const effects: Array<{
    id: string;
    componentId: string;
    data: WaveformEffectData;
  }> = [];

  // Generate waveform effect for each frequency layer
  frequencyMapping.forEach((frequency, layerIndex) => {
    const layerId = `resonant-layer-${layerIndex}`;
    const sensitivity = calculateSensitivity(frequency);
    const phaseOffset = calculatePhaseOffset(layerIndex);

    // Base waveform effect data
    const effectData: WaveformEffectData = {
      audioSrc: 'ref:audio', // Reference to audio component
      audioProperty: frequency,
      effectType: 'opacity' as any, // Opacity effect type
      sensitivity: sensitivity,
      threshold: 0.15,
      smoothNormalisation: resonanceDecay,
      intensity: opacityResponse,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [layerId],
      start: phaseOffset, // Apply phase offset
      duration: 'parent' as any, // Match parent duration
    };

    // For interference mode, alternate between normal and inverse opacity
    if (visualMode === 'interference' && layerIndex % 2 === 1) {
      // Inverse opacity: higher audio = lower opacity
      effectData.minValue = 1;
      effectData.maxValue = 0.2;
    } else {
      // Normal opacity: higher audio = higher opacity
      effectData.minValue = 0.2;
      effectData.maxValue = 1;
    }

    // For subtractive mode, reduce base opacity
    if (visualMode === 'subtractive') {
      effectData.minValue = 0.1;
      effectData.maxValue = 0.7;
    }

    effects.push({
      id: `resonant-effect-${frequency}-${layerIndex}`,
      componentId: 'waveform',
      data: effectData,
    });
  });

  // Create container with effects
  const rootContainer: RenderableComponentData = {
    id: 'resonant-layers-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 'parent' as any,
      },
    },
    effects: effects,
    childrenData: [] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      // Also expose effects directly for extraction
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'resonant-layers',
  title: 'ResonantLayers',
  description:
    'Internal waveform effect preset that creates overlapping transparency effects responding to different frequency bands (bass, mid, treble) simultaneously. Each layer reacts to a specific audio frequency, creating multi-dimensional opacity shifts based on music. Supports additive, subtractive, and interference visual modes with configurable phase relationships and resonance decay.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'internal', 'multi-layer'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    frequencyMapping: ['bass', 'mid', 'treble'],
    opacityResponse: 0.6,
    phaseRelationship: 'synchronized',
    resonanceDecay: 0.5,
    visualMode: 'additive',
  },
};

export const resonantLayersPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
