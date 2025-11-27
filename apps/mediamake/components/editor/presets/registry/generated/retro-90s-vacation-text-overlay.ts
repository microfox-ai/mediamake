/**
 * 90s Family Vacation Text Overlay Preset
 *
 * This preset recreates the nostalgic charm of 90s home video editing software like Windows Movie Maker.
 * It features spiral-in text animations, star wipe transitions, page turn effects, pixelated edge quality,
 * over-brightened washed-out color correction, lens flare sweeps, and playful fonts.
 *
 * Features:
 * - **Spiral In Animation**: Text spirals in with combined rotation (360→0°) and scale (0→1) with circular motion
 * - **Star Wipe Transition**: Animated clip-path polygon for star wipe mask effect
 * - **Page Turn Effect**: 3D page turn with rotateY transformation for subtitle text
 * - **Over-Brightened Look**: Washed-out color correction with brightness(1.3) and contrast(0.9)
 * - **Lens Flare Sweep**: Animated gradient overlay moving across text continuously
 * - **Pixelated Edges**: Image-rendering pixelated for authentic retro quality
 * - **Playful Fonts**: Comic Sans MS and Marker Felt fonts for that amateur video aesthetic
 * - **Colorful Text Shadows**: Multiple color shadows (gold, hot pink, cyan) for that over-processed look
 *
 * Use cases:
 * - Creating nostalgic 90s-style family vacation videos
 * - Adding retro text overlays to throwback content
 * - Building Windows Movie Maker-style title cards
 * - Social media content with nostalgic aesthetic
 * - Parody videos mimicking amateur video editing
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
  // Text content
  mainText: z
    .string()
    .optional()
    .describe(
      'Main title text to display. If not provided, uses caption.text from subtitles.',
    ),
  subtitleText: z
    .string()
    .optional()
    .describe(
      'Subtitle text to display below main title. If not provided, uses caption.metadata.keyword.',
    ),

  // Font configuration
  mainFont: z
    .string()
    .default('Comic Sans MS:700')
    .describe(
      'Main title font family with weight (e.g., "Comic Sans MS:700", "Marker Felt:600")',
    ),
  subtitleFont: z
    .string()
    .default('Marker Felt:600')
    .describe(
      'Subtitle font family with weight (e.g., "Marker Felt:600", "Comic Sans MS:600")',
    ),
  mainFontSize: z
    .number()
    .default(72)
    .describe('Main title font size in pixels'),
  subtitleFontSize: z
    .number()
    .default(36)
    .describe('Subtitle font size in pixels'),

  // Colors
  mainColor: z
    .string()
    .default('#FFD700')
    .describe('Main title text color (hex format)'),
  subtitleColor: z
    .string()
    .default('#FFFFFF')
    .describe('Subtitle text color (hex format)'),
  backgroundColor: z
    .string()
    .default('#1a1a2e')
    .describe('Background color behind text overlay (hex format)'),

  // Animation settings
  spiralDuration: z
    .number()
    .default(1.5)
    .describe('Duration of spiral-in animation in seconds'),
  pageTurnDuration: z
    .number()
    .default(1.2)
    .describe('Duration of page-turn animation in seconds'),
  pageTurnDelay: z
    .number()
    .default(0.5)
    .describe('Delay before page-turn animation starts in seconds'),
  lensFlareSpeed: z
    .number()
    .default(3)
    .describe('Duration of one lens flare sweep cycle in seconds'),

  // Visual effects
  brightness: z
    .number()
    .default(1.3)
    .describe('Brightness multiplier for over-brightened look (1.0 = normal)'),
  contrast: z
    .number()
    .default(0.9)
    .describe('Contrast multiplier for washed-out look (1.0 = normal)'),
  enableStarWipe: z
    .boolean()
    .default(true)
    .describe('Enable star wipe clip-path mask effect'),
  enableLensFlare: z
    .boolean()
    .default(true)
    .describe('Enable lens flare sweep overlay'),

  // Layout
  textAlignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of text content'),
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text overlay'),

  // Timing
  startTime: z
    .number()
    .optional()
    .describe(
      'Start time in seconds. If not provided, uses caption timing or 0.',
    ),
  duration: z
    .number()
    .optional()
    .describe(
      'Duration in seconds. If not provided, uses caption duration or 5 seconds.',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  inputParams: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const params = { ...presetParams.parse(inputParams) };
  const { config } = props;

  // Helper function to parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
      }
    }

    return { fontFamily, fontStyle };
  };

  // Get caption data if available
  const captions = (config as any)?.captions as TranscriptionSentence[] | undefined;
  const firstCaption = captions && captions.length > 0 ? captions[0] : null;

  // Determine text content
  const mainText = params.mainText || firstCaption?.text || 'Summer Vacation 1999';
  const subtitleText =
    params.subtitleText || firstCaption?.metadata?.keyword || 'Fun Times!';

  // Determine timing
  const startTime = params.startTime ?? firstCaption?.absoluteStart ?? 0;
  const duration = params.duration ?? firstCaption?.duration ?? 5;

  // Parse fonts
  const mainFontParsed = parseFontString(params.mainFont);
  const subtitleFontParsed = parseFontString(params.subtitleFont);

  // Alignment classes
  const alignmentClass =
    params.textAlignment === 'left'
      ? 'justify-start'
      : params.textAlignment === 'right'
        ? 'justify-end'
        : 'justify-center';

  const verticalClass =
    params.verticalPosition === 'top'
      ? 'items-start'
      : params.verticalPosition === 'bottom'
        ? 'items-end'
        : 'items-center';

  // ============================================================================
  // COMPONENT TREE CONSTRUCTION
  // ============================================================================

  // Main title text with spiral-in animation
  const mainTitleText = {
    id: 'retro-90s-main-title-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: mainText,
      style: {
        ...mainFontParsed.fontStyle,
        color: params.mainColor,
        fontSize: `${params.mainFontSize}px`,
        textAlign: params.textAlignment,
        textShadow:
          '3px 3px 0px #FF69B4, -2px -2px 0px #00CED1, 1px 1px 2px rgba(255, 215, 0, 0.5)',
        imageRendering: 'pixelated' as any,
        WebkitFontSmoothing: 'none' as any,
      },
      font: {
        family: mainFontParsed.fontFamily,
        ...(mainFontParsed.fontStyle.fontWeight
          ? { weights: [mainFontParsed.fontStyle.fontWeight.toString()] }
          : {}),
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'spiral-in-effect',
        componentId: 'retro-90s-main-title-text',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.spiralDuration,
          mode: 'provider',
          targetIds: ['retro-90s-main-title-text'],
          ranges: [
            // Rotation: 360 → 0
            { key: 'rotate', val: 360, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            // Scale: 0 → 1
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Circular motion path - X
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 50, prog: 0.25 },
            { key: 'translateX', val: 0, prog: 0.5 },
            { key: 'translateX', val: -50, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            // Circular motion path - Y
            { key: 'translateY', val: 50, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.25 },
            { key: 'translateY', val: -50, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 0.75 },
            { key: 'translateY', val: 50, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData;

  // Subtitle text with page-turn animation
  const subtitleTextComponent = {
    id: 'retro-90s-subtitle-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: subtitleText,
      style: {
        ...subtitleFontParsed.fontStyle,
        color: params.subtitleColor,
        fontSize: `${params.subtitleFontSize}px`,
        textAlign: params.textAlignment,
        textShadow: '2px 2px 4px rgba(255, 105, 180, 0.8)',
        opacity: 0.9,
        imageRendering: 'pixelated' as any,
        WebkitFontSmoothing: 'none' as any,
      },
      font: {
        family: subtitleFontParsed.fontFamily,
        ...(subtitleFontParsed.fontStyle.fontWeight
          ? { weights: [subtitleFontParsed.fontStyle.fontWeight.toString()] }
          : {}),
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'page-turn-effect',
        componentId: 'retro-90s-subtitle-text',
        data: {
          type: 'ease-in-out',
          start: params.pageTurnDelay,
          duration: params.pageTurnDuration,
          mode: 'provider',
          targetIds: ['retro-90s-subtitle-text'],
          ranges: [
            // 3D page turn: rotateY -90 → 0
            { key: 'rotateY', val: -90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            // Fade in: opacity 0 → 1
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData;

  // Text group container with grid layout
  const textGroup = {
    id: 'retro-90s-text-group',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid grid-cols-1 gap-4 p-8`,
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    effects: [],
    childrenData: [mainTitleText, subtitleTextComponent] as RenderableComponentData[],
  } as RenderableComponentData;

  // Star wipe container (with clip-path)
  const starWipeContainer = {
    id: 'retro-90s-star-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: params.enableStarWipe
          ? {
              clipPath:
                'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            }
          : {},
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    effects: [],
    childrenData: [textGroup] as RenderableComponentData[],
  } as RenderableComponentData;

  // Lens flare overlay
  const lensFlareOverlay = params.enableLensFlare
    ? ({
        id: 'retro-90s-lens-flare-overlay',
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          style: {
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            background:
              'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%, transparent 100%)',
            backgroundSize: '200% 200%',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: duration,
          },
        },
        effects: [
          {
            id: 'lens-flare-sweep-effect',
            componentId: 'retro-90s-lens-flare-overlay',
            data: {
              type: 'linear',
              start: 0,
              duration: params.lensFlareSpeed,
              mode: 'provider',
              targetIds: ['retro-90s-lens-flare-overlay'],
              loop: true,
              ranges: [
                {
                  key: 'backgroundPosition',
                  val: '-100% -100%',
                  prog: 0,
                },
                {
                  key: 'backgroundPosition',
                  val: '200% 200%',
                  prog: 1,
                },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData)
    : null;

  // Root container
  const rootContainer = {
    id: 'retro-90s-vacation-overlay-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex ${alignmentClass} ${verticalClass}`,
        style: {
          backgroundColor: params.backgroundColor,
          filter: `brightness(${params.brightness}) contrast(${params.contrast})`,
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    effects: [],
    childrenData: lensFlareOverlay
      ? ([starWipeContainer, lensFlareOverlay] as RenderableComponentData[])
      : ([starWipeContainer] as RenderableComponentData[]),
  } as RenderableComponentData;

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
  id: 'retro-90s-vacation-text-overlay',
  title: '90s Family Vacation Text Overlay',
  description:
    'A nostalgic text overlay preset that recreates the cheesy charm of 90s home video editing software like Windows Movie Maker. Features spiral-in text animations, star wipe transitions, page turn effects, pixelated edge quality, over-brightened washed-out color correction, lens flare sweeps, and playful fonts like Comic Sans MS. Perfect for family vacation videos, throwback content, and retro-aesthetic social media posts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text-overlay',
    'retro',
    '90s',
    'nostalgic',
    'windows-movie-maker',
    'spiral',
    'star-wipe',
    'page-turn',
    'lens-flare',
    'vacation',
    'family',
    'throwback',
  ],
  defaultInputParams: {
    mainFont: 'Comic Sans MS:700',
    subtitleFont: 'Marker Felt:600',
    mainFontSize: 72,
    subtitleFontSize: 36,
    mainColor: '#FFD700',
    subtitleColor: '#FFFFFF',
    backgroundColor: '#1a1a2e',
    spiralDuration: 1.5,
    pageTurnDuration: 1.2,
    pageTurnDelay: 0.5,
    lensFlareSpeed: 3,
    brightness: 1.3,
    contrast: 0.9,
    enableStarWipe: true,
    enableLensFlare: true,
    textAlignment: 'center',
    verticalPosition: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const retro90sVacationTextOverlayPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      mainText: {
        type: 'string',
        description:
          'Main title text to display. If not provided, uses caption.text from subtitles.',
      },
      subtitleText: {
        type: 'string',
        description:
          'Subtitle text to display below main title. If not provided, uses caption.metadata.keyword.',
      },
      mainFont: {
        type: 'string',
        description:
          'Main title font family with weight (e.g., "Comic Sans MS:700", "Marker Felt:600")',
        default: 'Comic Sans MS:700',
      },
      subtitleFont: {
        type: 'string',
        description:
          'Subtitle font family with weight (e.g., "Marker Felt:600", "Comic Sans MS:600")',
        default: 'Marker Felt:600',
      },
      mainFontSize: {
        type: 'number',
        description: 'Main title font size in pixels',
        default: 72,
      },
      subtitleFontSize: {
        type: 'number',
        description: 'Subtitle font size in pixels',
        default: 36,
      },
      mainColor: {
        type: 'string',
        description: 'Main title text color (hex format)',
        default: '#FFD700',
      },
      subtitleColor: {
        type: 'string',
        description: 'Subtitle text color (hex format)',
        default: '#FFFFFF',
      },
      backgroundColor: {
        type: 'string',
        description: 'Background color behind text overlay (hex format)',
        default: '#1a1a2e',
      },
      spiralDuration: {
        type: 'number',
        description: 'Duration of spiral-in animation in seconds',
        default: 1.5,
      },
      pageTurnDuration: {
        type: 'number',
        description: 'Duration of page-turn animation in seconds',
        default: 1.2,
      },
      pageTurnDelay: {
        type: 'number',
        description: 'Delay before page-turn animation starts in seconds',
        default: 0.5,
      },
      lensFlareSpeed: {
        type: 'number',
        description: 'Duration of one lens flare sweep cycle in seconds',
        default: 3,
      },
      brightness: {
        type: 'number',
        description:
          'Brightness multiplier for over-brightened look (1.0 = normal)',
        default: 1.3,
      },
      contrast: {
        type: 'number',
        description: 'Contrast multiplier for washed-out look (1.0 = normal)',
        default: 0.9,
      },
      enableStarWipe: {
        type: 'boolean',
        description: 'Enable star wipe clip-path mask effect',
        default: true,
      },
      enableLensFlare: {
        type: 'boolean',
        description: 'Enable lens flare sweep overlay',
        default: true,
      },
      textAlignment: {
        type: 'string',
        enum: ['left', 'center', 'right'],
        description: 'Horizontal alignment of text content',
        default: 'center',
      },
      verticalPosition: {
        type: 'string',
        enum: ['top', 'center', 'bottom'],
        description: 'Vertical position of text overlay',
        default: 'center',
      },
      startTime: {
        type: 'number',
        description:
          'Start time in seconds. If not provided, uses caption timing or 0.',
      },
      duration: {
        type: 'number',
        description:
          'Duration in seconds. If not provided, uses caption duration or 5 seconds.',
      },
    },
    required: [],
  },
};
