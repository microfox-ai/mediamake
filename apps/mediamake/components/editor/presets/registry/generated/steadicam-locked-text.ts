/**
 * Steadicam Locked Text Overlay Preset
 *
 * This preset creates text that appears perfectly locked to the camera frame,
 * as if mounted on a steadicam rig. The text maintains perfect stability even
 * when the underlying video has camera movement, acting as a fixed overlay
 * completely immune to camera shake or movement.
 *
 * Features:
 * - **Fixed Positioning**: Text layers locked to viewport with fixed positioning
 * - **Multiple Depth Layers**: Foreground, midground, and background text at different translateZ depths
 * - **GPU Acceleration**: Perspective transforms with will-change for optimal performance
 * - **Breathing Animation**: Subtle scale animation (1.0 → 1.02 → 1.0) that makes text feel alive
 * - **Word-by-Word Captions**: Smooth opacity reveals (0→1) maintaining exact screen positions
 * - **Parallax-Free**: All text maintains consistent screen position despite 3D transforms
 * - **Depth Enhancement**: Drop shadows and blur on background elements for visual depth
 *
 * Use cases:
 * - Creating stabilized text overlays for action footage
 * - Adding fixed UI elements to shaky camera shots
 * - Professional caption overlays that remain readable during movement
 * - Multi-layered text compositions with depth perception
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  // Primary text layer (foreground)
  primaryText: z
    .string()
    .optional()
    .describe('Text to display in the foreground layer (largest, closest)'),
  primaryFontSize: z
    .string()
    .default('64px')
    .describe('Font size for primary text (e.g., "64px", "4rem")'),

  // Secondary text layer (midground)
  secondaryText: z
    .string()
    .optional()
    .describe('Text to display in the midground layer (medium depth)'),
  secondaryFontSize: z
    .string()
    .default('32px')
    .describe('Font size for secondary text (e.g., "32px", "2rem")'),

  // Tertiary text layer (background)
  tertiaryText: z
    .string()
    .optional()
    .describe('Text to display in the background layer (furthest, blurred)'),
  tertiaryFontSize: z
    .string()
    .default('24px')
    .describe('Font size for tertiary text (e.g., "24px", "1.5rem")'),

  // Font configuration
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for all text layers (e.g., "Inter", "Roboto:700")'),

  // Breathing animation
  breathingDuration: z
    .number()
    .default(4)
    .describe('Duration of one breathing cycle in seconds'),
  breathingScale: z
    .number()
    .min(1.0)
    .max(1.1)
    .default(1.02)
    .describe('Maximum scale value during breathing (1.0 = no breathing)'),

  // Caption configuration
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .optional()
    .describe(
      'Caption data with words array for word-by-word reveal animations',
    ),

  // Duration
  duration: z
    .number()
    .optional()
    .describe('Total duration in seconds (auto-calculated if captions provided)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;

  // Parse font family
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

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Calculate total duration
  const calculateDuration = () => {
    if (params.duration) return params.duration;
    if (params.captions && params.captions.length > 0) {
      const lastCaption = params.captions[params.captions.length - 1];
      return lastCaption.absoluteEnd;
    }
    return 30; // Default 30 seconds
  };

  const totalDuration = calculateDuration();

  const childrenData: RenderableComponentData[] = [];

  // Create breathing effect for text layers using internal effect preset
  const createBreathingEffect = async (targetId: string) => {
    if (!presets || !presets.genericOpacityEffect) {
      // Fallback: create effect manually
      return {
        id: `breathing-${targetId}`,
        componentId: 'generic' as const,
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: totalDuration,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: params.breathingScale, prog: 0.5 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      };
    }

    // Use internal effect preset for breathing
    const effectResult = await presets.genericOpacityEffect(
      {
        targetId,
        effectStart: 0,
        effectDuration: totalDuration,
        fadeInProgress: 0.5,
        impact: 1.0,
        effectId: `breathing-${targetId}`,
      },
      props,
    );

    // Extract effect
    const extractedEffect =
      effectResult?.output?._extractedEffects?.[0] ||
      effectResult?.output?.childrenData?.[0]?.effects?.[0];

    // Override with breathing animation
    if (extractedEffect) {
      extractedEffect.data.ranges = [
        { key: 'scale', val: 1.0, prog: 0 },
        { key: 'scale', val: params.breathingScale, prog: 0.5 },
        { key: 'scale', val: 1.0, prog: 1 },
      ];
    }

    return extractedEffect;
  };

  // Foreground text layer
  if (params.primaryText) {
    const foregroundTextId = 'foreground-text';
    const foregroundEffect = await createBreathingEffect(foregroundTextId);

    const foregroundLayer: RenderableComponentData = {
      id: 'foreground-text-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'perspective(1000px) translateZ(50px)',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: foregroundEffect ? [foregroundEffect] : [],
      childrenData: [
        {
          id: foregroundTextId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: params.primaryText,
            className: 'font-bold text-white drop-shadow-2xl',
            style: {
              fontSize: params.primaryFontSize,
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    childrenData.push(foregroundLayer);
  }

  // Midground text layer
  if (params.secondaryText) {
    const midgroundTextId = 'midground-text';
    const midgroundEffect = await createBreathingEffect(midgroundTextId);

    const midgroundLayer: RenderableComponentData = {
      id: 'midground-text-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-start justify-end p-8',
          style: {
            transform: 'perspective(1000px) translateZ(0px)',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: midgroundEffect ? [midgroundEffect] : [],
      childrenData: [
        {
          id: midgroundTextId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: params.secondaryText,
            className: 'font-medium text-white/80',
            style: {
              fontSize: params.secondaryFontSize,
              textShadow: '0 2px 10px rgba(0,0,0,0.4)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: ['500'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    childrenData.push(midgroundLayer);
  }

  // Background text layer
  if (params.tertiaryText) {
    const backgroundTextId = 'background-text';
    const backgroundEffect = await createBreathingEffect(backgroundTextId);

    const backgroundLayer: RenderableComponentData = {
      id: 'background-text-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-end justify-start p-8',
          style: {
            transform: 'perspective(1000px) translateZ(-30px)',
            filter: 'blur(1px)',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: backgroundEffect ? [backgroundEffect] : [],
      childrenData: [
        {
          id: backgroundTextId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: params.tertiaryText,
            className: 'font-medium text-white/60',
            style: {
              fontSize: params.tertiaryFontSize,
              textShadow: '0 4px 30px rgba(0,0,0,0.6)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: ['500'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    childrenData.push(backgroundLayer);
  }

  // Caption word-by-word reveal
  if (params.captions && params.captions.length > 0) {
    params.captions.forEach((caption, captionIndex) => {
      const captionWords: RenderableComponentData[] = [];

      caption.words.forEach((word, wordIndex) => {
        const wordId = `caption-${captionIndex}-word-${wordIndex}`;

        // Word fade-in effect
        const wordEffect = {
          id: `fade-${wordId}`,
          componentId: 'generic' as const,
          data: {
            type: 'ease-out' as const,
            start: word.start, // Relative to caption start
            duration: 0.3,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        };

        const wordAtom: RenderableComponentData = {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: 'font-bold text-white',
            style: {
              fontSize: '32px',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              marginRight: '0.3em',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: ['700'],
            },
          },
          context: {
            timing: {
              start: 0, // All words start together to maintain layout
              duration: caption.duration, // Last for full caption duration
            },
          },
          effects: [wordEffect],
        };

        captionWords.push(wordAtom);
      });

      const captionContainer: RenderableComponentData = {
        id: `caption-container-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute bottom-16 left-0 right-0 flex justify-center',
            style: {
              transform: 'perspective(1000px) translateZ(0)',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: `caption-words-row-${captionIndex}`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className:
                  'flex flex-row flex-wrap justify-center items-center gap-x-2',
                style: {
                  maxWidth: '80%',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: captionWords,
          },
        ],
      };

      childrenData.push(captionContainer);
    });
  }

  // Root container with fixed positioning
  const rootContainer: RenderableComponentData = {
    id: 'steadicam-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'fixed inset-0 z-50 pointer-events-none',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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
  id: 'steadicamLockedText',
  title: 'Steadicam Locked Text Overlay',
  description:
    'A typokinetics preset where text appears perfectly locked to the camera frame like a steadicam rig. Creates parallax-free text layers at different depths using translateZ transforms, with a subtle breathing animation (scale 1.0→1.02) and word-by-word caption reveals. Text maintains perfect stability as a fixed overlay immune to camera movement, featuring GPU-accelerated transforms, drop shadows for depth, and smooth 300ms opacity fades for word reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'overlay',
    'steadicam',
    'locked',
    'fixed',
    'captions',
    'typography',
    'depth',
    'parallax-free',
    'breathing',
    'word-reveal',
  ],
  dependencies: {
    presets: ['genericOpacityEffect'],
  },
  defaultInputParams: {
    primaryText: 'STEADICAM',
    primaryFontSize: '64px',
    secondaryText: 'Locked Text',
    secondaryFontSize: '32px',
    tertiaryText: 'Always Stable',
    tertiaryFontSize: '24px',
    fontFamily: 'Inter',
    breathingDuration: 4,
    breathingScale: 1.02,
    duration: 30,
  },
};

// Export preset
export const steadicamLockedTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
