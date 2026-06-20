/**
 * Kinetic Typography Horizontal Momentum Slide
 *
 * This preset creates high-energy kinetic typography featuring momentum-based physics
 * where text slides horizontally with explosive speed, settling into position with
 * spring-dampened overshoot and bounce. Perfect for fast-paced commercials, action
 * content, and energetic brand messaging.
 *
 * Features:
 * - **Explosive Momentum**: Text slides in from -100vw with explosive speed
 * - **Spring Dampening**: Settles into position with overshoot and bounce-back
 * - **Dimensional Scale**: Synchronized scale animation (0.95→1.0) for depth
 * - **Magnetic Pull Effect**: Text feels magnetically drawn into final position
 * - **Staggered Animation**: Words cascade in with 0.08s stagger for kinetic energy
 * - **Transform-3D Rendering**: Enhanced rendering with preserved 3D transforms
 *
 * Use cases:
 * - Fast-paced commercial titles
 * - Action-oriented content introductions
 * - Energetic brand messaging
 * - Dynamic product announcements
 * - High-impact social media content
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
    .describe('Text to display (will be split into words for animation)'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto:700")'),
  textColor: z.string().default('#ffffff').describe('Text color'),
  textShadow: z
    .string()
    .default('0 4px 12px rgba(0,0,0,0.3)')
    .describe('Text shadow for depth'),
  wordGap: z.number().default(0.5).describe('Gap between words in em units'),
  duration: z.number().default(2.5).describe('Total animation duration'),
  slideDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the slide animation per word'),
  staggerDelay: z
    .number()
    .default(0.08)
    .describe('Delay between each word animation'),
  overshootAmount: z
    .number()
    .default(0.05)
    .describe('Overshoot amount as percentage (0.05 = 5%)'),
  scaleFrom: z
    .number()
    .default(0.95)
    .describe('Initial scale value for dimensional effect'),
  scaleTo: z.number().default(1.0).describe('Final scale value'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    textShadow,
    wordGap,
    duration,
    slideDuration,
    staggerDelay,
    overshootAmount,
    scaleFrom,
    scaleTo,
  } = params;

  // Helper function to parse font string
  const parseFontString = (fontStr: string) => {
    const fontFamily = fontStr.includes(':') ? fontStr.split(':')[0] : fontStr;
    const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
    if (fontStr.includes(':')) {
      const fontParts = fontStr.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily: parsedFontFamily, fontStyle } =
    parseFontString(fontFamily);

  // Split text into words
  const words = text.trim().split(/\s+/);

  // Calculate viewport width for slide animation (use negative for left-to-right)
  const viewportWidth = props.config?.width || 1920;

  // Create word components with individual wrappers
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `word-${index}`;
      const wrapperId = `word-wrapper-${index}`;
      const wordStartTime = index * staggerDelay;

      // Create slide effect with overshoot
      // Keyframes: start off-screen → slightly past center → settle at center
      const slideEffect = {
        id: `slide-effect-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out', // Cubic bezier approximation of spring
          start: 0, // Relative to word wrapper start
          duration: slideDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // TranslateX: off-screen → overshoot → settle
            { key: 'translateX', val: `-${viewportWidth}px`, prog: 0 },
            {
              key: 'translateX',
              val: `${viewportWidth * overshootAmount}px`,
              prog: 0.85,
            }, // 85% progress: overshoot
            { key: 'translateX', val: '0px', prog: 1 }, // 100%: settle
            // ScaleX and ScaleY: dimensional depth
            { key: 'scaleX', val: scaleFrom, prog: 0 },
            { key: 'scaleX', val: scaleTo, prog: 1 },
            { key: 'scaleY', val: scaleFrom, prog: 0 },
            { key: 'scaleY', val: scaleTo, prog: 1 },
          ],
        },
      };

      // Create TextAtom for the word
      const textAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 800,
            color: textColor,
            textShadow: textShadow,
            ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
          },
          font: {
            family: parsedFontFamily,
            weights: [String(fontStyle.fontWeight || 800)],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0, // Relative to wrapper
            duration: duration - wordStartTime, // Extends to end of total duration
          },
        },
        effects: [],
      };

      // Create wrapper layout for each word
      const wordWrapper: RenderableComponentData = {
        id: wrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: wordStartTime, // Staggered start relative to parent
            duration: duration - wordStartTime,
          },
        },
        effects: [slideEffect],
        childrenData: [textAtom],
      };

      return wordWrapper;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-momentum-slide-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-start',
        style: {
          gap: `${wordGap}em`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: wordComponents,
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
  id: 'kinetic-typography-momentum-slide',
  title: 'Kinetic Typography Horizontal Momentum Slide',
  description:
    'High-energy kinetic typography preset featuring momentum-based physics where text slides horizontally with explosive speed, settling into position with spring-dampened overshoot and bounce. Perfect for fast-paced commercials, action content, and energetic brand messaging. Includes synchronized scale animation (0.95→1.0) for added dimensionality and magnetic pull effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'momentum',
    'slide',
    'horizontal',
    'spring',
    'overshoot',
    'bounce',
    'explosive',
    'commercial',
    'action',
    'energetic',
    'brand',
    'dynamic',
    '3d',
  ],
  defaultInputParams: {
    text: 'DYNAMIC ENERGY IMPACT',
    fontSize: 64,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
    wordGap: 0.5,
    duration: 2.5,
    slideDuration: 0.6,
    staggerDelay: 0.08,
    overshootAmount: 0.05,
    scaleFrom: 0.95,
    scaleTo: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kineticTypographyMomentumSlidePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
