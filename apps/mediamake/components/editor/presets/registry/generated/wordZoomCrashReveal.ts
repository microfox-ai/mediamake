/**
 * Word-by-Word Crash Zoom Reveal Preset
 *
 * This preset creates a rapid-fire crash zoom sequence where each word in a caption
 * animates as a separate camera shot. Each word zooms from scale(3) with opacity 0
 * to scale(1) with overshoot bounce, motion blur, and subtle shake on settle.
 *
 * Features:
 * - **Crash Zoom Animation**: Each word starts at scale(3) with opacity 0 and rapidly
 *   zooms in to scale(1) with a slight overshoot bounce (scale 1 -> 1.1 -> 1)
 * - **Motion Blur**: Directional blur effect that decreases as the word settles (10px -> 0)
 * - **Camera Impact Shake**: Subtle shake effect at the end of each zoom with random
 *   translateX/Y values (-2 to 2px) to simulate camera impact
 * - **Staggered Reveal**: Words overlap by 50ms to create rhythmic, punchy editing
 * - **Word-Level Timing**: Uses caption.words array for precise word-level timing
 *
 * Use cases:
 * - Creating dynamic, energetic word reveals for social media content
 * - Building rapid-fire text animations synced to speech
 * - Adding cinematic crash zoom effects to captions
 * - Creating punchy, rhythmic text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing data'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600")'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels (20-200)'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex or rgba)'),
  zoomDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Duration of zoom animation in seconds (0.1-1)'),
  blurDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe('Duration of blur effect in seconds (0.1-0.5)'),
  opacityDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .optional()
    .describe('Duration of opacity fade-in in seconds (0.05-0.3)'),
  shakeDuration: z
    .number()
    .min(0.02)
    .max(0.1)
    .default(0.05)
    .optional()
    .describe('Duration of shake effect in seconds (0.02-0.1)'),
  overlapDuration: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe('Overlap between word animations in seconds (0-0.2)'),
  shakeIntensity: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .optional()
    .describe('Maximum shake distance in pixels (1-5)'),
  initialBlur: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .optional()
    .describe('Initial blur amount in pixels (5-20)'),
});

// --- PRESET EXECUTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper function to generate random shake value
  const getRandomShake = (intensity: number): number => {
    return (Math.random() - 0.5) * 2 * intensity;
  };

  // Process each caption to create word-by-word zoom reveals
  const allCaptionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    if (!caption.words || caption.words.length === 0) return;

    const wordComponents: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordWrapperId = `word-wrapper-${captionIndex}-${wordIndex}`;

      // Calculate timing with overlap
      const wordStart = Math.max(0, word.start - (params.overlapDuration || 0.05));

      // Create zoom effect (scale 3 -> 1.1 -> 1)
      const zoomEffect: GenericEffectData = {
        type: 'spring',
        start: 0,
        duration: params.zoomDuration || 0.3,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 3, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Create opacity effect (0 -> 1)
      const opacityEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: params.opacityDuration || 0.15,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Create blur effect (10px -> 0)
      const blurEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: params.blurDuration || 0.2,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'blur', val: `${params.initialBlur || 10}px`, prog: 0 },
          { key: 'blur', val: '0px', prog: 1 },
        ],
      };

      // Create shake effect (random translateX/Y at end)
      const shakeStartTime = (params.zoomDuration || 0.3) - (params.shakeDuration || 0.05);
      const shakeX = getRandomShake(params.shakeIntensity || 2);
      const shakeY = getRandomShake(params.shakeIntensity || 2);

      const shakeEffect: GenericEffectData = {
        type: 'ease-out',
        start: shakeStartTime,
        duration: params.shakeDuration || 0.05,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: shakeX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: shakeY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Create word wrapper with timing
      const wordWrapper: RenderableComponentData = {
        id: wordWrapperId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: wordStart,
            duration: params.zoomDuration || 0.3,
          },
        },
        effects: [
          {
            id: `zoom-${wordId}`,
            componentId: 'generic',
            data: zoomEffect,
          },
          {
            id: `opacity-${wordId}`,
            componentId: 'generic',
            data: opacityEffect,
          },
          {
            id: `blur-${wordId}`,
            componentId: 'generic',
            data: blurEffect,
          },
          {
            id: `shake-${wordId}`,
            componentId: 'generic',
            data: shakeEffect,
          },
        ],
        childrenData: [
          {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize || 48,
                color: params.textColor || '#ffffff',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: params.zoomDuration || 0.3,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      wordComponents.push(wordWrapper);
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full flex flex-wrap items-center justify-center gap-2',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;

    allCaptionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'word-zoom-crash-root',
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
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: allCaptionContainers,
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

// --- PRESET METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'wordZoomCrashReveal',
  title: 'Word-by-Word Crash Zoom Reveal',
  description: 'Creates a rapid-fire crash zoom sequence where each word in a caption animates as a separate camera shot. Each word zooms from scale(3) with opacity 0 to scale(1) with overshoot bounce, motion blur, and subtle shake on settle. Words are staggered with 50ms overlap to create a punchy, rhythmic reveal effect synchronized to caption word timing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['captions', 'typography', 'zoom', 'crash-zoom', 'word-animation', 'motion-blur', 'shake', 'kinetic', 'energetic', 'social-media'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    zoomDuration: 0.3,
    blurDuration: 0.2,
    opacityDuration: 0.15,
    shakeDuration: 0.05,
    overlapDuration: 0.05,
    shakeIntensity: 2,
    initialBlur: 10,
  },
};

// --- EXPORT ---
export const wordZoomCrashRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
