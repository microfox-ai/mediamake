/**
 * Wave Typography Preset
 *
 * Creates text that undulates like ocean waves with realistic fluid dynamics.
 * Text floats on water - each word bobs up and down with sine wave motion and phase offsets
 * creating a ripple effect across sentences. Features horizontal drift like gentle current,
 * splash moments for impactful words with scale and blur transitions, and emotion-responsive
 * wave amplitude (calm for neutral text, choppy for intense moments).
 *
 * Features:
 * - Sine wave motion with phase offsets for ripple effect
 * - Horizontal drift for gentle current simulation
 * - Splash effects for impactful words (scale + blur)
 * - Emotion-responsive amplitude (calm vs choppy waves)
 * - Optional audio-reactive waveform effects
 * - Hardware-accelerated transforms
 *
 * Use cases:
 * - Dynamic subtitle animations for water/ocean themes
 * - Fluid text motion synchronized with emotional content
 * - Audio-reactive text visualizations
 * - Creative social media content with wave effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
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
        metadata: z
          .object({
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word timing'),

  // Wave animation settings
  baseAmplitude: z
    .number()
    .min(5)
    .max(50)
    .default(15)
    .describe('Base wave amplitude in pixels (5-50)'),
  waveFrequency: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Wave frequency multiplier (0.5-3)'),
  phaseOffset: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.25)
    .describe('Phase offset between words (0.1-1, default 0.25 = PI/4)'),
  driftSpeed: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Horizontal drift speed in pixels (0-20)'),

  // Emotion-based amplitude modulation
  calmAmplitude: z
    .number()
    .min(5)
    .max(20)
    .default(8)
    .describe('Amplitude for calm/neutral sentiment (5-20)'),
  intenseAmplitude: z
    .number()
    .min(20)
    .max(50)
    .default(35)
    .describe('Amplitude for intense/emotional sentiment (20-50)'),

  // Splash effect settings
  splashEnabled: z
    .boolean()
    .default(true)
    .describe('Enable splash effects for impactful words'),
  splashScaleMax: z
    .number()
    .min(1.1)
    .max(1.5)
    .default(1.3)
    .describe('Maximum scale for splash effect (1.1-1.5)'),
  splashDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .describe('Duration of splash effect in seconds (0.2-1)'),
  splashBlurMax: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum blur during splash in pixels (0-5)'),

  // Audio-reactive settings
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive wave amplitude'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive effects'),
  audioSensitivity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Audio reactivity sensitivity (0.5-3)'),

  // Text styling
  fontSize: z
    .number()
    .min(24)
    .max(72)
    .default(48)
    .describe('Font size in pixels (24-72)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:700" for bold)'),
  textColor: z.string().default('#ffffff').describe('Text color'),
  textShadow: z
    .string()
    .default('0 2px 8px rgba(0,0,0,0.3)')
    .describe('Text shadow CSS'),
  gap: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Gap between words in pixels (0-20)'),

  // Timing
  sceneDuration: z
    .number()
    .optional()
    .describe('Scene duration in seconds (auto-calculated if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    baseAmplitude,
    waveFrequency,
    phaseOffset,
    driftSpeed,
    calmAmplitude,
    intenseAmplitude,
    splashEnabled,
    splashScaleMax,
    splashDuration,
    splashBlurMax,
    audioReactive,
    audioSrc,
    audioSensitivity,
    fontSize,
    fontFamily,
    textColor,
    textShadow,
    gap,
    sceneDuration,
  } = params;

  const fps = props.config?.fps || 30;

  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontParts = fontString.split(':');
    const family = fontParts[0];
    let fontWeight: number | undefined;
    let fontStyle: 'normal' | 'italic' = 'normal';

    if (fontParts.length > 2) {
      fontWeight = parseInt(fontParts[1], 10);
      fontStyle = fontParts[2] as 'normal' | 'italic';
    } else if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10);
    }

    return { family, fontWeight, fontStyle };
  };

  const fontConfig = parseFontString(fontFamily);

  // Helper: Calculate amplitude based on sentiment
  const getAmplitudeFromSentiment = (
    caption: TranscriptionSentence,
  ): number => {
    const sentiment = caption.metadata?.sentiment?.toLowerCase();
    const impact = caption.metadata?.impact ?? 1.0;

    let amplitude = baseAmplitude;

    if (sentiment === 'positive' || sentiment === 'negative') {
      // Emotional content = higher amplitude
      amplitude = intenseAmplitude;
    } else {
      // Neutral = calm amplitude
      amplitude = calmAmplitude;
    }

    // Modulate by impact
    amplitude *= impact;

    return amplitude;
  };

  // Helper: Check if word is impactful (for splash effects)
  const isImpactfulWord = (
    word: string,
    caption: TranscriptionSentence,
  ): boolean => {
    const keyword = caption.metadata?.keyword;
    if (keyword && word.toLowerCase() === keyword.toLowerCase()) {
      return true;
    }

    // Additional heuristics: all caps, exclamation marks, question marks
    if (word === word.toUpperCase() && word.length > 2) {
      return true;
    }
    if (word.includes('!') || word.includes('?')) {
      return true;
    }

    return false;
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const amplitude = getAmplitudeFromSentiment(caption);
    const words = caption.words;

    // Create word components with wave effects
    const wordComponents: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordId = `wave-word-${captionIndex}-${wordIndex}`;
        const isImpactful = splashEnabled && isImpactfulWord(word.text, caption);

        // Base wave effect: translateY (sine wave with phase offset)
        const phaseShift = wordIndex * phaseOffset * Math.PI;
        
        // Create wave animation with translateY
        const waveEffect = {
          id: `wave-effect-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: 0,
            duration: caption.duration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              // Sine wave motion: 4 keyframes for smooth wave cycle
              {
                key: 'translateY',
                val: Math.sin(phaseShift) * amplitude,
                prog: 0,
              },
              {
                key: 'translateY',
                val: Math.sin(phaseShift + Math.PI / 2) * amplitude,
                prog: 0.25,
              },
              {
                key: 'translateY',
                val: Math.sin(phaseShift + Math.PI) * amplitude,
                prog: 0.5,
              },
              {
                key: 'translateY',
                val: Math.sin(phaseShift + (3 * Math.PI) / 2) * amplitude,
                prog: 0.75,
              },
              {
                key: 'translateY',
                val: Math.sin(phaseShift + 2 * Math.PI) * amplitude,
                prog: 1,
              },
            ],
          },
        };

        // Drift effect: subtle horizontal movement
        const driftEffect = {
          id: `drift-effect-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: 0,
            duration: caption.duration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: driftSpeed, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        };

        const effects = [waveEffect, driftEffect];

        // Add splash effect for impactful words
        if (isImpactful) {
          const splashEffect = {
            id: `splash-effect-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: splashDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: [
                // Scale up quickly
                { key: 'scale', val: 1.0, prog: 0 },
                { key: 'scale', val: splashScaleMax, prog: 0.3 },
                { key: 'scale', val: 1.0, prog: 1 },
                // Blur during splash
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: `blur(${splashBlurMax}px)`, prog: 0.15 },
                { key: 'filter', val: 'blur(0px)', prog: 0.6 },
              ],
            },
          };

          effects.push(splashEffect);
        }

        // Add audio-reactive effect if enabled
        if (audioReactive && audioSrc) {
          const audioEffect = {
            id: `audio-effect-${wordId}`,
            componentId: 'waveform',
            data: {
              audioSrc,
              effectType: 'scale' as const,
              intensity: audioSensitivity * 0.2,
              baseScale: 1,
              sensitivity: audioSensitivity,
              threshold: 0.1,
              audioProperty: 'bass' as const,
              numberOfSamples: 128,
              useFrequencyData: true,
              mode: 'provider' as const,
              targetIds: [wordId],
              start: 0,
              duration: caption.duration,
              smoothNormalisation: 1,
            },
          };

          effects.push(audioEffect);
        }

        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize,
              color: textColor,
              fontWeight: fontConfig.fontWeight,
              fontStyle: fontConfig.fontStyle,
              textShadow,
            },
            font: {
              family: fontConfig.family,
              weights: fontConfig.fontWeight
                ? [fontConfig.fontWeight.toString()]
                : ['400'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects,
        } as RenderableComponentData;
      },
    );

    // Caption container
    const captionContainer: RenderableComponentData = {
      id: `wave-caption-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex flex-wrap items-center justify-center gap-${gap} transform-gpu`,
          style: {
            minHeight: '100%',
            padding: '20px',
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

    captionContainers.push(captionContainer);
  });

  // Calculate total scene duration
  const lastCaption = captions[captions.length - 1];
  const calculatedDuration = lastCaption
    ? lastCaption.absoluteEnd
    : sceneDuration || 10;
  const finalDuration = sceneDuration || calculatedDuration;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'wave-typography-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
        style: {
          minHeight: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: finalDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'wave-typography',
  title: 'Wave Typography Preset',
  description:
    'Text undulates like ocean waves with realistic fluid dynamics. Words bob up and down with sine wave motion and phase offsets creating a ripple effect across sentences. Features horizontal drift like gentle current, splash moments for impactful words with scale and blur transitions, and emotion-responsive wave amplitude (calm for neutral text, choppy for intense moments). Supports optional audio-reactive waveform effects mapping bass frequencies to wave amplitude.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'wave',
    'fluid',
    'ocean',
    'animated',
    'subtitles',
    'captions',
    'audio-reactive',
    'emotion',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
            confidence: 0.99,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
            confidence: 0.99,
          },
        ],
        metadata: {
          impact: 1.0,
          sentiment: 'neutral',
        },
      },
    ],
    baseAmplitude: 15,
    waveFrequency: 1.5,
    phaseOffset: 0.25,
    driftSpeed: 5,
    calmAmplitude: 8,
    intenseAmplitude: 35,
    splashEnabled: true,
    splashScaleMax: 1.3,
    splashDuration: 0.4,
    splashBlurMax: 2,
    audioReactive: false,
    audioSensitivity: 1.5,
    fontSize: 48,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    gap: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const waveTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
