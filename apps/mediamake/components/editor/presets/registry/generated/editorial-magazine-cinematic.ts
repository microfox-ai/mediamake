/**
 * Editorial Magazine Cinematic Preset
 *
 * A sophisticated editorial magazine preset featuring a background image with subtle zoom-out reveal
 * (scale 1.15→1.0) while text scrolls horizontally with elegant letter-spacing animation (0.5em→0.1em).
 * Includes a dynamic gradient overlay with opacity shifts for optimal text readability.
 *
 * Features:
 * - **Cinematic Aspect Ratio**: 16:9 aspect-video layout for cinematic feel
 * - **Zoom-Out Reveal**: Background image starts at scale 1.15 and slowly reveals to 1.0 with ease-out curve
 * - **Text Scroll Animation**: Horizontal text scroll from 120% to -120% with smooth ease-in-out
 * - **Letter-Spacing Animation**: Text letter-spacing animates from 0.5em to 0.1em for sophisticated reveal
 * - **Dynamic Gradient Overlay**: Gradient opacity cycles (0.3→0.6→0.3) to ensure text readability
 * - **Mix Blend Mode**: Text uses mix-blend-mode: difference for dynamic color adaptation
 * - **Serif Typography**: Elegant serif font (Playfair Display) with uppercase styling
 * - **Precise Timing**: Uses fitDurationTo: 'media' for synchronized timing
 *
 * Use cases:
 * - High-end fashion video titles and credits
 * - Architecture presentation intros
 * - Luxury brand content with refined movements
 * - Editorial magazine-style video overlays
 * - Sophisticated product reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  backgroundImage: z
    .string()
    .describe('Background image URL or local path for the editorial layout'),
  displayText: z
    .string()
    .describe('Text to display with scrolling and letter-spacing animation'),
  duration: z
    .number()
    .default(10)
    .optional()
    .describe('Duration of the entire composition in seconds (default: 10)'),
  zoomDuration: z
    .number()
    .default(8)
    .optional()
    .describe(
      'Duration of the zoom-out effect (default: 8s, 80% of total duration)',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (default: white)'),
  fontFamily: z
    .string()
    .default('Playfair Display')
    .optional()
    .describe('Font family for the text (default: Playfair Display serif)'),
  fontSize: z
    .number()
    .default(60)
    .optional()
    .describe('Font size in pixels (default: 60)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration ?? 10;
  const zoomDuration = params.zoomDuration ?? 8;
  const textColor = params.textColor ?? '#FFFFFF';
  const fontFamily = params.fontFamily ?? 'Playfair Display';
  const fontSize = params.fontSize ?? 60;

  // Root container with cinematic aspect ratio
  const rootContainer: RenderableComponentData = {
    id: 'editorial-magazine-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full aspect-video bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Background image with zoom-out effect
      {
        id: 'editorial-background-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: params.backgroundImage,
          className: 'absolute inset-0 object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: 'editorial-zoom-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: zoomDuration,
              mode: 'provider',
              targetIds: ['editorial-background-image'],
              ranges: [
                { key: 'scale', val: 1.15, prog: 0 },
                { key: 'scale', val: 1.0, prog: 1 },
              ],
            },
          },
        ],
      },
      // Gradient overlay with opacity fade
      {
        id: 'editorial-gradient-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40',
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
            id: 'editorial-gradient-fade',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['editorial-gradient-overlay'],
              ranges: [
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.5 },
                { key: 'opacity', val: 0.3, prog: 1 },
              ],
            },
          },
        ],
      },
      // Text container (centered vertically)
      {
        id: 'editorial-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute top-1/2 -translate-y-1/2 w-full',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          // Scrolling text with letter-spacing animation
          {
            id: 'editorial-scrolling-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: params.displayText,
              className: 'text-5xl font-serif uppercase whitespace-nowrap',
              style: {
                color: textColor,
                mixBlendMode: 'difference',
              },
              font: {
                family: fontFamily,
                weights: ['400', '700'],
                subsets: ['latin'],
                display: 'swap',
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              // Horizontal scroll effect
              {
                id: 'editorial-text-scroll',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['editorial-scrolling-text'],
                  ranges: [
                    { key: 'translateX', val: '120%', prog: 0 },
                    { key: 'translateX', val: '-120%', prog: 1 },
                  ],
                },
              },
              // Letter-spacing animation
              {
                id: 'editorial-letterspacing',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['editorial-scrolling-text'],
                  ranges: [
                    { key: 'letterSpacing', val: '0.5em', prog: 0 },
                    { key: 'letterSpacing', val: '0.1em', prog: 1 },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'editorial-magazine-cinematic',
  title: 'Editorial Magazine Cinematic',
  description:
    'A sophisticated editorial magazine preset featuring a background image with subtle zoom-out reveal (scale 1.15→1.0) while text scrolls horizontally with elegant letter-spacing animation (0.5em→0.1em). Includes a dynamic gradient overlay with opacity shifts for optimal text readability. Perfect for high-end fashion, architecture, or luxury brand content with deliberate, refined movements in a cinematic aspect ratio.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'editorial',
    'magazine',
    'cinematic',
    'fashion',
    'architecture',
    'luxury',
    'zoom-out',
    'letter-spacing',
    'scrolling-text',
    'gradient-overlay',
    'serif',
    'sophisticated',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://example.com/editorial-background.jpg',
    displayText: 'EDITORIAL EXCELLENCE',
    duration: 10,
    zoomDuration: 8,
    textColor: '#FFFFFF',
    fontFamily: 'Playfair Display',
    fontSize: 60,
  },
};

// Export preset
export const editorialMagazineCinematicPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
