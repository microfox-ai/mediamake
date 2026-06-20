/**
 * Minimalist Typokinetic Breathing Preset
 *
 * A subtle, professional preset that treats text scaling (90%-100%) as a breathing rhythm, 
 * combined with contracting letter-spacing (0.05em → 0em) and gentle rotation correction 
 * (-0.5deg → 0deg) to create a "locking into place" effect. Perfect for elegant captions 
 * or documentary-style titles where the animation feels like adjusting clip speed ramping 
 * in a video timeline.
 *
 * Features:
 * - Breathing scale animation (0.9 → 1.0) for subtle "inhaling" entrance
 * - Letter-spacing contraction (0.05em → 0em) for tightening text as it settles
 * - Rotation correction (-0.5deg → 0deg) for visual "locking" effect
 * - Sequential word appearance with 0.1s overlaps for smooth flow
 * - All transforms bundled into single property for optimal performance
 * - Uses word.relativeTime for precise audio/video synchronization
 * - Fixed minHeight to prevent layout jumps
 *
 * Use cases:
 * - Elegant professional captions
 * - Documentary-style titles
 * - Corporate video overlays
 * - Sophisticated subtitle presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Schema for Input Parameters ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Caption ID'),
        text: z.string().describe('Caption text content'),
        start: z.number().describe('Caption start time (relative to caption scene)'),
        end: z.number().describe('Caption end time (relative to caption scene)'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start time in video timeline'),
        absoluteEnd: z.number().describe('Absolute end time in video timeline'),
        words: z.array(
          z.object({
            id: z.string().optional().describe('Word ID'),
            text: z.string().describe('Word text'),
            start: z.number().describe('Word start time (relative to caption)'),
            end: z.number().describe('Word end time (relative to caption)'),
            duration: z.number().describe('Word duration'),
            absoluteStart: z.number().describe('Absolute start time in video timeline'),
            absoluteEnd: z.number().describe('Absolute end time in video timeline'),
            confidence: z.number().optional().describe('Speech recognition confidence'),
          })
        ),
        metadata: z.record(z.string(), z.any()).optional().describe('Optional caption metadata'),
      })
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe('Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .optional()
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or named color)'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .optional()
    .default('bottom')
    .describe('Vertical position of text on screen'),

  animationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .optional()
    .default(0.6)
    .describe('Duration of breathing animation in seconds'),

  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Delay between word appearances in seconds'),

  overlapTime: z
    .number()
    .min(0)
    .max(0.5)
    .optional()
    .default(0.1)
    .describe('Overlap time between sequential words in seconds'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:600');

  // Position mapping
  const positionStyles: Record<string, string> = {
    top: 'items-start pt-20',
    center: 'items-center',
    bottom: 'items-end pb-20',
  };

  const positionClass = positionStyles[params.position || 'bottom'];

  // Build caption components
  const captionComponents: RenderableComponentData[] = params.captions.map((caption, captionIndex) => {
    // Build word components for this caption
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `typokinetic-word-${captionIndex}-${wordIndex}`;

      // Calculate staggered start time (relative to caption)
      const staggeredStart = wordIndex * params.staggerDelay;
      
      // Calculate word duration (extends to accommodate animation + overlap)
      const extendedDuration = word.duration + params.animationDuration + params.overlapTime;

      // Create breathing effect (scale, letterSpacing, rotate, opacity)
      const breathingEffect = {
        id: `breathing-effect-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: word.start + staggeredStart, // Relative to caption
          duration: params.animationDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Scale: 0.9 → 1.0 (breathing/inhaling)
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Letter spacing: 0.05em → 0em (tightening)
            { key: 'letterSpacing', val: '0.05em', prog: 0 },
            { key: 'letterSpacing', val: '0em', prog: 1 },
            // Rotate: -0.5deg → 0deg (locking correction)
            { key: 'rotate', val: -0.5, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            // Opacity: 0 → 1 (fade in)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'inline-block mx-1',
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: fontStyle.fontWeight || 600,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: params.textColor,
            textAlign: 'center' as const,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['600'],
            subsets: ['latin'],
            display: 'swap' as const,
          },
        },
        context: {
          timing: {
            start: word.start + staggeredStart, // Relative to caption
            duration: extendedDuration,
          },
        },
        effects: [breathingEffect],
      } as RenderableComponentData;
    });

    // Caption container (words wrapper)
    const captionContainer: RenderableComponentData = {
      id: `typokinetic-caption-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `relative w-full flex flex-row flex-wrap items-center justify-center ${positionClass}`,
          style: {
            gap: '0.25rem',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart, // Absolute start for root caption container
          duration: caption.duration + (params.staggerDelay * caption.words.length) + params.animationDuration,
        },
      },
      childrenData: wordComponents,
    };

    return captionContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-breathing-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full flex ${positionClass} justify-center`,
        style: {
          minHeight: '120px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.captions.length > 0
          ? Math.max(...params.captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: captionComponents,
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
  id: 'typokinetic-breathing-minimal',
  title: 'Minimalist Typokinetic Breathing Preset',
  description:
    'Elegant typokinetic preset featuring subtle 90-100% scale breathing rhythm, letter-spacing contraction from 0.05em to 0em, and -0.5deg to 0deg rotation correction. Creates a sense of text "locking" into position with a gentle inhaling effect, perfect for professional captions and documentary-style titles.',
  type: 'predefined',
  presetType: 'children',
  tags: ['captions', 'typography', 'kinetic', 'breathing', 'minimal', 'elegant', 'professional', 'documentary'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Elegant professional captions',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'Elegant',
            start: 0,
            end: 0.8,
            duration: 0.8,
            absoluteStart: 0,
            absoluteEnd: 0.8,
          },
          {
            id: 'word-2',
            text: 'professional',
            start: 0.8,
            end: 2,
            duration: 1.2,
            absoluteStart: 0.8,
            absoluteEnd: 2,
          },
          {
            id: 'word-3',
            text: 'captions',
            start: 2,
            end: 3,
            duration: 1,
            absoluteStart: 2,
            absoluteEnd: 3,
          },
        ],
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#ffffff',
    position: 'bottom',
    animationDuration: 0.6,
    staggerDelay: 0.5,
    overlapTime: 0.1,
  },
};

// --- Export ---

export const typokineticBreathingMinimalPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
