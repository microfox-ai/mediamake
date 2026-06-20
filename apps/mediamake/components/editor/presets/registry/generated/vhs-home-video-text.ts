/**
 * 90s VHS Home Video Text Preset
 *
 * A nostalgic 90s home video typography preset featuring vintage VHS tracking glitch effects.
 * Words appear word-by-word with horizontal static distortion lines sweeping across as text materializes.
 * 
 * Features:
 * - **VHS Aesthetic**: Chunky retro VCR OSD Mono font with authentic vintage look
 * - **Chromatic Aberration**: Red/cyan offset layers for analog color separation effect
 * - **Tracking Glitches**: Horizontal static lines sweep across each word as it appears
 * - **Analog Flicker**: Opacity variations simulating unstable magnetic tape playback
 * - **Horizontal Jitter**: Subtle displacement mimicking tracking errors
 * - **Scan Lines**: Background texture overlay for CRT monitor effect
 * - **Grain Overlay**: Film grain texture for degraded tape aesthetic
 * - **Vintage Color Grading**: Desaturated, contrast-adjusted colors
 * 
 * Use cases:
 * - Creating nostalgic 90s home video title cards
 * - Retro VHS-style captions and subtitles
 * - Vintage aesthetic social media content
 * - Throwback video intros and outros
 * - Analog glitch art projects
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption objects with words, timing, and text data'),
  font: z
    .string()
    .optional()
    .default('VCR OSD Mono:700')
    .describe(
      'Font family with optional weight (e.g., "VCR OSD Mono:700", "Courier:700")',
    ),
  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Base font size in pixels for the VHS text'),
  textColor: z
    .string()
    .optional()
    .default('#f0f0f0')
    .describe('Main text color (light gray for vintage look)'),
  chromaticIntensity: z
    .number()
    .optional()
    .default(2)
    .describe(
      'Intensity of chromatic aberration offset in pixels (red/cyan separation)',
    ),
  flickerIntensity: z
    .number()
    .optional()
    .default(0.2)
    .describe('Intensity of analog flicker effect (0-1 range)'),
  jitterAmount: z
    .number()
    .optional()
    .default(2)
    .describe('Amount of horizontal jitter/displacement in pixels'),
  scanlineOpacity: z
    .number()
    .optional()
    .default(0.6)
    .describe('Opacity of scan line overlay (0-1)'),
  grainOpacity: z
    .number()
    .optional()
    .default(0.08)
    .describe('Opacity of grain texture overlay (0-1)'),
  trackingGlitchDuration: z
    .number()
    .optional()
    .default(0.2)
    .describe('Duration of tracking glitch line sweep in seconds'),
  backgroundColor: z
    .string()
    .optional()
    .default('#0a0a0a')
    .describe('Background color for the VHS effect'),
  contrast: z
    .number()
    .optional()
    .default(1.1)
    .describe('Contrast adjustment for vintage look'),
  brightness: z
    .number()
    .optional()
    .default(0.95)
    .describe('Brightness adjustment for vintage look'),
  saturation: z
    .number()
    .optional()
    .default(0.8)
    .describe('Saturation adjustment for vintage look'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font = 'VCR OSD Mono:700',
    fontSize = 48,
    textColor = '#f0f0f0',
    chromaticIntensity = 2,
    flickerIntensity = 0.2,
    jitterAmount = 2,
    scanlineOpacity = 0.6,
    grainOpacity = 0.08,
    trackingGlitchDuration = 0.2,
    backgroundColor = '#0a0a0a',
    contrast = 1.1,
    brightness = 0.95,
    saturation = 0.8,
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;

  // Parse font string
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontStyle: React.CSSProperties = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Create flicker keyframes
  const createFlickerEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
  ) => {
    const flickerFrames = Math.floor(wordDuration * fps);
    const ranges = [];
    
    // Generate random flicker pattern
    for (let i = 0; i <= flickerFrames; i++) {
      const progress = i / flickerFrames;
      const randomFlicker = 1 - Math.random() * flickerIntensity;
      ranges.push({ key: 'opacity', val: randomFlicker, prog: progress });
    }

    return {
      id: `flicker-${wordId}`,
      componentId: wordId,
      data: {
        type: 'custom-keyframes',
        start: wordStart,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges,
      },
    };
  };

  // Helper: Create jitter effect
  const createJitterEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
  ) => {
    const jitterFrames = Math.floor(wordDuration * fps);
    const ranges = [];
    
    for (let i = 0; i <= jitterFrames; i++) {
      const progress = i / jitterFrames;
      const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
      ranges.push({ key: 'translateX', val: randomJitter, prog: progress });
    }

    return {
      id: `jitter-${wordId}`,
      componentId: wordId,
      data: {
        type: 'custom-keyframes',
        start: wordStart,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges,
      },
    };
  };

  // Helper: Create scale pulse effect
  const createScalePulseEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
  ) => {
    return {
      id: `scale-pulse-${wordId}`,
      componentId: wordId,
      data: {
        type: 'ease-in-out',
        start: wordStart,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 0.98, prog: 0 },
          { key: 'scale', val: 1.02, prog: 0.5 },
          { key: 'scale', val: 0.98, prog: 1 },
        ],
      },
    };
  };

  // Build children for each caption
  const allCaptionContainers: RenderableComponentData[] = [];

  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const wordWrappers: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `vhs-word-${captionIndex}-${wordIndex}`;
      const redLayerId = `red-layer-${captionIndex}-${wordIndex}`;
      const cyanLayerId = `cyan-layer-${captionIndex}-${wordIndex}`;
      const mainTextId = `main-text-${captionIndex}-${wordIndex}`;
      const trackingLineId = `tracking-line-${captionIndex}-${wordIndex}`;

      // Chromatic aberration - Red layer
      const redLayer: RenderableComponentData = {
        id: redLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            position: 'absolute',
            color: 'rgba(255, 0, 0, 0.5)',
            mixBlendMode: 'screen',
            transform: `translateX(-${chromaticIntensity}px)`,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
          fontSize,
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `red-fade-${wordId}`,
            componentId: redLayerId,
            data: {
              type: 'ease-out',
              start: word.start,
              duration: 0.1,
              mode: 'provider',
              targetIds: [redLayerId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.5, prog: 1 },
              ],
            },
          },
        ],
      };

      // Chromatic aberration - Cyan layer
      const cyanLayer: RenderableComponentData = {
        id: cyanLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            position: 'absolute',
            color: 'rgba(0, 255, 255, 0.5)',
            mixBlendMode: 'screen',
            transform: `translateX(${chromaticIntensity}px)`,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
          fontSize,
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `cyan-fade-${wordId}`,
            componentId: cyanLayerId,
            data: {
              type: 'ease-out',
              start: word.start,
              duration: 0.1,
              mode: 'provider',
              targetIds: [cyanLayerId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.5, prog: 1 },
              ],
            },
          },
        ],
      };

      // Main text layer
      const mainText: RenderableComponentData = {
        id: mainTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            position: 'relative',
            zIndex: 10,
            color: textColor,
            textShadow: '0 0 8px rgba(255,255,255,0.3)',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
          fontSize,
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `fade-in-${wordId}`,
            componentId: mainTextId,
            data: {
              type: 'ease-out',
              start: word.start,
              duration: 0.15,
              mode: 'provider',
              targetIds: [mainTextId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          createFlickerEffect(mainTextId, word.start, word.duration),
          createJitterEffect(mainTextId, word.start, word.duration),
          createScalePulseEffect(mainTextId, word.start, word.duration),
        ],
      };

      // Tracking glitch line
      const trackingLine: RenderableComponentData = {
        id: trackingLineId,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          containerProps: {
            className: 'absolute left-0 right-0',
            style: {
              height: '3px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.8) 80%, transparent 100%)',
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `tracking-sweep-${wordId}`,
            componentId: trackingLineId,
            data: {
              type: 'linear',
              start: word.start,
              duration: trackingGlitchDuration,
              mode: 'provider',
              targetIds: [trackingLineId],
              ranges: [
                { key: 'translateY', val: -20, prog: 0 },
                { key: 'translateY', val: 80, prog: 1 },
                { key: 'opacity', val: 0.9, prog: 0 },
                { key: 'opacity', val: 0.9, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      // Word wrapper containing all layers
      const wordWrapper: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {},
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [redLayer, cyanLayer, mainText, trackingLine],
      };

      wordWrappers.push(wordWrapper);
    });

    // Caption container
    const captionContainer: RenderableComponentData = {
      id: `vhs-caption-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'flex flex-row flex-wrap items-center justify-center gap-2 p-5 max-w-[80%]',
          style: {},
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordWrappers,
    };

    allCaptionContainers.push(captionContainer);
  });

  // Scan lines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: 'vhs-scanlines-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-10',
        style: {
          opacity: scanlineOpacity,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: config?.duration || 30,
      },
    },
  };

  // Grain overlay
  const grainOverlay: RenderableComponentData = {
    id: 'vhs-grain-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-20',
        style: {
          opacity: grainOpacity,
          mixBlendMode: 'overlay',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: config?.duration || 30,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vhs-home-video-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col items-center justify-center',
        style: {
          backgroundColor,
          filter: `contrast(${contrast}) brightness(${brightness}) saturate(${saturation})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: config?.duration || 30,
      },
    },
    childrenData: [
      scanlinesOverlay,
      ...allCaptionContainers,
      grainOverlay,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vhs-home-video-text',
  title: '90s VHS Home Video Text',
  description:
    'A nostalgic 90s home video typography preset featuring vintage VHS tracking glitch effects. Words appear word-by-word with horizontal static distortion lines sweeping across as text materializes. Features chunky retro VCR OSD Mono font with chromatic aberration (red/cyan offset layers), analog flicker via opacity variations, horizontal displacement jitter, scan line overlay texture, and occasional tracking errors. Simulates the look of text being recorded on degraded magnetic tape with authentic VHS aesthetic including grainy texture, contrast adjustments, and desaturated colors.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'vhs',
    'retro',
    '90s',
    'vintage',
    'glitch',
    'chromatic-aberration',
    'tracking',
    'analog',
    'home-video',
    'captions',
    'text',
  ],
  defaultInputParams: {
    font: 'VCR OSD Mono:700',
    fontSize: 48,
    textColor: '#f0f0f0',
    chromaticIntensity: 2,
    flickerIntensity: 0.2,
    jitterAmount: 2,
    scanlineOpacity: 0.6,
    grainOpacity: 0.08,
    trackingGlitchDuration: 0.2,
    backgroundColor: '#0a0a0a',
    contrast: 1.1,
    brightness: 0.95,
    saturation: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const vhsHomeVideoTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      captions: {
        type: 'array',
        items: { type: 'any' },
        description:
          'Array of caption objects with words, timing, and text data',
      },
      font: {
        type: 'string',
        description:
          'Font family with optional weight (e.g., "VCR OSD Mono:700", "Courier:700")',
        default: 'VCR OSD Mono:700',
      },
      fontSize: {
        type: 'number',
        description: 'Base font size in pixels for the VHS text',
        default: 48,
      },
      textColor: {
        type: 'string',
        description: 'Main text color (light gray for vintage look)',
        default: '#f0f0f0',
      },
      chromaticIntensity: {
        type: 'number',
        description:
          'Intensity of chromatic aberration offset in pixels (red/cyan separation)',
        default: 2,
      },
      flickerIntensity: {
        type: 'number',
        description: 'Intensity of analog flicker effect (0-1 range)',
        default: 0.2,
      },
      jitterAmount: {
        type: 'number',
        description: 'Amount of horizontal jitter/displacement in pixels',
        default: 2,
      },
      scanlineOpacity: {
        type: 'number',
        description: 'Opacity of scan line overlay (0-1)',
        default: 0.6,
      },
      grainOpacity: {
        type: 'number',
        description: 'Opacity of grain texture overlay (0-1)',
        default: 0.08,
      },
      trackingGlitchDuration: {
        type: 'number',
        description: 'Duration of tracking glitch line sweep in seconds',
        default: 0.2,
      },
      backgroundColor: {
        type: 'string',
        description: 'Background color for the VHS effect',
        default: '#0a0a0a',
      },
      contrast: {
        type: 'number',
        description: 'Contrast adjustment for vintage look',
        default: 1.1,
      },
      brightness: {
        type: 'number',
        description: 'Brightness adjustment for vintage look',
        default: 0.95,
      },
      saturation: {
        type: 'number',
        description: 'Saturation adjustment for vintage look',
        default: 0.8,
      },
    },
    required: ['captions'],
  },
};
