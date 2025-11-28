/**
 * Quad-Split Collapse Transition Preset
 *
 * This preset creates a dynamic quad-split collapse transition where four video panels
 * slide and rotate into a central point before expanding into the next scene.
 *
 * Features:
 * - Four equal-sized video panels arranged in a grid (2x2)
 * - Staggered timing for collapse (0ms, 100ms, 200ms, 300ms offsets)
 * - Each panel rotates (5-10 degrees) while sliding toward center
 * - Scale from 1 to 0.1 during collapse
 * - Motion blur effect during movement (0 → 3px → 0)
 * - 200ms pause at center point
 * - Incoming video expands from center with spring bounce effect (scale 0.1 → 1.1 → 1)
 * - Z-index layering for proper visual stacking
 *
 * Technical Implementation:
 * - BaseLayout with 'relative w-full h-full overflow-hidden bg-black'
 * - Four outgoing VideoAtoms positioned at corners (absolute w-1/2 h-1/2)
 * - Generic effects with cubic-bezier(0.68, -0.55, 0.265, 1.55) easing for collapse
 * - Filter blur effects for motion blur during movement
 * - Incoming VideoAtom at center with spring effect for expansion
 * - Total duration: 2 seconds (1s collapse + 0.2s pause + 0.8s expansion)
 *
 * Use Cases:
 * - Video transitions between multiple clips
 * - Creative scene changes
 * - Multi-panel video storytelling
 * - Dynamic video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideos: z
    .array(
      z.object({
        src: z.string().describe('Source URL of outgoing video'),
        fit: z
          .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
          .default('cover')
          .optional()
          .describe('How to fit the video in its panel'),
        duration: z
          .number()
          .positive()
          .describe('Duration of outgoing video in seconds'),
      }),
    )
    .length(4)
    .describe(
      'Array of 4 outgoing videos (top-left, top-right, bottom-left, bottom-right)',
    ),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    fit: z
      .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
      .default('cover')
      .optional()
      .describe('How to fit the incoming video'),
    duration: z
      .number()
      .positive()
      .describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Total transition duration in seconds'),
  collapseDuration: z
    .number()
    .default(1)
    .describe('Duration of collapse phase in seconds'),
  pauseDuration: z
    .number()
    .default(0.2)
    .describe('Pause duration at center point in seconds'),
  expansionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of expansion phase in seconds'),
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Motion blur intensity in pixels'),
  rotationAngles: z
    .array(z.number())
    .length(4)
    .default([7, -5, -10, 8])
    .optional()
    .describe(
      'Rotation angles for each panel in degrees (top-left, top-right, bottom-left, bottom-right)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideos,
    incomingVideo,
    transitionDuration,
    collapseDuration,
    pauseDuration,
    expansionDuration,
    motionBlurIntensity,
    rotationAngles = [7, -5, -10, 8],
  } = params;

  // Stagger offsets for each panel (in seconds)
  const staggerOffsets = [0, 0.1, 0.2, 0.3];

  // Panel positions and IDs
  const panelConfigs = [
    {
      id: 'outgoing-panel-top-left',
      position: { top: '0', left: '0' },
      zIndex: 10,
      translateTo: { x: '25vw', y: '25vh' },
      rotation: rotationAngles[0],
    },
    {
      id: 'outgoing-panel-top-right',
      position: { top: '0', right: '0' },
      zIndex: 20,
      translateTo: { x: '-25vw', y: '25vh' },
      rotation: rotationAngles[1],
    },
    {
      id: 'outgoing-panel-bottom-left',
      position: { bottom: '0', left: '0' },
      zIndex: 30,
      translateTo: { x: '25vw', y: '-25vh' },
      rotation: rotationAngles[2],
    },
    {
      id: 'outgoing-panel-bottom-right',
      position: { bottom: '0', right: '0' },
      zIndex: 40,
      translateTo: { x: '-25vw', y: '-25vh' },
      rotation: rotationAngles[3],
    },
  ];

  // Create outgoing video panels
  const outgoingPanels: RenderableComponentData[] = panelConfigs.map(
    (config, index) => {
      const video = outgoingVideos[index];
      const staggerOffset = staggerOffsets[index];

      return {
        id: config.id,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          fit: video.fit ?? 'cover',
          className: 'absolute w-1/2 h-1/2',
          style: {
            ...config.position,
            zIndex: config.zIndex,
          },
        },
        context: {
          timing: {
            start: staggerOffset,
            duration: collapseDuration,
          },
        },
        effects: [
          // Collapse effect: translate, rotate, scale
          {
            id: `collapse-${config.id}`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [config.id],
              type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              start: 0,
              duration: collapseDuration,
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: config.translateTo.x, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: config.translateTo.y, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: config.rotation, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.1, prog: 1 },
              ],
            },
          },
          // Motion blur effect
          {
            id: `blur-${config.id}`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [config.id],
              type: 'ease-out',
              start: 0,
              duration: collapseDuration * 0.5,
              ranges: [
                { key: 'blur', val: 0, prog: 0 },
                { key: 'blur', val: motionBlurIntensity, prog: 0.5 },
                { key: 'blur', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create incoming video (expands from center after pause)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: incomingVideo.fit ?? 'cover',
      className: 'absolute w-full h-full',
      style: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      },
    },
    context: {
      timing: {
        start: collapseDuration + pauseDuration,
        duration: expansionDuration,
      },
    },
    effects: [
      // Spring expansion effect with bounce
      {
        id: 'expand-incoming',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['incoming-video'],
          type: 'spring',
          start: 0,
          duration: expansionDuration,
          ranges: [
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quad-split-collapse-container',
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
    childrenData: [...outgoingPanels, incomingVideoNode],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'quad-split-collapse-transition',
  title: 'Quad-Split Collapse Transition',
  description:
    'Dynamic quad-split collapse transition where four video panels slide and rotate into a central point with staggered timing, pause, then expand outward with spring bounce. Features motion blur during movement and 2-second total transition duration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'quad-split',
    'collapse',
    'spring',
    'motion-blur',
    'dynamic',
  ],
  defaultInputParams: {
    outgoingVideos: [
      {
        src: 'https://example.com/video1.mp4',
        fit: 'cover',
        duration: 5,
      },
      {
        src: 'https://example.com/video2.mp4',
        fit: 'cover',
        duration: 5,
      },
      {
        src: 'https://example.com/video3.mp4',
        fit: 'cover',
        duration: 5,
      },
      {
        src: 'https://example.com/video4.mp4',
        fit: 'cover',
        duration: 5,
      },
    ],
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      fit: 'cover',
      duration: 10,
    },
    transitionDuration: 2,
    collapseDuration: 1,
    pauseDuration: 0.2,
    expansionDuration: 0.8,
    motionBlurIntensity: 3,
    rotationAngles: [7, -5, -10, 8],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quadSplitCollapseTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
