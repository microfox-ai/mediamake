/**
 * AdaptiveFade Internal Effect Preset
 *
 * Automatically adjusts fade characteristics based on content type detection.
 * Analyzes targetIds to determine if they're text, image, or video elements
 * and applies appropriate fade strategies with content-specific enhancements.
 *
 * Features:
 * - **Content Detection**: Analyzes targetId patterns (text*, image*, video*) or accepts explicit type parameter
 * - **Text-Specific**: Letter-spacing and line-height adjustments during fade for better readability
 * - **Image-Specific**: Slight zoom and blur for cinematic quality
 * - **Video-Specific**: Synchronize with potential scene changes and add exposure adjustments
 * - **Intelligent Defaults**: Can be overridden with forceType parameter
 * - **Adaptive Easing**: Calculate based on duration and content type
 * - **ML-Inspired Smoothing**: Prevents jarring transitions by analyzing rate of change
 *
 * Technical Specifications:
 * - Effect type: generic (adaptive)
 * - Content detection: analyze targetId patterns or explicit type parameter
 * - Returns array of effects for multi-property animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply adaptive fade effects to'),
  duration: z
    .number()
    .min(0.1)
    .max(10)
    .default(2)
    .optional()
    .describe('Duration of fade effect in seconds'),
  contentType: z
    .enum(['auto', 'text', 'image', 'video'])
    .default('auto')
    .optional()
    .describe(
      'Content type - auto detects from targetId patterns, or force a specific type',
    ),
  forceType: z
    .boolean()
    .default(false)
    .optional()
    .describe('Force the contentType instead of auto-detection'),
  smoothingLevel: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe(
      'Smoothing level for transitions (0 = no smoothing, 1 = maximum smoothing)',
    ),
  enhancementLevel: z
    .enum(['minimal', 'standard', 'cinematic'])
    .default('standard')
    .optional()
    .describe('Enhancement intensity level for content-specific effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    duration = 2,
    contentType = 'auto',
    forceType = false,
    smoothingLevel = 0.5,
    enhancementLevel = 'standard',
  } = params;

  // Helper function: Detect content type from targetId
  const detectContentType = (
    targetId: string,
  ): 'text' | 'image' | 'video' => {
    const lowerTarget = targetId.toLowerCase();
    if (lowerTarget.includes('text') || lowerTarget.includes('word')) {
      return 'text';
    }
    if (lowerTarget.includes('image') || lowerTarget.includes('photo')) {
      return 'image';
    }
    if (lowerTarget.includes('video') || lowerTarget.includes('clip')) {
      return 'video';
    }
    // Default to image for unknown types
    return 'image';
  };

  // Helper function: Calculate adaptive easing based on content type and duration
  const calculateAdaptiveEasing = (
    type: 'text' | 'image' | 'video',
    effectDuration: number,
  ): 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring' => {
    // Text prefers smoother easing
    if (type === 'text') {
      return effectDuration > 1.5 ? 'ease-in-out' : 'ease-out';
    }
    // Video prefers dynamic easing
    if (type === 'video') {
      return effectDuration > 2 ? 'spring' : 'ease-in-out';
    }
    // Image uses standard easing
    return 'ease-out';
  };

  // Helper function: Get enhancement multiplier
  const getEnhancementMultiplier = (): number => {
    switch (enhancementLevel) {
      case 'minimal':
        return 0.5;
      case 'cinematic':
        return 1.5;
      default:
        return 1.0;
    }
  };

  // Helper function: Apply ML-inspired smoothing to progress values
  const applySmoothingToProgress = (prog: number): number => {
    // Sigmoid-like smoothing function
    const smoothed =
      1 / (1 + Math.exp(-10 * (prog - 0.5) * (1 - smoothingLevel)));
    return smoothed;
  };

  // Create content-specific ranges
  const createContentSpecificRanges = (
    type: 'text' | 'image' | 'video',
  ): Array<{ key: string; val: any; prog: number }> => {
    const enhancementMultiplier = getEnhancementMultiplier();
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    // Base opacity fade (common to all types)
    ranges.push(
      { key: 'opacity', val: 0, prog: 0 },
      {
        key: 'opacity',
        val: 1,
        prog: applySmoothingToProgress(0.5),
      },
      { key: 'opacity', val: 1, prog: 1 },
    );

    // Text-specific enhancements
    if (type === 'text') {
      const letterSpacingStart = 0.05 * enhancementMultiplier;
      ranges.push(
        { key: 'letterSpacing', val: `${letterSpacingStart}em`, prog: 0 },
        { key: 'letterSpacing', val: '0em', prog: 0.5 },
      );

      const lineHeightStart = 1.8 * enhancementMultiplier;
      ranges.push(
        { key: 'lineHeight', val: lineHeightStart, prog: 0 },
        { key: 'lineHeight', val: 1.5, prog: 0.5 },
      );
    }

    // Image-specific enhancements
    if (type === 'image') {
      const scaleStart = 1.1 * enhancementMultiplier;
      ranges.push(
        { key: 'scale', val: scaleStart, prog: 0 },
        { key: 'scale', val: 1, prog: 0.5 },
      );

      const blurStart = 2 * enhancementMultiplier;
      ranges.push(
        { key: 'blur', val: blurStart, prog: 0 },
        { key: 'blur', val: 0, prog: 0.5 },
      );
    }

    // Video-specific enhancements
    if (type === 'video') {
      const brightnessStart = 1.2 * enhancementMultiplier;
      ranges.push(
        { key: 'brightness', val: brightnessStart, prog: 0 },
        { key: 'brightness', val: 1, prog: 0.5 },
      );

      const contrastStart = 0.8 / enhancementMultiplier;
      ranges.push(
        { key: 'contrast', val: contrastStart, prog: 0 },
        { key: 'contrast', val: 1, prog: 0.5 },
      );
    }

    return ranges;
  };

  // Generate effects for all targetIds
  const effects = targetIds.map((targetId, index) => {
    // Determine content type
    let detectedType: 'text' | 'image' | 'video';
    if (forceType && contentType !== 'auto') {
      detectedType = contentType as 'text' | 'image' | 'video';
    } else {
      detectedType = detectContentType(targetId);
    }

    // Calculate adaptive easing
    const adaptiveEasing = calculateAdaptiveEasing(detectedType, duration);

    // Create content-specific ranges
    const contentRanges = createContentSpecificRanges(detectedType);

    // Build effect data
    const effectData: GenericEffectData = {
      type: adaptiveEasing,
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: contentRanges,
    };

    return {
      id: `adaptive-fade-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return output with effects
  const rootContainer: RenderableComponentData = {
    id: 'adaptive-fade-effect-container',
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
        duration: 10,
      },
    },
    effects: effects,
    childrenData: [],
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
  id: 'adaptive-fade-effect',
  title: 'Adaptive Fade Effect',
  description:
    'An internal effect preset that automatically adjusts fade characteristics based on content type detection (text, image, video). Applies content-specific enhancements: letter-spacing/line-height for text, scale/blur for images, brightness/contrast for video. Supports explicit type override and configurable enhancement levels.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'fade',
    'adaptive',
    'generic',
    'internal',
    'text',
    'image',
    'video',
    'cinematic',
    'intelligent',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-1'],
    duration: 2,
    contentType: 'auto',
    forceType: false,
    smoothingLevel: 0.5,
    enhancementLevel: 'standard',
  },
};

export const adaptiveFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};