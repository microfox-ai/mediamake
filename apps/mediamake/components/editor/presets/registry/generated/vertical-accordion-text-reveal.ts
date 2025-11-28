/**
 * Vertical Accordion Text Reveal Preset
 *
 * This preset creates a dramatic text reveal effect where text starts extremely compressed
 * vertically (scaleY 0.01, appearing as a thin horizontal line) and expands to full height
 * with a smooth deceleration curve. The effect mimics venetian blinds opening or text
 * unfolding from a flat line, similar to classic title sequence effects.
 *
 * Features:
 * - **Extreme Vertical Compression**: Text starts with scaleY(0.01), appearing as a flat line
 * - **Smooth Expansion**: Animates to scaleY(1) with bounce easing for natural motion
 * - **Perspective Depth**: Container uses perspective(1000px) for dimensional effect
 * - **Brightness Pulse**: Subtle brightness animation (1 → 1.4 → 1) at full expansion
 * - **Opacity Fade**: Combined fade-in (0 → 1) during expansion
 * - **Backdrop Blur**: Subtle blur effect during transition for production value
 * - **Center Transform Origin**: Scaling pivots from center for symmetrical expansion
 *
 * Use cases:
 * - Title sequences with dramatic reveals
 * - Opening credits with cinematic flair
 * - Product name reveals in promotional videos
 * - Episode title cards with impact
 * - Brand name unveils with sophistication
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('VERTICAL ACCORDION REVEAL')
    .describe('Text content to display with accordion reveal effect'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or named color)'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the reveal animation in seconds'),
  animationDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration of the accordion expansion animation in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time relative to parent timeline in seconds'),
  letterSpacing: z
    .string()
    .default('0.05em')
    .describe('Letter spacing for text (CSS value)'),
  textTransform: z
    .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
    .default('uppercase')
    .describe('Text transformation style'),
  backgroundColor: z
    .string()
    .default('rgba(0,0,0,0)')
    .describe('Background color behind text (default: transparent)'),
  padding: z
    .object({
      horizontal: z
      .number()
      .min(0)
      .default(40)
      .describe('Horizontal padding in pixels'),
    vertical: z
      .number()
      .min(0)
      .default(20)
      .describe('Vertical padding in pixels'),
    })
    .default({ horizontal: 40, vertical: 20 })
    .describe('Padding around text'),
  brightnessIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.4)
    .describe('Peak brightness intensity during pulse effect'),
  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective depth in pixels for 3D effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily;
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold for dramatic effect
  }

  const textWrapperId = 'accordion-text-wrapper';
  const textAtomId = 'accordion-text-atom';

  // Text atom with styling
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        textAlign: 'center',
        textTransform: params.textTransform,
        letterSpacing: params.letterSpacing,
        padding: `${params.padding.vertical}px ${params.padding.horizontal}px`,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Wrapper layout with accordion effects
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformOrigin: 'center',
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Main accordion reveal effect with scaleY, opacity, and brightness
      {
        id: 'accordion-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: [0.34, 1.56, 0.64, 1], // Bounce effect for smooth deceleration
          start: 0,
          duration: params.animationDuration,
          mode: 'provider',
          targetIds: [textWrapperId],
          ranges: [
            // Extreme vertical compression to full height
            { key: 'scaleY', val: 0.01, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
            // Opacity fade-in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.6 },
            // Brightness pulse at full expansion
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: params.brightnessIntensity, prog: 0.8 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Backdrop blur during transition
      {
        id: 'backdrop-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.animationDuration,
          mode: 'provider',
          targetIds: [textWrapperId],
          ranges: [
            { key: 'backdropFilter', val: 'blur(8px)', prog: 0 },
            { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [textAtom],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'accordion-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          perspective: `${params.perspectiveDepth}px`,
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.duration,
      },
    },
    childrenData: [textWrapper],
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
  id: 'vertical-accordion-text-reveal',
  title: 'Vertical Accordion Text Reveal',
  description:
    'Text reveal effect starting from extreme vertical compression (scaleY 0.01) expanding to full height with smooth deceleration, perspective depth, and brightness pulse at full expansion. Similar to venetian blinds opening or text unfolding from a flat line.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'accordion',
    'vertical',
    'compression',
    'scale',
    'title',
    'cinematic',
    'dramatic',
    'venetian-blinds',
    'perspective',
    'brightness',
  ],
  defaultInputParams: {
    text: 'VERTICAL ACCORDION REVEAL',
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    duration: 2,
    animationDuration: 0.8,
    startTime: 0,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    backgroundColor: 'rgba(0,0,0,0)',
    padding: {
      horizontal: 40,
      vertical: 20,
    },
    brightnessIntensity: 1.4,
    perspectiveDepth: 1000,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const verticalAccordionTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
