/**
 * Liquid Elastic Typography Preset
 *
 * Creates a dynamic liquid elastic typography effect where text behaves like stretchy jelly or slime.
 * Letters drip from above with elastic snap animations, morphing metallic gradients flow like liquid mercury,
 * and jiggle physics create ripple effects through neighboring letters. The entire text block feels cohesive
 * yet fluid, like a single organism made of colorful elastic material.
 *
 * Features:
 * - **Drip Entry Animation**: Letters enter by dripping from above with elastic goo-like stretching
 * - **Elastic Snap Physics**: Stretching like elastic goo before snapping into place with multiple wobbles
 * - **Morphing Gradients**: Metallic, iridescent colors that flow through text like liquid mercury
 * - **Jiggle Physics System**: Completed animations trigger subtle ripples through neighboring letters
 * - **Goo Effects**: SVG filters for authentic liquid goo visual effects
 * - **Connected Layout**: Letters overlap slightly to create cohesive organism feel
 *
 * Use Cases:
 * - Eye-catching title animations for creative content
 * - Social media intros with unique text effects
 * - Brand animations requiring fluid, organic motion
 * - Music video titles with dynamic kinetic energy
 * - Tech product reveals with modern, flowing aesthetics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  TextAtomData,
  HTMLBlockAtomData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

const presetParams = z.object({
  text: z
    .string()
    .default('LIQUID')
    .describe('Text content to display with liquid elastic effect'),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(96)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('Inter:900')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:900", "Roboto:700:italic")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (used as fallback)'),
  gradientColors: z
    .array(z.string())
    .default(['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'])
    .describe('Array of colors for the morphing metallic gradient'),
  dripDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of the drip entry animation in seconds'),
  wobbleDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of the wobble physics animation in seconds'),
  letterStagger: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each letter starting its animation in seconds'),
  gradientSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Duration for gradient animation cycle in seconds'),
  jiggleIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Intensity of jiggle physics ripples (0.1 = subtle, 1 = strong)'),
  totalDuration: z
    .number()
    .min(2)
    .max(30)
    .default(5)
    .describe('Total duration of the preset in seconds'),
  letterSpacing: z
    .number()
    .min(-10)
    .max(20)
    .default(-8)
    .describe('Letter spacing in pixels (negative for overlap)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
    if (!fontString.includes(':')) {
      return {
        family: fontString,
        style: {},
      };
    }

    const parts = fontString.split(':');
    const family = parts[0];
    const style: React.CSSProperties = {};

    if (parts.length > 1) {
      style.fontWeight = parseInt(parts[1], 10);
    }

    if (parts.length > 2) {
      style.fontStyle = parts[2] as 'normal' | 'italic';
    }

    return { family, style };
  };

  const { family: fontFamily, style: fontStyle } = parseFontString(
    params.font || 'Inter:900',
  );

  // Split text into letters
  const letters = params.text.split('');

  // Create gradient string from colors
  const gradientString = `linear-gradient(135deg, ${params.gradientColors.join(', ')})`;

  // Calculate animation timings
  const dripStart = (index: number) => params.letterStagger * index;
  const wobbleStart = (index: number) =>
    dripStart(index) + params.dripDuration;
  const jiggleStart = (index: number) =>
    wobbleStart(index) + params.wobbleDuration + 0.1;

  // Create SVG filter for goo effect
  const svgFilters = {
    id: 'svg-filters',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width="0" height="0" style="position: absolute; pointer-events: none;">
  <defs>
    <filter id="goo-effect" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
      <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
    </filter>
  </defs>
</svg>`,
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      },
    } as HTMLBlockAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
  };

  // Create letter components with effects
  const letterComponents = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const textAtomId = `text-atom-${index}`;

    // Drip effect
    const dripEffect = {
      id: `drip-effect-${index}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [letterId],
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        start: dripStart(index),
        duration: params.dripDuration,
        ranges: [
          { key: 'translateY', val: -200, prog: 0, unit: '%' },
          { key: 'translateY', val: 0, prog: 1, unit: '%' },
          { key: 'scaleY', val: 3, prog: 0 },
          { key: 'scaleY', val: 1, prog: 0.7 },
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(8px)', prog: 0.3 },
          { key: 'filter', val: 'blur(0px)', prog: 0.7 },
        ],
      } as GenericEffectData,
    };

    // Wobble effect
    const wobbleEffect = {
      id: `wobble-effect-${index}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [letterId],
        type: 'ease-out',
        start: wobbleStart(index),
        duration: params.wobbleDuration,
        ranges: [
          { key: 'rotate', val: -8, prog: 0, unit: 'deg' },
          { key: 'rotate', val: 8, prog: 0.25, unit: 'deg' },
          { key: 'rotate', val: -4, prog: 0.5, unit: 'deg' },
          { key: 'rotate', val: 4, prog: 0.75, unit: 'deg' },
          { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: 0.8, prog: 0.25 },
          { key: 'scaleX', val: 1.1, prog: 0.5 },
          { key: 'scaleX', val: 0.95, prog: 0.75 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Gradient flow effect
    const gradientEffect = {
      id: `gradient-flow-${index}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'linear',
        start: 0,
        duration: params.gradientSpeed,
        ranges: [
          { key: 'backgroundPosition', val: '0% 50%', prog: 0 },
          { key: 'backgroundPosition', val: '100% 50%', prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Jiggle physics effects for neighbors
    const jiggleEffects = [];
    if (index > 0) {
      // Trigger jiggle on previous letter
      jiggleEffects.push({
        id: `jiggle-prev-${index}`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [`letter-${index - 1}`],
          type: 'ease-out',
          start: jiggleStart(index),
          duration: 0.5,
          ranges: [
            { key: 'translateY', val: 0, prog: 0, unit: 'px' },
            {
              key: 'translateY',
              val: -3 * params.jiggleIntensity,
              prog: 0.25,
              unit: 'px',
            },
            {
              key: 'translateY',
              val: 3 * params.jiggleIntensity,
              prog: 0.5,
              unit: 'px',
            },
            {
              key: 'translateY',
              val: -2 * params.jiggleIntensity,
              prog: 0.75,
              unit: 'px',
            },
            { key: 'translateY', val: 0, prog: 1, unit: 'px' },
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1 + 0.05 * params.jiggleIntensity, prog: 0.5 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    if (index < letters.length - 1) {
      // Trigger jiggle on next letter
      jiggleEffects.push({
        id: `jiggle-next-${index}`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [`letter-${index + 1}`],
          type: 'ease-out',
          start: jiggleStart(index) + 0.1,
          duration: 0.5,
          ranges: [
            { key: 'translateY', val: 0, prog: 0, unit: 'px' },
            {
              key: 'translateY',
              val: -2 * params.jiggleIntensity,
              prog: 0.25,
              unit: 'px',
            },
            {
              key: 'translateY',
              val: 2 * params.jiggleIntensity,
              prog: 0.5,
              unit: 'px',
            },
            {
              key: 'translateY',
              val: -1 * params.jiggleIntensity,
              prog: 0.75,
              unit: 'px',
            },
            { key: 'translateY', val: 0, prog: 1, unit: 'px' },
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1 + 0.03 * params.jiggleIntensity, prog: 0.5 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    // Letter container
    const letterContainer = {
      id: letterId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            zIndex: letters.length - index,
            filter: 'url(#goo-effect)',
            marginRight: `${params.letterSpacing}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.totalDuration,
        },
      },
      effects: [dripEffect, wobbleEffect, ...jiggleEffects],
      childrenData: [
        {
          id: textAtomId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            className: 'font-black',
            style: {
              fontSize: params.fontSize,
              background: gradientString,
              backgroundSize: '400% 400%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['900'],
            },
          } as TextAtomData,
          effects: [gradientEffect],
          context: {
            timing: {
              start: 0,
              duration: params.totalDuration,
            },
          },
        },
      ],
    };

    return letterContainer;
  });

  // Root container
  const rootContainer = {
    id: 'liquid-elastic-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex items-center justify-center overflow-visible',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [
      svgFilters,
      {
        id: 'text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-row items-center justify-center',
            style: {},
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration,
          },
        },
        childrenData: letterComponents as RenderableComponentData[],
      },
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
  id: 'liquid-elastic-typography',
  title: 'Liquid Elastic Typography',
  description:
    'Dynamic liquid elastic typography where text behaves like stretchy jelly or slime. Letters drip from above with elastic snap animations, morphing metallic gradients flow like liquid mercury, and jiggle physics create ripple effects through neighboring letters. The entire text block feels cohesive yet fluid, like a single organism made of colorful elastic material.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'liquid',
    'elastic',
    'jelly',
    'slime',
    'drip',
    'goo',
    'gradient',
    'metallic',
    'mercury',
    'jiggle',
    'physics',
    'kinetic',
    'animated',
    'dynamic',
    'organic',
    'fluid',
    'creative',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID',
    fontSize: 96,
    font: 'Inter:900',
    textColor: '#FFFFFF',
    gradientColors: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'],
    dripDuration: 1.5,
    wobbleDuration: 0.8,
    letterStagger: 0.1,
    gradientSpeed: 5,
    jiggleIntensity: 0.5,
    totalDuration: 5,
    letterSpacing: -8,
  },
};

// --- Export ---

export const liquidElasticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
