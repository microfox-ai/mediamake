/**
 * 3D Card Flip Transition Preset
 *
 * This preset creates a true 3D card flip transition simulating a coin spinning on its vertical axis.
 * Features synchronized rotateY animations, perspective distortion, midpoint glint effect, scaleX compression
 * at edge-on position, and dynamic drop shadow that shifts during rotation.
 *
 * The transition simulates a coin flip where:
 * - Outgoing image rotates from 0° to 90° on Y-axis (becoming edge-on)
 * - Incoming image rotates from -90° to 0° on Y-axis (rotating in from opposite side)
 * - At the midpoint (90° edge-on), a brief flash/glint effect pulses
 * - ScaleX compression enhances the edge-on illusion
 * - Drop shadow shifts to ground the 3D effect
 *
 * Use cases:
 * - YouTube thumbnail transitions
 * - Image reveal effects
 * - Product showcases with flip animation
 * - Dynamic image galleries
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media (image/video)'),
      type: z.enum(['image', 'video']).describe('Type of outgoing media'),
      duration: z.number().describe('Duration of outgoing media in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media (image/video)'),
      type: z.enum(['image', 'video']).describe('Type of incoming media'),
      duration: z.number().describe('Duration of incoming media in seconds'),
    })
    .describe('Incoming media configuration'),
  overlapDuration: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.7)
    .describe('Duration of flip transition overlap in seconds (0.6-0.8 recommended)'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective depth in pixels (default: 1000px)'),
  glintIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of midpoint glint effect (0-1)'),
  shadowStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Strength of drop shadow effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    overlapDuration,
    perspective,
    glintIntensity,
    shadowStrength,
  } = params;

  // Calculate total duration (sum of media durations minus overlap)
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Calculate transition midpoint (when both images are edge-on at 90°)
  const transitionStart = media1.duration - overlapDuration;
  const transitionMidpoint = transitionStart + overlapDuration / 2;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create outgoing media with flip-out animation
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
        backfaceVisibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-flip-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart,
          duration: overlapDuration / 2,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            // Rotate Y from 0° to 90° (first half of flip)
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 90, prog: 1 },
            // Compress scaleX to enhance edge-on illusion
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 0.1, prog: 1 },
            // Fade out opacity
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Shift drop shadow (left to center)
            {
              key: 'filter',
              val: `drop-shadow(-${shadowStrength * 20}px 0 ${shadowStrength * 30}px rgba(0,0,0,${shadowStrength}))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${shadowStrength * 10}px rgba(0,0,0,${shadowStrength * 0.5}))`,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Create incoming media with flip-in animation
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
        backfaceVisibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: transitionMidpoint, // Start when outgoing reaches 90°
        duration: media2.duration + overlapDuration / 2,
      },
    },
    effects: [
      {
        id: 'incoming-flip-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming media start
          duration: overlapDuration / 2,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            // Rotate Y from -90° to 0° (second half of flip)
            { key: 'rotateY', val: -90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            // Expand scaleX from compressed to normal
            { key: 'scaleX', val: 0.1, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
            // Fade in opacity
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Shift drop shadow (center to right)
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${shadowStrength * 10}px rgba(0,0,0,${shadowStrength * 0.5}))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(${shadowStrength * 20}px 0 ${shadowStrength * 30}px rgba(0,0,0,${shadowStrength}))`,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Create glint/flash effect at midpoint using HTMLBlockAtom
  const glintFlash: RenderableComponentData = {
    id: 'glint-flash',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,${glintIntensity}) 50%, transparent 100%);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: transitionMidpoint - overlapDuration * 0.02, // Start slightly before midpoint
        duration: overlapDuration * 0.04, // Brief flash duration (4% of overlap)
      },
    },
    effects: [
      {
        id: 'glint-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration * 0.04,
          mode: 'provider',
          targetIds: ['glint-flash'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'card-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingMedia, incomingMedia, glintFlash],
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
  id: 'card-flip-3d-transition',
  title: '3D Card Flip Transition',
  description:
    'True 3D card flip transition with perspective distortion simulating a coin spinning on its vertical axis to reveal images. Features synchronized rotateY animations, midpoint glint effect, scaleX compression at edge-on position, and dynamic drop shadow that shifts during rotation. Optimized for YouTube thumbnails and image transitions with configurable flip duration and easing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'flip', 'card', 'coin', 'spin', 'perspective'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 3,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 3,
    },
    overlapDuration: 0.7,
    perspective: 1000,
    glintIntensity: 0.8,
    shadowStrength: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cardFlip3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
