/**
 * Typokinetics Momentum Typography Preset
 *
 * Motion graphics kinetic typography where text appears to be 'typed' but with momentum.
 * Each character slides in from the right with decreasing velocity, creating a typewriter
 * effect with physics. As each letter arrives, it pushes slight vibrations through the
 * already-placed letters, creating a connected motion system.
 *
 * Features:
 * - **Physics-Based Entry**: Characters slide in with momentum (ease-out timing)
 * - **Connected Motion System**: Each arriving character triggers micro-vibrations on previous letters
 * - **Letter Spacing Animation**: Letters expand from tight to normal spacing during entry
 * - **Multi-Line Support**: Handles both single words and multi-line text with flex-wrap
 * - **Dynamic Structure**: Structure is generated algorithmically based on text length
 *
 * Technical Details:
 * - Two-layer effect system: primary slide-in + secondary vibration effects
 * - 0.06s stagger per character
 * - 0.4s entry duration per character
 * - 0.2s vibration duration on impact
 * - Vibrations propagate through all previous characters
 *
 * Use cases:
 * - Documentary titles with weight and inertia
 * - Kinetic typography sequences for video editing
 * - Title cards with connected motion systems
 * - Dynamic text reveals with physics-based momentum
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with kinetic momentum effect'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  fontSize: z
    .number()
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  duration: z
    .number()
    .optional()
    .describe(
      'Total duration of the composition in seconds (auto-calculated if not provided)',
    ),
  entryDuration: z
    .number()
    .default(0.4)
    .optional()
    .describe('Duration of each character entry animation in seconds'),
  characterStagger: z
    .number()
    .default(0.06)
    .optional()
    .describe('Time between each character entry in seconds'),
  vibrationDuration: z
    .number()
    .default(0.2)
    .optional()
    .describe('Duration of vibration effect on existing characters in seconds'),
  slideDistance: z
    .number()
    .default(50)
    .optional()
    .describe('Distance characters slide in from (in pixels)'),
  vibrationIntensity: z
    .number()
    .default(2)
    .optional()
    .describe('Intensity of vibration oscillation in pixels'),
  letterSpacingStart: z
    .number()
    .default(0.1)
    .optional()
    .describe('Starting letter spacing during entry (in em)'),
  containerPadding: z
    .number()
    .default(40)
    .optional()
    .describe('Container padding in pixels'),
  wordGap: z
    .number()
    .default(0.2)
    .optional()
    .describe('Gap between words in em'),
});

// --- Preset Execution ---

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
    fontStyle.fontWeight = 700; // Default bold weight
  }

  // Timing constants
  const entryDuration = params.entryDuration ?? 0.4;
  const characterStagger = params.characterStagger ?? 0.06;
  const vibrationDuration = params.vibrationDuration ?? 0.2;
  const slideDistance = params.slideDistance ?? 50;
  const vibrationIntensity = params.vibrationIntensity ?? 2;
  const letterSpacingStart = params.letterSpacingStart ?? 0.1;

  // Split text into words (preserve whitespace)
  const words = params.text.split(/(\s+)/);

  // Build character data with global indices
  interface CharacterData {
    char: string;
    wordIndex: number;
    charIndex: number;
    globalIndex: number;
    isSpace: boolean;
  }

  const allCharacters: CharacterData[] = [];
  let globalCharIndex = 0;

  words.forEach((word, wordIndex) => {
    const isSpace = /^\s+$/.test(word);
    for (let i = 0; i < word.length; i++) {
      allCharacters.push({
        char: word[i],
        wordIndex,
        charIndex: i,
        globalIndex: globalCharIndex,
        isSpace,
      });
      globalCharIndex++;
    }
  });

  // Calculate total duration
  const lastCharStartTime = (allCharacters.length - 1) * characterStagger;
  const totalDuration =
    params.duration ?? lastCharStartTime + entryDuration + 0.5;

  // Generate structure: word containers with character wrappers
  const wordContainers: RenderableComponentData[] = [];

  words.forEach((word, wordIndex) => {
    // Skip empty words
    if (word.length === 0) return;

    const isSpace = /^\s+$/.test(word);

    // For spaces, use a simple spacer div
    if (isSpace) {
      wordContainers.push({
        id: `word-${wordIndex}-spacer`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block',
            style: {
              width: `${params.wordGap ?? 0.2}em`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData);
      return;
    }

    // For regular words, create character wrappers
    const characterWrappers: RenderableComponentData[] = [];

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const charData = allCharacters.find(
        (c) => c.wordIndex === wordIndex && c.charIndex === i,
      );
      if (!charData) continue;

      const globalIndex = charData.globalIndex;
      const charStartTime = globalIndex * characterStagger;

      const charWrapperId = `char-wrapper-${wordIndex}-${i}`;
      const charTextId = `char-text-${wordIndex}-${i}`;

      // PRIMARY EFFECT: Slide-in with letter spacing
      const primaryEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0, // Relative to character wrapper timing
        duration: entryDuration,
        mode: 'provider',
        targetIds: [charWrapperId],
        ranges: [
          // Slide from right
          { key: 'translateX', val: slideDistance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          // Letter spacing expansion
          { key: 'letterSpacing', val: `${letterSpacingStart}em`, prog: 0 },
          { key: 'letterSpacing', val: 'normal', prog: 1 },
          // Fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      };

      // SECONDARY EFFECTS: Vibrations on all previous characters
      const vibrationEffects: any[] = [];

      // For each previous character, create a vibration effect
      for (let prevIndex = 0; prevIndex < globalIndex; prevIndex++) {
        const prevCharData = allCharacters[prevIndex];
        if (!prevCharData || prevCharData.isSpace) continue;

        const prevCharWrapperId = `char-wrapper-${prevCharData.wordIndex}-${prevCharData.charIndex}`;
        const prevCharStartTime = prevIndex * characterStagger;

        // Calculate relative start time for vibration
        // Vibration starts when current character arrives
        const vibrationStartTime = charStartTime - prevCharStartTime;

        const vibrationEffect: GenericEffectData = {
          type: 'linear',
          start: vibrationStartTime,
          duration: vibrationDuration,
          mode: 'provider',
          targetIds: [prevCharWrapperId],
          ranges: [
            // Oscillate horizontally
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -vibrationIntensity, prog: 0.25 },
            { key: 'translateX', val: vibrationIntensity, prog: 0.5 },
            { key: 'translateX', val: -vibrationIntensity / 2, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        };

        vibrationEffects.push({
          id: `vibration-${charWrapperId}-on-${prevCharWrapperId}`,
          componentId: 'generic',
          data: vibrationEffect,
        });
      }

      // Create character wrapper with primary effect
      const characterWrapper: RenderableComponentData = {
        id: charWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block transform-gpu',
            style: {
              transformOrigin: 'center center',
            },
          },
        },
        context: {
          timing: {
            start: charStartTime,
            duration: totalDuration - charStartTime,
          },
        },
        effects: [
          {
            id: `primary-${charWrapperId}`,
            componentId: 'generic',
            data: primaryEffect,
          },
          ...vibrationEffects,
        ],
        childrenData: [
          {
            id: charTextId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
              style: {
                fontSize: params.fontSize ?? 72,
                color: params.textColor ?? '#FFFFFF',
                fontWeight: fontStyle.fontWeight,
                fontStyle: fontStyle.fontStyle,
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
                duration: totalDuration - charStartTime,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      characterWrappers.push(characterWrapper);
    }

    // Create word container
    const wordContainer: RenderableComponentData = {
      id: `word-${wordIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-block',
          style: {
            marginRight: `${params.wordGap ?? 0.2}em`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: characterWrappers,
    } as RenderableComponentData;

    wordContainers.push(wordContainer);
  });

  // Root container with flex-wrap for multi-line support
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-momentum-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap items-baseline',
        style: {
          gap: '0',
          padding: `${params.containerPadding ?? 40}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-momentum',
  title: 'Typokinetics Momentum Typography',
  description:
    'Motion graphics kinetic typography preset where text appears with physics-based momentum. Characters slide in from the right with decreasing velocity, creating a typewriter effect with weight and inertia. Each arriving letter triggers micro-vibrations through already-placed letters, simulating connected motion systems perfect for documentary titles and dynamic text sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'momentum',
    'physics',
    'typewriter',
    'documentary',
    'title',
    'motion-graphics',
    'vibration',
    'connected-motion',
    'slide',
    'cascade',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MOMENTUM',
    textColor: '#FFFFFF',
    fontSize: 72,
    font: 'Inter:700',
    entryDuration: 0.4,
    characterStagger: 0.06,
    vibrationDuration: 0.2,
    slideDistance: 50,
    vibrationIntensity: 2,
    letterSpacingStart: 0.1,
    containerPadding: 40,
    wordGap: 0.2,
  },
};

// --- Export ---

export const typokineticsMomentumPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
