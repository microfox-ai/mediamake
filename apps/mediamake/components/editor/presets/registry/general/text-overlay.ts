/**
 * Text Overlay Preset
 *
 * This preset creates a customizable text overlay with advanced positioning, styling, and animation
 * capabilities. It provides fine-grained control over text appearance and behavior in video compositions.
 *
 * Features:
 * - **Flexible Positioning**: Absolute positioning with top/right/bottom/left values or alignment presets
 * - **Rich Typography**: Custom fonts with weight and style support, letter spacing, text transformations
 * - **Advanced Styling**: Colors, shadows, borders, backgrounds, filters, and backdrop effects
 * - **Smooth Animations**: Multiple transition types including fade, slide, scale, shake, and blur effects
 * - **Timing Control**: Custom duration, start offsets, and automatic duration fitting
 *
 * Use cases:
 * - Adding titles and captions to videos
 * - Creating animated text overlays with transitions
 * - Building dynamic typography effects
 * - Displaying information cards or callouts
 * - Creating text-based visual effects
 */

import {
  GenericEffectData,
  InputCompositionProps,
  TextAtomData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

interface ShakeEffectData extends GenericEffectData {
  amplitude?: number;
  frequency?: number;
  decay?: boolean;
  axis?: 'x' | 'y' | 'both';
}

const presetParams = z.object({
  // Text content
  text: z.string().describe('Text content to display'),

  // Font configuration
  fontFamily: z
    .string()
    .optional()
    .describe(
      'Font family with weight and style (e.g., "Roboto:600:italic", "Inter")',
    ),
  fontSize: z.number().optional().describe('Font size in pixels'),
  // Text styling
  letterSpacing: z.number().optional().describe('Letter spacing in pixels'),

  // Positioning
  position: z.object({
    top: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Top position (px or %)'),
    right: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Right position (px or %)'),
    bottom: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Bottom position (px or %)'),
    left: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Left position (px or %)'),
    alignment: z
      .enum([
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
        'center-left',
        'center-center',
        'center-right',
      ])
      .optional()
      .describe('Alignment'),
  }),
  style: z.object({
    opacity: z.number().min(0).max(1).optional().describe('Opacity (0-1)'),
    color: z
      .string()
      .optional()
      .describe('Text color (hex, rgb, or named color)'),
    textDecoration: z
      .string()
      .optional()
      .describe('Text decoration (underline, line-through, etc.)'),
    textTransform: z
      .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
      .optional()
      .describe('Text transformation'),
    padding: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Padding (px)'),
    otherProps: z.object({}).loose().optional(),
    boxShadow: z
      .string()
      .optional()
      .describe('Box shadow (e.g., "0 2px 10px rgba(0,0,0,0.3)")'),
    textShadow: z
      .string()
      .optional()
      .describe('Text shadow (e.g., "0 2px 4px rgba(0,0,0,0.5)")'),
    border: z
      .string()
      .optional()
      .describe('Border style (e.g., "1px solid #000")'),
    borderRadius: z.string().optional().describe('Border radius in pixels'),
    backgroundColor: z.string().optional().describe('Background color'),
    textColor: z.string().optional().describe('Text color'),
    filter: z.string().optional().describe('Filter (e.g., "blur(10px)")'),
    backdropFilter: z
      .string()
      .optional()
      .describe('Backdrop filter (e.g., "blur(10px)")'),
  }),
  // Border and shadow

  // Timing and duration
  transitions: z.object({
    duration: z
      .number()
      .optional()
      .describe('Duration of the text overlay in seconds'),
    startOffset: z.number().optional().describe('Start offset in seconds'),
    range: z
      .string()
      .nullable()
      .optional()
      .describe(
        'Time range in format "MM:SS-MM:SS" (e.g., "00:00-00:09"). Overrides startOffset and duration if provided.',
      ),
    // Animation effects
    fadeInTransition: z
      .enum([
        'none',
        'opacity',
        'slide-in-right',
        'slide-in-left',
        'slide-in-top',
        'slide-in-bottom',
        'scale-in',
        'scale-out',
        'shake-in',
        'blur-in',
      ])
      .optional(),
    fadeInDuration: z.number().optional(),
    fadeOutTransition: z
      .enum([
        'none',
        'opacity',
        'slide-out-right',
        'slide-out-left',
        'slide-out-top',
        'slide-out-bottom',
        'scale-out',
        'shake-out',
        'blur-out',
      ])
      .optional(),
    fadeOutDuration: z.number().optional(),
  }),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  const {
    text,
    fontFamily,
    fontSize = 24,
    letterSpacing,
    position,
    style,
    transitions,
  } = params;

  const generateId = () => {
    return `${Math.random().toString(36).substring(2, 15)}`;
  };

  // Parse range string (format: "MM:SS-MM:SS") to startOffset and duration
  const parseRange = (
    range: string | null | undefined,
  ): { startOffset?: number; duration?: number } | null => {
    if (!range || range.trim() === '') {
      return null;
    }

    const parts = range.split('-');
    if (parts.length !== 2) {
      return null;
    }

    const parseTime = (timeStr: string): number | null => {
      const timeParts = timeStr.trim().split(':');
      if (timeParts.length !== 2) {
        return null;
      }
      const minutes = parseInt(timeParts[0], 10);
      const seconds = parseInt(timeParts[1], 10);
      if (isNaN(minutes) || isNaN(seconds)) {
        return null;
      }
      return minutes * 60 + seconds;
    };

    const startTime = parseTime(parts[0]);
    const endTime = parseTime(parts[1]);

    if (startTime === null || endTime === null || endTime <= startTime) {
      return null;
    }

    return {
      startOffset: startTime,
      duration: endTime - startTime,
    };
  };
  const textAtomId = `text-atom-${generateId()}`;
  const textContainerId = `text-container-${generateId()}`;
  // Calculate responsive font size if enabled
  const getResponsiveFontSize = () => fontSize;

  // Map alignment keywords to flexbox alignments
  const mapAlignmentToFlex = (
    alignment?:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
      | 'center-left'
      | 'center-center'
      | 'center-right',
  ) => {
    switch (alignment) {
      case 'top-left':
        return {
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        } as const;
      case 'top-center':
        return { alignItems: 'flex-start', justifyContent: 'center' } as const;
      case 'top-right':
        return {
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
        } as const;
      case 'center-left':
        return { alignItems: 'center', justifyContent: 'flex-start' } as const;
      case 'center-center':
        return { alignItems: 'center', justifyContent: 'center' } as const;
      case 'center-right':
        return { alignItems: 'center', justifyContent: 'flex-end' } as const;
      case 'bottom-left':
        return {
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
        } as const;
      case 'bottom-center':
        return { alignItems: 'flex-end', justifyContent: 'center' } as const;
      case 'bottom-right':
        return { alignItems: 'flex-end', justifyContent: 'flex-end' } as const;
      default:
        return { alignItems: 'center', justifyContent: 'center' } as const;
    }
  };

  // Parse font family and extract weight/style if provided
  let parsedFontFamily = fontFamily || 'Inter';
  let fontStyle: any = {};

  if (fontFamily && fontFamily.includes(':')) {
    const fontParts = fontFamily.split(':');
    parsedFontFamily = fontParts[0];

    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1]);
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
    }
  }

  // Build style object
  const textStyle: React.CSSProperties = {
    fontSize: getResponsiveFontSize(),
    color: style?.textColor ?? '#FFFFFF',
    textDecoration: style?.textDecoration,
    textTransform: style?.textTransform,
    letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
    boxShadow: style?.boxShadow,
    textShadow: style?.textShadow,
    backdropFilter: style?.backdropFilter,
    backgroundColor: style?.backgroundColor,
    opacity: style?.opacity,
    padding:
      typeof style?.padding === 'number'
        ? `${style?.padding}px`
        : style?.padding,
    ...fontStyle,
    border: style?.border,
    borderRadius:
      typeof style?.borderRadius === 'number'
        ? `${style?.borderRadius}px`
        : style?.borderRadius,
  };

  // Build transition effects similar to video-overlay-effects
  const createTransitionEffects = (
    isFadeIn: boolean = true,
  ): (GenericEffectData | ShakeEffectData)[] => {
    const effects: (GenericEffectData | ShakeEffectData)[] = [];
    const transition = isFadeIn
      ? transitions?.fadeInTransition
      : transitions?.fadeOutTransition;
    const effectDuration = isFadeIn
      ? transitions?.fadeInDuration
      : transitions?.fadeOutDuration;

    if (!transition || transition === 'none') return effects;

    const transitionDuration = effectDuration || (isFadeIn ? 1.0 : 1.0);
    const parsedRange = parseRange(transitions?.range);
    const totalDuration = parsedRange?.duration ?? transitions?.duration ?? 20; // Default duration if not specified

    // Effects start times are relative ot the starts of the targeting atom.
    const startTime = isFadeIn
      ? 0
      : Math.max(0, totalDuration - transitionDuration);

    // Only add opacity effect for pure opacity transitions or as base for other effects
    if (
      transition === 'opacity' ||
      transition.includes('slide') ||
      transition.includes('scale') ||
      transition.includes('blur')
    ) {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in-out',
        ranges: [
          {
            key: 'opacity',
            val: isFadeIn ? 0 : (style?.opacity ?? 1),
            prog: 0,
          },
          {
            key: 'opacity',
            val: isFadeIn ? (style?.opacity ?? 1) : 0,
            prog: 1,
          },
        ],
      });
    }

    if (transition.includes('slide-in') || transition.includes('slide-out')) {
      const direction = transition.split('-')[2];
      const isSlideIn = transition.includes('slide-in');

      if (direction === 'right' || direction === 'left') {
        effects.push({
          start: startTime,
          duration: transitionDuration * 0.8,
          mode: 'provider',
          targetIds: [textAtomId],
          type: isSlideIn ? 'ease-out' : 'ease-in',
          ranges: [
            {
              key: 'translateX',
              val: isSlideIn
                ? direction === 'right'
                  ? '100px'
                  : '-100px'
                : direction === 'right'
                  ? '-100px'
                  : '100px',
              prog: 0,
            },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        });
      }

      if (direction === 'top' || direction === 'bottom') {
        effects.push({
          start: startTime,
          duration: transitionDuration * 0.8,
          mode: 'provider',
          targetIds: [textAtomId],
          type: isSlideIn ? 'ease-out' : 'ease-in',
          ranges: [
            {
              key: 'translateY',
              val: isSlideIn
                ? direction === 'top'
                  ? '-100px'
                  : '100px'
                : direction === 'top'
                  ? '100px'
                  : '-100px',
              prog: 0,
            },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        });
      }
    }

    if (transition === 'scale-in') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-out',
        ranges: [
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      });
    }

    if (transition === 'scale-out') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in',
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.1, prog: 1 },
        ],
      });
    }

    if (transition === 'blur-in') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-out',
        ranges: [
          { key: 'blur', val: '10px', prog: 0 },
          { key: 'blur', val: '0px', prog: 1 },
        ],
      });
    }

    if (transition === 'blur-out') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in',
        ranges: [
          { key: 'blur', val: '0px', prog: 0 },
          { key: 'blur', val: '10px', prog: 1 },
        ],
      });
    }

    // Shake effects - use shake component instead of generic
    if (transition === 'shake-in') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'linear',
        amplitude: 3,
        frequency: 1,
        decay: true,
        axis: 'both',
      } as ShakeEffectData);
      effects.push({
        start: startTime,
        duration: 0.5,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in-out',
        ranges: [
          {
            key: 'opacity',
            val: isFadeIn ? 0 : (style?.opacity ?? 1),
            prog: 0,
          },
          {
            key: 'opacity',
            val: isFadeIn ? (style?.opacity ?? 1) : 0,
            prog: 1,
          },
        ],
      });
    }

    if (transition === 'shake-out') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'linear',
        amplitude: 10,
        frequency: 1,
        decay: false,
        axis: 'both',
      } as ShakeEffectData);
    }

    return effects;
  };

  const transitionEffects = [
    ...createTransitionEffects(true),
    ...createTransitionEffects(false),
  ];
  const effects = transitionEffects.map((effect, index) => {
    const isShakeEffect = 'amplitude' in effect;
    return {
      id: `text-overlay-effect-${generateId()}`,
      componentId: isShakeEffect ? 'shake' : 'generic',
      data: effect,
    };
  });

  // Text atom data
  const textAtomData: TextAtomData = {
    text,
    style: textStyle,
    font: {
      family: parsedFontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight?.toString()] }
        : {}),
    },
  };

  // Minimal container; styling handled by textStyle positioning
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top:
      typeof position?.top === 'number'
        ? `${position?.top}px`
        : (position?.top ?? '0px'),
    right:
      typeof position?.right === 'number'
        ? `${position?.right}px`
        : (position?.right ?? '0px'),
    bottom:
      typeof position?.bottom === 'number'
        ? `${position?.bottom}px`
        : (position?.bottom ?? '0px'),
    left:
      typeof position?.left === 'number'
        ? `${position?.left}px`
        : (position?.left ?? '0px'),
    filter: style?.filter,
    display: 'flex',
    flexDirection: 'row',
    ...mapAlignmentToFlex(position?.alignment),
    ...(style?.otherProps ?? {}),
  };

  return {
    output: {
      childrenData: [
        {
          id: textContainerId,
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: containerStyle,
            },
          },
          context: {
            timing: (() => {
              const parsedRange = parseRange(transitions?.range);
              const startOffset =
                parsedRange?.startOffset ?? transitions?.startOffset;
              const duration = parsedRange?.duration ?? transitions?.duration;

              return {
                ...(startOffset !== undefined ? { start: startOffset } : {}),
                ...(duration && duration > 0 ? { duration } : {}),
                ...(!duration ? { fitDurationTo: 'BaseScene' } : {}),
              };
            })(),
          },
          childrenData: [
            {
              id: textAtomId,
              componentId: 'TextAtom',
              type: 'atom' as const,
              effects,
              data: textAtomData,
            },
          ],
        },
      ],
    },
    options: {
      attachedToId: `BaseScene`,
      attachedContainers: [
        {
          className: 'absolute inset-0',
          style: containerStyle,
        },
      ],
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'text-overlay',
  title: 'Text Overlay',
  description:
    'A customizable text overlay with positioning, styling, and animation controls',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'overlay', 'typography', 'positioning', 'animation'],
  defaultInputParams: {
    text: 'Your Text Here',
    fontSize: 32,
    fontFamily: 'Inter:600',
    position: {
      alignment: 'center-center',
    },
    style: {
      textColor: '#FFFFFF',
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      opacity: 1,
    },
    transitions: {
      duration: 20,
      startOffset: 0,
      fadeInTransition: 'opacity',
      fadeInDuration: 1,
      fadeOutTransition: 'none',
      fadeOutDuration: 1,
    },
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const textOverlayPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { textOverlayPreset };
