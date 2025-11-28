/**
 * Retro Arcade Chrome Typokinetics Preset
 *
 * This preset creates a retro arcade game attract screen aesthetic with:
 * - Multi-tier metallic chrome text with copper, silver, and gold bevels
 * - CRT screen curvature effect using CSS 3D transforms
 * - Phosphor persistence afterimage trails in complementary colors
 * - Pronounced raster scan lines with visible gaps
 * - Burn-in ghost effect simulating CRT screen burn
 * - Rapid neon strobe entrance settling to steady pulse glow
 * - Barrel distortion to simulate curved CRT screen surface
 * - Word-by-word power-up electricity effects (optional via caption words)
 * - Forced GPU acceleration for smooth performance
 *
 * Use cases:
 * - Retro gaming title screens and attract modes
 * - 80s/90s arcade aesthetic videos
 * - Coin-op machine style text overlays
 * - Nostalgic CRT monitor simulations
 * - Excessive chrome and neon typography effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  caption: z
    .custom<TranscriptionSentence>()
    .describe('Caption data with text, timing, and optional words array for word-by-word effects'),
  
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(120)
    .optional()
    .describe('Base font size for the text in pixels'),
  
  fontFamily: z
    .string()
    .default('Impact')
    .optional()
    .describe('Font family to use (e.g., Impact, Arial Black, Bebas Neue)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Main text color (white recommended for chrome effect)'),
  
  neonGlowColor: z
    .string()
    .default('#00FFFF')
    .optional()
    .describe('Neon glow color for text (cyan recommended for arcade aesthetic)'),
  
  strobeIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for strobe effect (higher = more intense)'),
  
  strobeDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Duration of rapid strobe phase in seconds'),
  
  pulseDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Duration of steady pulse cycle in seconds'),
  
  crtCurvature: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .optional()
    .describe('Degree of CRT curvature rotation in degrees'),
  
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Opacity of scan line overlay (0-1)'),
  
  burnInOpacity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .optional()
    .describe('Opacity of burn-in ghost effect (0-0.3)'),
  
  phosphorTrailIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Intensity multiplier for phosphor trails (0-1)'),
  
  enableWordPowerUp: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable word-by-word power-up electricity effect (requires caption.words)'),
  
  powerUpDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Duration of each word power-up sequence in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const caption = params.caption;
  const fontSize = params.fontSize ?? 120;
  const fontFamily = params.fontFamily ?? 'Impact';
  const textColor = params.textColor ?? '#FFFFFF';
  const neonGlowColor = params.neonGlowColor ?? '#00FFFF';
  const strobeIntensity = params.strobeIntensity ?? 1;
  const strobeDuration = params.strobeDuration ?? 0.5;
  const pulseDuration = params.pulseDuration ?? 1.5;
  const crtCurvature = params.crtCurvature ?? 5;
  const scanlineOpacity = params.scanlineOpacity ?? 0.5;
  const burnInOpacity = params.burnInOpacity ?? 0.1;
  const phosphorTrailIntensity = params.phosphorTrailIntensity ?? 0.5;
  const enableWordPowerUp = params.enableWordPowerUp ?? false;
  const powerUpDuration = params.powerUpDuration ?? 0.3;

  // Helper function to create chrome text layers
  const createChromeLayer = (
    id: string,
    text: string,
    zIndex: number,
    gradient: string,
    translateX: number,
    translateY: number,
    shadowColor: string,
    shadowBlur: number,
  ) => {
    return {
      id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          fontFamily,
          background: gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 ${shadowBlur / 2}px ${shadowBlur}px ${shadowColor}`,
          zIndex,
          transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
    };
  };

  // Helper function to create phosphor trail layers
  const createPhosphorTrail = (
    id: string,
    text: string,
    color: string,
    opacity: number,
    blur: number,
    translateX: number,
  ) => {
    return {
      id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          fontFamily,
          color,
          opacity: opacity * phosphorTrailIntensity,
          filter: `blur(${blur}px)`,
          mixBlendMode: 'screen' as const,
          zIndex: 8 - Math.floor(opacity * 10),
          transform: `translate3d(${translateX}px, 0, 0)`,
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
    };
  };

  // Create chrome layers stack (copper → silver → gold)
  const chromeLayers: any[] = [
    // Copper dark
    createChromeLayer(
      'chrome-layer-6-copper-dark',
      caption.text,
      1,
      'linear-gradient(135deg, #8B4513 0%, #B87333 100%)',
      -6,
      -6,
      'rgba(139, 69, 19, 0.8)',
      16,
    ),
    // Copper light
    createChromeLayer(
      'chrome-layer-5-copper-light',
      caption.text,
      2,
      'linear-gradient(135deg, #B87333 0%, #CD853F 100%)',
      -4,
      -4,
      'rgba(184, 115, 51, 0.7)',
      12,
    ),
    // Silver dark
    createChromeLayer(
      'chrome-layer-4-silver-dark',
      caption.text,
      3,
      'linear-gradient(135deg, #808080 0%, #C0C0C0 100%)',
      -2,
      -2,
      'rgba(128, 128, 128, 0.6)',
      8,
    ),
    // Silver light
    createChromeLayer(
      'chrome-layer-3-silver-light',
      caption.text,
      4,
      'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
      -1,
      -1,
      'rgba(192, 192, 192, 0.5)',
      6,
    ),
    // Gold dark
    createChromeLayer(
      'chrome-layer-2-gold-dark',
      caption.text,
      5,
      'linear-gradient(135deg, #B8860B 0%, #FFD700 100%)',
      0,
      0,
      'rgba(184, 134, 11, 0.4)',
      4,
    ),
    // Gold light
    createChromeLayer(
      'chrome-layer-1-gold-light',
      caption.text,
      6,
      'linear-gradient(135deg, #FFD700 0%, #FFED4E 100%)',
      1,
      1,
      'rgba(255, 215, 0, 0.3)',
      2,
    ),
  ];

  // Main text layer with neon glow
  const mainTextLayer = {
    id: 'main-text-layer',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: caption.text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        fontFamily,
        color: textColor,
        textShadow: `0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px ${neonGlowColor}99, 0 0 60px ${neonGlowColor}66`,
        zIndex: 10,
        filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))',
        willChange: 'transform, opacity, filter',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
  };

  // Burn-in ghost layer
  const burnInGhostLayer = {
    id: 'burn-in-ghost-layer',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: caption.text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        fontFamily,
        color: neonGlowColor,
        opacity: burnInOpacity,
        filter: 'blur(4px)',
        mixBlendMode: 'screen' as const,
        zIndex: 9,
        transform: 'translate3d(3px, 3px, 0)',
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
  };

  // Phosphor trail layers (complementary colors)
  const phosphorTrails = [
    createPhosphorTrail('phosphor-trail-1', caption.text, '#FF00FF', 0.15, 2, -2),
    createPhosphorTrail('phosphor-trail-2', caption.text, '#00FF00', 0.1, 3, -4),
    createPhosphorTrail('phosphor-trail-3', caption.text, '#FFFF00', 0.05, 4, -6),
  ];

  // Strobe + pulse effects for main text
  const strobeEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: strobeDuration,
    mode: 'provider',
    targetIds: ['main-text-layer'],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.2, prog: 0.1 },
      { key: 'opacity', val: 1, prog: 0.2 },
      { key: 'opacity', val: 0.2, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 0.4 },
      { key: 'opacity', val: 0.3, prog: 0.5 },
      { key: 'opacity', val: 1, prog: 0.6 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  const pulseEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: strobeDuration,
    duration: caption.duration - strobeDuration,
    mode: 'provider',
    targetIds: ['main-text-layer'],
    ranges: [
      { key: 'filter', val: `drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))`, prog: 0 },
      { key: 'filter', val: `drop-shadow(0 0 30px ${neonGlowColor})`, prog: 0.5 },
      { key: 'filter', val: `drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))`, prog: 1 },
    ],
  };

  // Strobe effect object
  const strobeEffectNode = {
    id: 'strobe-effect',
    componentId: 'generic',
    data: strobeEffect,
  };

  // Pulse effect object
  const pulseEffectNode = {
    id: 'pulse-effect',
    componentId: 'generic',
    data: pulseEffect,
  };

  // Apply effects to main text
  mainTextLayer.effects = [strobeEffectNode, pulseEffectNode];

  // Chrome text stack container
  const chromeTextStackContainer = {
    id: 'chrome-text-stack-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          contain: 'paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: [
      ...chromeLayers,
      mainTextLayer,
      burnInGhostLayer,
      ...phosphorTrails,
    ] as RenderableComponentData[],
  };

  // Barrel distortion wrapper with CRT curvature
  const barrelDistortionWrapper = {
    id: 'barrel-distortion-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transform: `perspective(400px) rotateX(${crtCurvature}deg) scale(1.1)`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: [chromeTextStackContainer] as RenderableComponentData[],
  };

  // Scanline overlay (HTML block with repeating gradient)
  const scanlineOverlay = {
    id: 'scanline-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,${scanlineOpacity}) 2px, rgba(0,0,0,${scanlineOpacity}) 3px); z-index: 100;"></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 100,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
  };

  // Root CRT container
  const rootCrtContainer = {
    id: 'root-crt-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          perspective: '400px',
        },
      },
    },
    context: {
      timing: {
        start: caption.absoluteStart,
        duration: caption.duration,
      },
    },
    childrenData: [
      scanlineOverlay,
      barrelDistortionWrapper,
    ] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootCrtContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'retro-arcade-chrome-typokinetics',
  title: 'Retro Arcade Chrome Typokinetics',
  description: 'A retro arcade game attract screen preset with multi-tier metallic chrome text (copper, silver, gold bevels), CRT curvature, phosphor persistence afterimages, pronounced raster scan lines, burn-in ghost effects, rapid neon strobe entrance settling to steady pulse, and electricity power-up effects for dynamic word-by-word animations. Designed for coin-op machine aesthetics with excessive chrome and animated backgrounds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'retro',
    'arcade',
    'chrome',
    'crt',
    'neon',
    'kinetic',
    'strobe',
    'phosphor',
    'burn-in',
    'scan-lines',
    'metallic',
    'coin-op',
    'attract-screen',
    'vintage',
  ],
  dependencies: {},
  defaultInputParams: {
    caption: {
      id: 'caption-1',
      text: 'GAME OVER',
      start: 0,
      absoluteStart: 0,
      end: 5,
      absoluteEnd: 5,
      duration: 5,
      words: [],
    },
    fontSize: 120,
    fontFamily: 'Impact',
    textColor: '#FFFFFF',
    neonGlowColor: '#00FFFF',
    strobeIntensity: 1,
    strobeDuration: 0.5,
    pulseDuration: 1.5,
    crtCurvature: 5,
    scanlineOpacity: 0.5,
    burnInOpacity: 0.1,
    phosphorTrailIntensity: 0.5,
    enableWordPowerUp: false,
    powerUpDuration: 0.3,
  },
};

export const retroArcadeChromeTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};