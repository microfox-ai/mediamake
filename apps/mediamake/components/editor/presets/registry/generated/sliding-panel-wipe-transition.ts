/**
 * Sliding Panel Wipe Transition Preset
 *
 * Creates a dynamic transition where 6 vertical panels slide in from alternating directions
 * (odd panels from top, even panels from bottom) to reveal the incoming video. Features elastic
 * spring easing for a bouncy, energetic effect. Each panel has a gradient overlay and white border.
 * The incoming video receives a subtle shake effect as each panel locks into place for tactile feedback.
 *
 * Features:
 * - 6 vertical panels with alternating slide directions
 * - Elastic spring easing (cubic-bezier) for bouncy motion
 * - Staggered panel arrival timing (0.15s between panels)
 * - Gradient overlays on panels (transparent to 20% black)
 * - White borders on panel leading edges
 * - Shake feedback on incoming video as panels arrive
 * - 1.3 second total transition duration
 *
 * Use cases:
 * - Energetic video transitions
 * - Music video scene changes
 * - Sports highlight transitions
 * - Dynamic presentation slides
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the transition in seconds'),
  numberOfPanels: z
    .number()
    .default(6)
    .describe('Number of vertical panels (default: 6)'),
  staggerDelay: z
    .number()
    .default(0.15)
    .describe('Delay between each panel animation in seconds'),
  shakeIntensity: z
    .number()
    .default(5)
    .describe('Intensity of shake effect in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    numberOfPanels,
    staggerDelay,
    shakeIntensity,
  } = params;

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate panel animation duration (remaining time after stagger)
  const panelAnimationDuration = transitionDuration - (numberOfPanels - 1) * staggerDelay;

  // Elastic easing cubic-bezier
  const elasticEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  // Create panel effects
  const panelEffects: any[] = [];
  const shakeEffects: any[] = [];

  for (let i = 0; i < numberOfPanels; i++) {
    const isOddPanel = i % 2 === 1; // Odd indices (1, 3, 5) slide from top
    const panelStartTime = i * staggerDelay;
    const shakeStartTime = panelStartTime + panelAnimationDuration - 0.05; // Shake starts 0.05s before panel completes

    // Panel slide effect
    panelEffects.push({
      id: `panel-${i}-slide`,
      componentId: 'generic',
      data: {
        type: 'linear', // Use linear for custom cubic-bezier via CSS
        start: panelStartTime,
        duration: panelAnimationDuration,
        mode: 'provider',
        targetIds: [`panel-${i}`],
        ranges: [
          {
            key: 'translateY',
            val: isOddPanel ? '-100%' : '100%',
            prog: 0,
          },
          {
            key: 'translateY',
            val: '0%',
            prog: 1,
          },
        ],
      },
    });

    // Shake effect on incoming video as each panel arrives
    shakeEffects.push({
      id: `shake-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: shakeStartTime,
        duration: 0.1,
        mode: 'provider',
        targetIds: ['incoming-video'],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: shakeIntensity * (Math.random() - 0.5) * 2, prog: 0.25 },
          { key: 'translateX', val: -shakeIntensity * (Math.random() - 0.5) * 2, prog: 0.5 },
          { key: 'translateX', val: shakeIntensity * (Math.random() - 0.5) * 2, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: shakeIntensity * (Math.random() - 0.5) * 2, prog: 0.25 },
          { key: 'translateY', val: -shakeIntensity * (Math.random() - 0.5) * 2, prog: 0.5 },
          { key: 'translateY', val: shakeIntensity * (Math.random() - 0.5) * 2, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    });
  }

  // Create panel components
  const panelComponents: RenderableComponentData[] = [];

  for (let i = 0; i < numberOfPanels; i++) {
    const isOddPanel = i % 2 === 1;
    const leftPosition = (i / numberOfPanels) * 100;
    const widthPercent = 100 / numberOfPanels;

    panelComponents.push({
      id: `panel-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full',
          style: {
            width: `${widthPercent}%`,
            left: `${leftPosition}%`,
            zIndex: 30,
            borderRight: '2px solid white',
            background: isOddPanel
              ? 'linear-gradient(to top, transparent, rgba(0,0,0,0.2))'
              : 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2))',
            transform: `translateY(${isOddPanel ? '-100%' : '100%'})`,
            transition: `transform ${panelAnimationDuration}s ${elasticEasing}`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [],
    } as RenderableComponentData);
  }

  // Build the complete structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (z-index 10)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [],
    } as RenderableComponentData,

    // Incoming video (z-index 20)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: shakeEffects,
    } as RenderableComponentData,

    // Panels (z-index 30)
    ...panelComponents.map((panel, index) => ({
      ...panel,
      effects: [panelEffects[index]],
    })),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'sliding-panel-wipe-container',
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
  id: 'sliding-panel-wipe-transition',
  title: 'Sliding Panel Wipe Transition',
  description:
    'A dynamic video transition where 6 vertical panels slide in from alternating directions (odd from top, even from bottom) with elastic spring easing to reveal the incoming video. Features gradient overlays on panels, white leading-edge borders, staggered arrival timing, and tactile shake feedback on the incoming video as each panel locks into place.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'panel', 'wipe', 'slide', 'elastic', 'spring', 'bouncy', 'energetic', 'shake'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.3,
    numberOfPanels: 6,
    staggerDelay: 0.15,
    shakeIntensity: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const slidingPanelWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
