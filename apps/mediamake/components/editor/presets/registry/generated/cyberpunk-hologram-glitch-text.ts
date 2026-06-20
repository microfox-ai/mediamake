/**
 * Cyberpunk Hologram Glitch Text Preset
 *
 * This preset creates a neon text effect inspired by cyberpunk hologram displays that malfunction and recalibrate.
 * It visualizes text as unstable holographic projections that flicker between different color channels,
 * experience signal interference, and occasionally 'reboot' with bright flashes.
 *
 * Features:
 * - Continuous micro-vibration (electromagnetic interference simulation)
 * - Major glitch events with chromatic aberration (RGB channel separation)
 * - CRT-style scan lines overlay
 * - Neon glow with multiple text-shadow layers
 * - Distortion effects with contrast/brightness flashes
 * - Monospace tech aesthetic with JetBrains Mono font
 * - Audio-reactive glitches if audio is present
 *
 * Use cases:
 * - Cyberpunk-themed video titles
 * - Sci-fi tech interfaces
 * - Glitch art text effects
 * - Retro-futuristic aesthetics
 * - Music video titles with digital corruption theme
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('CYBERPUNK')
    .describe('The text content to display with hologram glitch effect'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#00ffff')
    .describe('Primary text color (cyan for hologram aesthetic)'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Duration of the effect in seconds'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall glitch intensity multiplier (affects amplitude and frequency)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source URL for audio-reactive glitch effects'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    duration,
    glitchIntensity,
    audioSrc,
  } = params;

  // Helper: Generate random glitch timing
  const generateGlitchTimings = (totalDuration: number, count: number) => {
    const timings: Array<{ start: number; duration: number }> = [];
    const minInterval = 0.8;
    const maxInterval = 1.2;
    
    let currentTime = Math.random() * 0.5; // Start within first 0.5s
    
    for (let i = 0; i < count && currentTime < totalDuration; i++) {
      const glitchDuration = 0.1 + Math.random() * 0.1; // 100-200ms
      timings.push({
        start: currentTime,
        duration: glitchDuration,
      });
      currentTime += minInterval + Math.random() * (maxInterval - minInterval);
    }
    
    return timings;
  };

  // Generate glitch events
  const glitchCount = Math.ceil((duration / 1) * glitchIntensity * 8);
  const glitchTimings = generateGlitchTimings(duration, glitchCount);

  // Container IDs
  const rootContainerId = 'cyberpunk-hologram-root';
  const scanlineOverlayId = 'scanline-overlay';
  const chromaticRedId = 'chromatic-layer-red';
  const chromaticBlueId = 'chromatic-layer-blue';
  const mainTextId = 'main-text-layer';

  // --- Effects ---

  // Continuous micro-vibration (60fps)
  const microVibrationEffect = {
    id: 'micro-vibration-effect',
    componentId: 'generic' as const,
    data: {
      type: 'linear' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [mainTextId, chromaticRedId, chromaticBlueId],
      ranges: [
        { key: 'translateX', val: -2 * glitchIntensity, prog: 0 },
        { key: 'translateX', val: 2 * glitchIntensity, prog: 0.25 },
        { key: 'translateX', val: -1 * glitchIntensity, prog: 0.5 },
        { key: 'translateX', val: 1 * glitchIntensity, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  };

  // Major glitch events (distortion + flash)
  const glitchEffects = glitchTimings.flatMap((timing, index) => {
    const baseEffects = [];

    // Chromatic aberration separation (red channel)
    baseEffects.push({
      id: `glitch-red-${index}`,
      componentId: 'generic' as const,
      data: {
        type: 'steps(4)' as const,
        start: timing.start,
        duration: timing.duration,
        mode: 'provider' as const,
        targetIds: [chromaticRedId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -10 * glitchIntensity, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      },
    });

    // Chromatic aberration separation (blue channel)
    baseEffects.push({
      id: `glitch-blue-${index}`,
      componentId: 'generic' as const,
      data: {
        type: 'steps(4)' as const,
        start: timing.start,
        duration: timing.duration,
        mode: 'provider' as const,
        targetIds: [chromaticBlueId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 10 * glitchIntensity, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      },
    });

    // Main text distortion with brightness/contrast flash
    baseEffects.push({
      id: `glitch-main-${index}`,
      componentId: 'generic' as const,
      data: {
        type: 'steps(4)' as const,
        start: timing.start,
        duration: timing.duration,
        mode: 'provider' as const,
        targetIds: [mainTextId],
        ranges: [
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: 0.95 + Math.random() * 0.1, prog: 0.3 },
          { key: 'scaleY', val: 1.05 - Math.random() * 0.1, prog: 0.7 },
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 0 },
          { key: 'filter', val: `contrast(${200 * glitchIntensity}%) brightness(${150 * glitchIntensity}%)`, prog: 0.5 },
          { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 1 },
        ],
      },
    });

    return baseEffects;
  });

  // Audio-reactive effects (if audio is provided)
  const audioEffects = audioSrc
    ? [
        {
          id: 'audio-reactive-glitch',
          componentId: 'waveform' as const,
          data: {
            audioSrc: audioSrc,
            audioProperty: 'bass' as const,
            effectType: 'shake' as const,
            intensity: 5 * glitchIntensity,
            shakeAxis: 'both' as const,
            sensitivity: 2,
            threshold: 0.3,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / 30,
            mode: 'provider' as const,
            targetIds: [mainTextId],
            start: 0,
            duration: duration,
            smoothNormalisation: 0.5,
          },
        },
      ]
    : [];

  // --- Component Tree ---

  const scanlineOverlay: RenderableComponentData = {
    id: scanlineOverlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.03) 0px, rgba(0, 255, 255, 0.03) 2px, transparent 2px, transparent 4px); z-index: 50;"></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const chromaticRedLayer: RenderableComponentData = {
    id: chromaticRedId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: 'JetBrains Mono',
        weights: ['700'],
        subsets: ['latin'],
        display: 'swap' as const,
        preload: true,
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        color: '#ff0000',
        textAlign: 'center' as const,
        position: 'absolute' as const,
        zIndex: 5,
        opacity: 0.7,
        mixBlendMode: 'screen' as const,
      },
      className: 'relative z-5',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const chromaticBlueLayer: RenderableComponentData = {
    id: chromaticBlueId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: 'JetBrains Mono',
        weights: ['700'],
        subsets: ['latin'],
        display: 'swap' as const,
        preload: true,
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        color: '#0000ff',
        textAlign: 'center' as const,
        position: 'absolute' as const,
        zIndex: 5,
        opacity: 0.7,
        mixBlendMode: 'screen' as const,
      },
      className: 'relative z-5',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const mainTextLayer: RenderableComponentData = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: 'JetBrains Mono',
        weights: ['700'],
        subsets: ['latin'],
        display: 'swap' as const,
        preload: true,
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        color: textColor,
        textAlign: 'center' as const,
        textShadow: `0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor, 0 0 80px currentColor`,
        position: 'relative' as const,
        zIndex: 10,
      },
      className: 'relative z-10',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center bg-black',
        style: {
          width: '100%',
          height: '100%',
          position: 'relative' as const,
          overflow: 'hidden' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [microVibrationEffect, ...glitchEffects, ...audioEffects],
    childrenData: [
      scanlineOverlay,
      chromaticRedLayer,
      chromaticBlueLayer,
      mainTextLayer,
    ] as RenderableComponentData[],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'cyberpunk-hologram-glitch-text',
  title: 'Cyberpunk Hologram Glitch Text',
  description:
    'Neon text flash preset inspired by cyberpunk hologram displays with malfunction effects. Features unstable holographic projections that flicker between color channels, experience signal interference, and reboot with bright flashes. Includes continuous electromagnetic interference vibration, periodic major glitch distortions, chromatic aberration separation, CRT scan lines, and phosphor burn-in aesthetics. Text appears as broken holographic projections with digital recalibration cycles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cyberpunk',
    'hologram',
    'glitch',
    'neon',
    'chromatic-aberration',
    'crt',
    'sci-fi',
    'tech',
    'digital',
    'malfunction',
  ],
  defaultInputParams: {
    text: 'CYBERPUNK',
    fontSize: 72,
    textColor: '#00ffff',
    duration: 10,
    glitchIntensity: 1,
  },
  dependencies: {},
};

// --- Export ---
export const cyberpunkHologramGlitchTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
