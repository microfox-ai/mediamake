/**
 * Liquid Light Typography Preset
 *
 * A dreamy, ethereal preset featuring floating typography that moves like it's underwater.
 * Words drift upward gently while fading in, creating a weightless feeling. Includes an
 * aurora-like lens flare system with flowing gradients shifting from warm gold to soft amber,
 * particle-like light motes floating around text, slow mesmerizing breathing zoom, and
 * rhythmic soft focus effects that blur and sharpen like adjusting a camera lens.
 *
 * Features:
 * - Floating typography with underwater-like vertical drift
 * - Aurora lens flares with flowing warm gold to amber gradients
 * - Particle light motes floating on bezier curve paths
 * - Breathing zoom effect (0.98 to 1.02 scale)
 * - Rhythmic soft focus blur effects
 * - Soft text glow with animated intensity
 * - 3D depth with transform-style: preserve-3d
 *
 * Use cases:
 * - Dreamy, ethereal video content
 * - Poetic or contemplative typography
 * - Ambient visual experiences
 * - Meditation or relaxation videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// --- Preset Parameters ---
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
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  font: z
    .string()
    .default('Inter:300')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Playfair Display:400:italic")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('rgba(255, 220, 180, 0.95)')
    .describe('Text color in CSS format'),
  glowColor: z
    .string()
    .default('rgba(255, 220, 180, 0.4)')
    .describe('Glow color for text shadow'),
  floatDistance: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Distance text floats upward (px)'),
  floatDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Duration of float animation (seconds)'),
  fadeDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(2)
    .describe('Duration of fade-in animation (seconds)'),
  particleCount: z
    .number()
    .min(5)
    .max(20)
    .default(12)
    .describe('Number of floating light particles'),
  breathingZoomMin: z
    .number()
    .min(0.9)
    .max(1)
    .default(0.98)
    .describe('Minimum scale for breathing zoom'),
  breathingZoomMax: z
    .number()
    .min(1)
    .max(1.1)
    .default(1.02)
    .describe('Maximum scale for breathing zoom'),
  breathingDuration: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Duration of one breathing cycle (seconds)'),
  blurMin: z
    .number()
    .min(0)
    .max(2)
    .default(0)
    .describe('Minimum blur value (px)'),
  blurMax: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Maximum blur value (px)'),
  blurCycleDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Duration of one blur cycle (seconds)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    glowColor,
    floatDistance,
    floatDuration,
    fadeDuration,
    particleCount,
    breathingZoomMin,
    breathingZoomMax,
    breathingDuration,
    blurMin,
    blurMax,
    blurCycleDuration,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontStr: string) => {
    const fontFamily = fontStr.includes(':') ? fontStr.split(':')[0] : fontStr;
    const fontStyle: React.CSSProperties = {};
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

  // Generate particle positions and timings
  const generateParticles = () => {
    const particles: RenderableComponentData[] = [];
    const positions = [
      { left: '10%', top: '80%' },
      { left: '25%', top: '90%' },
      { left: '40%', top: '85%' },
      { left: '55%', top: '88%' },
      { left: '70%', top: '92%' },
      { left: '85%', top: '87%' },
      { left: '15%', top: '75%' },
      { left: '30%', top: '82%' },
      { left: '50%', top: '78%' },
      { left: '65%', top: '84%' },
      { left: '80%', top: '79%' },
      { left: '20%', top: '95%' },
    ];

    for (let i = 0; i < particleCount && i < positions.length; i++) {
      const pos = positions[i];
      const staggerDelay = i * 0.3;
      const particleDuration = 5 + Math.random() * 3; // 5-8s

      // Create bezier curve animation for each particle
      const particleEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: particleDuration,
        mode: 'provider',
        targetIds: [`particle-${i}`],
        ranges: [
          // Floating upward with horizontal drift
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -100 - Math.random() * 50, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          {
            key: 'translateX',
            val: (Math.random() - 0.5) * 60,
            prog: 0.5,
          },
          { key: 'translateX', val: 0, prog: 1 },
          // Fade in and out
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.3 },
          { key: 'opacity', val: 0.6, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      particles.push({
        id: `particle-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="w-1 h-1 rounded-full bg-yellow-200/60"></div>',
          className: 'absolute',
          style: pos,
        },
        context: {
          timing: {
            start: staggerDelay,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: `particle-effect-${i}`,
            componentId: 'generic',
            data: particleEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Generate aurora flare layers
  const generateAuroraFlares = (): RenderableComponentData[] => {
    return [
      {
        id: 'aurora-flare-1',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" style="mix-blend-mode: soft-light;"></div>',
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: 'aurora-1-flow',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 10,
              mode: 'provider',
              targetIds: ['aurora-flare-1'],
              ranges: [
                { key: 'translateX', val: '-50%', prog: 0 },
                { key: 'translateX', val: '50%', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData,
      {
        id: 'aurora-flare-2',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="absolute inset-0 bg-gradient-to-l from-transparent via-yellow-300/15 to-transparent" style="mix-blend-mode: soft-light;"></div>',
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: 'aurora-2-flow',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 12,
              mode: 'provider',
              targetIds: ['aurora-flare-2'],
              ranges: [
                { key: 'translateX', val: '50%', prog: 0 },
                { key: 'translateX', val: '-50%', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData,
      {
        id: 'aurora-flare-3',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" style="mix-blend-mode: soft-light;"></div>',
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: 'aurora-3-flow',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 15,
              mode: 'provider',
              targetIds: ['aurora-flare-3'],
              ranges: [
                { key: 'translateX', val: '-30%', prog: 0 },
                { key: 'translateX', val: '30%', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData,
    ];
  };

  // Generate floating words for each caption
  const generateFloatingWords = (): RenderableComponentData[] => {
    const captionContainers: RenderableComponentData[] = [];

    captions.forEach((caption: TranscriptionSentence) => {
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${caption.id}-${wordIndex}`;

          // Create word float and fade effect
          const wordEffect: GenericEffectData = {
            type: 'ease-in-out',
            start: word.start,
            duration: Math.min(floatDuration, caption.duration - word.start),
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // Float upward
              { key: 'translateY', val: floatDistance, prog: 0 },
              { key: 'translateY', val: -10, prog: 1 },
              // Fade in
              { key: 'opacity', val: 0, prog: 0 },
              {
                key: 'opacity',
                val: 1,
                prog: Math.min(fadeDuration / floatDuration, 1),
              },
            ],
          };

          // Glow pulsing effect
          const glowEffect: GenericEffectData = {
            type: 'ease-in-out',
            start: word.start,
            duration: Math.min(2, caption.duration - word.start),
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(0 0 30px ${glowColor})`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 50px ${glowColor})`,
                prog: 0.5,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 30px ${glowColor})`,
                prog: 1,
              },
            ],
          };

          return {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: fontSize,
                color: textColor,
                ...fontStyle,
                marginRight: '0.3em',
                textShadow: `0 0 40px ${glowColor}`,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['300'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [
              {
                id: `${wordId}-float`,
                componentId: 'generic',
                data: wordEffect,
              },
              {
                id: `${wordId}-glow`,
                componentId: 'generic',
                data: glowEffect,
              },
            ],
          } as RenderableComponentData;
        },
      );

      // Caption container with backdrop blur
      captionContainers.push({
        id: `caption-container-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex flex-wrap items-center justify-center gap-4 px-8',
            style: {
              backdropFilter: 'blur(2px)',
              transformStyle: 'preserve-3d',
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
      } as RenderableComponentData);
    });

    return captionContainers;
  };

  // Create breathing zoom container effect
  const breathingZoomEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: breathingDuration,
    mode: 'provider',
    targetIds: ['breathing-zoom-layer'],
    ranges: [
      { key: 'scale', val: breathingZoomMin, prog: 0 },
      { key: 'scale', val: breathingZoomMax, prog: 0.5 },
      { key: 'scale', val: breathingZoomMin, prog: 1 },
    ],
  };

  // Create soft focus blur effect
  const softFocusEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: blurCycleDuration,
    mode: 'provider',
    targetIds: ['soft-focus-layer'],
    ranges: [
      { key: 'filter', val: `blur(${blurMin}px)`, prog: 0 },
      { key: 'filter', val: `blur(${blurMax}px)`, prog: 0.5 },
      { key: 'filter', val: `blur(${blurMin}px)`, prog: 1 },
    ],
  };

  // Build composition structure
  const rootContainer: RenderableComponentData = {
    id: 'liquid-light-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gradient-to-b from-amber-950/30 to-transparent',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: [
      // Breathing zoom layer
      {
        id: 'breathing-zoom-layer',
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
            fitDurationTo: 'audio-source',
          },
        },
        effects: [
          {
            id: 'breathing-zoom-effect',
            componentId: 'generic',
            data: breathingZoomEffect,
          },
        ],
        childrenData: [
          // Soft focus layer
          {
            id: 'soft-focus-layer',
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
                fitDurationTo: 'audio-source',
              },
            },
            effects: [
              {
                id: 'soft-focus-effect',
                componentId: 'generic',
                data: softFocusEffect,
              },
            ],
            childrenData: [
              // Aurora flares
              ...generateAuroraFlares(),
              // Particles
              {
                id: 'particles-container',
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
                    fitDurationTo: 'audio-source',
                  },
                },
                childrenData: generateParticles(),
              } as RenderableComponentData,
              // Floating words
              ...generateFloatingWords(),
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
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
  id: 'liquid-light-typography',
  title: 'Liquid Light Typography - Dreamy Floating Text',
  description:
    'Ethereal preset with floating typography that drifts upward like underwater weightlessness, featuring aurora-like lens flares with flowing warm gold to amber gradients, particle light motes, breathing zoom effects, and rhythmic soft focus blur. Typography suspended in liquid light with mesmerizing animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'floating',
    'ethereal',
    'dreamy',
    'underwater',
    'aurora',
    'lens-flare',
    'particles',
    'breathing',
    'soft-focus',
    'ambient',
    'liquid',
    'glow',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:300',
    fontSize: 48,
    textColor: 'rgba(255, 220, 180, 0.95)',
    glowColor: 'rgba(255, 220, 180, 0.4)',
    floatDistance: 20,
    floatDuration: 3,
    fadeDuration: 2,
    particleCount: 12,
    breathingZoomMin: 0.98,
    breathingZoomMax: 1.02,
    breathingDuration: 4,
    blurMin: 0,
    blurMax: 1,
    blurCycleDuration: 3,
  },
};

// --- Export Preset ---
export const liquidLightTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
