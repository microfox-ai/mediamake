/**
 * Viscous Gel Membrane Transition Preset
 *
 * Creates a transition effect where videos pass through a thick, elastic liquid barrier.
 * The outgoing video stretches and deforms as if being pulled through gel, while the
 * incoming video pushes through from the opposite side with opposite deformation.
 *
 * Features:
 * - Stretch deformation using scaleX and scaleY with different values
 * - Outgoing stretches horizontally (scaleX: 1→2) while compressing vertically (scaleY: 1→0.3)
 * - Incoming does opposite, starting compressed and expanding
 * - Elastic wobble using spring-like animations with overshoot timing
 * - Glossy gel effect using inset box-shadows and backdrop filters
 * - 3D depth during stretch phase using translateZ
 *
 * Technical Implementation:
 * - Uses cubic-bezier(0.68, -0.55, 0.265, 1.55) for elastic overshoot
 * - Gel overlay with inset box-shadow and backdrop-filter: blur(5px)
 * - Duration: 1.7 seconds
 * - Transition happens with overlap for smooth gel pass-through effect
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).optional().describe('Media type (auto-detected if not provided)'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).optional().describe('Media type (auto-detected if not provided)'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.7)
    .describe('Duration of the gel transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Helper function to detect media type from source URL
  const getMediaType = (src: string, specifiedType?: 'video' | 'image'): 'video' | 'image' => {
    if (specifiedType) return specifiedType;
    if (src.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'video';
    return 'image';
  };

  const outgoingType = getMediaType(outgoingVideo.src, outgoingVideo.type);
  const incomingType = getMediaType(incomingVideo.src, incomingVideo.type);
  const outgoingComponentId = outgoingType === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingType === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing calculation
  const overlapDuration = transitionDuration;
  const incomingStart = 0; // Incoming starts at same time as outgoing for full overlap

  const childrenData: RenderableComponentData[] = [
    // Outgoing video - stretches horizontally and compresses vertically
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
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
        // Stretch and compress effect with elastic timing
        {
          id: 'outgoing-stretch-effect',
          componentId: 'generic',
          data: {
            type: 'spring', // Spring type provides elastic overshoot
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              // ScaleX: 1 → 2 → 0 (horizontal stretch then collapse)
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 2, prog: 0.5 },
              { key: 'scaleX', val: 0, prog: 1 },
              // ScaleY: 1 → 0.3 → 0 (vertical compression then collapse)
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 0.3, prog: 0.5 },
              { key: 'scaleY', val: 0, prog: 1 },
              // TranslateZ for 3D depth during stretch
              { key: 'translateZ', val: '0px', prog: 0 },
              { key: 'translateZ', val: '50px', prog: 0.5 },
              { key: 'translateZ', val: '0px', prog: 1 },
              // Opacity fade
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Gel membrane overlay - appears mid-transition
    {
      id: 'gel-membrane-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 100%); box-shadow: inset 0 0 80px rgba(255,255,255,0.3), inset 0 0 40px rgba(255,255,255,0.2); backdrop-filter: blur(5px); pointer-events: none;"></div>`,
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0.5,
          duration: 0.7,
        },
      },
      effects: [
        // Gel wobble effect
        {
          id: 'gel-wobble-effect',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: 0.7,
            mode: 'provider',
            targetIds: ['gel-membrane-overlay'],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video - starts compressed, expands to normal
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0.85, // Starts mid-transition
          duration: transitionDuration,
        },
      },
      effects: [
        // Inverse stretch effect - starts compressed, expands
        {
          id: 'incoming-expand-effect',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              // ScaleX: 0 → 0.5 → 1 (horizontal expansion)
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 0.5, prog: 0.5 },
              { key: 'scaleX', val: 1, prog: 1 },
              // ScaleY: 0 → 1.5 → 1 (vertical expansion with overshoot)
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1.5, prog: 0.5 },
              { key: 'scaleY', val: 1, prog: 1 },
              // TranslateZ for 3D depth
              { key: 'translateZ', val: '0px', prog: 0 },
              { key: 'translateZ', val: '-50px', prog: 0.5 },
              { key: 'translateZ', val: '0px', prog: 1 },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'viscous-gel-membrane-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px', // Enable 3D transforms
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration * 1.5, // Extended to cover full incoming animation
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
  id: 'viscous-gel-membrane-transition',
  title: 'Viscous Gel Membrane Transition',
  description:
    'A transition effect where videos pass through a thick, elastic liquid barrier. The outgoing video stretches horizontally and compresses vertically as if being pulled through gel, while the incoming video pushes through from the opposite side with opposite deformation. Features elastic spring-based wobble animations and glossy gel overlay effects using semi-transparent shapes and backdrop filters for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'gel',
    'viscous',
    'elastic',
    'membrane',
    'stretch',
    'deform',
    'wobble',
    'glossy',
    '3d',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 1.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const viscousGelMembraneTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
