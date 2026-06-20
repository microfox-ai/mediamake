/**
 * Kinetic Slide Shadow Typography Preset
 *
 * A sports broadcast-style kinetic typography effect where text slides in horizontally
 * with dramatic, directional drop shadows that stretch during movement. The shadows
 * create a motion blur illusion through transform animations, compressing as the text
 * decelerates into place.
 *
 * Features:
 * - Horizontal slide-in animation from off-screen right
 * - Directional drop shadows that stretch and compress during motion
 * - Snappy deceleration with cubic-bezier easing for dynamic feel
 * - Stepped multi-line reveals with staggered timing (0.2s offsets)
 * - Subtle rotation effect for extra kinetic energy
 * - GPU-accelerated transforms for smooth performance
 *
 * Use Cases:
 * - Sports broadcast lower thirds
 * - High-energy title sequences
 * - Multi-line captions with impact
 * - Bullet point reveals
 * - Action-oriented text animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Array of text lines to animate (1-5 lines)'),
  fontSize: z
    .number()
    .min(20)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  shadowColor: z
    .string()
    .default('#000000')
    .describe('Shadow color (hex or rgba)'),
  shadowOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Shadow opacity (0-1)'),
  lineSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Spacing between lines in pixels'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Delay between each line animation in seconds'),
  animationDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(1.2)
    .describe('Duration of slide-in animation per line in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the entire animation in seconds'),
  totalDuration: z
    .number()
    .min(1)
    .default(5)
    .describe('Total duration to display all lines in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    fontSize,
    fontFamily,
    textColor,
    shadowColor,
    shadowOpacity,
    lineSpacing,
    staggerDelay,
    animationDuration,
    startTime,
    totalDuration,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parsedFontFamily = fontFamily.includes(':')
    ? fontFamily.split(':')[0]
    : fontFamily;

  const fontStyle: React.CSSProperties = {};
  if (fontFamily.includes(':')) {
    const fontParts = fontFamily.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Build line components with staggered timing
  const lineComponents: RenderableComponentData[] = lines.map(
    (lineText, index) => {
      const lineStartTime = index * staggerDelay;
      const lineId = `line-container-${index}`;
      const shadowId = `shadow-${index}`;
      const textId = `text-${index}`;

      // Shadow component using HTMLBlockAtom
      const shadowComponent: RenderableComponentData = {
        id: shadowId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="absolute inset-0 bg-black pointer-events-none" style="opacity: ${shadowOpacity}; backface-visibility: hidden;"></div>`,
          className: 'absolute inset-0 transform-gpu',
          style: {
            backgroundColor: shadowColor,
            opacity: shadowOpacity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `shadow-stretch-${index}`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              cubicBezier: [0.68, -0.55, 0.265, 1.55],
              start: 0,
              duration: animationDuration,
              mode: 'provider',
              targetIds: [shadowId],
              ranges: [
                { key: 'scaleX', val: 1.5, prog: 0 },
                { key: 'scaleX', val: 1, prog: 1 },
                { key: 'skewX', val: -15, prog: 0 },
                { key: 'skewX', val: 0, prog: 1 },
                { key: 'blur', val: '8px', prog: 0 },
                { key: 'blur', val: '4px', prog: 1 },
              ],
            },
          },
        ],
      };

      // Text component
      const textComponent: RenderableComponentData = {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: lineText,
          className: 'transform-gpu backface-hidden',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            ...fontStyle,
          },
          font: {
            family: parsedFontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `slide-in-${index}`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              cubicBezier: [0.68, -0.55, 0.265, 1.55],
              start: 0,
              duration: animationDuration,
              mode: 'provider',
              targetIds: [textId],
              ranges: [
                { key: 'translateX', val: '150%', prog: 0 },
                { key: 'translateX', val: '0%', prog: 1 },
                { key: 'rotateZ', val: 2, prog: 0 },
                { key: 'rotateZ', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
              ],
            },
          },
        ],
      };

      // Line container with shadow and text
      const lineContainer: RenderableComponentData = {
        id: lineId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              marginBottom: index < lines.length - 1 ? `${lineSpacing}px` : '0',
            },
          },
        },
        context: {
          timing: {
            start: lineStartTime,
            duration: totalDuration - lineStartTime,
          },
        },
        childrenData: [shadowComponent, textComponent],
      };

      return lineContainer;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-slide-shadow-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex flex-col justify-center items-start px-12',
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: totalDuration,
      },
    },
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

const presetMetadata: PresetMetadata = {
  id: 'kinetic-slide-shadow-typography',
  title: 'Kinetic Slide Shadow Typography',
  description:
    'Sports broadcast-style kinetic typography with horizontal slide-in animation and directional drop shadows that stretch and compress during movement. Features stepped multi-line reveals with snappy deceleration, creating dramatic motion blur illusion through shadow transforms. Perfect for lower thirds, captions, and bullet points with dynamic, professional motion graphics feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'sports',
    'broadcast',
    'lower-third',
    'shadow',
    'motion-blur',
    'slide',
    'multi-line',
    'captions',
    'bullet-points',
  ],
  defaultInputParams: {
    lines: ['BREAKING NEWS', 'MAJOR ANNOUNCEMENT', 'STAY TUNED'],
    fontSize: 48,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    lineSpacing: 16,
    staggerDelay: 0.2,
    animationDuration: 1.2,
    startTime: 0,
    totalDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kineticSlideShadowTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
