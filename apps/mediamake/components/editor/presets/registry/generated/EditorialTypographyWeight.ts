/**
 * Editorial Typography Weight Shift Preset
 *
 * This preset creates sophisticated editorial-style typography inspired by high-end magazine layouts.
 * Words transform with subtle weight changes simulated through text-shadow layering, combined with
 * scale (1.0 to 1.06) and letter-spacing adjustments. Emphasized words create breathing room by
 * animating margins, gently pushing neighboring words away.
 *
 * Features:
 * - **Weight Simulation**: Multiple text-shadow layers create the illusion of font weight transitions
 * - **Subtle Scaling**: Words scale from 1.0 to 1.06 for natural reading emphasis
 * - **Letter-spacing Animation**: 0 to 0.02em for refined typographic rhythm
 * - **Micro-interactions**: Emphasized words add margin (0 to 0.25em) for breathing room
 * - **Smooth Transitions**: 800ms ease-in-out for editorial feel
 * - **Ambient Effects**: Non-emphasized words have subtle opacity transitions
 *
 * Use cases:
 * - High-end magazine-style typography
 * - Professional editorial content
 * - Refined reading experiences with natural emphasis
 * - Sophisticated typography animations for brand content
 * - InDesign-style variable font weight transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption objects with text, timing, and words'),
  font: z
    .string()
    .optional()
    .default('Inter:500')
    .describe('Font family with optional weight and style (e.g., "Inter:500", "PlayfairDisplay:600")'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(56)
    .optional()
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#1a1a1a')
    .optional()
    .describe('Text color for words'),
  effectDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Duration of emphasis animation in seconds (800ms default for editorial feel)'),
  scaleIntensity: z
    .number()
    .min(1.0)
    .max(1.15)
    .default(1.06)
    .optional()
    .describe('Maximum scale for emphasized words (1.06 = subtle 6% increase)'),
  letterSpacingMax: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .optional()
    .describe('Maximum letter-spacing in em units for emphasized words'),
  marginSpace: z
    .number()
    .min(0)
    .max(1)
    .default(0.25)
    .optional()
    .describe('Maximum margin in em units for breathing room (0.25em default)'),
  lineHeight: z
    .number()
    .min(1)
    .max(2)
    .default(1.4)
    .optional()
    .describe('Line height for text layout'),
  ambientOpacity: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable subtle ambient opacity transitions for non-emphasized words'),
  position: z
    .object({
      top: z.string().optional(),
      bottom: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional(),
    })
    .optional()
    .describe('Absolute positioning for the text container (e.g., {bottom: "10%"})'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const captions = params.captions as TranscriptionSentence[];

  if (!captions || captions.length === 0) {
    throw new Error('No captions provided');
  }

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:500';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const fontSize = params.fontSize ?? 56;
  const textColor = params.textColor ?? '#1a1a1a';
  const effectDuration = params.effectDuration ?? 0.8;
  const scaleIntensity = params.scaleIntensity ?? 1.06;
  const letterSpacingMax = params.letterSpacingMax ?? 0.02;
  const marginSpace = params.marginSpace ?? 0.25;
  const lineHeight = params.lineHeight ?? 1.4;
  const ambientOpacity = params.ambientOpacity ?? true;

  // Build position style from params
  const positionStyle: React.CSSProperties = {};
  if (params.position) {
    if (params.position.top) positionStyle.top = params.position.top;
    if (params.position.bottom) positionStyle.bottom = params.position.bottom;
    if (params.position.left) positionStyle.left = params.position.left;
    if (params.position.right) positionStyle.right = params.position.right;
  }

  // Create caption containers
  const captionContainers: RenderableComponentData[] = [];

  for (let captionIndex = 0; captionIndex < captions.length; captionIndex++) {
    const caption = captions[captionIndex];
    const words = caption.words || [];

    if (words.length === 0) continue;

    // Create word components for this caption
    const wordComponents: RenderableComponentData[] = [];

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const word = words[wordIndex];
      const wordId = `editorial-word-${captionIndex}-${wordIndex}`;

      // Determine if this word should be emphasized
      // In editorial style, we emphasize based on word timing and natural reading rhythm
      // Emphasize words that span across significant portions of the caption
      const wordDurationRatio = word.duration / caption.duration;
      const isEmphasized = wordDurationRatio > 0.15; // Emphasize words longer than 15% of caption

      // Create emphasis effect for emphasized words
      let emphasisEffect: GenericEffectData | null = null;

      if (isEmphasized) {
        emphasisEffect = {
          type: 'ease-in-out',
          start: word.start,
          duration: effectDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Scale animation: 1.0 → scaleIntensity → 1.0
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Letter-spacing animation: 0 → max → 0
            { key: 'letterSpacing', val: '0em', prog: 0 },
            { key: 'letterSpacing', val: `${letterSpacingMax}em`, prog: 0.5 },
            { key: 'letterSpacing', val: '0em', prog: 1 },
            // Text-shadow layering to simulate weight increase
            { key: 'textShadow', val: '0 0 0 transparent', prog: 0 },
            {
              key: 'textShadow',
              val: `1px 1px 0 ${textColor}33, 0.5px 0.5px 0 ${textColor}22`,
              prog: 0.5,
            },
            { key: 'textShadow', val: '0 0 0 transparent', prog: 1 },
            // Margin left animation for breathing room
            { key: 'marginLeft', val: '0em', prog: 0 },
            { key: 'marginLeft', val: `${marginSpace}em`, prog: 0.4 },
            { key: 'marginLeft', val: '0em', prog: 1 },
            // Margin right animation for breathing room
            { key: 'marginRight', val: '0em', prog: 0 },
            { key: 'marginRight', val: `${marginSpace}em`, prog: 0.4 },
            { key: 'marginRight', val: '0em', prog: 1 },
          ],
        };
      }

      // Create ambient opacity effect for non-emphasized words (if enabled)
      let ambientEffect: GenericEffectData | null = null;

      if (ambientOpacity && !isEmphasized) {
        ambientEffect = {
          type: 'ease-in-out',
          start: word.start,
          duration: caption.duration * 0.8,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0.85, prog: 1 },
          ],
        };
      }

      // Combine effects
      const effects = [
        emphasisEffect && {
          id: `editorial-emphasis-${wordId}`,
          componentId: 'generic',
          data: emphasisEffect,
        },
        ambientEffect && {
          id: `editorial-ambient-${wordId}`,
          componentId: 'generic',
          data: ambientEffect,
        },
      ].filter(Boolean) as any[];

      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            letterSpacing: '0em',
            margin: '0',
            transition: 'none',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['500'],
            display: 'swap',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: effects,
      };

      wordComponents.push(wordComponent);
    }

    // Create words wrapper for this caption
    const wordsWrapper: RenderableComponentData = {
      id: `editorial-words-wrapper-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-baseline justify-center',
          style: {
            gap: '0.15em',
            maxWidth: '90%',
            lineHeight: lineHeight,
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

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `editorial-caption-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center px-12',
          style: {
            ...positionStyle,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [wordsWrapper],
    };

    captionContainers.push(captionContainer);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'editorial-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionContainers,
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
  id: 'EditorialTypographyWeight',
  title: 'Editorial Typography Weight Shift',
  description:
    'Sophisticated editorial-style typography preset inspired by high-end magazine layouts. Features subtle weight changes through scale (1.0 to 1.06), text-shadow layering for simulated font weight transitions, letter-spacing adjustments, and micro-interactions where emphasized words create breathing room by pushing neighboring words. Uses smooth 800ms ease-in-out animations for natural reading emphasis rather than aggressive animation. Perfect for refined, professional typography that feels like InDesign\'s variable font weight animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'editorial',
    'magazine',
    'weight-shift',
    'subtle',
    'professional',
    'captions',
    'text',
    'emphasis',
    'micro-interactions',
    'breathing-room',
    'indesign',
    'variable-fonts',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:500',
    fontSize: 56,
    textColor: '#1a1a1a',
    effectDuration: 0.8,
    scaleIntensity: 1.06,
    letterSpacingMax: 0.02,
    marginSpace: 0.25,
    lineHeight: 1.4,
    ambientOpacity: true,
  },
};

export const EditorialTypographyWeightPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
