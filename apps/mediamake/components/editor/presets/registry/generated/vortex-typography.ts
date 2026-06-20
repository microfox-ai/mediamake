/**
 * Vortex Typography Preset
 *
 * Dynamic text animation where words spiral into or erupt from a central whirlpool point.
 * Features Archimedean/logarithmic spiral paths, exponential acceleration toward center,
 * increasing rotation speed with proximity, decreasing scale as words approach the vortex,
 * time-delayed entry based on radial distance, opacity fade at center, turbulence perturbations
 * where words briefly escape before recapture, and blur effects for depth. Supports both
 * inward (drain) and outward (geyser) modes.
 *
 * Features:
 * - Spiral path calculations using Archimedean or logarithmic spiral equations
 * - Exponential acceleration effect as words approach the center
 * - Rotation speed increases with proximity to vortex center
 * - Scale decreases toward vortex for depth perception
 * - Time-delayed staggered entry based on radial distance
 * - Opacity fade as words approach center (1 to 0)
 * - Turbulence using noise functions for position perturbation
 * - Reversal mode where text erupts from center like a geyser
 * - Blur effect increasing toward center for depth perception
 *
 * Use cases:
 * - Creating dramatic text reveals with spiral motion
 * - Building engaging vortex-based typography effects
 * - Adding dynamic whirlpool text animations
 * - Creating geyseer/eruption text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to animate in vortex (will be split into words)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(8)
    .describe('Total animation duration in seconds'),
  spiralType: z
    .enum(['archimedean', 'logarithmic'])
    .default('archimedean')
    .describe('Type of spiral path equation to use'),
  direction: z
    .enum(['inward', 'outward'])
    .default('inward')
    .describe('Direction of vortex (inward=drain, outward=geyser)'),
  startRadius: z
    .number()
    .min(100)
    .max(1000)
    .default(400)
    .describe('Starting radius from center in pixels'),
  endRadius: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Ending radius at vortex center in pixels'),
  rotationSpeed: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Base rotation speed multiplier'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of turbulence perturbations (0-1)'),
  turbulenceFrequency: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .describe('Frequency of turbulence oscillations'),
  fontSize: z
    .number()
    .min(20)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .optional()
    .describe('Font family (e.g., "Inter:700" or "Roboto")'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (CSS color value)'),
  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Maximum blur amount at center in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
    }
  }

  // Split text into words
  const words = params.text.trim().split(/\s+/);
  const wordCount = words.length;

  // Simple noise function for turbulence
  const noise = (x: number, y: number, t: number): number => {
    const seed = x * 12.9898 + y * 78.233 + t * 43.758;
    return (Math.sin(seed) * 43758.5453123) % 1;
  };

  // Calculate spiral position
  const calculateSpiralPosition = (
    progress: number,
    index: number,
  ): { x: number; y: number; rotation: number } => {
    const totalRotations = params.spiralType === 'logarithmic' ? 4 : 6;
    const angle = progress * totalRotations * 2 * Math.PI;

    let radius: number;
    if (params.spiralType === 'archimedean') {
      // Archimedean spiral: r = a + b * theta
      radius =
        params.startRadius +
        (params.endRadius - params.startRadius) * progress;
    } else {
      // Logarithmic spiral: r = a * e^(b * theta)
      const a = params.startRadius;
      const b = Math.log(params.endRadius / params.startRadius) / (totalRotations * 2 * Math.PI);
      radius = a * Math.exp(b * angle);
    }

    // Add turbulence
    const turbulenceX =
      noise(index, 0, progress * params.turbulenceFrequency) *
      params.turbulenceIntensity *
      50;
    const turbulenceY =
      noise(index, 1, progress * params.turbulenceFrequency) *
      params.turbulenceIntensity *
      50;

    const x = radius * Math.cos(angle) + turbulenceX;
    const y = radius * Math.sin(angle) + turbulenceY;

    // Rotation increases with proximity to center
    const rotationProgress = Math.pow(progress, 2);
    const rotation = angle * params.rotationSpeed * 57.2958 * rotationProgress;

    return { x, y, rotation };
  };

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `vortex-word-${index}`;
    const wordProgress = index / Math.max(wordCount - 1, 1);

    // Calculate stagger timing
    let wordStart: number;
    let wordDuration: number;

    if (params.direction === 'inward') {
      // Words further out start earlier
      wordStart = wordProgress * params.duration * 0.3;
      wordDuration = params.duration * 0.7;
    } else {
      // Words near center start earlier (eruption)
      wordStart = (1 - wordProgress) * params.duration * 0.3;
      wordDuration = params.duration * 0.7;
    }

    // Create animation effect
    const effectRanges: Array<{ key: string; val: any; prog: number }> = [];

    // Sample spiral path at multiple progress points
    const numSamples = 20;
    for (let i = 0; i <= numSamples; i++) {
      const prog = i / numSamples;
      let animProgress = prog;

      if (params.direction === 'outward') {
        animProgress = 1 - prog;
      }

      const spiralPos = calculateSpiralPosition(animProgress, index);

      // Add position keyframes
      effectRanges.push({
        key: 'translateX',
        val: spiralPos.x,
        prog: prog,
      });
      effectRanges.push({
        key: 'translateY',
        val: spiralPos.y,
        prog: prog,
      });

      // Add rotation keyframes
      effectRanges.push({
        key: 'rotate',
        val: spiralPos.rotation,
        prog: prog,
      });

      // Scale decreases toward center
      const scale = params.direction === 'inward'
        ? 1 - animProgress * 0.7
        : 0.3 + animProgress * 0.7;
      effectRanges.push({
        key: 'scale',
        val: scale,
        prog: prog,
      });

      // Opacity fades near center
      let opacity: number;
      if (params.direction === 'inward') {
        opacity = animProgress < 0.8 ? 1 : 1 - (animProgress - 0.8) / 0.2;
      } else {
        opacity = animProgress > 0.2 ? 1 : animProgress / 0.2;
      }
      effectRanges.push({
        key: 'opacity',
        val: opacity,
        prog: prog,
      });

      // Blur increases toward center
      const blurAmount = params.direction === 'inward'
        ? animProgress * params.maxBlur
        : (1 - animProgress) * params.maxBlur;
      effectRanges.push({
        key: 'filter',
        val: `blur(${blurAmount}px)`,
        prog: prog,
      });
    }

    const effectData: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: effectRanges,
    };

    const effect = {
      id: `vortex-effect-${index}`,
      componentId: 'generic',
      data: effectData,
    };

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontStyle.fontWeight || 400,
          fontStyle: fontStyle.fontStyle || 'normal',
          position: 'absolute',
          whiteSpace: 'nowrap',
          transformOrigin: 'center',
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
          start: wordStart,
          duration: wordDuration,
        },
      },
      effects: [effect],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vortex-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Vortex center point
      {
        id: 'vortex-center-point',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute',
          style: {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
            zIndex: 100,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData,
      // Words container
      {
        id: 'vortex-words-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformOrigin: 'center',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'vortex-typography',
  title: 'Vortex Typography',
  description:
    'Dynamic text animation where words spiral into or erupt from a central whirlpool point. Features Archimedean/logarithmic spiral paths, exponential acceleration toward center, increasing rotation speed with proximity, decreasing scale as words approach the vortex, time-delayed entry based on radial distance, opacity fade at center, turbulence perturbations where words briefly escape before recapture, and blur effects for depth. Supports both inward (drain) and outward (geyser) modes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'vortex',
    'spiral',
    'whirlpool',
    'kinetic',
    'animated',
    'drain',
    'geyser',
    'turbulence',
    'text-effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Welcome to the Vortex Experience',
    duration: 8,
    spiralType: 'archimedean',
    direction: 'inward',
    startRadius: 400,
    endRadius: 20,
    rotationSpeed: 2,
    turbulenceIntensity: 0.3,
    turbulenceFrequency: 2,
    fontSize: 48,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    backgroundColor: '#000000',
    maxBlur: 10,
  },
};

export const vortexTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
