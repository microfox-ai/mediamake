/**
 * Masking Tape Venetian Blind Transition Preset
 *
 * This preset creates a 3D venetian blind transition effect using horizontal strips
 * of masking tape that rotate sequentially from top to bottom to reveal the incoming video.
 * Each tape strip features realistic texture with semi-gloss finish, visible thickness,
 * shadow, and lighting changes during rotation.
 *
 * Features:
 * - 15 horizontal tape strips with 3D perspective
 * - Sequential rotation animation (top to bottom)
 * - Realistic masking tape appearance (amber-100 to yellow-50 gradient)
 * - 3D depth effects with translateZ during rotation
 * - Brightness animation to simulate lighting changes
 * - Smooth fade-out after rotation completes
 * - Wave-like reveal pattern with staggered timing
 *
 * Technical Implementation:
 * - Container with perspective(1000px) for 3D space
 * - 15 strips, each 7% height with slight overlap (1px)
 * - rotateX animation from 0deg to 90deg over 400ms
 * - 80ms stagger delay between strips (top to bottom)
 * - Brightness filter from 100% to 80% during rotation
 * - Opacity fade from 1 to 0 after rotation
 * - cubic-bezier(0.4, 0, 0.6, 1) easing for smooth motion
 *
 * Use cases:
 * - Creative video transitions with tactile feel
 * - Reveal effects for promotional content
 * - Scene transitions in storytelling videos
 * - Dynamic presentation slides
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z.number().default(1.7).describe('Total transition duration in seconds'),
  stripRotationDuration: z.number().default(0.4).describe('Duration of each strip rotation in seconds'),
  stripStaggerDelay: z.number().default(0.08).describe('Delay between each strip rotation in seconds'),
  fadeOutDuration: z.number().default(0.2).describe('Duration of strip fade-out after rotation in seconds'),
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
    stripRotationDuration,
    stripStaggerDelay,
    fadeOutDuration,
  } = params;

  const numberOfStrips = 15;
  const stripHeight = 7; // percentage
  const stripOverlap = 1; // px (slight overlap to avoid gaps)

  // Calculate strip positions with slight overlap
  const calculateStripTop = (index: number): string => {
    // Each strip takes 100/15 = 6.667% spacing, but strip height is 7%
    const spacing = 100 / numberOfStrips;
    const top = index * spacing;
    return `${top.toFixed(2)}%`;
  };

  // Create tape strips with effects
  const tapeStrips: RenderableComponentData[] = Array.from({ length: numberOfStrips }, (_, index) => {
    const stripId = `tape-strip-${index}`;
    const rotationStartTime = index * stripStaggerDelay;
    const fadeOutStartTime = rotationStartTime + stripRotationDuration;

    return {
      id: stripId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(to right, #fef3c7, #fef9c3); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"></div>`,
        className: 'absolute w-full',
        style: {
          height: `${stripHeight}%`,
          top: calculateStripTop(index),
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
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
        // Rotation effect with translateZ and brightness
        {
          id: `${stripId}-rotation`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.6, 1)',
            start: rotationStartTime,
            duration: stripRotationDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              // Rotate around X axis
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 90, prog: 1 },
              // Add depth with translateZ
              { key: 'translateZ', val: '0px', prog: 0 },
              { key: 'translateZ', val: '20px', prog: 0.5 },
              { key: 'translateZ', val: '0px', prog: 1 },
              // Brightness change to simulate lighting
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: 'brightness(0.8)', prog: 1 },
            ],
          },
        },
        // Fade out after rotation
        {
          id: `${stripId}-fade-out`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: fadeOutStartTime,
            duration: fadeOutDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Build the complete composition
  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-venetian-blind-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Outgoing video (underneath)
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
            zIndex: 1,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Incoming video (behind strips)
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
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
      // Tape strips container
      {
        id: 'tape-strips-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 2,
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: tapeStrips,
      } as RenderableComponentData,
    ],
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
  id: 'masking-tape-venetian-blind-transition',
  title: 'Masking Tape Venetian Blind Transition',
  description: 'A 3D venetian blind transition using horizontal masking tape strips that rotate sequentially from top to bottom to reveal incoming video. Each strip features realistic tape texture with semi-gloss finish, visible thickness, shadow, and lighting changes during rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'venetian-blind', 'masking-tape', '3d', 'rotation', 'reveal'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 1.7,
    stripRotationDuration: 0.4,
    stripStaggerDelay: 0.08,
    fadeOutDuration: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapeVenetianBlindTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
