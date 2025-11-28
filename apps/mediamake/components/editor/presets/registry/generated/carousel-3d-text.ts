/**
 * 3D Carousel Text Rotation Preset
 *
 * This preset creates an elegant carousel-style animation where text elements rotate
 * in 3D space like cards on a spinning display. Each text element rotates around a
 * central Y-axis point, appearing to orbit into view with smooth, continuous motion.
 *
 * Features:
 * - **3D Carousel Rotation**: Text rotates from back-facing (-180deg) to front-facing (0deg)
 * - **Depth Animation**: translateZ creates a true 3D effect (text moves forward as it faces viewer)
 * - **Smart Opacity**: Custom fade-in from 0 at -90deg to full at 0deg for smooth reveal
 * - **Perspective Container**: Uses CSS perspective and preserve-3d for realistic 3D
 * - **Sequential Reveals**: Each text card appears in sequence with smooth transitions
 * - **Flexible Timing**: Support for media sync via fitDurationTo
 *
 * Use cases:
 * - Testimonial carousels with rotating quotes
 * - Feature list presentations with 3D card reveals
 * - Product benefit showcases with elegant transitions
 * - Quote displays with cinematic 3D rotation effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema for the preset
const presetParams = z.object({
  texts: z
    .array(
      z.object({
        text: z.string().describe('Text content to display on the card'),
        duration: z
          .number()
          .default(2)
          .describe('Duration for this text card in seconds'),
      }),
    )
    .min(1)
    .describe('Array of text cards to rotate through the carousel'),
  
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex or rgba)'),

  maxWidth: z
    .number()
    .min(200)
    .max(1200)
    .default(800)
    .optional()
    .describe('Maximum width of text container in pixels'),

  padding: z
    .number()
    .min(0)
    .max(100)
    .default(40)
    .optional()
    .describe('Padding around text in pixels'),

  textShadow: z
    .string()
    .optional()
    .default('0 4px 8px rgba(0,0,0,0.3)')
    .describe('CSS text shadow for depth effect'),

  rotationDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .optional()
    .describe('Duration of rotation animation in seconds'),

  perspective: z
    .number()
    .min(500)
    .max(3000)
    .default(1200)
    .optional()
    .describe('CSS perspective value for 3D effect'),

  depthPeak: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .optional()
    .describe('Peak translateZ value (how far forward text comes)'),

  fitDurationTo: z
    .string()
    .optional()
    .describe(
      'Optional component ID to match duration (e.g., audio track ID for sync)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate total duration based on text cards
  const totalDuration = params.texts.reduce(
    (sum, text) => sum + text.duration,
    0,
  );

  // Create text card components
  let currentTime = 0;
  const textCards: RenderableComponentData[] = params.texts.map(
    (textItem, index) => {
      const textCardId = `carousel-text-card-${index}`;
      const cardDuration = textItem.duration;
      const startTime = currentTime;

      // Effect for 3D carousel rotation
      const carouselEffect = {
        id: `carousel-rotation-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to text card start
          duration: params.rotationDuration || 2,
          mode: 'provider',
          targetIds: [textCardId],
          ranges: [
            // RotateY: -180deg (back-facing) to 0deg (front-facing)
            { key: 'rotateY', val: -180, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            // TranslateZ: -100px to 50px (peak) to 0px (depth pop)
            { key: 'translateZ', val: -100, prog: 0 },
            { key: 'translateZ', val: params.depthPeak || 50, prog: 0.5 },
            { key: 'translateZ', val: 0, prog: 1 },
            // Opacity: custom range (0 at start, 0 at 25%, 1 at 50%)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.25 },
            { key: 'opacity', val: 1, prog: 0.5 },
          ],
        },
      };

      const textCard: RenderableComponentData = {
        id: textCardId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: textItem.text,
          style: {
            fontSize: params.fontSize || 48,
            fontWeight: fontStyle.fontWeight || 600,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: params.textColor || '#ffffff',
            textAlign: 'center',
            maxWidth: `${params.maxWidth || 800}px`,
            padding: `${params.padding || 40}px`,
            textShadow: params.textShadow || '0 4px 8px rgba(0,0,0,0.3)',
          } as React.CSSProperties,
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['600'],
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: cardDuration,
          },
        },
        effects: [carouselEffect],
      };

      currentTime += cardDuration;

      return textCard;
    },
  );

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'carousel-3d-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: `${params.perspective || 1200}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        ...(params.fitDurationTo
          ? { fitDurationTo: params.fitDurationTo }
          : { duration: totalDuration }),
      },
    },
    childrenData: textCards,
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
  id: 'carousel-3d-text',
  title: '3D Carousel Text Rotation',
  description:
    'Elegant carousel-style preset where text rotates in 3D space like cards on a spinning display. Each text element rotates around a central Y-axis point with smooth rotateY transitions, translateZ depth effects, and opacity fades. Perfect for testimonials, quotes, or feature lists with a true 3D carousel effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'carousel',
    '3d',
    'rotation',
    'testimonials',
    'quotes',
    'features',
    'perspective',
    'depth',
    'smooth',
  ],
  defaultInputParams: {
    texts: [
      { text: 'First testimonial text', duration: 2 },
      { text: 'Second testimonial text', duration: 2 },
      { text: 'Third testimonial text', duration: 2 },
      { text: 'Fourth testimonial text', duration: 2 },
      { text: 'Fifth testimonial text', duration: 2 },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#ffffff',
    maxWidth: 800,
    padding: 40,
    textShadow: '0 4px 8px rgba(0,0,0,0.3)',
    rotationDuration: 2,
    perspective: 1200,
    depthPeak: 50,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const carousel3dTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
