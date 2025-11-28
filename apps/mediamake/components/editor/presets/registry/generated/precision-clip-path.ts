/**
 * PrecisionClipPath Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal preset generates CSS clip-path animations to reveal elements with geometric precision.
 * It supports multiple reveal patterns: diagonal-wipe, iris, blinds, and polygon-morph.
 * Each pattern creates pixel-perfect clip-path values with mathematical calculations.
 * Includes a complementary brightness filter that fades from 1.3 to 1.0 during the reveal.
 *
 * Features:
 * - Multiple reveal patterns: diagonal-wipe, iris, blinds, polygon-morph
 * - Precise mathematical clip-path calculations
 * - Configurable direction, stagger, and smoothness
 * - Complementary brightness filter for subtle highlight effect
 * - Supports multi-element reveals with stagger timing
 *
 * Use cases:
 * - Creating geometric reveal animations for images
 * - Building dynamic transitions with clip-path
 * - Adding highlight effects during reveals
 * - Implementing creative wipe patterns
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to target'),
  revealType: z
    .enum(['diagonal-wipe', 'iris', 'blinds', 'polygon-morph'])
    .describe('Type of reveal pattern to apply'),
  duration: z
    .number()
    .min(100)
    .max(5000)
    .default(1200)
    .optional()
    .describe('Duration of the reveal animation in milliseconds'),
  stagger: z
    .number()
    .min(0)
    .max(2000)
    .default(0)
    .optional()
    .describe(
      'Stagger delay between elements in milliseconds (for multi-element reveals)',
    ),
  direction: z
    .string()
    .default('bottom-right')
    .optional()
    .describe(
      'Direction for applicable reveal types (e.g., "top-left", "bottom-right" for diagonal-wipe)',
    ),
  smoothness: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Animation curve refinement (0 = linear, 1 = smooth ease)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate clip-path values based on reveal type
  const calculateClipPathValues = (
    revealType: string,
    direction: string,
  ): string[] => {
    switch (revealType) {
      case 'diagonal-wipe': {
        // Diagonal line sweeping across
        const isBottomRight = direction.includes('bottom-right');
        const isTopLeft = direction.includes('top-left');
        const isTopRight = direction.includes('top-right');
        const isBottomLeft = direction.includes('bottom-left');

        if (isBottomRight || !direction || direction === 'bottom-right') {
          // Sweep from top-left to bottom-right
          return [
            'polygon(0% 0%, 0% 0%, 0% 0%)', // Start: collapsed at top-left
            'polygon(0% 0%, 50% 0%, 0% 50%)', // Mid-start
            'polygon(0% 0%, 100% 0%, 0% 100%)', // Mid
            'polygon(0% 0%, 100% 0%, 50% 100%, 0% 100%)', // Mid-end
            'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // End: full reveal
          ];
        } else if (isTopLeft) {
          // Sweep from bottom-right to top-left
          return [
            'polygon(100% 100%, 100% 100%, 100% 100%)', // Start
            'polygon(50% 100%, 100% 50%, 100% 100%)', // Mid-start
            'polygon(0% 100%, 100% 0%, 100% 100%)', // Mid
            'polygon(0% 100%, 100% 0%, 100% 50%, 0% 50%)', // Mid-end
            'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // End: full reveal
          ];
        } else if (isTopRight) {
          // Sweep from bottom-left to top-right
          return [
            'polygon(0% 100%, 0% 100%, 0% 100%)', // Start
            'polygon(0% 100%, 50% 100%, 0% 50%)', // Mid-start
            'polygon(0% 100%, 100% 100%, 0% 0%)', // Mid
            'polygon(0% 50%, 100% 100%, 100% 0%, 50% 0%)', // Mid-end
            'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // End: full reveal
          ];
        } else if (isBottomLeft) {
          // Sweep from top-right to bottom-left
          return [
            'polygon(100% 0%, 100% 0%, 100% 0%)', // Start
            'polygon(100% 0%, 100% 50%, 50% 0%)', // Mid-start
            'polygon(100% 0%, 100% 100%, 0% 0%)', // Mid
            'polygon(50% 0%, 100% 100%, 0% 100%, 0% 50%)', // Mid-end
            'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // End: full reveal
          ];
        }
        // Default to bottom-right
        return [
          'polygon(0% 0%, 0% 0%, 0% 0%)',
          'polygon(0% 0%, 50% 0%, 0% 50%)',
          'polygon(0% 0%, 100% 0%, 0% 100%)',
          'polygon(0% 0%, 100% 0%, 50% 100%, 0% 100%)',
          'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        ];
      }

      case 'iris': {
        // Circular expansion from center
        return [
          'circle(0% at 50% 50%)', // Start: collapsed at center
          'circle(20% at 50% 50%)', // Small circle
          'circle(40% at 50% 50%)', // Growing
          'circle(60% at 50% 50%)', // Larger
          'circle(80% at 50% 50%)', // Nearly full
          'circle(100% at 50% 50%)', // End: full reveal
        ];
      }

      case 'blinds': {
        // Vertical strips revealing sequentially
        const stripCount = 10;
        const values: string[] = [];

        for (let i = 0; i <= stripCount; i++) {
          const strips: string[] = [];
          for (let j = 0; j < stripCount; j++) {
            const left = (j / stripCount) * 100;
            const right = ((j + 1) / stripCount) * 100;
            if (j < i) {
              // Fully revealed strip
              strips.push(`${left}% 0%, ${right}% 0%, ${right}% 100%, ${left}% 100%`);
            } else if (j === i) {
              // Currently revealing strip (partial)
              const progress = (i / stripCount) - Math.floor(i / stripCount);
              const bottom = progress * 100;
              strips.push(`${left}% 0%, ${right}% 0%, ${right}% ${bottom}%, ${left}% ${bottom}%`);
            }
          }
          
          if (strips.length === 0) {
            values.push('polygon(0% 0%, 0% 0%, 0% 0%)');
          } else {
            values.push(`polygon(${strips.join(', ')})`);
          }
        }

        // Ensure final state is full reveal
        values.push('polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');
        return values;
      }

      case 'polygon-morph': {
        // Morphing between polygon shapes
        return [
          'polygon(50% 50%, 50% 50%, 50% 50%)', // Start: collapsed triangle
          'polygon(50% 0%, 100% 50%, 50% 50%)', // Small triangle
          'polygon(50% 0%, 100% 50%, 50% 100%)', // Growing triangle
          'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // Diamond
          'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // Hexagon
          'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // End: rectangle (full reveal)
        ];
      }

      default:
        return [
          'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // Default: full reveal
        ];
    }
  };

  // Helper: Generate progress points based on smoothness
  const generateProgressPoints = (
    smoothness: number,
    valueCount: number,
  ): number[] => {
    const points: number[] = [];
    for (let i = 0; i < valueCount; i++) {
      const linearProgress = i / (valueCount - 1);
      if (smoothness === 0) {
        // Linear progression
        points.push(linearProgress);
      } else {
        // Ease-in-out curve refinement
        const eased =
          linearProgress < 0.5
            ? 2 * Math.pow(linearProgress, 1 + smoothness)
            : 1 - 2 * Math.pow(1 - linearProgress, 1 + smoothness);
        points.push(eased);
      }
    }
    return points;
  };

  const duration = (params.duration ?? 1200) / 1000; // Convert to seconds
  const stagger = (params.stagger ?? 0) / 1000; // Convert to seconds
  const smoothness = params.smoothness ?? 0.5;
  const direction = params.direction ?? 'bottom-right';

  // Calculate clip-path values for the reveal type
  const clipPathValues = calculateClipPathValues(params.revealType, direction);
  const progressPoints = generateProgressPoints(
    smoothness,
    clipPathValues.length,
  );

  // Create effects for each target element
  const allEffects: any[] = [];

  params.targetIds.forEach((targetId, index) => {
    const startTime = index * stagger;

    // Build clip-path ranges
    const clipPathRanges = clipPathValues.map((val, i) => ({
      key: 'clipPath',
      val: val,
      prog: progressPoints[i],
    }));

    // Build brightness ranges (1.3 -> 1.0)
    const brightnessRanges = [
      { key: 'brightness', val: 1.3, prog: 0 },
      { key: 'brightness', val: 1.0, prog: 1 },
    ];

    // Combine clip-path and brightness ranges
    const ranges = [...clipPathRanges, ...brightnessRanges];

    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };

    const effect = {
      id: `precision-clip-path-${params.revealType}-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };

    allEffects.push(effect);
  });

  // Return effects in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'precision-clip-path-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + (params.targetIds.length - 1) * stagger,
      },
    },
    effects: allEffects,
    childrenData: [],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
      _extractedEffects: allEffects, // Extracted for internal preset usage
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'precision-clip-path',
  title: 'PrecisionClipPath',
  description:
    'Internal effect preset that uses CSS clip-path animations to reveal elements with geometric precision. Supports multiple reveal patterns: diagonal-wipe (diagonal line sweeping across), iris (circular expansion from center), blinds (vertical strips revealing sequentially), and polygon-morph (morphing between polygon shapes). Includes complementary brightness filter that fades from 1.3 to 1.0 during reveal for a subtle highlight effect.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'clip-path', 'reveal', 'geometric', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1'],
    revealType: 'diagonal-wipe',
    duration: 1200,
    stagger: 0,
    direction: 'bottom-right',
    smoothness: 0.5,
  },
};

export const precisionClipPathPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
