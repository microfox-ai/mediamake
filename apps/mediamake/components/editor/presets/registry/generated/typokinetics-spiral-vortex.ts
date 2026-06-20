/**
 * Typokinetics Spiral Vortex Preset
 *
 * This preset implements elegant serif text flowing in a logarithmic spiral vortex pattern,
 * simulating text being pulled into or emerging from a central point. The text follows a
 * mathematical golden spiral path with sophisticated typography and depth illusion.
 *
 * Features:
 * - **Logarithmic Spiral Path**: Text follows r = a * e^(b*θ) equation for golden spiral
 * - **Depth Illusion**: Scale animation (0.3→1.5) creates 3D depth effect
 * - **Tangent Rotation**: Text rotates naturally along spiral curve tangent
 * - **High-Contrast Serif Typography**: Uses Bodoni Moda for dramatic elegance
 * - **Smooth Motion**: 60+ keyframes for fluid spiral animation
 * - **Opacity Fade**: Text fades in from center and out at extremes
 *
 * Use cases:
 * - Creating mesmerizing text vortex effects
 * - Elegant title sequences with mathematical beauty
 * - Sophisticated typography animations
 * - Abstract text compositions with depth
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
  TextAtomData,
} from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('Flowing through the spiral vortex of time and space')
    .describe('Text content to display in spiral vortex'),

  font: z
    .string()
    .default('Bodoni Moda:700')
    .describe('Font with weight (e.g., "Bodoni Moda:700", "Didot:400")'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#000000')
    .describe('Text color (hex or rgba)'),

  duration: z
    .number()
    .min(2)
    .max(30)
    .default(10)
    .describe('Total animation duration in seconds'),

  spiralTurns: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Number of spiral turns (revolutions)'),

  spiralTightness: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Spiral tightness factor (b parameter in r = a * e^(b*θ))'),

  startRadius: z
    .number()
    .min(10)
    .max(100)
    .default(20)
    .describe('Starting radius at center in pixels'),

  endRadius: z
    .number()
    .min(200)
    .max(800)
    .default(400)
    .describe('Ending radius at outer edge in pixels'),

  direction: z
    .enum(['inward', 'outward'])
    .default('outward')
    .describe('Animation direction: inward (center→out) or outward (out→center)'),

  rotationMultiplier: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Text rotation intensity multiplier'),

  wordSpacing: z
    .number()
    .min(0)
    .max(5)
    .default(1.5)
    .describe('Spacing between words in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Bodoni Moda:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 700;

  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Helper: Calculate logarithmic spiral coordinates
  const calculateSpiralPoint = (
    progress: number,
  ): { x: number; y: number; angle: number } => {
    // Logarithmic spiral: r = a * e^(b*θ)
    const theta = progress * params.spiralTurns * 2 * Math.PI;
    const a = params.startRadius;
    const b = params.spiralTightness;
    const r = a * Math.exp(b * theta);

    // Clamp radius to end radius
    const radius = Math.min(r, params.endRadius);

    // Convert polar to cartesian
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);

    // Calculate tangent angle (add 90° to radius angle for tangent)
    const tangentAngle = (theta * 180) / Math.PI + 90;

    return { x, y, angle: tangentAngle };
  };

  // Helper: Generate keyframes for spiral motion
  const generateSpiralKeyframes = (
    wordIndex: number,
  ): {
    translateX: Array<{ val: number; prog: number }>;
    translateY: Array<{ val: number; prog: number }>;
    rotate: Array<{ val: number; prog: number }>;
    scale: Array<{ val: number; prog: number }>;
    opacity: Array<{ val: number; prog: number }>;
  } => {
    const keyframeCount = 60;
    const translateX: Array<{ val: number; prog: number }> = [];
    const translateY: Array<{ val: number; prog: number }> = [];
    const rotate: Array<{ val: number; prog: number }> = [];
    const scale: Array<{ val: number; prog: number }> = [];
    const opacity: Array<{ val: number; prog: number }> = [];

    for (let i = 0; i <= keyframeCount; i++) {
      const progress = i / keyframeCount;
      const adjustedProgress =
        params.direction === 'outward' ? progress : 1 - progress;

      const point = calculateSpiralPoint(adjustedProgress);

      // Scale: smaller at center (0.3), larger at edge (1.5)
      const scaleValue = 0.3 + adjustedProgress * 1.2;

      // Opacity: fade in from center (0→1 at prog 0→0.1), stay visible, fade out at edge (1→0 at prog 0.9→1)
      let opacityValue = 1;
      if (progress < 0.1) {
        opacityValue = progress / 0.1;
      } else if (progress > 0.9) {
        opacityValue = (1 - progress) / 0.1;
      }

      translateX.push({ val: point.x, prog: progress });
      translateY.push({ val: point.y, prog: progress });
      rotate.push({
        val: point.angle * params.rotationMultiplier,
        prog: progress,
      });
      scale.push({ val: scaleValue, prog: progress });
      opacity.push({ val: opacityValue, prog: progress });
    }

    return { translateX, translateY, rotate, scale, opacity };
  };

  // Generate word components with staggered timing
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `spiral-word-${index}`;
      const wordStartTime = index * params.wordSpacing;

      // Generate spiral keyframes for this word
      const keyframes = generateSpiralKeyframes(index);

      // Create effect data
      const effectData: GenericEffectData = {
        type: 'ease-in-out',
        start: wordStartTime,
        duration: params.duration - wordStartTime,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          ...keyframes.translateX.map(kf => ({
            key: 'translateX' as const,
            val: kf.val,
            prog: kf.prog,
          })),
          ...keyframes.translateY.map(kf => ({
            key: 'translateY' as const,
            val: kf.val,
            prog: kf.prog,
          })),
          ...keyframes.rotate.map(kf => ({
            key: 'rotate' as const,
            val: kf.val,
            prog: kf.prog,
          })),
          ...keyframes.scale.map(kf => ({
            key: 'scale' as const,
            val: kf.val,
            prog: kf.prog,
          })),
          ...keyframes.opacity.map(kf => ({
            key: 'opacity' as const,
            val: kf.val,
            prog: kf.prog,
          })),
        ],
      };

      const effect = {
        id: `spiral-effect-${index}`,
        componentId: 'generic' as const,
        data: effectData,
      };

      const textData: TextAtomData = {
        text: word,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight,
          color: params.textColor,
          position: 'absolute',
          transformOrigin: 'center center',
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
          display: 'swap',
          preload: true,
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom' as const,
        data: textData,
        effects: [effect],
        context: {
          timing: {
            start: wordStartTime,
            duration: params.duration - wordStartTime,
          },
        },
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-spiral-vortex-container',
    type: 'layout' as const,
    componentId: 'BaseLayout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration + words.length * params.wordSpacing,
      },
    },
    childrenData: wordComponents as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-spiral-vortex',
  title: 'Typokinetics: Spiral Vortex Text',
  description:
    'Elegant serif text flowing in a logarithmic spiral vortex pattern, with text following the golden spiral path. Features sophisticated high-contrast serif typography (Bodoni Moda) with scaling that creates depth illusion - text appears smaller toward the center and larger outward. Includes subtle rotation following spiral tangent and opacity fade at extremes. Uses 60+ keyframes for smooth spiral motion with pre-calculated positions based on logarithmic spiral equation (r = a * e^(b*θ)).',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'spiral',
    'vortex',
    'serif',
    'elegant',
    'mathematical',
    'golden-spiral',
    'logarithmic',
    'depth',
    'rotation',
    'bodoni',
    'text-animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Flowing through the spiral vortex of time and space',
    font: 'Bodoni Moda:700',
    fontSize: 48,
    textColor: '#000000',
    duration: 10,
    spiralTurns: 2.5,
    spiralTightness: 0.15,
    startRadius: 20,
    endRadius: 400,
    direction: 'outward',
    rotationMultiplier: 1,
    wordSpacing: 1.5,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typokineticsSpiralVortexPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
