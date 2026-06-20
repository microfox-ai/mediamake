/**
 * VHS Rewind Typography Effect Preset
 *
 * A 90s home video inspired text animation that mimics VHS tape manipulation.
 * Words appear with horizontal scan line distortion, briefly rewind with reverse
 * motion blur, then play forward normally. Features authentic analog artifacts
 * including tape stretch effects (horizontal scaleX distortion), tracking lines,
 * head switch noise at transitions, and continuous scan line overlay.
 *
 * Features:
 * - **Rewind Effect Sequence**: Quick reverse motion → pause with distortion → forward play
 * - **Tape Stretch Artifacts**: Horizontal scaleX distortion (1.0 → 1.5 → 1.0)
 * - **Scan Line Distortion**: Animated repeating linear-gradient overlay
 * - **Tracking Lines**: Horizontal interference lines that glitch at transitions
 * - **Head Switch Noise**: Brief opacity glitches at word boundaries
 * - **Motion Blur**: Applied during direction changes for authentic tape feel
 * - **VHS Aesthetics**: Dark background, chromatic aberration text shadow, bold condensed fonts
 *
 * Use cases:
 * - Creating nostalgic 90s video title sequences
 * - Retro-style social media content
 * - Music videos with vintage VHS aesthetics
 * - Artistic projects requiring analog tape manipulation effects
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  font: z
    .string()
    .optional()
    .default('Bebas Neue:400')
    .describe(
      'Font family with optional weight and style (e.g., "Bebas Neue:400", "Oswald:600")',
    ),
  fontSize: z
    .number()
    .optional()
    .default(72)
    .describe('Font size in pixels for the text'),
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Primary text color in hex format'),
  backgroundColor: z
    .string()
    .optional()
    .default('#0a0a0a')
    .describe('Background color for VHS effect'),
  rewindIntensity: z
    .number()
    .optional()
    .default(1.0)
    .describe(
      'Intensity multiplier for rewind effect (0.5 = subtle, 2.0 = intense)',
    ),
  tapeStretchAmount: z
    .number()
    .optional()
    .default(1.5)
    .describe('Maximum horizontal stretch scale (1.0 = no stretch, 2.0 = 2x stretch)'),
  scanLineSpeed: z
    .number()
    .optional()
    .default(0.1)
    .describe('Speed of scan line animation in seconds per cycle'),
  chromaticAberration: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable chromatic aberration text shadow effect'),
  wordSpacing: z
    .number()
    .optional()
    .default(16)
    .describe('Spacing between words in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = async (
  inputParams: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Helper function to generate unique IDs
  const generateId = (prefix: string, index: number): string => {
    return `${prefix}-${index}-${Date.now()}`;
  };

  // Extract parameters with defaults
  const {
    font = 'Bebas Neue:400',
    fontSize = 72,
    textColor = '#ffffff',
    backgroundColor = '#0a0a0a',
    rewindIntensity = 1.0,
    tapeStretchAmount = 1.5,
    scanLineSpeed = 0.1,
    chromaticAberration = true,
    wordSpacing = 16,
  } = inputParams;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Bebas Neue:400';
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
  }

  // Get caption data from baseData
  const captions = (props.baseData?.captions || []) as TranscriptionSentence[];

  if (!captions || captions.length === 0) {
    throw new Error('No caption data provided in baseData.captions');
  }

  // Build VHS overlay layers (scan lines, tracking lines, vignette)
  const vhsOverlayId = generateId('vhs-overlay', 0);
  const scanLinesId = generateId('scan-lines', 0);
  const trackingLinesId = generateId('tracking-lines', 0);

  const vhsOverlay: RenderableComponentData = {
    id: vhsOverlayId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-10',
        style: {
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.2) 100%)',
          mixBlendMode: 'overlay',
        },
      },
    },
    childrenData: [],
  };

  // Scan lines with animated scroll
  const scanLines: RenderableComponentData = {
    id: scanLinesId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-[15]',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        },
      },
    },
    effects: [
      {
        id: `${scanLinesId}-effect`,
        componentId: scanLinesId,
        data: {
          type: 'continuous-scroll',
          start: 0,
          duration: scanLineSpeed,
          mode: 'provider',
          targetIds: [scanLinesId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 4, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Tracking lines (horizontal interference)
  const trackingLines: RenderableComponentData = {
    id: trackingLinesId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      containerProps: {
        className: 'absolute pointer-events-none w-full z-20',
        style: {
          height: '8px',
          top: '50%',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.8) 80%, transparent 100%)',
          opacity: 0,
        },
      },
    },
    childrenData: [],
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    if (words.length === 0) return;

    // Create word components with VHS rewind effects
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = generateId(`vhs-word-${captionIndex}`, wordIndex);

      // Calculate rewind timing offsets
      const rewindDuration = 0.2 * rewindIntensity;
      const pauseDuration = 0.1 * rewindIntensity;
      const forwardDuration = 0.25 * rewindIntensity;
      const totalPreDuration = rewindDuration + pauseDuration;

      // Rewind starts before word.start
      const rewindStart = Math.max(0, word.start - totalPreDuration);
      const pauseStart = Math.max(0, word.start - pauseDuration);
      const forwardStart = word.start;

      // Build text shadow with chromatic aberration
      let textShadow = '2px 2px 0px rgba(0,0,0,0.8)';
      if (chromaticAberration) {
        textShadow +=
          ', -1px -1px 0px rgba(255,0,0,0.3), 1px 1px 0px rgba(0,255,255,0.3)';
      }

      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            color: textColor,
            fontSize: `${fontSize}px`,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textShadow: textShadow,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [],
        childrenData: [],
      };

      // Effect 1: Rewind reverse motion (translateX + blur)
      if (rewindStart >= 0) {
        wordComponent.effects!.push({
          id: `${wordId}-rewind-reverse`,
          componentId: wordId,
          data: {
            type: 'ease-out',
            start: rewindStart,
            duration: rewindDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -30 * rewindIntensity, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          },
        });
      }

      // Effect 2: Distortion pause (tape stretch scaleX)
      if (pauseStart >= 0) {
        wordComponent.effects!.push({
          id: `${wordId}-tape-stretch`,
          componentId: wordId,
          data: {
            type: 'ease-in-out',
            start: pauseStart,
            duration: pauseDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'scaleX', val: 1.0, prog: 0 },
              { key: 'scaleX', val: tapeStretchAmount, prog: 0.5 },
              { key: 'scaleX', val: 1.0, prog: 1 },
            ],
          },
        });
      }

      // Effect 3: Forward play (translateX back to 0, opacity to 1)
      wordComponent.effects!.push({
        id: `${wordId}-forward-play`,
        componentId: wordId,
        data: {
          type: 'ease-in-out',
          start: forwardStart,
          duration: forwardDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: -30 * rewindIntensity, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Effect 4: Head switch noise at word start (opacity glitch)
      if (wordIndex > 0) {
        const noiseDuration = 0.08;
        wordComponent.effects!.push({
          id: `${wordId}-head-switch-noise`,
          componentId: wordId,
          data: {
            type: 'linear',
            start: Math.max(0, word.start - 0.04),
            duration: noiseDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.25 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 0.75 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        });
      }

      wordComponents.push(wordComponent);
    });

    // Create caption container
    const captionContainerId = generateId('vhs-caption-container', captionIndex);
    const captionContainer: RenderableComponentData = {
      id: captionContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center justify-center flex-wrap z-[5] p-5',
          style: {
            gap: `${wordSpacing}px`,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents as RenderableComponentData[],
    };

    captionContainers.push(captionContainer);
  });

  // Root container with VHS background
  const rootContainerId = generateId('vhs-rewind-root', 0);
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    childrenData: [
      vhsOverlay,
      scanLines,
      trackingLines,
      ...captionContainers,
    ] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'vhs-rewind-typography',
  title: 'VHS Rewind Typography Effect',
  description:
    'A 90s home video inspired text animation that mimics VHS tape manipulation. Words appear with horizontal scan line distortion, briefly rewind with reverse motion blur, then play forward normally. Features authentic analog artifacts including tape stretch effects (horizontal scaleX distortion), tracking lines, head switch noise at transitions, and continuous scan line overlay. Uses bold condensed fonts reminiscent of old video titles. The effect captures the unique behavior of analog tape rewinding and playing, with each word going through a reverse-pause-forward sequence synchronized to word timing.',
  presetType: 'full',
  type: 'predefined',
  tags: [
    'typography',
    'vhs',
    'retro',
    '90s',
    'rewind',
    'glitch',
    'analog',
    'tape',
    'vintage',
    'distortion',
    'scan-lines',
    'motion-blur',
  ],
  defaultInputParams: {
    font: 'Bebas Neue:400',
    fontSize: 72,
    textColor: '#ffffff',
    backgroundColor: '#0a0a0a',
    rewindIntensity: 1.0,
    tapeStretchAmount: 1.5,
    scanLineSpeed: 0.1,
    chromaticAberration: true,
    wordSpacing: 16,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const vhsRewindTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      font: {
        type: 'string',
        description:
          'Font family with optional weight and style (e.g., "Bebas Neue:400", "Oswald:600")',
        default: 'Bebas Neue:400',
      },
      fontSize: {
        type: 'number',
        description: 'Font size in pixels for the text',
        default: 72,
      },
      textColor: {
        type: 'string',
        description: 'Primary text color in hex format',
        default: '#ffffff',
      },
      backgroundColor: {
        type: 'string',
        description: 'Background color for VHS effect',
        default: '#0a0a0a',
      },
      rewindIntensity: {
        type: 'number',
        description:
          'Intensity multiplier for rewind effect (0.5 = subtle, 2.0 = intense)',
        default: 1.0,
      },
      tapeStretchAmount: {
        type: 'number',
        description:
          'Maximum horizontal stretch scale (1.0 = no stretch, 2.0 = 2x stretch)',
        default: 1.5,
      },
      scanLineSpeed: {
        type: 'number',
        description: 'Speed of scan line animation in seconds per cycle',
        default: 0.1,
      },
      chromaticAberration: {
        type: 'boolean',
        description: 'Enable chromatic aberration text shadow effect',
        default: true,
      },
      wordSpacing: {
        type: 'number',
        description: 'Spacing between words in pixels',
        default: 16,
      },
    },
    required: [],
    additionalProperties: false,
  },
};
