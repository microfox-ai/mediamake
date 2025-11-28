/**
 * Glitch Vocal Emphasis Subtitles Preset
 *
 * A glitch-art inspired preset where vocal emphasis triggers controlled scaling glitches
 * with RGB channel splitting. Normal words have subtle scale breathing (0.99-1.01), while
 * emphasized words rapidly glitch between multiple scale states (1.0→1.2→0.9→1.3→1.0) over 200ms.
 *
 * Features:
 * - RGB channel splitting during glitches where each color channel (red, green, blue) scales
 *   and positions differently, creating chromatic aberration
 * - Position jitter and opacity flickers for authentic digital interference aesthetics
 * - Contrast/brightness filters for digital distortion
 * - Maintains readability while feeling like corrupted video data responding to vocal intensity
 *
 * Technical approach:
 * - Uses BaseLayout with 'relative flex flex-wrap items-center justify-center gap-3'
 * - Each word uses three identical TextAtoms with different colors (red, green, blue)
 * - Rapid scale keyframes (1.0, 1.2, 0.9, 1.3, 1.0) over 200ms using steps(5) timing
 * - Random translateX/Y jitter using CSS custom properties
 * - Opacity flickers using steps(2) animation
 * - filter: contrast() and brightness() for digital distortion
 * - Cleanup animations to smoothly return to normal state after glitch
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Zod schema for preset parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time of caption'),
        end: z.number().describe('Relative end time of caption'),
        duration: z.number().describe('Duration of caption'),
        absoluteStart: z.number().describe('Absolute start time in video'),
        absoluteEnd: z.number().describe('Absolute end time in video'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start time within caption'),
            end: z.number().describe('Relative end time within caption'),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          })
        ),
        metadata: z
          .object({
            emphasis: z.boolean().optional().describe('Whether this caption has emphasis'),
            impact: z.number().optional().describe('Emphasis intensity multiplier (0.1-3.0)'),
          })
          .optional(),
      })
    )
    .describe('Array of caption objects with word-level timing and optional emphasis metadata'),

  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600")'),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),

  normalBreathingIntensity: z
    .number()
    .min(0)
    .max(0.05)
    .default(0.01)
    .describe('Subtle breathing scale variation for normal words (0.01 = 0.99 to 1.01)'),

  glitchDuration: z
    .number()
    .min(100)
    .max(500)
    .default(200)
    .describe('Duration of glitch effect in milliseconds'),

  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.0)
    .describe('Intensity multiplier for glitch effects'),

  rgbSplitDistance: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Distance in pixels for RGB channel separation'),

  jitterIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum position jitter in pixels'),

  opacityFlickerIntensity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe('Opacity flicker intensity (0 = no flicker, 0.5 = 50% opacity drop)'),

  contrastBoost: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .describe('Contrast filter boost during glitch'),

  brightnessBoost: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Brightness filter boost during glitch'),

  cleanupDuration: z
    .number()
    .min(100)
    .max(1000)
    .default(300)
    .describe('Duration of cleanup animation to return to normal state in milliseconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const captionsArray = params.captions as TranscriptionSentence[];

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper function to generate random jitter value
  const getRandomJitter = (intensity: number): number => {
    return (Math.random() - 0.5) * 2 * intensity;
  };

  // Helper function to create normal breathing effect
  const createBreathingEffect = (
    targetId: string,
    wordStart: number,
    wordDuration: number,
    intensity: number
  ): any => {
    const breathingScale = 1 + intensity;
    const breathingDuration = Math.min(wordDuration, 2); // Max 2 seconds per breath cycle

    return {
      id: `breathing-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: wordStart,
        duration: breathingDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: breathingScale, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create glitch effects for emphasized words
  const createGlitchEffects = (
    targetId: string,
    wordStart: number,
    isRed: boolean,
    isGreen: boolean,
    isBlue: boolean
  ): any[] => {
    const effects = [];
    const glitchDurationSec = params.glitchDuration / 1000;
    const cleanupDurationSec = params.cleanupDuration / 1000;
    const intensity = params.glitchIntensity;
    const jitter = params.jitterIntensity;
    const rgbSplit = params.rgbSplitDistance;
    const flickerIntensity = params.opacityFlickerIntensity;

    // Scale glitch keyframes with steps timing (1.0 → 1.2 → 0.9 → 1.3 → 1.0)
    const scaleKeyframes = [
      { key: 'scale', val: 1.0, prog: 0 },
      { key: 'scale', val: 1.0 + (0.2 * intensity), prog: 0.2 },
      { key: 'scale', val: 1.0 - (0.1 * intensity), prog: 0.4 },
      { key: 'scale', val: 1.0 + (0.3 * intensity), prog: 0.6 },
      { key: 'scale', val: 1.0 + (0.15 * intensity), prog: 0.8 },
      { key: 'scale', val: 1.0, prog: 1 },
    ];

    // Position jitter - different for each RGB channel
    const jitterX = isRed ? rgbSplit : isBlue ? -rgbSplit : 0;
    const jitterY = isGreen ? rgbSplit : isBlue ? -rgbSplit : 0;
    const randomJitterX = getRandomJitter(jitter);
    const randomJitterY = getRandomJitter(jitter);

    const positionKeyframes = [
      { key: 'translateX', val: jitterX + randomJitterX, prog: 0 },
      { key: 'translateX', val: jitterX - randomJitterX, prog: 0.25 },
      { key: 'translateX', val: jitterX + randomJitterX * 0.5, prog: 0.5 },
      { key: 'translateX', val: jitterX - randomJitterX * 0.3, prog: 0.75 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: jitterY + randomJitterY, prog: 0 },
      { key: 'translateY', val: jitterY - randomJitterY, prog: 0.25 },
      { key: 'translateY', val: jitterY + randomJitterY * 0.5, prog: 0.5 },
      { key: 'translateY', val: jitterY - randomJitterY * 0.3, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
    ];

    // Opacity flicker (steps timing for abrupt changes)
    const opacityKeyframes = [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 1 - flickerIntensity, prog: 0.2 },
      { key: 'opacity', val: 1, prog: 0.4 },
      { key: 'opacity', val: 1 - flickerIntensity * 0.5, prog: 0.6 },
      { key: 'opacity', val: 1, prog: 0.8 },
      { key: 'opacity', val: 1, prog: 1 },
    ];

    // Filter effects (contrast and brightness)
    const filterKeyframes = [
      { key: 'filter', val: `contrast(${params.contrastBoost}) brightness(${params.brightnessBoost})`, prog: 0 },
      { key: 'filter', val: `contrast(${params.contrastBoost * 1.2}) brightness(${params.brightnessBoost * 1.1})`, prog: 0.3 },
      { key: 'filter', val: `contrast(${params.contrastBoost * 0.8}) brightness(${params.brightnessBoost * 0.9})`, prog: 0.6 },
      { key: 'filter', val: `contrast(1) brightness(1)`, prog: 1 },
    ];

    // Main glitch effect
    effects.push({
      id: `glitch-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: wordStart,
        duration: glitchDurationSec,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          ...scaleKeyframes,
          ...positionKeyframes,
          ...opacityKeyframes,
          ...filterKeyframes,
        ],
      } as GenericEffectData,
    });

    // Cleanup effect to smooth return to normal state
    effects.push({
      id: `cleanup-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: wordStart + glitchDurationSec,
        duration: cleanupDurationSec,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'filter', val: 'contrast(1) brightness(1)', prog: 0 },
          { key: 'filter', val: 'contrast(1) brightness(1)', prog: 1 },
        ],
      } as GenericEffectData,
    });

    return effects;
  };

  // Build caption containers
  const captionContainers: any[] = [];

  captionsArray.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    const isEmphasized = caption.metadata?.emphasis ?? false;
    const impact = caption.metadata?.impact ?? 1.0;

    // Build word components with RGB layers
    const wordContainers: any[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const redId = `${wordId}-red`;
      const greenId = `${wordId}-green`;
      const blueId = `${wordId}-blue`;

      // Create effects based on emphasis
      let redEffects: any[] = [];
      let greenEffects: any[] = [];
      let blueEffects: any[] = [];

      if (isEmphasized) {
        // Glitch effects for emphasized words
        redEffects = createGlitchEffects(redId, word.start, true, false, false);
        greenEffects = createGlitchEffects(greenId, word.start, false, true, false);
        blueEffects = createGlitchEffects(blueId, word.start, false, false, true);
      } else {
        // Normal breathing effects for non-emphasized words
        redEffects = [createBreathingEffect(redId, word.start, word.duration, params.normalBreathingIntensity)];
        greenEffects = [createBreathingEffect(greenId, word.start, word.duration, params.normalBreathingIntensity)];
        blueEffects = [createBreathingEffect(blueId, word.start, word.duration, params.normalBreathingIntensity)];
      }

      // Red channel layer
      const redLayer = {
        id: redId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            color: '#ff0000',
            mixBlendMode: 'screen',
            textShadow: '0 0 10px rgba(255,0,0,0.5)',
            WebkitTextStroke: '1px rgba(255,0,0,0.3)',
            transform: 'translateZ(2px)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            display: 'swap' as any,
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: redEffects,
      };

      // Green channel layer
      const greenLayer = {
        id: greenId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            color: '#00ff00',
            mixBlendMode: 'screen',
            textShadow: '0 0 10px rgba(0,255,0,0.5)',
            WebkitTextStroke: '1px rgba(0,255,0,0.3)',
            position: 'absolute' as any,
            top: 0,
            left: 0,
            transform: 'translateZ(1px)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            display: 'swap' as any,
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: greenEffects,
      };

      // Blue channel layer
      const blueLayer = {
        id: blueId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            color: '#0000ff',
            mixBlendMode: 'screen',
            textShadow: '0 0 10px rgba(0,0,255,0.5)',
            WebkitTextStroke: '1px rgba(0,0,255,0.3)',
            position: 'absolute' as any,
            top: 0,
            left: 0,
            transform: 'translateZ(0px)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            display: 'swap' as any,
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: blueEffects,
      };

      // Word container with RGB layers
      const wordContainer = {
        id: wordId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block relative',
            style: {
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [redLayer, greenLayer, blueLayer],
      };

      wordContainers.push(wordContainer);
    });

    // Caption container
    const captionContainer = {
      id: `caption-container-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex flex-wrap items-center justify-center gap-3',
          style: {
            maxWidth: '90%',
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
      childrenData: wordContainers as RenderableComponentData[],
    };

    captionContainers.push(captionContainer);
  });

  // Caption layout container
  const captionLayoutContainer = {
    id: 'caption-layout-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio' as any,
      },
    },
    childrenData: captionContainers as RenderableComponentData[],
  };

  // Root container
  const rootContainer = {
    id: 'glitch-vocal-emphasis-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio' as any,
      },
    },
    childrenData: [captionLayoutContainer] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'glitchVocalEmphasisSubtitles',
  title: 'Glitch Vocal Emphasis Subtitles',
  description:
    'Glitch-art inspired subtitles where vocal emphasis triggers controlled scaling glitches with RGB channel splitting. Normal words have subtle scale breathing (0.99-1.01), while emphasized words rapidly glitch between multiple scale states (1.0→1.2→0.9→1.3→1.0) over 200ms. Features RGB channel splitting during glitches where each color channel (red, green, blue) scales and positions differently, creating chromatic aberration. Includes position jitter, opacity flickers, contrast/brightness filters for authentic digital interference aesthetics. Maintains readability while feeling like corrupted video data responding to vocal intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'glitch',
    'emphasis',
    'rgb-split',
    'chromatic-aberration',
    'vocal',
    'kinetic',
    'digital',
    'distortion',
    'modern',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
          },
        ],
        metadata: {
          emphasis: false,
        },
      },
      {
        id: 'caption-2',
        text: 'AMAZING results!',
        start: 0,
        end: 2.0,
        duration: 2.0,
        absoluteStart: 3.0,
        absoluteEnd: 5.0,
        words: [
          {
            id: 'word-3',
            text: 'AMAZING',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 3.0,
            absoluteEnd: 4.0,
          },
          {
            id: 'word-4',
            text: 'results!',
            start: 1.0,
            end: 2.0,
            duration: 1.0,
            absoluteStart: 4.0,
            absoluteEnd: 5.0,
          },
        ],
        metadata: {
          emphasis: true,
          impact: 1.5,
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    normalBreathingIntensity: 0.01,
    glitchDuration: 200,
    glitchIntensity: 1.0,
    rgbSplitDistance: 3,
    jitterIntensity: 5,
    opacityFlickerIntensity: 0.2,
    contrastBoost: 1.3,
    brightnessBoost: 1.2,
    cleanupDuration: 300,
  },
};

export const glitchVocalEmphasisSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
