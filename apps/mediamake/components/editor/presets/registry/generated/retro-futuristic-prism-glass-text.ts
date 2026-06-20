/**
 * Retro-Futuristic 70s Molten Glass Prism Text Preset
 *
 * This preset creates psychedelic 70s-inspired text with a molten glass aesthetic featuring:
 * - Prismatic rainbow refractions through RGB layer separation and blend modes
 * - Liquid mercury outline with animated lighting effects
 * - Particle materialization entry animation
 * - Breathing heartbeat effect during hold phase
 * - Chromatic aberration through animated layer offsets
 *
 * Features:
 * - Multi-layer prism effect with RGB separation (red/green/blue layers)
 * - Animated layer offsets for dynamic chromatic aberration
 * - Mercury-style outline with animated glow/ripple effects
 * - Entry animation: scattered particles converging to solid letters
 * - Hold phase: breathing scale animation with brightness pulsing
 * - Rubik Mono One font for geometric retro feel
 *
 * Use cases:
 * - Retro 70s style titles and overlays
 * - Psychedelic music video text
 * - Futuristic sci-fi titles
 * - Artistic text effects with vintage aesthetics
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

// ===========================
// PARAMETER SCHEMA
// ===========================

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
    .describe('Array of caption objects with word-level timing data'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels for the text'),

  font: z
    .string()
    .default('Rubik Mono One:400')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Rubik Mono One:400")',
    ),

  entryDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(1)
    .optional()
    .describe('Duration of the entry animation in seconds'),

  breathingDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Duration of one breathing cycle in seconds'),

  prismIntensity: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Maximum offset for prism layer separation in pixels'),

  mercuryGlowIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for mercury outline glow effect'),
});

// ===========================
// PRESET EXECUTION
// ===========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize = 72,
    font = 'Rubik Mono One:400',
    entryDuration = 1,
    breathingDuration = 3,
    prismIntensity = 3,
    mercuryGlowIntensity = 1,
  } = params;

  // Parse font string
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontStyle: React.CSSProperties = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const allWordComponents: RenderableComponentData[] = [];

  // Process each caption
  captions.forEach((caption, captionIndex) => {
    const { words, absoluteStart, duration } = caption;

    // Process each word
    words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordContainerId = `word-container-${captionIndex}-${wordIndex}`;

      // Create prism layer IDs
      const prismRedId = `prism-red-${captionIndex}-${wordIndex}`;
      const prismGreenId = `prism-green-${captionIndex}-${wordIndex}`;
      const prismBlueId = `prism-blue-${captionIndex}-${wordIndex}`;
      const mercuryId = `mercury-${captionIndex}-${wordIndex}`;
      const mainTextId = `main-text-${captionIndex}-${wordIndex}`;

      // Base text atom data
      const baseTextData: TextAtomData = {
        text: word.text,
        style: {
          fontSize,
          fontWeight: fontStyle.fontWeight || 400,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['400'],
        },
      };

      // Prism layer - Red
      const prismRedLayer: RenderableComponentData = {
        id: prismRedId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          ...baseTextData,
          style: {
            ...baseTextData.style,
            position: 'absolute',
            inset: '0',
            mixBlendMode: 'multiply',
            color: 'hsl(0, 100%, 50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      };

      // Prism layer - Green
      const prismGreenLayer: RenderableComponentData = {
        id: prismGreenId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          ...baseTextData,
          style: {
            ...baseTextData.style,
            position: 'absolute',
            inset: '0',
            mixBlendMode: 'screen',
            color: 'hsl(120, 100%, 50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      };

      // Prism layer - Blue
      const prismBlueLayer: RenderableComponentData = {
        id: prismBlueId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          ...baseTextData,
          style: {
            ...baseTextData.style,
            position: 'absolute',
            inset: '0',
            mixBlendMode: 'overlay',
            color: 'hsl(240, 100%, 50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      };

      // Mercury outline layer
      const mercuryLayer: RenderableComponentData = {
        id: mercuryId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          ...baseTextData,
          style: {
            ...baseTextData.style,
            position: 'absolute',
            inset: '0',
            WebkitTextStroke: '3px rgba(200,200,220,0.9)',
            color: 'transparent',
            filter:
              'drop-shadow(0 0 4px rgba(200,220,255,0.8)) drop-shadow(0 0 8px rgba(180,200,240,0.6))',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      };

      // Main text layer
      const mainTextLayer: RenderableComponentData = {
        id: mainTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          ...baseTextData,
          style: {
            ...baseTextData.style,
            position: 'relative',
            color: '#ffffff',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      };

      // ===========================
      // EFFECTS
      // ===========================

      const effects: any[] = [];

      // Entry effect (particle convergence)
      const entryEffect = {
        id: `entry-${wordContainerId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          start: 0,
          duration: entryDuration,
          mode: 'provider',
          targetIds: [wordContainerId],
          ranges: [
            { key: 'letterSpacing', val: '2em', prog: 0 },
            { key: 'letterSpacing', val: '0em', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 1.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(entryEffect);

      // Breathing scale effect (starts after entry)
      const breathingScaleEffect = {
        id: `breathing-scale-${wordContainerId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: entryDuration,
          duration: breathingDuration,
          mode: 'provider',
          targetIds: [wordContainerId],
          loop: true,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.08, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(breathingScaleEffect);

      // Breathing brightness effect (starts after entry)
      const breathingBrightnessEffect = {
        id: `breathing-brightness-${mainTextId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: entryDuration,
          duration: breathingDuration,
          mode: 'provider',
          targetIds: [mainTextId],
          loop: true,
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 1.1, prog: 0.5 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(breathingBrightnessEffect);

      // Prism red offset X
      const prismRedOffsetX = {
        id: `prism-red-x-${prismRedId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2,
          mode: 'provider',
          targetIds: [prismRedId],
          loop: true,
          ranges: [
            { key: 'translateX', val: -prismIntensity, prog: 0 },
            { key: 'translateX', val: prismIntensity, prog: 0.5 },
            { key: 'translateX', val: -prismIntensity, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(prismRedOffsetX);

      // Prism red offset Y
      const prismRedOffsetY = {
        id: `prism-red-y-${prismRedId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2.5,
          mode: 'provider',
          targetIds: [prismRedId],
          loop: true,
          ranges: [
            { key: 'translateY', val: 2, prog: 0 },
            { key: 'translateY', val: -2, prog: 0.5 },
            { key: 'translateY', val: 2, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(prismRedOffsetY);

      // Prism green offset X
      const prismGreenOffsetX = {
        id: `prism-green-x-${prismGreenId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2.2,
          mode: 'provider',
          targetIds: [prismGreenId],
          loop: true,
          ranges: [
            { key: 'translateX', val: prismIntensity, prog: 0 },
            { key: 'translateX', val: -prismIntensity, prog: 0.5 },
            { key: 'translateX', val: prismIntensity, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(prismGreenOffsetX);

      // Prism green offset Y
      const prismGreenOffsetY = {
        id: `prism-green-y-${prismGreenId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.8,
          mode: 'provider',
          targetIds: [prismGreenId],
          loop: true,
          ranges: [
            { key: 'translateY', val: -2, prog: 0 },
            { key: 'translateY', val: 2, prog: 0.5 },
            { key: 'translateY', val: -2, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(prismGreenOffsetY);

      // Prism blue offset X
      const prismBlueOffsetX = {
        id: `prism-blue-x-${prismBlueId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.9,
          mode: 'provider',
          targetIds: [prismBlueId],
          loop: true,
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -prismIntensity, prog: 0.33 },
            { key: 'translateX', val: prismIntensity, prog: 0.66 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(prismBlueOffsetX);

      // Prism blue offset Y
      const prismBlueOffsetY = {
        id: `prism-blue-y-${prismBlueId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2.3,
          mode: 'provider',
          targetIds: [prismBlueId],
          loop: true,
          ranges: [
            { key: 'translateY', val: 3, prog: 0 },
            { key: 'translateY', val: -3, prog: 0.5 },
            { key: 'translateY', val: 3, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(prismBlueOffsetY);

      // Mercury ripple effect (starts after entry)
      const baseGlow = `0 0 4px rgba(200,220,255,${0.8 * mercuryGlowIntensity}), 0 0 8px rgba(180,200,240,${0.6 * mercuryGlowIntensity})`;
      const peakGlow = `0 0 8px rgba(200,220,255,${1 * mercuryGlowIntensity}), 0 0 16px rgba(180,200,240,${0.9 * mercuryGlowIntensity}), 0 0 24px rgba(160,180,220,${0.5 * mercuryGlowIntensity})`;

      const mercuryRippleEffect = {
        id: `mercury-ripple-${mercuryId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: entryDuration,
          duration: breathingDuration,
          mode: 'provider',
          targetIds: [mercuryId],
          loop: true,
          ranges: [
            { key: 'textShadow', val: baseGlow, prog: 0 },
            { key: 'textShadow', val: peakGlow, prog: 0.5 },
            { key: 'textShadow', val: baseGlow, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(mercuryRippleEffect);

      // Word container with all layers
      const wordContainer: RenderableComponentData = {
        id: wordContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex',
            style: {
              display: 'inline-flex',
              position: 'relative',
            },
          },
        },
        context: {
          timing: {
            start: absoluteStart,
            duration,
          },
        },
        effects,
        childrenData: [
          prismRedLayer,
          prismGreenLayer,
          prismBlueLayer,
          mercuryLayer,
          mainTextLayer,
        ] as RenderableComponentData[],
      };

      allWordComponents.push(wordContainer);
    });
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-prism-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap gap-6 items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 30,
      },
    },
    childrenData: allWordComponents as RenderableComponentData[],
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'retro-futuristic-prism-glass-text',
  title: 'Retro-Futuristic 70s Molten Glass Prism Text',
  description:
    'A psychedelic 70s-inspired text preset featuring molten glass aesthetics with prismatic rainbow refractions. Words materialize from scattered color particles, display with chromatic aberration through RGB layer separation using blend modes, and feature a liquid mercury outline effect. Includes breathing animation during hold phase where text pulses with heartbeat-like expansion and contraction. Uses Rubik Mono One font for geometric retro feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'retro',
    '70s',
    'psychedelic',
    'prism',
    'glass',
    'molten',
    'mercury',
    'chromatic',
    'breathing',
    'particles',
    'refractions',
    'rainbow',
    'futuristic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'RETRO VIBES',
        start: 0,
        absoluteStart: 0,
        end: 5,
        absoluteEnd: 5,
        duration: 5,
        words: [
          {
            id: 'word-1',
            text: 'RETRO',
            start: 0,
            absoluteStart: 0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 2.5,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'VIBES',
            start: 2.5,
            absoluteStart: 2.5,
            end: 5,
            absoluteEnd: 5,
            duration: 2.5,
            confidence: 1,
          },
        ],
      },
    ],
    fontSize: 72,
    font: 'Rubik Mono One:400',
    entryDuration: 1,
    breathingDuration: 3,
    prismIntensity: 3,
    mercuryGlowIntensity: 1,
  },
};

// ===========================
// EXPORT
// ===========================

export const retroFuturisticPrismGlassTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
