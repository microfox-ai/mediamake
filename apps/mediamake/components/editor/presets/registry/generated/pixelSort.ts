/**
 * Pixel Sort Glitch Effect Preset
 *
 * This internal effect preset simulates horizontal pixel sorting glitches common in datamoshing aesthetics.
 * It creates horizontal distortion bands that stretch and compress at different rates, mimicking corrupted
 * data processing rather than smooth animation.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple effect objects representing different "bands" of pixel sorting distortion.
 * Each band has staggered start times and irregular timing segments to create a glitchy, corrupted feel.
 *
 * Features:
 * - **Multiple Distortion Bands**: Create horizontal bands with independent timing and distortion
 * - **ScaleX Stretching**: Simulate horizontal pixel stretching (1 to sortIntensity)
 * - **TranslateX Displacement**: Move pixels left/right or alternate directions
 * - **SkewX Distortion**: Add additional angular distortion for enhanced glitch effect
 * - **Opacity Flickers**: Brief opacity drops to simulate data corruption
 * - **Chromatic Aberration**: Optional RGB channel separation for color distortion
 * - **Irregular Timing**: Non-linear prog values and mixed easing for corrupted data aesthetics
 *
 * Use cases:
 * - Datamoshing effects for video transitions
 * - Glitch aesthetics for tech/cyberpunk content
 * - Corrupted data visualization effects
 * - Creative distortion for music videos or experimental content
 *
 * Advanced Usage:
 * Apply to multiple target components to create layered glitch effects.
 * Adjust sortIntensity and bandCount based on desired intensity.
 * Use chromaAberration for enhanced visual impact.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, BaseEffect } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply pixel sort glitch effect to'),
  start: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  duration: z.number().describe('Duration of the effect in seconds'),
  sortIntensity: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Stretch factor for pixel sorting (1 = minimal, 5 = extreme)'),
  bandCount: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of horizontal distortion bands'),
  direction: z
    .enum(['left', 'right', 'alternate'])
    .default('right')
    .describe('Direction of pixel displacement'),
  chromaAberration: z
    .boolean()
    .default(false)
    .describe('Enable RGB channel separation for color distortion'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    start,
    duration,
    sortIntensity,
    bandCount,
    direction,
    chromaAberration,
  } = params;

  const effects: BaseEffect[] = [];

  // Helper function to generate band effects
  const createBandEffect = (
    bandIndex: number,
    totalBands: number,
  ): BaseEffect => {
    const bandId = `pixel-sort-band-${bandIndex}`;
    
    // Stagger start times for bands
    const staggerFactor = bandIndex / totalBands;
    const bandStart = start + duration * staggerFactor * 0.15;
    
    // Vary duration slightly for irregular feel
    const durationVariation = bandIndex % 2 === 0 ? 1.0 : 0.8;
    const bandDuration = duration * durationVariation;

    // Determine direction for this band
    let translateDirection = 1; // 1 = right, -1 = left
    if (direction === 'left') {
      translateDirection = -1;
    } else if (direction === 'alternate') {
      translateDirection = bandIndex % 2 === 0 ? 1 : -1;
    }

    // Create irregular timing segments with different prog values
    // Band 1: [0, 0.2, 0.4, 0.6, 1]
    // Band 2: [0.1, 0.3, 0.5, 0.7, 0.9]
    // Band 3: [0.2, 0.35, 0.5, 0.8, 1]
    const progOffsets = [
      [0, 0.2, 0.4, 0.6, 1.0],
      [0.1, 0.3, 0.5, 0.7, 0.9],
      [0.2, 0.35, 0.5, 0.8, 1.0],
      [0.05, 0.25, 0.45, 0.65, 0.95],
      [0.15, 0.35, 0.55, 0.75, 1.0],
    ];
    const progs = progOffsets[bandIndex % progOffsets.length];

    // Vary intensity per band
    const intensityMultiplier = [1.0, 0.8, 1.3, 0.7, 1.2][
      bandIndex % 5
    ];
    const bandIntensity = sortIntensity * intensityMultiplier;

    const effectData: GenericEffectData = {
      type: bandIndex % 2 === 0 ? 'linear' : 'ease-in-out', // Mix easing types for irregular feel
      start: bandStart,
      duration: bandDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // ScaleX: oscillate between 1 and sortIntensity
        { key: 'scaleX', val: 1, prog: progs[0] },
        { key: 'scaleX', val: bandIntensity, prog: progs[1] },
        { key: 'scaleX', val: 1, prog: progs[2] },
        { key: 'scaleX', val: bandIntensity * 0.6, prog: progs[3] },
        { key: 'scaleX', val: 1, prog: progs[4] },

        // TranslateX: move based on direction
        { key: 'translateX', val: 0, prog: progs[0] },
        {
          key: 'translateX',
          val: translateDirection * 50,
          prog: progs[1],
        },
        { key: 'translateX', val: 0, prog: progs[2] },
        {
          key: 'translateX',
          val: translateDirection * 30,
          prog: progs[3],
        },
        { key: 'translateX', val: 0, prog: progs[4] },

        // SkewX: add angular distortion
        { key: 'skewX', val: 0, prog: progs[0] },
        { key: 'skewX', val: 5 * translateDirection, prog: progs[1] },
        { key: 'skewX', val: -3 * translateDirection, prog: progs[2] },
        { key: 'skewX', val: 2 * translateDirection, prog: progs[3] },
        { key: 'skewX', val: 0, prog: progs[4] },

        // Opacity: brief flickers
        { key: 'opacity', val: 1, prog: progs[0] },
        { key: 'opacity', val: 0.85, prog: progs[0] + 0.05 },
        { key: 'opacity', val: 1, prog: progs[1] },
        { key: 'opacity', val: 0.9, prog: progs[2] + 0.05 },
        { key: 'opacity', val: 1, prog: progs[3] },
      ],
    };

    return {
      id: bandId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Generate band effects
  for (let i = 0; i < bandCount; i++) {
    effects.push(createBandEffect(i, bandCount));
  }

  // Add chromatic aberration effects if enabled
  if (chromaAberration) {
    // Red channel shift (left)
    const redShiftEffect: BaseEffect = {
      id: 'pixel-sort-chroma-red',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: start,
        duration: duration,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          {
            key: 'filter',
            val: 'drop-shadow(-2px 0px 0px rgba(255, 0, 0, 0.6))',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'drop-shadow(-3px 0px 0px rgba(255, 0, 0, 0.8))',
            prog: 0.25,
          },
          {
            key: 'filter',
            val: 'drop-shadow(-2px 0px 0px rgba(255, 0, 0, 0.6))',
            prog: 0.5,
          },
          {
            key: 'filter',
            val: 'drop-shadow(-4px 0px 0px rgba(255, 0, 0, 0.7))',
            prog: 0.75,
          },
          {
            key: 'filter',
            val: 'drop-shadow(-2px 0px 0px rgba(255, 0, 0, 0.5))',
            prog: 1,
          },
        ],
      } as GenericEffectData,
    };

    // Blue channel shift (right)
    const blueShiftEffect: BaseEffect = {
      id: 'pixel-sort-chroma-blue',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: start,
        duration: duration,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          {
            key: 'filter',
            val: 'drop-shadow(2px 0px 0px rgba(0, 0, 255, 0.6))',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'drop-shadow(3px 0px 0px rgba(0, 0, 255, 0.8))',
            prog: 0.25,
          },
          {
            key: 'filter',
            val: 'drop-shadow(2px 0px 0px rgba(0, 0, 255, 0.6))',
            prog: 0.5,
          },
          {
            key: 'filter',
            val: 'drop-shadow(4px 0px 0px rgba(0, 0, 255, 0.7))',
            prog: 0.75,
          },
          {
            key: 'filter',
            val: 'drop-shadow(2px 0px 0px rgba(0, 0, 255, 0.5))',
            prog: 1,
          },
        ],
      } as GenericEffectData,
    };

    effects.push(redShiftEffect, blueShiftEffect);
  }

  // Return effects in container structure
  const rootContainer: RenderableComponentData = {
    id: 'pixel-sort-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: duration + start,
      },
    },
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
  id: 'pixelSort',
  title: 'Pixel Sort Glitch Effect',
  description:
    'Internal effect preset that simulates horizontal pixel sorting glitches using transform-based distortions. Creates horizontal bands with scaleX stretching, translateX displacement, and optional chromatic aberration for datamoshing aesthetics.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'glitch',
    'datamoshing',
    'pixel-sort',
    'distortion',
    'chromatic-aberration',
    'internal',
    'generic',
  ],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    start: 0,
    duration: 3,
    sortIntensity: 2.5,
    bandCount: 3,
    direction: 'right',
    chromaAberration: false,
  },
};

export const pixelSortPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
