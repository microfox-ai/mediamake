/**
 * Audio-Reactive Sunburst Typography Preset
 *
 * This preset creates a dynamic sunburst typography visualization where words are arranged
 * in concentric circles and respond to audio frequencies. The visual combines music visualizer
 * aesthetics with data visualization structure through ring-based layouts and waveform effects.
 *
 * Features:
 * - **Concentric Ring Structure**: Words arranged in inner, middle, and outer rings
 * - **Audio-Reactive Rings**: Each ring responds to different audio frequencies (bass, mid, treble)
 * - **Beat-Synchronized Reveals**: Words appear precisely on detected audio beats
 * - **Waveform Effects Per Ring**: Inner (scale), middle (brightness), outer (blur)
 * - **Impact-Based Distribution**: Words distributed across rings by metadata.impact score
 * - **Persistent Glow Effects**: Category words have glows that intensify on beats
 * - **Performance Optimized**: Limited concurrent waveform effects, will-change transforms
 *
 * Use cases:
 * - Creating audio-reactive data visualizations
 * - Building music visualizer interfaces with text
 * - Dynamic typography that responds to music
 * - Beat-synchronized word reveals for music videos
 * - Audio-driven circular text layouts
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
  TranscriptionWord,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL or ref:componentId'),
      volume: z
        .number()
        .min(0)
        .max(2)
        .default(1)
        .optional()
        .describe('Audio volume (0-2, default: 1)'),
    })
    .describe('Audio configuration for waveform synchronization'),

  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z
              .number()
              .min(0)
              .max(3)
              .optional()
              .describe('Impact score for ring distribution (high = inner, low = outer)'),
            keyword: z.string().optional(),
            splitParts: z.array(z.string()).optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Caption data with metadata.impact for ring distribution'),

  beatIntensityThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Minimum beat intensity for word reveals (0-1, default: 0.7)'),

  innerRing: z
    .object({
      sensitivity: z
        .number()
        .min(0.1)
        .max(5)
        .default(0.3)
        .optional()
        .describe('Bass sensitivity for scale pulse (default: 0.3)'),
      baseScale: z
        .number()
        .min(0.5)
        .max(2)
        .default(1)
        .optional()
        .describe('Base scale value (default: 1)'),
      scaleRange: z
        .number()
        .min(0.1)
        .max(1)
        .default(0.2)
        .optional()
        .describe('Scale pulse range (default: 0.2)'),
      fontSize: z
        .number()
        .min(10)
        .max(100)
        .default(48)
        .optional()
        .describe('Font size for inner ring words'),
      radius: z
        .number()
        .min(50)
        .max(500)
        .default(150)
        .optional()
        .describe('Radius of inner ring (px)'),
    })
    .optional()
    .describe('Inner ring configuration (bass-reactive scale)'),

  middleRing: z
    .object({
      sensitivity: z
        .number()
        .min(0.1)
        .max(5)
        .default(0.4)
        .optional()
        .describe('Mid frequency sensitivity for brightness pulse (default: 0.4)'),
      baseBrightness: z
        .number()
        .min(0.5)
        .max(2)
        .default(1)
        .optional()
        .describe('Base brightness value (default: 1)'),
      fontSize: z
        .number()
        .min(10)
        .max(100)
        .default(36)
        .optional()
        .describe('Font size for middle ring words'),
      radius: z
        .number()
        .min(100)
        .max(700)
        .default(250)
        .optional()
        .describe('Radius of middle ring (px)'),
    })
    .optional()
    .describe('Middle ring configuration (mid-reactive brightness)'),

  outerRing: z
    .object({
      sensitivity: z
        .number()
        .min(0.1)
        .max(5)
        .default(0.2)
        .optional()
        .describe('Treble sensitivity for blur pulse (default: 0.2)'),
      baseBlur: z
        .number()
        .min(0)
        .max(10)
        .default(0)
        .optional()
        .describe('Base blur value (default: 0)'),
      blurRange: z
        .number()
        .min(0)
        .max(10)
        .default(3)
        .optional()
        .describe('Blur pulse range (default: 3)'),
      fontSize: z
        .number()
        .min(10)
        .max(100)
        .default(28)
        .optional()
        .describe('Font size for outer ring words'),
      radius: z
        .number()
        .min(200)
        .max(1000)
        .default(350)
        .optional()
        .describe('Radius of outer ring (px)'),
    })
    .optional()
    .describe('Outer ring configuration (treble-reactive blur)'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base text color for all words'),

  glowColor: z
    .string()
    .default('#FF6B6B')
    .optional()
    .describe('Glow color for persistent glow effects'),

  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
});

// Preset execution
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:700');

  // Fetch audio analysis for beat detection
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {},
    };
  }

  // Filter impactful beats (intensity > threshold)
  const impactfulBeats = analysis.filter(
    (beat: any) => beat.intensity >= (params.beatIntensityThreshold || 0.7),
  );

  // Sort beats by timestamp
  impactfulBeats.sort((a: any, b: any) => a.timestamp - b.timestamp);

  // Distribute words across rings based on metadata.impact
  const distributeWordsToRings = (captions: TranscriptionSentence[]) => {
    const innerWords: Array<{ word: TranscriptionWord; caption: TranscriptionSentence }> = [];
    const middleWords: Array<{ word: TranscriptionWord; caption: TranscriptionSentence }> = [];
    const outerWords: Array<{ word: TranscriptionWord; caption: TranscriptionSentence }> = [];

    captions.forEach((caption) => {
      const impact = caption.metadata?.impact ?? 0.5;
      caption.words.forEach((word) => {
        if (impact > 0.7) {
          innerWords.push({ word, caption });
        } else if (impact > 0.4) {
          middleWords.push({ word, caption });
        } else {
          outerWords.push({ word, caption });
        }
      });
    });

    return { innerWords, middleWords, outerWords };
  };

  const { innerWords, middleWords, outerWords } = distributeWordsToRings(params.captions);

  // Map words to beat timestamps for reveals
  const mapWordsToBeatTimestamps = (
    words: Array<{ word: TranscriptionWord; caption: TranscriptionSentence }>,
  ) => {
    return words.map((item, index) => {
      const beatIndex = Math.min(index, impactfulBeats.length - 1);
      const beat = impactfulBeats[beatIndex];
      return {
        ...item,
        revealTime: beat?.timestamp || item.word.absoluteStart,
        beatIntensity: beat?.intensity || 0.5,
      };
    });
  };

  const innerWordsWithBeats = mapWordsToBeatTimestamps(innerWords);
  const middleWordsWithBeats = mapWordsToBeatTimestamps(middleWords);
  const outerWordsWithBeats = mapWordsToBeatTimestamps(outerWords);

  // Create word components for each ring
  const createRingWords = (
    wordsWithBeats: Array<{
      word: TranscriptionWord;
      caption: TranscriptionSentence;
      revealTime: number;
      beatIntensity: number;
    }>,
    radius: number,
    fontSize: number,
    ringId: string,
  ) => {
    const wordCount = wordsWithBeats.length;
    const angleStep = (2 * Math.PI) / Math.max(wordCount, 1);

    return wordsWithBeats.map((item, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const rotation = (angle * 180) / Math.PI + 90; // Rotate text to follow circle

      const wordId = `${ringId}-word-${index}`;

      // Calculate glow intensity based on beat intensity
      const glowIntensity = 5 + item.beatIntensity * 10;

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: item.word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: params.textColor || '#FFFFFF',
            fontWeight: fontStyle.fontWeight || 700,
            position: 'absolute' as const,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rotation}deg)`,
            filter: `drop-shadow(0 0 ${glowIntensity}px ${params.glowColor || '#FF6B6B'})`,
            willChange: 'transform',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: item.revealTime,
            duration: durationInSeconds - item.revealTime,
          },
        },
        effects: [
          {
            id: `${wordId}-fade-in`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.5,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      };
    });
  };

  // Create inner ring words
  const innerRingConfig = params.innerRing || {};
  const innerRingWords = createRingWords(
    innerWordsWithBeats,
    innerRingConfig.radius || 150,
    innerRingConfig.fontSize || 48,
    'inner-ring',
  );

  // Create middle ring words
  const middleRingConfig = params.middleRing || {};
  const middleRingWords = createRingWords(
    middleWordsWithBeats,
    middleRingConfig.radius || 250,
    middleRingConfig.fontSize || 36,
    'middle-ring',
  );

  // Create outer ring words
  const outerRingConfig = params.outerRing || {};
  const outerRingWords = createRingWords(
    outerWordsWithBeats,
    outerRingConfig.radius || 350,
    outerRingConfig.fontSize || 28,
    'outer-ring',
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'sunburst-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: [
      // Audio source
      {
        id: 'audio-source',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: params.audio.src,
          volume: params.audio.volume || 1,
        },
        context: {
          timing: {
            start: 0,
          },
        },
      } as RenderableComponentData,
      // Inner ring container with bass-reactive scale effect
      {
        id: 'inner-ring-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: 'inner-ring-bass-scale',
            componentId: 'waveform',
            data: {
              audioSrc: params.audio.src,
              audioProperty: 'bass',
              effectType: 'scale',
              sensitivity: innerRingConfig.sensitivity || 0.3,
              baseScale: innerRingConfig.baseScale || 1,
              intensity: innerRingConfig.scaleRange || 0.2,
              numberOfSamples: 128,
              useFrequencyData: true,
              mode: 'provider',
              targetIds: ['inner-ring-words-container'],
              start: 0,
              fitDurationTo: 'audio-source',
              smoothNormalisation: 1,
            },
          },
        ],
        childrenData: [
          {
            id: 'inner-ring-words-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute',
                style: {
                  width: `${(innerRingConfig.radius || 150) * 2}px`,
                  height: `${(innerRingConfig.radius || 150) * 2}px`,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                fitDurationTo: 'audio-source',
              },
            },
            childrenData: innerRingWords as RenderableComponentData[],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
      // Middle ring container with mid-reactive brightness effect
      {
        id: 'middle-ring-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: 'middle-ring-mid-exposure',
            componentId: 'waveform',
            data: {
              audioSrc: params.audio.src,
              audioProperty: 'mid',
              effectType: 'exposure',
              sensitivity: middleRingConfig.sensitivity || 0.4,
              baseBrightness: middleRingConfig.baseBrightness || 1,
              numberOfSamples: 128,
              useFrequencyData: true,
              mode: 'provider',
              targetIds: ['middle-ring-words-container'],
              start: 0,
              fitDurationTo: 'audio-source',
              smoothNormalisation: 1,
            },
          },
        ],
        childrenData: [
          {
            id: 'middle-ring-words-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute',
                style: {
                  width: `${(middleRingConfig.radius || 250) * 2}px`,
                  height: `${(middleRingConfig.radius || 250) * 2}px`,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                fitDurationTo: 'audio-source',
              },
            },
            childrenData: middleRingWords as RenderableComponentData[],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
      // Outer ring container with treble-reactive blur effect
      {
        id: 'outer-ring-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: 'outer-ring-treble-blur',
            componentId: 'waveform',
            data: {
              audioSrc: params.audio.src,
              audioProperty: 'treble',
              effectType: 'blur',
              sensitivity: outerRingConfig.sensitivity || 0.2,
              baseValue: outerRingConfig.baseBlur || 0,
              intensity: outerRingConfig.blurRange || 3,
              numberOfSamples: 128,
              useFrequencyData: true,
              mode: 'provider',
              targetIds: ['outer-ring-words-container'],
              start: 0,
              fitDurationTo: 'audio-source',
              smoothNormalisation: 1,
            },
          },
        ],
        childrenData: [
          {
            id: 'outer-ring-words-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute',
                style: {
                  width: `${(outerRingConfig.radius || 350) * 2}px`,
                  height: `${(outerRingConfig.radius || 350) * 2}px`,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                fitDurationTo: 'audio-source',
              },
            },
            childrenData: outerRingWords as RenderableComponentData[],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'audioReactiveSunburstTypography',
  title: 'Audio-Reactive Sunburst Typography',
  description:
    'Beat-synchronized concentric ring typography where words pulse and reveal on detected beats. Bass affects inner ring scale, mid frequencies affect middle ring brightness, treble affects outer ring blur. Combines music visualizer aesthetics with data visualization structure through waveform effects per ring level.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'typography',
    'waveform',
    'beat-detection',
    'circular-layout',
    'music-visualizer',
    'data-visualization',
  ],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
    },
    captions: [],
    beatIntensityThreshold: 0.7,
    innerRing: {
      sensitivity: 0.3,
      baseScale: 1,
      scaleRange: 0.2,
      fontSize: 48,
      radius: 150,
    },
    middleRing: {
      sensitivity: 0.4,
      baseBrightness: 1,
      fontSize: 36,
      radius: 250,
    },
    outerRing: {
      sensitivity: 0.2,
      baseBlur: 0,
      blurRange: 3,
      fontSize: 28,
      radius: 350,
    },
    textColor: '#FFFFFF',
    glowColor: '#FF6B6B',
    font: 'Inter:700',
  },
};

// Export preset
export const audioReactiveSunburstTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
