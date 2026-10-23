/**
 * Lottie Showcase Preset — DEPRECATED.
 * Saved showcases still render; the preset is hidden from add menus.
 *
 * This preset creates a showcase of Lottie animations with various layout patterns and entry animations.
 * It displays multiple Lottie JSON animations in grid, horizontal, vertical, or circular layouts.
 *
 * Features:
 * - **Multiple Layouts**: Grid, horizontal, vertical, or circular arrangements
 * - **Entry Animations**: Fade-scale, slide-up, bounce, or rotate-in effects
 * - **Staggered Timing**: Configurable delay between item animations
 * - **Label Support**: Optional text labels below each animation
 * - **Custom Sizing**: Configurable icon sizes and playback rates
 * - **Background Styling**: Custom background colors
 *
 * Use cases:
 * - Creating icon showcases with animations
 * - Building feature highlight presentations
 * - Creating animated UI element demonstrations
 * - Adding engaging visual showcases
 */

import {
  InputCompositionProps,
  GenericEffectData,
  LottieAtomDataProps,
  TextAtomData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const lottieItemSchema = z.object({
  src: z.string().describe('Lottie JSON source URL or path'),
  label: z.string().optional().describe('Text label below icon'),
  duration: z.number().optional().describe('Duration in seconds (default: 3)'),
  playbackRate: z.number().optional().describe('Animation speed (default: 1)'),
  size: z.number().optional().describe('Icon size in pixels (default: 200)'),
});

const presetParams = z.object({
  items: z
    .array(lottieItemSchema)
    .describe('Array of Lottie animations to showcase'),
  layout: z
    .enum(['grid', 'horizontal', 'vertical', 'circular'])
    .optional()
    .describe('Layout pattern (default: grid)'),
  staggerDelay: z
    .number()
    .optional()
    .describe('Delay between items in seconds (default: 0.3)'),
  showLabels: z
    .boolean()
    .optional()
    .describe('Show text labels (default: true)'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Background color (default: transparent)'),
  animationStyle: z
    .enum(['fade-scale', 'slide-up', 'bounce', 'rotate-in'])
    .optional()
    .describe('Entry animation style (default: fade-scale)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  const {
    items,
    layout = 'grid',
    staggerDelay = 0.3,
    showLabels = true,
    backgroundColor = 'transparent',
    animationStyle = 'fade-scale',
  } = params;

  const childrenData: any[] = [];

  items.forEach((item, index) => {
    const startTime = index * staggerDelay;
    const duration = item.duration || 3;
    const size = item.size || 200;

    // Calculate position based on layout - using percentage-based positioning
    let positionStyle: any = {};
    if (layout === 'grid') {
      const cols = Math.ceil(Math.sqrt(items.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      const rows = Math.ceil(items.length / cols);

      // Use percentage-based positioning
      const colPercent = (100 / cols) * col + 100 / cols / 2;
      const rowPercent = (100 / rows) * row + 100 / rows / 2;

      positionStyle = {
        left: `${colPercent}%`,
        top: `${rowPercent}%`,
        transform: 'translate(-50%, -50%)',
      };
    } else if (layout === 'horizontal') {
      const spacingPercent = 100 / (items.length + 1);
      positionStyle = {
        left: `${spacingPercent * (index + 1)}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    } else if (layout === 'vertical') {
      const spacingPercent = 100 / (items.length + 1);
      positionStyle = {
        left: '50%',
        top: `${spacingPercent * (index + 1)}%`,
        transform: 'translate(-50%, -50%)',
      };
    } else if (layout === 'circular') {
      const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2;
      const radiusPercent = 30; // 30% of container
      const centerX = 50 + radiusPercent * Math.cos(angle);
      const centerY = 50 + radiusPercent * Math.sin(angle);

      positionStyle = {
        left: `${centerX}%`,
        top: `${centerY}%`,
        transform: 'translate(-50%, -50%)',
      };
    }

    // Create entry animation effects based on style
    const effects: any[] = [];

    if (animationStyle === 'fade-scale') {
      effects.push({
        id: `fade-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.6,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    } else if (animationStyle === 'slide-up') {
      effects.push({
        id: `slide-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          ranges: [
            { key: 'translateY', val: 100, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    } else if (animationStyle === 'bounce') {
      effects.push({
        id: `bounce-${index}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: 1,
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    } else if (animationStyle === 'rotate-in') {
      effects.push({
        id: `rotate-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          ranges: [
            { key: 'rotate', val: -180, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    // Add Lottie atom
    childrenData.push({
      type: 'atom',
      id: `lottie-${index}`,
      componentId: 'LottieAtom',
      context: {
        timing: { start: startTime, duration },
      },
      effects,
      data: {
        src: item.src,
        playbackRate: item.playbackRate || 1,
        style: {
          position: 'absolute',
          ...positionStyle,
          width: size,
          height: size,
        },
      } as LottieAtomDataProps,
    });

    // Add label if enabled
    if (showLabels && item.label) {
      // Calculate label position relative to Lottie position
      const labelStyle: any = {
        position: 'absolute',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 600,
        color: '#ffffff',
        whiteSpace: 'nowrap',
        width: '100%',
      };

      // Position label below the Lottie based on layout
      if (layout === 'grid') {
        const cols = Math.ceil(Math.sqrt(items.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        const rows = Math.ceil(items.length / cols);

        const colPercent = (100 / cols) * col + 100 / cols / 2;
        const rowPercent = (100 / rows) * row + 100 / rows / 2;

        labelStyle.left = `${colPercent}%`;
        labelStyle.top = `calc(${rowPercent}% + ${size / 2 + 10}px)`;
        labelStyle.transform = 'translateX(-50%)';
      } else {
        // For other layouts, position slightly below using the same positioning
        labelStyle.left = positionStyle.left;
        labelStyle.top = `calc(${positionStyle.top} + ${size / 2 + 10}px)`;
        labelStyle.transform = 'translateX(-50%)';
      }

      childrenData.push({
        type: 'atom',
        id: `label-${index}`,
        componentId: 'TextAtom',
        context: {
          timing: { start: startTime + 0.3, duration: duration - 0.3 },
        },
        effects: [
          {
            id: `label-fade-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.4,
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
        data: {
          text: item.label,
          style: labelStyle,
          font: { family: 'Inter' },
        } as TextAtomData,
      });
    }
  });

  return {
    output: {
      childrenData: [
        {
          id: 'lottie-showcase-container',
          componentId: 'BaseLayout',
          type: 'layout',
          data: {
            style: {
              backgroundColor,
              width: '100%',
              height: '100%',
            },
          },
          childrenData,
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
      attachedContainers: [
        {
          className: 'absolute inset-0',
        },
      ],
    },
  };
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const lottieShowcasePreset = {
  metadata: {
    id: 'lottie-showcase',
    title: '✨ Lottie Icon Showcase (deprecated)',
    description:
      'Deprecated. Showcase multiple Lottie animations with dynamic layouts and entrance effects. Perfect for feature highlights and product showcases.',
    deprecated: true,
    type: 'predefined' as const,
    presetType: 'children' as const,
    tags: ['lottie', 'animation', 'showcase', 'icons', 'features'],
    defaultInputParams: {
      items: [
        {
          src: 'https://assets9.lottiefiles.com/packages/lf20_t9gkkhz4.json',
          label: '🚀 Fast',
          duration: 4,
          playbackRate: 1,
          size: 180,
        },
        {
          src: 'https://assets2.lottiefiles.com/packages/lf20_kyu7xb1v.json',
          label: '🔒 Secure',
          duration: 4,
          playbackRate: 1,
          size: 180,
        },
        {
          src: 'https://assets3.lottiefiles.com/packages/lf20_fcfjwiyb.json',
          label: '💡 Smart',
          duration: 4,
          playbackRate: 1,
          size: 180,
        },
        {
          src: 'https://assets10.lottiefiles.com/packages/lf20_myejiggj.json',
          label: '⚡ Powerful',
          duration: 4,
          playbackRate: 1,
          size: 180,
        },
      ],
      layout: 'grid',
      staggerDelay: 0.3,
      showLabels: true,
      backgroundColor: 'transparent',
      animationStyle: 'fade-scale',
    },
  } as PresetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: presetParams,
};
