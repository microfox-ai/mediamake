/**
 * B-Roll Preset
 *
 * This preset displays images synchronized with caption timing. It automatically shows selected
 * images when captions are playing, with configurable effects and transitions.
 *
 * Features:
 * - **Caption Synchronization**: Images appear based on caption timing
 * - **Gap Detection**: Automatically fills small gaps between captions
 * - **Image Effects**: Zoom-in and pan-down looping effects with adjustable impact
 * - **Transition Effects**: Shake and smooth-blur transitions between images
 * - **Image Styling**: Fit, position, blend mode, opacity, and scale controls
 * - **Negative Offset**: Start images slightly before caption timing
 * - **Caption Modes**: Play mixed, only when speaking, or only when not speaking
 *
 * Use cases:
 * - Adding B-roll footage synchronized with narration
 * - Creating visual accompaniments to captions
 * - Building dynamic presentations with image overlays
 * - Enhancing video content with contextual imagery
 */

import {
  InputCompositionProps,
  PanEffectData,
  ZoomEffectData,
  GenericEffectData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

type Effect = {
  id: string;
  componentId: string;
  data: any;
};

const presetParams = z.object({
  captions: z.array(
    z
      .object({
        text: z.string().describe('Text of the caption'),
        absoluteStart: z.number().describe('Start time of the caption'),
        duration: z.number().describe('Duration of the caption'),
        absoluteEnd: z.number().describe('End time of the caption'),
        metadata: z
          .object({
            selectedImage: z
              .object({
                src: z.string().describe('Source URL of the selected image'),
              })
              .loose()
              .optional(),
            alternateImages: z
              .array(
                z
                  .object({
                    src: z
                      .string()
                      .describe('Source URL of the alternate image'),
                  })
                  .loose(),
              )
              .optional(),
          })
          .loose()
          .optional(),
      })
      .loose(),
  ).meta({
    [paramMetaTypes.referrableDataType]: 'captions',
  }),
  captionMode: z
    .enum([
      'play-mixed',
      'play-only-when-speaking',
      'play-only-when-not-speaking',
    ])
    .optional()
    .describe('Mode to play the captions'),
  negativeOffset: z
    .number()
    .optional()
    .describe(
      'The negative offset in seconds - images will appear this many seconds before their original timing',
    ),
  trackName: z.string().describe('Name of the track ( used for the ID )'),
  transition: z.object({
    impact: z.number().optional().describe('The impact of the transition'),
    type: z.enum(['none', 'shake', 'smooth-blur']),
  }),
  imageFit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .optional()
    .describe('How to fit the image'),
  imagePosition: z
    .enum(['top', 'center', 'bottom', 'left', 'right'])
    .optional()
    .describe('The position of the image'),
  imageBlendMode: z
    .enum([
      'normal',
      'multiply',
      'screen',
      'overlay',
      'darken',
      'lighten',
      'color-dodge',
      'color-burn',
      'hard-light',
      'soft-light',
      'difference',
      'exclusion',
      'hue',
      'saturation',
      'color',
      'luminosity',
    ])
    .optional()
    .describe('Blend mode for the image (default: normal)'),
  imageOpacity: z.number().optional().describe('The opacity of the image'),
  imageScale: z.number().optional().describe('The scale of the image'),
  imageEffect: z.object({
    type: z.enum(['none', 'zoom-in-loop', 'pan-down-loop']),
    impact: z.number().optional().describe('The impact of the image effect'),
  }),
  captionGapThreshold: z
    .number()
    .default(0.33)
    .optional()
    .describe(
      'The threshold for the caption gap - indicates the minimym gap needed to consider there is a gap between captions',
    ),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    fetcher: (url: string, data: any) => Promise<any>;
    dataReferenceBindings?: Record<string, string[]>;
    dataReferenceKeyByPath?: Record<string, string>;
    buildDataItemIds?: (options?: {
      paramKeys?: string[];
      dataSourceKeys?: string[];
      arrayIndex?: number;
      nestedPath?: string;
      fallbackToAll?: boolean;
    }) => string[];
    applyDataItemIdsToNodeTree?: (node: any, dataItemIds: string[]) => void;
  },
): Promise<Partial<PresetOutput>> => {
  const {
    captions,
    trackName,
    transition,
    imageFit = 'cover',
    imagePosition = 'center',
    imageBlendMode = 'normal',
    imageOpacity = 1,
    imageScale = 1,
    imageEffect,
    captionGapThreshold = 0.33,
    negativeOffset = 0,
  } = params;

  const { config } = props;
  const captionDataItemIdsBuilt = props.buildDataItemIds?.({
    paramKeys: ['captions'],
  });
  const captionDataItemIds =
    captionDataItemIdsBuilt != null && captionDataItemIdsBuilt.length > 0
      ? captionDataItemIdsBuilt
      : [];

  // Helper function to get transition duration based on type and impact
  const getTransitionDuration = (
    transition: z.infer<typeof presetParams>['transition'],
  ): number => {
    const impact = transition.impact ?? 1;
    switch (transition.type) {
      case 'smooth-blur':
        return Math.max(0.4, 0.9 - impact * 0.3);
      case 'shake':
        return 0.3;
      case 'none':
      default:
        return 0;
    }
  };

  const transitionDuration = getTransitionDuration(transition);
  const allImageComponents: any[] = [];
  const allCaptionComponents: any[] = [];

  // Helper function to apply negative offset to captions
  const applyNegativeOffset = (captions: any[], negativeOffset: number) => {
    return captions.map(caption => {
      const newAbsoluteStart = Math.max(
        0,
        caption.absoluteStart - negativeOffset,
      );
      const newAbsoluteEnd = Math.max(0, caption.absoluteEnd - negativeOffset);

      return {
        ...caption,
        absoluteStart: newAbsoluteStart,
        absoluteEnd: newAbsoluteEnd,
        start: newAbsoluteStart,
        end: newAbsoluteEnd,
      };
    });
  };

  // Helper function to detect and fill gaps between captions
  const processCaptionsWithGapFilling = (
    captions: any[],
    gapThreshold: number,
  ) => {
    const endingssetted = captions.reduce(
      (processedCaptions, currentCaption, index) => {
        // Add current caption to processed array
        processedCaptions.push(currentCaption);

        // Check for gap with next caption (if it exists)
        if (index < captions.length - 1) {
          const nextCaption = captions[index + 1];
          const gap = nextCaption.absoluteStart - currentCaption.absoluteEnd;

          // If gap is smaller than threshold, extend current caption to fill the gap
          if (gap > 0 && gap < gapThreshold) {
            // console.log(
            //   `🔧 Filling gap of ${gap}s between captions ${index} and ${index + 1}`,
            // );
            // Update the last added caption (current one)
            processedCaptions[processedCaptions.length - 1] = {
              ...currentCaption,
              absoluteEnd: currentCaption.absoluteEnd + gap,
            };
          }
        }

        return processedCaptions;
      },
      [] as any[],
    );

    return endingssetted.map((caption: any) => ({
      ...caption,
      duration: caption.absoluteEnd - caption.absoluteStart,
    }));
  };

  // Apply negative offset first, then process captions to fill small gaps
  const captionsWithOffset = applyNegativeOffset(captions, negativeOffset);
  const processedCaptions = processCaptionsWithGapFilling(
    captionsWithOffset,
    captionGapThreshold,
  );

  // Process each caption and its associated image
  processedCaptions.forEach((caption: any, captionIndex: number) => {
    const { text, absoluteStart, duration, absoluteEnd, metadata } = caption;
    const selectedImage = metadata?.selectedImage;

    if (!selectedImage?.src) return;

    const built = props.buildDataItemIds?.({
      paramKeys: ['captions'],
      arrayIndex: captionIndex,
    });
    const dataItemIds =
      built != null && built.length > 0
        ? built
        : [`captions.[${captionIndex}]`];
    // Create image component for this caption
    const imageComponent: any = {
      id: `${trackName}-broll-image-${captionIndex}`,
      componentId: 'ImageAtom',
      type: 'atom' as const,
      data: {
        src: selectedImage.src,
        className: 'w-full h-full object-cover',
        fit: imageFit,
        style: {
          opacity: imageOpacity,
          transform: `scale(${imageScale})`,
          objectPosition: imagePosition,
          ...(imageBlendMode && imageBlendMode !== 'normal'
            ? { mixBlendMode: imageBlendMode }
            : {}),
        },
      },
      context: {
        timing: {
          start: absoluteStart,
          duration: duration,
        },
      },
      effects: [],
    };

    // Add image effects based on imageEffect configuration
    if (imageEffect && imageEffect.type !== 'none') {
      const effects: any[] = [];
      const impact = imageEffect.impact ?? 1;

      switch (imageEffect.type) {
        case 'zoom-in-loop':
          effects.push({
            id: `zoom-effect-${captionIndex}`,
            componentId: 'zoom',
            data: {
              zoomDirection: 'in',
              zoomDepth: 1 + impact * 0.3, // 1.0 to 1.3 based on impact
              loopTimes: Math.floor(duration / 2), // Loop every 2 seconds
              duration: 2, // Each zoom cycle lasts 2 seconds
              start: 0,
            } as ZoomEffectData,
          });
          break;

        case 'pan-down-loop':
          effects.push({
            id: `pan-effect-${captionIndex}`,
            componentId: 'pan',
            data: {
              panDirection: 'down',
              panDistance: 200 + impact * 100, // 200 to 300 pixels based on impact
              loopTimes: Math.floor(duration / 3), // Loop every 3 seconds
              duration: 3, // Each pan cycle lasts 3 seconds
              start: 0,
            } as PanEffectData,
          });
          break;
      }

      imageComponent.effects = effects;
    }
    // For 'none' image effect type, no image effects are added

    // Add transition effects
    const transitionEffects: any[] = [];
    const impact = transition.impact ?? 1;

    if (transition.type === 'shake') {
      const amplitude = 5 + 10 * impact;
      const frequency = 0.3 + 0.5 * impact;
      const shakeDuration = 0.3 + 0.5 * impact;

      transitionEffects.push({
        id: `shake-effect-${captionIndex}`,
        componentId: 'shake',
        data: {
          mode: 'provider',
          targetIds: [imageComponent.id],
          type: 'linear',
          amplitude,
          frequency,
          decay: true,
          axis: 'both',
          duration: shakeDuration,
          start: 0,
        },
      });
    } else if (transition.type === 'smooth-blur') {
      // Add smooth blur effect using generic effect
      transitionEffects.push({
        id: `blur-effect-${captionIndex}`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [imageComponent.id],
          type: 'ease-in-out',
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${2 + impact * 3}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
          duration: transitionDuration,
          start: 0,
        } as GenericEffectData,
      });
    }
    // For 'none' transition type, no effects are added

    // Add continuous scale effect for smooth transitions
    // const continuousScaleEffect = {
    //   id: `continuous-scale-effect-${captionIndex}`,
    //   componentId: 'generic',
    //   data: {
    //     mode: 'provider',
    //     targetIds: [imageComponent.id],
    //     type: 'spring',
    //     ranges: [
    //       { key: 'scale', val: imageScale * 1.0, prog: 0 },
    //       { key: 'scale', val: imageScale * 1.05, prog: 0.3 },
    //       { key: 'scale', val: imageScale * 1.0, prog: 0.7 },
    //       { key: 'scale', val: imageScale * 1.05, prog: 1 },
    //     ],
    //     duration: duration,
    //     start: 0,
    //   },
    // };

    imageComponent.effects = [
      ...imageComponent.effects,
      ...transitionEffects,
      //   ...(transition.type !== 'none' ? [continuousScaleEffect] : []),
    ];

    props?.applyDataItemIdsToNodeTree?.(imageComponent, dataItemIds);
    allImageComponents.push(imageComponent);
  });

  return {
    output: {
      childrenData: [
        {
          id: `${trackName}-broll-track`,
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
            repeatChildrenProps: {
              className: 'absolute inset-0 flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: Math.max(
                ...processedCaptions.map((c: any) => c.absoluteEnd),
              ),
            },
          },
          childrenData: [...allImageComponents, ...allCaptionComponents],
          effects: [],
        },
      ],
    },
    options: {
      attachedToId: `BaseScene`,
      dataItemIds: captionDataItemIds,
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'broll',
  title: 'B-Roll',
  description:
    'Shows selected images when captions are playing with effects and transitions',
  type: 'predefined',
  presetType: 'children',
  tags: ['broll', 'captions', 'images', 'effects', 'transitions'],
  defaultInputParams: {
    trackName: 'broll-track',
    captions: [
      {
        text: 'Welcome to our presentation',
        absoluteStart: 0,
        duration: 5,
        absoluteEnd: 5,
        metadata: {
          selectedImage: {
            src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
          },
        },
      },
      {
        text: 'This is the second slide',
        absoluteStart: 5,
        duration: 4,
        absoluteEnd: 9,
        metadata: {
          selectedImage: {
            src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
          },
        },
      },
    ],
    transition: {
      type: 'none',
      impact: 1,
    },
    imageFit: 'cover',
    imagePosition: 'center',
    imageBlendMode: 'normal',
    imageOpacity: 0.8,
    imageScale: 1.1,
    imageEffect: {
      type: 'none',
      impact: 1,
    },
    captionGapThreshold: 0.33,
    negativeOffset: 0.2,
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const brollPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { brollPreset };
