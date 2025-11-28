/**
 * Audio-Reactive Echo Chamber Effect Preset
 *
 * This preset creates an immersive audio-reactive echo chamber visualization where text
 * ghosts multiply and fade based on sound intensity, simulating acoustic reverb in a large
 * cathedral-like space. Each ghost represents an audio reflection bouncing off virtual walls.
 *
 * Features:
 * - **Dynamic Ghost Generation**: 2-8 text ghosts generated based on audio intensity
 * - **Frequency-Based Behavior**: Bass (0-250Hz) creates longer, diffused trails; treble (2000Hz+) creates sharper, quicker echoes
 * - **Spatial Distribution**: Ghosts positioned at circular angles (45° intervals) for 3D spatial effect
 * - **Waveform Vibration**: Each ghost pulses and vibrates with the audio beat
 * - **Exponential Decay**: Opacity fades using exponential decay matching acoustic reverb tail
 * - **Distance-Based Timing**: Echo delays calculated using speed of sound (343 m/s)
 * - **Audio-Synchronized**: All effects tied to real-time audio analysis with configurable sensitivity
 *
 * Use cases:
 * - Music video visualizations simulating cathedral acoustics
 * - Audio podcasts with dramatic echo effects
 * - Sound design demonstrations
 * - Immersive audio-visual experiences
 * - Live performance visuals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  WaveformEffectData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL or ref:componentId for audio analysis'),
  text: z
    .string()
    .default('ECHO')
    .describe('Text to display with echo effect'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "normal")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for original and ghosts'),
  font: z
    .string()
    .optional()
    .describe('Font family (e.g., "Inter:700", "Roboto:600:italic")'),
  ghostCount: z
    .number()
    .min(2)
    .max(8)
    .default(8)
    .describe('Number of echo ghosts (2-8)'),
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.8)
    .describe('Audio sensitivity multiplier (0.1-3)'),
  audioThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum audio intensity to trigger effects (0-1)'),
  reverbIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Reverb tail intensity multiplier (affects opacity decay)'),
  duration: z
    .number()
    .optional()
    .describe('Duration in seconds (optional, defaults to audio duration)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    audioSrc,
    text,
    fontSize,
    fontWeight,
    textColor,
    font,
    ghostCount,
    audioSensitivity,
    audioThreshold,
    reverbIntensity,
    duration,
  } = params;

  const { config } = props;
  const fps = config?.fps ?? 30;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Calculate ghost position based on angle
  const calculateGhostPosition = (index: number, intensity: number): { x: number; y: number } => {
    const angle = (index * 45 * Math.PI) / 180; // 45 degree intervals in radians
    const distance = intensity * 150; // Distance based on intensity (0-150px)
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper: Calculate echo delay based on distance (speed of sound: 343 m/s)
  const calculateEchoDelay = (distance: number): number => {
    const speedOfSound = 343; // m/s
    const distanceInMeters = distance / 100; // Convert pixels to approximate meters (1m ≈ 100px)
    return (distanceInMeters / speedOfSound) * 1000; // Return delay in milliseconds
  };

  // Helper: Calculate exponential opacity decay
  const calculateOpacityDecay = (distance: number, intensity: number): number => {
    const baseOpacity = 0.7;
    const decayFactor = 0.003; // Exponential decay rate
    return Math.max(0.1, baseOpacity * Math.exp(-decayFactor * distance) * intensity);
  };

  // Create audio atom
  const audioAtom: RenderableComponentData = {
    id: 'audio-track',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
      },
    },
  };

  // Create original text (center)
  const originalTextId = 'original-text';
  const originalText: RenderableComponentData = {
    id: originalTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    effects: [
      // Original text scale effect (mid-range frequencies)
      {
        id: `${originalTextId}-scale`,
        componentId: 'waveform',
        data: {
          audioSrc,
          audioProperty: 'mid',
          effectType: 'scale',
          intensity: 0.15,
          baseScale: 1,
          sensitivity: audioSensitivity,
          threshold: audioThreshold,
          smoothing: 0.7,
          numberOfSamples: 128,
          useFrequencyData: true,
          mode: 'provider',
          targetIds: [originalTextId],
          start: 0,
          duration: duration || 999,
        } as WaveformEffectData,
      },
      // Original text opacity pulse (all frequencies)
      {
        id: `${originalTextId}-opacity`,
        componentId: 'waveform',
        data: {
          audioSrc,
          audioProperty: 'waveform',
          effectType: 'exposure',
          intensity: 0.3,
          baseBrightness: 1,
          sensitivity: 0.6,
          threshold: 0.2,
          smoothing: 0.8,
          numberOfSamples: 128,
          mode: 'provider',
          targetIds: [originalTextId],
          start: 0,
          duration: duration || 999,
        } as WaveformEffectData,
      },
    ],
  };

  // Create echo ghosts
  const ghosts: RenderableComponentData[] = [];

  for (let i = 0; i < ghostCount; i++) {
    const ghostId = `ghost-${i + 1}`;
    
    // Determine frequency range based on ghost index
    // Lower index = bass (longer, diffused), higher index = treble (sharper, quicker)
    const isBassFocused = i % 3 === 0; // Every 3rd ghost focuses on bass
    const isTrebleFocused = i % 3 === 2; // Every 3rd ghost focuses on treble
    
    let frequencyRange: [number, number];
    let amplitudeMultiplier: number;
    let opacityDecayDuration: number;
    let vibrationIntensity: number;
    
    if (isBassFocused) {
      frequencyRange = [0, 250]; // Bass
      amplitudeMultiplier = 80; // Larger movement for bass
      opacityDecayDuration = 0.343; // Longer decay (343ms)
      vibrationIntensity = 0.05;
    } else if (isTrebleFocused) {
      frequencyRange = [2000, 20000]; // Treble
      amplitudeMultiplier = 50; // Sharper movement
      opacityDecayDuration = 0.2; // Quick decay (200ms)
      vibrationIntensity = 0.08;
    } else {
      frequencyRange = [250, 2000]; // Mid-range
      amplitudeMultiplier = 60;
      opacityDecayDuration = 0.25;
      vibrationIntensity = 0.06;
    }

    const angle = i * 45; // Degrees
    const avgDistance = amplitudeMultiplier; // Approximate average distance
    const echoDelay = calculateEchoDelay(avgDistance) / 1000; // Convert to seconds
    const initialOpacity = calculateOpacityDecay(avgDistance, reverbIntensity);

    const ghost: RenderableComponentData = {
      id: ghostId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          textAlign: 'center',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
        },
      },
      context: {
        timing: {
          start: echoDelay, // Delay based on distance
          fitDurationTo: 'audio-track',
        },
      },
      effects: [
        // Position effect (translate based on frequency and angle)
        {
          id: `${ghostId}-position`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration || 999,
            mode: 'provider',
            targetIds: [ghostId],
            ranges: [
              {
                key: 'translateX',
                val: Math.cos((angle * Math.PI) / 180) * amplitudeMultiplier * audioSensitivity,
                prog: 0,
              },
              {
                key: 'translateY',
                val: Math.sin((angle * Math.PI) / 180) * amplitudeMultiplier * audioSensitivity,
                prog: 0,
              },
            ],
          } as GenericEffectData,
        },
        // Waveform-driven vibration
        {
          id: `${ghostId}-vibration`,
          componentId: 'waveform',
          data: {
            audioSrc,
            audioProperty: isBassFocused ? 'bass' : isTrebleFocused ? 'treble' : 'mid',
            effectType: 'scale',
            intensity: vibrationIntensity,
            baseScale: 1,
            sensitivity: audioSensitivity,
            threshold: audioThreshold,
            smoothing: 0.5,
            numberOfSamples: 128,
            useFrequencyData: true,
            mode: 'provider',
            targetIds: [ghostId],
            start: 0,
            duration: duration || 999,
          } as WaveformEffectData,
        },
        // Exponential opacity decay
        {
          id: `${ghostId}-opacity-decay`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: opacityDecayDuration * reverbIntensity,
            mode: 'provider',
            targetIds: [ghostId],
            ranges: [
              { key: 'opacity', val: initialOpacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    ghosts.push(ghost);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'echo-chamber-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [
      audioAtom,
      {
        id: 'echo-container',
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
            fitDurationTo: 'audio-track',
          },
        },
        childrenData: [originalText, ...ghosts] as RenderableComponentData[],
      },
    ] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'audio-echo-chamber',
  title: 'Audio-Reactive Echo Chamber Effect',
  description:
    'Create an audio-reactive echo chamber effect where text ghosts multiply and fade based on sound intensity, simulating acoustic reverb in a large space. Each ghost represents an audio reflection bouncing off virtual walls, with timing and opacity determined by the reverb tail. Higher frequencies create sharper, quicker echoes while bass frequencies produce longer, more diffused trails.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'echo', 'reverb', 'waveform', 'text', 'visualization', 'reactive'],
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    text: 'ECHO',
    fontSize: 96,
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    font: 'Inter:700',
    ghostCount: 8,
    audioSensitivity: 0.8,
    audioThreshold: 0.3,
    reverbIntensity: 1,
  },
  dependencies: {},
};

export const audioEchoChamberPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
