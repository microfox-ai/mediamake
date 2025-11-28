/**
 * Vaporwave VHS Typography Preset
 *
 * This preset creates a nostalgic vaporwave typography effect that simulates glitchy VHS recordings.
 * Features include:
 * - RGB channel separation (chromatic aberration) with pink/cyan color scheme
 * - Horizontal wave-like drift motion using sine wave patterns
 * - Subtle vertical jitter for tape-degraded character appearance
 * - Periodic tracking errors causing momentary distortion
 * - Scanline effects and static noise overlays
 * - Multi-layered text approach with blend modes
 * - Slow, hypnotic movements evoking late-night 90s TV broadcasts
 *
 * Use cases:
 * - Vaporwave aesthetic videos and music visualizers
 * - Retro 80s/90s themed content
 * - Nostalgic title sequences
 * - Artistic glitch effects
 * - VHS-style overlays and transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with vaporwave VHS effect'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Base font size in pixels'),
  font: z
    .string()
    .optional()
    .default('VT323')
    .describe(
      'Font family (monospace fonts work best for VHS aesthetic, e.g., "VT323", "Courier New")',
    ),
  wavePeriod: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Period of horizontal wave motion in seconds'),
  waveAmplitude: z
    .number()
    .min(5)
    .max(50)
    .default(15)
    .describe('Amplitude of horizontal wave drift in pixels'),
  jitterIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of vertical jitter in pixels'),
  chromaticOffset: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('RGB channel separation offset in pixels'),
  glitchFrequency: z
    .number()
    .min(4)
    .max(20)
    .default(8)
    .describe('Frequency of tracking error glitches in seconds'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Opacity of scanline overlay effect'),
  noiseOpacity: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Opacity of static noise overlay'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words for multi-layered approach
  const words = params.text.split(' ');

  // Helper function to create word layers
  const createWordLayers = (
    word: string,
    wordIndex: number,
  ): RenderableComponentData[] => {
    const wordId = `vaporwave-word-${wordIndex}`;
    const staggerDelay = wordIndex * 0.15; // Stagger word appearance

    // Cyan layer (left offset)
    const cyanLayer: RenderableComponentData = {
      id: `${wordId}-cyan`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          color: '#00FFFF',
          fontSize: params.fontSize,
          fontFamily: params.font,
          mixBlendMode: 'screen',
          filter: 'blur(0.5px)',
          willChange: 'transform',
          textShadow: '0 0 5px rgba(0, 255, 255, 0.5)',
        },
        font: {
          family: params.font || 'VT323',
          weights: ['400'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: staggerDelay,
          duration: params.duration - staggerDelay,
        },
      },
      effects: [],
    };

    // Magenta layer (right offset)
    const magentaLayer: RenderableComponentData = {
      id: `${wordId}-magenta`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          color: '#FF00FF',
          fontSize: params.fontSize,
          fontFamily: params.font,
          mixBlendMode: 'screen',
          filter: 'blur(0.5px)',
          willChange: 'transform',
          textShadow: '0 0 5px rgba(255, 0, 255, 0.5)',
        },
        font: {
          family: params.font || 'VT323',
          weights: ['400'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: staggerDelay,
          duration: params.duration - staggerDelay,
        },
      },
      effects: [],
    };

    // Base layer (white with glow)
    const baseLayer: RenderableComponentData = {
      id: `${wordId}-base`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          color: '#FFFFFF',
          fontSize: params.fontSize,
          fontFamily: params.font,
          filter: 'contrast(1.2)',
          willChange: 'transform',
          textShadow:
            '0 0 10px rgba(255, 0, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)',
          marginRight: wordIndex < words.length - 1 ? '0.3em' : '0',
        },
        font: {
          family: params.font || 'VT323',
          weights: ['400'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: staggerDelay,
          duration: params.duration - staggerDelay,
        },
      },
      effects: [],
    };

    // Word group container
    const wordGroup: RenderableComponentData = {
      id: `${wordId}-group`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {},
        },
      },
      context: {
        timing: {
          start: staggerDelay,
          duration: params.duration - staggerDelay,
        },
      },
      childrenData: [cyanLayer, magentaLayer, baseLayer] as RenderableComponentData[],
      effects: [],
    };

    // Create effects for this word group
    // 1. Wave drift effect (all layers together via group)
    const waveDrift: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: params.wavePeriod,
      mode: 'provider',
      targetIds: [`${wordId}-group`],
      ranges: [
        { key: 'translateX', val: -params.waveAmplitude, prog: 0 },
        { key: 'translateX', val: params.waveAmplitude, prog: 0.5 },
        { key: 'translateX', val: -params.waveAmplitude, prog: 1 },
      ],
    };

    // 2. Vertical jitter (steps for glitchy feel)
    const verticalJitter: GenericEffectData = {
      type: 'steps',
      start: 0,
      duration: 2,
      mode: 'provider',
      targetIds: [`${wordId}-group`],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: params.jitterIntensity, prog: 0.25 },
        { key: 'translateY', val: -params.jitterIntensity * 0.5, prog: 0.5 },
        { key: 'translateY', val: params.jitterIntensity * 0.5, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // 3. Chromatic aberration - cyan offset
    const cyanOffset: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: 4,
      mode: 'provider',
      targetIds: [`${wordId}-cyan`],
      ranges: [
        { key: 'translateX', val: -params.chromaticOffset, prog: 0 },
        { key: 'translateX', val: -params.chromaticOffset * 1.5, prog: 0.5 },
        { key: 'translateX', val: -params.chromaticOffset, prog: 1 },
      ],
    };

    // 4. Chromatic aberration - magenta offset
    const magentaOffset: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: 4,
      mode: 'provider',
      targetIds: [`${wordId}-magenta`],
      ranges: [
        { key: 'translateX', val: params.chromaticOffset, prog: 0 },
        { key: 'translateX', val: params.chromaticOffset * 1.5, prog: 0.5 },
        { key: 'translateX', val: params.chromaticOffset, prog: 1 },
      ],
    };

    // 5. Tracking error glitch (periodic distortion)
    const trackingError: GenericEffectData = {
      type: 'steps',
      start: 0,
      duration: params.glitchFrequency,
      mode: 'provider',
      targetIds: [`${wordId}-group`],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 0, prog: 0.85 },
        { key: 'translateX', val: 20, prog: 0.87 },
        { key: 'translateX', val: -15, prog: 0.89 },
        { key: 'translateX', val: 0, prog: 0.92 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    };

    // 6. Opacity pulse on base layer
    const opacityPulse: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: 6,
      mode: 'provider',
      targetIds: [`${wordId}-base`],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.85, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // 7. Fade in effect
    const fadeIn: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: 0.5,
      mode: 'provider',
      targetIds: [`${wordId}-group`],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Attach effects to word group
    wordGroup.effects = [
      { id: `${wordId}-wave`, componentId: 'generic', data: waveDrift },
      { id: `${wordId}-jitter`, componentId: 'generic', data: verticalJitter },
      { id: `${wordId}-cyan-offset`, componentId: 'generic', data: cyanOffset },
      {
        id: `${wordId}-magenta-offset`,
        componentId: 'generic',
        data: magentaOffset,
      },
      {
        id: `${wordId}-tracking`,
        componentId: 'generic',
        data: trackingError,
      },
      { id: `${wordId}-pulse`, componentId: 'generic', data: opacityPulse },
      { id: `${wordId}-fade`, componentId: 'generic', data: fadeIn },
    ];

    return [wordGroup];
  };

  // Create all word layers
  const allWordLayers = words.flatMap((word, index) =>
    createWordLayers(word, index),
  );

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'vaporwave-scanlines',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${params.scanlineOpacity}) 2px, rgba(0,0,0,${params.scanlineOpacity}) 4px)`,
        mixBlendMode: 'multiply',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Static noise overlay
  const staticNoiseOverlay: RenderableComponentData = {
    id: 'vaporwave-static',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        opacity: params.noiseOpacity,
        mixBlendMode: 'overlay',
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")',
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'vaporwave-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          gap: '0',
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: allWordLayers as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vaporwave-vhs-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full overflow-hidden bg-gradient-to-b from-purple-900/20 to-pink-900/20',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      textContainer,
      scanlineOverlay,
      staticNoiseOverlay,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vaporwaveVhsTypography',
  title: 'Vaporwave VHS Typography',
  description:
    'A nostalgic vaporwave typography preset that simulates glitchy VHS recordings with horizontal wave motion, RGB channel separation (chromatic aberration), vertical jitter, and periodic tracking errors. Features a pink/cyan color scheme achieved through layered text with blend modes, scanline overlays, and static noise. Animations are slow and hypnotic, evoking late-night 90s TV broadcasts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'vaporwave',
    'vhs',
    'glitch',
    'retro',
    '90s',
    'chromatic-aberration',
    'rgb-split',
    'scanlines',
    'nostalgic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'VAPORWAVE AESTHETIC',
    duration: 10,
    fontSize: 72,
    font: 'VT323',
    wavePeriod: 5,
    waveAmplitude: 15,
    jitterIntensity: 2,
    chromaticOffset: 4,
    glitchFrequency: 8,
    scanlineOpacity: 0.05,
    noiseOpacity: 0.05,
  },
};

// Export preset
export const vaporwaveVhsTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
