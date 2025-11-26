/**
 * Upper Third Subtitles Preset
 *
 * This preset positions subtitles in the upper third of the screen, ideal for UI-heavy content,
 * meme videos, or any scenario where the bottom portion contains important elements that should
 * not be obscured by captions (e.g., watermarks, UI overlays, profile pictures).
 *
 * Features:
 * - **Upper Third Positioning**: Places subtitles in the top 8-20% of the frame
 * - **Safe Area Preservation**: 5% horizontal padding and 8% top padding to avoid screen edges
 * - **Flexible Styling**: Customizable font, size, weight, colors, and background
 * - **Animation Support**: Multiple animation styles including word-fade and sentence-highlight
 * - **Stroke Support**: Optional text stroke for enhanced visibility
 * - **Adaptive Layout**: Automatically adjusts to composition duration and caption timing
 *
 * Use Cases:
 * - Short-form vertical videos (TikTok, Reels, Shorts) with bottom UI chrome
 * - Meme content where bottom text or imagery should remain visible
 * - Educational content with lower-third graphics or overlays
 * - Gaming videos with bottom HUD or UI elements
 * - Videos with creator watermarks or social handles at the bottom
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  // Font styling
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for subtitle text'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size in pixels for subtitle text'),
  fontWeight: z
    .number()
    .default(700)
    .describe('Font weight (100-900) for subtitle text'),
  
  // Colors
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex, rgb, or named color)'),
  backgroundColor: z
    .string()
    .default('rgba(0, 0, 0, 0.85)')
    .describe('Background color for subtitle container'),
  strokeColor: z
    .string()
    .default('#000000')
    .describe('Text stroke/outline color for enhanced visibility'),
  strokeWidth: z
    .number()
    .default(2)
    .describe('Text stroke width in pixels (0 to disable)'),
  
  // Layout
  padding: z
    .number()
    .default(16)
    .describe('Padding around subtitle text in pixels'),
  textAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment within the subtitle container'),
  maxWidth: z
    .string()
    .default('5xl')
    .describe('Maximum width for subtitle container (Tailwind size: sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl, 7xl)'),
  
  // Positioning
  topPadding: z
    .string()
    .default('8%')
    .describe('Padding from top of screen to subtitle container (percentage or px)'),
  horizontalPadding: z
    .string()
    .default('5%')
    .describe('Horizontal padding from screen edges (percentage or px)'),
  
  // Animation
  animationStyle: z
    .enum(['word-fade', 'sentence-highlight', 'none'])
    .default('word-fade')
    .describe('Animation style for subtitles: word-fade (individual word fade-in), sentence-highlight (highlight active sentence), or none'),
  
  // Advanced
  negativeOffset: z
    .number()
    .default(0)
    .describe('Offset adjustment for fine-tuning vertical position (positive moves down, negative moves up)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config, presets } = props;
  
  // Validate SubtitlesOverlay dependency
  if (!presets || !presets.SubtitlesOverlay) {
    throw new Error('SubtitlesOverlay preset dependency not found');
  }

  // Calculate duration from config
  const durationInFrames = Math.round((config?.duration ?? 0) * (config?.fps ?? 24));
  const fps = config?.fps ?? 30;
  const durationInSeconds = durationInFrames / fps;

  // Prepare parameters for SubtitlesOverlay preset
  const subtitlesParams = {
    position: 'top',
    fontFamily: params.fontFamily,
    fontSize: params.fontSize,
    fontWeight: params.fontWeight,
    color: params.color,
    backgroundColor: params.backgroundColor,
    padding: params.padding,
    textAlign: params.textAlign,
    animationStyle: params.animationStyle,
    negativeOffset: params.negativeOffset,
    strokeWidth: params.strokeWidth,
    strokeColor: params.strokeColor,
  };

  // Call SubtitlesOverlay preset
  const subtitlesResult = await presets.SubtitlesOverlay(subtitlesParams, props);

  // Build root container with upper third positioning
  const rootContainer = {
    id: 'upperThirdSubtitles-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    childrenData: [
      {
        id: 'upperThirdSubtitles-safeAreaContainer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full flex flex-col items-center',
            style: {
              paddingTop: params.topPadding,
              paddingLeft: params.horizontalPadding,
              paddingRight: params.horizontalPadding,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        childrenData: [
          {
            id: 'upperThirdSubtitles-wrapper',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: `w-full max-w-${params.maxWidth} flex flex-col items-center`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: durationInSeconds,
              },
            },
            childrenData: subtitlesResult.output.childrenData || [],
          },
        ],
      },
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'UpperThirdSubtitles',
  title: 'Upper Third Subtitles',
  description: 'Positions subtitles in the upper third of the screen for UI-heavy or meme content while preserving safe areas. Ideal for videos where the bottom portion contains important UI elements, watermarks, or content that should not be obscured.',
  type: 'predefined',
  presetType: 'children',
  tags: ['subtitles', 'upper-third', 'top', 'safe-area', 'ui-heavy', 'meme', 'vertical', 'overlay'],
  defaultInputParams: {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    strokeColor: '#000000',
    strokeWidth: 2,
    padding: 16,
    textAlign: 'center',
    maxWidth: '5xl',
    topPadding: '8%',
    horizontalPadding: '5%',
    animationStyle: 'word-fade',
    negativeOffset: 0,
  },
  dependencies: {
    presets: ['SubtitlesOverlay'],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const UpperThirdSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
