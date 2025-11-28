/**
 * Geometric Sliding Panel Transition Preset
 *
 * This preset creates a professional transition effect where 5 vertical rectangular panels
 * slide in from alternating directions (top/bottom) to reveal the new video. The panels
 * slide with slight timing offsets creating a cascading reveal effect. Each panel carries
 * a portion of the incoming video, assembling like a puzzle with clean edges and consistent
 * spacing. Subtle brightness variations add depth to the transition.
 *
 * Features:
 * - 5 evenly-spaced vertical panels (20% width each)
 * - Alternating slide directions: odd panels from top, even from bottom
 * - Staggered timing: 0.1s delay between each panel for cascading effect
 * - 0.9s total transition duration with 0.8s slide animation per panel
 * - Clean edges with overflow control and consistent spacing
 * - Brightness variation for depth: alternating between 0.9 and 1.1
 * - Full-screen outgoing video as backdrop
 *
 * Use cases:
 * - Professional video transitions with geometric style
 * - Creating dynamic scene changes in video montages
 * - Adding visual interest to video sequences
 * - Modern, clean transitions for corporate or creative content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (backdrop)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (panels)'),
  transitionDuration: z
    .number()
    .default(0.9)
    .describe('Total duration of the transition in seconds'),
  panelSlideDuration: z
    .number()
    .default(0.8)
    .describe('Duration of each panel slide animation in seconds'),
  panelStagger: z
    .number()
    .default(0.1)
    .describe('Time delay between each panel start in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    panelSlideDuration,
    panelStagger,
  } = params;

  const numberOfPanels = 5;
  const panelWidth = 100 / numberOfPanels; // 20% per panel

  // Helper function to create panel
  const createPanel = (index: number): RenderableComponentData => {
    const isOddPanel = index % 2 === 0; // 0, 2, 4 are odd (index 0-based)
    const panelId = `panel-${index}`;
    const videoId = `panel-${index}-video`;

    // Calculate position
    const leftPosition = index * panelWidth;

    // Calculate slide direction (odd from top, even from bottom)
    const slideDirection = isOddPanel ? -100 : 100; // -100 = top, 100 = bottom

    // Calculate brightness (alternating 0.9 and 1.1)
    const brightness = isOddPanel ? 0.9 : 1.1;

    // Calculate video offset for proper alignment
    // Each panel shows 20% of the video, offset by its index
    const videoTranslateX = -index * 100; // -0%, -100%, -200%, -300%, -400%

    // Stagger start time
    const panelStartTime = index * panelStagger;

    return {
      id: panelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full overflow-hidden',
          style: {
            width: `${panelWidth}%`,
            left: `${leftPosition}%`,
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: panelStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${panelId}-slide`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: panelSlideDuration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'translateY', val: slideDirection, prog: 0, unit: '%' },
              { key: 'translateY', val: 0, prog: 1, unit: '%' },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'absolute inset-0',
            style: {
              objectFit: 'cover',
              transform: `translateX(${videoTranslateX}%) scale(${numberOfPanels})`,
              filter: `brightness(${brightness})`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Create all panels
  const panels: RenderableComponentData[] = [];
  for (let i = 0; i < numberOfPanels; i++) {
    panels.push(createPanel(i));
  }

  // Build complete transition structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (backdrop)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'absolute inset-0',
        style: {
          objectFit: 'cover',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    // All sliding panels
    ...panels,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'geometric-sliding-panel-container',
    type: 'layout',
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
  id: 'geometric-sliding-panel-transition',
  title: 'Geometric Sliding Panel Transition',
  description:
    'A professional transition effect featuring 5 vertical rectangular panels that slide in from alternating directions (top/bottom) to reveal the new video. Each panel carries a portion of the incoming video, assembling like a puzzle with clean edges, consistent spacing, and subtle brightness variations for depth. Panels are staggered by 0.1s each for a cascading effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'geometric',
    'panels',
    'sliding',
    'reveal',
    'cascade',
    'professional',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 0.9,
    panelSlideDuration: 0.8,
    panelStagger: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const geometricSlidingPanelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
