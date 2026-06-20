/**
 * Cinematic Letterbox Panel Transition Preset
 *
 * This preset creates a sophisticated three-stage cinematic transition that mimics classic film editing:
 * 
 * **Stage 1 (0-30% progress)**: Horizontal letterbox bars slide in from top and bottom, creating the classic
 * cinematic frame. The bars use smooth ease-in-out motion to establish the viewing frame.
 * 
 * **Stage 2 (20-50% progress)**: Vertical panels slide in from left and right sides, creating a frame-within-frame
 * effect that adds depth and sophistication. These panels overlap with Stage 1 for smooth transition.
 * 
 * **Stage 3 (50-100% progress)**: The inner content area splits into a 2x2 grid of panels that slide away
 * diagonally in different directions, revealing the final content underneath. Each panel combines translateX
 * and translateY for smooth diagonal motion.
 * 
 * **Visual Effects**: Film grain texture overlay and radial vignette provide authentic cinematic atmosphere.
 * The grain adds organic texture while the vignette draws focus to the center.
 * 
 * **Use Cases**:
 * - Professional video intros and outros
 * - Scene transitions in narrative content
 * - Cinematic reveal effects for products or announcements
 * - Film-style chapter markers
 * - Sophisticated brand presentations
 * 
 * The preset uses careful z-index management to ensure proper layering of all elements and timing
 * calculations to create smooth, deliberate motion throughout all three stages.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Total duration of the transition in seconds'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Intensity of film grain overlay (0-1)'),
  vignetteStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Strength of vignette effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { duration, grainIntensity, vignetteStrength } = params;

  // Calculate stage timing (as percentages of total duration)
  const stage1Start = 0;
  const stage1End = duration * 0.3; // 30%
  const stage2Start = duration * 0.2; // 20% (overlaps with stage 1)
  const stage2End = duration * 0.5; // 50%
  const stage3Start = duration * 0.5; // 50%
  const stage3End = duration; // 100%

  const childrenData: RenderableComponentData[] = [];

  // ============================================================================
  // STAGE 1: Horizontal Letterbox Bars (Top and Bottom)
  // ============================================================================

  // Top letterbox bar
  const letterboxTopEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: stage1Start,
    duration: stage1End - stage1Start,
    mode: 'provider',
    targetIds: ['letterbox-top'],
    ranges: [
      { key: 'translateY', val: '-100%', prog: 0 },
      { key: 'translateY', val: '0%', prog: 1 },
      { key: 'opacity', val: 0.8, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  childrenData.push({
    id: 'letterbox-top',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: #000000;"></div>',
      className: 'absolute top-0 left-0 w-full h-1/4',
      style: {
        zIndex: 5,
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
        id: 'letterbox-top-effect',
        componentId: 'generic',
        data: letterboxTopEffect,
      },
    ],
  } as RenderableComponentData);

  // Bottom letterbox bar
  const letterboxBottomEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: stage1Start,
    duration: stage1End - stage1Start,
    mode: 'provider',
    targetIds: ['letterbox-bottom'],
    ranges: [
      { key: 'translateY', val: '100%', prog: 0 },
      { key: 'translateY', val: '0%', prog: 1 },
      { key: 'opacity', val: 0.8, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  childrenData.push({
    id: 'letterbox-bottom',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: #000000;"></div>',
      className: 'absolute bottom-0 left-0 w-full h-1/4',
      style: {
        zIndex: 5,
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
        id: 'letterbox-bottom-effect',
        componentId: 'generic',
        data: letterboxBottomEffect,
      },
    ],
  } as RenderableComponentData);

  // ============================================================================
  // STAGE 2: Vertical Side Panels (Left and Right)
  // ============================================================================

  // Left vertical panel
  const verticalLeftEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: stage2Start,
    duration: stage2End - stage2Start,
    mode: 'provider',
    targetIds: ['vertical-panel-left'],
    ranges: [
      { key: 'translateX', val: '-100%', prog: 0 },
      { key: 'translateX', val: '0%', prog: 1 },
      { key: 'opacity', val: 0.8, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  childrenData.push({
    id: 'vertical-panel-left',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: #000000;"></div>',
      className: 'absolute left-0 top-0 w-1/6 h-full',
      style: {
        zIndex: 10,
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
        id: 'vertical-left-effect',
        componentId: 'generic',
        data: verticalLeftEffect,
      },
    ],
  } as RenderableComponentData);

  // Right vertical panel
  const verticalRightEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: stage2Start,
    duration: stage2End - stage2Start,
    mode: 'provider',
    targetIds: ['vertical-panel-right'],
    ranges: [
      { key: 'translateX', val: '100%', prog: 0 },
      { key: 'translateX', val: '0%', prog: 1 },
      { key: 'opacity', val: 0.8, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  childrenData.push({
    id: 'vertical-panel-right',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: #000000;"></div>',
      className: 'absolute right-0 top-0 w-1/6 h-full',
      style: {
        zIndex: 10,
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
        id: 'vertical-right-effect',
        componentId: 'generic',
        data: verticalRightEffect,
      },
    ],
  } as RenderableComponentData);

  // ============================================================================
  // STAGE 3: Inner 2x2 Grid Panels (Diagonal Slide-Out)
  // ============================================================================

  // Calculate inner content area boundaries (accounting for letterbox and side panels)
  const innerTop = 25; // 25% from top (letterbox bar)
  const innerLeft = 16.666; // 16.666% from left (1/6 of width)
  const innerWidth = 66.667; // 66.667% width (remaining after side panels)
  const innerHeight = 50; // 50% height (remaining after letterbox bars)
  const panelWidth = innerWidth / 2;
  const panelHeight = innerHeight / 2;

  // Define 2x2 grid panels with gradients
  const gridPanels = [
    {
      id: 'inner-panel-top-left',
      top: innerTop,
      left: innerLeft,
      gradient: 'linear-gradient(to bottom right, #1f2937, #000000)',
      translateX: '-100%',
      translateY: '-100%',
    },
    {
      id: 'inner-panel-top-right',
      top: innerTop,
      left: innerLeft + panelWidth,
      gradient: 'linear-gradient(to bottom right, #374151, #000000)',
      translateX: '100%',
      translateY: '-100%',
    },
    {
      id: 'inner-panel-bottom-left',
      top: innerTop + panelHeight,
      left: innerLeft,
      gradient: 'linear-gradient(to bottom right, #4b5563, #000000)',
      translateX: '-100%',
      translateY: '100%',
    },
    {
      id: 'inner-panel-bottom-right',
      top: innerTop + panelHeight,
      left: innerLeft + panelWidth,
      gradient: 'linear-gradient(to bottom right, #6b7280, #000000)',
      translateX: '100%',
      translateY: '100%',
    },
  ];

  gridPanels.forEach((panel) => {
    const panelEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: stage3Start,
      duration: stage3End - stage3Start,
      mode: 'provider',
      targetIds: [panel.id],
      ranges: [
        { key: 'translateX', val: '0%', prog: 0 },
        { key: 'translateX', val: panel.translateX, prog: 1 },
        { key: 'translateY', val: '0%', prog: 0 },
        { key: 'translateY', val: panel.translateY, prog: 1 },
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.8 },
      ],
    };

    childrenData.push({
      id: panel.id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: ${panel.gradient};"></div>`,
        className: 'absolute',
        style: {
          top: `${panel.top}%`,
          left: `${panel.left}%`,
          width: `${panelWidth}%`,
          height: `${panelHeight}%`,
          zIndex: 20,
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
          id: `${panel.id}-effect`,
          componentId: 'generic',
          data: panelEffect,
        },
      ],
    } as RenderableComponentData);
  });

  // ============================================================================
  // OVERLAYS: Film Grain and Vignette
  // ============================================================================

  // Film grain overlay (using noise pattern)
  childrenData.push({
    id: 'grain-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg=='); opacity: ${grainIntensity}; mix-blend-mode: overlay; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 100,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData);

  // Vignette overlay (radial gradient)
  childrenData.push({
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle, transparent 40%, rgba(0,0,0,${vignetteStrength}) 100%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 90,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData);

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'cinematic-letterbox-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
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
  id: 'cinematicLetterboxPanelTransition',
  title: 'Cinematic Letterbox Panel Transition',
  description:
    'Three-stage cinematic transition with horizontal letterbox bars sliding from top/bottom (Stage 1), vertical side panels creating frame-within-frame (Stage 2), and inner content area splitting into diagonal sliding panels (Stage 3). Features film grain texture overlay and vignette effects for authentic cinematic feel with smooth, deliberate motion mimicking classic film editing techniques.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cinematic',
    'letterbox',
    'panel',
    'film',
    'frame-within-frame',
    'grain',
    'vignette',
    'three-stage',
    'diagonal',
    'sophisticated',
  ],
  defaultInputParams: {
    duration: 2.5,
    grainIntensity: 0.15,
    vignetteStrength: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicLetterboxPanelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
