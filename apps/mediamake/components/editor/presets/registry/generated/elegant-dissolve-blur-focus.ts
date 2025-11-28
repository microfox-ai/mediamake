/**
 * Elegant Dissolve-In Blur-to-Focus Text Effect Preset
 *
 * This preset creates an elegant dissolve-in effect where each line of text materializes
 * through a blur-to-focus transition combined with opacity fade. Each line starts at 0% 
 * opacity with a 10px blur filter, then animates to 100% opacity with 0px blur.
 *
 * This technique mimics depth-of-field focus pulls used in cinematography, where text 
 * comes into focus as if the camera is adjusting. Lines begin animating with 0.2-second 
 * overlaps for a flowing, organic feel.
 *
 * Features:
 * - Blur-to-focus transitions (10px blur → 0px blur)
 * - Opacity fade-in (0% → 100%)
 * - Smooth ease-in-out curves over 0.8 seconds
 * - 0.2-second overlapping animations for organic flow
 * - Elegant typography with font-light tracking-tight styling
 * - Gradient background (gray-50 to white)
 * - Performance optimized with will-change hints
 *
 * Use cases:
 * - Luxury brand content
 * - Artistic presentations
 * - High-end product reveals
 * - Cinematic title sequences
 * - Premium service advertisements
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['Elegance in Motion', 'Refined Beauty', 'Timeless Sophistication'])
    .describe('Array of text lines to display (1-10 lines)'),
  fontSize: z
    .number()
    .min(16)
    .max(120)
    .default(48)
    .describe('Font size in pixels (16-120)'),
  textColor: z
    .string()
    .default('#111827')
    .describe('Text color (CSS color value, default: gray-900)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font)'),
  fontWeight: z
    .enum(['100', '200', '300', '400', '500', '600', '700', '800', '900'])
    .default('300')
    .describe('Font weight (100-900, default: 300 light)'),
  letterSpacing: z
    .number()
    .min(-5)
    .max(20)
    .default(-1)
    .describe('Letter spacing in pixels (-5 to 20, default: -1 tight)'),
  lineSpacing: z
    .number()
    .min(10)
    .max(100)
    .default(24)
    .describe('Vertical spacing between lines in pixels (10-100)'),
  animationDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration of each line animation in seconds (0.3-3)'),
  animationOverlap: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Overlap time between line animations in seconds (0-1)'),
  initialBlur: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Initial blur amount in pixels (0-30)'),
  backgroundGradientFrom: z
    .string()
    .default('#F9FAFB')
    .describe('Background gradient start color (CSS color value, default: gray-50)'),
  backgroundGradientTo: z
    .string()
    .default('#FFFFFF')
    .describe('Background gradient end color (CSS color value, default: white)'),
  totalDuration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration of the preset in seconds (1-30)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    fontSize,
    textColor,
    fontFamily,
    fontWeight,
    letterSpacing,
    lineSpacing,
    animationDuration,
    animationOverlap,
    initialBlur,
    backgroundGradientFrom,
    backgroundGradientTo,
    totalDuration,
  } = params;

  // Calculate stagger timing for each line
  const calculateLineStartTime = (index: number): number => {
    // Each line starts with overlap: line 0 at 0s, line 1 at (0.8 - 0.2)s = 0.6s, etc.
    return index * (animationDuration - animationOverlap);
  };

  // Create child components for each line
  const lineComponents: RenderableComponentData[] = lines.map((lineText, index) => {
    const lineWrapperId = `elegant-dissolve-line-${index}-wrapper`;
    const lineTextId = `elegant-dissolve-line-${index}-text`;
    const lineEffectId = `elegant-dissolve-line-${index}-effect`;

    // Calculate start time for this line's animation
    const lineStartTime = calculateLineStartTime(index);

    // Line wrapper layout
    const lineWrapper: RenderableComponentData = {
      id: lineWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          style: {
            willChange: 'filter, opacity',
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
        {
          id: lineTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: lineText,
            className: `text-[${fontSize}px] font-light tracking-tight`,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              letterSpacing: `${letterSpacing}px`,
              color: textColor,
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
              subsets: ['latin'],
              display: 'swap',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    return lineWrapper;
  });

  // Create effects for each line (attached to root container, targeting line wrappers)
  const lineEffects = lines.map((_, index) => {
    const lineWrapperId = `elegant-dissolve-line-${index}-wrapper`;
    const lineEffectId = `elegant-dissolve-line-${index}-effect`;
    const lineStartTime = calculateLineStartTime(index);

    return {
      id: lineEffectId,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: lineStartTime,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [lineWrapperId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'filter', val: `blur(${initialBlur}px)`, prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    };
  });

  // Root container with gradient background
  const rootContainer: RenderableComponentData = {
    id: 'elegant-dissolve-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'min-h-screen flex flex-col items-center justify-center',
        style: {
          gap: `${lineSpacing}px`,
          background: `linear-gradient(to bottom, ${backgroundGradientFrom}, ${backgroundGradientTo})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: lineEffects,
    childrenData: lineComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elegant-dissolve-blur-focus',
  title: 'Elegant Dissolve-In Blur-to-Focus Text Effect',
  description:
    'Elegant dissolve-in effect where each line of text materializes through a blur-to-focus transition combined with opacity fade. Mimics depth-of-field focus pulls from cinematography with smooth ease-in-out curves. Lines animate with 0.2-second overlaps for flowing, organic feel. Perfect for luxury brand content or artistic presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'blur',
    'focus',
    'fade',
    'dissolve',
    'elegant',
    'luxury',
    'cinematic',
    'depth-of-field',
    'artistic',
    'premium',
  ],
  defaultInputParams: {
    lines: ['Elegance in Motion', 'Refined Beauty', 'Timeless Sophistication'],
    fontSize: 48,
    textColor: '#111827',
    fontFamily: 'Inter',
    fontWeight: '300',
    letterSpacing: -1,
    lineSpacing: 24,
    animationDuration: 0.8,
    animationOverlap: 0.2,
    initialBlur: 10,
    backgroundGradientFrom: '#F9FAFB',
    backgroundGradientTo: '#FFFFFF',
    totalDuration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const elegantDissolveBlurFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
