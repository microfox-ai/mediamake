/**
 * Neon Calligraphy Letter Trace Preset
 *
 * A minimalist, elegant neon glow effect that traces individual letter outlines sequentially,
 * like a calligrapher drawing with light. Picture this as a refined, artistic interpretation
 * where each letter is 'written' with a glowing pen, one after another, with the glow trailing
 * behind the drawing motion.
 *
 * Features:
 * - Sequential word-by-word reveal with organic, hand-drawn feel
 * - Warm neon glow effect (0 0 8px rgba(255,235,205,0.8), 0 0 16px rgba(255,235,205,0.4))
 * - Subtle scale effect (0.95 to 1) during reveal for added elegance
 * - Brief flare effect at completion (blur 0→1px→0, brightness 1→1.3→1)
 * - Deliberate, meditative timing for artistic atmosphere
 * - Gentle steady luminescence after reveal completes
 *
 * Use cases:
 * - Elegant title sequences
 * - Refined artistic text animations
 * - Meditative/contemplative content
 * - Luxury brand presentations
 * - Poetry or literary content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData, BaseEffect } from '@microfox/remotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        absoluteStart: z.number().describe('Absolute start time in caption timeline'),
        end: z.number().describe('Relative end time'),
        absoluteEnd: z.number().describe('Absolute end time in caption timeline'),
        duration: z.number().describe('Caption duration'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start time'),
            absoluteStart: z.number().describe('Absolute start time'),
            end: z.number().describe('Relative end time'),
            absoluteEnd: z.number().describe('Absolute end time'),
            duration: z.number().describe('Word duration'),
            confidence: z.number().optional(),
          })
        ),
        metadata: z.any().optional(),
      })
    )
    .describe('Array of caption sentences with words'),
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Playfair Display:400", "Cinzel:600")'),
  fontSize: z
    .number()
    .min(16)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base text color'),
  glowColor: z
    .string()
    .default('rgba(255,235,205,0.8)')
    .optional()
    .describe('Neon glow color (warm by default)'),
  revealDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Duration of each word reveal animation in seconds'),
  flareDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe('Duration of completion flare effect in seconds'),
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
  backgroundColor: z
    .string()
    .default('#1a1a2e')
    .optional()
    .describe('Background color (default: dark navy)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    captions,
    font = 'Playfair Display:400',
    fontSize = 48,
    textColor = '#FFFFFF',
    glowColor = 'rgba(255,235,205,0.8)',
    revealDuration = 0.5,
    flareDuration = 0.2,
    position = 'center',
    backgroundColor = '#1a1a2e',
  } = params;

  // Parse font string
  const fontString = font || 'Playfair Display:400';
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

  // Position mapping
  const positionClass =
    position === 'top'
      ? 'items-start pt-20'
      : position === 'bottom'
        ? 'items-end pb-20'
        : 'items-center';

  // Process captions into word components with effects
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    
    // Create word components with sequential reveal
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
      const wordId = `neon-word-${captionIndex}-${wordIndex}`;
      
      // Calculate timing for this word
      const wordStart = word.start;
      const wordEnd = word.end;
      
      // Create reveal effect (opacity + scale + glow)
      const revealEffect: BaseEffect = {
        id: `reveal-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: wordStart,
          duration: revealDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Fade in opacity
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Scale from 0.95 to 1
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Glow effect (no glow → warm glow)
            { key: 'textShadow', val: 'none', prog: 0 },
            {
              key: 'textShadow',
              val: `0 0 8px ${glowColor}, 0 0 16px ${glowColor.replace('0.8', '0.4')}`,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      };

      // Create flare effect (brief brightness/blur spike at completion)
      const flareStartTime = wordStart + revealDuration;
      const flareEffect: BaseEffect = {
        id: `flare-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: flareStartTime,
          duration: flareDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Blur: 0 → 1px → 0
            { key: 'filter', val: 'blur(0px) brightness(1)', prog: 0 },
            { key: 'filter', val: 'blur(1px) brightness(1.3)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Create steady glow effect (after flare completes, maintain glow)
      const steadyGlowStart = flareStartTime + flareDuration;
      const steadyGlowDuration = Math.max(0, wordEnd - steadyGlowStart);
      
      const steadyGlowEffect: BaseEffect = {
        id: `steady-glow-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: steadyGlowStart,
          duration: steadyGlowDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Maintain steady glow
            {
              key: 'textShadow',
              val: `0 0 8px ${glowColor}, 0 0 16px ${glowColor.replace('0.8', '0.4')}`,
              prog: 0,
            },
            {
              key: 'textShadow',
              val: `0 0 8px ${glowColor}, 0 0 16px ${glowColor.replace('0.8', '0.4')}`,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      };

      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            marginRight: '0.3em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : { weights: ['400'] }),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0, // All words use caption duration for stable layout
            duration: caption.duration,
          },
        },
        effects: steadyGlowDuration > 0 
          ? [revealEffect, flareEffect, steadyGlowEffect]
          : [revealEffect, flareEffect],
      };

      return wordComponent;
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `neon-caption-container-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap items-center justify-center',
          style: {
            gap: '0.3em',
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'neon-calligraphy-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex ${positionClass} justify-center`,
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'children',
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
  id: 'neon-calligraphy-letter-trace',
  title: 'Neon Calligraphy Letter Trace',
  description:
    'A minimalist, elegant neon glow effect that traces individual letter outlines sequentially, like a calligrapher drawing with light. Each word is revealed with an organic, hand-drawn feel as a glowing pen traces the letters. The effect starts with no glow, then animates opacity from 0 to 1 with warm textShadow (0 0 8px rgba(255,235,205,0.8), 0 0 16px rgba(255,235,205,0.4)) over 0.5 seconds per word using ease-out easing. A subtle scale effect (0.95 to 1) adds elegance during reveal. Upon completion of each word, a brief flare effect (blur 0→1px→0, brightness 1→1.3→1 over 0.2s) simulates the pen lifting. Completed words settle into gentle, steady luminescence while the next word begins its reveal. The deliberate, meditative timing creates an artistic, refined atmosphere.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'captions',
    'neon',
    'glow',
    'calligraphy',
    'elegant',
    'minimalist',
    'artistic',
    'meditative',
    'sequential',
    'handwritten',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'The art of calligraphy',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'The',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'art',
            start: 0.5,
            absoluteStart: 0.5,
            end: 1.2,
            absoluteEnd: 1.2,
            duration: 0.7,
          },
          {
            id: 'word-3',
            text: 'of',
            start: 1.2,
            absoluteStart: 1.2,
            end: 1.7,
            absoluteEnd: 1.7,
            duration: 0.5,
          },
          {
            id: 'word-4',
            text: 'calligraphy',
            start: 1.7,
            absoluteStart: 1.7,
            end: 3,
            absoluteEnd: 3,
            duration: 1.3,
          },
        ],
      },
    ],
    font: 'Playfair Display:400',
    fontSize: 48,
    textColor: '#FFFFFF',
    glowColor: 'rgba(255,235,205,0.8)',
    revealDuration: 0.5,
    flareDuration: 0.2,
    position: 'center',
    backgroundColor: '#1a1a2e',
  },
};

export const neonCalligraphyLetterTracePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};