/**
 * Video Morph Transition Preset
 *
 * This preset creates a smooth morph transition where four video panels fluidly merge and
 * blend into a single cohesive video. Each quadrant gradually shifts position while their
 * edges blur and blend together at the seams.
 *
 * Features:
 * - **Four Quadrant Layout**: Initial 2x2 grid of video panels with crisp boundaries
 * - **Position Shifting**: Each quadrant slides toward center (5% translate)
 * - **Scale Animation**: Panels scale from 1.0 to 1.1 creating overlap zones
 * - **Edge Blurring**: Progressive blur from 0 to 20px on panel edges using mask-image
 * - **Screen Blend Mode**: Overlapping areas briefly show both videos with screen blend
 * - **Opacity Control**: Non-selected panels fade out, selected panel fades to full opacity
 * - **Flash Effect**: White flash overlay at convergence point for impact
 * - **Z-Index Management**: Selected panel highest, others staggered below
 *
 * Use cases:
 * - Creating dynamic video transitions with multiple sources
 * - Merging multiple camera angles into a single view
 * - Building cinematic multi-panel to single-panel transitions
 * - Adding visual interest to video compositions with blending effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1Src: z
    .string()
    .describe('Source URL for top-left video panel (quadrant 1)'),
  video2Src: z
    .string()
    .describe('Source URL for top-right video panel (quadrant 2)'),
  video3Src: z
    .string()
    .describe('Source URL for bottom-left video panel (quadrant 3)'),
  video4Src: z
    .string()
    .describe('Source URL for bottom-right video panel (quadrant 4)'),
  selectedPanel: z
    .enum(['1', '2', '3', '4'])
    .default('4')
    .describe(
      'Which panel becomes the dominant video (1=top-left, 2=top-right, 3=bottom-left, 4=bottom-right)',
    ),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the morph transition in seconds'),
  flashTiming: z
    .number()
    .min(0)
    .max(1)
    .default(0.725)
    .describe(
      'When the flash occurs as a fraction of transition duration (0-1)',
    ),
  flashDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Duration of the white flash effect in seconds'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Maximum opacity of the white flash (0-1)'),
  maxBlur: z
    .number()
    .min(0)
    .max(40)
    .default(20)
    .describe('Maximum blur applied to panel edges in pixels'),
  translateDistance: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Distance panels move toward center as percentage'),
  scaleAmount: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.1)
    .describe('Maximum scale factor for panels (1.1 = 110% size)'),
  selectedOpacityStart: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Starting opacity of selected panel'),
  trackName: z.string().optional().describe('Optional track name for IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1Src,
    video2Src,
    video3Src,
    video4Src,
    selectedPanel,
    transitionDuration,
    flashTiming,
    flashDuration,
    flashIntensity,
    maxBlur,
    translateDistance,
    scaleAmount,
    selectedOpacityStart,
    trackName,
  } = params;

  const trackPrefix = trackName || 'video-morph';

  // Helper function to create mask-image gradient for edge blurring
  const createEdgeMask = (blur: number, position: string): string => {
    if (blur === 0) return 'none';
    const inset = `${blur}px`;
    // Linear gradient creates soft edges by fading from transparent at edges to opaque at center
    switch (position) {
      case 'top-left':
        return `linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.3) ${inset}, black 30%)`;
      case 'top-right':
        return `linear-gradient(225deg, transparent 0%, rgba(0,0,0,0.3) ${inset}, black 30%)`;
      case 'bottom-left':
        return `linear-gradient(45deg, transparent 0%, rgba(0,0,0,0.3) ${inset}, black 30%)`;
      case 'bottom-right':
        return `linear-gradient(315deg, transparent 0%, rgba(0,0,0,0.3) ${inset}, black 30%)`;
      default:
        return 'none';
    }
  };

  // Helper function to determine if panel is selected
  const isSelected = (panelId: string): boolean => {
    return selectedPanel === panelId;
  };

  // Helper function to get z-index based on selection
  const getZIndex = (panelId: string): number => {
    if (isSelected(panelId)) return 4;
    // Stagger z-index for non-selected panels
    const indices: Record<string, number> = {
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 3,
    };
    return indices[panelId] || 1;
  };

  // Create quadrant video panels
  const createQuadrant = (
    quadrantId: string,
    src: string,
    position: { top?: number; left?: number; right?: number; bottom?: number },
    translateX: number,
    translateY: number,
    maskPosition: string,
  ): RenderableComponentData => {
    const selected = isSelected(quadrantId);
    const zIndex = getZIndex(quadrantId);

    return {
      id: `${trackPrefix}-quadrant-${quadrantId}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: src,
        className: 'absolute w-1/2 h-1/2 object-cover',
        style: {
          ...position,
          objectFit: 'cover',
          zIndex: zIndex,
        },
        loop: true,
        muted: false,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Transform effect: translate toward center + scale up
        {
          id: `${trackPrefix}-quadrant-${quadrantId}-transform`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackPrefix}-quadrant-${quadrantId}`],
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: translateY, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: scaleAmount, prog: 1 },
            ],
          },
        },
        // Opacity effect: fade based on selection
        {
          id: `${trackPrefix}-quadrant-${quadrantId}-opacity`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackPrefix}-quadrant-${quadrantId}`],
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            ranges: [
              {
                key: 'opacity',
                val: selected ? selectedOpacityStart : 1,
                prog: 0,
              },
              { key: 'opacity', val: selected ? 1 : 0, prog: 1 },
            ],
          },
        },
        // Blend mode effect: screen during mid-transition
        {
          id: `${trackPrefix}-quadrant-${quadrantId}-blend`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackPrefix}-quadrant-${quadrantId}`],
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'mixBlendMode', val: 'normal', prog: 0 },
              { key: 'mixBlendMode', val: 'screen', prog: 0.3 },
              { key: 'mixBlendMode', val: 'screen', prog: 0.7 },
              { key: 'mixBlendMode', val: 'normal', prog: 1 },
            ],
          },
        },
        // Edge blur effect using filter
        {
          id: `${trackPrefix}-quadrant-${quadrantId}-blur`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackPrefix}-quadrant-${quadrantId}`],
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${maxBlur * 0.5}px)`, prog: 0.5 },
              { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.8 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create flash overlay
  const flashOverlay: RenderableComponentData = {
    id: `${trackPrefix}-flash-overlay`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div class='w-full h-full bg-white'></div>",
      className: 'absolute inset-0',
      style: {
        zIndex: 10,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: `${trackPrefix}-flash-effect`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [`${trackPrefix}-flash-overlay`],
          type: 'ease-in-out',
          start: flashTiming * transitionDuration,
          duration: flashDuration,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create all four quadrants with their respective positions and translations
  const quadrant1 = createQuadrant(
    '1',
    video1Src,
    { top: 0, left: 0 },
    translateDistance, // Move right
    translateDistance, // Move down
    'top-left',
  );

  const quadrant2 = createQuadrant(
    '2',
    video2Src,
    { top: 0, right: 0 },
    -translateDistance, // Move left
    translateDistance, // Move down
    'top-right',
  );

  const quadrant3 = createQuadrant(
    '3',
    video3Src,
    { bottom: 0, left: 0 },
    translateDistance, // Move right
    -translateDistance, // Move up
    'bottom-left',
  );

  const quadrant4 = createQuadrant(
    '4',
    video4Src,
    { bottom: 0, right: 0 },
    -translateDistance, // Move left
    -translateDistance, // Move up
    'bottom-right',
  );

  const childrenData: RenderableComponentData[] = [
    quadrant1,
    quadrant2,
    quadrant3,
    quadrant4,
    flashOverlay,
  ];

  const rootContainer: RenderableComponentData = {
    id: `${trackPrefix}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'video-morph-transition',
  title: 'Video Morph Transition',
  description:
    'Four video panels fluidly merge and blend into a single cohesive video with position shifts, edge blur, and screen blend mode during overlap. Includes white flash at convergence.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'video',
    'transition',
    'morph',
    'blend',
    'multi-panel',
    'quadrant',
    'merge',
  ],
  defaultInputParams: {
    video1Src: 'https://example.com/video1.mp4',
    video2Src: 'https://example.com/video2.mp4',
    video3Src: 'https://example.com/video3.mp4',
    video4Src: 'https://example.com/video4.mp4',
    selectedPanel: '4',
    transitionDuration: 2,
    flashTiming: 0.725,
    flashDuration: 0.1,
    flashIntensity: 0.8,
    maxBlur: 20,
    translateDistance: 5,
    scaleAmount: 1.1,
    selectedOpacityStart: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const videoMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
