/**
 * Cinematic Text Reveal with Parallax Mask Preset
 *
 * This preset creates a cinematic text reveal effect where text is initially hidden behind
 * a foreground mask and gradually revealed through a smooth camera pan simulation. The effect
 * mimics parallax in video editing where the text layer and masking layer move at different
 * speeds, creating an illusion of depth.
 *
 * Features:
 * - **Parallax Depth Effect**: Mask slides horizontally while text remains stationary or moves slower
 * - **Word-Level Animations**: Each word has staggered entrance animations (fade, scale, blur)
 * - **Flexible Masking**: Use a gradient mask or custom image mask
 * - **Kinetic Typography**: Strong entrance energy with subtle scale and blur transitions
 * - **Visual Enhancement**: Optional glow and shadow effects as text emerges
 * - **Timing Synchronization**: Works with caption data for precise word-level reveals
 *
 * Use cases:
 * - Creating cinematic title sequences
 * - Building dynamic text reveals with depth
 * - Adding professional parallax effects to captions
 * - Creating engaging social media content with motion depth
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  caption: z
    .custom<TranscriptionSentence>()
    .describe('Caption data with words array for word-level timing'),
  maskImageSrc: z
    .string()
    .optional()
    .describe('Optional image source for mask layer (if not provided, uses gradient)'),
  maskSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Speed multiplier for mask movement (1 = default, higher = faster)'),
  textMovementRatio: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('How much text moves relative to mask (0 = stationary, 1 = same speed as mask)'),
  wordRevealDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Duration of each word reveal animation in seconds'),
  wordRevealStagger: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .optional()
    .describe('Delay between each word reveal in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .optional()
    .describe('Font size in pixels'),
  fontWeight: z
    .union([z.number(), z.string()])
    .default('700')
    .optional()
    .describe('Font weight (e.g., 400, 700, "bold")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  textShadow: z
    .string()
    .default('0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)')
    .optional()
    .describe('Text shadow for glow effect (CSS text-shadow value)'),
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  maskBlendMode: z
    .enum(['multiply', 'screen', 'overlay', 'darken', 'lighten', 'normal'])
    .default('multiply')
    .optional()
    .describe('Blend mode for mask layer (when using image mask)'),
  maskOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .optional()
    .describe('Opacity of mask layer'),
  gradientColors: z
    .object({
      start: z.string().default('rgba(0,0,0,0.95)'),
      mid: z.string().default('rgba(0,0,0,0.7)'),
      end: z.string().default('transparent'),
    })
    .optional()
    .describe('Gradient colors for default gradient mask (start, mid, end)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    caption,
    maskImageSrc,
    maskSpeed = 1,
    textMovementRatio = 0.3,
    wordRevealDuration = 0.4,
    wordRevealStagger = 0.1,
    fontSize = 64,
    fontWeight = '700',
    textColor = '#FFFFFF',
    textShadow = '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
    font,
    maskBlendMode = 'multiply',
    maskOpacity = 0.9,
    gradientColors,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
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

  // Build gradient HTML for mask
  const gradientStart = gradientColors?.start || 'rgba(0,0,0,0.95)';
  const gradientMid = gradientColors?.mid || 'rgba(0,0,0,0.7)';
  const gradientEnd = gradientColors?.end || 'transparent';
  const gradientHTML = `<div style="width:100%;height:100%;background:linear-gradient(90deg,${gradientStart} 0%,${gradientMid} 50%,${gradientEnd} 100%);"></div>`;

  // Calculate mask animation duration (same as caption duration, adjusted by speed)
  const maskAnimationDuration = caption.duration / maskSpeed;

  // Calculate text movement amount
  const textMoveDistance = textMovementRatio * 100; // percentage

  // Build word components with staggered reveal effects
  const wordComponents: RenderableComponentData[] = caption.words.map(
    (word, index) => {
      const wordId = `word-${caption.id}-${index}`;
      const wordStartDelay = index * wordRevealStagger;

      // Word reveal effect (fade + scale + blur)
      const wordRevealEffect = {
        id: `reveal-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: word.start + wordStartDelay,
          duration: wordRevealDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Scale up
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur clear
            { key: 'filter', val: 'blur(4px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || fontWeight,
            color: textColor,
            textShadow: textShadow,
            marginRight: '0.5em',
            ...fontStyle,
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
            duration: caption.duration,
          },
        },
        effects: [wordRevealEffect],
      } as RenderableComponentData;
    },
  );

  // Build text container with optional text movement
  const textContainerId = `text-container-${caption.id}`;
  const textContainerEffects = [];

  // Add text parallax movement effect if textMovementRatio > 0
  if (textMovementRatio > 0) {
    textContainerEffects.push({
      id: `text-move-${caption.id}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: caption.duration,
        mode: 'provider',
        targetIds: [textContainerId],
        ranges: [
          { key: 'translateX', val: `${textMoveDistance}%`, prog: 0 },
          { key: 'translateX', val: '0%', prog: 1 },
        ],
      },
    });
  }

  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    effects: textContainerEffects,
    childrenData: [
      {
        id: `text-words-${caption.id}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap gap-2 items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
    ],
  };

  // Build mask content (gradient or image)
  const maskContentId = `mask-content-${caption.id}`;
  const maskContent: RenderableComponentData = maskImageSrc
    ? {
        id: maskContentId,
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: maskImageSrc,
          className: 'w-full h-full object-cover',
          style: {
            mixBlendMode: maskBlendMode,
            opacity: maskOpacity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
      }
    : {
        id: maskContentId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: gradientHTML,
          className: 'w-full h-full',
          style: {
            opacity: maskOpacity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
      };

  // Build mask layer with translation effect
  const maskEffect = {
    id: `mask-move-${caption.id}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: maskAnimationDuration,
      mode: 'provider',
      targetIds: [maskContentId],
      ranges: [
        { key: 'translateX', val: '0%', prog: 0 },
        { key: 'translateX', val: '-100%', prog: 1 },
      ],
    },
  };

  maskContent.effects = [maskEffect];

  const maskLayer: RenderableComponentData = {
    id: `mask-layer-${caption.id}`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20 pointer-events-none',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: [maskContent],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: `cinematic-reveal-${caption.id}`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
      },
    },
    context: {
      timing: {
        start: caption.absoluteStart,
        duration: caption.duration,
      },
    },
    childrenData: [textContainer, maskLayer],
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
  id: 'cinematic-text-reveal',
  title: 'Cinematic Text Reveal with Parallax Mask',
  description:
    'A cinematic text reveal preset featuring parallax-style mask movement where text emerges from behind a sliding foreground layer. The mask (foreground object) slides horizontally while text remains stationary or moves slower, creating depth illusion. Each word has staggered entrance animations (fade, scale, blur) as they become visible. Includes optional glow/shadow effects for enhanced text emergence. Uses caption word timing for synchronized reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'text-reveal',
    'parallax',
    'mask',
    'depth',
    'kinetic',
    'captions',
    'typography',
  ],
  defaultInputParams: {
    caption: {
      id: 'caption-1',
      text: 'Cinematic Reveal',
      start: 0,
      absoluteStart: 0,
      end: 3,
      absoluteEnd: 3,
      duration: 3,
      words: [
        {
          id: 'word-0',
          text: 'Cinematic',
          start: 0,
          absoluteStart: 0,
          end: 1.5,
          absoluteEnd: 1.5,
          duration: 1.5,
          confidence: 1,
        },
        {
          id: 'word-1',
          text: 'Reveal',
          start: 1.5,
          absoluteStart: 1.5,
          end: 3,
          absoluteEnd: 3,
          duration: 1.5,
          confidence: 1,
        },
      ],
    },
    maskSpeed: 1,
    textMovementRatio: 0.3,
    wordRevealDuration: 0.4,
    wordRevealStagger: 0.1,
    fontSize: 64,
    fontWeight: '700',
    textColor: '#FFFFFF',
    textShadow:
      '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
    font: 'Inter:700',
    maskBlendMode: 'multiply',
    maskOpacity: 0.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
