/**
 * Retro Arcade Bouncy Text Preset
 *
 * Creates retro arcade-style bouncy text where each letter follows a pixelated stepped curve path,
 * reminiscent of classic 8-bit game physics. Features discrete position jumps (quantized to 8px grid),
 * satisfying 'boing' bounce feel with squash/stretch mechanics, RGB color split effects during movement,
 * chromatic aberration, and parabolic arc motion with stepped interpolation for nostalgic choppy-smooth
 * hybrid animation.
 *
 * Features:
 * - Pixelated stepped curve paths (quantized to 8px grid)
 * - Classic 8-bit game physics with discrete position jumps
 * - Exaggerated squash on landing and stretch on takeoff
 * - RGB color split effects with mix-blend-screen mode
 * - Chromatic aberration using red/cyan offset shadows
 * - Parabolic arc motion with quantized movement
 * - Pixel-perfect positioning on 8px grid
 * - Steps(8) easing for authentic retro feel
 * - Staggered letter animations for cascading effect
 *
 * Use cases:
 * - Creating retro arcade game title screens
 * - Building nostalgic 8-bit style animations
 * - Creating Pac-Man or classic game inspired text effects
 * - Adding pixel-art style bouncy text to videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('RETRO!8B')
    .describe('Text to display with retro bouncy animation'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Press Start 2P:400')
    .describe(
      'Font family with optional weight (e.g., "Press Start 2P:400", "VT323")',
    ),
  bounceHeight: z
    .number()
    .min(32)
    .max(256)
    .default(96)
    .describe('Maximum bounce height in pixels (quantized to 8px grid)'),
  bounceDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of one complete bounce cycle in seconds'),
  letterStagger: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.08)
    .describe('Delay between each letter starting animation in seconds'),
  gridSize: z
    .number()
    .min(4)
    .max(16)
    .default(8)
    .describe('Grid size for position quantization in pixels'),
  squashScale: z
    .number()
    .min(0.3)
    .max(0.8)
    .default(0.6)
    .describe('Scale factor for squash on landing (scaleY)'),
  stretchScale: z
    .number()
    .min(1.2)
    .max(2)
    .default(1.4)
    .describe('Scale factor for stretch on takeoff (scaleY)'),
  rgbSplitOffset: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('RGB color split offset in pixels'),
  baseColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgb)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total animation duration in seconds'),
  loop: z
    .boolean()
    .default(true)
    .describe('Whether to loop the bounce animation'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Press Start 2P:400';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper function to quantize value to grid
  const quantize = (value: number, gridSize: number): number => {
    return Math.round(value / gridSize) * gridSize;
  };

  // Helper function to create parabolic arc keyframes
  const createParabolicArc = (
    maxHeight: number,
    duration: number,
    gridSize: number,
  ): Array<{ prog: number; y: number }> => {
    // Create parabolic motion with quantization
    const steps = 8; // Number of discrete steps
    const keyframes: Array<{ prog: number; y: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      // Parabolic formula: y = -4 * height * prog * (prog - 1)
      const rawY = -4 * maxHeight * prog * (prog - 1);
      const quantizedY = quantize(rawY, gridSize);
      keyframes.push({ prog, y: quantizedY });
    }

    return keyframes;
  };

  // Helper function to create horizontal movement
  const createHorizontalMovement = (
    letterIndex: number,
    totalLetters: number,
  ): Array<{ prog: number; x: number }> => {
    // Subtle left-right oscillation
    const amplitude = 16; // pixels
    const steps = 8;
    const keyframes: Array<{ prog: number; x: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      // Sinusoidal horizontal movement
      const rawX = amplitude * Math.sin(prog * Math.PI * 2);
      const quantizedX = quantize(rawX, params.gridSize);
      keyframes.push({ prog, x: quantizedX });
    }

    return keyframes;
  };

  // Create letter components with RGB layers
  const text = params.text;
  const letters = text.split('');

  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const letterStart = index * params.letterStagger;

      // Create parabolic arc keyframes
      const arcKeyframes = createParabolicArc(
        params.bounceHeight,
        params.bounceDuration,
        params.gridSize,
      );
      const horizontalKeyframes = createHorizontalMovement(
        index,
        letters.length,
      );

      // Position animation (vertical bounce with quantization)
      const positionRanges: Array<{ key: string; val: any; prog: number }> = [];
      arcKeyframes.forEach((kf) => {
        positionRanges.push({
          key: 'translateY',
          val: -kf.y,
          prog: kf.prog,
        });
      });
      horizontalKeyframes.forEach((kf) => {
        positionRanges.push({
          key: 'translateX',
          val: kf.x,
          prog: kf.prog,
        });
      });

      // Squash and stretch animation
      const squashStretchRanges = [
        // Start: normal
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleX', val: 1, prog: 0 },
        // Stretch on takeoff
        { key: 'scaleY', val: params.stretchScale, prog: 0.125 },
        { key: 'scaleX', val: 1 / params.stretchScale, prog: 0.125 },
        // Normal at peak
        { key: 'scaleY', val: 1, prog: 0.5 },
        { key: 'scaleX', val: 1, prog: 0.5 },
        // Squash on landing
        { key: 'scaleY', val: params.squashScale, prog: 0.875 },
        { key: 'scaleX', val: 1 / params.squashScale, prog: 0.875 },
        // Back to normal
        { key: 'scaleY', val: 1, prog: 1 },
        { key: 'scaleX', val: 1, prog: 1 },
      ];

      // RGB split effect ranges
      const rgbSplitRanges = [
        // Red layer offset
        { key: 'redOffsetX', val: 0, prog: 0 },
        { key: 'redOffsetX', val: -params.rgbSplitOffset, prog: 0.25 },
        { key: 'redOffsetX', val: 0, prog: 0.5 },
        { key: 'redOffsetX', val: params.rgbSplitOffset, prog: 0.75 },
        { key: 'redOffsetX', val: 0, prog: 1 },
        // Cyan layer offset
        { key: 'cyanOffsetX', val: 0, prog: 0 },
        { key: 'cyanOffsetX', val: params.rgbSplitOffset, prog: 0.25 },
        { key: 'cyanOffsetX', val: 0, prog: 0.5 },
        { key: 'cyanOffsetX', val: -params.rgbSplitOffset, prog: 0.75 },
        { key: 'cyanOffsetX', val: 0, prog: 1 },
      ];

      // Main letter container with position and squash/stretch
      const effectData: GenericEffectData = {
        type: 'linear',
        start: letterStart,
        duration: params.loop
          ? params.duration - letterStart
          : params.bounceDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [...positionRanges, ...squashStretchRanges],
      };

      const mainEffect = {
        id: `${letterId}-main-effect`,
        componentId: 'generic',
        data: effectData,
      };

      // RGB layer effects
      const redLayerId = `${letterId}-red`;
      const cyanLayerId = `${letterId}-cyan`;

      const redEffectData: GenericEffectData = {
        type: 'linear',
        start: letterStart,
        duration: params.loop
          ? params.duration - letterStart
          : params.bounceDuration,
        mode: 'provider',
        targetIds: [redLayerId],
        ranges: rgbSplitRanges
          .filter((r) => r.key === 'redOffsetX')
          .map((r) => ({
            key: 'translateX',
            val: r.val,
            prog: r.prog,
          })),
      };

      const cyanEffectData: GenericEffectData = {
        type: 'linear',
        start: letterStart,
        duration: params.loop
          ? params.duration - letterStart
          : params.bounceDuration,
        mode: 'provider',
        targetIds: [cyanLayerId],
        ranges: rgbSplitRanges
          .filter((r) => r.key === 'cyanOffsetX')
          .map((r) => ({
            key: 'translateX',
            val: r.val,
            prog: r.prog,
          })),
      };

      const redEffect = {
        id: `${letterId}-red-effect`,
        componentId: 'generic',
        data: redEffectData,
      };

      const cyanEffect = {
        id: `${letterId}-cyan-effect`,
        componentId: 'generic',
        data: cyanEffectData,
      };

      // Letter container with RGB layers
      return {
        id: letterId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              imageRendering: 'pixelated',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [mainEffect],
        childrenData: [
          // Red layer
          {
            id: redLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter,
              className: 'absolute',
              style: {
                fontSize: `${params.fontSize}px`,
                color: '#ff0000',
                mixBlendMode: 'screen',
                imageRendering: 'pixelated',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [redEffect],
          } as RenderableComponentData,
          // Cyan layer
          {
            id: cyanLayerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter,
              className: 'absolute',
              style: {
                fontSize: `${params.fontSize}px`,
                color: '#00ffff',
                mixBlendMode: 'screen',
                imageRendering: 'pixelated',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [cyanEffect],
          } as RenderableComponentData,
          // Main white layer with chromatic aberration shadow
          {
            id: `${letterId}-main`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter,
              className: 'absolute',
              style: {
                fontSize: `${params.fontSize}px`,
                color: params.baseColor,
                imageRendering: 'pixelated',
                textShadow: `${params.rgbSplitOffset}px 0 #ff0000, -${params.rgbSplitOffset}px 0 #00ffff`,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
          } as RenderableComponentData,
        ] as RenderableComponentData[],
      } as RenderableComponentData;
    },
  );

  // Root container with pixel grid background
  const rootContainer = {
    id: 'retro-arcade-bouncy-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black flex items-center justify-center',
        style: {
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255,255,255,0.03) 7px, rgba(255,255,255,0.03) 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.03) 7px, rgba(255,255,255,0.03) 8px)`,
          imageRendering: 'pixelated',
          gap: `${params.fontSize * 0.15}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterComponents,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'retroArcadeBouncyText',
  title: 'Retro Arcade Bouncy Text',
  description:
    'Retro arcade-style bouncy text animation where each letter follows a pixelated stepped curve path with classic 8-bit game physics. Features discrete position jumps (quantized to 8px grid), satisfying "boing" bounce feel with squash/stretch mechanics, RGB color split effects during movement, chromatic aberration, and parabolic arc motion with stepped interpolation for nostalgic choppy-smooth hybrid animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'retro',
    'arcade',
    '8-bit',
    'pixelated',
    'bouncy',
    'game',
    'pac-man',
    'rgb-split',
    'squash-stretch',
    'quantized',
    'stepped',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RETRO!8B',
    fontSize: 64,
    font: 'Press Start 2P:400',
    bounceHeight: 96,
    bounceDuration: 1.2,
    letterStagger: 0.08,
    gridSize: 8,
    squashScale: 0.6,
    stretchScale: 1.4,
    rgbSplitOffset: 2,
    baseColor: '#ffffff',
    duration: 10,
    loop: true,
  },
};

export const retroArcadeBouncyTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
