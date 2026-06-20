/**
 * Dreamy Spiral Text Animation Preset
 *
 * Creates an ethereal text animation where words drift along a cloudy spiral path,
 * as if floating through a misty dreamscape. Perfect for artistic film credits where
 * text emerges from and disappears into fog.
 *
 * Features:
 * - **Spiral Path Motion**: Words follow a polar coordinate spiral (r = a + b*θ)
 * - **Gentle Bobbing**: Sine wave vertical oscillation overlaid on the main spiral
 * - **Depth Layering**: Multiple depth layers with varying opacity and gaussian blur
 * - **Particle Effects**: Floating dust/snow particles for atmospheric depth
 * - **Depth of Field**: Gaussian blur creates depth (closer = sharp, farther = blurry)
 * - **Hypnotic Rotation**: Slow, expanding outward spiral with meditative pacing
 * - **Soft Glow**: Animated textShadow for ethereal text appearance
 *
 * Use cases:
 * - Artistic film credits
 * - Dreamy title sequences
 * - Ethereal text overlays
 * - Meditation and ambient videos
 * - Experimental visual poetry
 */

import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import z from 'zod';
import type { RenderableComponentData } from '@microfox/datamotion';

// =====================
// PARAMS SCHEMA
// =====================

const presetParams = z.object({
  words: z
    .array(z.string())
    .min(1)
    .describe(
      'Array of words to animate along the spiral path (e.g., ["DREAM", "FLOAT", "ETHEREAL"])',
    ),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Total duration of the animation in seconds'),
  spiralExpansion: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Rate of spiral expansion (higher = wider spiral)'),
  rotationSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Speed of spiral rotation (higher = faster rotation)'),
  bobbingAmplitude: z
    .number()
    .min(5)
    .max(50)
    .default(15)
    .optional()
    .describe('Amplitude of vertical bobbing motion in pixels'),
  fontSize: z
    .number()
    .min(24)
    .max(96)
    .default(36)
    .optional()
    .describe('Base font size for text in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .default('Inter:300')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Playfair Display:400:italic")',
    ),
  particleCount: z
    .number()
    .min(4)
    .max(20)
    .default(10)
    .optional()
    .describe('Number of floating particles for atmospheric effects'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(6)
    .optional()
    .describe('Maximum blur intensity for depth of field effect in pixels'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Intensity of text glow effect (0 = no glow, 1 = maximum glow)'),
  staggerDelay: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.7)
    .optional()
    .describe('Delay between word animations in seconds for depth layering'),
});

// =====================
// PRESET EXECUTION
// =====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFont = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  // Helper: Calculate spiral position (polar to cartesian)
  const calculateSpiralPosition = (
    progress: number,
    spiralParams: { a: number; b: number; centerX: number; centerY: number },
  ) => {
    const theta = progress * Math.PI * 4; // 4 full rotations over the animation
    const r = spiralParams.a + spiralParams.b * theta;
    const x = spiralParams.centerX + r * Math.cos(theta);
    const y = spiralParams.centerY + r * Math.sin(theta);
    return { x, y };
  };

  // Helper: Calculate bobbing offset
  const calculateBobbing = (progress: number, amplitude: number) => {
    return Math.sin(progress * Math.PI * 2) * amplitude;
  };

  // Helper: Calculate opacity based on spiral position (fade in/out at edges)
  const calculateOpacity = (progress: number) => {
    if (progress < 0.3) {
      // Fade in
      return 0.3 + (progress / 0.3) * 0.7;
    } else if (progress > 0.7) {
      // Fade out
      return 1 - ((progress - 0.7) / 0.3) * 0.7;
    }
    return 1;
  };

  // Helper: Calculate blur based on depth (closer = less blur)
  const calculateBlur = (progress: number, maxBlur: number) => {
    // Center of spiral is sharpest (progress ~0.5)
    const distanceFromCenter = Math.abs(progress - 0.5) * 2;
    return distanceFromCenter * maxBlur;
  };

  // Extract parameters
  const {
    words,
    duration,
    spiralExpansion = 0.8,
    rotationSpeed = 0.5,
    bobbingAmplitude = 15,
    fontSize = 36,
    textColor = '#FFFFFF',
    font = 'Inter:300',
    particleCount = 10,
    blurIntensity = 6,
    glowIntensity = 0.6,
    staggerDelay = 0.7,
  } = params;

  // Parse font
  const { fontFamily, fontStyle } = parseFont(font);

  // Spiral parameters
  const spiralParams = {
    a: 50 * spiralExpansion,
    b: 20 * spiralExpansion,
    centerX: 50, // percentage
    centerY: 50, // percentage
  };

  // Create word components with spiral motion
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `spiral-word-${index}`;
      const startTime = index * staggerDelay;
      const wordDuration = duration - startTime;

      // Calculate animation keyframes for spiral + bobbing
      const createWordEffect = () => {
        const ranges: Array<{ key: string; val: any; prog: number }> = [];

        // Sample spiral path at multiple progress points
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const prog = i / steps;
          const spiralPos = calculateSpiralPosition(prog, spiralParams);
          const bobbing = calculateBobbing(prog, bobbingAmplitude);
          const opacity = calculateOpacity(prog);
          const blur = calculateBlur(prog, blurIntensity);

          // TranslateX/Y for spiral path
          ranges.push({
            key: 'translateX',
            val: `${spiralPos.x - 50}%`, // Relative to center
            prog,
          });
          ranges.push({
            key: 'translateY',
            val: `${spiralPos.y - 50 + bobbing}px`, // Add bobbing
            prog,
          });

          // Opacity based on position
          ranges.push({ key: 'opacity', val: opacity, prog });

          // Blur for depth of field
          ranges.push({ key: 'filter', val: `blur(${blur}px)`, prog });

          // Text shadow for glow (pulsing with spiral)
          const glowSize = 10 + Math.sin(prog * Math.PI * 2) * 10;
          const glowAlpha = glowIntensity * opacity;
          ranges.push({
            key: 'textShadow',
            val: `0 0 ${glowSize}px rgba(255,255,255,${glowAlpha})`,
            prog,
          });
        }

        return {
          id: `${wordId}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: wordDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges,
          },
        };
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'text-white/80 font-light absolute',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: wordDuration,
          },
        },
        effects: [createWordEffect()],
      };
    },
  );

  // Create floating particles
  const particleComponents: RenderableComponentData[] = Array.from(
    { length: particleCount },
    (_, index) => {
      const particleId = `particle-${index}`;
      const particleSize = 3 + Math.random() * 4; // 3-7px
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const particleDuration = 8 + Math.random() * 6; // 8-14s
      const particleDelay = Math.random() * 2;

      // Random drift path
      const endX = startX + (Math.random() - 0.5) * 100;
      const endY = startY - 50 - Math.random() * 50; // Drift upward

      return {
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${particleSize}px; height: ${particleSize}px; border-radius: 50%; background: rgba(255, 255, 255, ${0.2 + Math.random() * 0.3});"></div>`,
          className: 'absolute',
          style: {
            left: `${startX}%`,
            top: `${startY}%`,
          },
        },
        context: {
          timing: {
            start: particleDelay,
            duration: particleDuration,
          },
        },
        effects: [
          {
            id: `${particleId}-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                {
                  key: 'translateX',
                  val: `${endX - startX}%`,
                  prog: 1,
                },
                { key: 'translateY', val: 0, prog: 0 },
                {
                  key: 'translateY',
                  val: `${endY - startY}%`,
                  prog: 1,
                },
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.5 },
                { key: 'opacity', val: 0.2, prog: 1 },
              ],
            },
          },
        ],
      };
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'dreamy-spiral-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-t from-purple-900/20 to-blue-900/20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      // Particle layer (background)
      {
        id: 'particle-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 1, pointerEvents: 'none' },
          },
        },
        context: {
          timing: { start: 0, duration },
        },
        childrenData: particleComponents,
      },
      // Text layer
      {
        id: 'text-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 10 },
          },
        },
        context: {
          timing: { start: 0, duration },
        },
        childrenData: wordComponents,
      },
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

// =====================
// PRESET METADATA
// =====================

const presetMetadata: PresetMetadata = {
  id: 'dreamySpiralText',
  title: 'Dreamy Spiral Text Animation',
  description:
    'Ethereal text animation where words drift along a cloudy spiral path with gentle bobbing motion, varying opacity for depth, particle effects, and gaussian blur for depth of field. Features a slow, hypnotic expanding spiral rotation perfect for artistic film credits.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'spiral',
    'dreamy',
    'ethereal',
    'artistic',
    'credits',
    'floating',
    'fog',
    'particles',
    'depth-of-field',
    'gaussian-blur',
    'glow',
    'hypnotic',
    'meditative',
  ],
  dependencies: {},
  defaultInputParams: {
    words: [
      'DREAM',
      'ETHEREAL',
      'FLOATING',
      'MISTY',
      'SPIRAL',
      'DRIFT',
      'CLOUD',
      'FOG',
    ],
    duration: 20,
    spiralExpansion: 0.8,
    rotationSpeed: 0.5,
    bobbingAmplitude: 15,
    fontSize: 36,
    textColor: '#FFFFFF',
    font: 'Inter:300',
    particleCount: 10,
    blurIntensity: 6,
    glowIntensity: 0.6,
    staggerDelay: 0.7,
  },
};

// =====================
// EXPORT
// =====================

export const dreamySpiralTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
