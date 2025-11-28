/**
 * Digital Corruption Wave Effect
 *
 * An internal effects-only preset that simulates data corruption spreading across elements like a wave.
 * Creates horizontal scanline distortion bands that move vertically through targeted content with
 * pixelation, color artifacts, and glitch effects. Each scanline has random jitter, hue shifts, and
 * varying intensity.
 *
 * Features:
 * - Multiple corruption bands (scanlines) traversing vertically through content
 * - Each scanline uses animated clip-path to create horizontal wave effect
 * - Filter effects: pixelation, hue-rotate, brightness for corruption artifacts
 * - Staggered timing for cascading wave effect
 * - Customizable corruption intensity, wave speed, and scanline count
 * - Glitch color artifacts via hue rotation
 *
 * Use Cases:
 * - Failing digital transmission effects
 * - Corrupted video codec simulation
 * - Data glitch transitions
 * - Cyberpunk/tech aesthetic overlays
 * - Error state visualizations
 *
 * Returns: ARRAY OF EFFECTS (one per scanline)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  waveSpeed: z
    .number()
    .default(2)
    .describe('Duration for a single scanline to traverse the full element (seconds)'),
  corruptionIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of corruption effects (0 = minimal, 1 = maximum)'),
  scanlineCount: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(8)
    .describe('Number of corruption scanlines/bands'),
  glitchColors: z
    .array(z.string())
    .default(['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00'])
    .describe('Array of hex colors for hue-rotate artifacts'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('IDs of components to apply corruption wave to'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random jitter value for corruption
  const randomJitter = (intensity: number): number => {
    return (Math.random() - 0.5) * intensity * 10; // ±5px at max intensity
  };

  // Helper function: Convert hex color to hue rotation degree
  const hexToHueRotate = (hex: string): number => {
    // Simple hash-based hue rotation (not true color conversion, but provides variety)
    const hash = hex
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 360);
  };

  // Build scanline effects array
  const scanlineEffects: any[] = [];
  
  const {
    waveSpeed,
    corruptionIntensity,
    scanlineCount,
    glitchColors,
    targetIds,
  } = params;

  // Calculate stagger delay between scanlines
  const staggerDelay = 0.1; // 100ms between each scanline start

  for (let i = 0; i < scanlineCount; i++) {
    const scanlineId = `corruption-scanline-${i}`;
    const startTime = i * staggerDelay;

    // Random intensity variation per scanline
    const intensityVariation = 0.7 + (Math.random() * 0.3); // 0.7 to 1.0
    const effectiveIntensity = corruptionIntensity * intensityVariation;

    // Random color artifact for this scanline
    const colorIndex = i % glitchColors.length;
    const hueRotation = hexToHueRotate(glitchColors[colorIndex]);

    // Pixelation intensity (higher corruption = more pixelation)
    const pixelSize = Math.floor(2 + (effectiveIntensity * 8)); // 2px to 10px

    // Brightness variation (corruption causes brightness fluctuations)
    const brightnessMin = 0.8 - (effectiveIntensity * 0.3); // 0.5 to 0.8
    const brightnessMax = 1.2 + (effectiveIntensity * 0.3); // 1.2 to 1.5

    // Jitter amount for this scanline
    const jitterX = randomJitter(effectiveIntensity);

    // Build animation ranges for this scanline
    const ranges: any[] = [
      // Clip-path animation: traverse from bottom to top
      { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 }, // Start at bottom (fully clipped)
      { key: 'clipPath', val: 'inset(0 0 100% 0)', prog: 1 },  // End at top (fully clipped)

      // Filter: Pixelation simulation via blur + contrast
      {
        key: 'filter',
        val: `blur(0px) contrast(1) brightness(1) hue-rotate(0deg)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `blur(${pixelSize}px) contrast(${1.5 + effectiveIntensity}) brightness(${brightnessMax}) hue-rotate(${hueRotation * 0.5}deg)`,
        prog: 0.3,
      },
      {
        key: 'filter',
        val: `blur(${pixelSize * 0.5}px) contrast(${1.3}) brightness(${brightnessMin}) hue-rotate(${hueRotation}deg)`,
        prog: 0.6,
      },
      {
        key: 'filter',
        val: `blur(0px) contrast(1) brightness(1) hue-rotate(0deg)`,
        prog: 1,
      },

      // Horizontal jitter (translateX)
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: jitterX, prog: 0.2 },
      { key: 'translateX', val: -jitterX * 0.5, prog: 0.5 },
      { key: 'translateX', val: jitterX * 0.3, prog: 0.7 },
      { key: 'translateX', val: 0, prog: 1 },

      // Opacity variation (scanline flicker)
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.7 + (effectiveIntensity * 0.3), prog: 0.3 },
      { key: 'opacity', val: 1, prog: 0.6 },
      { key: 'opacity', val: 0.8, prog: 0.9 },
      { key: 'opacity', val: 1, prog: 1 },
    ];

    // Create effect data for this scanline
    const effectData: GenericEffectData = {
      type: 'linear', // Linear progression for consistent wave movement
      start: startTime,
      duration: waveSpeed,
      mode: 'provider',
      targetIds: targetIds,
      ranges: ranges,
    };

    // Create effect node
    const effect = {
      id: scanlineId,
      componentId: 'generic',
      data: effectData,
    };

    scanlineEffects.push(effect);
  }

  // Return effects array via container structure
  // System will extract effects via _internalPresetOutput: 'effects'
  const rootContainer = {
    id: 'digitalCorruptionWave-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          overflow: 'hidden',
        },
      },
    },
    effects: scanlineEffects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: waveSpeed + (scanlineCount * staggerDelay), // Total duration
      },
    },
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'digitalCorruptionWave',
  title: 'Digital Corruption Wave Effect',
  description:
    'An internal effects-only preset that simulates data corruption spreading across elements like a wave. Creates horizontal scanline distortion bands that move vertically through targeted content with pixelation, color artifacts, and glitch effects. Each scanline has random jitter, hue shifts, and varying intensity. Returns an effects array to apply to external components - no visual structure rendered. Parameters: waveSpeed (traverse duration), corruptionIntensity (0-1 strength), scanlineCount (number of bands), glitchColors (artifact hex colors), targetIds (components to corrupt).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'corruption', 'wave', 'scanline', 'distortion', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    waveSpeed: 2,
    corruptionIntensity: 0.7,
    scanlineCount: 8,
    glitchColors: ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00'],
    targetIds: ['target-component'],
  },
};

// Export preset
export const digitalCorruptionWavePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
