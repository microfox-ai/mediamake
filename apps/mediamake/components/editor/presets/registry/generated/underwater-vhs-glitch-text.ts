/**
 * Underwater VHS Glitch Text Preset
 * 
 * A glitchy underwater text distortion preset that combines digital artifacts with fluid motion.
 * Simulates the aesthetic of dropping a VHS tape in water - text warps and distorts with both 
 * analog wave patterns and digital glitch effects.
 * 
 * Features:
 * - RGB channel separation with chromatic aberration effect
 * - VHS-style horizontal scanlines that pulse and fade
 * - Underwater wave distortions (smooth sinusoidal motion)
 * - Digital glitch micro-jitters (rapid translateX bursts with steps easing)
 * - Random skewX distortions for analog warping
 * - Blur filters during peak glitch moments
 * - Opacity pulsing on each RGB channel with phase offsets
 * - Underwater tint overlay for immersive effect
 * 
 * Use cases:
 * - Creating retro VHS aesthetic text
 * - Simulating corrupted video signals
 * - Adding glitchy underwater effects
 * - Building experimental typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z.string().describe('Text content to display with underwater VHS glitch effect'),
  fontSize: z.number().default(80).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').optional().describe('Font family (e.g., "Inter:700", "Roboto")'),
  duration: z.number().default(5).describe('Duration of the effect in seconds'),
  
  // Wave effect parameters
  waveAmplitude: z.number().default(10).describe('Amplitude of underwater wave motion in pixels (translateY)'),
  waveDuration: z.number().default(3).describe('Duration of one wave cycle in seconds'),
  
  // Glitch effect parameters
  glitchIntensity: z.number().min(0).max(30).default(15).describe('Maximum glitch displacement in pixels (translateX)'),
  glitchFrequency: z.number().min(0.05).max(0.5).default(0.1).describe('Duration of each glitch burst in seconds'),
  glitchBurstCount: z.number().min(5).max(30).default(15).describe('Number of glitch bursts during the effect'),
  
  // Distortion parameters
  skewIntensity: z.number().min(0).max(5).default(3).describe('Maximum skewX distortion in degrees'),
  blurAmount: z.number().min(0).max(3).default(0.5).describe('Blur filter amount during glitches in pixels'),
  
  // RGB channel separation
  rgbSeparation: z.number().min(0).max(10).default(3).describe('RGB channel offset in pixels'),
  rgbOpacityMin: z.number().min(0.5).max(1).default(0.8).describe('Minimum opacity for RGB channels'),
  
  // Scanline parameters
  scanlineOpacityMin: z.number().min(0).max(0.5).default(0.3).describe('Minimum scanline overlay opacity'),
  scanlineOpacityMax: z.number().min(0.5).max(1).default(0.8).describe('Maximum scanline overlay opacity'),
  
  // Underwater tint
  underwaterTint: z.string().default('rgba(0, 50, 80, 0.15)').describe('Underwater tint overlay color (CSS color string)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    duration,
    waveAmplitude,
    waveDuration,
    glitchIntensity,
    glitchFrequency,
    glitchBurstCount,
    skewIntensity,
    blurAmount,
    rgbSeparation,
    rgbOpacityMin,
    scanlineOpacityMin,
    scanlineOpacityMax,
    underwaterTint,
  } = params;

  // Parse font family
  const parseFontString = (fontString: string) => {
    if (!fontString.includes(':')) {
      return { family: fontString, weight: undefined, style: undefined };
    }
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] ? parseInt(parts[1], 10) : undefined,
      style: parts[2] as 'normal' | 'italic' | undefined,
    };
  };

  const font = parseFontString(fontFamily || 'Inter');
  const fontStyle: React.CSSProperties = {};
  if (font.weight) {
    fontStyle.fontWeight = font.weight;
  }
  if (font.style) {
    fontStyle.fontStyle = font.style;
  }

  // Generate random glitch burst timings
  const generateGlitchBursts = () => {
    const bursts: Array<{ start: number; translateX: number; skewX: number; blur: number }> = [];
    for (let i = 0; i < glitchBurstCount; i++) {
      const start = Math.random() * (duration - glitchFrequency);
      const translateX = Math.random() * glitchIntensity;
      const skewX = (Math.random() - 0.5) * 2 * skewIntensity;
      const blur = Math.random() * blurAmount;
      bursts.push({ start, translateX, skewX, blur });
    }
    return bursts.sort((a, b) => a.start - b.start);
  };

  const glitchBursts = generateGlitchBursts();

  // --- Create RGB Channel Text Atoms ---
  const redTextId = 'red-text';
  const greenTextId = 'green-text';
  const blueTextId = 'blue-text';

  const redText: RenderableComponentData = {
    id: redTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        color: 'rgba(255, 0, 0, 0.9)',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: font.family,
        ...(font.weight ? { weights: [font.weight.toString()] } : {}),
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const greenText: RenderableComponentData = {
    id: greenTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        color: 'rgba(0, 255, 0, 0.9)',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: font.family,
        ...(font.weight ? { weights: [font.weight.toString()] } : {}),
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const blueText: RenderableComponentData = {
    id: blueTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        color: 'rgba(0, 100, 255, 0.9)',
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: font.family,
        ...(font.weight ? { weights: [font.weight.toString()] } : {}),
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // --- Create Effects ---
  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  // Wave effect (smooth underwater motion) - applied to all channels
  const waveEffectRed: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [redTextId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -waveAmplitude, prog: 0.25 },
      { key: 'translateY', val: 0, prog: 0.5 },
      { key: 'translateY', val: waveAmplitude, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  const waveEffectGreen: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: waveDuration * 1.1,
    mode: 'provider',
    targetIds: [greenTextId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: waveAmplitude, prog: 0.25 },
      { key: 'translateY', val: 0, prog: 0.5 },
      { key: 'translateY', val: -waveAmplitude, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  const waveEffectBlue: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: waveDuration * 0.9,
    mode: 'provider',
    targetIds: [blueTextId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -waveAmplitude * 0.8, prog: 0.25 },
      { key: 'translateY', val: 0, prog: 0.5 },
      { key: 'translateY', val: waveAmplitude * 0.8, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  effects.push(
    { id: 'wave-red', componentId: 'generic', data: waveEffectRed },
    { id: 'wave-green', componentId: 'generic', data: waveEffectGreen },
    { id: 'wave-blue', componentId: 'generic', data: waveEffectBlue },
  );

  // RGB channel separation (chromatic aberration) - static offset
  const rgbOffsetRed: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [redTextId],
    ranges: [
      { key: 'translateX', val: -rgbSeparation, prog: 0 },
      { key: 'translateX', val: -rgbSeparation, prog: 1 },
    ],
  };

  const rgbOffsetBlue: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [blueTextId],
    ranges: [
      { key: 'translateX', val: rgbSeparation, prog: 0 },
      { key: 'translateX', val: rgbSeparation, prog: 1 },
    ],
  };

  effects.push(
    { id: 'rgb-offset-red', componentId: 'generic', data: rgbOffsetRed },
    { id: 'rgb-offset-blue', componentId: 'generic', data: rgbOffsetBlue },
  );

  // Opacity pulsing for each channel (phase-shifted)
  const opacityPulseRed: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [redTextId],
    ranges: [
      { key: 'opacity', val: rgbOpacityMin, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: rgbOpacityMin, prog: 1 },
    ],
  };

  const opacityPulseGreen: GenericEffectData = {
    type: 'ease-in-out',
    start: duration * 0.33,
    duration: duration * 0.67,
    mode: 'provider',
    targetIds: [greenTextId],
    ranges: [
      { key: 'opacity', val: rgbOpacityMin, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: rgbOpacityMin, prog: 1 },
    ],
  };

  const opacityPulseBlue: GenericEffectData = {
    type: 'ease-in-out',
    start: duration * 0.66,
    duration: duration * 0.34,
    mode: 'provider',
    targetIds: [blueTextId],
    ranges: [
      { key: 'opacity', val: rgbOpacityMin, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: rgbOpacityMin, prog: 1 },
    ],
  };

  effects.push(
    { id: 'opacity-red', componentId: 'generic', data: opacityPulseRed },
    { id: 'opacity-green', componentId: 'generic', data: opacityPulseGreen },
    { id: 'opacity-blue', componentId: 'generic', data: opacityPulseBlue },
  );

  // Glitch bursts (rapid translateX with steps easing + skewX + blur)
  glitchBursts.forEach((burst, index) => {
    const targetChannel = index % 3 === 0 ? redTextId : index % 3 === 1 ? greenTextId : blueTextId;

    const glitchEffect: GenericEffectData = {
      type: 'linear',
      start: burst.start,
      duration: glitchFrequency,
      mode: 'provider',
      targetIds: [targetChannel],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: burst.translateX, prog: 0.2 },
        { key: 'translateX', val: -burst.translateX * 0.5, prog: 0.4 },
        { key: 'translateX', val: burst.translateX * 0.3, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: burst.skewX, prog: 0.3 },
        { key: 'skewX', val: -burst.skewX * 0.5, prog: 0.6 },
        { key: 'skewX', val: 0, prog: 1 },
        { key: 'filter', val: `blur(0px)`, prog: 0 },
        { key: 'filter', val: `blur(${burst.blur}px)`, prog: 0.5 },
        { key: 'filter', val: `blur(0px)`, prog: 1 },
      ],
    };

    effects.push({
      id: `glitch-burst-${index}`,
      componentId: 'generic',
      data: glitchEffect,
    });
  });

  // --- Create RGB Channel Containers ---
  const redChannelLayer: RenderableComponentData = {
    id: 'red-channel-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [redText],
  };

  const greenChannelLayer: RenderableComponentData = {
    id: 'green-channel-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 2,
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [greenText],
  };

  const blueChannelLayer: RenderableComponentData = {
    id: 'blue-channel-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 3,
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [blueText],
  };

  // --- Create Scanline Overlay ---
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.15) 2px, rgba(0, 0, 0, 0.15) 4px)',
          backgroundSize: '100% 4px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // Scanline opacity animation
  const scanlineOpacityEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: ['scanline-overlay'],
    ranges: [
      { key: 'opacity', val: scanlineOpacityMin, prog: 0 },
      { key: 'opacity', val: scanlineOpacityMax, prog: 0.3 },
      { key: 'opacity', val: scanlineOpacityMin, prog: 0.6 },
      { key: 'opacity', val: scanlineOpacityMax, prog: 1 },
    ],
  };

  effects.push({
    id: 'scanline-opacity',
    componentId: 'generic',
    data: scanlineOpacityEffect,
  });

  // --- Create Underwater Tint Overlay ---
  const underwaterTintOverlay: RenderableComponentData = {
    id: 'underwater-tint-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundColor: underwaterTint,
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'underwater-glitch-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects,
    childrenData: [
      underwaterTintOverlay,
      redChannelLayer,
      greenChannelLayer,
      blueChannelLayer,
      scanlineOverlay,
    ],
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
  id: 'underwater-vhs-glitch-text',
  title: 'Underwater VHS Glitch Text',
  description:
    'A glitchy underwater text distortion preset combining digital artifacts with fluid motion. Features RGB channel separation with chromatic aberration, VHS-style scanlines, underwater wave distortions, and digital glitch micro-jitters. The text warps with analog wave patterns while experiencing rapid digital corruption effects, simulating a VHS tape dropped in water.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'underwater',
    'vhs',
    'distortion',
    'chromatic-aberration',
    'scanline',
    'retro',
    'rgb-split',
    'wave',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH WAVE',
    fontSize: 80,
    fontFamily: 'Inter:700',
    duration: 5,
    waveAmplitude: 10,
    waveDuration: 3,
    glitchIntensity: 15,
    glitchFrequency: 0.1,
    glitchBurstCount: 15,
    skewIntensity: 3,
    blurAmount: 0.5,
    rgbSeparation: 3,
    rgbOpacityMin: 0.8,
    scanlineOpacityMin: 0.3,
    scanlineOpacityMax: 0.8,
    underwaterTint: 'rgba(0, 50, 80, 0.15)',
  },
};

// --- Export Preset ---
export const underwaterVhsGlitchTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
