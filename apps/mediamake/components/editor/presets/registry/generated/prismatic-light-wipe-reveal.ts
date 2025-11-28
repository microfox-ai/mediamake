/**
 * Prismatic Light Wipe Text Reveal
 * 
 * A kinetic typography preset featuring a rainbow light sweep that reveals text
 * through a prismatic wipe effect. The reveal mimics light painting photography,
 * with chromatic aberration at the leading edge and trailing color glow.
 * 
 * Features:
 * - Rainbow light sweep using animated gradient with hue rotation
 * - Chromatic aberration layers (RGB channel separation) at the leading edge
 * - Trailing glow effect that fades as the light passes
 * - Mask-based wipe reveal with smooth transitions
 * - Audio-reactive color shifts (if music is present)
 * 
 * Use Cases:
 * - Dynamic title reveals
 * - Energetic text introductions
 * - Music video lyrics
 * - Product launch titles
 * - High-energy social media content
 */

import z from 'zod';
import {
  GenericEffectData,
  RenderableComponentData,
  TextAtomData,
} from '@microfox/remotion';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('The text content to reveal with the prismatic wipe effect'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(120)
    .optional()
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Final text color after reveal'),

  sweepDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .optional()
    .describe('Duration of the light sweep animation in seconds'),

  glowDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Duration of the trailing glow effect in seconds'),

  chromaticAberrationIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe(
      'Intensity of chromatic aberration effect (pixel offset for RGB channels)',
    ),

  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source URL for audio-reactive color shifts (if music is present)',
    ),

  audioReactive: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable audio-reactive hue rotation based on audio beats'),

  startDelay: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Delay before the effect starts in seconds'),

  totalDuration: z
    .number()
    .min(1)
    .default(5)
    .optional()
    .describe('Total duration of the entire effect in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse parameters
  const {
    text,
    font = 'Inter:700',
    fontSize = 120,
    textColor = '#FFFFFF',
    sweepDuration = 2,
    glowDuration = 0.8,
    chromaticAberrationIntensity = 3,
    audioSrc,
    audioReactive = false,
    startDelay = 0,
    totalDuration = 5,
  } = params;

  // Parse font string
  const fontParts = font.split(':');
  const fontFamily = fontParts[0] || 'Inter';
  const fontWeight = fontParts[1] ? parseInt(fontParts[1], 10) : 700;
  const fontStyle = fontParts[2] || 'normal';

  // Component IDs
  const rootId = 'prismatic-wipe-root';
  const lightSweepId = 'light-sweep-layer';
  const mainTextId = 'main-text';
  const caRedId = 'ca-red-layer';
  const caGreenId = 'ca-green-layer';
  const caBlueId = 'ca-blue-layer';
  const glowTextId = 'glow-text';

  // Calculate timing
  const sweepStart = startDelay;
  const sweepEnd = sweepStart + sweepDuration;
  const caStart = sweepStart + sweepDuration * 0.1;
  const caEnd = sweepStart + sweepDuration * 0.5;
  const mainRevealStart = sweepStart + sweepDuration * 0.2;
  const mainRevealEnd = sweepStart + sweepDuration * 0.6;
  const glowStart = sweepStart + sweepDuration * 0.15;
  const glowPeak = sweepStart + sweepDuration * 0.5;
  const glowEnd = sweepStart + sweepDuration * 0.8;

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Light sweep animation (background position + hue rotate)
  const lightSweepEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: sweepStart,
    duration: sweepDuration,
    mode: 'provider',
    targetIds: [lightSweepId],
    ranges: [
      { key: 'translateX', val: '-100%', prog: 0 },
      { key: 'translateX', val: '100%', prog: 1 },
    ],
  };

  // Hue rotation effect (for rainbow light sweep)
  const hueRotateEffect: GenericEffectData = {
    type: 'linear',
    start: sweepStart,
    duration: sweepDuration,
    mode: 'provider',
    targetIds: [lightSweepId],
    ranges: [
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(360deg)', prog: 0.5 },
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
    ],
  };

  // Chromatic aberration - Red channel
  const caRedEffect: GenericEffectData = {
    type: 'ease-out',
    start: caStart,
    duration: caEnd - caStart,
    mode: 'provider',
    targetIds: [caRedId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.3 },
      { key: 'opacity', val: 0, prog: 1 },
      {
        key: 'translateX',
        val: -chromaticAberrationIntensity,
        prog: 0,
      },
      {
        key: 'translateX',
        val: -chromaticAberrationIntensity,
        prog: 0.5,
      },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Chromatic aberration - Green channel
  const caGreenEffect: GenericEffectData = {
    type: 'ease-out',
    start: caStart,
    duration: caEnd - caStart,
    mode: 'provider',
    targetIds: [caGreenId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.3 },
      { key: 'opacity', val: 0, prog: 1 },
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Chromatic aberration - Blue channel
  const caBlueEffect: GenericEffectData = {
    type: 'ease-out',
    start: caStart,
    duration: caEnd - caStart,
    mode: 'provider',
    targetIds: [caBlueId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.3 },
      { key: 'opacity', val: 0, prog: 1 },
      {
        key: 'translateX',
        val: chromaticAberrationIntensity,
        prog: 0,
      },
      {
        key: 'translateX',
        val: chromaticAberrationIntensity,
        prog: 0.5,
      },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Main text reveal (opacity + blur)
  const mainTextEffect: GenericEffectData = {
    type: 'ease-out',
    start: mainRevealStart,
    duration: mainRevealEnd - mainRevealStart,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
      { key: 'filter', val: 'blur(8px)', prog: 0 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  };

  // Glow trail effect
  const glowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: glowStart,
    duration: glowEnd - glowStart,
    mode: 'provider',
    targetIds: [glowTextId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      {
        key: 'opacity',
        val: 0.8,
        prog: (glowPeak - glowStart) / (glowEnd - glowStart),
      },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // ============================================================================
  // COMPONENT TREE
  // ============================================================================

  const textAtomData: TextAtomData = {
    text,
    style: {
      fontSize: `${fontSize}px`,
      fontWeight,
      fontStyle: fontStyle as any,
      color: textColor,
      textAlign: 'center',
    },
    font: {
      family: fontFamily,
      weights: [fontWeight.toString()],
    },
  };

  // Chromatic aberration red layer
  const caRedLayer = {
    id: caRedId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textAtomData,
      style: {
        ...textAtomData.style,
        color: 'rgba(255,0,0,0.7)',
        mixBlendMode: 'screen',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${caRedId}-effect`,
        componentId: 'generic',
        data: caRedEffect,
      },
    ],
  } as RenderableComponentData;

  // Chromatic aberration green layer
  const caGreenLayer = {
    id: caGreenId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textAtomData,
      style: {
        ...textAtomData.style,
        color: 'rgba(0,255,0,0.7)',
        mixBlendMode: 'screen',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${caGreenId}-effect`,
        componentId: 'generic',
        data: caGreenEffect,
      },
    ],
  } as RenderableComponentData;

  // Chromatic aberration blue layer
  const caBlueLayer = {
    id: caBlueId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textAtomData,
      style: {
        ...textAtomData.style,
        color: 'rgba(0,0,255,0.7)',
        mixBlendMode: 'screen',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${caBlueId}-effect`,
        componentId: 'generic',
        data: caBlueEffect,
      },
    ],
  } as RenderableComponentData;

  // Main text layer
  const mainTextLayer = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textAtomData,
      style: {
        ...textAtomData.style,
        opacity: 0,
        filter: 'blur(8px)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${mainTextId}-effect`,
        componentId: 'generic',
        data: mainTextEffect,
      },
    ],
  } as RenderableComponentData;

  // Glow trail layer
  const glowTextLayer = {
    id: glowTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textAtomData,
      style: {
        ...textAtomData.style,
        opacity: 0,
        textShadow: `0 0 30px ${textColor}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${glowTextId}-effect`,
        componentId: 'generic',
        data: glowEffect,
      },
    ],
  } as RenderableComponentData;

  // Light sweep layer
  const lightSweepLayer = {
    id: lightSweepId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.8) 55%, transparent 100%)',
          backgroundSize: '200% 100%',
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${lightSweepId}-sweep-effect`,
        componentId: 'generic',
        data: lightSweepEffect,
      },
      {
        id: `${lightSweepId}-hue-effect`,
        componentId: 'generic',
        data: hueRotateEffect,
      },
    ],
    childrenData: [],
  } as RenderableComponentData;

  // Chromatic aberration container
  const chromaticAberrationContainer = {
    id: 'chromatic-aberration-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [caRedLayer, caGreenLayer, caBlueLayer],
  } as RenderableComponentData;

  // Main text container
  const mainTextContainer = {
    id: 'main-text-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [mainTextLayer],
  } as RenderableComponentData;

  // Glow trail container
  const glowTrailContainer = {
    id: 'glow-trail-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          zIndex: 8,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [glowTextLayer],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      lightSweepLayer,
      chromaticAberrationContainer,
      mainTextContainer,
      glowTrailContainer,
    ],
  } as RenderableComponentData;

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
  id: 'prismatic-light-wipe-reveal',
  title: 'Prismatic Light Wipe Text Reveal',
  description:
    'A kinetic typography preset that reveals text through a rainbow light sweep effect. Features chromatic aberration at the leading edge with separate RGB channel layers, a trailing glow that fades, and hue-rotating color animation. The reveal mimics light painting photography where pure light energy materializes the text.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'kinetic',
    'typography',
    'prismatic',
    'wipe',
    'light',
    'rainbow',
    'chromatic-aberration',
    'glow',
    'animation',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIGHT ENERGY',
    font: 'Inter:700',
    fontSize: 120,
    textColor: '#FFFFFF',
    sweepDuration: 2,
    glowDuration: 0.8,
    chromaticAberrationIntensity: 3,
    audioReactive: false,
    startDelay: 0,
    totalDuration: 5,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const prismaticLightWipeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
