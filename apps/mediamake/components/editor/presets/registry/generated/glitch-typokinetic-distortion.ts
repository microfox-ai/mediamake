/**
 * Glitch Typokinetic Distortion Preset
 * 
 * A glitch-inspired typokinetic preset where text scales from 90% to 100% through
 * digital distortion effects. Words don't smoothly scale but flicker through corrupted
 * states with data corruption frames (scale jumps to 1.1, 0.85, etc.), RGB channel
 * splitting (red/blue channels offset by ±2px), position jumps, and digital noise texture
 * during scale transitions.
 * 
 * Perfect for tech-themed content, gaming videos, or cyberpunk aesthetics.
 * 
 * Features:
 * - Data corruption frames with random scale keyframes [0.9, 1.1, 0.85, 1.05, 1.0]
 * - RGB channel splitting with chromatic aberration (±2-3px offsets)
 * - Random position jumps during glitch moments
 * - Hue rotation with random values during corruption
 * - Digital noise texture overlay that pulses during transitions
 * - Instant transitions between frames (linear interpolation for jarring effect)
 * - GPU-accelerated filters for performance
 * - Main animation 0.5 seconds with 2-3 glitch moments
 * 
 * Use cases:
 * - Tech product launches and gaming content
 * - Cyberpunk and sci-fi themed videos
 * - Digital art showcases
 * - Glitch art and experimental videos
 * - Social media content with edgy aesthetics
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().describe('Text content to display with glitch effects'),
  fontSize: z.string().default('48px').describe('Font size (e.g., "48px", "64px")'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter", "Roboto")'),
  textColor: z.string().default('#ffffff').describe('Base text color (hex or rgba)'),
  duration: z.number().default(3).describe('Total duration of the composition in seconds'),
  glitchDuration: z.number().default(0.5).describe('Duration of the main glitch animation in seconds'),
  glitchIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity multiplier for glitch effects (0.5-2)'),
  noiseOpacity: z.number().min(0).max(1).default(0.5).describe('Maximum opacity of noise overlay during glitch (0-1)'),
  rgbSplitIntensity: z.number().min(1).max(5).default(2).describe('RGB channel split offset in pixels (1-5)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    duration,
    glitchDuration,
    glitchIntensity,
    noiseOpacity,
    rgbSplitIntensity,
  } = params;

  // Helper function: Generate SVG noise texture as base64 data URL
  const generateNoiseSvg = (): string => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="a"><feTurbulence baseFrequency=".75" stitchTiles="stitch" type="fractalNoise"/><feColorMatrix type="saturate" values="0"/></filter><path d="M0 0h300v300H0z" filter="url(#a)" opacity=".05"/></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // 1. Noise overlay (pulses during glitch moments)
  childrenData.push({
    id: 'noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url('${generateNoiseSvg()}'); background-repeat: repeat; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        opacity: 0,
        mixBlendMode: 'overlay',
        zIndex: 10,
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
        id: 'noise-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: glitchDuration,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: noiseOpacity * 0.8 * glitchIntensity, prog: 0.2 },
            { key: 'opacity', val: 0, prog: 0.25 },
            { key: 'opacity', val: noiseOpacity * glitchIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.55 },
            { key: 'opacity', val: noiseOpacity * 0.6 * glitchIntensity, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 2. Text glitch wrapper container
  const textGlitchWrapper: RenderableComponentData = {
    id: 'text-glitch-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // 3. Main text (white) with glitch effects
  const mainTextEffects = [
    // Glitch scale effect with corruption frames
    {
      id: 'glitch-scale-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: ['text-main'],
        ranges: [
          { key: 'scaleX', val: 0.9, prog: 0 },
          { key: 'scaleY', val: 0.9, prog: 0 },
          { key: 'scaleX', val: 1.1 * glitchIntensity, prog: 0.2 },
          { key: 'scaleY', val: 1.1 * glitchIntensity, prog: 0.2 },
          { key: 'scaleX', val: 0.85, prog: 0.4 },
          { key: 'scaleY', val: 0.85, prog: 0.4 },
          { key: 'scaleX', val: 1.05 * glitchIntensity, prog: 0.6 },
          { key: 'scaleY', val: 1.05 * glitchIntensity, prog: 0.6 },
          { key: 'scaleX', val: 0.95, prog: 0.8 },
          { key: 'scaleY', val: 0.95, prog: 0.8 },
          { key: 'scaleX', val: 1, prog: 1 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      },
    },
    // Position jumps during glitch
    {
      id: 'glitch-position-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: ['text-main'],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateX', val: 5 * glitchIntensity, prog: 0.15 },
          { key: 'translateY', val: -3 * glitchIntensity, prog: 0.15 },
          { key: 'translateX', val: -4 * glitchIntensity, prog: 0.35 },
          { key: 'translateY', val: 2 * glitchIntensity, prog: 0.35 },
          { key: 'translateX', val: 3 * glitchIntensity, prog: 0.55 },
          { key: 'translateY', val: -1 * glitchIntensity, prog: 0.55 },
          { key: 'translateX', val: -2 * glitchIntensity, prog: 0.75 },
          { key: 'translateY', val: 1 * glitchIntensity, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    },
    // Hue rotation for color corruption
    {
      id: 'glitch-hue-rotate-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: ['text-main'],
        ranges: [
          { key: 'filter:hue-rotate', val: 0, prog: 0 },
          { key: 'filter:hue-rotate', val: 45 * glitchIntensity, prog: 0.25 },
          { key: 'filter:hue-rotate', val: -30 * glitchIntensity, prog: 0.5 },
          { key: 'filter:hue-rotate', val: 20 * glitchIntensity, prog: 0.75 },
          { key: 'filter:hue-rotate', val: 0, prog: 1 },
        ],
      },
    },
  ];

  textGlitchWrapper.childrenData!.push({
    id: 'text-main',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: '700',
        color: textColor,
        textAlign: 'center',
        userSelect: 'none',
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
        duration: duration,
      },
    },
    effects: mainTextEffects,
  } as RenderableComponentData);

  // 4. Red channel (RGB split effect)
  const redChannelEffects = [
    {
      id: 'red-channel-glitch-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: ['text-red-channel'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8 * glitchIntensity, prog: 0.2 },
          { key: 'translateX', val: rgbSplitIntensity, prog: 0.2 },
          { key: 'opacity', val: 0, prog: 0.25 },
          { key: 'translateX', val: rgbSplitIntensity, prog: 0.25 },
          { key: 'opacity', val: 0.7 * glitchIntensity, prog: 0.5 },
          { key: 'translateX', val: rgbSplitIntensity * 1.5, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 0.55 },
          { key: 'translateX', val: rgbSplitIntensity * 1.5, prog: 0.55 },
          { key: 'opacity', val: 0.6 * glitchIntensity, prog: 0.8 },
          { key: 'translateX', val: rgbSplitIntensity, prog: 0.8 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    },
  ];

  textGlitchWrapper.childrenData!.push({
    id: 'text-red-channel',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: '700',
        color: '#ff0000',
        textAlign: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0,
        mixBlendMode: 'screen',
        userSelect: 'none',
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
        duration: duration,
      },
    },
    effects: redChannelEffects,
  } as RenderableComponentData);

  // 5. Cyan channel (RGB split effect)
  const cyanChannelEffects = [
    {
      id: 'cyan-channel-glitch-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: ['text-cyan-channel'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8 * glitchIntensity, prog: 0.2 },
          { key: 'translateX', val: -rgbSplitIntensity, prog: 0.2 },
          { key: 'opacity', val: 0, prog: 0.25 },
          { key: 'translateX', val: -rgbSplitIntensity, prog: 0.25 },
          { key: 'opacity', val: 0.7 * glitchIntensity, prog: 0.5 },
          { key: 'translateX', val: -rgbSplitIntensity * 1.5, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 0.55 },
          { key: 'translateX', val: -rgbSplitIntensity * 1.5, prog: 0.55 },
          { key: 'opacity', val: 0.6 * glitchIntensity, prog: 0.8 },
          { key: 'translateX', val: -rgbSplitIntensity, prog: 0.8 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    },
  ];

  textGlitchWrapper.childrenData!.push({
    id: 'text-cyan-channel',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: '700',
        color: '#00ffff',
        textAlign: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0,
        mixBlendMode: 'screen',
        userSelect: 'none',
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
        duration: duration,
      },
    },
    effects: cyanChannelEffects,
  } as RenderableComponentData);

  // Add text glitch wrapper to children
  childrenData.push(textGlitchWrapper);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-typokinetic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          position: 'relative',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData,
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
  id: 'glitch-typokinetic-distortion',
  title: 'Glitch Typokinetic Distortion',
  description: 'A glitch-inspired typokinetic preset where text scales from 90% to 100% through digital distortion with data corruption frames, RGB channel splitting, position jumps, and digital noise texture. Perfect for tech-themed content, gaming videos, or cyberpunk aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'glitch', 'typokinetic', 'distortion', 'rgb-split', 'cyberpunk', 'tech', 'gaming', 'kinetic-typography'],
  defaultInputParams: {
    text: 'GLITCH',
    fontSize: '64px',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    duration: 3,
    glitchDuration: 0.5,
    glitchIntensity: 1,
    noiseOpacity: 0.5,
    rgbSplitIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchTypokineticDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};