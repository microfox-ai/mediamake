/**
 * Cinematic Character Fade-In Typokinetics Preset
 *
 * Creates a smooth character-by-character fade-in animation that mimics professional
 * title sequences. Each letter fades in with a subtle upward drift motion, like smoke
 * dissipating in reverse. The animation feels cinematic with a 'film credits' aesthetic.
 *
 * Features:
 * - Character-by-character staggered fade-in animation
 * - Combines opacity (0 → 1), translateY (10px → 0), blur (4px → 0), and scale (0.95 → 1)
 * - Flowing cascade effect with 50ms stagger delay between characters
 * - Configurable timing: ~150-200ms per character duration
 * - Natural text flow using inline-flex layout
 * - Cinematic ease-out easing for smooth deceleration
 *
 * Use cases:
 * - Film title sequences and credits
 * - Professional video intros
 * - Elegant text reveals for branded content
 * - Cinematic typography animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text to animate character by character'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Roboto:600:italic")',
    ),
  characterDuration: z
    .number()
    .min(100)
    .max(500)
    .default(180)
    .describe('Duration of each character fade animation in milliseconds'),
  staggerDelay: z
    .number()
    .min(20)
    .max(200)
    .default(50)
    .describe('Delay between each character animation start in milliseconds'),
  opacityStart: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Starting opacity value (0-1)'),
  opacityEnd: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Ending opacity value (0-1)'),
  translateYStart: z
    .number()
    .min(-50)
    .max(50)
    .default(10)
    .describe('Starting translateY offset in pixels (positive = down)'),
  translateYEnd: z
    .number()
    .min(-50)
    .max(50)
    .default(0)
    .describe('Ending translateY offset in pixels'),
  blurStart: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Starting blur amount in pixels'),
  blurEnd: z
    .number()
    .min(0)
    .max(20)
    .default(0)
    .describe('Ending blur amount in pixels'),
  scaleStart: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(0.95)
    .describe('Starting scale value'),
  scaleEnd: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1)
    .describe('Ending scale value'),
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-out')
    .describe('Easing function for animations'),
  containerAlignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of text container'),
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text container'),
  letterSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(2)
    .describe('Letter spacing in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString?: string) => {
    if (!fontString) return { family: 'Inter', style: {} };

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

    return { family: fontFamily, style: fontStyle };
  };

  const { family: fontFamily, style: fontStyle } = parseFontString(params.font);

  // Split text into individual characters
  const characters = params.text.split('');

  // Convert milliseconds to seconds
  const characterDurationSec = params.characterDuration / 1000;
  const staggerDelaySec = params.staggerDelay / 1000;

  // Calculate total duration: last character start + its animation duration
  const totalDuration =
    characters.length * staggerDelaySec + characterDurationSec;

  // Alignment classes
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const verticalClasses = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  // Create character components with staggered effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;
      const startTime = index * staggerDelaySec;

      // Create effect for this character
      const charEffect: GenericEffectData = {
        type: params.easingType,
        start: startTime,
        duration: characterDurationSec,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // Opacity animation
          { key: 'opacity', val: params.opacityStart, prog: 0 },
          { key: 'opacity', val: params.opacityEnd, prog: 1 },
          // TranslateY animation
          { key: 'translateY', val: params.translateYStart, prog: 0 },
          { key: 'translateY', val: params.translateYEnd, prog: 1 },
          // Blur animation
          { key: 'blur', val: `${params.blurStart}px`, prog: 0 },
          { key: 'blur', val: `${params.blurEnd}px`, prog: 1 },
          // Scale animation
          { key: 'scale', val: params.scaleStart, prog: 0 },
          { key: 'scale', val: params.scaleEnd, prog: 1 },
        ],
      };

      const effect = {
        id: `effect-${charId}`,
        componentId: 'generic',
        data: charEffect,
      };

      // Handle spaces with non-breaking space for proper layout
      const displayChar = char === ' ' ? '\u00A0' : char;

      const textAtomData: TextAtomData = {
        text: displayChar,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          letterSpacing: `${params.letterSpacing}px`,
          display: 'inline-block',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      };

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: textAtomData,
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [effect],
      } as RenderableComponentData;
    },
  );

  // Text container with inline-flex for natural text flow
  const textContainer: RenderableComponentData = {
    id: 'cinematic-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'inline-flex items-baseline',
        style: {
          position: 'relative',
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents,
  } as RenderableComponentData;

  // Root container for positioning
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-fade-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${alignmentClasses[params.containerAlignment]} ${verticalClasses[params.verticalPosition]}`,
        style: {
          position: 'relative',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cinematic-character-fade-typo',
  title: 'Cinematic Character Fade-In Typokinetics',
  description:
    'Professional character-by-character fade-in animation with smoke-dissipating-in-reverse aesthetic. Features staggered opacity, translateY, blur, and scale animations with cinematic timing (150-200ms per character, 50ms stagger). Creates flowing cascade effect perfect for film credits and title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'character-animation',
    'fade-in',
    'cinematic',
    'film-credits',
    'title-sequence',
    'staggered',
    'cascade',
    'text-reveal',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Cinematic Title',
    fontSize: 48,
    textColor: '#FFFFFF',
    font: 'Inter:400',
    characterDuration: 180,
    staggerDelay: 50,
    opacityStart: 0,
    opacityEnd: 1,
    translateYStart: 10,
    translateYEnd: 0,
    blurStart: 4,
    blurEnd: 0,
    scaleStart: 0.95,
    scaleEnd: 1,
    easingType: 'ease-out',
    containerAlignment: 'center',
    verticalPosition: 'center',
    letterSpacing: 2,
  },
};

// Export preset
export const cinematicCharacterFadeTypoPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};