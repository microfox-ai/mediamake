/**
 * Audio-Reactive Typokinetic Text Preset
 *
 * This preset creates an audio-reactive typography effect where text words scale
 * dynamically with audio beats and intensity. Words pulse between 0.9-1.0 scale
 * with audio waveform, hitting up to 1.05 on strong beats. A subtle glow effect
 * intensifies with audio peaks, creating a living, breathing text effect synchronized
 * to the soundtrack.
 *
 * Features:
 * - Base scale animation (0.9 → 1.0 over 0.4s)
 * - Audio-reactive scale modulation (0-0.15 additional scale on beats)
 * - Bass-frequency reactive scaling (sensitivity=0.3, threshold=0.5)
 * - Dynamic glow effect that pulses with audio amplitude
 * - Word-level audio reactions for natural text dynamics
 * - GPU-accelerated transforms with center origin
 * - Caption-based word timing with smooth fade transitions
 *
 * Use cases:
 * - Music video lyrics that pulse with the beat
 * - Audio-reactive title sequences
 * - Podcast captions that breathe with voice intensity
 * - Dynamic subtitle overlays for music content
 * - Beat-synchronized typography animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  WaveformEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// Parameter Schema
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
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  audio: z
    .object({
      src: z.string().describe('Audio source URL or ref:componentId'),
      volume: z.number().min(0).max(2).default(1).optional(),
      start: z.number().default(0).optional(),
    })
    .describe('Audio configuration for reactive effects'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),

  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),

  baseScaleDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .describe('Duration of base scale animation (0.9 → 1.0) in seconds'),

  waveformSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.3)
    .describe('Sensitivity of audio-reactive scaling'),

  waveformThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Minimum audio intensity threshold to trigger scaling'),

  scaleRange: z
    .tuple([z.number(), z.number()])
    .default([0, 0.15])
    .describe('Additional scale range added by audio (min, max)'),

  glowBaseShadow: z
    .string()
    .default('0 0 10px rgba(255,255,255,0.3)')
    .describe('Base text shadow for subtle glow'),

  glowIntenseShadow: z
    .string()
    .default('0 0 40px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6)')
    .describe('Intense text shadow on audio peaks'),

  glowSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.4)
    .describe('Sensitivity of glow effect to audio'),

  containerPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text container'),

  wordSpacing: z
    .string()
    .default('0.5em')
    .describe('Spacing between words (CSS gap value)'),
});

// Preset Execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    audio,
    fontSize,
    fontFamily,
    textColor,
    baseScaleDuration,
    waveformSensitivity,
    waveformThreshold,
    scaleRange,
    glowBaseShadow,
    glowIntenseShadow,
    glowSensitivity,
    containerPosition,
    wordSpacing,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const family = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    let fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { family, fontStyle };
  };

  const { family, fontStyle } = parseFontString(fontFamily);

  // Vertical alignment classes
  const alignmentClasses = {
    top: 'justify-start pt-12',
    center: 'justify-center',
    bottom: 'justify-end pb-12',
  };

  // Build children for each caption
  const captionChildren: RenderableComponentData[] = [];

  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const captionId = `caption-${captionIndex}`;
    const words = caption.words || [];

    // Build word components
    const wordChildren: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordLayoutId = `${captionId}-word-layout-${wordIndex}`;
        const wordTextId = `${captionId}-word-text-${wordIndex}`;

        // Base scale effect (0.9 → 1.0)
        const baseScaleEffect: GenericEffectData = {
          type: 'ease-out',
          start: word.start,
          duration: baseScaleDuration,
          mode: 'provider',
          targetIds: [wordLayoutId],
          ranges: [
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        };

        // Waveform scale effect (audio-reactive)
        const waveformScaleEffect: WaveformEffectData = {
          audioSrc: audio.src,
          audioProperty: 'bass',
          effectType: 'scale',
          baseScale: 1,
          intensity: scaleRange[1],
          sensitivity: waveformSensitivity,
          threshold: waveformThreshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [wordLayoutId],
          start: word.start,
          duration: word.duration,
          smoothNormalisation: 1,
        };

        // Glow effect (audio-reactive textShadow)
        const glowEffect: WaveformEffectData = {
          audioSrc: audio.src,
          audioProperty: 'bass',
          effectType: 'custom' as any,
          customProperty: 'textShadow' as any,
          valueRange: [glowBaseShadow, glowIntenseShadow] as any,
          sensitivity: glowSensitivity,
          threshold: waveformThreshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [wordTextId],
          start: word.start,
          duration: word.duration,
          smoothNormalisation: 1,
        };

        // Fade in effect
        const fadeInEffect: GenericEffectData = {
          type: 'ease-out',
          start: word.start,
          duration: 0.2,
          mode: 'provider',
          targetIds: [wordLayoutId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        };

        // Fade out effect
        const fadeOutDuration = 0.2;
        const fadeOutStart = word.start + word.duration - fadeOutDuration;
        const fadeOutEffect: GenericEffectData = {
          type: 'ease-in',
          start: fadeOutStart,
          duration: fadeOutDuration,
          mode: 'provider',
          targetIds: [wordLayoutId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        };

        // Word layout container
        const wordLayout: RenderableComponentData = {
          id: wordLayoutId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative',
              style: {
                transformOrigin: 'center',
              },
            },
          },
          context: {
            timing: {
              start: word.start,
              duration: word.duration,
            },
          },
          childrenData: [
            {
              id: wordTextId,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: word.text,
                style: {
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  fontWeight: fontStyle.fontWeight || 700,
                  fontStyle: fontStyle.fontStyle || 'normal',
                },
                font: {
                  family,
                  weights: fontStyle.fontWeight
                    ? [fontStyle.fontWeight.toString()]
                    : ['700'],
                  display: 'swap',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: word.duration,
                },
              },
            },
          ],
          effects: [
            {
              id: `${wordLayoutId}-base-scale`,
              componentId: 'generic',
              data: baseScaleEffect,
            },
            {
              id: `${wordLayoutId}-waveform-scale`,
              componentId: 'waveform',
              data: waveformScaleEffect,
            },
            {
              id: `${wordTextId}-glow`,
              componentId: 'waveform',
              data: glowEffect,
            },
            {
              id: `${wordLayoutId}-fade-in`,
              componentId: 'generic',
              data: fadeInEffect,
            },
            {
              id: `${wordLayoutId}-fade-out`,
              componentId: 'generic',
              data: fadeOutEffect,
            },
          ],
        };

        return wordLayout;
      },
    );

    // Caption container (words-container for this sentence)
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex flex-wrap items-center justify-center px-8 ${alignmentClasses[containerPosition]}`,
          style: {
            gap: wordSpacing,
            maxWidth: '90%',
            margin: '0 auto',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordChildren as RenderableComponentData[],
    };

    captionChildren.push(captionContainer);
  });

  // Audio atom
  const audioAtom: RenderableComponentData = {
    id: 'audio-reactive-audio',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: audio.volume ?? 1,
      startFrom: audio.start ?? 0,
    },
    context: {
      timing: {
        start: 0,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-typokinetic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-reactive-audio',
      },
    },
    childrenData: [audioAtom, ...captionChildren] as RenderableComponentData[],
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'audioReactiveTypokinetic',
  title: 'Audio-Reactive Typokinetic Text',
  description:
    'Audio-reactive word animations with beat-synced scaling (0.9-1.0 base, up to 1.05 on beats) and intensity-modulated glow effects. Words pulse with audio waveform using bass frequency detection, creating living, breathing text synchronized to soundtrack.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'reactive',
    'typography',
    'beat-sync',
    'waveform',
    'glow',
    'kinetic',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Feel the rhythm',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Feel',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            id: 'word-2',
            text: 'the',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.2,
            absoluteEnd: 1.2,
            duration: 0.4,
          },
          {
            id: 'word-3',
            text: 'rhythm',
            start: 1.2,
            absoluteStart: 1.2,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.3,
          },
        ],
      },
    ],
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
      start: 0,
    },
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    baseScaleDuration: 0.4,
    waveformSensitivity: 0.3,
    waveformThreshold: 0.5,
    scaleRange: [0, 0.15],
    glowBaseShadow: '0 0 10px rgba(255,255,255,0.3)',
    glowIntenseShadow:
      '0 0 40px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.6)',
    glowSensitivity: 0.4,
    containerPosition: 'center',
    wordSpacing: '0.5em',
  },
};

// Export Preset
export const audioReactiveTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
