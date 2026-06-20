/**
 * Audio Reactive Slide Effect Preset
 *
 * SINGLE EFFECT (INTERNAL PRESET):
 * This internal waveform effect preset creates audio-synchronized sliding movements
 * for media elements. It reacts to bass frequencies in the audio, creating subtle
 * horizontal or vertical sliding movements that pulse with the beat.
 *
 * Features:
 * - Audio-reactive translation based on bass frequencies (20-250Hz)
 * - Customizable axis (horizontal or vertical sliding)
 * - Adjustable sensitivity (0.1 to 1.0) and threshold (0.3 to 0.8)
 * - Configurable base offset (neutral position)
 * - Maximum slide distance control
 * - Return speed for smooth transitions back to neutral
 * - Smoothing factor for interpolation
 * - Optional inverse mode (slides in opposite direction)
 * - Creates a 'breathing' slide motion where elements shift position based on bass intensity
 *
 * Use cases:
 * - Creating audio-reactive image slides
 * - Adding subtle movement to video overlays synchronized with music
 * - Building dynamic UI elements that respond to bass drops
 * - Creating rhythmic animations tied to audio beats
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply the slide effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z.number().default(0).describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  // Waveform configuration
  axis: z.enum(['x', 'y']).default('x').describe('Axis of sliding movement (x = horizontal, y = vertical)'),
  baseOffset: z.number().default(0).describe('Neutral position offset in pixels (where element returns to)'),
  maxSlide: z.number().default(30).describe('Maximum slide distance in pixels from base position'),
  sensitivity: z.number().min(0.1).max(1).default(0.5).describe('Sensitivity to audio input (0.1 = subtle, 1.0 = very reactive)'),
  threshold: z.number().min(0).max(1).default(0.4).describe('Minimum audio level to trigger movement (0 = always moving, 1 = only on loudest beats)'),
  returnSpeed: z.number().min(0.1).max(1).default(0.2).describe('Speed of return to neutral position (0.1 = slow, 1.0 = instant)'),
  smoothing: z.number().min(0).max(1).default(0.3).describe('Smoothing factor for interpolation (0 = no smoothing, 1 = maximum smoothing)'),
  inverse: z.boolean().optional().describe('If true, slides in opposite direction'),
  
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    axis,
    baseOffset,
    maxSlide,
    sensitivity,
    threshold,
    returnSpeed,
    smoothing,
    inverse,
    effectId,
  } = params;

  // Construct waveform effect data
  const waveformConfig: WaveformEffectData = {
    // Audio configuration
    audioSrc: audioSrc,
    audioProperty: 'bass', // React to bass frequencies (20-250Hz)
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // Standard frame rate window
    
    // Effect type and behavior
    effectType: axis === 'x' ? 'translateX' : 'translateY',
    sensitivity: sensitivity,
    threshold: threshold,
    smoothing: smoothing,
    
    // Translation parameters
    baseScale: baseOffset, // Base offset position
    intensity: maxSlide, // Max slide distance
    minValue: inverse ? -maxSlide : 0,
    maxValue: inverse ? 0 : maxSlide,
    
    // Timing
    start: effectStart,
    duration: effectDuration,
    
    // Provider mode targeting
    mode: 'provider',
    targetIds: targetIds,
    
    // Return speed (using smoothNormalisation for transition smoothness)
    smoothNormalisation: returnSpeed * 5, // Scale 0.1-1.0 to 0.5-5.0 range
  };

  // Create effect node
  const effect = {
    id: effectId || `audio-reactive-slide-${targetIds[0] || 'effect'}`,
    componentId: 'waveform',
    data: waveformConfig,
  };

  // Return effect in container structure for internal preset extraction
  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-slide-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden',
        style: {
          display: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [effect],
    childrenData: [],
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
  id: 'audioReactiveSlide',
  title: 'Audio Reactive Slide Effect',
  description: 'Internal waveform effect preset that creates audio-synchronized sliding movements for media elements. Reacts to bass frequencies (20-250Hz) creating horizontal or vertical sliding movements that pulse with the beat. Supports customizable axis, sensitivity, threshold, smoothing, and inverse mode. Returns effect data that can be applied to target components via provider mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'internal', 'slide', 'translate', 'bass', 'movement'],
  defaultInputParams: {
    targetIds: ['media-element'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    axis: 'x',
    baseOffset: 0,
    maxSlide: 30,
    sensitivity: 0.5,
    threshold: 0.4,
    returnSpeed: 0.2,
    smoothing: 0.3,
    inverse: false,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const audioReactiveSlidePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
