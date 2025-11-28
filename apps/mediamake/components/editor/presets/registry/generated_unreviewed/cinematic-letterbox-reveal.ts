/**
 * Cinematic Letterbox Reveal Preset
 *
 * This preset creates a cinematic reveal effect with animated letterbox bars (black bars at top/bottom)
 * and a smooth image entrance. The effect simulates a theatrical widescreen presentation with:
 * - Top and bottom black bars that slide in from outside the frame
 * - Image that zooms in slightly (1.3→1.0 scale) with fade-in
 * - Cinematic 21:9 aspect ratio framing
 * - All animations synchronized for dramatic impact
 *
 * Features:
 * - **Cinematic Framing**: 21:9 aspect ratio with black letterbox bars
 * - **Animated Reveal**: Bars slide in from top/bottom simultaneously
 * - **Image Entrance**: Smooth scale and opacity animation
 * - **Customizable Bar Height**: Adjustable letterbox bar size
 * - **Production Quality**: Smooth easing curves for professional look
 *
 * Use Cases:
 * - Film-style intros and outros
 * - Dramatic reveals for key visuals
 * - Cinematic transitions
 * - Movie trailer effects
 * - High-impact visual presentations
 *
 * @preset cinematic-letterbox-reveal
 * @category Visual Effects
 * @tags cinematic, letterbox, reveal, animation, widescreen, dramatic
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  imageSrc: z
    .string()
    .describe('URL or path to the image to display with cinematic reveal effect'),
  
  letterboxHeight: z
    .string()
    .default('80px')
    .describe('Height of the top and bottom black bars (e.g., "80px", "10%", "100px")'),
  
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the cinematic reveal sequence in seconds'),
  
  barAnimationDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the letterbox bars sliding animation in seconds'),
  
  imageScaleDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the image scale animation in seconds'),
  
  imageFadeDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the image fade-in animation in seconds'),
  
  scaleFrom: z
    .number()
    .default(1.3)
    .describe('Initial scale value for image zoom effect (1.0 = normal size)'),
  
  scaleTo: z
    .number()
    .default(1.0)
    .describe('Final scale value for image zoom effect (1.0 = normal size)'),
  
  aspectRatio: z
    .string()
    .default('21/9')
    .describe('Aspect ratio of the cinematic frame (e.g., "21/9", "2.39/1")'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color outside the cinematic frame'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    imageSrc,
    letterboxHeight,
    duration,
    barAnimationDuration,
    imageScaleDuration,
    imageFadeDuration,
    scaleFrom,
    scaleTo,
    aspectRatio,
    backgroundColor,
  } = params;

  // Generate unique IDs
  const rootId = 'cinematic-letterbox-root';
  const letterboxContainerId = 'cinematic-letterbox-container';
  const mainImageId = 'cinematic-main-image';
  const topBarId = 'cinematic-top-bar';
  const bottomBarId = 'cinematic-bottom-bar';

  // Build the composition structure
  const output: PresetOutput = {
    output: {
      childrenData: [
        {
          id: rootId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                backgroundColor: backgroundColor,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: [
            {
              id: letterboxContainerId,
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'relative w-full flex items-center justify-center overflow-hidden',
                  style: {
                    aspectRatio: aspectRatio,
                    maxHeight: '100%',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
              childrenData: [
                // Main image with scale and opacity effects
                {
                  id: mainImageId,
                  type: 'atom',
                  componentId: 'ImageAtom',
                  data: {
                    src: imageSrc,
                    containerProps: {
                      className: 'absolute inset-0',
                    },
                    imageProps: {
                      className: 'w-full h-full object-cover',
                      alt: 'Cinematic content',
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: `${mainImageId}-scale-effect`,
                      componentId: mainImageId,
                      data: {
                        type: 'ease-out-cubic',
                        start: 0,
                        duration: imageScaleDuration,
                        mode: 'provider',
                        targetIds: [mainImageId],
                        ranges: [
                          { key: 'scale', val: scaleFrom, prog: 0 },
                          { key: 'scale', val: scaleTo, prog: 1 },
                        ],
                      },
                    },
                    {
                      id: `${mainImageId}-opacity-effect`,
                      componentId: mainImageId,
                      data: {
                        type: 'ease-out',
                        start: 0,
                        duration: imageFadeDuration,
                        mode: 'provider',
                        targetIds: [mainImageId],
                        ranges: [
                          { key: 'opacity', val: 0, prog: 0 },
                          { key: 'opacity', val: 1, prog: 1 },
                        ],
                      },
                    },
                  ],
                },
                // Top letterbox bar
                {
                  id: topBarId,
                  type: 'atom',
                  componentId: 'ShapeAtom',
                  data: {
                    shape: 'rectangle',
                    containerProps: {
                      className: 'absolute top-0 left-0 right-0 z-10',
                      style: {
                        height: letterboxHeight,
                        backgroundColor: '#000000',
                      },
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: `${topBarId}-slide-effect`,
                      componentId: topBarId,
                      data: {
                        type: 'ease-out-quart',
                        start: 0,
                        duration: barAnimationDuration,
                        mode: 'provider',
                        targetIds: [topBarId],
                        ranges: [
                          { key: 'translateY', val: '-100%', prog: 0 },
                          { key: 'translateY', val: '0%', prog: 1 },
                        ],
                      },
                    },
                  ],
                },
                // Bottom letterbox bar
                {
                  id: bottomBarId,
                  type: 'atom',
                  componentId: 'ShapeAtom',
                  data: {
                    shape: 'rectangle',
                    containerProps: {
                      className: 'absolute bottom-0 left-0 right-0 z-10',
                      style: {
                        height: letterboxHeight,
                        backgroundColor: '#000000',
                      },
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: `${bottomBarId}-slide-effect`,
                      componentId: bottomBarId,
                      data: {
                        type: 'ease-out-quart',
                        start: 0,
                        duration: barAnimationDuration,
                        mode: 'provider',
                        targetIds: [bottomBarId],
                        ranges: [
                          { key: 'translateY', val: '100%', prog: 0 },
                          { key: 'translateY', val: '0%', prog: 1 },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };

  return output;
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'cinematic-letterbox-reveal',
  title: 'Cinematic Letterbox Reveal',
  description:
    'Applies top/bottom black bars and animates image entry within cinematic framing with smooth reveal effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'letterbox',
    'reveal',
    'animation',
    'widescreen',
    'dramatic',
    'visual-effects',
    'image',
    'transition',
  ],
  defaultInputParams: {
    imageSrc: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&q=80',
    letterboxHeight: '80px',
    duration: 3,
    barAnimationDuration: 1.0,
    imageScaleDuration: 1.2,
    imageFadeDuration: 0.8,
    scaleFrom: 1.3,
    scaleTo: 1.0,
    aspectRatio: '21/9',
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cinematicLetterboxRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
