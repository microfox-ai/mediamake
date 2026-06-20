/**
 * Typokinetics Gravity Breathing Preset
 *
 * Sci-fi inspired typography preset where text responds to invisible gravitational forces
 * with asymmetric breathing animations - slow 3-second expansion followed by quick 1-second
 * contraction with bounce-back overshoot. Features word-level gravity mass calculations where
 * impact words scale more dramatically, letter-spacing stretching effects, and subtle 3D
 * perspective transforms for depth.
 *
 * Features:
 * - Asymmetric breathing cycle: 3s expansion (ease-out) → 1s contraction (spring with overshoot)
 * - Letter-spacing animation: 0px → 3px during expansion
 * - Subtle perspective tilt: rotateX 0deg → 5deg
 * - Word-level gravity mass: High-impact words scale 1.3x more
 * - Hardware-accelerated transforms with transform3d()
 * - 3D depth with perspective container
 *
 * Use Cases:
 * - Sci-fi title sequences with gravity well effects
 * - Dynamic captions that respond to emphasis/impact
 * - Futuristic typography animations
 * - Music visualizers with kinetic text
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

// Parameter schema
const presetParams = z.object({
  // Caption data
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

  // Typography settings
  font: z
    .string()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or rgba)'),

  // Gravity breathing animation
  expansionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Duration of expansion phase in seconds'),
  contractionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of contraction phase in seconds'),
  overshootScale: z
    .number()
    .min(0.9)
    .max(0.99)
    .default(0.95)
    .describe('Scale overshoot value during contraction bounce-back'),

  // Effect intensities
  maxScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Maximum scale during expansion'),
  maxLetterSpacing: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Maximum letter-spacing in pixels during expansion'),
  maxRotateX: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Maximum rotateX perspective tilt in degrees'),

  // Impact multiplier
  impactMultiplier: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.2)
    .describe(
      'Multiplier for metadata.impact to calculate word-level gravity mass',
    ),
  highImpactThreshold: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Impact threshold for high-impact words (1.3x scale multiplier)'),

  // Layout positioning
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of the text'),
  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of the text'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: {
      fontStyle?: string;
      fontWeight?: number;
    } = {};

    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  // Helper: Calculate gravity mass scale
  const calculateGravityMass = (
    caption: TranscriptionSentence,
    baseScale: number,
  ) => {
    const impact = caption.metadata?.impact ?? 1.0;
    const gravityMass = impact * params.impactMultiplier + 1.0;

    // High-impact words get 1.3x multiplier
    const isHighImpact = impact >= params.highImpactThreshold;
    const scaleMultiplier = isHighImpact ? 1.3 : 1.0;

    return baseScale * gravityMass * scaleMultiplier;
  };

  // Helper: Create gravity breathing effect for a word
  const createGravityBreathingEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    gravityScale: number,
  ) => {
    const cycleDuration =
      params.expansionDuration + params.contractionDuration;
    const numCycles = Math.ceil(wordDuration / cycleDuration);

    const effects: any[] = [];

    for (let i = 0; i < numCycles; i++) {
      const cycleStart = wordStart + i * cycleDuration;

      // Expansion phase (ease-out)
      const expansionEffect: GenericEffectData = {
        type: 'ease-out',
        start: cycleStart,
        duration: params.expansionDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale animation
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: gravityScale * params.maxScale, prog: 1 },
          // Letter-spacing animation
          { key: 'letterSpacing', val: '0px', prog: 0 },
          { key: 'letterSpacing', val: `${params.maxLetterSpacing}px`, prog: 1 },
          // Perspective tilt
          { key: 'rotateX', val: 0, prog: 0 },
          { key: 'rotateX', val: params.maxRotateX, prog: 1 },
        ],
      };

      // Contraction phase (spring with overshoot)
      const contractionEffect: GenericEffectData = {
        type: 'spring',
        start: cycleStart + params.expansionDuration,
        duration: params.contractionDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale with overshoot
          { key: 'scale', val: gravityScale * params.maxScale, prog: 0 },
          { key: 'scale', val: params.overshootScale, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
          // Letter-spacing return
          { key: 'letterSpacing', val: `${params.maxLetterSpacing}px`, prog: 0 },
          { key: 'letterSpacing', val: '0px', prog: 1 },
          // Perspective return
          { key: 'rotateX', val: params.maxRotateX, prog: 0 },
          { key: 'rotateX', val: 0, prog: 1 },
        ],
      };

      effects.push(
        {
          id: `gravity-expand-${wordId}-cycle-${i}`,
          componentId: 'generic',
          data: expansionEffect,
        },
        {
          id: `gravity-contract-${wordId}-cycle-${i}`,
          componentId: 'generic',
          data: contractionEffect,
        },
      );
    }

    return effects;
  };

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Position class mapping
  const positionClasses = {
    top: 'items-start pt-12',
    center: 'items-center',
    bottom: 'items-end pb-12',
  };

  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = params.captions.map(
    (caption) => {
      // Calculate gravity mass for this caption
      const gravityScale = calculateGravityMass(caption, 1.0);

      // Build word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, index) => {
          const wordId = `typokinetics-word-${caption.id}-${index}`;

          // Create gravity breathing effects
          const effects = createGravityBreathingEffect(
            wordId,
            word.start,
            word.duration,
            gravityScale,
          );

          return {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                marginRight: '0.3em',
                display: 'inline-block',
                transform: 'translate3d(0,0,0)',
                willChange: 'transform, letter-spacing',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects,
          } as RenderableComponentData;
        },
      );

      // Caption container
      return {
        id: `typokinetics-caption-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex ${positionClasses[params.position]} ${alignClasses[params.horizontalAlign]}`,
            style: {
              perspective: '800px',
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
        childrenData: [
          {
            id: `typokinetics-words-${caption.id}`,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-wrap items-center justify-center gap-2',
                style: {
                  willChange: 'transform, letter-spacing',
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
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-gravity-breathing-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
        style: {
          perspective: '800px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    childrenData: captionContainers,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-gravity-breathing',
  title: 'Typokinetics Gravity Breathing',
  description:
    'Sci-fi inspired typography preset where text responds to invisible gravitational forces with asymmetric breathing animations - slow 3-second expansion followed by quick 1-second contraction with bounce-back overshoot. Features word-level gravity mass calculations where impact words scale more dramatically, letter-spacing stretching effects, and subtle 3D perspective transforms for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'kinetic',
    'sci-fi',
    'gravity',
    'breathing',
    'asymmetric',
    '3d',
    'perspective',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Gravity pulls and releases',
        start: 0,
        absoluteStart: 0,
        end: 5,
        absoluteEnd: 5,
        duration: 5,
        words: [
          {
            id: 'word-1',
            text: 'Gravity',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'pulls',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'and',
            start: 2,
            absoluteStart: 2,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 0.5,
            confidence: 1,
          },
          {
            id: 'word-4',
            text: 'releases',
            start: 2.5,
            absoluteStart: 2.5,
            end: 5,
            absoluteEnd: 5,
            duration: 2.5,
            confidence: 1,
          },
        ],
        metadata: {
          impact: 1.5,
        },
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#FFFFFF',
    expansionDuration: 3,
    contractionDuration: 1,
    overshootScale: 0.95,
    maxScale: 1.2,
    maxLetterSpacing: 3,
    maxRotateX: 5,
    impactMultiplier: 0.2,
    highImpactThreshold: 1.2,
    position: 'center',
    horizontalAlign: 'center',
  },
};

// Export
export const typokineticsGravityBreathingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
