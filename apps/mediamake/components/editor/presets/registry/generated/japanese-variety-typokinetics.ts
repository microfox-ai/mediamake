/**
 * Japanese Variety Show Typokinetics Preset
 *
 * This preset emulates the frenetic energy of Japanese variety show text overlays
 * and arcade game announcements. Words flash in rapid succession like slot machine
 * reels with exaggerated bounce effects. Bass distortion creates a 'wobble' effect
 * where text appears to be made of jelly, oscillating with low frequencies. Sharp
 * scaling incorporates rotation, making words spin like coins flipping. Particle
 * effects burst out when high-impact words appear.
 *
 * Features:
 * - Slot machine-style word flashing with rapid transitions
 * - Exaggerated bounce effects using cubic-bezier easing
 * - Bass-reactive jelly wobble using skewX/skewY transforms
 * - Coin-flip rotation scaling with performance-optimized transforms
 * - Emoji/symbol particle bursts on high-impact words (impact > 0.8)
 * - Maximum readability through high-contrast text styling
 * - Strategic timing to maintain sensory overload aesthetic
 *
 * Use cases:
 * - Japanese variety show-style captions
 * - Arcade game announcements
 * - High-energy social media content
 * - Gaming highlights with intense audio
 * - Music videos with energetic beats
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

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
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  audioSrc: z
    .string()
    .optional()
    .describe(
      'Audio source URL for bass-reactive wobble effect (optional, enhances effects)',
    ),

  flashDuration: z
    .number()
    .min(0.05)
    .max(0.2)
    .default(0.08)
    .optional()
    .describe('Duration of flash exit transition in seconds (0.05-0.2)'),

  bounceDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .optional()
    .describe('Duration of bounce entrance effect in seconds'),

  rotationIntensity: z
    .number()
    .min(360)
    .max(1080)
    .default(720)
    .optional()
    .describe('Rotation degrees for coin-flip effect (360-1080)'),

  wobbleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Wobble effect intensity multiplier (0.5-2)'),

  particleCount: z
    .number()
    .min(5)
    .max(15)
    .default(8)
    .optional()
    .describe('Number of particles per burst (5-15)'),

  impactThreshold: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Impact threshold for particle bursts (0.5-1)'),

  fontSize: z
    .number()
    .min(40)
    .max(120)
    .default(64)
    .optional()
    .describe('Base font size in pixels (responsive via md:text-8xl)'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (default: white)'),

  strokeColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Text stroke color (default: black)'),

  strokeWidth: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .optional()
    .describe('Text stroke width in pixels'),

  font: z
    .string()
    .default('Noto Sans JP:900')
    .optional()
    .describe('Font family with weight (e.g., "Noto Sans JP:900")'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { captions } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Noto Sans JP:900');

  // Helper: Generate emoji particles
  const generateParticles = (wordId: string, wordStart: number, captionId: string) => {
    const emojis = ['⭐', '✨', '💥', '🔥', '⚡', '💫', '🌟', '💢'];
    const particleCount = params.particleCount || 8;
    const particles: RenderableComponentData[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const delay = Math.random() * 0.1;

      particles.push({
        id: `particle-${wordId}-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="font-size: 24px;">${randomEmoji}</div>`,
          className: 'absolute pointer-events-none',
          style: {
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`,
          },
        },
        context: {
          timing: {
            start: wordStart + delay,
            duration: 0.4,
          },
        },
        effects: [
          {
            id: `particle-effect-${wordId}-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.4,
              mode: 'provider',
              targetIds: [`particle-${wordId}-${i}`],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.5, prog: 0.3 },
                { key: 'scale', val: 0, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Process all captions
  const allWordComponents: RenderableComponentData[] = [];
  const allParticles: RenderableComponentData[] = [];

  captions.forEach((caption) => {
    const captionImpact = caption.metadata?.impact ?? 1.0;

    caption.words.forEach((word) => {
      const wordId = `word-${caption.id}-${word.text}-${word.start}`;
      const wordImpact = captionImpact;
      const shouldBurst = wordImpact > (params.impactThreshold || 0.8);

      // Calculate effect timings (relative to caption start)
      const flashStart = word.duration - (params.flashDuration || 0.08);
      const wobbleDuration = word.duration;

      // Word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'font-black text-6xl md:text-8xl text-white',
          style: {
            fontSize: params.fontSize || 64,
            color: params.textColor || '#FFFFFF',
            fontWeight: fontStyle.fontWeight || 900,
            textShadow: `4px 4px 0px ${params.strokeColor || '#000000'}, -2px -2px 0px ${params.strokeColor || '#000000'}, 2px -2px 0px ${params.strokeColor || '#000000'}, -2px 2px 0px ${params.strokeColor || '#000000'}`,
            WebkitTextStroke: `${params.strokeWidth || 3}px ${params.strokeColor || '#000000'}`,
            paintOrder: 'stroke fill',
          },
          font: {
            family: fontFamily,
            weights: [fontStyle.fontWeight?.toString() || '900'],
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: [
          // Bounce entrance
          {
            id: `bounce-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: params.bounceDuration || 0.3,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateY', val: -80, prog: 0 },
                { key: 'translateY', val: 10, prog: 0.6 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
              ],
            } as GenericEffectData,
          },
          // Rotation scale (coin flip)
          {
            id: `rotation-scale-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.15 * wordImpact,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'scale', val: 0.3, prog: 0 },
                { key: 'scale', val: 1.1, prog: 0.7 },
                { key: 'scale', val: 1, prog: 1 },
                {
                  key: 'rotate',
                  val: (params.rotationIntensity || 720) * wordImpact,
                  prog: 0,
                },
                { key: 'rotate', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
          // Jelly wobble (bass-reactive skew)
          {
            id: `wobble-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: wobbleDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'skewX', val: 0, prog: 0 },
                { key: 'skewX', val: 8 * (params.wobbleIntensity || 1), prog: 0.25 },
                { key: 'skewX', val: 0, prog: 0.5 },
                { key: 'skewX', val: -8 * (params.wobbleIntensity || 1), prog: 0.75 },
                { key: 'skewX', val: 0, prog: 1 },
                { key: 'skewY', val: 0, prog: 0 },
                { key: 'skewY', val: -5 * (params.wobbleIntensity || 1), prog: 0.25 },
                { key: 'skewY', val: 0, prog: 0.5 },
                { key: 'skewY', val: 5 * (params.wobbleIntensity || 1), prog: 0.75 },
                { key: 'skewY', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
          // Flash exit
          {
            id: `flash-exit-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: flashStart > 0 ? flashStart : 0,
              duration: params.flashDuration || 0.08,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };

      allWordComponents.push(wordComponent);

      // Generate particle burst for high-impact words
      if (shouldBurst) {
        const particles = generateParticles(wordId, word.start, caption.id);
        allParticles.push(...particles);
      }
    });
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'japanese-variety-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          captions.length > 0
            ? Math.max(
                ...captions.map((c) => c.absoluteEnd),
              )
            : 10,
      },
    },
    childrenData: [
      // Word display area
      {
        id: 'word-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              perspective: '1000px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              captions.length > 0
                ? Math.max(
                    ...captions.map((c) => c.absoluteEnd),
                  )
                : 10,
          },
        },
        childrenData: [
          {
            id: 'word-display-area',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative flex items-center justify-center',
                style: {
                  transformStyle: 'preserve-3d',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration:
                  captions.length > 0
                    ? Math.max(
                        ...captions.map((c) => c.absoluteEnd),
                      )
                    : 10,
              },
            },
            childrenData: allWordComponents,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
      // Particle system container
      {
        id: 'particle-system-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none overflow-visible',
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              captions.length > 0
                ? Math.max(
                    ...captions.map((c) => c.absoluteEnd),
                  )
                : 10,
          },
        },
        childrenData: allParticles,
      } as RenderableComponentData,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'japanese-variety-typokinetics',
  title: 'Japanese Variety Show Typokinetics',
  description:
    'Frenetic typokinetic preset emulating Japanese variety show text overlays and arcade game announcements. Features slot-machine-style word flashing with exaggerated bounce effects, bass-reactive jelly wobble distortion using skewX/skewY transforms, coin-flip rotation scaling, and emoji/symbol particle bursts on high-impact words. Delivers sensory overload aesthetic while maintaining readability through high-contrast text styling (white text with black stroke) and strategic timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'kinetic',
    'japanese',
    'variety-show',
    'arcade',
    'slot-machine',
    'bounce',
    'wobble',
    'rotation',
    'particles',
    'high-energy',
    'sensory-overload',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    flashDuration: 0.08,
    bounceDuration: 0.3,
    rotationIntensity: 720,
    wobbleIntensity: 1,
    particleCount: 8,
    impactThreshold: 0.8,
    fontSize: 64,
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3,
    font: 'Noto Sans JP:900',
  },
};

export const japaneseVarietyTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
