/**
 * Mechanical Lens Rotation Transition Preset
 *
 * A mechanical lens ring rotation transition where the outgoing image rotates clockwise
 * while scaling down (like a camera lens barrel turning), revealing the incoming image
 * underneath which counter-rotates into position. Concentric ring overlays spin
 * independently to enhance the mechanical lens aesthetic.
 *
 * Features:
 * - Outgoing image: 180deg clockwise rotation + scale 1→0.3
 * - Incoming image: -90deg→0deg counter-rotation + scale 0.8→1
 * - Three concentric ring overlays rotating at different speeds (360deg, 540deg, 720deg)
 * - Blur effect: 0px→4px→0px peaking at 500ms during fastest rotation
 * - Momentum-based easing: cubic-bezier(0.4, 0, 0.2, 1)
 * - Hardware acceleration with transform-gpu
 * - 1-second overlap for smooth mechanical motion
 *
 * Use cases:
 * - Camera lens focus transitions
 * - Mechanical/industrial themed transitions
 * - Technical photography transitions
 * - Retro camera aesthetic transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImage: z.object({
    src: z.string().describe('Source URL of the outgoing image'),
  }),
  incomingImage: z.object({
    src: z.string().describe('Source URL of the incoming image'),
  }),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds (default: 1.0)'),
  imageDuration: z
    .number()
    .optional()
    .describe('Duration for each image (if not specified, uses transition duration * 2)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingImage, incomingImage, transitionDuration, imageDuration } = params;

  // Calculate durations
  const duration = imageDuration ?? transitionDuration * 2;
  const totalDuration = duration * 2 - transitionDuration;
  const outgoingStart = 0;
  const incomingStart = duration - transitionDuration;

  // Ring overlay positions and sizes
  const ringConfigs = [
    { top: '10%', left: '10%', width: '80%', height: '80%', border: '8px', opacity: 0.15, rotation: 360 },
    { top: '20%', left: '20%', width: '60%', height: '60%', border: '6px', opacity: 0.1, rotation: 540 },
    { top: '30%', left: '30%', width: '40%', height: '40%', border: '4px', opacity: 0.08, rotation: 720 },
  ];

  // Create ring overlay HTML
  const createRingHTML = (border: string, opacity: number) => {
    return `<div style="width: 100%; height: 100%; border: ${border} solid rgba(255, 255, 255, ${opacity}); border-radius: 50%; box-sizing: border-box;"></div>`;
  };

  const childrenData: RenderableComponentData[] = [
    // Incoming image (bottom layer, z-index: 1)
    {
      id: 'incoming-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: incomingImage.src,
        className: 'absolute inset-0 w-full h-full object-cover transform-gpu',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: duration + transitionDuration,
        },
      },
      effects: [
        // Counter-rotation and scale animation
        {
          id: 'incoming-rotation-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'rotate', val: -90, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Blur effect (0→4px at 50%, 4px→0 at 100%)
        {
          id: 'incoming-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing image (top layer, z-index: 3)
    {
      id: 'outgoing-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: outgoingImage.src,
        className: 'absolute inset-0 w-full h-full object-cover transform-gpu',
        style: {
          zIndex: 3,
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: duration,
        },
      },
      effects: [
        // Clockwise rotation and scale down
        {
          id: 'outgoing-rotation-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 180, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
            ],
          },
        },
        // Blur effect (0→4px at 50%, 4px→0 at 100%)
        {
          id: 'outgoing-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Ring overlays (z-index: 2, middle layer)
    ...ringConfigs.map((config, index) => ({
      id: `ring-overlay-${index + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createRingHTML(config.border, config.opacity),
        className: 'absolute transform-gpu',
        style: {
          top: config.top,
          left: config.left,
          width: config.width,
          height: config.height,
          zIndex: 2,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `ring-rotation-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`ring-overlay-${index + 1}`],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: config.rotation, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData)),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'mechanical-lens-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'mechanical-lens-rotation-transition',
  title: 'Mechanical Lens Rotation Transition',
  description:
    'A mechanical lens ring rotation transition where images rotate like a camera lens focusing ring. Outgoing image rotates clockwise while scaling down, incoming image counter-rotates into position, with concentric ring overlays spinning independently for enhanced mechanical aesthetic. Features momentum-based easing with subtle blur during fastest rotation phase.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'rotation', 'mechanical', 'lens', 'camera', 'industrial'],
  defaultInputParams: {
    outgoingImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    incomingImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const mechanicalLensRotationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
