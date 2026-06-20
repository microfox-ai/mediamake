/**
 * 8-Bit Arcade Typography Preset
 *
 * This preset creates a pixelated retro arcade-style typography effect that mimics classic game text animations.
 * Features letter-by-letter typewriter reveal with rigid, non-interpolated movement using stepped timing functions.
 * Includes pixel-perfect text-shadow outlines, desaturated pastel colors reminiscent of faded arcade cabinet screens,
 * and a static CRT-style scanline overlay. Words type out with mechanical rhythm followed by a brief flash effect.
 *
 * Features:
 * - **Pixelated 8-Bit Aesthetic**: Monospace font with uppercase styling and image-rendering: pixelated
 * - **Stepped Motion**: Uses steps() easing to create discrete, non-interpolated movement
 * - **Typewriter Reveal**: Character-by-character reveal with mechanical rhythm
 * - **Pixel-Perfect Outline**: Multiple text-shadow layers for authentic blocky outline effect
 * - **Desaturated Pastels**: Muted color palette (#8B956D, #C4CFA1, #6B7353) for faded arcade feel
 * - **CRT Scanline Overlay**: Gentle vertical scanline pattern overlay
 * - **Terminal Flash Effect**: Brief blink effect after word completion
 * - **Chromatic Aberration**: Optional RGB channel offset for emphasis words
 *
 * Use cases:
 * - Retro gaming content and arcade-themed videos
 * - 8-bit music visualizations and chiptune tracks
 * - Nostalgic tech content and vintage gaming reviews
 * - Pixel art animations and retro aesthetic projects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

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
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
            emphasis: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  primaryColor: z
    .string()
    .default('#C4CFA1')
    .describe('Primary text color (desaturated pastel)'),

  secondaryColor: z
    .string()
    .default('#8B956D')
    .describe('Secondary outline color'),

  tertiaryColor: z
    .string()
    .default('#6B7353')
    .describe('Tertiary shadow color'),

  backgroundColor: z
    .string()
    .default('#1a1a2e')
    .describe('Background color (dark retro arcade)'),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(56)
    .describe('Base font size in pixels'),

  typewriterSpeed: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.12)
    .describe('Duration per character reveal in seconds'),

  flashDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of terminal flash effect in seconds'),

  enableChromaticAberration: z
    .boolean()
    .default(true)
    .describe('Enable chromatic aberration on emphasis words'),

  chromaticOffset: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Pixel offset for chromatic aberration effect'),

  stepsCount: z
    .number()
    .min(4)
    .max(16)
    .default(8)
    .describe('Number of steps for stepped timing function'),

  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of CRT scanline overlay'),

  wordSpacing: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Spacing multiplier between words'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    backgroundColor,
    fontSize,
    typewriterSpeed,
    flashDuration,
    enableChromaticAberration,
    chromaticOffset,
    stepsCount,
    scanlineOpacity,
    wordSpacing,
  } = params;

  // Calculate total duration from captions
  const lastCaption = captions[captions.length - 1];
  const totalDuration = lastCaption
    ? lastCaption.absoluteEnd
    : captions.reduce((max, cap) => Math.max(max, cap.absoluteEnd), 0);

  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words;
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `arcade-word-${captionIndex}-${wordIndex}`;
      const isEmphasis = caption.metadata?.emphasis || false;
      const charCount = word.text.length;

      // Calculate typewriter reveal timing
      const revealDuration = charCount * typewriterSpeed;
      const wordRelativeStart = word.start; // Relative to caption start

      // Create text shadow for pixel-perfect outline
      const baseTextShadow = `
        2px 0 0 ${secondaryColor},
        -2px 0 0 ${secondaryColor},
        0 2px 0 ${secondaryColor},
        0 -2px 0 ${secondaryColor},
        1px 1px 0 ${tertiaryColor},
        -1px -1px 0 ${tertiaryColor}
      `;

      // Chromatic aberration for emphasis words
      const chromaticTextShadow = enableChromaticAberration
        ? `
        ${chromaticOffset}px 0 0 rgba(255, 0, 0, 0.6),
        -${chromaticOffset}px 0 0 rgba(0, 255, 255, 0.6),
        ${baseTextShadow}
      `
        : baseTextShadow;

      const textShadow = isEmphasis ? chromaticTextShadow : baseTextShadow;

      // Create word text atom
      const wordTextAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'font-mono',
          style: {
            fontSize: `clamp(${fontSize * 0.5}px, ${fontSize * 0.08}vw, ${fontSize}px)`,
            fontWeight: '700',
            color: primaryColor,
            textShadow,
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as any,
            willChange: 'transform, opacity',
            imageRendering: 'pixelated' as any,
            marginRight: `${wordSpacing * 0.3}em`,
          },
        },
        context: {
          timing: {
            start: 0, // All words start together (sentence-level timing)
            duration: caption.duration,
          },
        },
        effects: [],
      };

      // Effect 1: Typewriter reveal with stepped opacity
      // Create discrete steps for typewriter effect
      const opacitySteps: Array<{ key: string; val: number; prog: number }> =
        [];
      const revealProgress = Math.min(revealDuration / caption.duration, 1);

      // Stepped opacity reveal
      opacitySteps.push({ key: 'opacity', val: 0, prog: 0 });
      opacitySteps.push({
        key: 'opacity',
        val: 0,
        prog: wordRelativeStart / caption.duration,
      });
      opacitySteps.push({
        key: 'opacity',
        val: 1,
        prog:
          Math.min(wordRelativeStart + revealDuration, caption.duration) /
          caption.duration,
      });
      opacitySteps.push({ key: 'opacity', val: 1, prog: 1 });

      const typewriterEffect = {
        id: `${wordId}-typewriter`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: caption.duration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: opacitySteps,
        },
      };

      wordTextAtom.effects!.push(typewriterEffect);

      // Effect 2: Terminal flash effect after reveal
      const flashStart = wordRelativeStart + revealDuration;
      const flashEnd = flashStart + flashDuration;

      if (flashEnd <= caption.duration) {
        const flashEffect = {
          id: `${wordId}-flash`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: flashStart,
            duration: flashDuration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        };

        wordTextAtom.effects!.push(flashEffect);
      }

      // Effect 3: Snap-in movement with stepped translateX (rigid, non-interpolated)
      const snapDistance = 10; // pixels
      const snapEffect = {
        id: `${wordId}-snap`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: wordRelativeStart,
          duration: revealDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: `${snapDistance}px`, prog: 0 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      };

      wordTextAtom.effects!.push(snapEffect);

      wordComponents.push(wordTextAtom);
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `arcade-caption-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        {
          id: `arcade-words-wrapper-${captionIndex}`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-wrap justify-center items-center',
              style: {
                maxWidth: '90%',
                gap: `${wordSpacing * 0.75}rem`,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordComponents,
        },
      ],
    };

    captionContainers.push(captionContainer);
  });

  // Create scanline overlay (static, no animation)
  const scanlineOverlay: RenderableComponentData = {
    id: 'arcade-scanline-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.15) 2px, rgba(0, 0, 0, 0.15) 4px)`,
        opacity: scanlineOpacity,
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'arcade-8bit-typography-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: {
          backgroundColor,
          fontFamily: 'monospace',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [scanlineOverlay, ...captionContainers],
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
  id: 'arcade-8bit-typography',
  title: '8-Bit Arcade Typography',
  description:
    'A pixelated retro arcade-style typography preset that mimics classic game text animations. Features letter-by-letter typewriter reveal with rigid, non-interpolated movement using discrete keyframe steps. Includes pixel-perfect text-shadow outlines, desaturated pastel colors reminiscent of faded arcade cabinet screens, and a static CRT-style scanline overlay. Words type out with mechanical rhythm followed by a brief flash effect. Uses monospace font with uppercase styling for authentic 8-bit aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'arcade',
    '8-bit',
    'retro',
    'pixelated',
    'typewriter',
    'captions',
    'text',
    'gaming',
    'vintage',
    'scanline',
    'crt',
    'monospace',
    'stepped',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'GAME START',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'GAME',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
          },
          {
            id: 'word-2',
            text: 'START',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
          },
        ],
        metadata: {
          emphasis: true,
        },
      },
    ],
    primaryColor: '#C4CFA1',
    secondaryColor: '#8B956D',
    tertiaryColor: '#6B7353',
    backgroundColor: '#1a1a2e',
    fontSize: 56,
    typewriterSpeed: 0.12,
    flashDuration: 0.2,
    enableChromaticAberration: true,
    chromaticOffset: 2,
    stepsCount: 8,
    scanlineOpacity: 0.6,
    wordSpacing: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const arcade8bitTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
