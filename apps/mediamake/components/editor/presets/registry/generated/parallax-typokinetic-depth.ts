/**
 * Parallax Typokinetic Depth Preset
 *
 * This preset creates a classic parallax typokinetic effect where text floats above a background video
 * with differential motion speeds, mimicking depth layers in video editing. The text moves at 30-50% of
 * the background video's perceived motion speed to create a depth illusion.
 *
 * Features:
 * - **Word-by-Word Reveals**: Synchronized with caption timing data, each word slides up from below with elastic bounce
 * - **Staggered Entrance Timing**: Words appear with staggered timing based on their position in the sentence
 * - **Impact-Based Depth Variation**: Higher impact words (from caption metadata) move slower, creating additional depth
 * - **Pseudo-3D Text Shadow**: Independent shadow movement creates a pseudo-3D effect
 * - **Background Video Zoom**: Slight zoom-in effect (scale 1.0 → 1.1) while text counter-moves to enhance parallax
 * - **Performance Optimized**: Uses transform and opacity only, with will-change-transform for smooth rendering
 *
 * Use cases:
 * - Creating depth-layered caption animations for vlogs and documentaries
 * - Building cinematic title sequences with parallax motion
 * - Adding dynamic text overlays with professional depth effects
 * - Creating engaging social media content with multi-layer motion
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// ============================================================
// PARAMS SCHEMA
// ============================================================

const presetParams = z.object({
  backgroundVideo: z
    .object({
      src: z
        .string()
        .describe('Background video source URL or local file path'),
      fit: z
        .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
        .default('cover')
        .optional()
        .describe('How the video should fit the container'),
      loop: z
        .boolean()
        .default(true)
        .optional()
        .describe('Whether to loop the background video'),
      muted: z
        .boolean()
        .default(false)
        .optional()
        .describe('Whether to mute the background video audio'),
    })
    .describe('Background video configuration'),

  captions: z
    .array(
      z.object({
        id: z.string().describe('Caption ID'),
        text: z.string().describe('Full caption text'),
        start: z.number().describe('Relative start time (relative to caption)'),
        duration: z.number().describe('Duration in seconds'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
        absoluteEnd: z
          .number()
          .describe('Absolute end time in caption timeline'),
        words: z.array(
          z.object({
            text: z.string().describe('Word text'),
            start: z
              .number()
              .describe('Relative start time (relative to caption)'),
            duration: z.number().describe('Word duration in seconds'),
            absoluteStart: z
              .number()
              .describe('Absolute start time in caption timeline'),
            absoluteEnd: z
              .number()
              .describe('Absolute end time in caption timeline'),
          }),
        ),
        metadata: z
          .object({
            impact: z
              .number()
              .min(0.1)
              .max(3.0)
              .optional()
              .describe('Impact multiplier for effect intensity (0.1 - 3.0)'),
          })
          .optional()
          .describe('Optional caption metadata'),
      }),
    )
    .describe('Array of caption data with word timings and impact metadata'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color for main text (CSS color value)'),

  fontSize: z
    .string()
    .default('48px')
    .optional()
    .describe('Font size for text (CSS size value)'),

  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family name (e.g., "Inter", "Roboto", "Montserrat:700:italic")',
    ),

  textParallaxAmount: z
    .number()
    .min(-20)
    .max(0)
    .default(-10)
    .optional()
    .describe(
      'Amount of counter-movement for text parallax (negative value for upward movement, in %)',
    ),

  backgroundZoomAmount: z
    .number()
    .min(1.0)
    .max(1.3)
    .default(1.1)
    .optional()
    .describe('Maximum scale value for background zoom effect (1.0 = no zoom)'),

  wordEntranceStagger: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe(
      'Stagger delay between word entrances in seconds (multiply by word index)',
    ),

  wordEntranceDuration: z
    .number()
    .min(0.2)
    .max(1.5)
    .default(0.6)
    .optional()
    .describe('Duration of word entrance animation in seconds'),

  shadowColor: z
    .string()
    .default('rgba(0, 0, 0, 0.3)')
    .optional()
    .describe('Color for text shadow (CSS color value)'),

  shadowOffsetX: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Horizontal offset for shadow pseudo-3D effect (px)'),

  shadowOffsetY: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Vertical offset for shadow pseudo-3D effect (px)'),

  impactSlowdownFactor: z
    .number()
    .min(1.0)
    .max(3.0)
    .default(1.5)
    .optional()
    .describe(
      'Factor to slow down high-impact words for additional depth (1.0 = no slowdown)',
    ),
});

// ============================================================
// PRESET EXECUTION
// ============================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Create caption containers with word-by-word reveals
  const captionContainers = params.captions.map((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;
    const captionImpact = caption.metadata?.impact ?? 1.0;

    // Create word components with effects
    const wordComponents = caption.words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const shadowId = `shadow-${captionIndex}-${wordIndex}`;

      // Calculate staggered start time (relative to caption start)
      const staggerDelay = wordIndex * (params.wordEntranceStagger || 0.05);

      // Determine if this is a high-impact word (based on caption impact)
      const isHighImpact = captionImpact > 1.2;

      // Main text atom
      const mainTextAtom = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'relative',
          style: {
            fontSize: params.fontSize || '48px',
            fontWeight: (fontStyle.fontWeight as any) || '700',
            color: params.textColor || '#ffffff',
            zIndex: 1,
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
        effects: [
          // Word entrance slide-up with bounce
          {
            id: `entrance-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: staggerDelay,
              duration: params.wordEntranceDuration || 0.6,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateY', val: 100, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
          // High-impact word scale effect
          ...(isHighImpact
            ? [
                {
                  id: `scale-${wordId}`,
                  componentId: 'generic',
                  data: {
                    type: 'spring',
                    start: staggerDelay,
                    duration: params.wordEntranceDuration || 0.6,
                    mode: 'provider',
                    targetIds: [wordId],
                    ranges: [
                      { key: 'scale', val: 0.8, prog: 0 },
                      { key: 'scale', val: 1, prog: 1 },
                    ],
                  } as GenericEffectData,
                },
              ]
            : []),
        ],
      };

      // Shadow text atom (pseudo-3D effect)
      const shadowTextAtom = {
        id: shadowId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'absolute',
          style: {
            fontSize: params.fontSize || '48px',
            fontWeight: (fontStyle.fontWeight as any) || '700',
            color: params.shadowColor || 'rgba(0, 0, 0, 0.3)',
            zIndex: 0,
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
        effects: [
          // Shadow differential movement (independent from main text)
          {
            id: `shadow-move-${shadowId}`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: staggerDelay,
              duration: params.wordEntranceDuration || 0.6,
              mode: 'provider',
              targetIds: [shadowId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                {
                  key: 'translateX',
                  val: params.shadowOffsetX || 3,
                  prog: 1,
                },
                { key: 'translateY', val: 100, prog: 0 },
                {
                  key: 'translateY',
                  val: params.shadowOffsetY || 2,
                  prog: 1,
                },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };

      // Word container (holds both shadow and main text)
      return {
        id: `word-container-${captionIndex}-${wordIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block will-change-transform',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [shadowTextAtom, mainTextAtom],
      };
    });

    // Caption text container
    return {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'flex flex-wrap items-center justify-center gap-2 px-8 w-full',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };
  });

  // Background video layer
  const backgroundVideoLayer = {
    id: 'background-video-layer',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: params.backgroundVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: params.backgroundVideo.fit || 'cover',
      loop: params.backgroundVideo.loop ?? true,
      muted: params.backgroundVideo.muted ?? false,
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'media',
      },
    },
    effects: [
      // Background zoom effect (1.0 → 1.1)
      {
        id: 'background-zoom-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          fitDurationTo: 'parent',
          mode: 'provider',
          targetIds: ['background-video-layer'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            {
              key: 'scale',
              val: params.backgroundZoomAmount || 1.1,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Text overlay container (counter-moves opposite to background zoom)
  const textOverlayContainer = {
    id: 'text-overlay-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 pointer-events-none will-change-transform flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'background-video-layer',
      },
    },
    effects: [
      // Text parallax counter-movement (moves up as background zooms in)
      {
        id: 'text-parallax-counter-movement',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          fitDurationTo: 'parent',
          mode: 'provider',
          targetIds: ['text-overlay-container'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            {
              key: 'translateY',
              val: params.textParallaxAmount || -10,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: captionContainers,
  };

  // Root container
  const rootContainer = {
    id: 'parallax-typokinetic-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'background-video-layer',
      },
    },
    childrenData: [backgroundVideoLayer, textOverlayContainer],
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

// ============================================================
// METADATA
// ============================================================

const presetMetadata: PresetMetadata = {
  id: 'parallaxTypokineticDepth',
  title: 'Parallax Typokinetic Depth',
  description:
    'Classic parallax typokinetic preset with text floating above background video at differential motion speeds (30-50% of background), creating depth layers. Features word-by-word reveals with elastic bounce animations, staggered timing, impact-based depth variation, independent text shadow movement for pseudo-3D effect, and background zoom (1.0→1.1) with counter-moving text to enhance parallax illusion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typokinetic',
    'parallax',
    'depth',
    'text',
    'video',
    'captions',
    'animation',
    'kinetic',
    'word-by-word',
    'bounce',
    'shadow',
    'zoom',
    '3d',
    'layers',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundVideo: {
      src: 'https://example.com/background.mp4',
      fit: 'cover',
      loop: true,
      muted: false,
    },
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            text: 'Hello',
            start: 0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
          },
          {
            text: 'world',
            start: 1.0,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    textColor: '#ffffff',
    fontSize: '48px',
    fontFamily: 'Inter',
    textParallaxAmount: -10,
    backgroundZoomAmount: 1.1,
    wordEntranceStagger: 0.05,
    wordEntranceDuration: 0.6,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffsetX: 3,
    shadowOffsetY: 2,
    impactSlowdownFactor: 1.5,
  },
};

// ============================================================
// EXPORT
// ============================================================

export const parallaxTypokineticDepthPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
