/**
 * LEGO Letter Assembly Preset
 *
 * This preset creates a construction/assembly stop motion effect where letters appear to be built
 * piece by piece like LEGO blocks. Each letter assembles from 2-3 geometric pieces that slide or
 * snap together with mechanical motion, creating a satisfying LEGO-building aesthetic with 3D depth
 * and shadows.
 *
 * Features:
 * - **Mechanical Stop Motion**: Letters build piece by piece with steps(8) easing for robotic motion
 * - **Multi-Piece Assembly**: Each letter splits into 2-3 parts (top, bottom, middle) using clip-path
 * - **Sequential Staging**: Parts slide in from different directions and snap together
 * - **Snap Effect**: Scale pulse (1 → 1.1 → 1) at connection points for satisfying lock-in
 * - **3D Depth**: Box shadows and subtle isometric rotation for building block aesthetic
 * - **Staggered Timing**: Each letter starts at index * 0.2s with 0.05s offsets between parts
 *
 * Use cases:
 * - Creating playful title animations with LEGO-style construction
 * - Building brand names with mechanical assembly effects
 * - Adding satisfying construction sequences to intros
 * - Creating educational content with block-building metaphors
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('HELLO')
    .describe('Text to display with LEGO assembly animation'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "BebasNeue")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  colors: z
    .array(z.string())
    .optional()
    .describe(
      'Array of colors for letters (cycles through). If not provided, uses default palette',
    ),
  letterGap: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Gap between letters in pixels'),
  stageDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .describe('Duration for each letter assembly animation'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Delay between each letter starting (seconds)'),
  partStaggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between parts within each letter (seconds)'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of drop shadows (0-1)'),
  isometricRotation: z
    .number()
    .min(-10)
    .max(10)
    .default(2)
    .describe('Isometric rotation angle in degrees for 3D effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  // Default color palette (vibrant LEGO-style colors)
  const defaultColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
  ];

  const colorPalette = params.colors || defaultColors;

  // Split text into letters
  const letters = params.text.toUpperCase().split('');

  // Calculate total duration
  const totalDuration =
    letters.length * params.staggerDelay + params.stageDuration;

  // Create letter components with multi-part assembly
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, letterIndex) => {
      const letterId = `letter-${letterIndex}`;
      const letterColor = colorPalette[letterIndex % colorPalette.length];

      // Slightly darker shade for middle piece
      const middleColor = adjustColorBrightness(letterColor, -0.1);
      const bottomColor = adjustColorBrightness(letterColor, -0.05);

      // Determine if letter needs 3 parts (tall letters like H, E, A) or 2 parts
      const needsMiddlePart = ['H', 'E', 'A', 'F', 'B', 'P', 'R'].includes(
        letter,
      );

      // Create parts (top, bottom, middle if needed)
      const topPartId = `${letterId}-top`;
      const bottomPartId = `${letterId}-bottom`;
      const middlePartId = `${letterId}-middle`;

      // Top part (0-33% or 0-50% depending on middle part)
      const topPart: RenderableComponentData = {
        id: topPartId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter,
          className: 'absolute inset-0',
          style: {
            fontSize: params.fontSize,
            color: letterColor,
            clipPath: needsMiddlePart
              ? 'polygon(0 0, 100% 0, 100% 33%, 0 33%)'
              : 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
            textShadow: `2px 4px 8px rgba(0,0,0,${params.shadowIntensity * 0.6})`,
            ...fontStyle,
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
      };

      // Bottom part (67-100% or 50-100%)
      const bottomPart: RenderableComponentData = {
        id: bottomPartId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter,
          className: 'absolute inset-0',
          style: {
            fontSize: params.fontSize,
            color: bottomColor,
            clipPath: needsMiddlePart
              ? 'polygon(0 67%, 100% 67%, 100% 100%, 0 100%)'
              : 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
            textShadow: `2px 4px 8px rgba(0,0,0,${params.shadowIntensity * 0.6})`,
            ...fontStyle,
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
      };

      // Middle part (33-67%) - only for certain letters
      const middlePart: RenderableComponentData | null = needsMiddlePart
        ? {
            id: middlePartId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: letter,
              className: 'absolute inset-0',
              style: {
                fontSize: params.fontSize,
                color: middleColor,
                clipPath: 'polygon(0 33%, 100% 33%, 100% 67%, 0 67%)',
                textShadow: `2px 4px 8px rgba(0,0,0,${params.shadowIntensity * 0.6})`,
                ...fontStyle,
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
          }
        : null;

      // Create effects for each part
      const letterStartTime = letterIndex * params.staggerDelay;

      // Top part: slides down from translateY: -30px
      const topPartEffect: RenderableComponentData = {
        id: `effect-${topPartId}`,
        componentId: 'generic',
        data: {
          type: 'steps(8)' as any,
          start: letterStartTime,
          duration: params.stageDuration,
          mode: 'provider',
          targetIds: [topPartId],
          ranges: [
            { key: 'translateY', val: -30, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.7 },
            { key: 'scale', val: 1, prog: 0.7 },
            { key: 'scale', val: 1.1, prog: 0.85 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      };

      // Bottom part: slides up from translateY: 30px
      const bottomPartEffect: RenderableComponentData = {
        id: `effect-${bottomPartId}`,
        componentId: 'generic',
        data: {
          type: 'steps(8)' as any,
          start: letterStartTime + params.partStaggerDelay,
          duration: params.stageDuration,
          mode: 'provider',
          targetIds: [bottomPartId],
          ranges: [
            { key: 'translateY', val: 30, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.7 },
            { key: 'scale', val: 1, prog: 0.7 },
            { key: 'scale', val: 1.1, prog: 0.85 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      };

      // Middle part: fades in with scale effect
      const middlePartEffect: RenderableComponentData | null =
        middlePart !== null
          ? {
              id: `effect-${middlePartId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: letterStartTime + params.partStaggerDelay * 2,
                duration: params.stageDuration * 0.8,
                mode: 'provider',
                targetIds: [middlePartId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  { key: 'scale', val: 0.5, prog: 0 },
                  { key: 'scale', val: 1, prog: 0.7 },
                  { key: 'scale', val: 1.1, prog: 0.85 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            }
          : null;

      // Letter container (holds all parts)
      const letterContainer: RenderableComponentData = {
        id: letterId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: `${params.fontSize * 0.7}px`,
              height: `${params.fontSize}px`,
              filter: `drop-shadow(0px 4px 12px rgba(0,0,0,${params.shadowIntensity * 0.4}))`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [topPart, bottomPart, ...(middlePart ? [middlePart] : [])],
        effects: [
          topPartEffect,
          bottomPartEffect,
          ...(middlePartEffect ? [middlePartEffect] : []),
        ],
      };

      return letterContainer;
    },
  );

  // Root container with isometric rotation
  const rootContainer: RenderableComponentData = {
    id: 'lego-letter-assembly-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-end justify-center',
        style: {
          gap: `${params.letterGap}px`,
          transform: `rotateX(${params.isometricRotation}deg)`,
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
    childrenData: letterComponents,
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };

  // Helper function to adjust color brightness
  function adjustColorBrightness(hex: string, percent: number): string {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Adjust brightness
    const newR = Math.max(0, Math.min(255, r + r * percent));
    const newG = Math.max(0, Math.min(255, g + g * percent));
    const newB = Math.max(0, Math.min(255, b + b * percent));

    // Convert back to hex
    const toHex = (n: number) =>
      Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }
};

const presetMetadata: PresetMetadata = {
  id: 'lego-letter-assembly',
  title: 'LEGO Letter Assembly Animation',
  description:
    'Construction/assembly stop motion effect where letters build piece by piece from geometric blocks. Each letter assembles from 2-3 parts that slide and snap together with mechanical motion, creating a satisfying LEGO-building aesthetic with 3D depth and shadows.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'lego',
    'construction',
    'assembly',
    'stop-motion',
    'mechanical',
    'blocks',
    '3d',
    'snap',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HELLO',
    font: 'Inter:700',
    fontSize: 64,
    letterGap: 16,
    stageDuration: 0.5,
    staggerDelay: 0.2,
    partStaggerDelay: 0.05,
    shadowIntensity: 0.5,
    isometricRotation: 2,
  },
};

export const legoLetterAssemblyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
