/**
 * Comic Book Split-Screen Multi-Panel Preset
 *
 * This preset creates a dynamic comic book-style split-screen layout with multiple panels
 * that appear with varied transitions and effects. Inspired by comic book layouts and
 * action movie editing, panels slam into place with different shapes and timing.
 *
 * Features:
 * - **Multiple Panel Shapes**: Rectangles, diagonal cuts, circular viewports
 * - **Varied Transitions**: Slide-in, iris wipe, shatter effects per panel
 * - **Dynamic Borders**: Glowing and pulsing borders on appearance
 * - **Action Effects**: Speed lines and impact effects
 * - **Boundary Breaking**: Elements extend beyond frames for dramatic effect
 * - **Staggered Timing**: Panels appear sequentially for dynamic storytelling
 *
 * Use cases:
 * - Creating comic book-style video presentations
 * - Building dynamic storyboard animations
 * - Crafting action-packed multi-panel displays
 * - Producing engaging visual narratives with varied panel layouts
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  panels: z
    .array(
      z.object({
        image: z.object({
          src: z.string().describe('Image source URL'),
        }),
        shape: z
          .enum(['rectangle', 'diagonal', 'circular'])
          .default('rectangle')
          .describe('Shape of the panel'),
        position: z
          .enum([
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'center',
          ])
          .default('top-left')
          .describe('Position of the panel'),
        transition: z
          .enum(['slide', 'iris', 'shatter'])
          .default('slide')
          .describe('Transition style for panel appearance'),
        borderColor: z
          .string()
          .default('#FFD700')
          .describe('Border color (hex or CSS color)'),
        showSpeedLines: z
          .boolean()
          .default(false)
          .describe('Show speed lines effect'),
        breakBoundary: z
          .boolean()
          .default(false)
          .describe('Allow elements to extend beyond frame'),
        startDelay: z
          .number()
          .default(0)
          .describe('Delay before panel appears (seconds)'),
        duration: z.number().default(10).describe('Panel duration (seconds)'),
      }),
    )
    .min(1)
    .max(6)
    .describe('Array of panel configurations (1-6 panels)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the composition'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { panels, backgroundColor } = params;

  // Helper function to get position classes
  const getPositionClasses = (
    position: string,
  ): { className: string; style: Record<string, any> } => {
    const positionMap: Record<
      string,
      { className: string; style: Record<string, any> }
    > = {
      'top-left': {
        className: 'absolute top-0 left-0 w-1/2 h-1/2',
        style: {},
      },
      'top-right': {
        className: 'absolute top-0 right-0 w-1/2 h-1/2',
        style: {},
      },
      'bottom-left': {
        className: 'absolute bottom-0 left-0 w-1/2 h-1/2',
        style: {},
      },
      'bottom-right': {
        className: 'absolute bottom-0 right-0 w-1/2 h-1/2',
        style: {},
      },
      center: {
        className: 'absolute top-1/4 left-1/4 w-1/2 h-1/2',
        style: {},
      },
    };
    return (
      positionMap[position] || {
        className: 'absolute top-0 left-0 w-1/2 h-1/2',
        style: {},
      }
    );
  };

  // Helper function to get shape clip path
  const getShapeStyle = (shape: string): Record<string, any> => {
    switch (shape) {
      case 'circular':
        return {
          borderRadius: '50%',
          overflow: 'hidden',
        };
      case 'diagonal':
        return {
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
        };
      case 'rectangle':
      default:
        return {};
    }
  };

  // Helper function to create transition effect
  const createTransitionEffect = (
    panelId: string,
    transition: string,
    startDelay: number,
    borderColor: string,
  ) => {
    const effects: any[] = [];

    switch (transition) {
      case 'slide':
        // Slide in from left
        effects.push({
          id: `${panelId}-slide-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.6,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        });
        break;

      case 'iris':
        // Iris wipe (circle expand from center)
        effects.push({
          id: `${panelId}-iris-wipe`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.8,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
              { key: 'clipPath', val: 'circle(70.7% at 50% 50%)', prog: 1 },
            ],
          },
        });
        break;

      case 'shatter':
        // Shatter effect (scale + rotate)
        effects.push({
          id: `${panelId}-shatter-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.8,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'rotate', val: -15, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        });
        break;
    }

    // Add border glow effect
    const glowDelay = transition === 'iris' ? 0.7 : 0.5;
    const rgbaColor = borderColor.startsWith('#')
      ? hexToRgba(borderColor, 1)
      : borderColor;

    effects.push({
      id: `${panelId}-border-glow`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: glowDelay,
        duration: 0.4,
        mode: 'provider',
        targetIds: [panelId],
        ranges: [
          {
            key: 'boxShadow',
            val: `0 0 0px ${rgbaColor.replace('1)', '0)')}`,
            prog: 0,
          },
          {
            key: 'boxShadow',
            val: `0 0 30px ${rgbaColor}, inset 0 0 20px ${rgbaColor.replace('1)', '0.5)')}`,
            prog: 0.5,
          },
          {
            key: 'boxShadow',
            val: `0 0 15px ${rgbaColor.replace('1)', '0.8)')}`,
            prog: 1,
          },
        ],
      },
    });

    return effects;
  };

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Build panel components
  const panelComponents: RenderableComponentData[] = panels.map(
    (panel, index) => {
      const panelId = `panel-${index}`;
      const position = getPositionClasses(panel.position);
      const shapeStyle = getShapeStyle(panel.shape);
      const zIndex = panel.breakBoundary ? 11 : 10 - index;
      const overflow = panel.breakBoundary ? 'visible' : 'hidden';

      const transitionEffects = createTransitionEffect(
        panelId,
        panel.transition,
        panel.startDelay,
        panel.borderColor,
      );

      const childrenData: RenderableComponentData[] = [
        // Image
        {
          id: `${panelId}-image`,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: panel.image.src,
            className: 'absolute inset-0 w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: panel.duration,
            },
          },
        } as RenderableComponentData,
        // Border
        {
          id: `${panelId}-border`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style='position: absolute; inset: 0; border: 4px solid ${panel.borderColor}; pointer-events: none; ${panel.shape === 'circular' ? 'border-radius: 50%;' : ''} ${panel.shape === 'diagonal' ? `clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);` : ''}'></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: panel.duration,
            },
          },
        } as RenderableComponentData,
      ];

      // Speed lines
      if (panel.showSpeedLines) {
        childrenData.push({
          id: `${panelId}-speedline`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style='position: absolute; top: 50%; left: -50px; width: 200px; height: 4px; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%); transform: translateY(-50%); transform-origin: right center;'></div>`,
            className: 'absolute',
          },
          context: {
            timing: {
              start: 0.3,
              duration: 0.4,
            },
          },
          effects: [
            {
              id: `${panelId}-speedline-animation`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.4,
                mode: 'provider',
                targetIds: [`${panelId}-speedline`],
                ranges: [
                  { key: 'scaleX', val: 0, prog: 0 },
                  { key: 'scaleX', val: 1, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }

      // Boundary breakout effect
      if (panel.breakBoundary) {
        childrenData.push({
          id: `${panelId}-breakout`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style='position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; pointer-events: none;'></div>`,
            className: 'absolute',
          },
          context: {
            timing: {
              start: 0.5,
              duration: 0.5,
            },
          },
          effects: [
            {
              id: `${panelId}-breakout-effect`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.5,
                mode: 'provider',
                targetIds: [`${panelId}-breakout`],
                ranges: [
                  { key: 'scale', val: 0, prog: 0 },
                  { key: 'scale', val: 1.5, prog: 0.6 },
                  { key: 'scale', val: 1, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.8, prog: 0.6 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }

      return {
        id: panelId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: position.className,
            style: {
              ...position.style,
              ...shapeStyle,
              zIndex,
              overflow,
            },
          },
        },
        context: {
          timing: {
            start: panel.startDelay,
            duration: panel.duration,
          },
        },
        effects: transitionEffects,
        childrenData,
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'comic-split-screen-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(...panels.map((p) => p.startDelay + p.duration)),
      },
    },
    childrenData: panelComponents,
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
  id: 'comic-split-screen',
  title: 'Comic Book Split-Screen Preset',
  description:
    'Dynamic split-screen multi-panel preset inspired by comic book layouts and action movie editing. Images slam into divided screen sections with different shapes (rectangles, diagonal cuts, circular viewports). Each panel has unique timing and transition style (slide-in, iris wipe, shatter effects). Features dynamic glowing borders, speed lines, and boundary-breaking elements for dramatic comic-book-storyboard effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'comic',
    'split-screen',
    'multi-panel',
    'action',
    'transitions',
    'storyboard',
  ],
  defaultInputParams: {
    panels: [
      {
        image: { src: 'https://via.placeholder.com/800x600/FF6B6B/FFFFFF' },
        shape: 'rectangle',
        position: 'top-left',
        transition: 'slide',
        borderColor: '#FFD700',
        showSpeedLines: true,
        breakBoundary: false,
        startDelay: 0,
        duration: 10,
      },
      {
        image: { src: 'https://via.placeholder.com/800x600/4ECDC4/FFFFFF' },
        shape: 'circular',
        position: 'top-right',
        transition: 'iris',
        borderColor: '#FF0080',
        showSpeedLines: false,
        breakBoundary: false,
        startDelay: 0.3,
        duration: 9.7,
      },
      {
        image: { src: 'https://via.placeholder.com/800x600/95E1D3/FFFFFF' },
        shape: 'diagonal',
        position: 'bottom-left',
        transition: 'slide',
        borderColor: '#00FFFF',
        showSpeedLines: false,
        breakBoundary: false,
        startDelay: 0.6,
        duration: 9.4,
      },
      {
        image: { src: 'https://via.placeholder.com/800x600/F38181/FFFFFF' },
        shape: 'rectangle',
        position: 'bottom-right',
        transition: 'shatter',
        borderColor: '#FF8000',
        showSpeedLines: false,
        breakBoundary: true,
        startDelay: 0.9,
        duration: 9.1,
      },
    ],
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const comicSplitScreenPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
