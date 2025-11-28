/**
 * Audio-Reactive Breathing Preset
 *
 * This preset creates a dynamic breathing/pulsing animation that synchronizes with music beats
 * and audio intensity. It combines a base breathing animation (scale 100-108% at 3-second intervals)
 * with audio-reactive waveform effects that respond to bass frequencies.
 *
 * Features:
 * - **Base Breathing Animation**: Continuous subtle scale animation (100-108%) looping every 3 seconds
 * - **Audio-Reactive Waveform**: Bass-reactive zoom effect that multiplies on top of base breathing
 * - **Dynamic Intensity**: Quiet moments = subtle breathing (100-105%), bass drops = dramatic pulsing (100-130%)
 * - **Audio Synchronization**: Automatically syncs with audio source duration via fitDurationTo
 * - **Hardware Acceleration**: Uses transform-gpu for smooth performance
 * - **Configurable Sensitivity**: Adjustable audio sensitivity, threshold, and intensity parameters
 * - **Content Slot**: Flexible container for any content (images, videos, text, logos)
 *
 * Technical Implementation:
 * - BaseLayout root container with relative positioning
 * - AudioAtom for audio source (optional, can use external audio)
 * - Nested breathing wrapper with combined base + waveform effects
 * - Base breathing: Generic effect with ease-in-out scale animation (3s loop)
 * - Waveform effect: Bass-reactive zoom with configurable sensitivity (1.5) and threshold (0.3)
 * - Performance: 30fps update frequency, transform-gpu acceleration
 *
 * Use cases:
 * - Music videos with audio-synced visual emphasis
 * - Promotional content with dynamic rhythm-driven animations
 * - Audio-focused presentations and visualizations
 * - Podcast or music player interfaces
 * - Event promo videos with beat-synchronized content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Audio source URL or ref:componentId. Optional if using external audio.',
    ),
  audioVolume: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Audio volume level (0-1)'),
  audioStartFrom: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start audio playback from this time in seconds'),

  // Base breathing parameters
  baseBreathingDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Duration of one breathing cycle in seconds'),
  baseBreathingScale: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.08)
    .optional()
    .describe('Maximum scale factor for base breathing (1 = no breathing, 1.08 = 8% expansion)'),

  // Audio-reactive parameters
  audioReactiveSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Sensitivity multiplier for audio-reactive effect (higher = more responsive)'),
  audioReactiveThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum audio level to trigger effect (0-1, lower = more reactive)'),
  audioReactiveMaxScale: z
    .number()
    .min(1.1)
    .max(2)
    .default(1.3)
    .optional()
    .describe('Maximum scale factor for audio-reactive zoom (during bass drops)'),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('bass')
    .optional()
    .describe('Audio frequency range to react to (bass = low frequencies for dramatic effect)'),

  // Timing
  duration: z
    .number()
    .positive()
    .optional()
    .describe('Duration in seconds. If not provided, uses fitDurationTo audio source.'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time of the breathing effect relative to parent'),

  // Content styling
  contentClassName: z
    .string()
    .default('flex items-center justify-center')
    .optional()
    .describe('CSS classes for content slot container'),
  contentStyle: z
    .record(z.string(), z.any())
    .optional()
    .describe('Inline styles for content slot container'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    audioSrc,
    audioVolume = 1,
    audioStartFrom = 0,
    baseBreathingDuration = 3,
    baseBreathingScale = 1.08,
    audioReactiveSensitivity = 1.5,
    audioReactiveThreshold = 0.3,
    audioReactiveMaxScale = 1.3,
    audioProperty = 'bass',
    duration,
    startTime = 0,
    contentClassName = 'flex items-center justify-center',
    contentStyle,
  } = params;

  const rootContainerId = 'audio-breathing-root';
  const breathingWrapperId = 'breathing-content-wrapper';
  const contentSlotId = 'content-slot';
  const audioSourceId = 'audio-source';

  // Build childrenData array
  const childrenData: RenderableComponentData[] = [];

  // Add audio source if provided
  if (audioSrc) {
    childrenData.push({
      id: audioSourceId,
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: audioSrc,
        volume: audioVolume,
        startFrom: audioStartFrom,
      },
      context: {
        timing: {},
      },
    } as RenderableComponentData);
  }

  // Create breathing content wrapper with combined effects
  const breathingWrapper: RenderableComponentData = {
    id: breathingWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        ...(duration ? { duration } : audioSrc ? { fitDurationTo: audioSourceId } : { duration: 30 }),
      },
    },
    effects: [
      // Base breathing effect - continuous subtle scale animation
      {
        id: 'base-breathing-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: baseBreathingDuration,
          mode: 'provider',
          targetIds: [breathingWrapperId],
          loop: true,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: baseBreathingScale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Audio-reactive waveform effect - multiplies on top of base breathing
      ...(audioSrc
        ? [
            {
              id: 'audio-reactive-waveform',
              componentId: 'waveform',
              data: {
                audioSrc: audioSrc.startsWith('ref:') ? audioSrc : `ref:${audioSourceId}`,
                waveformType: 'zoom',
                audioProperty,
                sensitivity: audioReactiveSensitivity,
                threshold: audioReactiveThreshold,
                minScale: 1,
                maxScale: audioReactiveMaxScale,
                mode: 'provider',
                targetIds: [breathingWrapperId],
                numberOfSamples: 128,
                useFrequencyData: true,
                windowInSeconds: 1 / 30,
                smoothNormalisation: 1,
                start: 0,
                duration: duration || 30,
              },
            },
          ]
        : []),
    ],
    childrenData: [
      // Content slot - user can insert any content here
      {
        id: contentSlotId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: contentClassName,
            style: {
              width: '100%',
              height: '100%',
              ...contentStyle,
            },
          },
        },
        context: {
          timing: {
            start: 0,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  childrenData.push(breathingWrapper);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          position: 'relative',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        ...(duration ? { duration } : audioSrc ? { fitDurationTo: audioSourceId } : { duration: 30 }),
      },
    },
    childrenData: childrenData as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'audio-reactive-breathing',
  title: 'Audio-Reactive Breathing',
  description:
    'A dynamic breathing/pulsing animation preset that synchronizes with music beats and audio intensity. Combines base breathing animation (100-108% scale at 3-second intervals) with audio-reactive waveform effects that respond to bass frequencies. During quiet moments, subtle breathing occurs; during bass drops or high-intensity sections, dramatic pulsing scales up to 130%. Perfect for music videos, promotional content, or audio-focused presentations. Uses transform-gpu for hardware acceleration and limits updates to 30fps for smooth performance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'breathing',
    'animation',
    'waveform',
    'music',
    'reactive',
    'beat-sync',
    'visualizer',
  ],
  dependencies: {},
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    audioVolume: 1,
    audioStartFrom: 0,
    baseBreathingDuration: 3,
    baseBreathingScale: 1.08,
    audioReactiveSensitivity: 1.5,
    audioReactiveThreshold: 0.3,
    audioReactiveMaxScale: 1.3,
    audioProperty: 'bass',
    duration: undefined,
    startTime: 0,
    contentClassName: 'flex items-center justify-center',
  },
};

export const audioReactiveBreathingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
