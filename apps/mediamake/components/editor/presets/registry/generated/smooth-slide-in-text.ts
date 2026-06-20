/**
 * Smooth Horizontal Slide-In Text Preset
 *
 * Professional horizontal sliding text animation that mimics high-end documentary title sequences.
 * Text glides in from the right with a silk-smooth ease-out curve and subtle staggered delays 
 * between words creating a cascading effect. Features natural deceleration, opacity fade-in, 
 * and optional motion blur for a premium refined feel.
 *
 * Features:
 * - **Smooth Slide-In Animation**: Text glides from right (120% translateX) to final position
 * - **Cascading Word Stagger**: Each word starts with 0.05-0.08s delay after previous word
 * - **Natural Deceleration**: Ease-out curve with imperceptible movement in last 20%
 * - **Opacity Fade**: 0→1 during first 30% of slide animation
 * - **Motion Blur Simulation**: Optional blur effect (0.5px→0px) during movement
 * - **GPU Acceleration**: Uses transform-gpu and will-change-transform for performance
 * - **Configurable Timing**: Adjustable animation duration and stagger delays
 *
 * Use Cases:
 * - Opening credits for high-end documentaries
 * - Professional video title sequences
 * - Premium brand video intros
 * - Elegant text reveals with cascading motion
 * - Smooth transitions for narrative content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing data'),
  animationDuration: z.number().min(0.5).max(2).default(1.0).optional()
    .describe('Duration of slide animation per word in seconds (0.8-1.2 recommended)'),
  staggerDelay: z.number().min(0.03).max(0.15).default(0.06).optional()
    .describe('Delay between each word start in seconds (0.05-0.08 recommended)'),
  fontSize: z.number().min(20).max(200).default(48).optional()
    .describe('Font size in pixels'),
  textColor: z.string().default('#ffffff').optional()
    .describe('Text color (hex or rgba)'),
  font: z.string().default('Inter:600').optional()
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")'),
  enableMotionBlur: z.boolean().default(true).optional()
    .describe('Enable subtle motion blur effect during movement'),
  containerPosition: z.enum(['center', 'top', 'bottom']).default('center').optional()
    .describe('Vertical position of text container'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    animationDuration = 1.0,
    staggerDelay = 0.06,
    fontSize = 48,
    textColor = '#ffffff',
    font = 'Inter:600',
    enableMotionBlur = true,
    containerPosition = 'center',
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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

  const { fontFamily, fontStyle } = parseFontString(font);

  // Container alignment classes
  const alignmentClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-12',
    bottom: 'items-end justify-center pb-12',
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const words = caption.words || [];
    
    // Build word components with staggered effects
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordWrapperId = `word-wrapper-${captionIndex}-${wordIndex}`;

      // Calculate staggered start time (relative to caption)
      const wordStartWithStagger = word.start + (wordIndex * staggerDelay);

      // Create slide-in effect with opacity fade and optional blur
      const slideEffectRanges: any[] = [
        // TranslateX: 120% (off-screen right) → 0% (final position)
        { key: 'translateX', val: '120%', prog: 0 },
        { key: 'translateX', val: '0%', prog: 1 },
        // Opacity: 0 → 1 during first 30%
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ];

      // Add motion blur if enabled
      if (enableMotionBlur) {
        slideEffectRanges.push(
          { key: 'filter', val: 'blur(0.5px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 0.8 },
        );
      }

      const slideEffect = {
        id: `slide-effect-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out', // Smooth deceleration
          start: wordStartWithStagger, // Relative to caption start
          duration: animationDuration,
          mode: 'provider',
          targetIds: [wordWrapperId],
          ranges: slideEffectRanges,
        } as GenericEffectData,
      };

      // Word wrapper (BaseLayout with inline-block)
      const wordWrapper: RenderableComponentData = {
        id: wordWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block will-change-transform transform-gpu',
            style: {
              marginRight: '0.3em', // Gap between words
            },
          },
        },
        context: {
          timing: {
            start: 0, // All words start together (relative to caption)
            duration: caption.duration, // Last for full caption duration
          },
        },
        effects: [slideEffect],
        childrenData: [
          {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
        ],
      };

      return wordWrapper;
    });

    // Caption container (BaseLayout with flex-row)
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex flex-row ${alignmentClasses[containerPosition]} overflow-hidden`,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart, // Absolute position in video
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'smooth-slide-in-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? (captions[captions.length - 1] as TranscriptionSentence).absoluteEnd 
          : 10,
      },
    },
    childrenData: captionContainers,
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
  id: 'smoothSlideInText',
  title: 'Smooth Horizontal Slide-In Text',
  description: 'Professional horizontal sliding text animation that mimics high-end documentary title sequences. Text glides in from the right with a silk-smooth ease-out curve and subtle staggered delays between words. Features natural deceleration, opacity fade-in, and optional motion blur for premium refined feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'captions',
    'slide',
    'horizontal',
    'smooth',
    'professional',
    'documentary',
    'premium',
    'cascading',
    'stagger',
    'ease-out',
    'motion-blur',
    'title-sequence',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    animationDuration: 1.0,
    staggerDelay: 0.06,
    fontSize: 48,
    textColor: '#ffffff',
    font: 'Inter:600',
    enableMotionBlur: true,
    containerPosition: 'center',
  },
};

export const smoothSlideInTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
