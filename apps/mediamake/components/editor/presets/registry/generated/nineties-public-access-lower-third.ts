/**
 * 90s Public Access TV Lower Third Preset
 *
 * Creates an authentic 90s public access television lower third with characteristic
 * low-budget video production aesthetics. Features cheesy slide-in wipe transitions
 * from the left with ghosted frame trails, white text on blue background bars,
 * interlaced scan lines, subtle horizontal hold glitches, and layered drop shadows.
 *
 * Features:
 * - **Authentic 90s Aesthetics**: Blue background bars with white bold text
 * - **Ghost Trail Effect**: Multiple opacity layers creating VHS-style motion blur
 * - **Slide Wipe Animation**: Linear translateX transition from left edge
 * - **Horizontal Hold Glitch**: Random subtle horizontal displacement jumps
 * - **Interlaced Scan Lines**: CSS gradient overlay for CRT monitor look
 * - **Drop Shadow**: Layered text shadow for video composite effect
 * - **Color Bleeding**: Slight chromatic separation for analog video feel
 *
 * Use cases:
 * - Retro video productions with 90s aesthetic
 * - VHS-style content and throwback videos
 * - Ironic or nostalgic lower thirds
 * - Public access TV parodies
 * - Lo-fi video art projects
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ===========================
// PRESET PARAMETERS SCHEMA
// ===========================

const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption/sentence objects with word-level timing data'),
  fontSize: z
    .number()
    .optional()
    .default(32)
    .describe('Font size in pixels for the lower third text'),
  backgroundColor: z
    .string()
    .optional()
    .default('#0000FF')
    .describe('Background color for word boxes (default: 90s TV blue)'),
  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color for words (default: white)'),
  bottomPadding: z
    .number()
    .optional()
    .default(60)
    .describe('Distance from bottom edge in pixels'),
  leftPadding: z
    .number()
    .optional()
    .default(40)
    .describe('Distance from left edge in pixels'),
  wordPadding: z
    .string()
    .optional()
    .default('4px 8px')
    .describe('Padding inside each word box (CSS format: vertical horizontal)'),
  wordGap: z
    .number()
    .optional()
    .default(4)
    .describe('Gap between word boxes in pixels'),
  slideInDuration: z
    .number()
    .optional()
    .default(0.267)
    .describe('Duration of slide-in wipe animation in seconds (8 frames at 30fps)'),
  glitchProbability: z
    .number()
    .optional()
    .default(0.1)
    .describe('Probability of horizontal hold glitch occurring (0-1, default 0.1 = 10%)'),
  glitchAmount: z
    .number()
    .optional()
    .default(5)
    .describe('Maximum horizontal displacement for glitch effect in pixels'),
  scanlineIntensity: z
    .number()
    .optional()
    .default(0.15)
    .describe('Opacity of interlaced scan lines (0-1, default 0.15)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ===========================
// PRESET EXECUTION FUNCTION
// ===========================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions = [],
    fontSize = 32,
    backgroundColor = '#0000FF',
    textColor = '#FFFFFF',
    bottomPadding = 60,
    leftPadding = 40,
    wordPadding = '4px 8px',
    wordGap = 4,
    slideInDuration = 0.267,
    glitchProbability = 0.1,
    glitchAmount = 5,
    scanlineIntensity = 0.15,
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;

  // Helper: Generate unique ID
  const generateId = (prefix: string, index: number): string => {
    return `${prefix}-${index}-${Date.now()}`;
  };

  // Helper: Create base effect structure
  const createEffect = (
    id: string,
    componentId: string,
    type: string,
    start: number,
    duration: number,
    ranges: Array<{ key: string; val: any; prog: number }>,
  ) => {
    return {
      id,
      componentId,
      data: {
        type,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [componentId],
        ranges,
      },
    };
  };

  // Build all children components
  const allChildren: RenderableComponentData[] = [];

  // Process each caption
  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const words = caption.words || [];
    if (words.length === 0) return;

    // Create word components with ghost trails
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = generateId(`word-${captionIndex}`, wordIndex);
      const ghostId1 = generateId(`ghost1-${captionIndex}`, wordIndex);
      const ghostId2 = generateId(`ghost2-${captionIndex}`, wordIndex);
      const ghostId3 = generateId(`ghost3-${captionIndex}`, wordIndex);

      // Slide-in effect for main word
      const slideEffect = createEffect(
        `slide-${wordId}`,
        wordId,
        'ease-out',
        word.start,
        slideInDuration,
        [
          { key: 'translateX', val: -100, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      );

      // Random horizontal hold glitch effect
      const glitchEffects: any[] = [];
      if (Math.random() < glitchProbability) {
        const glitchStart = word.start + Math.random() * word.duration * 0.5;
        const glitchEffect = createEffect(
          `glitch-${wordId}`,
          wordId,
          'linear',
          glitchStart,
          0.033,
          [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: glitchAmount, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        );
        glitchEffects.push(glitchEffect);
      }

      // Ghost trail 3 (faintest, earliest)
      const ghostTrail3 = {
        id: ghostId3,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          font: {
            family: 'Arial',
            weights: ['700'],
          },
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: 700,
            textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
            position: 'absolute' as const,
            opacity: 0.15,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          createEffect(
            `slide-ghost3-${ghostId3}`,
            ghostId3,
            'linear',
            word.start - 3 / fps,
            slideInDuration,
            [
              { key: 'translateX', val: -100, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          ),
        ],
      } as RenderableComponentData;

      // Ghost trail 2
      const ghostTrail2 = {
        id: ghostId2,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          font: {
            family: 'Arial',
            weights: ['700'],
          },
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: 700,
            textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
            position: 'absolute' as const,
            opacity: 0.3,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          createEffect(
            `slide-ghost2-${ghostId2}`,
            ghostId2,
            'linear',
            word.start - 2 / fps,
            slideInDuration,
            [
              { key: 'translateX', val: -100, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          ),
        ],
      } as RenderableComponentData;

      // Ghost trail 1
      const ghostTrail1 = {
        id: ghostId1,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          font: {
            family: 'Arial',
            weights: ['700'],
          },
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: 700,
            textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
            position: 'absolute' as const,
            opacity: 0.5,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          createEffect(
            `slide-ghost1-${ghostId1}`,
            ghostId1,
            'linear',
            word.start - 1 / fps,
            slideInDuration,
            [
              { key: 'translateX', val: -100, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          ),
        ],
      } as RenderableComponentData;

      // Main word text
      const wordText = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          font: {
            family: 'Arial',
            weights: ['700'],
          },
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: 700,
            textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
            position: 'relative' as const,
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [slideEffect, ...glitchEffects],
      } as RenderableComponentData;

      // Word unit container with background
      const wordUnitId = generateId(`word-unit-${captionIndex}`, wordIndex);
      const wordUnit = {
        id: wordUnitId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative overflow-hidden',
            style: {
              backgroundColor: backgroundColor,
              padding: wordPadding,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [ghostTrail3, ghostTrail2, ghostTrail1, wordText],
      } as RenderableComponentData;

      wordComponents.push(wordUnit);
    });

    // Words container
    const wordsContainerId = generateId('words-container', captionIndex);
    const wordsContainer = {
      id: wordsContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center',
          style: {
            gap: `${wordGap}px`,
          },
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

    allChildren.push(wordsContainer);
  });

  // Scanline overlay (persistent across all captions)
  const scanlineId = `scanline-overlay-${Date.now()}`;
  const scanlineOverlay = {
    id: scanlineId,
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${scanlineIntensity}) 2px, rgba(0,0,0,${scanlineIntensity}) 4px)`,
          mixBlendMode: 'multiply' as const,
          zIndex: 50,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'scene',
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainerId = `nineties-public-access-container-${Date.now()}`;
  const rootContainer = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex flex-col justify-end overflow-hidden',
        style: {
          bottom: `${bottomPadding}px`,
          left: `${leftPadding}px`,
          right: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'scene',
      },
    },
    childrenData: [...allChildren, scanlineOverlay],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
  };
};

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'nineties-public-access-lower-third',
  title: '90s Public Access Lower Third',
  description:
    'A nostalgic 90s public access TV-style lower third text animation with characteristic low-budget video production aesthetics. Features cheesy slide-in wipe transitions with ghosted frame trails, white text on blue background bars, interlaced scan lines, subtle jitter effects, and layered drop shadows. Perfect for retro video content, VHS-style productions, or ironic throwback aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    '90s',
    'retro',
    'vhs',
    'public-access',
    'lower-third',
    'subtitle',
    'ghost-trail',
    'scanlines',
    'glitch',
    'vintage',
    'television',
  ],
  defaultInputParams: {
    captions: [],
    fontSize: 32,
    backgroundColor: '#0000FF',
    textColor: '#FFFFFF',
    bottomPadding: 60,
    leftPadding: 40,
    wordPadding: '4px 8px',
    wordGap: 4,
    slideInDuration: 0.267,
    glitchProbability: 0.1,
    glitchAmount: 5,
    scanlineIntensity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ===========================
// PRESET EXPORT
// ===========================

export const ninetiesPublicAccessLowerThirdPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      captions: {
        type: 'array',
        items: { type: 'object' },
        description:
          'Array of caption/sentence objects with word-level timing data',
      },
      fontSize: {
        type: 'number',
        default: 32,
        description: 'Font size in pixels for the lower third text',
      },
      backgroundColor: {
        type: 'string',
        default: '#0000FF',
        description:
          'Background color for word boxes (default: 90s TV blue)',
      },
      textColor: {
        type: 'string',
        default: '#FFFFFF',
        description: 'Text color for words (default: white)',
      },
      bottomPadding: {
        type: 'number',
        default: 60,
        description: 'Distance from bottom edge in pixels',
      },
      leftPadding: {
        type: 'number',
        default: 40,
        description: 'Distance from left edge in pixels',
      },
      wordPadding: {
        type: 'string',
        default: '4px 8px',
        description:
          'Padding inside each word box (CSS format: vertical horizontal)',
      },
      wordGap: {
        type: 'number',
        default: 4,
        description: 'Gap between word boxes in pixels',
      },
      slideInDuration: {
        type: 'number',
        default: 0.267,
        description:
          'Duration of slide-in wipe animation in seconds (8 frames at 30fps)',
      },
      glitchProbability: {
        type: 'number',
        default: 0.1,
        description:
          'Probability of horizontal hold glitch occurring (0-1, default 0.1 = 10%)',
      },
      glitchAmount: {
        type: 'number',
        default: 5,
        description:
          'Maximum horizontal displacement for glitch effect in pixels',
      },
      scanlineIntensity: {
        type: 'number',
        default: 0.15,
        description: 'Opacity of interlaced scan lines (0-1, default 0.15)',
      },
    },
    required: ['captions'],
  },
};
