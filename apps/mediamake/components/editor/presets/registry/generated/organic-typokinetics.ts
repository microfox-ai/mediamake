/**
 * Organic Typokinetics Preset
 *
 * This preset creates handwritten text appearing in real-time with organic, physics-based motion.
 * Words fade in with diagonal motion from bottom-left, spring easing, variable fade duration based
 * on word length, subtle rotation, and soft glow pulse effect simulating ink settling on paper.
 *
 * Features:
 * - **Diagonal Motion**: Words slide in from bottom-left (-15px, 15px) to final position (0, 0)
 * - **Spring Easing**: Natural, physics-based motion for hand-drawn authenticity
 * - **Variable Duration**: Fade duration (600-900ms) based on word length to simulate writing speed
 * - **Subtle Rotation**: -2deg to 0deg rotation during appearance for organic feel
 * - **Glow Pulse Effect**: Soft glow effect that pulses once after each word appears (ink settling)
 * - **Handwriting Font**: Uses 'Dancing Script' or similar script font for authenticity
 * - **Hardware Acceleration**: Optimized with transform3d for smooth performance
 *
 * Use cases:
 * - Creating handwritten text animations
 * - Simulating real-time writing effects
 * - Adding organic, human-touch typography to videos
 * - Building storytelling sequences with authentic handwritten feel
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Parameter Schema ---

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
          })
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      })
    )
    .describe('Array of caption sentences with word-level timing for handwritten text effect'),
  
  font: z
    .string()
    .default('Dancing Script:400')
    .describe('Font family with optional weight and style (e.g., "Dancing Script:400", "Shadows Into Light:400")'),
  
  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(32)
    .describe('Font size in pixels for the handwritten text'),
  
  textColor: z
    .string()
    .default('#2c3e50')
    .describe('Text color for the handwritten text'),
  
  baseDuration: z
    .number()
    .min(400)
    .max(2000)
    .default(600)
    .describe('Base fade duration in milliseconds (min duration before word length adjustment)'),
  
  durationPerChar: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Additional duration per character in milliseconds to simulate writing speed'),
  
  glowColor: z
    .string()
    .default('rgba(44, 62, 80, 0.3)')
    .describe('Glow effect color (rgba format) for ink settling effect'),
  
  glowMaxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Maximum glow blur in pixels at peak of pulse'),
  
  glowDelay: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .describe('Delay in milliseconds before glow pulse starts after main animation'),
  
  glowDuration: z
    .number()
    .min(100)
    .max(1000)
    .default(400)
    .describe('Duration of glow pulse effect in milliseconds'),
  
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .describe('Padding around the text container in pixels'),
  
  lineHeight: z
    .number()
    .min(1)
    .max(3)
    .default(1.6)
    .describe('Line height multiplier for text spacing'),
  
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Spacing between words in pixels'),
});

// --- Preset Execution Function ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    baseDuration,
    durationPerChar,
    glowColor,
    glowMaxBlur,
    glowDelay,
    glowDuration,
    containerPadding,
    lineHeight,
    wordSpacing,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const parseFontString = (fontString: string): { family: string; weight: string } => {
    if (fontString.includes(':')) {
      const [family, weight] = fontString.split(':');
      return { family, weight: weight || '400' };
    }
    return { family: fontString, weight: '400' };
  };

  const { family: fontFamily, weight: fontWeight } = parseFontString(font);

  // Calculate duration based on word length
  const calculateWordDuration = (wordLength: number): number => {
    return (baseDuration + wordLength * durationPerChar) / 1000; // Convert to seconds
  };

  // Build caption containers with handwritten text effect
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    // Create word components
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `organic-word-${captionIndex}-${wordIndex}`;
      const wordDuration = calculateWordDuration(word.text.length);

      // Main animation effect: diagonal motion + fade + rotation
      const mainEffect = {
        id: `main-effect-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: word.start, // Relative to caption start
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Opacity: 0 → 1
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // TranslateX: -15 → 0
            { key: 'translateX', val: -15, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            // TranslateY: 15 → 0
            { key: 'translateY', val: 15, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Rotate: -2deg → 0deg
            { key: 'rotate', val: -2, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      };

      // Glow pulse effect: triggered after main animation
      const glowPulseEffect = {
        id: `glow-pulse-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: word.start + wordDuration + glowDelay / 1000, // Delay after main animation
          duration: glowDuration / 1000,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // TextShadow: 0 → peak → 0 (pulse)
            { key: 'textShadow', val: `0 0 0px ${glowColor}`, prog: 0 },
            { key: 'textShadow', val: `0 0 ${glowMaxBlur}px ${glowColor}`, prog: 0.5 },
            { key: 'textShadow', val: `0 0 0px ${glowColor}`, prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontWeight,
            marginRight: `${wordSpacing}px`,
            transform: 'translate3d(0, 0, 0)', // Hardware acceleration
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            display: 'swap',
            preload: true,
          },
        },
        context: {
          timing: {
            start: 0, // All words start together (use sentence-level timing)
            duration: caption.duration, // All words last for full sentence
          },
        },
        effects: [mainEffect, glowPulseEffect],
      } as RenderableComponentData;
    });

    // Caption container
    return {
      id: `organic-caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-baseline justify-start',
          style: {
            padding: `${containerPadding}px`,
            lineHeight: lineHeight,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer = {
    id: 'organic-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-start justify-start',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: captionContainers,
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
  id: 'organic-typokinetics',
  title: 'Organic Typokinetics Preset',
  description:
    'Handwritten text appearing in real-time with organic, physics-based motion. Words fade in with diagonal motion from bottom-left, spring easing, variable fade duration based on word length, subtle rotation, and soft glow pulse effect simulating ink settling on paper.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'handwritten',
    'organic',
    'kinetic',
    'captions',
    'animation',
    'spring',
    'glow',
    'real-time',
    'writing',
    'script',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world, this is handwritten text',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'world,',
            start: 0.5,
            absoluteStart: 0.5,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 0.5,
          },
          {
            id: 'word-3',
            text: 'this',
            start: 1.0,
            absoluteStart: 1.0,
            end: 1.4,
            absoluteEnd: 1.4,
            duration: 0.4,
          },
          {
            id: 'word-4',
            text: 'is',
            start: 1.4,
            absoluteStart: 1.4,
            end: 1.6,
            absoluteEnd: 1.6,
            duration: 0.2,
          },
          {
            id: 'word-5',
            text: 'handwritten',
            start: 1.6,
            absoluteStart: 1.6,
            end: 2.3,
            absoluteEnd: 2.3,
            duration: 0.7,
          },
          {
            id: 'word-6',
            text: 'text',
            start: 2.3,
            absoluteStart: 2.3,
            end: 3.0,
            absoluteEnd: 3.0,
            duration: 0.7,
          },
        ],
      },
    ],
    font: 'Dancing Script:400',
    fontSize: 32,
    textColor: '#2c3e50',
    baseDuration: 600,
    durationPerChar: 50,
    glowColor: 'rgba(44, 62, 80, 0.3)',
    glowMaxBlur: 4,
    glowDelay: 100,
    glowDuration: 400,
    containerPadding: 32,
    lineHeight: 1.6,
    wordSpacing: 8,
  },
};

// --- Export Preset ---

export const organicTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
