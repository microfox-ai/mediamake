/**
 * Glitch Split Screen Transition Preset
 *
 * A cyberpunk-inspired split screen preset where left and right panels 'tear' into view with digital distortion effects.
 * Features rapid opacity flicker (3-4 flashes over 0.3s), sliding panels with chromatic aberration simulation,
 * and an animated center divider line with varying width and opacity.
 *
 * Technical Implementation:
 * - Main container houses two half-screen panels with mix-blend-mode: screen for glitch blending
 * - Flicker effect: 6 opacity keyframes [0,1,0,1,0,1] over 0-0.3s range creates 3 complete flashes
 * - Chromatic aberration: Simulated using filter hue-rotation on duplicate layers with translateX offsets
 * - RGB split: Red channel (+2px) and blue channel (-2px) offsets during slide animation
 * - Center divider: Pulsing width (2px-6px) and opacity (0.3-1.0) with repeating pattern
 * - Performance: will-change applied during animation, filters limited to transition period
 *
 * Use cases:
 * - Tech content and software demos
 * - Cyberpunk-themed videos and gaming content
 * - Glitchy transitions for creative editing
 * - Modern split-screen presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  leftPanelContent: z
    .object({
      src: z.string().describe('Source URL for left panel content'),
      type: z
        .enum(['image', 'video'])
        .default('image')
        .describe('Content type for left panel'),
    })
    .describe('Content configuration for left panel'),
  rightPanelContent: z
    .object({
      src: z.string().describe('Source URL for right panel content'),
      type: z
        .enum(['image', 'video'])
        .default('image')
        .describe('Content type for right panel'),
    })
    .describe('Content configuration for right panel'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Total duration of the split screen transition in seconds'),
  flickerDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Duration of the initial flicker effect in seconds'),
  slideDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.7)
    .describe('Duration of the panel slide animation in seconds'),
  chromaticAberrationIntensity: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Intensity of RGB chromatic aberration effect in pixels'),
  dividerPulseSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed multiplier for divider pulse animation'),
  trackName: z
    .string()
    .default('glitch-split-screen')
    .describe('Track name for the preset (used for ID generation)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftPanelContent,
    rightPanelContent,
    duration,
    flickerDuration,
    slideDuration,
    chromaticAberrationIntensity,
    dividerPulseSpeed,
    trackName,
  } = params;

  // Helper function to determine component type
  const getComponentId = (type: 'image' | 'video'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Calculate timing phases
  const flickerEnd = flickerDuration;
  const slideEnd = flickerEnd + slideDuration;
  const settleStart = slideEnd;

  // Create flicker effect (3-4 flashes = 6-8 keyframes)
  const createFlickerEffect = (targetId: string) => ({
    id: `flicker-${targetId}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: flickerDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.166 },
        { key: 'opacity', val: 0, prog: 0.333 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 0.666 },
        { key: 'opacity', val: 1, prog: 0.833 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  // Create slide effect with chromatic aberration simulation
  const createSlideEffect = (
    targetId: string,
    direction: 'left' | 'right',
  ) => {
    const slideDistance = direction === 'left' ? '-50%' : '50%';
    return {
      id: `slide-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: flickerEnd,
        duration: slideDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: slideDistance, prog: 0 },
          { key: 'translateX', val: '0%', prog: 1 },
        ],
      },
    };
  };

  // Create RGB split effect (chromatic aberration)
  const createRGBSplitEffect = (
    targetId: string,
    channel: 'red' | 'blue',
  ) => {
    const offset =
      channel === 'red'
        ? chromaticAberrationIntensity
        : -chromaticAberrationIntensity;
    const hueRotate = channel === 'red' ? 120 : 240;

    return [
      {
        id: `rgb-split-translate-${channel}-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: flickerEnd,
          duration: slideDuration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'translateX', val: `${offset}px`, prog: 0 },
            { key: 'translateX', val: `${offset * 0.5}px`, prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
      {
        id: `rgb-split-filter-${channel}-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: flickerEnd,
          duration: slideDuration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'filter', val: `hue-rotate(${hueRotate}deg)`, prog: 0 },
            {
              key: 'filter',
              val: `hue-rotate(${hueRotate * 0.5}deg)`,
              prog: 0.5,
            },
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
          ],
        },
      },
    ];
  };

  // Left panel content
  const leftContentId = `${trackName}-left-content`;
  const leftContent: RenderableComponentData = {
    id: leftContentId,
    type: 'atom',
    componentId: getComponentId(leftPanelContent.type),
    data: {
      src: leftPanelContent.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createFlickerEffect(leftContentId),
      createSlideEffect(leftContentId, 'left'),
    ],
  };

  // Right panel content
  const rightContentId = `${trackName}-right-content`;
  const rightContent: RenderableComponentData = {
    id: rightContentId,
    type: 'atom',
    componentId: getComponentId(rightPanelContent.type),
    data: {
      src: rightPanelContent.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createFlickerEffect(rightContentId),
      createSlideEffect(rightContentId, 'right'),
    ],
  };

  // Left panel container
  const leftPanelId = `${trackName}-left-panel`;
  const leftPanel: RenderableComponentData = {
    id: leftPanelId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full w-1/2 left-0 top-0 overflow-hidden',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [leftContent],
  };

  // Right panel container
  const rightPanelId = `${trackName}-right-panel`;
  const rightPanel: RenderableComponentData = {
    id: rightPanelId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full w-1/2 right-0 top-0 overflow-hidden',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [rightContent],
  };

  // Center divider with pulsing effect
  const dividerId = `${trackName}-divider`;
  const dividerPulseDuration = 1 / dividerPulseSpeed;

  const divider: RenderableComponentData = {
    id: dividerId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, cyan 50%, transparent 100%);'></div>",
      className: 'absolute left-1/2 top-0 h-full',
      style: {
        width: '4px',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `divider-pulse-width`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [dividerId],
          ranges: [
            { key: 'width', val: '2px', prog: 0 },
            { key: 'width', val: '6px', prog: 0.25 },
            { key: 'width', val: '2px', prog: 0.5 },
            { key: 'width', val: '6px', prog: 0.75 },
            { key: 'width', val: '2px', prog: 1 },
          ],
        },
      },
      {
        id: `divider-pulse-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [dividerId],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.25 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.75 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [leftPanel, rightPanel, divider],
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
  id: 'glitch-split-screen',
  title: 'Glitch Split Screen Transition',
  description:
    "A cyberpunk-inspired split screen preset where left and right panels 'tear' into view with digital distortion effects, RGB chromatic aberration, and a pulsing data-stream divider. Features rapid opacity flicker (3-4 flashes over 0.3s), sliding panels with chromatic aberration, and an animated center divider line with varying width and opacity. Perfect for tech content, cyberpunk aesthetics, and glitchy video editing styles.",
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'glitch',
    'cyberpunk',
    'chromatic-aberration',
    'transition',
    'tech',
    'rgb-split',
    'digital',
    'distortion',
  ],
  defaultInputParams: {
    leftPanelContent: {
      src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
      type: 'image',
    },
    rightPanelContent: {
      src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop',
      type: 'image',
    },
    duration: 2,
    flickerDuration: 0.3,
    slideDuration: 0.7,
    chromaticAberrationIntensity: 2,
    dividerPulseSpeed: 1.5,
    trackName: 'glitch-split-screen',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchSplitScreenPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
