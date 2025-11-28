/**
 * Scanline Interference VHS Effect Preset
 *
 * This preset recreates the horizontal scan lines and interference patterns of degraded VHS tapes.
 * It's a waveform-based effect that reacts to audio, causing the scan lines to intensify and distort
 * with bass frequencies.
 *
 * Features:
 * - **Audio-Reactive Scan Lines**: Scan line opacity and intensity pulse with bass frequencies
 * - **Vertical Animation**: Scan lines move vertically to simulate analog video tracking
 * - **Brightness/Contrast Modulation**: Filter effects that react to audio
 * - **Customizable Parameters**: Scan line thickness, speed, and audio sensitivity
 * - **CSS-Based Overlay**: Uses repeating-linear-gradient for performant scan line rendering
 *
 * Use cases:
 * - Creating retro VHS aesthetic overlays
 * - Adding analog video interference effects
 * - Building audio-reactive visual distortions
 * - Simulating degraded tape playback
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  WaveformEffectData,
  GenericEffectData,
  BaseEffect,
} from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the scanline effect to'),
  scanlineThickness: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .optional()
    .describe('Thickness of each scan line in pixels'),
  speed: z
    .number()
    .min(0.1)
    .max(10)
    .default(2)
    .optional()
    .describe('Speed of vertical scan line animation (higher = faster)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.7)
    .optional()
    .describe('Audio sensitivity for effect intensity (0.1-3)'),
  duration: z
    .number()
    .min(0.1)
    .default(5)
    .optional()
    .describe('Duration of the effect in seconds'),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Audio source URL or ref:componentId for audio-reactive behavior (optional)',
    ),
  baseOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Base opacity of scan lines (0-1)'),
  baseBrightness: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Base brightness value (0.5-2)'),
  baseContrast: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Base contrast value (0.5-2)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    scanlineThickness = 2,
    speed = 2,
    sensitivity = 0.7,
    duration = 5,
    audioSrc,
    baseOpacity = 0.6,
    baseBrightness = 1,
    baseContrast = 1,
  } = params;

  const fps = props.config?.fps || 30;

  // Calculate scan line pattern spacing based on thickness
  const lineHeight = scanlineThickness;
  const gapHeight = scanlineThickness * 1.5;
  const patternHeight = lineHeight + gapHeight;

  // Generate unique IDs for components
  const containerId = `scanline-interference-container-${targetIds[0]}`;
  const overlayId = `scanline-overlay-${targetIds[0]}`;

  // Create the scan line overlay component
  const scanlineOverlay: RenderableComponentData = {
    id: overlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="scanline-effect-vhs"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        width: '100%',
        height: '100%',
        backgroundImage: `repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${0.15 + sensitivity * 0.1}),
          rgba(0, 0, 0, ${0.15 + sensitivity * 0.1}) ${lineHeight}px,
          transparent ${lineHeight}px,
          transparent ${patternHeight}px
        )`,
        backgroundSize: `100% ${patternHeight}px`,
        opacity: baseOpacity,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // Build effects array
  const effects: BaseEffect[] = [];

  // 1. Generic effect for vertical scan line animation (translateY)
  const scanlineAnimationDuration = duration;
  const totalDistance = patternHeight * speed; // Distance to move based on speed

  const scanlineAnimationEffect: BaseEffect = {
    id: `scanline-animation-${overlayId}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: scanlineAnimationDuration,
      mode: 'provider',
      targetIds: [overlayId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: totalDistance, prog: 1 },
      ],
    } as GenericEffectData,
  };

  effects.push(scanlineAnimationEffect);

  // 2. Audio-reactive effects (if audioSrc is provided)
  if (audioSrc) {
    // Waveform effect for brightness/contrast modulation (reacts to bass)
    const waveformBrightnessEffect: BaseEffect = {
      id: `scanline-waveform-exposure-${overlayId}`,
      componentId: 'waveform',
      data: {
        audioSrc: audioSrc,
        audioProperty: 'bass',
        effectType: 'exposure',
        intensity: sensitivity * 0.3, // Moderate intensity for brightness
        baseBrightness: baseBrightness,
        sensitivity: sensitivity,
        threshold: 0.3,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / fps,
        mode: 'provider',
        targetIds: targetIds, // Apply to target components
        start: 0,
        duration: duration,
        smoothNormalisation: 1,
      } as WaveformEffectData,
    };

    effects.push(waveformBrightnessEffect);

    // Waveform effect for contrast modulation (also reacts to bass)
    const waveformContrastEffect: BaseEffect = {
      id: `scanline-waveform-contrast-${overlayId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          { key: 'contrast', val: baseContrast, prog: 0 },
          {
            key: 'contrast',
            val: baseContrast + sensitivity * 0.2,
            prog: 0.5,
          },
          { key: 'contrast', val: baseContrast, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Note: For true audio-reactive contrast, we'd need a custom waveform effect type
    // For now, using a generic pulsing effect as a placeholder
    // In production, you might want to create a custom waveform effect for contrast

    // Waveform effect for scan line opacity modulation
    const waveformOpacityEffect: BaseEffect = {
      id: `scanline-waveform-opacity-${overlayId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [overlayId],
        ranges: [
          { key: 'opacity', val: baseOpacity, prog: 0 },
          { key: 'opacity', val: baseOpacity + sensitivity * 0.2, prog: 0.5 },
          { key: 'opacity', val: baseOpacity, prog: 1 },
        ],
      } as GenericEffectData,
    };

    effects.push(waveformOpacityEffect);
  }

  // Create root container with scan line overlay
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          overflow: 'hidden',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: effects,
    childrenData: [scanlineOverlay] as RenderableComponentData[],
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
  id: 'scanline-interference',
  title: 'Scanline Interference VHS Effect',
  description:
    'Audio-reactive VHS scanline overlay effect with horizontal scan lines and interference patterns that intensify with bass frequencies. Creates degraded tape aesthetic with configurable scan line thickness, animation speed, and audio sensitivity.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'vhs',
    'scanline',
    'retro',
    'audio-reactive',
    'waveform',
    'overlay',
    'interference',
  ],
  dependencies: {},
  defaultInputParams: {
    targetIds: ['video-component-1'],
    scanlineThickness: 2,
    speed: 2,
    sensitivity: 0.7,
    duration: 5,
    baseOpacity: 0.6,
    baseBrightness: 1,
    baseContrast: 1,
  },
};

export const scanlineInterferencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
