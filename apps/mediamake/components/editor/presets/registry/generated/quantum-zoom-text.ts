/**
 * Quantum Zoom Text Preset
 *
 * Creates a quantum collapse effect where the text appears to exist in multiple scale states
 * simultaneously (like a probability cloud) before collapsing into a single state, followed
 * by a slow zoom animation.
 *
 * Features:
 * - Multiple ghost copies at different scales (0.98, 1.0, 1.02, 1.04)
 * - Low opacity ghost copies (20-30%) with blend modes for ethereal effect
 * - Quantum collapse: ghost copies fade out while main text fades in (0-1.5s)
 * - Slow continuous zoom after collapse (1.5-10s)
 * - Configurable blend modes (screen, overlay, normal)
 * - Adjustable collapse duration and zoom intensity
 *
 * Use cases:
 * - Creating ethereal, dreamlike title sequences
 * - Adding conceptual "uncertainty" before text materializes
 * - Building unique visual metaphors for quantum/science content
 * - Creating sophisticated fade-in effects with multiple scale states
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  fontSize: z
    .union([z.string(), z.number()])
    .default('64px')
    .describe('Font size (e.g., "64px" or 64)'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('bold')
    .describe('Font weight (e.g., "bold", 700)'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  color: z.string().default('#FFFFFF').describe('Text color'),
  blendMode: z
    .enum(['screen', 'overlay', 'normal'])
    .default('screen')
    .describe('CSS blend mode for ghost copies'),
  collapseDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of quantum collapse effect in seconds'),
  zoomDuration: z
    .number()
    .min(5)
    .max(20)
    .default(8.5)
    .describe('Duration of slow zoom after collapse in seconds'),
  zoomScale: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.02)
    .describe('Final scale value for zoom effect'),
  duration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Total duration in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    fontFamily,
    color,
    blendMode,
    collapseDuration,
    zoomDuration,
    zoomScale,
    duration,
  } = params;

  // Ghost layer configurations
  const ghostLayers = [
    { id: 'ghost-layer-1', scale: 0.98, opacity: 0.3 },
    { id: 'ghost-layer-2', scale: 1.02, opacity: 0.25 },
    { id: 'ghost-layer-3', scale: 1.04, opacity: 0.2 },
  ];

  // Create ghost text layers
  const ghostTextComponents = ghostLayers.map((ghost) => {
    // Scale effect (maintains constant scale throughout)
    const scaleEffect = {
      id: `${ghost.id}-scale`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [ghost.id],
        ranges: [
          { key: 'scale', val: ghost.scale, prog: 0 },
          { key: 'scale', val: ghost.scale, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Opacity fade-out effect
    const opacityEffect = {
      id: `${ghost.id}-opacity`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: collapseDuration,
        mode: 'provider',
        targetIds: [ghost.id],
        ranges: [
          { key: 'opacity', val: ghost.opacity, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };

    return {
      id: ghost.id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize,
          fontWeight,
          color,
          textAlign: 'center',
          mixBlendMode: blendMode,
          pointerEvents: 'none',
        },
        font: {
          family: fontFamily,
          weights: ['400', '700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [scaleEffect, opacityEffect],
    } as RenderableComponentData;
  });

  // Main text layer
  // Fade-in effect (quantum collapse/materialization)
  const mainFadeInEffect = {
    id: 'main-collapse',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: collapseDuration,
      mode: 'provider',
      targetIds: ['main-text-layer'],
      ranges: [
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Slow zoom effect (after collapse)
  const mainZoomEffect = {
    id: 'main-zoom',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: collapseDuration,
      duration: zoomDuration,
      mode: 'provider',
      targetIds: ['main-text-layer'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: zoomScale, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const mainTextComponent: RenderableComponentData = {
    id: 'main-text-layer',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize,
        fontWeight,
        color,
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [mainFadeInEffect, mainZoomEffect],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quantum-zoom-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...ghostTextComponents, mainTextComponent] as RenderableComponentData[],
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
  id: 'quantum-zoom-text',
  title: 'Quantum Zoom Text',
  description:
    'A text preset featuring a quantum collapse effect where multiple scale states (probability cloud) exist simultaneously before collapsing into a single state, followed by a slow zoom. Creates an ethereal, dreamlike quality suggesting multiple possibilities materializing into reality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'quantum',
    'collapse',
    'zoom',
    'ethereal',
    'dreamlike',
    'probability',
    'blend-modes',
    'ghost',
    'fade',
    'scale',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Quantum Text',
    fontSize: '64px',
    fontWeight: 'bold',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    blendMode: 'screen',
    collapseDuration: 1.5,
    zoomDuration: 8.5,
    zoomScale: 1.02,
    duration: 10,
  },
};

export const quantumZoomTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
