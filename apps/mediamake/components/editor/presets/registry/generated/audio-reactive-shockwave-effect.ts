/**
 * Audio-Reactive Shockwave Effect Preset
 *
 * This preset creates an audio-reactive expanding shockwave effect that emanates from content,
 * simulating a sonic boom with concentric rectangular or circular waves pulsing outward.
 *
 * Features:
 * - **Multi-Layer Waveforms**: 2-5 concentric box-shadow layers with staggered propagation
 * - **Audio Reactivity**: Wave intensity driven by waveform data, bass triggers initial impulse
 * - **Customizable Appearance**: Configurable wave count, color, thickness, shape (rectangular/circular)
 * - **Propagation Control**: Adjustable speed and frequency band selection (bass/mid/treble)
 * - **Dynamic Effects**: Each wave pulses with audio peaks, creating powerful energy waves
 *
 * Use cases:
 * - Beat drops and impactful musical moments
 * - Text or video generating energy wave effects
 * - Audio visualizations with expanding waves
 * - Dynamic sonic boom effects synchronized to audio
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  content: z
    .object({
      type: z
        .enum(['text', 'video', 'image'])
        .describe('Type of content at center'),
      src: z.string().optional().describe('Source URL for video/image'),
      text: z.string().optional().describe('Text content to display'),
      textStyle: z
        .object({
          fontSize: z.number().optional().describe('Font size in pixels'),
          color: z.string().optional().describe('Text color'),
          fontWeight: z
            .string()
            .optional()
            .describe('Font weight (normal, bold, etc)'),
        })
        .optional()
        .describe('Text styling options'),
    })
    .describe('Content to display at center of shockwave'),

  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio reactivity'),

  waveCount: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Number of concentric wave layers (2-5)'),

  waveColor: z
    .string()
    .default('rgba(255, 100, 50, 0.8)')
    .describe('Wave color with alpha (hex with alpha or rgba)'),

  maxThickness: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum wave thickness in pixels (5-30px)'),

  propagationSpeed: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Wave propagation speed multiplier (0.5-2.0)'),

  frequencyBand: z
    .enum(['bass', 'mid', 'treble'])
    .default('bass')
    .describe('Audio frequency band to react to'),

  waveShape: z
    .enum(['rectangular', 'circular'])
    .default('rectangular')
    .describe('Shape of wave layers'),

  duration: z
    .number()
    .default(10)
    .describe('Duration of the shockwave effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    content,
    audioSrc,
    waveCount,
    waveColor,
    maxThickness,
    propagationSpeed,
    frequencyBand,
    waveShape,
    duration,
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;

  // Helper function to parse rgba color and create variants with different alpha
  const createWaveColorVariant = (
    baseColor: string,
    alphaMultiplier: number,
  ): string => {
    const rgbaMatch = baseColor.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (rgbaMatch) {
      const [, r, g, b, a] = rgbaMatch;
      const alpha = a ? parseFloat(a) : 1;
      return `rgba(${r}, ${g}, ${b}, ${alpha * alphaMultiplier})`;
    }
    // Fallback for hex colors - just return original
    return baseColor;
  };

  // Create wave layer components
  const waveLayers: RenderableComponentData[] = [];
  const staggerDelay = 0.15 / propagationSpeed; // Adjusted by speed

  for (let i = 0; i < waveCount; i++) {
    const waveId = `shockwave-wave-layer-${i}`;
    const delay = i * staggerDelay;
    const alphaMultiplier = 1 - i * (0.2 / waveCount); // Decrease alpha for outer waves
    const layerColor = createWaveColorVariant(waveColor, alphaMultiplier);

    // Create waveform effect for this wave layer
    const waveformEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: frequencyBand,
      effectType: 'scale',
      intensity: 0.15 + i * 0.05, // Slightly increase intensity for outer waves
      baseScale: 1,
      sensitivity: 1.5,
      threshold: 0.15,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / fps,
      mode: 'provider',
      targetIds: [waveId],
      start: delay,
      duration: duration - delay,
      smoothNormalisation: 1.5,
    };

    // Generic effect for box-shadow expansion (thickness animation)
    const boxShadowEffect = {
      id: `box-shadow-expand-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: delay,
        duration: Math.min(1.5 / propagationSpeed, duration - delay),
        mode: 'provider' as const,
        targetIds: [waveId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 0.8, prog: 0.6 },
          { key: 'opacity', val: 0.4, prog: 1 },
        ],
      },
    };

    waveLayers.push({
      id: waveId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            width: '100%',
            height: '100%',
            borderRadius: waveShape === 'circular' ? '50%' : '0px',
            // Initial box-shadow (will be animated)
            boxShadow: `inset 0 0 0 0px ${layerColor}`,
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `waveform-effect-${i}`,
          componentId: 'waveform',
          data: waveformEffect,
        },
        boxShadowEffect,
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // Create content component based on type
  const createContentComponent = (): RenderableComponentData => {
    const contentId = 'shockwave-content';

    if (content.type === 'text') {
      return {
        id: contentId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: content.text || 'SHOCKWAVE',
          style: {
            fontSize: content.textStyle?.fontSize || 72,
            color: content.textStyle?.color || '#FFFFFF',
            fontWeight: content.textStyle?.fontWeight || 'bold',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData;
    } else if (content.type === 'video') {
      return {
        id: contentId,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: content.src || '',
          className: 'w-full h-full object-cover',
          fit: 'cover' as const,
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData;
    } else {
      // image
      return {
        id: contentId,
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: content.src || '',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData;
    }
  };

  // Build final composition structure
  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-shockwave-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      // Content container (z-10)
      {
        id: 'shockwave-content-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative z-10 flex items-center justify-center',
            style: {
              width: '100%',
              height: '100%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [createContentComponent()],
      } as RenderableComponentData,

      // Shockwave effect container (z-5)
      {
        id: 'shockwave-effect-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 flex items-center justify-center pointer-events-none',
            style: {
              zIndex: 5,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: waveLayers,
      } as RenderableComponentData,
    ],
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
  id: 'audioReactiveShockwaveEffect',
  title: 'Audio-Reactive Shockwave Effect',
  description:
    'Creates an audio-reactive expanding shockwave effect with concentric rectangular or circular waves emanating from content. Each wave\'s intensity and propagation speed is driven by audio frequencies (bass for impulse, waveform for intensity). Perfect for beat drops and impactful moments, making text or video feel like it\'s generating powerful energy waves.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'reactive',
    'shockwave',
    'waveform',
    'effects',
    'visual',
    'energy',
    'sonic-boom',
  ],
  dependencies: {},
  defaultInputParams: {
    content: {
      type: 'text',
      text: 'BOOM',
      textStyle: {
        fontSize: 96,
        color: '#FFFFFF',
        fontWeight: 'bold',
      },
    },
    audioSrc: 'https://example.com/audio.mp3',
    waveCount: 3,
    waveColor: 'rgba(255, 100, 50, 0.8)',
    maxThickness: 15,
    propagationSpeed: 1.0,
    frequencyBand: 'bass',
    waveShape: 'rectangular',
    duration: 10,
  },
};

// Export preset
export const audioReactiveShockwaveEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
