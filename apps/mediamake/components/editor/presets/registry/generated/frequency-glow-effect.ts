/**
 * Frequency Glow Effect (Internal Effect Preset)
 *
 * SINGLE EFFECT OR ARRAY OF EFFECTS:
 * This internal effect preset creates audio-reactive glow effects on target elements
 * based on real-time frequency analysis. It returns a waveform effect that applies
 * drop-shadow or box-shadow filters synchronized with specific audio frequency bands.
 *
 * Features:
 * - Audio-reactive glow synchronized with frequency analysis (bass, mid, treble, full)
 * - Multiple glow modes: pulse (beat-reactive), sustain (continuous), flash (brief bursts)
 * - Multi-color support for layered shadows and complex glow effects
 * - Configurable glow intensity, spread radius, and sensitivity
 * - Supports both drop-shadow (filter) and box-shadow (CSS property) rendering
 *
 * Use Cases:
 * - Audio-reactive UI elements (buttons, cards, text that glow to the beat)
 * - Music visualization with glowing graphics
 * - Beat-synchronized visual feedback
 * - Dynamic lighting effects responsive to audio frequency ranges
 * - Layered shadow effects for depth and complexity
 *
 * Technical Details:
 * - Uses WaveformEffect with custom frequency analysis
 * - Applies drop-shadow via CSS filter property
 * - Supports custom sensitivity and threshold for beat detection
 * - Provider mode targets specific component IDs
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the glow effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for frequency analysis'),
  
  // Glow appearance parameters
  glowColor: z
    .string()
    .default('#00ffff')
    .optional()
    .describe('Base glow color (hex/rgba format, e.g., "#00ffff" or "rgba(0,255,255,0.8)")'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('Maximum shadow blur radius in pixels (controls glow spread intensity)'),
  
  spreadRadius: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .optional()
    .describe('Spread radius in pixels (how far the glow extends before blurring)'),
  
  // Audio analysis parameters
  frequencyBand: z
    .enum(['bass', 'mid', 'treble', 'full'])
    .default('bass')
    .optional()
    .describe('Frequency range to react to: bass (low), mid (midrange), treble (high), full (all frequencies)'),
  
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .optional()
    .describe('Sensitivity multiplier for frequency response (higher = more reactive)'),
  
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Minimum audio intensity to trigger glow effect (0-1 scale)'),
  
  // Glow behavior modes
  glowMode: z
    .enum(['pulse', 'sustain', 'flash'])
    .default('pulse')
    .optional()
    .describe('Glow behavior mode: pulse (smooth beat-reactive), sustain (continuous hold), flash (brief burst)'),
  
  // Multi-color layered shadows
  multiColorLayers: z
    .array(
      z.object({
        color: z.string().describe('Layer color (hex/rgba format)'),
        blurRadius: z.number().describe('Blur radius for this layer (px)'),
        spreadRadius: z.number().optional().describe('Spread radius for this layer (px)'),
      })
    )
    .optional()
    .describe('Array of color layers for complex multi-color glow effects (each layer creates an additional shadow)'),
  
  // Timing parameters
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect in seconds (relative to parent)'),
  
  effectDuration: z
    .number()
    .default(10)
    .optional()
    .describe('Duration of the effect in seconds'),
  
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const glowColor = params.glowColor ?? '#00ffff';
  const glowIntensity = params.glowIntensity ?? 20;
  const spreadRadius = params.spreadRadius ?? 0;
  const frequencyBand = params.frequencyBand ?? 'bass';
  const sensitivity = params.sensitivity ?? 0.8;
  const threshold = params.threshold ?? 0.2;
  const glowMode = params.glowMode ?? 'pulse';
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration ?? 10;
  
  // Helper function to generate shadow string
  const generateShadowString = (intensity: number): string => {
    // If multi-color layers are provided, use them
    if (params.multiColorLayers && params.multiColorLayers.length > 0) {
      return params.multiColorLayers
        .map(layer => {
          const blur = layer.blurRadius * intensity;
          const spread = layer.spreadRadius ?? 0;
          return `0 0 ${blur}px ${spread}px ${layer.color}`;
        })
        .join(', ');
    }
    
    // Otherwise, use single color with specified parameters
    const blur = glowIntensity * intensity;
    return `0 0 ${blur}px ${spreadRadius}px ${glowColor}`;
  };
  
  // Map frequency band to audioProperty
  const audioPropertyMap: Record<string, 'bass' | 'mid' | 'treble' | 'waveform'> = {
    bass: 'bass',
    mid: 'mid',
    treble: 'treble',
    full: 'waveform',
  };
  
  const audioProperty = audioPropertyMap[frequencyBand];
  
  // Adjust sensitivity and smoothing based on glow mode
  let effectSensitivity = sensitivity;
  let smoothing = 0.5; // Default smoothing
  
  if (glowMode === 'pulse') {
    // Pulse mode: smooth, beat-reactive
    effectSensitivity = sensitivity;
    smoothing = 0.7; // More smoothing for gradual pulse
  } else if (glowMode === 'sustain') {
    // Sustain mode: continuous hold
    effectSensitivity = sensitivity * 1.5; // Increase sensitivity
    smoothing = 0.3; // Less smoothing for immediate response
  } else if (glowMode === 'flash') {
    // Flash mode: brief bursts
    effectSensitivity = sensitivity * 2; // High sensitivity
    smoothing = 0.1; // Minimal smoothing for sharp flashes
  }
  
  // Create waveform effect data
  const effectData: WaveformEffectData = {
    // Audio source configuration
    audioSrc: params.audioSrc,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    dataOffsetInSeconds: 0,
    normalize: true,
    
    // Audio property to react to
    audioProperty: audioProperty,
    sensitivity: effectSensitivity,
    threshold: threshold,
    smoothing: smoothing,
    smoothNormalisation: 1,
    
    // Effect configuration (custom for drop-shadow)
    effectType: undefined, // Not using built-in effect types
    
    // Timing
    start: effectStart,
    duration: effectDuration,
    
    // Mode and targets
    mode: 'provider',
    targetIds: [params.targetId],
    
    // Custom properties for waveform effect
    props: {
      type: 'filter',
      customProperty: 'dropShadow',
      generateValue: (audioValue: number) => {
        // audioValue is 0-1 based on frequency intensity
        // Apply threshold
        const normalizedValue = Math.max(0, audioValue - threshold) / (1 - threshold);
        
        // Generate shadow string with intensity
        return generateShadowString(normalizedValue);
      },
    },
  };
  
  // Create effect node
  const effect = {
    id: params.effectId || `frequency-glow-${params.targetId}`,
    componentId: 'waveform',
    data: effectData,
  };
  
  // Return effect wrapped in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'frequency-glow-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'frequency-glow-effect',
  title: 'Frequency Glow Effect',
  description:
    'An internal effect preset that creates audio-reactive glow effects on elements based on frequency analysis. Elements emit pulsing glows (using drop-shadow or box-shadow) that respond to specific frequency ranges (bass, mid, treble, full). Supports multi-color layered shadows, different glow modes (pulse, sustain, flash), and configurable intensity and spread.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'glow', 'frequency', 'internal', 'generic'],
  dependencies: {},
  
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'https://example.com/audio.mp3',
    glowColor: '#00ffff',
    glowIntensity: 20,
    spreadRadius: 0,
    frequencyBand: 'bass',
    sensitivity: 0.8,
    threshold: 0.2,
    glowMode: 'pulse',
    effectStart: 0,
    effectDuration: 10,
  },
};

export const frequencyGlowEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
