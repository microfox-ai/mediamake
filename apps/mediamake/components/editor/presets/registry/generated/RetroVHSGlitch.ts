/**
 * Retro VHS Glitch Effect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * Creates vibrant, glitchy saturation effects reminiscent of VHS artifacts. Combines rapid
 * saturation spikes (0.5 to 3.0) with RGB channel separation using translateX on red/blue
 * channels. Adds scan line effects using repeating linear gradients. Includes random glitch
 * moments where saturation jumps to extreme values (4.0+) for single frames.
 *
 * Features:
 * - Dynamic saturation animation with glitch spikes
 * - RGB channel separation (chromatic aberration)
 * - Scanline overlay effect
 * - Random extreme glitch moments
 * - Configurable glitch intensity, channel separation, scanline opacity, and color bleed
 *
 * Use cases:
 * - Retro VHS aesthetic for videos and images
 * - Glitch art effects
 * - Nostalgic 80s/90s video effects
 * - Music video effects
 * - Social media content with retro vibes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of the components to apply the VHS glitch effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(5)
    .describe('Duration of the effect in seconds'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Frequency of extreme glitch spikes (0 = none, 1 = constant glitches)',
    ),
  channelSeparation: z
    .number()
    .default(2)
    .describe('Pixel offset for RGB channel split (chromatic aberration)'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of the scanline overlay effect (0-1)'),
  colorBleed: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Amount of color oversaturation and bleed effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    effectDuration,
    glitchIntensity,
    channelSeparation,
    scanlineOpacity,
    colorBleed,
  } = params;

  // Helper to generate random glitch frame times
  const generateGlitchFrames = (
    intensity: number,
    duration: number,
    fps: number = 30,
  ): number[] => {
    const totalFrames = Math.floor(duration * fps);
    const glitchCount = Math.floor(totalFrames * intensity);
    const glitchFrames: number[] = [];

    for (let i = 0; i < glitchCount; i++) {
      const randomFrame = Math.floor(Math.random() * totalFrames);
      const timeInSeconds = randomFrame / fps;
      glitchFrames.push(timeInSeconds);
    }

    return glitchFrames.sort((a, b) => a - b);
  };

  const glitchFrames = generateGlitchFrames(
    glitchIntensity,
    effectDuration,
    30,
  );

  const effects: any[] = [];

  // 1. Base Saturation Animation Effect (continuous cycling)
  const baseSaturationEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: 'saturate(0.5)', prog: 0 },
      { key: 'filter', val: 'saturate(3.0)', prog: 0.2 },
      { key: 'filter', val: 'saturate(1.0)', prog: 0.4 },
      { key: 'filter', val: 'saturate(2.5)', prog: 0.6 },
      { key: 'filter', val: 'saturate(0.8)', prog: 0.8 },
      { key: 'filter', val: 'saturate(0.5)', prog: 1 },
    ],
  };

  effects.push({
    id: `vhs-base-saturation-${targetIds.join('-')}`,
    componentId: 'generic',
    data: baseSaturationEffect,
  });

  // 2. RGB Channel Separation Effect (chromatic aberration)
  const rgbSeparationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: channelSeparation, prog: 0.25 },
      { key: 'translateX', val: -channelSeparation, prog: 0.5 },
      { key: 'translateX', val: channelSeparation * 0.5, prog: 0.75 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  effects.push({
    id: `vhs-rgb-separation-${targetIds.join('-')}`,
    componentId: 'generic',
    data: rgbSeparationEffect,
  });

  // 3. Color Bleed Effect (contrast and brightness boost)
  const colorBleedEffect: GenericEffectData = {
    type: 'ease-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      {
        key: 'filter',
        val: `contrast(${colorBleed * 0.4}) brightness(${colorBleed * 0.3})`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `contrast(${colorBleed * 0.5}) brightness(${colorBleed * 0.35})`,
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `vhs-color-bleed-${targetIds.join('-')}`,
    componentId: 'generic',
    data: colorBleedEffect,
  });

  // 4. Extreme Glitch Spike Effects (random single-frame spikes)
  glitchFrames.forEach((glitchTime, index) => {
    const glitchStart = effectStart + glitchTime;
    const frameDuration = 1 / 30; // Single frame at 30fps

    const extremeGlitchEffect: GenericEffectData = {
      type: 'linear',
      start: glitchStart,
      duration: frameDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        {
          key: 'filter',
          val: 'saturate(4.5) hue-rotate(20deg) brightness(1.2)',
          prog: 0,
        },
        {
          key: 'filter',
          val: 'saturate(4.5) hue-rotate(20deg) brightness(1.2)',
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `vhs-extreme-glitch-${index}-${targetIds.join('-')}`,
      componentId: 'generic',
      data: extremeGlitchEffect,
    });
  });

  // Container for scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'vhs-scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${scanlineOpacity}),
          rgba(0, 0, 0, ${scanlineOpacity}) 2px,
          transparent 2px,
          transparent 4px
        );
        opacity: ${scanlineOpacity};
        mix-blend-mode: multiply;
      "></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
  };

  return {
    output: {
      childrenData: [
        {
          id: 'vhs-glitch-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          context: {
            timing: {
              start: effectStart,
              duration: effectDuration,
            },
          },
          effects: effects,
          childrenData: [scanlineOverlay],
        } as RenderableComponentData,
      ],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'RetroVHSGlitch',
  title: 'Retro VHS Glitch Effect',
  description:
    'Creates vibrant, glitchy saturation effects reminiscent of VHS artifacts with RGB channel separation, scanlines, and random extreme glitch moments',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'vhs',
    'glitch',
    'retro',
    'saturation',
    'rgb-split',
    'scanline',
    'chromatic-aberration',
    'internal',
  ],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['target-component'],
    effectStart: 0,
    effectDuration: 5,
    glitchIntensity: 0.3,
    channelSeparation: 2,
    scanlineOpacity: 0.2,
    colorBleed: 2,
  },
};

export const RetroVHSGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
