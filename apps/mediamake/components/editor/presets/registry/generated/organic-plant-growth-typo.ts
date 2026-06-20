/**
 * Organic Plant Growth Typography Preset
 *
 * Creates kinetic typography where letters grow like plants from seed to full form.
 * Each letter starts as a tiny dot at its base position and grows upward with natural,
 * organic motion following plant-like physics: slow start, accelerating growth, then
 * gentle settling.
 *
 * Features:
 * - Growth animation: scaleY (0→1.1→1) with custom growth curve
 * - Baseline maintenance via translateY during growth
 * - Color progression: green-tinted (hue-rotate 60deg) → final color
 * - Decorative "leaves" that sprout at 70% growth (using HTMLBlockAtom)
 * - Post-growth sway animation simulating breeze
 * - Bloom glow pulse when letter reaches full size
 * - Staggered timing: 0.12s delay between letters
 *
 * Use cases:
 * - Nature-themed title sequences
 * - Organic brand introductions
 * - Time-lapse inspired typography
 * - Environmental content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('GROW')
    .describe('Text to display with organic growth animation'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Final text color after growth completes'),
  letterSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(10)
    .describe('Letter spacing in pixels'),
  growthDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of growth animation per letter in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.12)
    .describe('Delay between each letter starting growth in seconds'),
  swayIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of post-growth sway animation (0 = none, 1 = normal, 2 = strong)'),
  showDecorations: z
    .boolean()
    .default(true)
    .describe('Whether to show leaf/flourish decorations that sprout at 70% growth'),
  decorationColor: z
    .string()
    .default('#4CAF50')
    .describe('Color of decorative leaf elements'),
  start: z
    .number()
    .default(0)
    .describe('Start time relative to parent (seconds)'),
  duration: z
    .number()
    .optional()
    .describe('Total duration (auto-calculated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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

  const letters = params.text.split('');
  const growthDuration = params.growthDuration;
  const staggerDelay = params.staggerDelay;
  const totalDuration =
    params.duration ||
    params.start + letters.length * staggerDelay + growthDuration + 2;

  // Helper: Create growth effect for a letter
  const createGrowthEffect = (
    letterId: string,
    letterStart: number,
  ): any => {
    return {
      id: `growth-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: letterStart,
        duration: growthDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // ScaleY: 0 → 1.1 → 1 (overshoot then settle)
          { key: 'scaleY', val: 0, prog: 0 },
          { key: 'scaleY', val: 1.1, prog: 0.7 },
          { key: 'scaleY', val: 1, prog: 1 },
          // TranslateY: maintain baseline (shift up as letter grows)
          { key: 'translateY', val: params.fontSize / 2, prog: 0 },
          { key: 'translateY', val: -params.fontSize * 0.05, prog: 0.7 },
          { key: 'translateY', val: 0, prog: 1 },
          // Color shift: green-tinted → final color (hue-rotate + brightness)
          {
            key: 'filter',
            val: 'hue-rotate(60deg) brightness(1.2)',
            prog: 0,
          },
          { key: 'filter', val: 'hue-rotate(30deg) brightness(1.1)', prog: 0.5 },
          { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 1 },
          // Opacity: fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      },
    };
  };

  // Helper: Create glow pulse effect at growth completion
  const createGlowPulseEffect = (
    letterId: string,
    letterStart: number,
  ): any => {
    const glowStart = letterStart + growthDuration;
    return {
      id: `glow-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: glowStart,
        duration: 0.6,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          {
            key: 'filter',
            val: `drop-shadow(0 0 0px ${params.textColor})`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `drop-shadow(0 0 20px ${params.textColor})`,
            prog: 0.5,
          },
          {
            key: 'filter',
            val: `drop-shadow(0 0 0px ${params.textColor})`,
            prog: 1,
          },
        ],
      },
    };
  };

  // Helper: Create infinite sway effect after growth
  const createSwayEffect = (
    letterId: string,
    letterStart: number,
  ): any => {
    const swayStart = letterStart + growthDuration;
    const swayRotation = 1 * params.swayIntensity;
    const swayTranslateX = 1 * params.swayIntensity;

    return {
      id: `sway-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: swayStart,
        duration: totalDuration - swayStart,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'rotate', val: -swayRotation, prog: 0 },
          { key: 'rotate', val: swayRotation, prog: 0.25 },
          { key: 'rotate', val: -swayRotation, prog: 0.5 },
          { key: 'rotate', val: swayRotation, prog: 0.75 },
          { key: 'rotate', val: -swayRotation, prog: 1 },
          { key: 'translateX', val: -swayTranslateX, prog: 0 },
          { key: 'translateX', val: swayTranslateX, prog: 0.25 },
          { key: 'translateX', val: -swayTranslateX, prog: 0.5 },
          { key: 'translateX', val: swayTranslateX, prog: 0.75 },
          { key: 'translateX', val: -swayTranslateX, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create decorative element (leaf/flourish)
  const createDecoration = (
    letterId: string,
    side: 'left' | 'right',
  ): RenderableComponentData => {
    const decorationId = `decoration-${side}-${letterId}`;
    const rotation = side === 'left' ? -25 : 25;
    const leftPos = side === 'left' ? '-8px' : 'auto';
    const rightPos = side === 'right' ? '-8px' : 'auto';

    return {
      id: decorationId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <div style="
            width: 12px;
            height: 12px;
            background: ${params.decorationColor};
            border-radius: 50% 0 50% 0;
            transform: rotate(${rotation}deg);
          "></div>
        `,
        className: 'absolute',
        style: {
          top: '30%',
          left: leftPos,
          right: rightPos,
          transformOrigin: side === 'left' ? 'bottom right' : 'bottom left',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData;
  };

  // Helper: Create decoration appearance effect
  const createDecorationEffect = (
    decorationId: string,
    letterStart: number,
  ): any => {
    const decorationStart = letterStart + growthDuration * 0.7;
    return {
      id: `decoration-appear-${decorationId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: decorationStart,
        duration: 0.4,
        mode: 'provider',
        targetIds: [decorationId],
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.6 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
        ],
      },
    };
  };

  // Build letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const letterStart = index * staggerDelay;

      // Create letter container with decorations
      const letterChildren: RenderableComponentData[] = [
        {
          id: `${letterId}-text`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: fontStyle.fontWeight || 700,
              fontStyle: fontStyle.fontStyle,
              transformOrigin: 'bottom center',
              display: 'inline-block',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ];

      // Add decorations if enabled
      if (params.showDecorations && letter.trim() !== '') {
        letterChildren.push(
          createDecoration(letterId, 'left'),
          createDecoration(letterId, 'right'),
        );
      }

      // Collect all effects for this letter container
      const letterEffects = [
        createGrowthEffect(`${letterId}-text`, letterStart),
        createGlowPulseEffect(`${letterId}-text`, letterStart),
      ];

      if (params.swayIntensity > 0) {
        letterEffects.push(createSwayEffect(`${letterId}-text`, letterStart));
      }

      if (params.showDecorations && letter.trim() !== '') {
        letterEffects.push(
          createDecorationEffect(`decoration-left-${letterId}`, letterStart),
          createDecorationEffect(`decoration-right-${letterId}`, letterStart),
        );
      }

      return {
        id: letterId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              transformOrigin: 'bottom center',
              overflow: 'visible',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: letterEffects,
        childrenData: letterChildren,
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'organic-growth-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-end justify-center',
        style: {
          width: '100%',
          height: '100%',
          gap: `${params.letterSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: params.start,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents,
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
  id: 'organic-plant-growth-typo',
  title: 'Organic Plant Growth Typography',
  description:
    'Kinetic typography preset where letters grow like plants from seeds to full form. Features plant-like physics with slow start, accelerating growth, and gentle settling. Includes decorative leaf/flourish elements that sprout at 70% growth, subtle post-growth sway animation simulating breeze, color progression from green-tinted to final color, and a bloom-like glow pulse when each letter reaches full size. Inspired by time-lapse plant photography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'organic',
    'growth',
    'plant',
    'nature',
    'animation',
    'stagger',
    'sway',
    'glow',
    'decorative',
    'leaves',
    'time-lapse',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GROW',
    font: 'Inter:700',
    fontSize: 120,
    textColor: '#FFFFFF',
    letterSpacing: 10,
    growthDuration: 2,
    staggerDelay: 0.12,
    swayIntensity: 1,
    showDecorations: true,
    decorationColor: '#4CAF50',
    start: 0,
  },
};

export const organicPlantGrowthTypoPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
