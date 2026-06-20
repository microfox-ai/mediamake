/**
 * Spectrum Analyzer Outline Effect Preset
 *
 * This preset creates audio-reactive concentric outline rings that visualize frequency data
 * as animated borders. The effect generates multiple outline layers that react to different
 * frequency bands (bass, mid, treble), with each ring responding to its assigned frequency range.
 * Uses waveform effects combined with CSS custom properties to create dynamic multi-ring outlines.
 *
 * Features:
 * - **Multi-Ring Outlines**: Creates concentric rings using box-shadow
 * - **Frequency-Based Colors**: Each ring represents different frequency ranges (bass, mid, treble)
 * - **Audio-Reactive**: Rings pulse and scale based on audio intensity
 * - **Customizable Sensitivity**: Control how much rings react to audio
 * - **Configurable Ring Count**: Adjust number of outline layers
 * - **Visual Equalizer Effect**: Creates a spectrum analyzer effect around the element
 *
 * Use cases:
 * - Audio visualizer overlays with outline effects
 * - Music video spectrum analyzer borders
 * - Audio-reactive UI elements
 * - Beat-synchronized outline animations
 * - Creating visual equalizer effects around any content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL or ref:componentId for audio-reactive rings'),
  bassColor: z.string().default('#ff6b6b').describe('Color for bass frequency ring (outer ring)'),
  midColor: z.string().default('#4ecdc4').describe('Color for mid frequency ring (middle ring)'),
  trebleColor: z.string().default('#45b7d1').describe('Color for treble frequency ring (inner ring)'),
  sensitivity: z.number().min(0.5).max(5).default(2).describe('Sensitivity multiplier for audio reactivity'),
  ringCount: z.number().min(1).max(5).default(3).describe('Number of outline rings (1-5, maps to bass/mid/treble)'),
  ringSpacing: z.number().min(5).max(50).default(20).describe('Base spacing between rings in pixels'),
  targetElementId: z.string().optional().describe('Optional ID of element to apply outline to (creates a placeholder if not provided)'),
  elementSize: z.object({
    width: z.number().default(300).describe('Width of target element in pixels'),
    height: z.number().default(300).describe('Height of target element in pixels'),
  }).optional().describe('Size of target element (only used if targetElementId is not provided)'),
  duration: z.number().min(1).optional().describe('Duration in seconds (defaults to audio duration)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    audioSrc,
    bassColor,
    midColor,
    trebleColor,
    sensitivity,
    ringCount,
    ringSpacing,
    targetElementId,
    elementSize,
    duration,
  } = params;

  // Generate unique IDs
  const containerId = 'spectrum-outline-container';
  const targetId = targetElementId || 'spectrum-target-element';
  const audioId = 'spectrum-audio-source';

  // Calculate ring positions based on ring count
  // Ring 1 (Bass): Outer ring - starts at ringSpacing
  // Ring 2 (Mid): Middle ring - starts at ringSpacing * 2
  // Ring 3 (Treble): Inner ring - starts at ringSpacing * 3
  const getRingConfig = (index: number) => {
    const configs = [
      {
        audioProperty: 'bass' as const,
        color: bassColor,
        minValue: ringSpacing,
        maxValue: ringSpacing + 20,
      },
      {
        audioProperty: 'mid' as const,
        color: midColor,
        minValue: ringSpacing * 2,
        maxValue: ringSpacing * 2 + 15,
      },
      {
        audioProperty: 'treble' as const,
        color: trebleColor,
        minValue: ringSpacing * 3,
        maxValue: ringSpacing * 3 + 10,
      },
    ];
    return configs[Math.min(index, configs.length - 1)];
  };

  // Create waveform effects for each ring
  const ringEffects = [];
  for (let i = 0; i < Math.min(ringCount, 3); i++) {
    const config = getRingConfig(i);
    
    const effectData: WaveformEffectData = {
      audioSrc,
      audioProperty: config.audioProperty,
      effectType: 'scale', // We use scale to animate box-shadow spread
      intensity: 0.5,
      baseScale: 1,
      sensitivity,
      threshold: 0.1,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [targetId],
      start: 0,
      duration: duration || 9999, // Large duration, will be auto-fit by fitDurationTo
      smoothNormalisation: 1,
      // Custom properties for box-shadow animation
      minValue: config.minValue,
      maxValue: config.maxValue,
    };

    ringEffects.push({
      id: `${config.audioProperty}-ring-effect`,
      componentId: 'waveform',
      data: effectData,
    });
  }

  // Create target element (if not provided)
  const targetElement: RenderableComponentData = targetElementId
    ? {
        id: targetId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: audioId,
          },
        },
        effects: ringEffects,
        childrenData: [],
      }
    : {
        id: targetId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: `${elementSize?.width || 300}px`,
              height: `${elementSize?.height || 300}px`,
              backgroundColor: 'transparent',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: audioId,
          },
        },
        effects: ringEffects,
        childrenData: [
          {
            id: 'inner-content-placeholder',
            type: 'atom' as const,
            componentId: 'HTMLBlockAtom',
            data: {
              html: "<div style='width: 100%; height: 100%; background: transparent; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px;'></div>",
              style: {
                width: '100%',
                height: '100%',
              },
            },
            context: {
              timing: {
                start: 0,
                fitDurationTo: audioId,
              },
            },
          } as RenderableComponentData,
        ],
      };

  // Create audio source
  const audioElement: RenderableComponentData = {
    id: audioId,
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: audioSrc,
      volume: 0, // Silent audio for waveform analysis only
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Create container layout
  const containerLayout: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: [targetElement, audioElement] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [containerLayout] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'spectrum-analyzer-outline',
  title: 'Spectrum Analyzer Outline Effect',
  description:
    'Creates audio-reactive concentric outlines using waveform effects that respond to different frequency bands (bass, mid, treble). Each ring reacts to its assigned frequency range with dynamic colors representing different frequencies, creating a visual equalizer effect around the target element.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['audio', 'waveform', 'spectrum', 'outline', 'effects', 'visualizer', 'equalizer'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    bassColor: '#ff6b6b',
    midColor: '#4ecdc4',
    trebleColor: '#45b7d1',
    sensitivity: 2,
    ringCount: 3,
    ringSpacing: 20,
    elementSize: {
      width: 300,
      height: 300,
    },
  },
};

export const spectrumAnalyzerOutlinePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
