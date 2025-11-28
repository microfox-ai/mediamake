/**
 * Viscous Liquid Text Animation Preset
 *
 * Creates a text animation where letters move like they're suspended in thick honey or gel.
 * Features slow, exaggerated deformations with high resistance, blob-like distortions that
 * stretch and compress letterforms. Includes magnification effects at distortion points
 * (as if the thick liquid acts as a lens) and subtle color shifts following distortion waves.
 *
 * Technical features:
 * - Spring physics with extreme easing for viscous movement
 * - Complex transform chains: scaleX, scaleY, translateY with 4-5 second periods
 * - Neighbor influence through staggered delays
 * - Magnification pulse effect simulating lens-like behavior
 * - Color shifts via hue-rotate following distortion phase
 * - SVG goo filter for blob-like visual effect
 *
 * Use cases:
 * - Creating unique text animations with liquid physics
 * - Building viscous, honey-like text effects
 * - Adding organic, fluid motion to titles
 * - Creating lava lamp-style text distortions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('VISCOUS!')
    .describe('Text to display with viscous liquid animation'),
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(120)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:700" for weight 700)'),
  textColor: z.string().default('#ffffff').describe('Base text color'),
  duration: z
    .number()
    .min(3)
    .max(30)
    .default(10)
    .describe('Total animation duration in seconds'),
  viscosity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Viscosity multiplier (higher = slower, more resistance)'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall animation intensity multiplier'),
  enableGooFilter: z
    .boolean()
    .default(true)
    .describe('Enable SVG goo filter for blob-like effect'),
  enableColorShift: z
    .boolean()
    .default(true)
    .describe('Enable color shifts following distortion waves'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default to bold
  }

  // Split text into letters
  const text = params.text || 'VISCOUS!';
  const letters = text.split('');
  const numLetters = letters.length;

  // Calculate timing parameters with viscosity
  const basePeriod = 4.5 * params.viscosity; // Base period for effects
  const staggerDelay = (index: number) =>
    Math.sin(index * 0.5) * basePeriod * 0.3; // Neighbor influence delay

  // SVG goo filter definition
  const gooFilterSVG = params.enableGooFilter
    ? `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="viscous-goo" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  `
    : '';

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `viscous-letter-${index}`;
      const delay = staggerDelay(index);

      // Base letter TextAtom
      const letterAtom: RenderableComponentData = {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter,
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: fontStyle.fontWeight,
            color: params.textColor,
            display: 'inline-block',
            filter: params.enableGooFilter ? 'url(#viscous-goo)' : undefined,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [],
      };

      // Effect 1: ScaleX and ScaleY (blob-like distortion)
      const scaleEffect: GenericEffectData = {
        type: 'spring',
        start: delay,
        duration: basePeriod,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'scaleX', val: 0.85 * params.intensity, prog: 0 },
          { key: 'scaleX', val: 1.15 * params.intensity, prog: 0.5 },
          { key: 'scaleX', val: 0.85 * params.intensity, prog: 1 },
          { key: 'scaleY', val: 1.2 * params.intensity, prog: 0 },
          { key: 'scaleY', val: 0.8 * params.intensity, prog: 0.5 },
          { key: 'scaleY', val: 1.2 * params.intensity, prog: 1 },
        ],
      };

      // Effect 2: TranslateY (vertical movement)
      const translateEffect: GenericEffectData = {
        type: 'spring',
        start: delay + 0.2,
        duration: basePeriod,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          {
            key: 'translateY',
            val: -15 * params.intensity,
            prog: 0,
          },
          {
            key: 'translateY',
            val: 15 * params.intensity,
            prog: 0.5,
          },
          {
            key: 'translateY',
            val: -15 * params.intensity,
            prog: 1,
          },
        ],
      };

      // Effect 3: Magnification pulse (lens effect)
      const magnifyEffect: GenericEffectData = {
        type: 'spring',
        start: delay + 0.4,
        duration: basePeriod,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.08 * params.intensity, prog: 0.25 },
          { key: 'scale', val: 1, prog: 0.5 },
          { key: 'scale', val: 1.08 * params.intensity, prog: 0.75 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Effect 4: Color shift (hue-rotate following distortion)
      const colorEffect: GenericEffectData | null = params.enableColorShift
        ? {
            type: 'spring',
            start: delay + 0.6,
            duration: basePeriod,
            mode: 'provider',
            targetIds: [letterId],
            ranges: [
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
              {
                key: 'filter',
                val: `hue-rotate(${15 * params.intensity}deg)`,
                prog: 0.5,
              },
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
            ],
          }
        : null;

      // Attach effects to letter
      letterAtom.effects = [
        {
          id: `scale-effect-${index}`,
          componentId: 'generic',
          data: scaleEffect,
        },
        {
          id: `translate-effect-${index}`,
          componentId: 'generic',
          data: translateEffect,
        },
        {
          id: `magnify-effect-${index}`,
          componentId: 'generic',
          data: magnifyEffect,
        },
      ];

      if (colorEffect) {
        letterAtom.effects.push({
          id: `color-effect-${index}`,
          componentId: 'generic',
          data: colorEffect,
        });
      }

      return letterAtom;
    },
  );

  // SVG filter container (if enabled)
  const filterContainer: RenderableComponentData | null = params.enableGooFilter
    ? ({
        id: 'viscous-goo-filter-container',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: gooFilterSVG,
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none' as const,
            width: '0',
            height: '0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Text container layout
  const textContainer: RenderableComponentData = {
    id: 'viscous-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          gap: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterComponents,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'viscous-liquid-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-visible flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: filterContainer
      ? [filterContainer, textContainer]
      : [textContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'viscousLiquidText',
  title: 'Viscous Liquid Text Animation',
  description:
    'Text animation where letters move as if suspended in thick honey or gel. Features slow, exaggerated deformations with high resistance, blob-like distortions, magnification effects, and color shifts. Includes SVG goo filter for realistic viscous appearance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'viscous',
    'liquid',
    'honey',
    'gel',
    'blob',
    'distortion',
    'spring',
    'organic',
    'fluid',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'VISCOUS!',
    fontSize: 120,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    duration: 10,
    viscosity: 1,
    intensity: 1,
    enableGooFilter: true,
    enableColorShift: true,
  },
};

// Export preset
export const viscousLiquidTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
