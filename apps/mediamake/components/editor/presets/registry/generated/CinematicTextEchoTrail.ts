/**
 * Cinematic Text Echo Trail Effect Preset
 *
 * This preset creates a cinematic echo trail effect where text leaves behind multiple
 * ghosted duplicates that fade out with decreasing opacity and scale over time. The main
 * text appears solid and bright, while 3-5 ghost copies trail behind it with a slight
 * delay, creating a dramatic motion trail effect.
 *
 * Features:
 * - **Multiple Ghost Layers**: 4 ghost duplicates with staggered timing (0.1s, 0.2s, 0.3s, 0.4s)
 * - **Progressive Fade**: Ghosts decrease in opacity (60%, 35%, 15%, 5%)
 * - **Perspective Effect**: Ghosts scale down (0.95x, 0.9x, 0.85x, 0.8x) for depth
 * - **Depth Blur**: Optional progressive blur on ghosts for enhanced depth
 * - **Main Text Entrance**: Solid main text with smooth entrance animation
 * - **GPU Accelerated**: Uses transform properties for optimal performance
 * - **Customizable**: Font, size, color, duration, and effect intensity
 *
 * Use cases:
 * - Creating dramatic title reveals
 * - Building cinematic text transitions
 * - Adding motion trail effects to headings
 * - Creating video game-style text effects
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
  text: z.string().describe('Text content to display with echo trail effect'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the text display in seconds'),
  fontSize: z
    .string()
    .default('72px')
    .describe('Font size for the text (e.g., "72px", "4rem")'),
  color: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex or CSS format (e.g., "#ffffff", "rgb(255,255,255)")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto", "Montserrat")'),
  entranceDuration: z
    .number()
    .default(0.8)
    .optional()
    .describe('Duration of the main text entrance animation in seconds'),
  ghostDecayDuration: z
    .number()
    .default(1.5)
    .optional()
    .describe('Duration for ghost layers to fully fade out in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'echo-trail-container';
  const mainTextId = 'main-text';

  // Ghost layer configurations
  const ghostLayers = [
    {
      id: 'ghost-layer-5',
      startDelay: 0.4,
      initialOpacity: 0.05,
      initialScale: 0.8,
      finalScale: 0.7,
      initialBlur: 8,
      finalBlur: 12,
      zIndex: 1,
    },
    {
      id: 'ghost-layer-4',
      startDelay: 0.3,
      initialOpacity: 0.15,
      initialScale: 0.85,
      finalScale: 0.75,
      initialBlur: 6,
      finalBlur: 10,
      zIndex: 2,
    },
    {
      id: 'ghost-layer-3',
      startDelay: 0.2,
      initialOpacity: 0.35,
      initialScale: 0.9,
      finalScale: 0.8,
      initialBlur: 4,
      finalBlur: 8,
      zIndex: 3,
    },
    {
      id: 'ghost-layer-2',
      startDelay: 0.1,
      initialOpacity: 0.6,
      initialScale: 0.95,
      finalScale: 0.85,
      initialBlur: 2,
      finalBlur: 6,
      zIndex: 4,
    },
  ];

  // Create ghost text components
  const ghostComponents: RenderableComponentData[] = ghostLayers.map(
    (ghost) => {
      const ghostDecayDuration = params.ghostDecayDuration ?? 1.5;

      const ghostEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: ghostDecayDuration,
        mode: 'provider',
        targetIds: [ghost.id],
        ranges: [
          // Opacity fade
          { key: 'opacity', val: ghost.initialOpacity, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          // Scale down
          { key: 'scale', val: ghost.initialScale, prog: 0 },
          { key: 'scale', val: ghost.finalScale, prog: 1 },
          // Blur increase
          { key: 'blur', val: `${ghost.initialBlur}px`, prog: 0 },
          { key: 'blur', val: `${ghost.finalBlur}px`, prog: 1 },
        ],
      };

      return {
        id: ghost.id,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: '700',
            color: params.color,
            textAlign: 'center',
            zIndex: ghost.zIndex,
            willChange: 'opacity, transform',
          },
          font: {
            family: params.fontFamily,
            weights: ['700'],
            display: 'swap',
          },
          className: 'absolute inset-0 flex items-center justify-center',
        },
        context: {
          timing: {
            start: ghost.startDelay,
            duration: params.duration - ghost.startDelay,
          },
        },
        effects: [
          {
            id: `${ghost.id}-fade`,
            componentId: 'generic',
            data: ghostEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Main text effect
  const mainTextEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.entranceDuration ?? 0.8,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      // Fade in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
      // Scale in
      { key: 'scale', val: 0.9, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Main text component
  const mainTextComponent: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: '700',
        color: params.color,
        textAlign: 'center',
        zIndex: 5,
        textShadow: '0 0 20px rgba(255,255,255,0.5)',
        willChange: 'opacity, transform',
      },
      font: {
        family: params.fontFamily,
        weights: ['700'],
        display: 'swap',
      },
      className: 'absolute inset-0 flex items-center justify-center',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'main-text-entrance',
        componentId: 'generic',
        data: mainTextEffect,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [...ghostComponents, mainTextComponent] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'CinematicTextEchoTrail',
  title: 'Cinematic Text Echo Trail Effect',
  description:
    'Creates a cinematic echo trail effect where text leaves behind 4 ghosted duplicates that fade out with decreasing opacity (60%, 35%, 15%, 5%) and scale (0.95x, 0.9x, 0.85x, 0.8x). Main text appears solid and bright while ghost copies trail behind with staggered timing (0.1-0.2s delays), creating a dramatic motion trail effect like text moving through space.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'echo',
    'trail',
    'ghost',
    'cinematic',
    'motion',
    'fade',
    'scale',
    'blur',
    'dramatic',
    'title',
    'effect',
  ],
  defaultInputParams: {
    text: 'ECHO TRAIL',
    duration: 5,
    fontSize: '72px',
    color: '#ffffff',
    fontFamily: 'Inter',
    entranceDuration: 0.8,
    ghostDecayDuration: 1.5,
  },
  dependencies: {},
};

export const CinematicTextEchoTrailPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
