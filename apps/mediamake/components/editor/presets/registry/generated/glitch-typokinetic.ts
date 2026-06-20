/**
 * Glitch Typokinetic Preset
 *
 * A cyberpunk-inspired glitch text effect featuring:
 * - RGB split shadow layers (red, cyan, blue) with independent erratic movements
 * - Main text with chromatic aberration text-shadow effects
 * - Micro-glitches: brief opacity flickers and position jitters
 * - Digital drop shadow that flickers and shifts like a broken hologram
 * - Text assembles from corrupted data with initial fade-in and scale
 * - Optimized with CSS containment for performance
 *
 * Technical Details:
 * - Multiple shadow layers with mix-blend-mode: 'screen' for RGB splitting
 * - Generic effects with strategic keyframes (80% stable, 20% glitching)
 * - Step-like movements for digital feel using linear interpolation
 * - Shadow glitches: translateX/Y between -3px and 3px
 * - Text micro-glitches: translateX/Y within ±2px range, opacity 0.85-1
 * - Initial assembly effect: 0.8s ease-out fade-in with slight scale
 *
 * Use cases:
 * - Tech content and gaming titles
 * - Futuristic themed captions
 * - Cyberpunk-style edits
 * - Digital corruption aesthetic
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with glitch effect'),
  duration: z
    .number()
    .min(0.1)
    .default(5)
    .describe('Duration of the text display in seconds'),
  fontSize: z
    .string()
    .default('48px')
    .describe('Font size (e.g., "48px", "3rem")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "900")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Main text color (hex or rgba)'),
  letterSpacing: z
    .string()
    .default('0.05em')
    .describe('Letter spacing for the text'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Glitch effect intensity multiplier (0.1 - 3.0)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    letterSpacing,
    glitchIntensity,
  } = params;

  // Generate unique IDs
  const rootId = 'glitch-root-container';
  const shadowContainerId = 'shadow-container';
  const shadowRedId = 'shadow-red';
  const shadowCyanId = 'shadow-cyan';
  const shadowBlueId = 'shadow-blue';
  const mainTextId = 'main-text';

  // Calculate scaled values based on intensity
  const shadowGlitchAmount = 3 * glitchIntensity;
  const textMicroGlitchAmount = 2 * glitchIntensity;

  // Shadow Red - Horizontal glitch effect
  const shadowRedEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [shadowRedId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: -shadowGlitchAmount, prog: 0.15 },
      { key: 'translateX', val: 0, prog: 0.2 },
      { key: 'translateX', val: shadowGlitchAmount, prog: 0.35 },
      { key: 'translateX', val: 0, prog: 0.4 },
      { key: 'translateX', val: -shadowGlitchAmount * 0.67, prog: 0.6 },
      { key: 'translateX', val: 0, prog: 0.65 },
      { key: 'translateX', val: shadowGlitchAmount * 0.67, prog: 0.85 },
      { key: 'translateX', val: 0, prog: 0.9 },
    ],
  };

  // Shadow Cyan - Vertical glitch effect
  const shadowCyanEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [shadowCyanId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: shadowGlitchAmount, prog: 0.1 },
      { key: 'translateY', val: 0, prog: 0.15 },
      { key: 'translateY', val: -shadowGlitchAmount * 0.67, prog: 0.3 },
      { key: 'translateY', val: 0, prog: 0.35 },
      { key: 'translateY', val: shadowGlitchAmount * 0.67, prog: 0.55 },
      { key: 'translateY', val: 0, prog: 0.6 },
      { key: 'translateY', val: -shadowGlitchAmount, prog: 0.8 },
      { key: 'translateY', val: 0, prog: 0.85 },
    ],
  };

  // Shadow Blue - Diagonal glitch effect
  const shadowBlueEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [shadowBlueId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateX', val: shadowGlitchAmount * 0.67, prog: 0.12 },
      { key: 'translateY', val: -shadowGlitchAmount * 0.67, prog: 0.12 },
      { key: 'translateX', val: 0, prog: 0.17 },
      { key: 'translateY', val: 0, prog: 0.17 },
      { key: 'translateX', val: -shadowGlitchAmount, prog: 0.42 },
      { key: 'translateY', val: shadowGlitchAmount, prog: 0.42 },
      { key: 'translateX', val: 0, prog: 0.47 },
      { key: 'translateY', val: 0, prog: 0.47 },
      { key: 'translateX', val: shadowGlitchAmount * 0.67, prog: 0.72 },
      { key: 'translateY', val: -shadowGlitchAmount * 0.33, prog: 0.72 },
      { key: 'translateX', val: 0, prog: 0.77 },
      { key: 'translateY', val: 0, prog: 0.77 },
    ],
  };

  // Main text micro-glitch effect
  const mainTextMicroGlitchEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'translateX', val: textMicroGlitchAmount, prog: 0.18 },
      { key: 'translateY', val: -textMicroGlitchAmount * 0.5, prog: 0.18 },
      { key: 'opacity', val: 0.85, prog: 0.18 },
      { key: 'translateX', val: 0, prog: 0.2 },
      { key: 'translateY', val: 0, prog: 0.2 },
      { key: 'opacity', val: 1, prog: 0.2 },
      { key: 'translateX', val: -textMicroGlitchAmount * 0.5, prog: 0.38 },
      { key: 'translateY', val: textMicroGlitchAmount, prog: 0.38 },
      { key: 'opacity', val: 0.9, prog: 0.38 },
      { key: 'translateX', val: 0, prog: 0.4 },
      { key: 'translateY', val: 0, prog: 0.4 },
      { key: 'opacity', val: 1, prog: 0.4 },
      { key: 'translateX', val: textMicroGlitchAmount * 0.5, prog: 0.62 },
      { key: 'translateY', val: -textMicroGlitchAmount, prog: 0.62 },
      { key: 'opacity', val: 0.88, prog: 0.62 },
      { key: 'translateX', val: 0, prog: 0.64 },
      { key: 'translateY', val: 0, prog: 0.64 },
      { key: 'opacity', val: 1, prog: 0.64 },
      { key: 'translateX', val: -textMicroGlitchAmount, prog: 0.87 },
      { key: 'translateY', val: textMicroGlitchAmount * 0.5, prog: 0.87 },
      { key: 'opacity', val: 0.92, prog: 0.87 },
      { key: 'translateX', val: 0, prog: 0.89 },
      { key: 'translateY', val: 0, prog: 0.89 },
      { key: 'opacity', val: 1, prog: 0.89 },
    ],
  };

  // Main text initial assembly effect (fade-in with scale)
  const mainTextAssembleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: 0.8,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
      { key: 'scale', val: 0.95, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Build component tree
  const shadowRed = {
    id: shadowRedId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute',
      style: {
        color: '#ff0000',
        fontSize: fontSize,
        fontWeight: fontWeight,
        opacity: 0.3,
        mixBlendMode: 'screen',
        textShadow: '2px 0px 0px rgba(255,0,0,0.5)',
      },
      font: {
        family: fontFamily,
        weights: ['700', '900'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'shadow-red-glitch',
        componentId: 'generic',
        data: shadowRedEffect,
      },
    ],
  } as RenderableComponentData;

  const shadowCyan = {
    id: shadowCyanId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute',
      style: {
        color: '#00ffff',
        fontSize: fontSize,
        fontWeight: fontWeight,
        opacity: 0.3,
        mixBlendMode: 'screen',
        textShadow: '0px 2px 0px rgba(0,255,255,0.5)',
      },
      font: {
        family: fontFamily,
        weights: ['700', '900'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'shadow-cyan-glitch',
        componentId: 'generic',
        data: shadowCyanEffect,
      },
    ],
  } as RenderableComponentData;

  const shadowBlue = {
    id: shadowBlueId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute',
      style: {
        color: '#0000ff',
        fontSize: fontSize,
        fontWeight: fontWeight,
        opacity: 0.3,
        mixBlendMode: 'screen',
        textShadow: '-1px -1px 0px rgba(0,0,255,0.5)',
      },
      font: {
        family: fontFamily,
        weights: ['700', '900'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'shadow-blue-glitch',
        componentId: 'generic',
        data: shadowBlueEffect,
      },
    ],
  } as RenderableComponentData;

  const mainText = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'relative',
      style: {
        color: textColor,
        fontSize: fontSize,
        fontWeight: fontWeight,
        textShadow:
          '2px 0px 0px rgba(255,0,0,0.5), -2px 0px 0px rgba(0,255,255,0.5), 0px 2px 0px rgba(0,0,255,0.3)',
        letterSpacing: letterSpacing,
      },
      font: {
        family: fontFamily,
        weights: ['700', '900'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'main-text-micro-glitch',
        componentId: 'generic',
        data: mainTextMicroGlitchEffect,
      },
      {
        id: 'main-text-assemble',
        componentId: 'generic',
        data: mainTextAssembleEffect,
      },
    ],
  } as RenderableComponentData;

  const shadowContainer = {
    id: shadowContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [shadowRed, shadowCyan, shadowBlue, mainText],
  } as RenderableComponentData;

  const rootContainer = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-black flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [shadowContainer],
  } as RenderableComponentData;

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
  id: 'glitch-typokinetic',
  title: 'Glitch Typokinetic Preset',
  description:
    'A cyberpunk-inspired typokinetic preset featuring text with digital drop shadows that flicker and split into RGB components. Text assembles from corrupted data with micro-glitches including opacity flickers and position jitters. Perfect for tech content, gaming titles, or futuristic themed captions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'cyberpunk',
    'typokinetic',
    'rgb-split',
    'chromatic-aberration',
    'digital',
    'futuristic',
    'tech',
    'gaming',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH TEXT',
    duration: 5,
    fontSize: '48px',
    fontFamily: 'Inter',
    fontWeight: 'bold',
    textColor: '#ffffff',
    letterSpacing: '0.05em',
    glitchIntensity: 1,
  },
};

// Export preset
export const glitchTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
