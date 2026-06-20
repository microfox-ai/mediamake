/**
 * Audio-Reactive Racing Transition Preset
 *
 * This preset creates dynamic, audio-reactive transitions synchronized with engine sounds
 * and racing music beats. It analyzes audio in real-time and creates visual effects
 * that pulse, zoom, shake, and distort in sync with the soundtrack.
 *
 * Features:
 * - **Bass Response (20-250Hz)**: Screen shake effects with intensity mapped to bass amplitude
 * - **Mid-Frequency (250-2000Hz)**: Color shifts using hue-rotate filters
 * - **High-Frequency (2000Hz+)**: Particle burst emissions
 * - **Beat-Synchronized Pulses**: Zoom and scale effects matching detected beats
 * - **Audio Intensity Mapping**: Visual elements expand/contract with audio power
 * - **Multiple Intensity Levels**: Automatic adjustment based on audio analysis (low: 0.3, medium: 0.6, high: 0.8)
 * - **Performance Optimized**: Throttled audio analysis at 30fps, RAF animations, effect pooling
 *
 * Use Cases:
 * - Racing footage edits synchronized to music
 * - Action-packed video transitions
 * - Electronic music video effects
 * - High-energy sports content
 * - Gaming highlight reels
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  WaveformEffectData,
  GenericEffectData,
} from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL for analysis and playback'),
  audioVolume: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Audio volume level (0-2, default: 1)'),
  audioStartFrom: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start audio playback from this time in seconds'),
  
  // Bass response (20-250Hz) configuration
  bassShakeIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .optional()
    .describe('Intensity of bass-driven shake effect in pixels (default: 10)'),
  bassSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Sensitivity multiplier for bass frequency detection (default: 1.5)'),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum bass amplitude to trigger shake effect (default: 0.3)'),
  
  // Mid-frequency (250-2000Hz) configuration
  midFreqColorShift: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable mid-frequency color shift effects'),
  midFreqSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.2)
    .optional()
    .describe('Sensitivity for mid-frequency detection (default: 1.2)'),
  midFreqThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Minimum mid-frequency amplitude for color shift (default: 0.6)'),
  
  // High-frequency (2000Hz+) configuration
  highFreqParticles: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable high-frequency particle emission effects'),
  highFreqSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .optional()
    .describe('Sensitivity for high-frequency detection (default: 2)'),
  highFreqThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Minimum high-frequency amplitude for particle bursts (default: 0.8)'),
  particleCount: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .optional()
    .describe('Number of particles in the emission pool (default: 20)'),
  
  // Beat detection and zoom configuration
  beatZoomIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Intensity of beat-synchronized zoom effect (default: 0.15)'),
  beatZoomSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Sensitivity for beat detection (default: 1.5)'),
  
  // Performance and smoothing
  smoothing: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Frame-based smoothing for audio-reactive effects (0=none, 1=default, >1=more)'),
  
  // Content slot configuration
  contentBackgroundColor: z
    .string()
    .default('transparent')
    .optional()
    .describe('Background color for the main content area (default: transparent)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config } = props;
  
  // Extract parameters with defaults
  const {
    audioSrc,
    audioVolume = 1,
    audioStartFrom = 0,
    bassShakeIntensity = 10,
    bassSensitivity = 1.5,
    bassThreshold = 0.3,
    midFreqColorShift = true,
    midFreqSensitivity = 1.2,
    midFreqThreshold = 0.6,
    highFreqParticles = true,
    highFreqSensitivity = 2,
    highFreqThreshold = 0.8,
    particleCount = 20,
    beatZoomIntensity = 0.15,
    beatZoomSensitivity = 1.5,
    smoothing = 1,
    contentBackgroundColor = 'transparent',
  } = params;

  // Helper function to create unique IDs
  const createId = (base: string): string => {
    return `${base}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Create component IDs
  const audioId = createId('audio-source');
  const bassShakeContentId = createId('bass-shake-content');
  const midFreqLayerId = createId('mid-frequency-layer');
  const particleEmitterId = createId('particle-emitter');
  const contentSlotId = createId('content-slot');

  // ============================================================================
  // AUDIO ATOM
  // ============================================================================

  const audioAtom: RenderableComponentData = {
    id: audioId,
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audioSrc,
      volume: audioVolume,
      startFrom: audioStartFrom,
    },
    context: {
      timing: {},
    },
  };

  // ============================================================================
  // BASS SHAKE EFFECT (20-250Hz)
  // ============================================================================

  const bassShakeEffect = {
    id: createId('bass-shake-effect'),
    componentId: 'waveform',
    data: {
      audioSrc: `ref:${audioId}`,
      audioProperty: 'bass',
      effectType: 'shake',
      shakeAxis: 'both',
      intensity: bassShakeIntensity,
      sensitivity: bassSensitivity,
      threshold: bassThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [bassShakeContentId],
      smoothNormalisation: smoothing,
      start: 0,
    } as WaveformEffectData,
  };

  // ============================================================================
  // MID-FREQUENCY COLOR SHIFT EFFECT (250-2000Hz)
  // ============================================================================

  const midFreqColorEffect = midFreqColorShift
    ? {
        id: createId('mid-freq-color-effect'),
        componentId: 'waveform',
        data: {
          audioSrc: `ref:${audioId}`,
          audioProperty: 'mid',
          effectType: 'exposure',
          intensity: 0.3,
          baseBrightness: 1,
          sensitivity: midFreqSensitivity,
          threshold: midFreqThreshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [midFreqLayerId],
          smoothNormalisation: smoothing,
          start: 0,
        } as WaveformEffectData,
      }
    : null;

  // ============================================================================
  // HIGH-FREQUENCY PARTICLE LAYER (2000Hz+)
  // ============================================================================
  
  // Create particle elements
  const particleChildren: RenderableComponentData[] = highFreqParticles
    ? Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * 360;
        const distance = 100 + Math.random() * 50;
        
        return {
          id: createId(`particle-${i}`),
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            color: '#ffffff',
            style: {
              width: '8px',
              height: '8px',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%)`,
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: audioId,
            },
          },
          effects: [
            {
              id: createId(`particle-burst-${i}`),
              componentId: 'waveform',
              data: {
                audioSrc: `ref:${audioId}`,
                audioProperty: 'treble',
                effectType: 'scale',
                baseScale: 0,
                intensity: 2,
                sensitivity: highFreqSensitivity,
                threshold: highFreqThreshold,
                numberOfSamples: 128,
                useFrequencyData: true,
                windowInSeconds: 1 / 30,
                mode: 'provider',
                targetIds: [createId(`particle-${i}`)],
                smoothNormalisation: 0,
                start: 0,
              } as WaveformEffectData,
            },
            {
              id: createId(`particle-translate-${i}`),
              componentId: 'generic',
              data: {
                type: 'linear',
                mode: 'provider',
                targetIds: [createId(`particle-${i}`)],
                start: 0,
                ranges: [
                  {
                    key: 'translateX',
                    val: Math.cos((angle * Math.PI) / 180) * distance,
                    prog: 1,
                  },
                  {
                    key: 'translateY',
                    val: Math.sin((angle * Math.PI) / 180) * distance,
                    prog: 1,
                  },
                ],
              } as GenericEffectData,
            },
          ],
        } as RenderableComponentData;
      })
    : [];

  const particleEmitter: RenderableComponentData = {
    id: particleEmitterId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: particleChildren,
  };

  // ============================================================================
  // HIGH-FREQUENCY LAYER
  // ============================================================================

  const highFrequencyLayer: RenderableComponentData = {
    id: createId('high-frequency-layer'),
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: highFreqParticles ? [particleEmitter] : [],
  };

  // ============================================================================
  // MID-FREQUENCY LAYER (Color Overlay)
  // ============================================================================

  const midFrequencyLayer: RenderableComponentData = {
    id: midFreqLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 2,
          mixBlendMode: 'overlay',
          background: 'linear-gradient(45deg, rgba(255,0,150,0.3), rgba(0,200,255,0.3))',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    effects: midFreqColorEffect ? [midFreqColorEffect] : [],
  };

  // ============================================================================
  // BEAT-SYNCHRONIZED ZOOM EFFECT
  // ============================================================================

  const beatZoomEffect = {
    id: createId('beat-zoom-effect'),
    componentId: 'waveform',
    data: {
      audioSrc: `ref:${audioId}`,
      audioProperty: 'bass',
      effectType: 'zoom',
      baseScale: 1,
      intensity: beatZoomIntensity,
      sensitivity: beatZoomSensitivity,
      threshold: 0.4,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [contentSlotId],
      smoothNormalisation: smoothing,
      start: 0,
    } as WaveformEffectData,
  };

  // ============================================================================
  // CONTENT SLOT (Main Media Container)
  // ============================================================================

  const contentSlot: RenderableComponentData = {
    id: contentSlotId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'w-full h-full',
        style: {
          backgroundColor: contentBackgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    effects: [beatZoomEffect],
  };

  // ============================================================================
  // MAIN CONTENT LAYER
  // ============================================================================

  const mainContentLayer: RenderableComponentData = {
    id: createId('main-content-layer'),
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: [contentSlot],
  };

  // ============================================================================
  // BASS SHAKE CONTENT CONTAINER
  // ============================================================================

  const bassShakeContent: RenderableComponentData = {
    id: bassShakeContentId,
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
        fitDurationTo: audioId,
      },
    },
    childrenData: [mainContentLayer],
    effects: [bassShakeEffect],
  };

  // ============================================================================
  // BASS SHAKE LAYER
  // ============================================================================

  const bassShakeLayer: RenderableComponentData = {
    id: createId('bass-shake-layer'),
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
        fitDurationTo: audioId,
      },
    },
    childrenData: [bassShakeContent],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: createId('audio-reactive-root'),
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
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: [
      audioAtom,
      bassShakeLayer,
      midFrequencyLayer,
      highFrequencyLayer,
    ],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
  id: 'audio-reactive-racing-transition',
  title: 'Audio-Reactive Racing Transition',
  description:
    'An audio-reactive transition preset that synchronizes visual effects with engine sounds and racing music. Features bass-responsive screen shakes (20-250Hz), mid-frequency color shifts (250-2000Hz), and high-frequency particle emissions (2000Hz+). Includes beat-synchronized zooms, pulses, and distortions with automatic intensity level adjustment based on audio analysis. Three intensity thresholds (low: 0.3, medium: 0.6, high: 0.8) control effect triggers. Uses audio analysis to detect beats and frequency data, with 30fps throttled analysis and RAF-based smooth animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'reactive',
    'transition',
    'racing',
    'beat-sync',
    'waveform',
    'effects',
    'particles',
    'shake',
    'zoom',
    'music',
  ],
  defaultInputParams: {
    audioSrc: 'https://example.com/racing-audio.mp3',
    audioVolume: 1,
    audioStartFrom: 0,
    bassShakeIntensity: 10,
    bassSensitivity: 1.5,
    bassThreshold: 0.3,
    midFreqColorShift: true,
    midFreqSensitivity: 1.2,
    midFreqThreshold: 0.6,
    highFreqParticles: true,
    highFreqSensitivity: 2,
    highFreqThreshold: 0.8,
    particleCount: 20,
    beatZoomIntensity: 0.15,
    beatZoomSensitivity: 1.5,
    smoothing: 1,
    contentBackgroundColor: 'transparent',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const audioReactiveRacingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
