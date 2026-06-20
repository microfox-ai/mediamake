/**
 * Cyberpunk HUD Typokinetics Preset
 *
 * A futuristic typokinetics preset channeling cyberpunk interface aesthetics with holographic text projections,
 * fiber optic light trails, digital scan lines, and audio-reactive data corruption effects. Words flash in with
 * motion streaks, feature cyan/magenta holographic edge highlights with 3D perspective, and transform into
 * binary/hex during bass hits. Includes pulsing grid background and subtle drift animation for holographic instability.
 *
 * Features:
 * - Holographic 3D text with cyan/magenta chromatic aberration
 * - Fiber optic light trail effects on word appearance
 * - Digital scan lines overlay
 * - Audio-reactive data corruption (text to binary/hex transformation)
 * - Pulsing geometric grid background
 * - Subtle holographic drift animation
 * - Tech-focused font and styling
 *
 * Use cases:
 * - Cyberpunk-themed videos
 * - Tech product demos
 * - Futuristic UI overlays
 * - Digital/cyber aesthetic content
 * - Music videos with electronic/synthwave themes
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
  TextAtomData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
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
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive effects'),

  fontSize: z
    .number()
    .default(48)
    .describe('Base font size for text in pixels'),

  textColor: z
    .string()
    .default('#00FFFF')
    .describe('Primary text color (cyan by default)'),

  corruptionThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe(
      'Bass intensity threshold for data corruption effect (0-1, higher = less frequent)',
    ),

  corruptionSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .describe('Sensitivity multiplier for corruption effect'),

  glowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(0.8)
    .describe('Intensity of holographic glow effect'),

  driftSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Speed multiplier for holographic drift animation'),

  gridOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of background grid (0-1)'),

  scanlineSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed multiplier for scan line animation'),
});

// Preset execution
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { captions, audioSrc } = params;

  // Helper: Convert text to binary representation
  const textToBinary = (text: string): string => {
    return text
      .split('')
      .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
      .join(' ');
  };

  // Helper: Convert text to hex representation
  const textToHex = (text: string): string => {
    return text
      .split('')
      .map((char) => '0x' + char.charCodeAt(0).toString(16).toUpperCase())
      .join(' ');
  };

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(
          ...captions.map((caption) => caption.absoluteEnd),
        )
      : 10;

  // Build caption components
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `cyberpunk-caption-${captionIndex}`;
    const wordsContainerId = `${captionId}-words-container`;

    // Build word components
    const wordComponents: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;
      const wordTextId = `${wordId}-text`;
      const wordBinaryId = `${wordId}-binary`;
      const wordContainerId = `${wordId}-container`;

      // Determine if this word should use enhanced effects (tech keywords)
      const isTechKeyword = /^(cyber|data|system|code|net|digital|tech|hack|matrix|byte)/i.test(
        word.text,
      );
      const enhancementMultiplier = isTechKeyword ? 1.5 : 1;

      // Create word container with original and binary text layers
      const wordContainer: RenderableComponentData = {
        id: wordContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {},
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [
          // Original text (holographic style)
          {
            id: wordTextId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              className: 'font-mono',
              style: {
                fontSize: params.fontSize,
                fontWeight: '700',
                color: params.textColor,
                transform: 'perspective(500px) rotateY(5deg)',
                textShadow: `-2px 0 #ff00ff, 2px 0 #00ffff, 0 0 ${20 * params.glowIntensity}px rgba(0,255,255,${0.8 * params.glowIntensity}), 0 0 ${40 * params.glowIntensity}px rgba(0,255,255,${0.4 * params.glowIntensity})`,
                marginRight: '0.5em',
              },
              font: {
                family: 'JetBrains Mono',
                weights: ['700'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
          // Binary/Hex text layer (initially hidden)
          {
            id: wordBinaryId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: Math.random() > 0.5 ? textToBinary(word.text) : textToHex(word.text),
              className: 'font-mono absolute inset-0',
              style: {
                fontSize: params.fontSize * 0.6,
                fontWeight: '700',
                color: '#00FF00',
                opacity: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              },
              font: {
                family: 'JetBrains Mono',
                weights: ['700'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [],
      };

      // Light trail fade-in effect (word appearance)
      const lightTrailEffect: GenericEffectData = {
        type: 'ease-out',
        start: word.start,
        duration: 0.15 * enhancementMultiplier,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateX', val: -30 * enhancementMultiplier, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          {
            key: 'filter',
            val: `blur(4px) drop-shadow(0 0 20px ${params.textColor})`,
            prog: 0,
          },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      };

      wordContainer.effects!.push({
        id: `${wordId}-light-trail`,
        componentId: 'generic',
        data: lightTrailEffect,
      });

      // Holographic pulse effect (subtle scale)
      const holographicPulseEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: word.start,
        duration: word.duration,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.02, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      wordContainer.effects!.push({
        id: `${wordId}-pulse`,
        componentId: 'generic',
        data: holographicPulseEffect,
      });

      // Holographic drift animation (continuous throughout word)
      const driftEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: word.start,
        duration: 3 / params.driftSpeed,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 2, prog: 0.25 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: -2, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -1, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      wordContainer.effects!.push({
        id: `${wordId}-drift`,
        componentId: 'generic',
        data: driftEffect,
      });

      // Audio-reactive data corruption effect (bass-driven)
      if (audioSrc) {
        const corruptionEffect: WaveformEffectData = {
          audioSrc,
          audioProperty: 'bass',
          effectType: 'scale',
          intensity: 0,
          baseScale: 0,
          sensitivity: params.corruptionSensitivity,
          threshold: params.corruptionThreshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [wordBinaryId],
          start: word.start,
          duration: word.duration,
          smoothNormalisation: 0.5,
          minValue: 0,
          maxValue: 1,
        };

        // Use waveform effect to drive binary text opacity
        wordContainer.effects!.push({
          id: `${wordId}-corruption`,
          componentId: 'waveform',
          data: corruptionEffect,
        });

        // Additional effect to hide original text during corruption
        const hideOriginalEffect: WaveformEffectData = {
          audioSrc,
          audioProperty: 'bass',
          effectType: 'scale',
          intensity: 0,
          baseScale: 1,
          sensitivity: params.corruptionSensitivity,
          threshold: params.corruptionThreshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [wordTextId],
          start: word.start,
          duration: word.duration,
          smoothNormalisation: 0.5,
          minValue: 1,
          maxValue: 0,
        };

        wordContainer.effects!.push({
          id: `${wordId}-hide-original`,
          componentId: 'waveform',
          data: hideOriginalEffect,
        });
      }

      wordComponents.push(wordContainer);
    });

    // Caption container with words
    const captionContainer: RenderableComponentData = {
      id: wordsContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center gap-2',
          style: {
            maxWidth: '90%',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents as RenderableComponentData[],
      effects: [],
    };

    captionComponents.push(captionContainer);
  });

  // Build grid background
  const gridBackground: RenderableComponentData = {
    id: 'cyberpunk-grid-background',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundImage:
            'linear-gradient(to right, rgba(0,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: params.gridOpacity,
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
    effects: [],
  };

  // Audio-reactive grid pulse
  if (audioSrc) {
    const gridPulseEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'treble',
      effectType: 'scale',
      intensity: 0.1,
      baseScale: 1,
      sensitivity: 1,
      threshold: 0.3,
      numberOfSamples: 256,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: ['cyberpunk-grid-background'],
      start: 0,
      duration: totalDuration,
      smoothNormalisation: 1,
    };

    gridBackground.effects!.push({
      id: 'grid-pulse',
      componentId: 'waveform',
      data: gridPulseEffect,
    });
  }

  // Build scan lines layer
  const scanLinesLayer: RenderableComponentData = {
    id: 'cyberpunk-scan-lines',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
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
    effects: [
      {
        id: 'scanline-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 2 / params.scanlineSpeed,
          mode: 'provider',
          targetIds: ['cyberpunk-scan-lines'],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'cyberpunk-text-container',
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
        duration: totalDuration,
      },
    },
    childrenData: captionComponents as RenderableComponentData[],
    effects: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cyberpunk-hud-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      gridBackground,
      scanLinesLayer,
      textContainer,
    ] as RenderableComponentData[],
    effects: [],
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
  id: 'cyberpunk-hud-typokinetics',
  title: 'Cyberpunk HUD Typokinetics',
  description:
    'A futuristic typokinetics preset channeling cyberpunk interface aesthetics with holographic text projections, fiber optic light trails, digital scan lines, and audio-reactive data corruption effects. Words flash in with motion streaks, feature cyan/magenta holographic edge highlights with 3D perspective, and transform into binary/hex during bass hits. Includes pulsing grid background and subtle drift animation for holographic instability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'cyberpunk',
    'holographic',
    'futuristic',
    'hud',
    'tech',
    'audio-reactive',
    'glitch',
    'data-corruption',
    'light-trails',
    'scan-lines',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    fontSize: 48,
    textColor: '#00FFFF',
    corruptionThreshold: 0.6,
    corruptionSensitivity: 2,
    glowIntensity: 0.8,
    driftSpeed: 0.5,
    gridOpacity: 0.2,
    scanlineSpeed: 2,
  },
};

// Export preset
export const cyberpunkHudTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
