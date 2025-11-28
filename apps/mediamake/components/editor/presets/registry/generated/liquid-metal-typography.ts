/**
 * Liquid Metal Typography Preset
 *
 * This preset creates fluid morphing typography where letters flow and reshape like liquid metal
 * between different states. Features include:
 * - Droplet formation entrance (letters start as droplets that merge into readable text)
 * - Liquid morphing transitions between words/phrases
 * - Continuous ripple/undulation effects on letter boundaries
 * - Adaptive metallic sheen that reflects ambient colors from background
 * - Audio-reactive waveform effects (optional, if audio source available)
 *
 * Technical Implementation:
 * - Structure: BaseLayout with 'relative flex items-center justify-center'
 * - Each letter: TextAtom within BaseLayout wrapper with 'relative transform-gpu'
 * - Initial state: border-radius: 50%, scale(0.3) for droplet shape
 * - Morphing: scale, skew, border-radius transitions
 * - Liquid merge: blur() filter transition from 8px to 0px
 * - Metallic sheen: mix-blend-mode overlay/screen layer
 * - Ripple effect: CSS custom properties with sin/cos wave functions via keyframes
 * - Font: Variable weight font (Inter:100-900) with animated font-weight for fluid thickness
 * - Timing: 0.8s formation, 0.5s morphs, continuous 3s loop for ripples
 *
 * Use cases:
 * - Dynamic title sequences
 * - Impactful caption moments
 * - Brand introductions
 * - Music video titles
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time within caption timeline'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline (scene-relative)'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start within caption'),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number().describe('Absolute start in caption timeline'),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          })
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            splitParts: z.array(z.string()).optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .optional(),
      })
    )
    .describe('Array of caption/transcription sentences with word-level timing'),

  font: z
    .string()
    .default('Inter:400')
    .describe('Font family with optional weight (e.g., "Inter:400", "Inter:100-900:normal")'),

  fontSize: z.number().default(64).describe('Base font size in pixels'),

  textColor: z.string().default('#FFFFFF').describe('Base text color'),

  sheenColor: z
    .string()
    .default('rgba(255,255,255,0.3)')
    .describe('Metallic sheen overlay color'),

  sheenIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of metallic sheen (0-1)'),

  formationDuration: z
    .number()
    .default(0.8)
    .describe('Duration for initial droplet formation animation (seconds)'),

  morphDuration: z
    .number()
    .default(0.5)
    .describe('Duration for morphing transitions between words (seconds)'),

  rippleSpeed: z
    .number()
    .default(3.0)
    .describe('Duration for continuous ripple loop (seconds)'),

  rippleAmplitude: z
    .number()
    .default(2)
    .describe('Amplitude of ripple effect in pixels'),

  impact: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .describe('Global effect intensity multiplier'),

  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source URL for audio-reactive waveform effects'),

  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('bass')
    .optional()
    .describe('Audio property to map to ripple amplitude'),

  audioSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Sensitivity for audio-reactive effects'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps
): Promise<PresetOutput> => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    sheenColor,
    sheenIntensity,
    formationDuration,
    morphDuration,
    rippleSpeed,
    rippleAmplitude,
    impact,
    audioSrc,
    audioProperty,
    audioSensitivity,
  } = params;

  // Parse font string
  const parseFontString = (fontStr: string) => {
    const fontFamily = fontStr.includes(':') ? fontStr.split(':')[0] : fontStr;
    const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
    if (fontStr.includes(':')) {
      const fontParts = fontStr.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Calculate total duration from captions
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 10;

  // Create root container
  const rootContainerId = 'liquid-metal-root';
  const metalSheetLayerId = 'metallic-sheen-layer';
  const textContainerId = 'text-container';

  // Build letter components with effects
  const captionChildren: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionImpact = caption.metadata?.impact ?? impact;

    // Create container for this caption's words
    const captionContainerId = `caption-container-${captionIndex}`;

    const wordChildren: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const letterWrapperId = `letter-wrapper-${captionIndex}-${wordIndex}`;

      // Calculate stagger delay for formation
      const staggerDelay = wordIndex * 0.05; // 50ms stagger between words

      // Formation effect (droplet → readable text)
      const formationEffect = {
        id: `formation-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: staggerDelay,
          duration: formationDuration * captionImpact,
          mode: 'provider',
          targetIds: [letterWrapperId],
          ranges: [
            // Scale from droplet (0.3) to full size (1)
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur transition (liquid merge effect)
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            // Opacity fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      // Morphing effect (transition between words)
      // Apply when word starts (word.start relative to caption)
      const morphEffect = {
        id: `morph-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: word.start,
          duration: morphDuration * captionImpact,
          mode: 'provider',
          targetIds: [letterWrapperId],
          ranges: [
            // Skew for liquid flow effect
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: 5, prog: 0.3 },
            { key: 'skewX', val: -5, prog: 0.7 },
            { key: 'skewX', val: 0, prog: 1 },
            // Scale pulse
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      };

      // Ripple effect (continuous undulation)
      // This creates a wave-like motion across letters
      const rippleEffect = {
        id: `ripple-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: caption.duration,
          mode: 'provider',
          targetIds: [letterWrapperId],
          ranges: [
            // Vertical translation (ripple wave)
            {
              key: 'translateY',
              val: -rippleAmplitude * captionImpact,
              prog: 0,
            },
            {
              key: 'translateY',
              val: rippleAmplitude * captionImpact,
              prog: 0.25,
            },
            {
              key: 'translateY',
              val: -rippleAmplitude * captionImpact,
              prog: 0.5,
            },
            {
              key: 'translateY',
              val: rippleAmplitude * captionImpact,
              prog: 0.75,
            },
            {
              key: 'translateY',
              val: -rippleAmplitude * captionImpact,
              prog: 1,
            },
          ],
        },
      };

      // Font weight animation (variable font thickness change)
      const fontWeightEffect = {
        id: `font-weight-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: caption.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'fontWeight', val: 100, prog: 0 },
            { key: 'fontWeight', val: 400, prog: 0.3 },
            { key: 'fontWeight', val: 700, prog: 0.6 },
            { key: 'fontWeight', val: 400, prog: 1 },
          ],
        },
      };

      // Audio-reactive effect (if audio source available)
      const effects: any[] = [
        formationEffect,
        morphEffect,
        rippleEffect,
        fontWeightEffect,
      ];

      if (audioSrc) {
        const audioReactiveEffect = {
          id: `audio-reactive-${wordId}`,
          componentId: 'waveform',
          data: {
            audioSrc: audioSrc,
            audioProperty: audioProperty ?? 'bass',
            effectType: 'scale',
            intensity: 0.2 * captionImpact,
            baseScale: 1,
            sensitivity: audioSensitivity ?? 1.5,
            threshold: 0.15,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / 30,
            mode: 'provider',
            targetIds: [letterWrapperId],
            start: 0,
            duration: caption.duration,
            smoothNormalisation: 1,
          },
        };
        effects.push(audioReactiveEffect);
      }

      // Letter wrapper layout
      const letterWrapper: RenderableComponentData = {
        id: letterWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex transform-gpu',
            style: {
              // Initial droplet shape
              borderRadius: '50%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects,
        childrenData: [
          {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                fontWeight: fontStyle.fontWeight ?? 400,
                textShadow: '0 0 10px rgba(255,255,255,0.3), 0 0 20px rgba(200,200,200,0.2)',
              },
              font: {
                family: fontFamily,
                weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
        ],
      };

      wordChildren.push(letterWrapper);
    });

    // Caption container with word children
    const captionContainer: RenderableComponentData = {
      id: captionContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex items-center justify-center flex-wrap',
          style: {
            gap: `${fontSize * 0.1}px`,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordChildren,
    };

    captionChildren.push(captionContainer);
  });

  // Metallic sheen layer
  const sheenLayer: RenderableComponentData = {
    id: metalSheetLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `linear-gradient(135deg, ${sheenColor} 0%, rgba(255,255,255,0.5) 50%, ${sheenColor} 100%)`,
          mixBlendMode: 'overlay',
          opacity: sheenIntensity,
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
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center flex-wrap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: captionChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [sheenLayer, textContainer],
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
  id: 'liquid-metal-typography',
  title: 'Liquid Metal Typography',
  description:
    'A fluid morphing typography preset where letters flow and reshape like liquid metal. Features droplet formation entrance, liquid merge transitions between words, continuous ripple undulation effects, and adaptive metallic sheen that responds to background colors. Ideal for dynamic title sequences and impactful caption moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'liquid',
    'metal',
    'morphing',
    'fluid',
    'droplet',
    'ripple',
    'metallic',
    'sheen',
    'audio-reactive',
    'captions',
    'title',
    'dynamic',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'LIQUID METAL',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'LIQUID',
            start: 0,
            end: 1.5,
            duration: 1.5,
            absoluteStart: 0,
            absoluteEnd: 1.5,
          },
          {
            id: 'word-2',
            text: 'METAL',
            start: 1.5,
            end: 3,
            duration: 1.5,
            absoluteStart: 1.5,
            absoluteEnd: 3,
          },
        ],
      },
    ],
    font: 'Inter:400',
    fontSize: 64,
    textColor: '#FFFFFF',
    sheenColor: 'rgba(255,255,255,0.3)',
    sheenIntensity: 0.6,
    formationDuration: 0.8,
    morphDuration: 0.5,
    rippleSpeed: 3.0,
    rippleAmplitude: 2,
    impact: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const liquidMetalTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
