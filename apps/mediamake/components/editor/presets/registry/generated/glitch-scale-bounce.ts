/**
 * Glitch Scale Bounce - Cyberpunk Title Effect
 *
 * This preset creates a glitchy, digital-style scale bounce effect inspired by cyberpunk aesthetics
 * and video game UI. The title scales up with deliberate frame-stepping (stuttery motion), creating
 * a mechanical, angular bounce effect before settling. Features RGB chromatic aberration using
 * multiple text layers with blend modes, data-corruption style effects (opacity flickers, position
 * jitters) during the fastest motion, and a stacking context using 'relative isolate'.
 *
 * Features:
 * - **Stepped Scale Animation**: Frame-stepping effect during scale-up (0% -> 10% -> 11% etc.)
 * - **RGB Chromatic Aberration**: Three text layers (red, blue, green) with offsets and blend modes
 * - **Data Corruption Effects**: Opacity flickers and position jitters during rapid motion (0-30%)
 * - **Mechanical Bounce**: Angular, precise movements rather than organic easing
 * - **Stacking Context**: BaseLayout with 'relative isolate' for proper layering
 *
 * Use cases:
 * - Cyberpunk-themed video intros
 * - Gaming content titles
 * - Tech/digital product reveals
 * - Futuristic UI animations
 * - Glitch art video projects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  title: z.string().describe('Title text to display with glitch effect'),
  duration: z.number().default(2.5).describe('Total animation duration in seconds'),
  fontSize: z.string().default('72px').describe('Font size for the title text'),
  fontFamily: z.string().default('Orbitron').describe('Font family (default: Orbitron for cyberpunk look)'),
  glitchSound: z.string().optional().describe('Optional audio source for glitch sound effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    title,
    duration,
    fontSize,
    fontFamily,
    glitchSound,
  } = params;

  const containerId = 'glitch-scale-bounce-container';
  const redLayerId = 'red-layer';
  const blueLayerId = 'blue-layer';
  const greenLayerId = 'green-layer';
  const audioId = 'glitch-audio';

  // Calculate timing for flicker/jitter effects (0-30% of duration)
  const corruptionDuration = duration * 0.3;

  // RGB text layers (all three layers for chromatic aberration)
  const textLayers = [
    {
      id: redLayerId,
      color: '#ff0000',
      mixBlendMode: 'screen',
      translateX: -2,
    },
    {
      id: blueLayerId,
      color: '#0000ff',
      mixBlendMode: 'screen',
      translateX: 2,
    },
    {
      id: greenLayerId,
      color: '#00ff00',
      mixBlendMode: 'normal',
      translateX: 0,
    },
  ];

  const textLayerNodes = textLayers.map((layer) => ({
    id: layer.id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: title,
      style: {
        fontSize,
        fontWeight: 'bold',
        color: layer.color,
        mixBlendMode: layer.mixBlendMode,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        position: 'absolute',
      },
      font: {
        family: fontFamily,
        weights: ['700', '900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  })) as RenderableComponentData[];

  // Scale bounce effect with stepped keyframes (mechanical, frame-stepping feel)
  const scaleEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [redLayerId, blueLayerId, greenLayerId],
    ranges: [
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: 0, prog: 0.1 },
      { key: 'scale', val: 0.5, prog: 0.11 },
      { key: 'scale', val: 0.8, prog: 0.2 },
      { key: 'scale', val: 1.3, prog: 0.21 },
      { key: 'scale', val: 0.95, prog: 0.4 },
      { key: 'scale', val: 1.05, prog: 0.55 },
      { key: 'scale', val: 1, prog: 0.7 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Red layer chromatic offset
  const redOffsetEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [redLayerId],
    ranges: [
      { key: 'translateX', val: -4, prog: 0 },
      { key: 'translateX', val: -4, prog: 0.3 },
      { key: 'translateX', val: -2, prog: 0.5 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Blue layer chromatic offset
  const blueOffsetEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [blueLayerId],
    ranges: [
      { key: 'translateX', val: 4, prog: 0 },
      { key: 'translateX', val: 4, prog: 0.3 },
      { key: 'translateX', val: 2, prog: 0.5 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Opacity flicker effect (data corruption during 0-30%)
  const flickerEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: corruptionDuration,
    mode: 'provider',
    targetIds: [redLayerId, blueLayerId, greenLayerId],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 0.1 },
      { key: 'opacity', val: 1, prog: 0.12 },
      { key: 'opacity', val: 0.3, prog: 0.25 },
      { key: 'opacity', val: 1, prog: 0.27 },
      { key: 'opacity', val: 0, prog: 0.5 },
      { key: 'opacity', val: 1, prog: 0.52 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Position jitter effect (Y-axis jitter during 0-30%)
  const jitterEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: corruptionDuration,
    mode: 'provider',
    targetIds: [redLayerId, blueLayerId, greenLayerId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: 3, prog: 0.08 },
      { key: 'translateY', val: -2, prog: 0.16 },
      { key: 'translateY', val: 2, prog: 0.24 },
      { key: 'translateY', val: -3, prog: 0.32 },
      { key: 'translateY', val: 0, prog: 0.4 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Construct effect nodes
  const effects = [
    {
      id: 'scale-bounce-effect',
      componentId: 'generic',
      data: scaleEffect,
    },
    {
      id: 'red-chromatic-offset',
      componentId: 'generic',
      data: redOffsetEffect,
    },
    {
      id: 'blue-chromatic-offset',
      componentId: 'generic',
      data: blueOffsetEffect,
    },
    {
      id: 'opacity-flicker',
      componentId: 'generic',
      data: flickerEffect,
    },
    {
      id: 'position-jitter',
      componentId: 'generic',
      data: jitterEffect,
    },
  ];

  // Optional audio atom
  const audioNode = glitchSound
    ? ({
        id: audioId,
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: glitchSound,
          volume: 0.5,
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Root container with 'relative isolate' for stacking context
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative isolate w-full h-full bg-black flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects,
    childrenData: [
      ...textLayerNodes,
      ...(audioNode ? [audioNode] : []),
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-scale-bounce',
  title: 'Glitch Scale Bounce - Cyberpunk Title Effect',
  description:
    'A glitchy, digital-style scale bounce effect inspired by cyberpunk aesthetics and video game UI. Features deliberate frame-stepping (stuttery motion), RGB chromatic aberration, data-corruption effects (opacity flickers, position jitters), and mechanical, angular bounce.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'glitch',
    'cyberpunk',
    'scale',
    'bounce',
    'chromatic-aberration',
    'rgb-split',
    'mechanical',
    'angular',
    'digital',
    'video-game',
    'ui',
    'corruption',
    'frame-stepping',
  ],
  defaultInputParams: {
    title: 'CYBER TITLE',
    duration: 2.5,
    fontSize: '72px',
    fontFamily: 'Orbitron',
  },
  dependencies: {},
};

// Export preset
export const glitchScaleBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
