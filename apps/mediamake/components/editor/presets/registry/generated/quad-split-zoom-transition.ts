/**
 * Quad-Split Screen Zoom Transition Preset
 *
 * This preset creates a 2x2 grid layout of four simultaneous video panels that transitions
 * into a single focused panel. Three panels fade out with blur while the selected panel
 * scales up smoothly to fill the entire screen, creating a cinematic "dive-in" effect.
 *
 * Features:
 * - **Quad Grid Layout**: 2x2 grid showing four videos simultaneously
 * - **Selective Focus**: One panel zooms to full screen while others fade out
 * - **Cinematic Transition**: Smooth scale, opacity, and blur animations
 * - **Customizable Timing**: Configurable quad-view duration and transition overlap
 * - **Flexible Selection**: Choose which quadrant (top-left, top-right, bottom-left, bottom-right) to focus
 *
 * Use cases:
 * - Multi-camera video transitions
 * - Interview or panel discussion focus shifts
 * - Product showcase from multiple angles
 * - Cinematic storytelling with perspective changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videos: z
    .object({
      topLeft: z.string().describe('Video URL for top-left panel'),
      topRight: z.string().describe('Video URL for top-right panel'),
      bottomLeft: z.string().describe('Video URL for bottom-left panel'),
      bottomRight: z.string().describe('Video URL for bottom-right panel'),
    })
    .describe('Video sources for each quadrant'),
  selectedPanel: z
    .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
    .describe('Which panel to focus and zoom into'),
  quadViewDuration: z
    .number()
    .min(1)
    .default(3)
    .describe('Duration in seconds to show all four panels before transition'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe(
      'Duration in seconds for the transition (overlap period where effects play)',
    ),
  singleViewDuration: z
    .number()
    .min(1)
    .default(5)
    .describe('Duration in seconds to show the selected panel after transition'),
  videoFit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How videos should fit within their containers'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videos,
    selectedPanel,
    quadViewDuration,
    transitionDuration,
    singleViewDuration,
    videoFit,
  } = params;

  // Calculate total composition duration
  const totalDuration = quadViewDuration + singleViewDuration;

  // Panel configuration with positioning and translation values
  const panelConfig = {
    'top-left': {
      className: 'absolute top-0 left-0 w-1/2 h-1/2',
      translateX: { from: 0, to: 0 },
      translateY: { from: 0, to: 0 },
      scale: { from: 0.5, to: 1 },
    },
    'top-right': {
      className: 'absolute top-0 right-0 w-1/2 h-1/2',
      translateX: { from: 0, to: 0 },
      translateY: { from: 0, to: 0 },
      scale: { from: 0.5, to: 1 },
    },
    'bottom-left': {
      className: 'absolute bottom-0 left-0 w-1/2 h-1/2',
      translateX: { from: 0, to: 0 },
      translateY: { from: 0, to: 0 },
      scale: { from: 0.5, to: 1 },
    },
    'bottom-right': {
      className: 'absolute bottom-0 right-0 w-1/2 h-1/2',
      translateX: { from: 0, to: 0 },
      translateY: { from: 0, to: 0 },
      scale: { from: 0.5, to: 1 },
    },
  };

  // Create video panels
  const createVideoPanel = (
    position: keyof typeof panelConfig,
    videoSrc: string,
    isSelected: boolean,
  ): RenderableComponentData => {
    const config = panelConfig[position];
    const wrapperId = `video-${position}-wrapper`;
    const videoId = `video-${position}`;

    // Non-selected panels: fade out and blur during transition
    const nonSelectedEffects = !isSelected
      ? [
          {
            id: `fade-out-${position}`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-in-out' as const,
              start: quadViewDuration,
              duration: transitionDuration,
              mode: 'provider' as const,
              targetIds: [wrapperId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: `blur-out-${position}`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-in-out' as const,
              start: quadViewDuration,
              duration: transitionDuration,
              mode: 'provider' as const,
              targetIds: [wrapperId],
              ranges: [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(8px)', prog: 1 },
              ],
            },
          },
        ]
      : [];

    // Selected panel: scale up and translate to center during transition
    const selectedEffects = isSelected
      ? [
          {
            id: `scale-up-${position}`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-in-out' as const,
              start: quadViewDuration,
              duration: transitionDuration,
              mode: 'provider' as const,
              targetIds: [wrapperId],
              ranges: [
                { key: 'scale', val: config.scale.from, prog: 0 },
                { key: 'scale', val: config.scale.to, prog: 1 },
              ],
            },
          },
          {
            id: `translate-${position}`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-in-out' as const,
              start: quadViewDuration,
              duration: transitionDuration,
              mode: 'provider' as const,
              targetIds: [wrapperId],
              ranges: [
                { key: 'translateX', val: config.translateX.from, prog: 0 },
                { key: 'translateX', val: config.translateX.to, prog: 1 },
                { key: 'translateY', val: config.translateY.from, prog: 0 },
                { key: 'translateY', val: config.translateY.to, prog: 1 },
              ],
            },
          },
        ]
      : [];

    return {
      id: wrapperId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: config.className,
          style: {
            zIndex: isSelected ? 10 : 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [...nonSelectedEffects, ...selectedEffects],
      childrenData: [
        {
          id: videoId,
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: videoSrc,
            fit: videoFit,
            containerClassName: 'w-full h-full',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Build all four panels
  const childrenData: RenderableComponentData[] = [
    createVideoPanel('top-left', videos.topLeft, selectedPanel === 'top-left'),
    createVideoPanel(
      'top-right',
      videos.topRight,
      selectedPanel === 'top-right',
    ),
    createVideoPanel(
      'bottom-left',
      videos.bottomLeft,
      selectedPanel === 'bottom-left',
    ),
    createVideoPanel(
      'bottom-right',
      videos.bottomRight,
      selectedPanel === 'bottom-right',
    ),
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quad-split-zoom-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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
  id: 'quad-split-zoom-transition',
  title: 'Quad-Split Screen Zoom Transition',
  description:
    'A 2x2 grid layout of four video panels that transitions into a single focused panel with cinematic zoom and fade effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'grid', 'multi-panel', 'zoom', 'video', 'cinematic'],
  defaultInputParams: {
    videos: {
      topLeft: 'https://example.com/video1.mp4',
      topRight: 'https://example.com/video2.mp4',
      bottomLeft: 'https://example.com/video3.mp4',
      bottomRight: 'https://example.com/video4.mp4',
    },
    selectedPanel: 'top-left',
    quadViewDuration: 3,
    transitionDuration: 1.5,
    singleViewDuration: 5,
    videoFit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quadSplitZoomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
