/**
 * 70s Concert Poster Fish-Eye Typography Preset
 *
 * This preset creates kinetic typography inspired by 70s psychedelic concert posters
 * with fish-eye lens warping effects. Words appear to bulge and warp as if printed on
 * an inflating bubble, with thick multi-layered dripping text shadows in retro colors.
 *
 * Features:
 * - **Vortex Entry Animation**: Words zoom in from tiny point with 720° spiral rotation
 * - **Fish-Eye Warping**: Continuous 3D rotateX/Y oscillation creating convex lens bulge
 * - **Psychedelic Outlines**: Multiple text shadows offset at different angles (dripping effect)
 * - **Pulsing Scale**: Breathing effect synchronized with warping
 * - **Hue-Rotate Filter**: Animated color shifting for psychedelic feel
 * - **Retro Typography**: Uses Righteous font for authentic 70s poster aesthetic
 *
 * Technical Implementation:
 * - Each word as TextAtom with transform-style: preserve-3d for 3D context
 * - Entry: scale from 0.01 to 1, rotate 720deg, cubic-bezier bounce easing
 * - Continuous warping: rotateX (-20 to 20deg), rotateY (-30 to 30deg), scale (0.8-1.2)
 * - Multiple text-shadow layers: 3px/6px/9px offsets in #FF6B6B, #4ECDC4, #45B7D1
 * - Backdrop-filter hue-rotate animated for color shifting
 * - Staggered timing: 0.15s delays between words for sequential reveal
 *
 * Use Cases:
 * - Retro music video titles
 * - 70s-themed event promos
 * - Psychedelic concert visuals
 * - Vintage poster aesthetics
 * - Groovy text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with fish-eye warping effect'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(80)
    .describe('Base font size in pixels (default: 80)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Main text color (default: white)'),
  shadowColor1: z
    .string()
    .default('#FF6B6B')
    .describe('First shadow layer color (default: red-pink)'),
  shadowColor2: z
    .string()
    .default('#4ECDC4')
    .describe('Second shadow layer color (default: cyan)'),
  shadowColor3: z
    .string()
    .default('#45B7D1')
    .describe('Third shadow layer color (default: blue)'),
  entryDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of vortex entry animation in seconds (default: 0.8)'),
  warpIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for warping effect (default: 1)'),
  pulseSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed of pulsing/breathing effect in seconds (default: 2)'),
  wordDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay between word animations in seconds (default: 0.15)'),
  hueRotateSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Speed of hue-rotate color shifting in seconds (default: 3)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    shadowColor1,
    shadowColor2,
    shadowColor3,
    entryDuration,
    warpIntensity,
    pulseSpeed,
    wordDelay,
    hueRotateSpeed,
  } = params;

  // Split text into words
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const totalDuration = entryDuration + wordDelay * (words.length - 1) + 10;

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `fisheye-word-${index}`;
    const wordStartDelay = wordDelay * index;

    // Entry animation: vortex spiral zoom-in with rotation
    const entryEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStartDelay,
      duration: entryDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale from tiny point to full size
        { key: 'scale', val: 0.01, prog: 0 },
        { key: 'scale', val: 1.1, prog: 0.8 },
        { key: 'scale', val: 1, prog: 1 },
        // 720 degree spiral rotation
        { key: 'rotate', val: 720, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    };

    // Continuous fish-eye warping: rotateX/Y oscillation
    const warpStartTime = wordStartDelay + entryDuration;
    const warpDuration = totalDuration - warpStartTime;
    const rotateXRange = 20 * warpIntensity;
    const rotateYRange = 30 * warpIntensity;

    const warpEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: warpStartTime,
      duration: warpDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // rotateX oscillation: -20 to +20 degrees
        { key: 'rotateX', val: -rotateXRange, prog: 0 },
        { key: 'rotateX', val: rotateXRange, prog: 0.25 },
        { key: 'rotateX', val: 0, prog: 0.5 },
        { key: 'rotateX', val: -rotateXRange, prog: 0.75 },
        { key: 'rotateX', val: 0, prog: 1 },
        // rotateY oscillation: -30 to +30 degrees (offset timing)
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: rotateYRange, prog: 0.2 },
        { key: 'rotateY', val: 0, prog: 0.4 },
        { key: 'rotateY', val: -rotateYRange, prog: 0.6 },
        { key: 'rotateY', val: 0, prog: 0.8 },
        { key: 'rotateY', val: rotateYRange / 2, prog: 1 },
      ],
    };

    // Pulsing scale for breathing effect
    const pulseEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: warpStartTime,
      duration: pulseSpeed,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.8 + 0.4 * warpIntensity, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `clamp(${fontSize * 0.6}px, 8vw, ${fontSize * 1.5}px)`,
          fontWeight: '400',
          color: textColor,
          textShadow: `3px 3px 0 ${shadowColor1}, 6px 6px 0 ${shadowColor2}, 9px 9px 0 ${shadowColor3}, 12px 12px 8px rgba(0,0,0,0.3)`,
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
        },
        font: {
          family: 'Righteous',
          weights: ['400'],
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
          id: `${wordId}-entry`,
          componentId: 'generic',
          data: entryEffect,
        },
        {
          id: `${wordId}-warp`,
          componentId: 'generic',
          data: warpEffect,
        },
        {
          id: `${wordId}-pulse`,
          componentId: 'generic',
          data: pulseEffect,
        },
      ],
    };

    return wordComponent;
  });

  // Container with hue-rotate backdrop filter for color shifting
  const containerId = 'fisheye-container';

  // Hue-rotate animation for psychedelic color shifting
  const hueRotateEffect: GenericEffectData = {
    type: 'linear',
    start: entryDuration,
    duration: hueRotateSpeed,
    mode: 'provider',
    targetIds: [containerId],
    ranges: [
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(45deg)', prog: 0.5 },
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
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
        id: `${containerId}-hue-rotate`,
        componentId: 'generic',
        data: hueRotateEffect,
      },
    ],
    childrenData: [
      {
        id: 'fisheye-words-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-center justify-center gap-4',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
          repeatChildrenProps: {
            style: {
              transformStyle: 'preserve-3d',
              transformOrigin: 'center center',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'fisheye-concert-poster-typography',
  title: '70s Concert Poster Fish-Eye Typography',
  description:
    'Kinetic typography preset inspired by 70s psychedelic concert posters with fish-eye lens warping effects. Words appear to bulge and warp as if printed on an inflating bubble, with thick multi-layered dripping text shadows in retro colors. Features vortex spiral entry animations (scale from point + 720° rotation), continuous 3D warping (rotateX/Y oscillation creating convex lens bulge), pulsing scale for breathing effect, and animated hue-rotate filter. Uses Righteous font for authentic retro feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'retro',
    '70s',
    'psychedelic',
    'concert-poster',
    'fish-eye',
    'warping',
    '3d',
    'vortex',
    'spiral',
    'text-effects',
  ],
  defaultInputParams: {
    text: 'Groovy Vibes',
    fontSize: 80,
    textColor: '#FFFFFF',
    shadowColor1: '#FF6B6B',
    shadowColor2: '#4ECDC4',
    shadowColor3: '#45B7D1',
    entryDuration: 0.8,
    warpIntensity: 1,
    pulseSpeed: 2,
    wordDelay: 0.15,
    hueRotateSpeed: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const fisheyeConcertPosterTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
