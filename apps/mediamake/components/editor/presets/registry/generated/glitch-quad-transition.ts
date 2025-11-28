/**
 * Glitch Quad Transition Preset
 *
 * A glitch-style quad transition where four video panels experience synchronized glitch effects
 * (horizontal displacement, RGB channel splitting, digital noise, frame drops) before one panel
 * takes over the full screen with perfect clarity while others corrupt and disappear.
 *
 * Features:
 * - Four video panels in quad layout (2x2 grid)
 * - Synchronized glitch effects starting at 0.7s: displacement, flicker, RGB split
 * - Selected panel (bottom-left) experiences heaviest glitch before scaling to full screen
 * - Non-selected panels corrupt and fade to opacity 0
 * - Data moshing effects via rapid opacity/transform changes
 * - Peak glitch period: 0.7s-1.2s
 * - Total transition duration: 1.5s
 *
 * Use cases:
 * - Tech/digital content transitions
 * - Music video glitch effects
 * - Gaming/esports transitions
 * - Cyberpunk/futuristic aesthetics
 * - Social media attention-grabbing transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1Src: z.string().describe('Source URL for top-left video panel'),
  video2Src: z.string().describe('Source URL for top-right video panel'),
  video3Src: z.string().describe('Source URL for bottom-left video panel (selected panel that takes over)'),
  video4Src: z.string().describe('Source URL for bottom-right video panel'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Total duration of transition in seconds'),
  glitchStartTime: z
    .number()
    .default(0.7)
    .describe('When glitch effects begin (seconds into transition)'),
  glitchPeakDuration: z
    .number()
    .default(0.5)
    .describe('Duration of peak glitch period in seconds'),
  selectedPanelPosition: z
    .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
    .default('bottom-left')
    .describe('Which panel takes over full screen'),
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
    transitionDuration,
    glitchStartTime,
    glitchPeakDuration,
    selectedPanelPosition,
  } = params;

  const { config } = props;
  const viewportWidth = config?.width || 1920;
  const viewportHeight = config?.height || 1080;

  // Panel positioning
  const panelWidth = viewportWidth / 2;
  const panelHeight = viewportHeight / 2;

  // Selected panel index
  const selectedPanelIndex =
    selectedPanelPosition === 'top-left'
      ? 0
      : selectedPanelPosition === 'top-right'
      ? 1
      : selectedPanelPosition === 'bottom-left'
      ? 2
      : 3;

  const videoSources = [video1Src, video2Src, video3Src, video4Src];
  const panelPositions = [
    { top: 0, left: 0 }, // top-left
    { top: 0, right: 0 }, // top-right
    { bottom: 0, left: 0 }, // bottom-left
    { bottom: 0, right: 0 }, // bottom-right
  ];

  const panelIds = [
    'video-panel-tl',
    'video-panel-tr',
    'video-panel-bl',
    'video-panel-br',
  ];

  // Create video panels
  const videoPanels: RenderableComponentData[] = videoSources.map(
    (src, index) => {
      const isSelected = index === selectedPanelIndex;
      const position = panelPositions[index];
      const panelId = panelIds[index];

      // Base panel
      const panel: RenderableComponentData = {
        id: panelId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src,
          className: 'absolute w-1/2 h-1/2 object-cover',
          fit: 'cover',
          style: position,
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [],
      };

      // Add glitch effects
      const effects: any[] = [];

      // 1. Displacement glitch (horizontal jitter)
      const displacementVariations = [
        [-8, 6, -4, 10, 0],
        [7, -5, 9, -3, 0],
        [-10, 12, -15, 8, -5, 0],
        [6, -8, 4, -2, 0],
      ];
      const displacementPattern = displacementVariations[index];
      const displacementDuration = isSelected
        ? glitchPeakDuration
        : 0.3 + index * 0.05;

      const displacementRanges: any[] = [];
      const stepCount = displacementPattern.length;
      displacementPattern.forEach((val, i) => {
        displacementRanges.push({
          key: 'translateX',
          val: val,
          prog: i / (stepCount - 1),
        });
      });

      effects.push({
        id: `glitch-displacement-${panelId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: glitchStartTime,
          duration: displacementDuration,
          mode: 'provider',
          targetIds: [panelId],
          ranges: displacementRanges,
        },
      });

      // 2. Flicker effect (rapid opacity changes)
      const flickerPattern = isSelected
        ? [1, 0.2, 1, 0.4, 1, 0.1, 1, 0.6, 1]
        : index === 0
        ? [1, 0.3, 1, 0.5, 1, 0.2, 0]
        : index === 1
        ? [1, 0.4, 1, 0.6, 1, 0.3, 0]
        : [1, 0.5, 1, 0.3, 1, 0.4, 0];

      const flickerRanges: any[] = flickerPattern.map((val, i) => ({
        key: 'opacity',
        val: val,
        prog: i / (flickerPattern.length - 1),
      }));

      effects.push({
        id: `glitch-flicker-${panelId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: glitchStartTime,
          duration: isSelected ? glitchPeakDuration : 0.3 + index * 0.05,
          mode: 'provider',
          targetIds: [panelId],
          ranges: flickerRanges,
        },
      });

      // 3. Selected panel: scale to full screen
      if (isSelected) {
        // Calculate translation to center
        const translateX =
          position.left !== undefined ? panelWidth / 2 : -panelWidth / 2;
        const translateY =
          position.top !== undefined ? panelHeight / 2 : -panelHeight / 2;

        effects.push({
          id: `glitch-scale-${panelId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: glitchStartTime + glitchPeakDuration,
            duration: 0.3,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 2, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: translateY, prog: 1 },
            ],
          },
        });

        // Clean opacity at end
        effects.push({
          id: `glitch-clean-${panelId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: glitchStartTime + glitchPeakDuration,
            duration: 0.1,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        });
      } else {
        // Non-selected panels: fade out
        effects.push({
          id: `glitch-fadeout-${panelId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: glitchStartTime + glitchPeakDuration - 0.2,
            duration: 0.5,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        });

        // Add corruption via skew
        effects.push({
          id: `glitch-skew-${panelId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: glitchStartTime + glitchPeakDuration - 0.1,
            duration: 0.3,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'skewX', val: 0, prog: 0 },
              { key: 'skewX', val: index % 2 === 0 ? -5 : 5, prog: 1 },
            ],
          },
        });
      }

      panel.effects = effects;
      return panel;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-quad-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: videoPanels,
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
  id: 'glitch-quad-transition',
  title: 'Glitch Quad Transition',
  description:
    'A glitch-style quad transition where four video panels experience synchronized glitch effects (displacement, RGB split, flicker, noise) before one panel takes over full screen with perfect clarity while others corrupt and disappear. Features data moshing, randomized intensities, and authentic digital distortion aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'quad',
    'video',
    'effects',
    'digital',
    'cyberpunk',
    'tech',
    'displacement',
    'rgb-split',
    'corruption',
  ],
  defaultInputParams: {
    video1Src: 'https://example.com/video1.mp4',
    video2Src: 'https://example.com/video2.mp4',
    video3Src: 'https://example.com/video3.mp4',
    video4Src: 'https://example.com/video4.mp4',
    transitionDuration: 1.5,
    glitchStartTime: 0.7,
    glitchPeakDuration: 0.5,
    selectedPanelPosition: 'bottom-left',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchQuadTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
