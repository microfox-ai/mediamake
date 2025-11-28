/**
 * Bouncy Typokinetics - Elastic Spring Letter Animation Preset
 *
 * This preset creates playful, bouncy letter animations where each letter springs outward
 * from a bunched starting position with elastic overshoot and damped oscillation. Each letter
 * has its own personality through slightly different spring constants and timing offsets.
 *
 * Features:
 * - **Elastic Spring Physics**: Letters spring outward with overshoot and settle with decreasing amplitude
 * - **Synchronized Scale Pulsing**: Scale animations synchronized with position bounce
 * - **Random Rotation Variation**: Slight random rotations during bounce phase for hand-animated feel
 * - **Staggered Start Timing**: Letters start with 0.04s delays for cascading wave effect
 * - **Individual Personality**: Each letter has unique spring constants and animation parameters
 * - **High Performance**: Pre-calculated random values, GPU-accelerated transforms
 *
 * Use cases:
 * - Fun, energetic social media titles and intros
 * - Youth-oriented video content
 * - Product launches and announcements
 * - Playful brand animations
 * - Game or entertainment content overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text to animate with bouncy spring effect'),
  font: z
    .string()
    .optional()
    .default('Inter:800')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:800", "Montserrat:700")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  colorVariation: z
    .boolean()
    .default(true)
    .optional()
    .describe('Apply vibrant color variation to each letter'),
  springIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Overall intensity multiplier for spring animations (0.1-2)'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Total duration in seconds for the preset'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
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

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:800');

  // Split text into words
  const words = params.text.split(' ').filter(word => word.length > 0);

  // Vibrant color palette for letter variation
  const colorPalette = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFE66D', // Yellow
    '#95E1D3', // Mint
    '#F38181', // Pink
    '#AA96DA', // Purple
    '#FCBAD3', // Light Pink
    '#A8E6CF', // Light Green
  ];

  // Pre-calculate random values for performance
  const getLetterParams = (letterIndex: number, totalLetters: number) => {
    // Seeded random for consistency
    const seed = (letterIndex * 9301 + 49297) % 233280;
    const random = seed / 233280;

    // Position parameters (outward expansion)
    const isLeftSide = letterIndex < totalLetters / 2;
    const distanceFromCenter = Math.abs(letterIndex - totalLetters / 2);
    const baseTranslateX = isLeftSide ? -40 - distanceFromCenter * 3 : 40 + distanceFromCenter * 3;
    const overshootTranslateX = baseTranslateX * 1.5;
    const bounce1TranslateX = baseTranslateX * -0.15;
    const bounce2TranslateX = baseTranslateX * 0.05;

    // Scale parameters (synchronized with position)
    const scaleOvershoot = 1.1 + random * 0.1;
    const scaleCompress = 0.92 + random * 0.05;
    const scaleSettle = 1.0 + random * 0.02;

    // Rotation parameters (random but controlled)
    const rotationOvershoot = (random - 0.5) * 16; // -8 to 8 degrees
    const rotationBounce = (random - 0.5) * 5; // -2.5 to 2.5 degrees

    return {
      baseTranslateX,
      overshootTranslateX,
      bounce1TranslateX,
      bounce2TranslateX,
      scaleOvershoot,
      scaleCompress,
      scaleSettle,
      rotationOvershoot,
      rotationBounce,
      colorIndex: Math.floor(random * colorPalette.length),
    };
  };

  // Create word containers with letter animations
  const wordContainersData: RenderableComponentData[] = words.map((word, wordIndex) => {
    const letters = word.split('');
    const totalLetters = letters.length;

    const letterComponentsData: RenderableComponentData[] = letters.map(
      (letter, letterIndex) => {
        const globalLetterIndex = wordIndex * 10 + letterIndex;
        const letterParams = getLetterParams(globalLetterIndex, totalLetters);

        const letterWrapperId = `letter-wrapper-${wordIndex}-${letterIndex}`;
        const letterAtomId = `letter-${wordIndex}-${letterIndex}`;

        // Calculate stagger delay
        const staggerDelay = globalLetterIndex * 0.04;

        // Apply intensity multiplier
        const intensity = params.springIntensity ?? 1;

        // Create bounce effect with spring physics simulation
        const bounceEffect: GenericEffectData = {
          type: 'ease-out', // Smooth easing for spring feel
          start: staggerDelay,
          duration: 1.2 * intensity,
          mode: 'provider',
          targetIds: [letterWrapperId],
          ranges: [
            // TranslateX - spring outward with overshoot
            { key: 'translateX', val: 0, prog: 0 },
            {
              key: 'translateX',
              val: letterParams.overshootTranslateX * intensity,
              prog: 0.7,
            },
            {
              key: 'translateX',
              val: letterParams.bounce1TranslateX * intensity,
              prog: 0.85,
            },
            {
              key: 'translateX',
              val: letterParams.bounce2TranslateX * intensity,
              prog: 0.92,
            },
            { key: 'translateX', val: 0, prog: 1 },

            // Scale - synchronized pulsing
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: letterParams.scaleOvershoot, prog: 0.7 },
            { key: 'scale', val: letterParams.scaleCompress, prog: 0.85 },
            { key: 'scale', val: letterParams.scaleSettle, prog: 0.92 },
            { key: 'scale', val: 1, prog: 1 },

            // RotateZ - random rotation during bounce
            { key: 'rotateZ', val: 0, prog: 0 },
            {
              key: 'rotateZ',
              val: letterParams.rotationOvershoot * intensity,
              prog: 0.7,
            },
            {
              key: 'rotateZ',
              val: letterParams.rotationBounce * intensity,
              prog: 0.85,
            },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        };

        const letterColor = params.colorVariation
          ? colorPalette[letterParams.colorIndex]
          : params.textColor || '#FFFFFF';

        return {
          id: letterWrapperId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'inline-block transform-gpu origin-bottom',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration || 3,
            },
          },
          effects: [
            {
              id: `bounce-effect-${wordIndex}-${letterIndex}`,
              componentId: 'generic',
              data: bounceEffect,
            },
          ],
          childrenData: [
            {
              id: letterAtomId,
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: letter,
                style: {
                  fontSize: `${params.fontSize || 64}px`,
                  fontWeight: fontStyle.fontWeight || 800,
                  color: letterColor,
                  ...fontStyle,
                },
                font: {
                  family: fontFamily,
                  weights: [String(fontStyle.fontWeight || 800)],
                  display: 'swap',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: params.duration || 3,
                },
              },
            },
          ],
        } as RenderableComponentData;
      },
    );

    return {
      id: `word-container-${wordIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-flex items-baseline mx-2',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration || 3,
        },
      },
      childrenData: letterComponentsData,
    } as RenderableComponentData;
  });

  const rootContainer: RenderableComponentData = {
    id: 'bouncy-typokinetics-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center p-4',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration || 3,
      },
    },
    childrenData: [
      {
        id: 'words-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex items-baseline flex-wrap justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration || 3,
          },
        },
        childrenData: wordContainersData,
      } as RenderableComponentData,
    ],
  };

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
  id: 'bouncy-typokinetics',
  title: 'Bouncy Typokinetics - Elastic Spring Letter Animation',
  description:
    'Playful, bouncy typokinetics preset where letters spring outward with elastic overshoot and damped oscillation. Each letter has its own personality with synchronized scale pulsing and random rotations during bounce, perfect for fun, energetic social media titles and youth-oriented content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'bouncy',
    'spring',
    'elastic',
    'playful',
    'energetic',
    'social-media',
    'youth',
    'title',
    'text',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HEY',
    font: 'Inter:800',
    fontSize: 64,
    textColor: '#FFFFFF',
    colorVariation: true,
    springIntensity: 1,
    duration: 3,
  },
};

export const bouncyTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
