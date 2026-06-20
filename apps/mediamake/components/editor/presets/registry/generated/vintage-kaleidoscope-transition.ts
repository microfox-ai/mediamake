/**
 * Vintage Kaleidoscope Transition Preset
 *
 * This preset creates a vintage projection-inspired kaleidoscope transition that fragments
 * the outgoing video into triangular segments that rotate and multiply like a kaleidoscope
 * pattern, gradually morphing into the incoming video through the same prismatic effect.
 *
 * Features:
 * - **Triangular Fragmentation**: Outgoing video fragments into 6 triangular segments
 * - **Kaleidoscope Rotation**: Each segment rotates at varying speeds (30-360deg)
 * - **Prismatic Morphing**: Incoming video assembles from fragmented state to normal
 * - **Rainbow Refraction**: Conic gradient overlay creates light refraction effects
 * - **Screen Blend Mode**: Light leak effects for vintage projection feel
 * - **Color Wheel Effect**: Optional hue-rotate animation for mechanical color wheel
 * - **Mechanical Rotation**: Smooth easing with varying speeds per segment
 *
 * Use cases:
 * - Creating vintage film projector transitions
 * - Adding psychedelic kaleidoscope effects between videos
 * - Building retro-style video transitions with prismatic effects
 * - Creating artistic morphing transitions with rainbow refractions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of the kaleidoscope transition in seconds'),
  rotationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Multiplier for rotation speeds (higher = more intense rotation)',
    ),
  colorWheelEffect: z
    .boolean()
    .default(true)
    .describe('Enable hue-rotate animation for color wheel effect'),
  refractionIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Intensity of rainbow refraction overlay (0-1)'),
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
    rotationIntensity,
    colorWheelEffect,
    refractionIntensity,
  } = params;

  // Define clip paths for 6 triangular segments radiating from center
  const segmentClipPaths = [
    'polygon(50% 50%, 50% 0%, 100% 0%)', // Top-right
    'polygon(50% 50%, 100% 0%, 100% 50%)', // Right-top
    'polygon(50% 50%, 100% 50%, 100% 100%)', // Right-bottom
    'polygon(50% 50%, 100% 100%, 50% 100%)', // Bottom-right
    'polygon(50% 50%, 50% 100%, 0% 100%)', // Bottom-left
    'polygon(50% 50%, 0% 100%, 0% 50%)', // Left-bottom
  ];

  // Define varying rotation speeds for each segment (degrees)
  const rotationSpeeds = [30, 60, 120, 180, 240, 360].map(
    (deg) => deg * rotationIntensity,
  );

  // Create outgoing video segments
  const outgoingSegments: RenderableComponentData[] = segmentClipPaths.map(
    (clipPath, index) => ({
      id: `outgoing-segment-${index}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover',
        muted: true,
        className: 'absolute inset-0 w-full h-full',
        style: {
          clipPath,
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Rotate out effect
        {
          id: `outgoing-rotate-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`outgoing-segment-${index}`],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationSpeeds[index], prog: 1 },
            ],
          },
        },
        // Fade out effect
        {
          id: `outgoing-fade-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration * 0.5,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: [`outgoing-segment-${index}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create incoming video segments
  const incomingSegments: RenderableComponentData[] = segmentClipPaths.map(
    (clipPath, index) => ({
      id: `incoming-segment-${index}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        fit: 'cover',
        muted: true,
        className: 'absolute inset-0 w-full h-full',
        style: {
          clipPath,
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Rotate in effect (reverse rotation)
        {
          id: `incoming-rotate-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`incoming-segment-${index}`],
            ranges: [
              { key: 'rotate', val: -rotationSpeeds[index], prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
        // Fade in effect
        {
          id: `incoming-fade-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: [`incoming-segment-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create outgoing segments container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-kaleidoscope-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: outgoingSegments,
  };

  // Create incoming segments container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-kaleidoscope-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: incomingSegments,
  };

  // Create rainbow refraction overlay
  const refractionOverlay: RenderableComponentData = {
    id: 'rainbow-refraction-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
          background: `conic-gradient(from 0deg at 50% 50%, rgba(255,0,0,${refractionIntensity}) 0deg, rgba(255,127,0,${refractionIntensity}) 60deg, rgba(255,255,0,${refractionIntensity}) 120deg, rgba(0,255,0,${refractionIntensity}) 180deg, rgba(0,0,255,${refractionIntensity}) 240deg, rgba(139,0,255,${refractionIntensity}) 300deg, rgba(255,0,0,${refractionIntensity}) 360deg)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: colorWheelEffect
      ? [
          {
            id: 'color-wheel-rotation',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['rainbow-refraction-overlay'],
              ranges: [
                { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
                { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
              ],
            },
          },
        ]
      : [],
    childrenData: [],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-kaleidoscope-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
    childrenData: [outgoingContainer, incomingContainer, refractionOverlay],
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
  id: 'vintage-kaleidoscope-transition',
  title: 'Vintage Kaleidoscope Transition',
  description:
    'A vintage projection-inspired kaleidoscope transition that fragments videos into rotating triangular segments with rainbow light refractions and mechanical rotation effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'kaleidoscope',
    'vintage',
    'prismatic',
    'rotation',
    'refraction',
    'projection',
    'retro',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1,
    rotationIntensity: 1,
    colorWheelEffect: true,
    refractionIntensity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageKaleidoscopeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
