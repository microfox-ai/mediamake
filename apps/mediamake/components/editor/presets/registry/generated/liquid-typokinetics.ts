/**
 * Liquid Typokinetics Preset
 *
 * This preset creates a liquid water droplet typography effect where words flow into place
 * with elastic distortion, ripple effects, and continuous wave motion. Each word starts with
 * scaleX(0.7) and scaleY(1.3) distortion, smoothly transitions to normal proportions while
 * fading in, and includes animated text-shadow ripples that expand outward. After appearing,
 * words continue to gently oscillate with a sine-wave motion, creating the feeling of water
 * droplets settling into a still pond.
 *
 * Features:
 * - Elastic entry animation with scale distortion (0.7x width, 1.3x height → 1x, 1x)
 * - Fade-in opacity animation (0 → 1) synchronized with scaling
 * - Ripple effect using animated text-shadow (0px → 20px → 40px with fading opacity)
 * - Continuous sine-wave motion (translateY: -2px to 2px) looping every 3 seconds
 * - Water-themed color palette with blue tint (#e0f7ff)
 * - Timing synchronized to vocal cadence using word-level relative timing
 *
 * Use cases:
 * - Creating fluid, water-themed typography animations
 * - Adding organic motion to captions and titles
 * - Building melodic, gentle text effects for calm content
 * - Creating nature-themed or liquid-inspired visual effects
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
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto:700", "Inter:600:italic")'),
  
  textColor: z
    .string()
    .default('#e0f7ff')
    .describe('Text color with slight blue water tint'),
  
  wordGap: z
    .number()
    .min(0)
    .max(100)
    .default(12)
    .describe('Gap between words in pixels'),
  
  entryDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.7)
    .describe('Duration of elastic entry animation in seconds'),
  
  rippleDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.0)
    .describe('Duration of ripple expansion animation in seconds'),
  
  waveDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3.0)
    .describe('Duration of one complete sine-wave cycle in seconds'),
  
  waveAmplitude: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Amplitude of sine-wave motion in pixels'),
  
  globalImpact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.0)
    .describe('Global effect intensity multiplier (0.1-3.0)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    textColor,
    wordGap,
    entryDuration,
    rippleDuration,
    waveDuration,
    waveAmplitude,
    globalImpact,
  } = params;

  // Helper: Parse font string format
  const parseFontString = (font: string) => {
    const fontParts = font.split(':');
    const family = fontParts[0];
    const fontStyle: React.CSSProperties = {};
    
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    
    return { family, fontStyle };
  };

  const { family: parsedFontFamily, fontStyle } = parseFontString(fontFamily);

  // Create caption containers with word atoms
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const captionId = `liquid-caption-${captionIndex}`;
      
      // Get per-caption impact multiplier (metadata takes precedence)
      const captionImpact = caption.metadata?.impact ?? globalImpact;

      // Create word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `${captionId}-word-${wordIndex}`;
          
          // Calculate effect durations with impact
          const scaledEntryDuration = entryDuration * captionImpact;
          const scaledRippleDuration = rippleDuration * captionImpact;

          // Entry effect: elastic scale + fade
          const entryEffect = {
            id: `${wordId}-entry`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
              start: word.start, // Relative to caption
              duration: scaledEntryDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Opacity fade-in
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                // Elastic horizontal squeeze
                { key: 'scaleX', val: 0.7, prog: 0 },
                { key: 'scaleX', val: 1, prog: 1 },
                // Elastic vertical stretch
                { key: 'scaleY', val: 1.3, prog: 0 },
                { key: 'scaleY', val: 1, prog: 1 },
              ],
            },
          };

          // Ripple effect: animated text-shadow expanding outward
          const rippleEffect = {
            id: `${wordId}-ripple`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: word.start, // Relative to caption, synced with entry
              duration: scaledRippleDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Ripple 1: inner ring
                { 
                  key: 'textShadow', 
                  val: `0 0 0px ${textColor}`, 
                  prog: 0 
                },
                { 
                  key: 'textShadow', 
                  val: `0 0 10px ${textColor}80, 0 0 20px ${textColor}40`, 
                  prog: 0.5 
                },
                // Ripple 2: outer ring fading
                { 
                  key: 'textShadow', 
                  val: `0 0 20px ${textColor}40, 0 0 40px ${textColor}20`, 
                  prog: 1 
                },
              ],
            },
          };

          // Continuous sine-wave motion (starts after word appears)
          const waveEffect = {
            id: `${wordId}-wave`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: word.start + scaledEntryDuration, // Start after entry completes
              duration: caption.duration - (word.start + scaledEntryDuration), // Continue until caption ends
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Sine wave: down → up → down (one complete cycle)
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -waveAmplitude, prog: 0.25 },
                { key: 'translateY', val: 0, prog: 0.5 },
                { key: 'translateY', val: waveAmplitude, prog: 0.75 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          };

          return {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: '700',
                color: textColor,
                transformOrigin: 'center',
                ...fontStyle,
              },
              font: {
                family: parsedFontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
              },
            },
            context: {
              timing: {
                start: 0, // All words use caption duration
                duration: caption.duration,
              },
            },
            effects: [entryEffect, rippleEffect, waveEffect],
          } as RenderableComponentData;
        },
      );

      // Caption container (flex layout for words)
      return {
        id: captionId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-wrap items-center justify-center',
            style: {
              gap: `${wordGap}px`,
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
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
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
  id: 'liquid-typokinetics',
  title: 'Liquid Typokinetics Preset',
  description:
    'Liquid water droplet typography where words flow into place with elastic distortion (scaleX 0.7→1, scaleY 1.3→1), ripple text-shadow effects, and continuous sine-wave motion. Words drop into place like water droplets hitting a still pond, timed to vocal cadence with subtle blue water theming.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'liquid',
    'water',
    'droplet',
    'elastic',
    'ripple',
    'wave',
    'kinetic',
    'fluid',
    'melodic',
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
            confidence: 1.0,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
            confidence: 1.0,
          },
        ],
        metadata: {
          impact: 1.0,
        },
      },
    ],
    fontSize: 48,
    fontFamily: 'Inter',
    textColor: '#e0f7ff',
    wordGap: 12,
    entryDuration: 0.7,
    rippleDuration: 1.0,
    waveDuration: 3.0,
    waveAmplitude: 2,
    globalImpact: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
