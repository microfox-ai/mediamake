/**
 * Stack Selection Pop Transition Preset
 *
 * This preset creates a dynamic stack-based transition effect where images are arranged
 * in a tilted stack (like browsing album covers on a table). The current top image 'pops'
 * up and away (translateY up, scale up to 1.1, then fades) while the next image in the stack
 * slides up from its tilted position to become the new focus.
 *
 * Features:
 * - Stack depth visualization with 2-3 visible layers
 * - 550ms overlap period showing transition
 * - Each layer has increasing tilt angle (10deg/15deg rotateX)
 * - Decreasing opacity (0.8/0.7/0.5) and scale (1/0.9/0.8) per layer
 * - Outgoing image pops up with scale animation then fades
 * - Incoming image slides from tilted position to center
 * - Dynamic shadows that change as images move through stack positions
 * - Container perspective (800px) for 3D depth effect
 * - Provider mode effects targeting specific ImageAtoms
 *
 * Use cases:
 * - Creating engaging image transitions for slideshows
 * - Building album/gallery browsing experiences
 * - Adding depth and dimension to image presentations
 * - Creating card-flip or stack-browsing effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z.number().describe('Duration in seconds for this image'),
      }),
    )
    .describe('Array of images to transition between'),
  trackName: z
    .string()
    .default('stack-selection-pop')
    .describe('Unique track name for component IDs'),
  overlapDuration: z
    .number()
    .default(0.55)
    .describe('Overlap duration between transitions in seconds (default: 550ms)'),
  perspective: z
    .number()
    .default(800)
    .describe('Container perspective for 3D depth effect (px)'),
  stackLayers: z
    .object({
      layer1: z
        .object({
          rotateX: z.number().default(10).describe('Rotation angle for layer 1 (deg)'),
          opacity: z.number().default(0.7).describe('Opacity for layer 1'),
          scale: z.number().default(0.9).describe('Scale for layer 1'),
          translateY: z.number().default(5).describe('Vertical offset for layer 1 (%)'),
        })
        .default({})
        .describe('Configuration for stack layer 1 (middle layer)'),
      layer2: z
        .object({
          rotateX: z.number().default(15).describe('Rotation angle for layer 2 (deg)'),
          opacity: z.number().default(0.5).describe('Opacity for layer 2'),
          scale: z.number().default(0.8).describe('Scale for layer 2'),
          translateY: z.number().default(10).describe('Vertical offset for layer 2 (%)'),
        })
        .default({})
        .describe('Configuration for stack layer 2 (back layer)'),
    })
    .default({})
    .describe('Stack layer configurations'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    trackName,
    overlapDuration,
    perspective,
    stackLayers,
  } = params;

  // Calculate total duration with overlaps
  const totalImageDuration = images.reduce((sum, img) => sum + img.duration, 0);
  const totalOverlaps = (images.length - 1) * overlapDuration;
  const containerDuration = totalImageDuration - totalOverlaps;

  // Get layer configurations with defaults
  const layer1Config = {
    rotateX: stackLayers.layer1?.rotateX ?? 10,
    opacity: stackLayers.layer1?.opacity ?? 0.7,
    scale: stackLayers.layer1?.scale ?? 0.9,
    translateY: stackLayers.layer1?.translateY ?? 5,
  };

  const layer2Config = {
    rotateX: stackLayers.layer2?.rotateX ?? 15,
    opacity: stackLayers.layer2?.opacity ?? 0.5,
    scale: stackLayers.layer2?.scale ?? 0.8,
    translateY: stackLayers.layer2?.translateY ?? 10,
  };

  // Build stack layer placeholders
  const stackLayerBack: RenderableComponentData = {
    id: `${trackName}-stack-layer-back`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 70%; height: 60%; background: linear-gradient(135deg, rgba(100,100,100,0.3), rgba(80,80,80,0.2)); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);"></div>`,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        transform: `rotateX(${layer2Config.rotateX}deg) translateY(${layer2Config.translateY}%)`,
        opacity: layer2Config.opacity,
        zIndex: 5,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: `${trackName}-root-container`,
      },
    },
  };

  const stackLayerMiddle: RenderableComponentData = {
    id: `${trackName}-stack-layer-middle`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 80%; height: 70%; background: linear-gradient(135deg, rgba(120,120,120,0.4), rgba(100,100,100,0.3)); border-radius: 12px; box-shadow: 0 6px 30px rgba(0,0,0,0.35);"></div>`,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        transform: `rotateX(${layer1Config.rotateX}deg) translateY(${layer1Config.translateY}%)`,
        opacity: layer1Config.opacity,
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: `${trackName}-root-container`,
      },
    },
  };

  // Build image components with effects
  const imageComponents: RenderableComponentData[] = [];
  let currentTime = 0;

  images.forEach((image, index) => {
    const isLast = index === images.length - 1;
    const imageId = `${trackName}-image-${index}`;

    // Calculate timing
    const startTime = currentTime - (index > 0 ? overlapDuration : 0);
    const imageDuration = image.duration;

    // Create outgoing image (pops up and fades)
    const outgoingImage: RenderableComponentData = {
      id: imageId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 object-cover',
        style: {
          width: '90%',
          height: '80%',
          borderRadius: '12px',
          zIndex: 30,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: imageDuration,
        },
      },
      effects: [
        // Outgoing pop effect: translateY 0→-20%, scale 1→1.1→1, opacity 1→0
        {
          id: `${imageId}-pop-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: imageDuration * 0.5, // Start at 0.5rel
            duration: imageDuration * 0.5, // Duration 0.5rel to 1rel
            mode: 'provider',
            targetIds: [imageId],
            ranges: [
              // TranslateY: 0 → -20% → -20%
              { key: 'translateY', val: 0, prog: 0, unit: '%' },
              { key: 'translateY', val: -20, prog: 0.5, unit: '%' },
              { key: 'translateY', val: -20, prog: 1, unit: '%' },
              // Scale: 1 → 1.1 → 1
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              // Opacity: 1 → 1 → 0
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Shadow effect: changes as image pops
        {
          id: `${imageId}-shadow-pop`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: imageDuration,
            mode: 'provider',
            targetIds: [imageId],
            ranges: [
              {
                key: 'boxShadow',
                val: '0 4px 20px rgba(0,0,0,0.3)',
                prog: 0,
              },
              {
                key: 'boxShadow',
                val: '0 8px 40px rgba(0,0,0,0.5)',
                prog: 0.5,
              },
              {
                key: 'boxShadow',
                val: '0 4px 20px rgba(0,0,0,0.3)',
                prog: 1,
              },
            ],
          },
        },
      ],
    };

    imageComponents.push(outgoingImage);

    // Create incoming image (next image slides from stack)
    if (!isLast) {
      const nextImage = images[index + 1];
      const incomingImageId = `${trackName}-image-${index + 1}-incoming`;
      const incomingStartTime = startTime + imageDuration - overlapDuration;

      const incomingImage: RenderableComponentData = {
        id: incomingImageId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: nextImage.src,
          className: 'absolute inset-0 object-cover',
          style: {
            width: '90%',
            height: '80%',
            borderRadius: '12px',
            zIndex: 20,
          },
        },
        context: {
          timing: {
            start: incomingStartTime,
            duration: overlapDuration,
          },
        },
        effects: [
          // Incoming slide effect: rotateX 10deg→0deg, translateY 10%→0%, scale 0.9→1, opacity 0.8→1
          {
            id: `${incomingImageId}-slide-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [incomingImageId],
              ranges: [
                // RotateX: 10deg → 0deg
                { key: 'rotateX', val: layer1Config.rotateX, prog: 0, unit: 'deg' },
                { key: 'rotateX', val: 0, prog: 1, unit: 'deg' },
                // TranslateY: 10% → 0%
                { key: 'translateY', val: layer1Config.translateY, prog: 0, unit: '%' },
                { key: 'translateY', val: 0, prog: 1, unit: '%' },
                // Scale: 0.9 → 1
                { key: 'scale', val: layer1Config.scale, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                // Opacity: 0.8 → 1
                { key: 'opacity', val: layer1Config.opacity, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // Shadow effect: strengthens as incoming image moves to focus
          {
            id: `${incomingImageId}-shadow-slide`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [incomingImageId],
              ranges: [
                {
                  key: 'boxShadow',
                  val: '0 2px 10px rgba(0,0,0,0.2)',
                  prog: 0,
                },
                {
                  key: 'boxShadow',
                  val: '0 6px 30px rgba(0,0,0,0.4)',
                  prog: 1,
                },
              ],
            },
          },
        ],
      };

      imageComponents.push(incomingImage);
    }

    currentTime += imageDuration;
  });

  // Build stack layers container
  const stackLayersContainer: RenderableComponentData = {
    id: `${trackName}-stack-layers-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: `${trackName}-root-container`,
      },
    },
    childrenData: [stackLayerBack, stackLayerMiddle],
  };

  // Build images container
  const imagesContainer: RenderableComponentData = {
    id: `${trackName}-images-container`,
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
        fitDurationTo: `${trackName}-root-container`,
      },
    },
    childrenData: imageComponents,
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData: [stackLayersContainer, imagesContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'stack-selection-pop',
  title: 'Stack Selection Pop Transition',
  description:
    'Images arranged in a tilted stack (like browsing album covers) where the current top image "pops" up and away while the next image slides from its tilted position to become the new focus. Features 550ms overlap showing 2-3 visible stack layers with increasing tilt angle, decreasing opacity/scale, and animated shadows.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'stack',
    'images',
    'slideshow',
    '3d',
    'depth',
    'pop',
    'tilt',
    'album',
    'gallery',
  ],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        duration: 3,
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
        duration: 3,
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
        duration: 3,
      },
    ],
    trackName: 'stack-selection-pop',
    overlapDuration: 0.55,
    perspective: 800,
    stackLayers: {
      layer1: {
        rotateX: 10,
        opacity: 0.7,
        scale: 0.9,
        translateY: 5,
      },
      layer2: {
        rotateX: 15,
        opacity: 0.5,
        scale: 0.8,
        translateY: 10,
      },
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const stackSelectionPopPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
