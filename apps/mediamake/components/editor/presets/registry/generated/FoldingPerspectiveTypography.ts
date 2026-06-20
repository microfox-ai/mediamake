/**
 * Folding Perspective Typography Preset
 *
 * Paper-folding inspired kinetic typography where text unfolds from a compressed state with perspective depth.
 * Each word rotates on its transform-origin with alternating hinge directions (left/right), creating a cascading
 * wave-like reveal animation with paper-craft aesthetics.
 *
 * Features:
 * - Alternating transform origins (left/right) for bidirectional folding effect
 * - Perspective depth (1000px) for 3D rotation effect
 * - Initial compressed state: rotateY(±90deg) + scaleY(0.8) for paper-thin appearance
 * - Staggered cascade animation with index-based delays (0.15s per word)
 * - Drop-shadow intensification as elements unfold
 * - Subtle settling wobble at animation end for paper-like physics
 * - Backface-visibility: hidden for clean rotation
 *
 * Use cases:
 * - Creative title reveals with paper-folding aesthetics
 * - Kinetic typography for origami-themed content
 * - Dynamic text animations with 3D depth
 * - Engaging subtitle presentations with perspective effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { TextAtomData, GenericEffectData, RenderableComponentData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption objects with words array'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Base font size for text in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text (e.g., "Inter", "Roboto:700", "BebasNeue:800:normal")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or CSS color name)'),
  
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Delay between each word animation in seconds'),
  
  unfoldDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of individual word unfold animation in seconds'),
  
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective distance in pixels for 3D depth'),
  
  initialScaleY: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.8)
    .describe('Initial vertical scale for paper-thin compressed appearance'),
  
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Drop shadow intensity (0 = none, 1 = maximum)'),
  
  wobbleAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of settling wobble at animation end in degrees'),
  
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning of text container'),
  
  horizontalPosition: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal positioning of text container'),
  
  gap: z
    .number()
    .min(0)
    .max(100)
    .default(12)
    .describe('Gap between words in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    textColor,
    staggerDelay,
    unfoldDuration,
    perspective,
    initialScaleY,
    shadowIntensity,
    wobbleAmount,
    verticalPosition,
    horizontalPosition,
    gap,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parsedFontFamily = fontFamily.includes(':') ? fontFamily.split(':')[0] : fontFamily;
  const fontParts = fontFamily.split(':');
  let fontWeight = '700';
  let fontStyle: 'normal' | 'italic' = 'normal';
  
  if (fontParts.length > 1) {
    fontWeight = fontParts[1];
  }
  if (fontParts.length > 2) {
    fontStyle = fontParts[2] as 'normal' | 'italic';
  }

  // Alignment class mapping
  const verticalAlignmentMap = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  const horizontalAlignmentMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `folding-caption-${captionIndex}`;
    
    // Create word components with alternating origins
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;
      const isEvenIndex = wordIndex % 2 === 0;
      
      // Alternating transform origins
      const transformOrigin = isEvenIndex ? 'left center' : 'right center';
      const initialRotateY = isEvenIndex ? 90 : -90;
      const wobbleRotateY = isEvenIndex ? -wobbleAmount : wobbleAmount;

      // Create unfold effect with stagger
      const unfoldEffect: GenericEffectData = {
        type: 'ease-out',
        start: wordIndex * staggerDelay, // Staggered delay based on index
        duration: unfoldDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // RotateY: folded → unfolded → wobble → settled
          { key: 'rotateY', val: initialRotateY, prog: 0 },
          { key: 'rotateY', val: 0, prog: 0.85 },
          { key: 'rotateY', val: wobbleRotateY, prog: 0.95 },
          { key: 'rotateY', val: 0, prog: 1 },
          
          // ScaleY: compressed → normal
          { key: 'scaleY', val: initialScaleY, prog: 0 },
          { key: 'scaleY', val: 1, prog: 1 },
          
          // Drop shadow: none → intense
          {
            key: 'filter:drop-shadow',
            val: '0px 0px 0px rgba(0,0,0,0)',
            prog: 0,
          },
          {
            key: 'filter:drop-shadow',
            val: `4px 8px ${12 * shadowIntensity}px rgba(0,0,0,${0.6 * shadowIntensity})`,
            prog: 1,
          },
        ],
      };

      const wordData: TextAtomData = {
        text: word.text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight,
          fontStyle,
          color: textColor,
          transformOrigin,
          backfaceVisibility: 'hidden',
          willChange: 'transform, filter',
        },
        font: {
          family: parsedFontFamily,
          weights: [fontWeight],
          display: 'swap',
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: wordData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `unfold-effect-${wordId}`,
            componentId: 'generic',
            data: unfoldEffect,
          },
        ],
      } as RenderableComponentData;
    });

    // Words container with flex layout
    const wordsContainer: RenderableComponentData = {
      id: `${captionId}-words-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex flex-row flex-wrap ${horizontalAlignmentMap[horizontalPosition]}`,
          style: {
            gap: `${gap}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };

    // Root container with perspective
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${verticalAlignmentMap[verticalPosition]} ${horizontalAlignmentMap[horizontalPosition]}`,
          style: {
            perspective: `${perspective}px`,
            perspectiveOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [wordsContainer],
    };

    captionContainers.push(captionContainer);
  });

  return {
    output: {
      childrenData: captionContainers as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'FoldingPerspectiveTypography',
  title: 'Folding Perspective Typography',
  description:
    'Paper-folding inspired kinetic typography where text unfolds from a compressed state with perspective depth. Each word rotates on its transform-origin with alternating hinge directions (left/right), creating a cascading wave-like reveal animation with paper-craft aesthetics. Features staggered delays, drop-shadow intensification, and subtle settling wobble effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'perspective',
    'origami',
    'paper-folding',
    '3d',
    'rotation',
    'cascade',
    'wave',
    'reveal',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Unfold Your Story',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Unfold',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
            confidence: 0.99,
          },
          {
            id: 'word-2',
            text: 'Your',
            start: 1,
            absoluteStart: 1,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.5,
            confidence: 0.99,
          },
          {
            id: 'word-3',
            text: 'Story',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
            confidence: 0.99,
          },
        ],
      },
    ],
    fontSize: 64,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    staggerDelay: 0.15,
    unfoldDuration: 0.8,
    perspective: 1000,
    initialScaleY: 0.8,
    shadowIntensity: 0.6,
    wobbleAmount: 3,
    verticalPosition: 'center',
    horizontalPosition: 'center',
    gap: 12,
  },
};

export const FoldingPerspectiveTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
