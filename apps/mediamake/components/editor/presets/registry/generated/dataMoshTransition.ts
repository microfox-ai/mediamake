/**
 * Data Mosh Transition Internal Effect
 *
 * ARRAY OF EFFECTS
 *
 * This internal effect preset simulates video compression artifacts and data moshing techniques.
 * It creates temporal echoes where previous frames blend with current ones through pixelated masks,
 * implements motion vector corruption with blocky 16x16 macroblocks, color channel separation,
 * block artifacts, and temporal smearing.
 *
 * Features:
 * - Macroblock-based motion corruption (16x16 pixel blocks with transform distortions)
 * - Temporal echo layers (frame blending simulation)
 * - RGB channel separation (chromatic aberration effect)
 * - Compression artifacts (contrast, saturation, blur filters)
 * - Multiple mosh patterns: spiral, random, wave
 *
 * Returns:
 * An array of effects including macroblock corruption, temporal echo, channel separation,
 * and compression artifact effects.
 *
 * Use cases:
 * - Creating glitch art transitions
 * - Simulating corrupted video streams
 * - Adding digital artifacts to media
 * - Creating VHS/analog glitch aesthetics
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the data mosh effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(2)
    .describe('Duration of the data mosh transition in seconds'),
  compressionLevel: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of compression artifacts (0 = none, 1 = extreme)'),
  temporalEcho: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Strength of frame blending/temporal echo effect (0 = none, 1 = strong)'),
  macroblockSize: z
    .number()
    .default(16)
    .describe('Size of compression macroblocks in pixels (typically 16)'),
  moshPattern: z
    .enum(['spiral', 'random', 'wave'])
    .default('random')
    .describe('Pattern of macroblock corruption (spiral, random, or wave)'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs to ensure uniqueness'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    effectDuration,
    compressionLevel,
    temporalEcho,
    macroblockSize,
    moshPattern,
    effectIdPrefix = 'dataMosh',
  } = params;

  const effects: any[] = [];

  // Helper: Generate macroblock offset based on pattern
  const generateMoshOffset = (index: number, total: number, pattern: string): string => {
    const maxOffset = compressionLevel * 50; // Max offset in pixels
    
    switch (pattern) {
      case 'spiral':
        const angle = (index / total) * Math.PI * 4;
        const radius = (index / total) * maxOffset;
        return `translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
      
      case 'wave':
        const waveX = Math.sin((index / total) * Math.PI * 2) * maxOffset;
        const waveY = Math.cos((index / total) * Math.PI * 2) * maxOffset * 0.5;
        return `translate(${waveX}px, ${waveY}px)`;
      
      case 'random':
      default:
        const randomX = (Math.random() - 0.5) * maxOffset * 2;
        const randomY = (Math.random() - 0.5) * maxOffset * 2;
        return `translate(${randomX}px, ${randomY}px)`;
    }
  };

  // Calculate number of macroblocks (approximate grid based on 1920x1080 reference)
  const gridCols = Math.ceil(1920 / macroblockSize);
  const gridRows = Math.ceil(1080 / macroblockSize);
  const totalBlocks = gridCols * gridRows;

  // 1. Macroblock Corruption Effects
  // Apply stepped transform animations to simulate motion vector corruption
  targetIds.forEach((targetId, targetIndex) => {
    // Create macroblock corruption with stepped easing
    const macroblockEffect: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Start position
        { key: 'transform', val: 'translate(0, 0)', prog: 0 },
        // Mid corruption - generate offset based on pattern
        { 
          key: 'transform', 
          val: generateMoshOffset(targetIndex, targetIds.length, moshPattern), 
          prog: 0.3 
        },
        // Peak corruption
        { 
          key: 'transform', 
          val: generateMoshOffset(targetIndex + 1, targetIds.length, moshPattern), 
          prog: 0.5 
        },
        // Return to normal
        { key: 'transform', val: 'translate(0, 0)', prog: 0.7 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-macroblock-${targetId}`,
      componentId: 'generic',
      data: macroblockEffect,
    });
  });

  // 2. Compression Artifacts Effect
  // Apply filter-based artifacts (contrast, saturation, blur)
  const artifactIntensity = compressionLevel * 2; // Scale intensity
  const blurAmount = Math.floor(compressionLevel * 4); // 0-4px blur
  
  targetIds.forEach((targetId) => {
    const compressionEffect: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Normal state
        { key: 'filter', val: 'none', prog: 0 },
        // Peak artifacts (at 30% through transition)
        { 
          key: 'filter', 
          val: `contrast(${1 + artifactIntensity}) saturate(${Math.max(0.3, 1 - compressionLevel)}) blur(${blurAmount}px)`, 
          prog: 0.3 
        },
        // Secondary artifacts
        { 
          key: 'filter', 
          val: `contrast(${1 + artifactIntensity * 0.5}) saturate(${0.7}) blur(${Math.ceil(blurAmount / 2)}px)`, 
          prog: 0.5 
        },
        // Return to normal (by 80%)
        { key: 'filter', val: 'none', prog: 0.8 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-compression-${targetId}`,
      componentId: 'generic',
      data: compressionEffect,
    });
  });

  // 3. Temporal Echo Effect
  // Simulate frame blending with opacity pulses
  if (temporalEcho > 0.1) {
    targetIds.forEach((targetId) => {
      const echoEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Normal opacity
          { key: 'opacity', val: 1, prog: 0 },
          // Temporal echo dip
          { key: 'opacity', val: Math.max(0.3, 1 - temporalEcho * 0.7), prog: 0.25 },
          // Recovery
          { key: 'opacity', val: Math.max(0.5, 1 - temporalEcho * 0.5), prog: 0.4 },
          // Secondary dip
          { key: 'opacity', val: Math.max(0.4, 1 - temporalEcho * 0.6), prog: 0.6 },
          // Return to normal
          { key: 'opacity', val: 1, prog: 0.85 },
        ],
      };

      effects.push({
        id: `${effectIdPrefix}-temporal-echo-${targetId}`,
        componentId: 'generic',
        data: echoEffect,
      });
    });
  }

  // 4. RGB Channel Separation (Chromatic Aberration)
  // Simulate color channel misalignment
  const channelOffset = compressionLevel * 8; // Max 8px offset
  
  targetIds.forEach((targetId) => {
    // Red channel shift
    const redChannelEffect: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'none', prog: 0 },
        { 
          key: 'filter', 
          val: `drop-shadow(${channelOffset}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${channelOffset}px 0 0 rgba(0,255,255,0.3))`, 
          prog: 0.4 
        },
        { 
          key: 'filter', 
          val: `drop-shadow(${channelOffset * 0.5}px 0 0 rgba(255,0,0,0.3))`, 
          prog: 0.6 
        },
        { key: 'filter', val: 'none', prog: 0.85 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-rgb-separation-${targetId}`,
      componentId: 'generic',
      data: redChannelEffect,
    });
  });

  // 5. Scanline / Block Artifacts
  // Add horizontal scanline distortion
  targetIds.forEach((targetId) => {
    const scanlineEffect: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Normal
        { key: 'transform', val: 'scaleY(1)', prog: 0 },
        // Vertical compression
        { key: 'transform', val: `scaleY(${1 - compressionLevel * 0.1})`, prog: 0.35 },
        // Overshoot
        { key: 'transform', val: `scaleY(${1 + compressionLevel * 0.05})`, prog: 0.5 },
        // Return
        { key: 'transform', val: 'scaleY(1)', prog: 0.7 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-scanline-${targetId}`,
      componentId: 'generic',
      data: scanlineEffect,
    });
  });

  // Return container with all effects
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-effect-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration + effectStart,
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
  id: 'dataMoshTransition',
  title: 'Data Mosh Transition',
  description:
    'Internal effect that simulates video compression artifacts and data moshing techniques with temporal echoes, macroblock corruption, and RGB channel separation',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'glitch', 'datamosh', 'compression', 'artifacts', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 2,
    compressionLevel: 0.5,
    temporalEcho: 0.6,
    macroblockSize: 16,
    moshPattern: 'random',
  },
  dependencies: {},
};

export const dataMoshTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};