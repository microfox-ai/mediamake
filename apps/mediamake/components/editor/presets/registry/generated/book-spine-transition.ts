/**
 * Book Spine Transition Preset
 *
 * This preset creates a unique page-flip transition effect that simulates viewing a book 
 * from the spine side. The outgoing content compresses horizontally to a thin vertical 
 * line at the center while the incoming content expands from a similar compressed state.
 *
 * Features:
 * - **Horizontal Compression**: Content scales to 0.001 on X-axis, creating a thin vertical line
 * - **Realistic Lighting**: Highlights on the spine edge and shadows on either side
 * - **Page Texture**: Subtle texture overlay visible during compression
 * - **3D Depth**: Optional rotateY and rotateZ for depth perception
 * - **Center Positioning**: Both contents positioned at center using translate
 * - **Smooth Easing**: Custom cubic-bezier for natural book-flipping motion
 *
 * Use cases:
 * - Creating unique page-turn transitions between scenes
 * - Building book-inspired navigation effects
 * - Adding literary-themed transitions to video content
 * - Creating visually interesting scene changes from an unusual angle
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingContent: z.object({
    id: z.string().describe('ID of the outgoing content component'),
    duration: z.number().describe('Duration of the outgoing content in seconds'),
  }).describe('Configuration for outgoing content'),
  
  incomingContent: z.object({
    id: z.string().describe('ID of the incoming content component'),
    duration: z.number().describe('Duration of the incoming content in seconds'),
  }).describe('Configuration for incoming content'),
  
  transitionDuration: z.number()
    .min(0.3)
    .max(2.0)
    .default(0.8)
    .describe('Duration of the transition effect in seconds'),
  
  depthRotation: z.number()
    .min(0)
    .max(15)
    .default(7)
    .describe('Rotation angle in degrees for 3D depth effect (0-15)'),
  
  tiltRotation: z.number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Slight tilt rotation in degrees during compression (0-5)'),
  
  spineHighlightIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of the spine highlight effect (0-1)'),
  
  shadowIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of the shadow effects (0-1)'),
  
  pageTextureIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of the page texture overlay (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingContent,
    incomingContent,
    transitionDuration,
    depthRotation,
    tiltRotation,
    spineHighlightIntensity,
    shadowIntensity,
    pageTextureIntensity,
  } = params;

  // Calculate timings
  const totalDuration = outgoingContent.duration + incomingContent.duration - transitionDuration;
  const transitionMidpoint = outgoingContent.duration - transitionDuration / 2;
  
  // Outgoing content: starts at 0, lasts full duration
  const outgoingStart = 0;
  const outgoingDuration = outgoingContent.duration;
  
  // Incoming content: starts before outgoing ends (overlap for transition)
  const incomingStart = outgoingContent.duration - transitionDuration;
  const incomingDuration = incomingContent.duration + transitionDuration;

  // Effect timing relative to content start
  const outgoingEffectStart = outgoingContent.duration - transitionDuration;
  const incomingEffectStart = 0;

  // IDs for targeting
  const outgoingWrapperId = 'book-spine-outgoing-wrapper';
  const incomingWrapperId = 'book-spine-incoming-wrapper';
  const spineHighlightId = 'book-spine-highlight';
  const pageTextureId = 'book-spine-texture';

  const childrenData: RenderableComponentData[] = [
    // Outgoing content wrapper
    {
      id: outgoingWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 left-1/2 -translate-x-1/2',
          style: {
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-compress-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [outgoingWrapperId],
            ranges: [
              // Horizontal compression to thin line
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 0.001, prog: 1 },
              // Depth rotation
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: depthRotation, prog: 1 },
              // Slight tilt
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: tiltRotation, prog: 0.5 },
              { key: 'rotateZ', val: 0, prog: 1 },
              // Opacity fade
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-shadow-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [outgoingWrapperId],
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(0 0 0px rgba(0,0,0,0))`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(${10 * shadowIntensity}px 0 ${20 * shadowIntensity}px rgba(0,0,0,${0.3 * shadowIntensity}))`,
                prog: 0.5,
              },
              {
                key: 'filter',
                val: `drop-shadow(${5 * shadowIntensity}px 0 ${10 * shadowIntensity}px rgba(0,0,0,${0.2 * shadowIntensity}))`,
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [],
    },
    
    // Incoming content wrapper
    {
      id: incomingWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 left-1/2 -translate-x-1/2',
          style: {
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        {
          id: 'incoming-expand-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [incomingWrapperId],
            ranges: [
              // Horizontal expansion from thin line
              { key: 'scaleX', val: 0.001, prog: 0 },
              { key: 'scaleX', val: 1, prog: 1 },
              // Depth rotation
              { key: 'rotateY', val: -depthRotation, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              // Slight tilt
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: -tiltRotation, prog: 0.5 },
              { key: 'rotateZ', val: 0, prog: 1 },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-shadow-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [incomingWrapperId],
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(-${5 * shadowIntensity}px 0 ${10 * shadowIntensity}px rgba(0,0,0,${0.2 * shadowIntensity}))`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(-${10 * shadowIntensity}px 0 ${20 * shadowIntensity}px rgba(0,0,0,${0.3 * shadowIntensity}))`,
                prog: 0.5,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 0px rgba(0,0,0,0))`,
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [],
    },

    // Spine highlight line
    {
      id: spineHighlightId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 left-1/2 w-px pointer-events-none',
          style: {
            transform: 'translateX(-50%)',
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,${0.5 * spineHighlightIntensity}), transparent)`,
          },
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: 'spine-highlight-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [spineHighlightId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: spineHighlightIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              // Subtle width pulse
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 3, prog: 0.5 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },

    // Page texture overlay
    {
      id: pageTextureId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,${0.02 * pageTextureIntensity}) 2px, rgba(0,0,0,${0.02 * pageTextureIntensity}) 3px)`,
            mixBlendMode: 'multiply',
          },
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: 'page-texture-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pageTextureId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: pageTextureIntensity, prog: 0.3 },
              { key: 'opacity', val: pageTextureIntensity, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'book-spine-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-100',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'book-spine-transition',
  title: 'Book Spine Transition',
  description: 'A unique page-flip transition effect that simulates viewing a book from the spine side. The outgoing content compresses horizontally to a thin vertical line at center while the incoming content expands from a similar compressed state. Features realistic lighting effects with highlights on the spine edge, shadows on either side, subtle page texture during compression, and optional rotateY/rotateZ for depth perception. Creates the feeling of flipping through a physical book viewed from an unusual angle.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'book', 'spine', 'page-flip', 'compression', 'lighting', 'texture', '3d-depth'],
  defaultInputParams: {
    outgoingContent: {
      id: 'outgoing-scene',
      duration: 5,
    },
    incomingContent: {
      id: 'incoming-scene',
      duration: 5,
    },
    transitionDuration: 0.8,
    depthRotation: 7,
    tiltRotation: 2,
    spineHighlightIntensity: 0.7,
    shadowIntensity: 0.4,
    pageTextureIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bookSpineTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
