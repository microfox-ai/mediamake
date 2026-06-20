/**
 * Halftone Reveal Card Flip Transition Preset
 *
 * This preset creates a card flip transition with a spinning coin effect enhanced by a comic-book style
 * halftone pattern overlay. As the first image flips away (Y-axis rotation), a dot pattern (halftone) 
 * appears, scales, and dissolves at the midpoint, creating a pop-art aesthetic during the transition. 
 * The incoming image emerges through the dissolving halftone with subtle color shifts 
 * (hue rotation and saturation boost) to make it "pop".
 *
 * Features:
 * - Y-axis card flip rotation with perspective-1000
 * - Outgoing image: rotateY [0 → 90deg], grayscale + contrast filters, opacity fade at 45-55%
 * - Halftone overlay: repeating-radial-gradient pattern, opacity [0 → 0.8 → 0] at 35-65%, scale [0.8 → 1.2 → 1]
 * - Incoming image: rotateY [-90deg → 0deg], saturate [0.8 → 1.1] and hue-rotate [10deg → 0deg] for pop effect
 * - Mix-blend-mode overlay on halftone layer
 * - Container: overflow-hidden, bg-black for clean edges
 *
 * Technical Specifications:
 * - BaseLayout duration = media durations - 0.9s overlap
 * - Outgoing ImageAtom: rotateY [0 → 90deg], filter grayscale [0 → 0.3] and contrast [1 → 1.2], opacity [1 → 0] at 45-55%
 * - Halftone ShapeAtom: absolute inset-0 z-25, opacity [0 → 0.8 → 0] at 35-65%, scale [0.8 → 1.2 → 1]
 * - Incoming ImageAtom: rotateY [-90deg → 0deg], filter saturate [0.8 → 1.1] and hue-rotate [10deg → 0deg]
 * - Overflow-hidden on container, bg-black
 *
 * Use cases:
 * - Creating dynamic card flip transitions between images or videos
 * - Building engaging social media content with pop-art aesthetics
 * - Adding visual texture to image transitions
 * - Creating retro/comic-book styled video effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImageUrl: z
    .string()
    .describe('URL of the outgoing image (flips away)'),
  incomingImageUrl: z
    .string()
    .describe('URL of the incoming image (flips in)'),
  outgoingDuration: z
    .number()
    .default(5)
    .describe('Duration of the outgoing image in seconds'),
  incomingDuration: z
    .number()
    .default(5)
    .describe('Duration of the incoming image in seconds'),
  transitionOverlap: z
    .number()
    .default(0.9)
    .describe('Overlap duration for transition in seconds (default 0.9s)'),
  perspective: z
    .number()
    .default(1000)
    .describe('CSS perspective value for 3D effect (default 1000px)'),
  halftoneColor: z
    .string()
    .default('#000000')
    .describe('Color of the halftone dot pattern (default black)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color of the container (default black)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImageUrl,
    incomingImageUrl,
    outgoingDuration,
    incomingDuration,
    transitionOverlap,
    perspective,
    halftoneColor,
    backgroundColor,
  } = params;

  // Calculate total container duration (sum of durations minus overlap)
  const totalDuration = outgoingDuration + incomingDuration - transitionOverlap;

  // Timing calculations
  const outgoingStart = 0;
  const outgoingEnd = outgoingDuration;
  const incomingStart = outgoingDuration - transitionOverlap;

  // Halftone timing: appears at 35% mark (0.315s into 0.9s transition), lasts 30% (0.27s)
  const halftoneStart = incomingStart + transitionOverlap * 0.35;
  const halftoneDuration = transitionOverlap * 0.3;

  // Effect timings (relative to component start)
  const outgoingRotateStart = outgoingDuration - transitionOverlap;
  const outgoingRotateDuration = transitionOverlap / 2;
  const outgoingFadeStart = outgoingDuration - transitionOverlap * 0.55;
  const outgoingFadeDuration = transitionOverlap * 0.1;

  const incomingRotateStart = 0;
  const incomingRotateDuration = transitionOverlap / 2;

  // Build the composition structure
  const outgoingImage: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: outgoingImageUrl,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        backfaceVisibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingEnd,
      },
    },
    effects: [
      // Rotate Y: 0 → 90deg during second half of flip
      {
        id: 'outgoing-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingRotateStart,
          duration: outgoingRotateDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 90, prog: 1 },
          ],
        },
      },
      // Grayscale and contrast filters during rotation
      {
        id: 'outgoing-filter-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingRotateStart,
          duration: outgoingRotateDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'filter', val: 'grayscale(0) contrast(1)', prog: 0 },
            {
              key: 'filter',
              val: 'grayscale(0.3) contrast(1.2)',
              prog: 1,
            },
          ],
        },
      },
      // Opacity fade at 45-55% of transition
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingFadeStart,
          duration: outgoingFadeDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingImage: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: incomingImageUrl,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        backfaceVisibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      // Rotate Y: -90deg → 0deg during first half of flip
      {
        id: 'incoming-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: incomingRotateStart,
          duration: incomingRotateDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'rotateY', val: -90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      // Saturate: 0.8 → 1.1 for pop effect
      {
        id: 'incoming-saturate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: incomingRotateStart,
          duration: incomingRotateDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'filter', val: 'saturate(0.8) hue-rotate(10deg)', prog: 0 },
            { key: 'filter', val: 'saturate(1.1) hue-rotate(0deg)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Halftone overlay using HTMLBlockAtom with CSS repeating-radial-gradient
  const halftoneOverlay: RenderableComponentData = {
    id: 'halftone-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="halftone-pattern" style="width: 100%; height: 100%; background-image: repeating-radial-gradient(circle at 50% 50%, ${halftoneColor} 0px, transparent 2px, transparent 8px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 25,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: halftoneStart,
        duration: halftoneDuration,
      },
    },
    effects: [
      // Opacity: 0 → 0.8 → 0 (peaks at midpoint)
      {
        id: 'halftone-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: halftoneDuration,
          mode: 'provider',
          targetIds: ['halftone-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Scale: 0.8 → 1.2 → 1 (synchronized with opacity)
      {
        id: 'halftone-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: halftoneDuration,
          mode: 'provider',
          targetIds: ['halftone-overlay'],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Flip stage container (holds both images with 3D transforms)
  const flipStage: RenderableComponentData = {
    id: 'flip-stage',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
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
    childrenData: [outgoingImage, incomingImage],
  };

  // Root container with perspective and overflow-hidden
  const rootContainer: RenderableComponentData = {
    id: 'halftone-card-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          perspective: `${perspective}px`,
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [flipStage, halftoneOverlay],
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
  id: 'halftone-card-flip-transition',
  title: 'Halftone Reveal Card Flip Transition',
  description:
    'A card flip transition with spinning coin effect enhanced by comic-book halftone pattern overlay. As images flip with Y-axis rotation, a dot pattern overlay appears, scales, and dissolves, creating a pop-art aesthetic. Includes subtle color shifts (hue rotation and saturation boost) for visual impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'flip',
    'card',
    'halftone',
    'pop-art',
    'comic-book',
    'spinning-coin',
    'image',
  ],
  defaultInputParams: {
    outgoingImageUrl: 'https://picsum.photos/1920/1080',
    incomingImageUrl: 'https://picsum.photos/1920/1080?random=1',
    outgoingDuration: 5,
    incomingDuration: 5,
    transitionOverlap: 0.9,
    perspective: 1000,
    halftoneColor: '#000000',
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const halftoneCardFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
