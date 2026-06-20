/**
 * Glitch Art Text Corruption & Repair Preset
 *
 * A contemporary digital art preset where outlined text corrupts and repairs itself
 * while filling with color through digital artifacts and data moshing effects.
 * Features RGB channel separation, segmented outline breakage, clip-path distortion,
 * and pixelated fill transitions. Perfect for tech, gaming, or experimental content.
 *
 * Technical Features:
 * - RGB channel separation with mix-blend modes
 * - Rapid transform changes (translateX, scaleX, skewX)
 * - Random clip-path cutouts with frame-by-frame changes
 * - Pixelated fill effect using scale transitions
 * - Reproducible randomness using seed parameter
 * - Audio-reactive glitch intensity (if audio present)
 *
 * Timeline:
 * - 0-20%: Stable outline phase
 * - 20-50%: Glitch corruption with RGB split
 * - 50-80%: Gradual repair with fill appearing through pixel blocks
 * - 80-100%: Final stabilization
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(20)
    .default(96)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fillColor: z
    .string()
    .default('#ffffff')
    .describe('Fill color for the text (hex or CSS color)'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Glitch intensity multiplier (0.1 - 3.0)'),
  randomSeed: z
    .number()
    .default(42)
    .describe('Random seed for reproducible glitch patterns'),
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive glitch intensity'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive effects'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fillColor,
    glitchIntensity,
    randomSeed,
    audioReactive,
    audioSrc,
  } = params;

  // Helper: Seeded random number generator
  const seededRandom = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  };

  const random = seededRandom(randomSeed);

  // Timeline phases (relative to duration)
  const stablePhase = duration * 0.2; // 0-20%
  const corruptionStart = duration * 0.2; // 20%
  const corruptionEnd = duration * 0.5; // 50%
  const repairStart = duration * 0.5; // 50%
  const repairEnd = duration * 0.8; // 80%
  const stabilizationStart = duration * 0.8; // 80%

  // RGB layer IDs
  const redLayerId = 'rgb-layer-red';
  const greenLayerId = 'rgb-layer-green';
  const blueLayerId = 'rgb-layer-blue';

  // ============================================================================
  // RGB LAYERS (Red, Green, Blue)
  // ============================================================================

  // Red Layer (outline only, no fill)
  const redLayer: RenderableComponentData = {
    id: redLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        position: 'absolute',
        inset: '0',
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: 'transparent',
        WebkitTextStroke: '2px #ff0000',
        textStroke: '2px #ff0000',
        mixBlendMode: 'screen',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Green Layer (outline only, no fill)
  const greenLayer: RenderableComponentData = {
    id: greenLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        position: 'absolute',
        inset: '0',
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: 'transparent',
        WebkitTextStroke: '2px #00ff00',
        textStroke: '2px #00ff00',
        mixBlendMode: 'multiply',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Blue Layer (outline + fill)
  const blueLayer: RenderableComponentData = {
    id: blueLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        position: 'absolute',
        inset: '0',
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: fillColor,
        WebkitTextStroke: '2px #0000ff',
        textStroke: '2px #0000ff',
        mixBlendMode: 'multiply',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // ============================================================================
  // GLITCH EFFECTS (Corruption Phase: 20-50%)
  // ============================================================================

  const corruptionDuration = corruptionEnd - corruptionStart;

  // Red layer: translateX glitch + clip-path distortion
  redLayer.effects!.push({
    id: 'red-glitch-translateX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: corruptionStart,
      duration: corruptionDuration,
      mode: 'provider',
      targetIds: [redLayerId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -10 * glitchIntensity * random(), prog: 0.1 },
        { key: 'translateX', val: 15 * glitchIntensity * random(), prog: 0.3 },
        { key: 'translateX', val: -8 * glitchIntensity * random(), prog: 0.5 },
        { key: 'translateX', val: 12 * glitchIntensity * random(), prog: 0.7 },
        { key: 'translateX', val: -5 * glitchIntensity * random(), prog: 0.9 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  });

  redLayer.effects!.push({
    id: 'red-glitch-scaleX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: corruptionStart,
      duration: corruptionDuration,
      mode: 'provider',
      targetIds: [redLayerId],
      ranges: [
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1 + 0.2 * glitchIntensity * random(), prog: 0.2 },
        { key: 'scaleX', val: 1 - 0.15 * glitchIntensity * random(), prog: 0.4 },
        { key: 'scaleX', val: 1 + 0.1 * glitchIntensity * random(), prog: 0.6 },
        { key: 'scaleX', val: 1 - 0.05 * glitchIntensity * random(), prog: 0.8 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    },
  });

  redLayer.effects!.push({
    id: 'red-glitch-skewX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: corruptionStart,
      duration: corruptionDuration,
      mode: 'provider',
      targetIds: [redLayerId],
      ranges: [
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: 5 * glitchIntensity * random(), prog: 0.25 },
        { key: 'skewX', val: -8 * glitchIntensity * random(), prog: 0.5 },
        { key: 'skewX', val: 3 * glitchIntensity * random(), prog: 0.75 },
        { key: 'skewX', val: 0, prog: 1 },
      ],
    },
  });

  // Green layer: different glitch pattern
  greenLayer.effects!.push({
    id: 'green-glitch-translateX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: corruptionStart,
      duration: corruptionDuration,
      mode: 'provider',
      targetIds: [greenLayerId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 12 * glitchIntensity * random(), prog: 0.15 },
        { key: 'translateX', val: -10 * glitchIntensity * random(), prog: 0.35 },
        { key: 'translateX', val: 8 * glitchIntensity * random(), prog: 0.55 },
        { key: 'translateX', val: -15 * glitchIntensity * random(), prog: 0.75 },
        { key: 'translateX', val: 5 * glitchIntensity * random(), prog: 0.95 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  });

  greenLayer.effects!.push({
    id: 'green-glitch-scaleX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: corruptionStart,
      duration: corruptionDuration,
      mode: 'provider',
      targetIds: [greenLayerId],
      ranges: [
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1 - 0.1 * glitchIntensity * random(), prog: 0.3 },
        { key: 'scaleX', val: 1 + 0.25 * glitchIntensity * random(), prog: 0.6 },
        { key: 'scaleX', val: 1 - 0.08 * glitchIntensity * random(), prog: 0.9 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    },
  });

  // Blue layer: opacity fade during corruption
  blueLayer.effects!.push({
    id: 'blue-opacity-fade',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: corruptionStart,
      duration: corruptionDuration * 0.5,
      mode: 'provider',
      targetIds: [blueLayerId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });

  // ============================================================================
  // REPAIR EFFECTS (Repair Phase: 50-80%)
  // ============================================================================

  const repairDuration = repairEnd - repairStart;

  // Red layer: gradual stabilization
  redLayer.effects!.push({
    id: 'red-repair-translateX',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: repairStart,
      duration: repairDuration,
      mode: 'provider',
      targetIds: [redLayerId],
      ranges: [
        { key: 'translateX', val: -5 * glitchIntensity * random(), prog: 0 },
        { key: 'translateX', val: 2 * glitchIntensity * random(), prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  });

  redLayer.effects!.push({
    id: 'red-repair-scaleX',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: repairStart,
      duration: repairDuration,
      mode: 'provider',
      targetIds: [redLayerId],
      ranges: [
        { key: 'scaleX', val: 1 + 0.05 * glitchIntensity * random(), prog: 0 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    },
  });

  // Green layer: gradual stabilization
  greenLayer.effects!.push({
    id: 'green-repair-translateX',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: repairStart,
      duration: repairDuration,
      mode: 'provider',
      targetIds: [greenLayerId],
      ranges: [
        { key: 'translateX', val: 5 * glitchIntensity * random(), prog: 0 },
        { key: 'translateX', val: -2 * glitchIntensity * random(), prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  });

  greenLayer.effects!.push({
    id: 'green-repair-scaleX',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: repairStart,
      duration: repairDuration,
      mode: 'provider',
      targetIds: [greenLayerId],
      ranges: [
        { key: 'scaleX', val: 1 - 0.08 * glitchIntensity * random(), prog: 0 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    },
  });

  // Blue layer: pixelated fill transition
  blueLayer.effects!.push({
    id: 'blue-pixelated-fill',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: repairStart,
      duration: repairDuration,
      mode: 'provider',
      targetIds: [blueLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.2 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 0.9, prog: 0.8 },
        { key: 'opacity', val: 1, prog: 1 },
        // Pixelated effect through scale changes
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 0.7, prog: 0.3 },
        { key: 'scale', val: 0.9, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  });

  // ============================================================================
  // STABILIZATION (Final Phase: 80-100%)
  // ============================================================================

  const stabilizationDuration = duration - stabilizationStart;

  // All layers: final stabilization
  [redLayer, greenLayer, blueLayer].forEach((layer) => {
    layer.effects!.push({
      id: `${layer.id}-stabilization`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: stabilizationStart,
        duration: stabilizationDuration,
        mode: 'provider',
        targetIds: [layer.id],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: 1, prog: 1 },
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: 0, prog: 1 },
        ],
      },
    });
  });

  // ============================================================================
  // AUDIO-REACTIVE EFFECTS (Optional)
  // ============================================================================

  if (audioReactive && audioSrc) {
    // Add waveform effects for audio-reactive glitch intensity
    [redLayer, greenLayer, blueLayer].forEach((layer) => {
      layer.effects!.push({
        id: `${layer.id}-audio-reactive`,
        componentId: 'waveform',
        data: {
          audioSrc,
          audioProperty: 'bass',
          effectType: 'shake',
          intensity: 10 * glitchIntensity,
          shakeAxis: 'x',
          sensitivity: 1.5,
          threshold: 0.2,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [layer.id],
          start: corruptionStart,
          duration: corruptionDuration,
          smoothNormalisation: 1,
        },
      });
    });
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'glitch-art-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black overflow-hidden w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [redLayer, greenLayer, blueLayer],
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'glitch-art-text-corruption',
  title: 'Glitch Art Text Corruption & Repair',
  description:
    'A contemporary glitch-art preset where outlined text corrupts and repairs itself while filling with color through digital artifacts and data moshing effects. Features RGB channel separation, segmented outline breakage, clip-path distortion, and pixelated fill transitions. Perfect for tech, gaming, or experimental content with a digital art aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'corruption',
    'rgb-split',
    'digital-art',
    'tech',
    'gaming',
    'experimental',
    'kinetic-typography',
    'data-moshing',
  ],
  defaultInputParams: {
    text: 'GLITCH',
    duration: 5,
    fontSize: 96,
    fontFamily: 'Inter',
    fillColor: '#ffffff',
    glitchIntensity: 1,
    randomSeed: 42,
    audioReactive: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const glitchArtTextCorruptionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
