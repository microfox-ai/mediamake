/**
 * Documentary Focus Breathing Caption Preset
 *
 * This preset creates a documentary-style caption effect that mimics camera rack focus,
 * where emphasized words "breathe" into focus (scale 1.0 → 1.12) with sharp edges and
 * slight upward drift (translateY: -2px), while non-emphasized words subtly shrink
 * (scale 0.95) and fade (opacity 0.8) to create a shallow depth-of-field effect.
 *
 * Features:
 * - **Focus Breathing**: Emphasized words expand organically (scale 1.0 → 1.12)
 * - **Depth Simulation**: Non-emphasized words shrink and fade (scale 0.95, opacity 0.8)
 * - **Importance Drift**: Emphasized words float upward (translateY: -2px)
 * - **Smooth Transitions**: Long duration (1000ms) with ease-out timing
 * - **Text Sharpness**: Subtle text-shadow on emphasized words for focus simulation
 * - **Flexible Layout**: Horizontal flex layout with baseline alignment and relaxed leading
 * - **Performance**: Uses transform-gpu for hardware acceleration
 *
 * Technical Details:
 * - All words use sentence-level timing to maintain stable layout kinetics
 * - Effects start at word.start (relative to caption) with 1000ms duration
 * - Emphasized words: scale 1.0→1.12, translateY 0→-2px, sharp text-shadow
 * - Non-emphasized words: scale 1.0→0.95, opacity 1.0→0.8
 * - Uses provider mode effects with targetIds for direct component targeting
 *
 * Use cases:
 * - Documentary-style narration captions
 * - Educational content with keyword emphasis
 * - Interview transcriptions with speaker emphasis
 * - Storytelling content with natural pacing
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  trackId: z
    .string()
    .default('documentary-focus-breathing')
    .describe('Unique track ID for this caption preset'),

  captions: z
    .array(z.any())
    .describe(
      'Array of caption objects with text, start, duration, absoluteStart, words array, and optional metadata.emphasis for word-level emphasis',
    ),

  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(32)
    .describe('Base font size in pixels'),

  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family (format: "FontName:weight:style" or "FontName:weight" or "FontName")',
    ),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color for all words'),

  emphasizedColor: z
    .string()
    .optional()
    .describe(
      'Optional color override for emphasized words (defaults to textColor)',
    ),

  wordSpacing: z
    .number()
    .min(4)
    .max(40)
    .default(8)
    .describe('Gap between words in pixels'),

  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .describe('Padding around caption container in pixels'),

  positionY: z
    .enum(['top', 'center', 'bottom'])
    .default('bottom')
    .describe('Vertical position of captions on screen'),

  offsetY: z
    .number()
    .default(80)
    .describe(
      'Vertical offset from position in pixels (positive = move down from top/center, move up from bottom)',
    ),

  transitionDuration: z
    .number()
    .min(300)
    .max(3000)
    .default(1000)
    .describe('Duration of focus breathing transition in milliseconds'),

  emphasizedScale: z
    .number()
    .min(1.0)
    .max(1.5)
    .default(1.12)
    .describe('Scale multiplier for emphasized words (1.0 = no scale)'),

  nonEmphasizedScale: z
    .number()
    .min(0.7)
    .max(1.0)
    .default(0.95)
    .describe('Scale multiplier for non-emphasized words (1.0 = no scale)'),

  nonEmphasizedOpacity: z
    .number()
    .min(0.3)
    .max(1.0)
    .default(0.8)
    .describe('Opacity for non-emphasized words (1.0 = fully opaque)'),

  driftDistance: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe(
      'Distance emphasized words drift upward in pixels (0 = no drift)',
    ),

  textShadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Intensity of text-shadow on emphasized words (0 = none, 1 = strong)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string
  const fontString = params.fontFamily || 'Inter';
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

  // Calculate position styles
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      right: 0,
    };

    switch (params.positionY) {
      case 'top':
        return { ...base, top: `${params.offsetY}px` };
      case 'center':
        return { ...base, top: '50%', transform: `translateY(-50%)` };
      case 'bottom':
        return { ...base, bottom: `${params.offsetY}px` };
    }
  };

  const positionStyles = getPositionStyles();

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const words = caption.words || [];

      // Build word components
      const wordComponents: RenderableComponentData[] = words.map(
        (word, wordIndex) => {
          const wordId = `${params.trackId}-caption-${captionIndex}-word-${wordIndex}`;

          // Check if word is emphasized (from caption.metadata or word metadata)
          const isEmphasized =
            (caption as any).metadata?.emphasis?.[wordIndex] ?? false;

          // Effect timing: relative to caption start
          const effectStart = word.start; // Relative to caption
          const effectDuration = params.transitionDuration / 1000; // Convert ms to seconds

          // Create effect based on emphasis
          const wordEffect: GenericEffectData = isEmphasized
            ? {
                // Emphasized: scale up, drift up, sharp shadow
                type: 'ease-out',
                start: effectStart,
                duration: effectDuration,
                mode: 'provider',
                targetIds: [wordId],
                ranges: [
                  { key: 'scale', val: 1.0, prog: 0 },
                  { key: 'scale', val: params.emphasizedScale, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: -params.driftDistance, prog: 1 },
                ],
              }
            : {
                // Non-emphasized: scale down, fade out
                type: 'ease-out',
                start: effectStart,
                duration: effectDuration,
                mode: 'provider',
                targetIds: [wordId],
                ranges: [
                  { key: 'scale', val: 1.0, prog: 0 },
                  { key: 'scale', val: params.nonEmphasizedScale, prog: 1 },
                  { key: 'opacity', val: 1.0, prog: 0 },
                  { key: 'opacity', val: params.nonEmphasizedOpacity, prog: 1 },
                ],
              };

          const effect = {
            id: `${wordId}-effect`,
            componentId: 'generic',
            data: wordEffect,
          };

          // Calculate text-shadow for emphasized words
          const textShadow =
            isEmphasized && params.textShadowIntensity > 0
              ? `0 0 ${Math.round(params.textShadowIntensity * 8)}px rgba(255,255,255,${params.textShadowIntensity * 0.6})`
              : undefined;

          const wordColor = isEmphasized
            ? params.emphasizedColor || params.textColor
            : params.textColor;

          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize,
                color: wordColor,
                ...fontStyle,
                textShadow,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            },
            context: {
              timing: {
                start: 0, // All words use sentence-level timing
                duration: caption.duration,
              },
            },
            effects: [effect],
          };

          return wordComponent;
        },
      );

      // Caption container with flex layout
      const captionContainer: RenderableComponentData = {
        id: `${params.trackId}-caption-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'flex flex-wrap items-baseline justify-start leading-relaxed',
            style: {
              gap: `${params.wordSpacing}px`,
              padding: `${params.containerPadding}px`,
              ...positionStyles,
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
      };

      return captionContainer;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionContainers,
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'documentary-focus-breathing-caption',
  title: 'Documentary Focus Breathing Caption',
  description:
    'Documentary-style caption preset with gentle "focus breathing" effect that mimics camera rack focus. Emphasized words slowly expand (scale 1.0 to 1.12) and float upward slightly (translateY: -2px) with sharp text-shadow, while non-emphasized words subtly shrink (scale 0.95) and fade (opacity 0.8), creating an organic shallow depth-of-field effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'subtitles',
    'documentary',
    'focus',
    'breathing',
    'emphasis',
    'rack-focus',
    'cinematic',
    'organic',
  ],
  defaultInputParams: {
    trackId: 'documentary-focus-breathing',
    captions: [
      {
        id: 'caption-1',
        text: 'This is a sample caption with emphasis',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-0',
            text: 'This',
            start: 0,
            end: 0.4,
            duration: 0.4,
            absoluteStart: 0,
            absoluteEnd: 0.4,
          },
          {
            id: 'word-1',
            text: 'is',
            start: 0.4,
            end: 0.7,
            duration: 0.3,
            absoluteStart: 0.4,
            absoluteEnd: 0.7,
          },
          {
            id: 'word-2',
            text: 'a',
            start: 0.7,
            end: 0.9,
            duration: 0.2,
            absoluteStart: 0.7,
            absoluteEnd: 0.9,
          },
          {
            id: 'word-3',
            text: 'sample',
            start: 0.9,
            end: 1.4,
            duration: 0.5,
            absoluteStart: 0.9,
            absoluteEnd: 1.4,
          },
          {
            id: 'word-4',
            text: 'caption',
            start: 1.4,
            end: 2.0,
            duration: 0.6,
            absoluteStart: 1.4,
            absoluteEnd: 2.0,
          },
          {
            id: 'word-5',
            text: 'with',
            start: 2.0,
            end: 2.3,
            duration: 0.3,
            absoluteStart: 2.0,
            absoluteEnd: 2.3,
          },
          {
            id: 'word-6',
            text: 'emphasis',
            start: 2.3,
            end: 3.0,
            duration: 0.7,
            absoluteStart: 2.3,
            absoluteEnd: 3.0,
          },
        ],
        metadata: {
          emphasis: [false, false, false, true, true, false, true],
        },
      },
    ],
    fontSize: 32,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    wordSpacing: 8,
    containerPadding: 32,
    positionY: 'bottom',
    offsetY: 80,
    transitionDuration: 1000,
    emphasizedScale: 1.12,
    nonEmphasizedScale: 0.95,
    nonEmphasizedOpacity: 0.8,
    driftDistance: 2,
    textShadowIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const documentaryFocusBreathingCaptionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
