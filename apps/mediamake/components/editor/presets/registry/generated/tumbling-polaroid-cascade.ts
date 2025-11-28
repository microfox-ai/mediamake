/**
 * Tumbling Polaroid Cascade Transition Preset
 *
 * Creates a physics-based transition where polaroid-framed images tumble down from above
 * with multi-axis rotation (rotateX, rotateY, rotateZ) and land at varied angles to create
 * an organic scattered-stack effect. Each incoming image has:
 * - Tumbling motion with 2 full rotations on X-axis
 * - Random final Z-axis rotation (-12 to 12 degrees)
 * - Bounce landing with cubic-bezier easing
 * - Soft gaussian blur on older stack images for depth-of-field
 * - Dynamic shadows that increase with stack depth
 * - Slight randomization of landing position within center bounds
 *
 * The outgoing image slides and scales down slightly to make room for new arrivals.
 * Includes a wooden table background with subtle radial gradient vignette.
 *
 * Technical details:
 * - Overlap duration: 1 second (70% tumble, 30% settle)
 * - Polaroid frame: white p-4 pb-12 with rounded corners
 * - Shadow intensity increases for deeper stack items
 * - Provider mode effects targeting specific ImageAtom IDs
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z.number().describe('Duration to display this image (seconds)'),
      }),
    )
    .describe('Array of images with their display durations'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Overlap duration for tumbling transition (seconds)'),
  tumblePercent: z
    .number()
    .default(0.7)
    .describe('Percentage of transition spent tumbling (0-1)'),
  settlePercent: z
    .number()
    .default(0.3)
    .describe('Percentage of transition spent settling (0-1)'),
  polaroidWidth: z
    .number()
    .default(300)
    .describe('Width of polaroid frame (pixels)'),
  polaroidHeight: z
    .number()
    .default(360)
    .describe('Height of polaroid frame (pixels)'),
  maxRotation: z
    .number()
    .default(12)
    .describe('Maximum final Z-axis rotation angle (degrees)'),
  stackBlur: z
    .number()
    .default(2)
    .describe('Blur intensity for older stack images (pixels)'),
  outgoingShift: z
    .number()
    .default(5)
    .describe('Percentage shift for outgoing images'),
  outgoingScale: z
    .number()
    .default(0.95)
    .describe('Scale factor for outgoing images'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    transitionDuration,
    tumblePercent,
    settlePercent,
    polaroidWidth,
    polaroidHeight,
    maxRotation,
    stackBlur,
    outgoingShift,
    outgoingScale,
  } = params;

  // Helper: Generate random rotation within bounds
  const getRandomRotation = (): number => {
    return Math.random() * maxRotation * 2 - maxRotation;
  };

  // Helper: Generate random position offset (small, within center bounds)
  const getRandomOffset = (): { x: number; y: number } => {
    const maxOffset = 20; // pixels
    return {
      x: Math.random() * maxOffset * 2 - maxOffset,
      y: Math.random() * maxOffset * 2 - maxOffset,
    };
  };

  // Calculate timing
  const tumbleDuration = transitionDuration * tumblePercent;
  const settleDuration = transitionDuration * settlePercent;

  // Calculate total duration
  let totalDuration = 0;
  images.forEach((image, index) => {
    if (index === 0) {
      totalDuration += image.duration;
    } else {
      totalDuration += image.duration - transitionDuration;
    }
  });

  // Build polaroid wrappers with images
  const polaroidWrappers: RenderableComponentData[] = [];
  let currentTime = 0;

  images.forEach((image, index) => {
    const isFirst = index === 0;
    const isLast = index === images.length - 1;
    const finalRotation = getRandomRotation();
    const positionOffset = getRandomOffset();

    // Calculate start time
    let startTime: number;
    if (isFirst) {
      startTime = 0;
    } else {
      startTime = currentTime - transitionDuration;
    }

    // Calculate wrapper duration
    const wrapperDuration = isFirst
      ? image.duration
      : image.duration + transitionDuration;

    const polaroidId = `polaroid-wrapper-${index}`;
    const imageId = `polaroid-image-${index}`;

    // Incoming effects (tumble + settle)
    const incomingEffects: any[] = [
      // Tumble phase (0% to 70%)
      {
        id: `tumble-${index}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce easing
          start: 0,
          duration: tumbleDuration,
          mode: 'provider',
          targetIds: [polaroidId],
          ranges: [
            // Translate from above
            { key: 'translateY', val: '-150%', prog: 0 },
            { key: 'translateY', val: `${positionOffset.y}px`, prog: 1 },
            // Rotate X (2 full rotations)
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: 720, prog: 1 },
            // Rotate Z to final angle
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: finalRotation, prog: 1 },
            // Scale up
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Translate X
            { key: 'translateX', val: `${positionOffset.x}px`, prog: 0 },
            { key: 'translateX', val: `${positionOffset.x}px`, prog: 1 },
          ],
        },
      },
      // Settle phase (70% to 100%)
      {
        id: `settle-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: tumbleDuration,
          duration: settleDuration,
          mode: 'provider',
          targetIds: [polaroidId],
          ranges: [
            // Fine-tune final position
            { key: 'translateY', val: `${positionOffset.y}px`, prog: 0 },
            { key: 'translateY', val: `${positionOffset.y}px`, prog: 1 },
            // Maintain rotation
            { key: 'rotateZ', val: finalRotation, prog: 0 },
            { key: 'rotateZ', val: finalRotation, prog: 1 },
            // Slight scale bounce
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ];

    // Outgoing effects (for previous images when new one arrives)
    const outgoingEffects: any[] = [];
    if (!isFirst) {
      // Apply to previous polaroid
      const prevPolaroidId = `polaroid-wrapper-${index - 1}`;
      outgoingEffects.push({
        id: `outgoing-${index - 1}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [prevPolaroidId],
          ranges: [
            // Slide to side
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: `${outgoingShift}%`, prog: 1 },
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: outgoingScale, prog: 1 },
            // Add blur
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${stackBlur / 2}px)`, prog: 1 },
            // Reduce opacity
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.85, prog: 1 },
          ],
        },
      });
    }

    // Stack depth effects (blur for older images)
    const stackDepthEffects: any[] = [];
    if (index > 0) {
      // Apply blur to all previous images
      for (let i = 0; i < index; i++) {
        const targetPolaroidId = `polaroid-wrapper-${i}`;
        const depthBlur = stackBlur * (index - i);
        const depthOpacity = Math.max(0.5, 1 - (index - i) * 0.1);
        stackDepthEffects.push({
          id: `depth-blur-${i}-from-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionDuration * 0.5,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: [targetPolaroidId],
            ranges: [
              {
                key: 'filter',
                val: `blur(${depthBlur - stackBlur}px)`,
                prog: 0,
              },
              { key: 'filter', val: `blur(${depthBlur}px)`, prog: 1 },
              { key: 'opacity', val: depthOpacity + 0.1, prog: 0 },
              { key: 'opacity', val: depthOpacity, prog: 1 },
            ],
          },
        });
      }
    }

    // Calculate shadow intensity based on stack position
    const shadowDepth = index + 1;
    const shadowBlur = 10 + shadowDepth * 5;
    const shadowSpread = shadowDepth * 2;
    const shadowOpacity = 0.3 + shadowDepth * 0.05;

    // Create polaroid wrapper
    const polaroidWrapper: RenderableComponentData = {
      id: polaroidId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute p-4 pb-12 bg-white rounded-sm',
          style: {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 ${shadowSpread}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})`,
            width: `${polaroidWidth}px`,
            height: `${polaroidHeight}px`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: wrapperDuration,
        },
      },
      effects: [...incomingEffects, ...outgoingEffects, ...stackDepthEffects],
      childrenData: [
        {
          id: imageId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: 'media',
            },
          },
        } as RenderableComponentData,
      ],
    };

    polaroidWrappers.push(polaroidWrapper);
    currentTime += image.duration;
  });

  // Root container with wooden table background and vignette
  const rootContainer: RenderableComponentData = {
    id: 'tumbling-polaroid-cascade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background:
            'radial-gradient(circle at center, #8B7355 0%, #5C4638 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'polaroid-stack-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'this',
          },
        },
        childrenData: polaroidWrappers,
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
  id: 'tumbling-polaroid-cascade',
  title: 'Tumbling Polaroid Cascade',
  description:
    'Physics-based polaroid-framed image transition where images tumble down with multi-axis rotation, landing at varied angles to create an organic scattered-stack effect with depth-of-field blur and dynamic shadows',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'polaroid',
    'tumbling',
    'physics',
    'rotation',
    'stack',
    'cascade',
    'depth-of-field',
  ],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        duration: 5,
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
        duration: 5,
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
        duration: 5,
      },
    ],
    transitionDuration: 1.0,
    tumblePercent: 0.7,
    settlePercent: 0.3,
    polaroidWidth: 300,
    polaroidHeight: 360,
    maxRotation: 12,
    stackBlur: 2,
    outgoingShift: 5,
    outgoingScale: 0.95,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tumblingPolaroidCascadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
