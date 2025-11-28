/**
 * Apple Keynote Typokinetic Preset
 * 
 * A minimalist typokinetic preset inspired by Apple Keynote presentations. Text lines
 * materialize from transparency with subtle upward motion (20-30px). Features slow
 * ease-in-out animations (1.5s duration), generous luxury spacing, and smooth
 * elevator-system choreography where existing lines shift up gracefully to accommodate
 * new entries.
 * 
 * Design Philosophy:
 * - Restraint and elegance over flashiness
 * - No bounces, overshoots, or aggressive motion
 * - Smooth, confident animations that guide the eye naturally upward
 * - Premium brand typography with generous spacing
 * - Perfect alignment and stacking
 * 
 * Features:
 * - Fade-in + subtle slide-up reveal (opacity 0→1, translateY -30px→0)
 * - Slow ease-in-out curve (1.5s duration) for weight and importance
 * - Elevator-shift choreography: existing lines move up smoothly when new lines appear
 * - 0.5s overlap between consecutive line animations for flow
 * - Large typography (text-5xl) with light font weight and wide tracking
 * - Centered layout with generous spacing (min-h-screen, px-8 py-16)
 * 
 * Use Cases:
 * - Premium brand presentations
 * - Luxury product reveals
 * - High-end corporate content
 * - Elegant title sequences
 * - Sophisticated text-based storytelling
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(8)
    .describe('Array of text lines to display (1-8 lines)'),
  duration: z
    .number()
    .positive()
    .optional()
    .describe('Total duration in seconds (auto-calculated if not provided)'),
  fontSize: z
    .string()
    .optional()
    .default('text-5xl')
    .describe('Tailwind font size class (default: text-5xl)'),
  fontWeight: z
    .string()
    .optional()
    .default('font-light')
    .describe('Tailwind font weight class (default: font-light)'),
  tracking: z
    .string()
    .optional()
    .default('tracking-wide')
    .describe('Tailwind letter spacing class (default: tracking-wide)'),
  textColor: z
    .string()
    .optional()
    .default('text-white')
    .describe('Tailwind text color class (default: text-white)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Helvetica")',
    ),
  lineSpacing: z
    .number()
    .min(4)
    .max(16)
    .optional()
    .default(8)
    .describe('Vertical spacing between lines in Tailwind units (mb-N, default: 8)'),
  animationDuration: z
    .number()
    .min(0.5)
    .max(3)
    .optional()
    .default(1.5)
    .describe('Duration of each line animation in seconds (default: 1.5s)'),
  animationOverlap: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Overlap between consecutive line animations in seconds (default: 0.5s)'),
  slideDistance: z
    .number()
    .min(10)
    .max(50)
    .optional()
    .default(30)
    .describe('Distance of upward slide motion in pixels (default: 30px)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    duration,
    fontSize = 'text-5xl',
    fontWeight = 'font-light',
    tracking = 'tracking-wide',
    textColor = 'text-white',
    font,
    lineSpacing = 8,
    animationDuration = 1.5,
    animationOverlap = 0.5,
    slideDistance = 30,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string | undefined) => {
    if (!fontString) return { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontStyle: {} };
    
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2]; // 'normal' | 'italic'
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Calculate timing
  const lineInterval = animationDuration - animationOverlap; // Time between line starts
  const totalCalculatedDuration = lines.length * lineInterval + animationOverlap;
  const finalDuration = duration ?? totalCalculatedDuration;

  // Calculate elevator shift distance (approximate line height + spacing)
  const elevatorShiftDistance = 80; // Approximate shift per line (can be adjusted)

  // Create container and line components
  const lineContainers: RenderableComponentData[] = [];
  const allEffects: any[] = [];

  lines.forEach((lineText, index) => {
    const lineContainerId = `line-container-${index}`;
    const textLineId = `text-line-${index}`;
    const lineStartTime = index * lineInterval;

    // Create text atom for this line
    const textAtom: RenderableComponentData = {
      id: textLineId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: lineText,
        className: `${fontSize} ${fontWeight} ${tracking} ${textColor} text-center`,
        style: {
          lineHeight: '1.2',
          ...fontStyle,
        },
        ...(font ? {
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        } : {}),
      },
      context: {
        timing: {
          start: 0,
          duration: finalDuration,
        },
      },
    };

    // Create container for this line
    const lineContainer: RenderableComponentData = {
      id: lineContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `mb-${lineSpacing} w-full max-w-4xl`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: finalDuration,
        },
      },
      childrenData: [textAtom],
    };

    lineContainers.push(lineContainer);

    // Create fade-slide effect for this line (fade in + slide up)
    const fadeSlideEffect = {
      id: `fade-slide-line-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: lineStartTime,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [textLineId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateY', val: -slideDistance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };

    allEffects.push(fadeSlideEffect);

    // Create elevator-shift effects for previous lines
    // When line N appears, all previous lines (0 to N-1) shift up
    for (let prevIndex = 0; prevIndex < index; prevIndex++) {
      const prevContainerId = `line-container-${prevIndex}`;
      const shiftCount = index - prevIndex; // How many times this line has shifted
      const currentShift = shiftCount * elevatorShiftDistance;
      const nextShift = (shiftCount + 1) * elevatorShiftDistance;

      const elevatorShiftEffect = {
        id: `elevator-shift-line-${prevIndex}-step-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: lineStartTime,
          duration: animationDuration,
          mode: 'provider',
          targetIds: [prevContainerId],
          ranges: [
            { key: 'translateY', val: -currentShift, prog: 0 },
            { key: 'translateY', val: -nextShift, prog: 1 },
          ],
        } as GenericEffectData,
      };

      allEffects.push(elevatorShiftEffect);
    }
  });

  // Create root container with flex-col-reverse (lines stack from bottom)
  const rootContainer: RenderableComponentData = {
    id: 'keynote-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col-reverse justify-start items-center min-h-screen px-8 py-16',
        style: {
          fontFamily: font ? fontFamily : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: finalDuration,
      },
    },
    effects: allEffects,
    childrenData: lineContainers,
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'apple-keynote-typokinetic',
  title: 'Apple Keynote Typokinetic Preset',
  description:
    'Minimalist typokinetic preset inspired by Apple Keynote presentations. Text lines materialize from transparency with subtle upward motion (20-30px). Features slow ease-in-out animations (1.5s duration), generous luxury spacing, and smooth elevator-system choreography where existing lines shift up gracefully to accommodate new entries. Perfect for premium brand presentations requiring restraint and elegance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'apple',
    'keynote',
    'minimal',
    'elegant',
    'luxury',
    'premium',
    'fade',
    'slide',
    'smooth',
    'text',
    'presentation',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: [
      'Think Different',
      'Innovation distinguishes',
      'between a leader',
      'and a follower',
    ],
    fontSize: 'text-5xl',
    fontWeight: 'font-light',
    tracking: 'tracking-wide',
    textColor: 'text-white',
    font: 'Inter:300',
    lineSpacing: 8,
    animationDuration: 1.5,
    animationOverlap: 0.5,
    slideDistance: 30,
  },
};

// --- Export ---

export const appleKeynoteTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
