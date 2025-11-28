/**
 * Audio-Reactive Equalizer Typography Preset
 *
 * This preset creates kinetic typography inspired by audio waveform visualization,
 * where words respond to vocal emphasis like VU meters in a recording studio. Words
 * scale vertically (scaleY) based on emphasis levels, creating a bouncing equalizer
 * effect. High-emphasis words shoot up quickly with a spring easing, then settle back
 * down with a gentle bounce. Each word is treated as a frequency band that responds
 * to the 'volume' of emphasis in the caption data.
 *
 * Features:
 * - Vertical scaling (scaleY) based on emphasis levels (1.0 to 1.5 for high impact)
 * - Spring easing with bouncy feel (tension: 200, friction: 20)
 * - Subtle horizontal scaling (scaleX: 0.95 to 1.05) for dimensionality
 * - Color shift from neutral (text-gray-100) to warm tones (text-yellow-400) during peaks
 * - Baseline alignment like an equalizer (items-end justify-center)
 * - Audio-reactive behavior when audio source is available
 * - Uses translateY alongside scale to create vertical movement without layout shift
 *
 * Use cases:
 * - Creating audio-reactive typography for music videos
 * - Building dynamic subtitle displays that respond to vocal emphasis
 * - Adding energetic text effects synchronized with audio beats
 * - Creating professional equalizer-style caption animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time (relative to 0)'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Duration in seconds'),
        absoluteStart: z
          .number()
          .describe('Absolute start in caption timeline (scene-relative)'),
        absoluteEnd: z
          .number()
          .describe('Absolute end in caption timeline (scene-relative)'),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number().describe('Relative to caption start'),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number().describe('Absolute in caption timeline'),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional().describe('Effect intensity (0.1-3.0)'),
            keyword: z.string().optional(),
            sentiment: z
              .enum(['positive', 'negative', 'neutral'])
              .optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with words'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#E5E7EB')
    .describe('Base text color (neutral tone, e.g., text-gray-100)'),

  emphasisColor: z
    .string()
    .default('#FBBF24')
    .describe('Emphasis color for peaks (warm tone, e.g., text-yellow-400)'),

  wordSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(12)
    .describe('Gap between words in pixels'),

  baseImpact: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .describe('Global impact multiplier for all effects'),

  scaleIntensity: z
    .number()
    .min(1.0)
    .max(2.0)
    .default(1.5)
    .describe('Maximum scaleY value for high-emphasis words'),

  springTension: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Spring tension for bouncy animation'),

  springFriction: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Spring friction for bouncy animation'),

  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source URL for true audio-reactive behavior (ref:componentId or URL)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    emphasisColor,
    wordSpacing,
    baseImpact,
    scaleIntensity,
    springTension,
    springFriction,
    audioSrc,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
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
  }

  // Helper: Parse RGB color to individual components
  const parseColor = (color: string): { r: number; g: number; b: number } => {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    return { r: 255, g: 255, b: 255 };
  };

  const baseColorRGB = parseColor(textColor);
  const emphasisColorRGB = parseColor(emphasisColor);

  // Create caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const captionImpact = caption.metadata?.impact ?? baseImpact;

      // Create word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;

          // Calculate emphasis based on word confidence (if available) or position
          const wordConfidence = word.confidence ?? 0.8;
          const emphasisLevel = wordConfidence * captionImpact;

          // Scale range: base 1.0 to scaleIntensity (e.g., 1.0 to 1.5)
          const maxScale = 1.0 + (scaleIntensity - 1.0) * emphasisLevel;
          const minScale = 0.95;

          // Horizontal scale for dimensionality
          const maxScaleX = 1.05;
          const minScaleX = 0.95;

          // translateY to create vertical movement without layout shift
          const maxTranslateY = -20 * emphasisLevel; // Negative = move up
          const minTranslateY = 0;

          // Color interpolation
          const colorProgress = emphasisLevel;
          const interpolatedR = Math.round(
            baseColorRGB.r +
              (emphasisColorRGB.r - baseColorRGB.r) * colorProgress,
          );
          const interpolatedG = Math.round(
            baseColorRGB.g +
              (emphasisColorRGB.g - baseColorRGB.g) * colorProgress,
          );
          const interpolatedB = Math.round(
            baseColorRGB.b +
              (emphasisColorRGB.b - baseColorRGB.b) * colorProgress,
          );
          const peakColor = `rgb(${interpolatedR},${interpolatedG},${interpolatedB})`;

          // Create animation effect
          const effect = {
            id: `equalizer-effect-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: word.start,
              duration: word.duration,
              mode: 'provider',
              targetIds: [wordId],
              props: {
                config: {
                  tension: springTension,
                  friction: springFriction,
                },
              },
              ranges: [
                // scaleY animation (vertical scaling)
                { key: 'scaleY', val: minScale, prog: 0 },
                { key: 'scaleY', val: maxScale, prog: 0.3 },
                { key: 'scaleY', val: 1.0, prog: 1 },
                // scaleX animation (horizontal scaling for dimensionality)
                { key: 'scaleX', val: minScaleX, prog: 0 },
                { key: 'scaleX', val: maxScaleX, prog: 0.3 },
                { key: 'scaleX', val: 1.0, prog: 1 },
                // translateY animation (vertical movement)
                { key: 'translateY', val: minTranslateY, prog: 0 },
                { key: 'translateY', val: maxTranslateY, prog: 0.3 },
                { key: 'translateY', val: minTranslateY, prog: 1 },
                // Color animation (neutral to warm)
                { key: 'color', val: textColor, prog: 0 },
                { key: 'color', val: peakColor, prog: 0.3 },
                { key: 'color', val: textColor, prog: 1 },
              ],
            },
          };

          return {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                ...fontStyle,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                transformOrigin: 'bottom',
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
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [effect],
          } as RenderableComponentData;
        },
      );

      // Create caption container
      return {
        id: `caption-container-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex items-end justify-center',
            style: {
              gap: `${wordSpacing}px`,
              height: '100%',
            },
          },
          repeatChildrenProps: {
            className: 'relative transform-gpu origin-bottom',
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
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-audio-equalizer-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-end justify-center gap-3 h-full',
        style: {
          position: 'absolute',
          inset: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioSrc ? 'Audio' : undefined,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'kinetic-audio-equalizer-typography',
  title: 'Audio-Reactive Equalizer Typography',
  description:
    'Kinetic typography preset inspired by audio waveform visualization where words respond to vocal emphasis like VU meters in a recording studio. Words scale vertically (scaleY) based on emphasis levels creating a bouncing equalizer effect with spring easing, subtle horizontal scaling for dimensionality, and color shifts from neutral to warm tones during peak emphasis moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'audio-reactive',
    'equalizer',
    'waveform',
    'vu-meter',
    'spring',
    'emphasis',
    'captions',
    'subtitles',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            text: 'Hello',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
            confidence: 0.95,
          },
          {
            text: 'world',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
            confidence: 0.9,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#E5E7EB',
    emphasisColor: '#FBBF24',
    wordSpacing: 12,
    baseImpact: 1.0,
    scaleIntensity: 1.5,
    springTension: 200,
    springFriction: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const kineticAudioEqualizerTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
