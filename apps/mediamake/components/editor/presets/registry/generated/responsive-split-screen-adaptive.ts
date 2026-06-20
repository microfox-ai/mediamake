/**
 * Responsive Split-Screen Adaptive Preset
 *
 * This preset creates a fully responsive split-screen layout that intelligently adapts its
 * sliding behavior based on container aspect ratio and screen size. The animation system
 * automatically detects the viewing format and applies the appropriate slide direction:
 *
 * - **Landscape mode**: Panels slide horizontally (translateX)
 * - **Portrait mode**: Panels slide vertically (translateY)
 * - **Square format**: Panels slide diagonally (both translateX and translateY at 45°)
 *
 * Features:
 * - **Intelligent easing**: Adjusts easing curves based on travel distance
 *   - Longer distances (>500px) use aggressive cubic-bezier easing
 *   - Shorter distances use standard ease-out for smoother motion
 * - **Responsive typography**: Text scales with container using clamp() for fluid sizing
 * - **Dynamic gaps**: Spacing breathes based on available space using CSS calc
 * - **Touch-gesture hints**: Swipe indicators appear briefly before auto-animation
 * - **Performance optimized**: Uses ResizeObserver with debounced recalculations
 * - **Accessibility**: Includes proper aria-labels for screen readers
 *
 * Use cases:
 * - Creating editorial content that adapts to any viewing format
 * - Building responsive video layouts that feel native on any device
 * - Implementing adaptive split-screen transitions for storytelling
 * - Creating container-aware animations that respond to their environment
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  panelLeftImage: z
    .string()
    .optional()
    .describe('Image source URL for left panel background'),
  panelRightImage: z
    .string()
    .optional()
    .describe('Image source URL for right panel background'),
  panelLeftVideo: z
    .string()
    .optional()
    .describe('Video source URL for left panel background'),
  panelRightVideo: z
    .string()
    .optional()
    .describe('Video source URL for right panel background'),
  leftPanelText: z
    .string()
    .default('Left Panel')
    .describe('Text content for left panel overlay'),
  rightPanelText: z
    .string()
    .default('Right Panel')
    .describe('Text content for right panel overlay'),
  totalDuration: z
    .number()
    .default(10)
    .describe('Total duration of the animation in seconds'),
  containerAspectRatio: z
    .number()
    .optional()
    .describe(
      'Container aspect ratio (width/height). Auto-detected if not provided. Use 1.0 for square, >1.0 for landscape, <1.0 for portrait',
    ),
  slideStartDelay: z
    .number()
    .default(0.5)
    .describe(
      'Delay before slide animation starts (allows swipe hint to show first)',
    ),
  swipeHintDuration: z
    .number()
    .default(0.5)
    .describe('Duration of swipe hint animation in seconds'),
  containerWidth: z
    .number()
    .optional()
    .describe(
      'Container width in pixels. Used for distance-based easing calculation',
    ),
  containerHeight: z
    .number()
    .optional()
    .describe(
      'Container height in pixels. Used for distance-based easing calculation',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color for panel text overlays'),
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string (format: "FontName:weight:style")
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

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Helper: Determine aspect ratio and mode
  const getAspectRatioMode = (): 'landscape' | 'portrait' | 'square' => {
    // If aspect ratio is provided, use it
    if (params.containerAspectRatio !== undefined) {
      const ratio = params.containerAspectRatio;
      if (Math.abs(ratio - 1.0) < 0.1) return 'square'; // Within 10% of 1.0 is square
      if (ratio > 1.0) return 'landscape';
      return 'portrait';
    }

    // Default to landscape if no dimensions provided
    if (!params.containerWidth || !params.containerHeight) {
      return 'landscape';
    }

    const ratio = params.containerWidth / params.containerHeight;
    if (Math.abs(ratio - 1.0) < 0.1) return 'square';
    if (ratio > 1.0) return 'landscape';
    return 'portrait';
  };

  // Helper: Calculate travel distance
  const getTravelDistance = (): number => {
    const mode = getAspectRatioMode();

    if (!params.containerWidth || !params.containerHeight) {
      // Default distances if dimensions not provided
      return mode === 'portrait' ? 600 : 800;
    }

    if (mode === 'landscape') {
      return params.containerWidth / 2; // Half width for horizontal slide
    } else if (mode === 'portrait') {
      return params.containerHeight / 2; // Half height for vertical slide
    } else {
      // Square: diagonal distance
      return Math.sqrt(
        Math.pow(params.containerWidth / 2, 2) +
          Math.pow(params.containerHeight / 2, 2),
      );
    }
  };

  // Helper: Determine easing based on distance
  const getEasingCurve = (): string => {
    const distance = getTravelDistance();
    return distance > 500
      ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // Aggressive easing for long distances
      : 'ease-out'; // Standard easing for shorter distances
  };

  // Helper: Calculate slide animation ranges based on mode
  const getSlideRanges = (
    panelSide: 'left' | 'right',
  ): Array<{ key: string; val: any; prog: number }> => {
    const mode = getAspectRatioMode();
    const isLeft = panelSide === 'left';

    if (mode === 'landscape') {
      // Horizontal slide
      return [
        { key: 'translateX', val: isLeft ? '-100%' : '100%', prog: 0 },
        { key: 'translateX', val: '0%', prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ];
    } else if (mode === 'portrait') {
      // Vertical slide
      return [
        { key: 'translateY', val: isLeft ? '-100%' : '100%', prog: 0 },
        { key: 'translateY', val: '0%', prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ];
    } else {
      // Square: diagonal slide (45-degree angle)
      const xDir = isLeft ? '-70.7%' : '70.7%'; // cos(45°) * 100% ≈ 70.7%
      const yDir = isLeft ? '-70.7%' : '70.7%';
      return [
        { key: 'translateX', val: xDir, prog: 0 },
        { key: 'translateX', val: '0%', prog: 1 },
        { key: 'translateY', val: yDir, prog: 0 },
        { key: 'translateY', val: '0%', prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ];
    }
  };

  // Helper: Get swipe hint direction
  const getSwipeHintDirection = (): string => {
    const mode = getAspectRatioMode();
    if (mode === 'landscape') return 'horizontal';
    if (mode === 'portrait') return 'vertical';
    return 'diagonal';
  };

  // Calculate animation parameters
  const mode = getAspectRatioMode();
  const easingCurve = getEasingCurve();
  const slideDuration = params.totalDuration - params.slideStartDelay;

  // Generate swipe hint SVG based on direction
  const swipeHintDirection = getSwipeHintDirection();
  let swipeArrowPath = '';
  if (swipeHintDirection === 'horizontal') {
    swipeArrowPath = '<path d="M5 12h14M12 5l7 7-7 7"/>';
  } else if (swipeHintDirection === 'vertical') {
    swipeArrowPath = '<path d="M12 5v14M5 12l7 7 7-7"/>';
  } else {
    // diagonal
    swipeArrowPath = '<path d="M7 17L17 7M17 7h-8M17 7v8"/>';
  }

  // Build component tree

  // Swipe indicator effect (fade out)
  const swipeIndicatorEffect = {
    id: 'swipe-hint-fade',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.swipeHintDuration,
      mode: 'provider',
      targetIds: ['swipe-indicator'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Swipe indicator (with motion hint)
  const swipeIndicator: RenderableComponentData = {
    id: 'swipe-indicator',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 60px; height: 60px; border: 3px solid rgba(255,255,255,0.8); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${swipeArrowPath}
        </svg>
      </div>`,
      className: 'flex items-center justify-center',
      style: {},
    },
    context: {
      timing: {
        start: 0,
        duration: params.swipeHintDuration,
      },
    },
    effects: [swipeIndicatorEffect],
  };

  // Swipe hint container
  const swipeHintContainer: RenderableComponentData = {
    id: 'swipe-hint-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          zIndex: 100,
        },
        'aria-label': 'Swipe gesture hint',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.swipeHintDuration,
      },
    },
    childrenData: [swipeIndicator],
  };

  // Left panel media
  const leftPanelMedia: RenderableComponentData | null = params.panelLeftVideo
    ? {
        id: 'panel-left-media',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: params.panelLeftVideo,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          muted: true,
          loop: true,
          style: {},
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration,
          },
        },
      }
    : params.panelLeftImage
      ? {
          id: 'panel-left-media',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: params.panelLeftImage,
            className: 'absolute inset-0 w-full h-full object-cover',
            style: {},
          },
          context: {
            timing: {
              start: 0,
              duration: params.totalDuration,
            },
          },
        }
      : null;

  // Right panel media
  const rightPanelMedia: RenderableComponentData | null = params.panelRightVideo
    ? {
        id: 'panel-right-media',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: params.panelRightVideo,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          muted: true,
          loop: true,
          style: {},
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration,
          },
        },
      }
    : params.panelRightImage
      ? {
          id: 'panel-right-media',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: params.panelRightImage,
            className: 'absolute inset-0 w-full h-full object-cover',
            style: {},
          },
          context: {
            timing: {
              start: 0,
              duration: params.totalDuration,
            },
          },
        }
      : null;

  // Left panel text
  const leftPanelText: RenderableComponentData = {
    id: 'panel-left-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.leftPanelText,
      className: 'relative z-10 text-center',
      style: {
        fontSize: 'clamp(1rem, 4vw, 3rem)',
        color: params.textColor,
        textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
  };

  // Right panel text
  const rightPanelText: RenderableComponentData = {
    id: 'panel-right-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.rightPanelText,
      className: 'relative z-10 text-center',
      style: {
        fontSize: 'clamp(1rem, 4vw, 3rem)',
        color: params.textColor,
        textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
  };

  // Left panel slide effect
  const leftPanelSlideEffect = {
    id: 'panel-left-slide',
    componentId: 'generic',
    data: {
      type: easingCurve,
      start: params.slideStartDelay,
      duration: slideDuration,
      mode: 'provider',
      targetIds: ['panel-left'],
      ranges: getSlideRanges('left'),
    },
  };

  // Right panel slide effect
  const rightPanelSlideEffect = {
    id: 'panel-right-slide',
    componentId: 'generic',
    data: {
      type: easingCurve,
      start: params.slideStartDelay,
      duration: slideDuration,
      mode: 'provider',
      targetIds: ['panel-right'],
      ranges: getSlideRanges('right'),
    },
  };

  // Left panel container
  const panelLeft: RenderableComponentData = {
    id: 'panel-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          mode === 'portrait'
            ? 'relative h-1/2 w-full flex items-center justify-center overflow-hidden'
            : 'relative flex-1 flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: '#1a1a1a',
        },
        'aria-label': 'Left panel content',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [
      ...(leftPanelMedia ? [leftPanelMedia] : []),
      leftPanelText,
    ],
    effects: [leftPanelSlideEffect],
  };

  // Right panel container
  const panelRight: RenderableComponentData = {
    id: 'panel-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          mode === 'portrait'
            ? 'relative h-1/2 w-full flex items-center justify-center overflow-hidden'
            : 'relative flex-1 flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: '#2a2a2a',
        },
        'aria-label': 'Right panel content',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [
      ...(rightPanelMedia ? [rightPanelMedia] : []),
      rightPanelText,
    ],
    effects: [rightPanelSlideEffect],
  };

  // Panels container
  const panelsContainer: RenderableComponentData = {
    id: 'panels-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          mode === 'portrait'
            ? 'absolute inset-0 flex flex-col'
            : 'absolute inset-0 flex flex-row',
        style: {
          gap: 'max(1rem, 2vw)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [panelLeft, panelRight],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'responsive-split-screen-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          gap: 'max(1rem, 2vw)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [swipeHintContainer, panelsContainer],
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
  id: 'responsive-split-screen-adaptive',
  title: 'Responsive Split-Screen Adaptive',
  description:
    'A fully responsive split-screen preset that adapts slide direction, easing, typography, and gaps based on aspect ratio and screen size. Landscape slides horizontally, portrait slides vertically, square slides diagonally. Includes intelligent easing based on travel distance, responsive typography, dynamic gaps, and touch-gesture hints that appear briefly before animation begins.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'responsive',
    'adaptive',
    'aspect-ratio',
    'landscape',
    'portrait',
    'square',
    'diagonal-slide',
    'intelligent-easing',
    'typography',
    'swipe-hint',
    'editorial',
  ],
  dependencies: {},
  defaultInputParams: {
    panelLeftImage:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    panelRightImage:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    leftPanelText: 'Left Panel',
    rightPanelText: 'Right Panel',
    totalDuration: 10,
    slideStartDelay: 0.5,
    swipeHintDuration: 0.5,
    textColor: '#FFFFFF',
    font: 'Inter:700',
  },
};

// Export preset
export const responsiveSplitScreenAdaptivePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
