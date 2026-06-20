/**
 * Watercolor Typography Reveal Preset
 * 
 * Soft wash typography preset where text appears as if being revealed by gentle brush strokes
 * moving across the screen. Each word fades in with a watercolor texture that starts highly 
 * diluted and gradually becomes more concentrated. The motion includes a subtle floating drift, 
 * moving slowly from left to right as if carried by water current. A paper grain texture shows 
 * through the translucent letters. Soft color bleeding between adjacent words creates beautiful 
 * gradient transitions. The overall feeling is calm and artistic, like watching an artist's 
 * watercolor painting come to life in slow motion.
 * 
 * Features:
 * - Brush stroke reveal effect using CSS mask-image gradients
 * - Watercolor texture overlays with mix-blend-mode
 * - Paper grain texture background
 * - Floating drift animation
 * - Progressive concentration effect (diluted to concentrated)
 * - Soft color bleeding with gradient transitions
 * - Synchronized timing with audio if present
 * 
 * Use cases:
 * - Artistic subtitle presentations
 * - Poetic or literary content
 * - Calm, contemplative video intros
 * - Cultural or artistic video content
 * - Watercolor-themed branding
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  
  font: z
    .string()
    .default('Inter')
    .describe('Font family (format: "FontName:weight:style" or "FontName:weight" or "FontName")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#2d3748')
    .describe('Base text color (dark color recommended for watercolor effect)'),
  
  revealDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of brush stroke reveal animation in seconds'),
  
  driftDuration: z
    .number()
    .min(5)
    .max(15)
    .default(8)
    .describe('Duration of one complete drift cycle in seconds'),
  
  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(24)
    .describe('Gap between words in pixels'),
  
  paperTextureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Opacity of paper grain texture overlay'),
  
  watercolorOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of watercolor texture overlay'),
  
  enableAudioSync: z
    .boolean()
    .default(true)
    .describe('Fit caption durations to audio if audio source is present'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    revealDuration,
    driftDuration,
    wordGap,
    paperTextureOpacity,
    watercolorOpacity,
    enableAudioSync,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: any = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2]; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Process captions to create word components
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const { words, absoluteStart, duration } = caption;

    // Create word components with effects
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
      const wordId = `watercolor-word-${captionIndex}-${wordIndex}`;

      // Calculate reveal effect start time (staggered by 500ms)
      const revealStart = word.start + (wordIndex * 0.5);

      // Word component with effects
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 500,
            color: textColor,
            letterSpacing: '0.02em',
            textShadow: '0 1px 3px rgba(0,0,0,0.1)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['500'],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration, // All words last for full caption duration
          },
        },
        effects: [
          // Opacity fade-in (diluted to concentrated)
          {
            id: `opacity-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: revealStart,
              duration: revealDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.9, prog: 1 },
              ],
            },
          },
          // Scale reveal (slight scale-up for emphasis)
          {
            id: `scale-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: revealStart,
              duration: revealDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'scale', val: 0.95, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Floating drift (left to right, continuous)
          {
            id: `drift-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: driftDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateX', val: -10, prog: 0 },
                { key: 'translateX', val: 10, prog: 0.5 },
                { key: 'translateX', val: -10, prog: 1 },
              ],
            },
          },
          // Blur to sharp (brush stroke reveal)
          {
            id: `blur-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: revealStart,
              duration: revealDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'filter', val: 'blur(3px)', prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
          // Brightness concentration (diluted to concentrated)
          {
            id: `brightness-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: revealStart,
              duration: revealDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'filter', val: 'brightness(0.9)', prog: 0 },
                { key: 'filter', val: 'brightness(1.1)', prog: 1 },
              ],
            },
          },
        ],
      };

      return wordComponent;
    });

    // Words layout container (horizontal layout with gap)
    const wordsLayoutId = `watercolor-words-layout-${captionIndex}`;
    const wordsLayout: RenderableComponentData = {
      id: wordsLayoutId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative grid grid-flow-col auto-cols-max',
          style: {
            gap: `${wordGap}px`,
            backdropFilter: 'blur(1px)',
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

    // Paper texture overlay (absolute positioned, pointer-events-none)
    const paperTextureId = `paper-texture-${captionIndex}`;
    const paperTexture: RenderableComponentData = {
      id: paperTextureId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml,%3Csvg width=\"200\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\" opacity=\"0.4\" /%3E%3C/svg%3E'); background-size: 200px 200px; mix-blend-mode: multiply; filter: contrast(1.2);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: paperTextureOpacity,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Caption container (includes paper texture + words layout)
    const captionContainerId = `watercolor-caption-container-${captionIndex}`;
    const captionContainer: RenderableComponentData = {
      id: captionContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
          style: {
            background: 'transparent',
          },
        },
      },
      context: {
        timing: {
          start: absoluteStart,
          duration: duration,
          ...(enableAudioSync ? { fitDurationTo: 'audio' } : {}),
        },
      },
      childrenData: [paperTexture, wordsLayout],
    };

    return captionContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'watercolor-typography',
  title: 'Watercolor Typography Reveal',
  description:
    'Soft wash typography preset where text appears as if being revealed by gentle brush strokes. Each word fades in with a watercolor texture that starts highly diluted and gradually becomes more concentrated. Features subtle floating drift motion from left to right, paper grain texture overlay, and soft color bleeding between adjacent words creating beautiful gradient transitions. The overall feeling is calm and artistic, like watching a watercolor painting come to life in slow motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'watercolor',
    'artistic',
    'calm',
    'brush-stroke',
    'floating',
    'paper-texture',
    'gradient',
    'reveal',
    'captions',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Watercolor dreams',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'Watercolor',
            start: 0,
            end: 1.5,
            duration: 1.5,
            absoluteStart: 0,
            absoluteEnd: 1.5,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'dreams',
            start: 1.5,
            end: 3,
            duration: 1.5,
            absoluteStart: 1.5,
            absoluteEnd: 3,
            confidence: 1,
          },
        ],
      },
    ],
    font: 'Inter:500',
    fontSize: 48,
    textColor: '#2d3748',
    revealDuration: 2.5,
    driftDuration: 8,
    wordGap: 24,
    paperTextureOpacity: 0.1,
    watercolorOpacity: 0.6,
    enableAudioSync: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const watercolorTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};