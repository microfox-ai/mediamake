/**
 * Cinematic Fog Text Reveal Preset
 *
 * This preset creates a cinematic text reveal effect where words emerge from fog and drift past
 * like film credits in a misty atmosphere. It uses a three-layer composition:
 * - Background fog layer (semi-transparent gradient)
 * - Text container layer (animated text with depth effects)
 * - Foreground fog overlay (vignette effect)
 *
 * Features:
 * - **Layered Fog Composition**: Background and foreground fog layers create atmospheric depth
 * - **Cinematic Text Reveal**: Words materialize from blur and low opacity, become sharp, then fade back
 * - **Depth Simulation**: Scale transformations (0.75 → 1.0 → 1.2) combined with opacity create depth
 * - **Atmospheric Drift**: Subtle horizontal translation simulates air currents
 * - **Caption Integration**: Works with caption data for word-by-word timing
 * - **Brightness Modulation**: Fog-like dimming effect enhances atmosphere
 *
 * Use cases:
 * - Film credit sequences
 * - Atmospheric title reveals
 * - Cinematic caption displays
 * - Misty text effects for mood pieces
 * - Professional video intros/outros
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

// ==================== PARAMETERS ====================

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
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size for text in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),

  effectDuration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Duration of each word reveal animation in seconds'),

  driftAmount: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Amount of horizontal drift in pixels'),

  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum blur intensity in pixels'),

  fogOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of fog layers (0-1)'),

  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color behind fog layers'),
});

// ==================== EXECUTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    effectDuration,
    driftAmount,
    blurIntensity,
    fogOpacity,
    backgroundColor,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:700');

  // Calculate total duration based on captions
  const calculateTotalDuration = (): number => {
    if (!captions || captions.length === 0) return 10;
    const lastCaption = captions[captions.length - 1];
    return lastCaption.absoluteEnd + effectDuration; // Add buffer for last word to fade out
  };

  const totalDuration = calculateTotalDuration();

  // Create fog reveal effect for a word
  const createWordEffects = (
    word: TranscriptionSentence['words'][0],
    wordId: string,
    captionStart: number,
  ): any[] => {
    const effects: any[] = [];

    // Opacity effect: 0 → 1 → 0 (fade in at center, fade out)
    effects.push({
      id: `fog-opacity-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: word.start,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.4 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Scale effect: 0.75 → 1.0 → 1.2 (depth simulation)
    effects.push({
      id: `fog-scale-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: word.start,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 0.75, prog: 0 },
          { key: 'scale', val: 1, prog: 0.5 },
          { key: 'scale', val: 1.2, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Blur effect: 8px → 0 → 4px (emerge from fog, then fade back)
    effects.push({
      id: `fog-blur-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: word.start,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'blur', val: blurIntensity, prog: 0 },
          { key: 'blur', val: 0, prog: 0.5 },
          { key: 'blur', val: blurIntensity * 0.5, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // TranslateX effect: -20px → 20px (horizontal drift)
    effects.push({
      id: `fog-translateX-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: word.start,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: -driftAmount, prog: 0 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: driftAmount, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Brightness effect: 0.7 → 1 → 0.7 (fog-like dimming)
    effects.push({
      id: `fog-brightness-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: word.start,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'brightness', val: 0.7, prog: 0 },
          { key: 'brightness', val: 1, prog: 0.5 },
          { key: 'brightness', val: 0.7, prog: 1 },
        ],
      } as GenericEffectData,
    });

    return effects;
  };

  // Build text components from captions
  const textChildren: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `fog-word-${captionIndex}-${wordIndex}`;
      const wordEffects = createWordEffects(word, wordId, caption.start);

      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            textShadow: '0 0 30px rgba(255, 255, 255, 0.5)',
            letterSpacing: '0.05em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : { weights: ['700'] }),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: word.absoluteStart,
            duration: effectDuration,
          },
        },
        effects: wordEffects,
      };

      textChildren.push(wordComponent);
    });
  });

  // Background fog layer
  const backgroundFogLayer: RenderableComponentData = {
    id: 'background-fog-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `linear-gradient(180deg, rgba(80, 80, 100, ${fogOpacity * 0.5}) 0%, rgba(40, 40, 60, ${fogOpacity * 0.8}) 50%, rgba(80, 80, 100, ${fogOpacity * 0.5}) 100%)`,
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

  // Text container layer
  const textContainerLayer: RenderableComponentData = {
    id: 'text-container-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col justify-center items-center',
        style: {
          gap: '40px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: textChildren,
  };

  // Foreground fog overlay
  const foregroundFogOverlay: RenderableComponentData = {
    id: 'foreground-fog-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(ellipse at center, rgba(20, 20, 30, 0) 0%, rgba(20, 20, 30, ${fogOpacity * 0.6}) 70%, rgba(20, 20, 30, ${fogOpacity}) 100%)`,
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-fog-reveal-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      backgroundFogLayer,
      textContainerLayer,
      foregroundFogOverlay,
    ],
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'cinematic-fog-text-reveal',
  title: 'Cinematic Fog Text Reveal',
  description:
    'Typokinetic preset creating cinematic text reveals where words emerge from fog and drift past like film credits in a misty atmosphere. Features three-layer composition with background fog, animated text with depth transformations, and foreground fog overlay. Text materializes from blur and low opacity, becomes sharp at the focal point, then fades back into mist with scale and drift animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'cinematic',
    'fog',
    'mist',
    'atmosphere',
    'depth',
    'reveal',
    'film-credits',
    'layered',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Cinematic Text Reveal',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Cinematic',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'Text',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'Reveal',
            start: 2,
            absoluteStart: 2,
            end: 3,
            absoluteEnd: 3,
            duration: 1,
            confidence: 1,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    effectDuration: 5,
    driftAmount: 20,
    blurIntensity: 8,
    fogOpacity: 0.6,
    backgroundColor: '#0a0a0a',
  },
};

// ==================== EXPORT ====================

export const cinematicFogTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
