/**
 * Elastic Settle Typography Preset
 *
 * This preset creates a wave-like cascading typography effect where each word slides in
 * independently with staggered timing, featuring soft elastic settling with subtle overshoot.
 * Each word has its own timing offset creating a gentle wave motion, with organic variation
 * in overshoot amplitude (8-12%) per word. Includes a soft blur during motion that clears
 * as words settle, resembling silk fabric settling in slow motion.
 *
 * Features:
 * - **Wave-like Cascading Motion**: Words flow in sequentially with staggered delays
 * - **Elastic Settle Effect**: Subtle overshoot (8-12%) with spring physics easing
 * - **Soft Motion Blur**: Blur effect during motion that clears on settle
 * - **Organic Variation**: Overshoot amplitude varies per word for natural feel
 * - **Flexible Layout**: Horizontal word arrangement with configurable spacing
 * - **Font Customization**: Support for custom fonts with weight and style
 * - **Color & Styling**: Comprehensive text styling options
 *
 * Technical Implementation:
 * - Uses BaseLayout with flex-wrap for responsive word flow
 * - Each word component uses sentence-level timing for layout stability
 * - Effects use staggered start times (word index * 0.1s) for wave motion
 * - Generic keyframe effects: translateY (-30px → 5px overshoot → 0px settle)
 * - Opacity fade (0 → 1) during first 30% of animation
 * - Spring easing for natural physics-based motion
 * - Total animation: 0.6s per word + stagger delay
 *
 * Use cases:
 * - Title sequences with elegant word reveals
 * - Poetic content with flowing text animations
 * - Brand storytelling with sophisticated motion
 * - Cinematic caption reveals
 * - Elegant subtitle animations
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

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption data with word-level timing'),
  
  // Font configuration
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family with optional weight and style (e.g., "Inter:400", "Roboto:700:italic")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  // Layout configuration
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Horizontal spacing between words in pixels'),
  
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .describe('Container padding in pixels'),
  
  // Animation configuration
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each word animation in seconds'),
  
  animationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of each word animation in seconds'),
  
  overshootMin: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Minimum overshoot percentage (8-12% range)'),
  
  overshootMax: z
    .number()
    .min(0)
    .max(20)
    .default(12)
    .describe('Maximum overshoot percentage (8-12% range)'),
  
  slideDistance: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Initial slide distance in pixels (negative = from top)'),
  
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Maximum blur amount in pixels during motion'),
  
  // Effect intensity
  impact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global effect intensity multiplier'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
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

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter');

  // Process captions
  const captions = params.captions as TranscriptionSentence[];
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    if (words.length === 0) return;

    // Create word components
    const wordComponents: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordId = `word-${captionIndex}-${wordIndex}`;

        // Calculate staggered animation start time (relative to caption)
        const effectStart = wordIndex * params.staggerDelay;

        // Calculate organic overshoot for this word
        const overshootRange = params.overshootMax - params.overshootMin;
        const overshootVariation = Math.random() * overshootRange;
        const overshoot = params.overshootMin + overshootVariation;
        const overshootDistance = (params.slideDistance * overshoot) / 100;

        // Create elastic settle effect with blur
        const effect: GenericEffectData = {
          type: 'spring', // Spring easing for natural physics
          start: effectStart,
          duration: params.animationDuration * params.impact,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Opacity fade: 0 → 1 during first 30%
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 1 },

            // TranslateY: -30px → overshoot at 70% → settle at 0px
            { key: 'translateY', val: -params.slideDistance, prog: 0 },
            { key: 'translateY', val: overshootDistance, prog: 0.7 },
            { key: 'translateY', val: 0, prog: 1 },

            // Blur: starts at 2px, clears at 80%
            { key: 'filter', val: `blur(${params.blurAmount}px)`, prog: 0 },
            { key: 'filter', val: `blur(${params.blurAmount * 0.3}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 0.8 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        };

        const wordEffect = {
          id: `elastic-settle-${wordId}`,
          componentId: 'generic',
          data: effect,
        };

        // Word component - uses sentence-level timing for layout stability
        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0, // All words start together
              duration: caption.duration, // All words last for full sentence
            },
          },
          effects: [wordEffect],
        } as RenderableComponentData;
      },
    );

    // Caption container with flex-wrap layout
    const captionContainer: RenderableComponentData = {
      id: `elastic-settle-caption-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center',
          style: {
            gap: `${params.wordSpacing}px`,
            padding: `${params.containerPadding}px`,
            transformStyle: 'preserve-3d', // For depth effect
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart, // Use absoluteStart for root container
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-settle-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'children',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-settle-typography',
  title: 'Elastic Settle Typography',
  description:
    'Typography preset with soft elastic settle effect where each word slides in independently with staggered timing, creating a wave-like cascading motion. Features subtle overshoot (8-12%), organic variation per word, and soft blur during motion that clears as words settle. Uses spring physics for natural, elegant motion resembling silk fabric settling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'elastic',
    'settle',
    'wave',
    'cascade',
    'stagger',
    'overshoot',
    'spring',
    'blur',
    'elegant',
    'smooth',
    'organic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:400',
    fontSize: 48,
    textColor: '#FFFFFF',
    wordSpacing: 8,
    containerPadding: 32,
    staggerDelay: 0.1,
    animationDuration: 0.6,
    overshootMin: 8,
    overshootMax: 12,
    slideDistance: 30,
    blurAmount: 2,
    impact: 1,
  },
};

// Export preset
export const elasticSettleTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
