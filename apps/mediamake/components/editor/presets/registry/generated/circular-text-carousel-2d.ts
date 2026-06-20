/**
 * Cylindrical Text Wrap Effect Preset
 * 
 * Creates a 3D cylindrical carousel effect where text elements appear wrapped around
 * an invisible cylinder, rotating continuously like a news ticker. Text scales and
 * fades based on depth position - larger and brighter at front, smaller and dimmer
 * at back - creating a realistic 3D carousel.
 * 
 * Features:
 * - Circular positioning of text elements using trigonometry
 * - Continuous rotation animation with configurable speed
 * - Depth-based scaling and opacity for 3D effect
 * - Perspective camera for realistic depth perception
 * - Customizable radius, rotation speed, and text styling
 * - Smooth blur effect for distant text elements
 * 
 * Use cases:
 * - News tickers and scrolling headlines
 * - Product showcases and feature carousels
 * - Brand value displays
 * - Rotating testimonials or quotes
 * - Dynamic text presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  texts: z
    .array(z.string())
    .min(1)
    .describe('Array of text strings to display in the carousel'),
  radius: z
    .number()
    .min(100)
    .max(500)
    .default(200)
    .optional()
    .describe('Radius of the cylinder in pixels'),
  rotationDuration: z
    .number()
    .min(5)
    .max(60)
    .default(10)
    .optional()
    .describe('Duration of one full rotation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .optional()
    .describe('Base font size in pixels'),
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto:600")'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(800)
    .optional()
    .describe('Camera perspective distance in pixels'),
  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum opacity for back-facing text'),
  minScale: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Minimum scale for back-facing text'),
  maxScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .optional()
    .describe('Maximum scale for front-facing text'),
  enableBlur: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable blur effect for distant text'),
  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Maximum blur amount in pixels'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .optional()
    .describe('Total duration of the effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    texts,
    radius = 200,
    rotationDuration = 10,
    fontSize = 48,
    fontWeight = '700',
    textColor = '#ffffff',
    font = 'Inter',
    perspective = 800,
    minOpacity = 0.3,
    minScale = 0.7,
    maxScale = 1.3,
    enableBlur = true,
    maxBlur = 3,
    duration = 10,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontStyle: React.CSSProperties = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = fontWeight;
  }

  const numTexts = texts.length;
  const angleStep = (2 * Math.PI) / numTexts; // Radians between each text

  // Create text elements positioned in a circle
  const textElements: RenderableComponentData[] = texts.map((text, index) => {
    const textId = `cylinder-text-${index}`;
    const angle = index * angleStep;

    // Calculate initial 2D circular position
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;

    // Calculate depth-based effects
    // z ranges from -radius to +radius
    // Normalize to 0-1 where 0 is back, 1 is front
    const depthFactor = (z + radius) / (2 * radius);

    // Scale based on depth
    const scale = minScale + depthFactor * (maxScale - minScale);

    // Opacity based on depth
    const opacity = minOpacity + depthFactor * (1 - minOpacity);

    // Blur based on depth (inverse - more blur when further)
    const blur = enableBlur ? maxBlur * (1 - depthFactor) : 0;

    // Create animation effect for continuous rotation
    // We'll animate translateX and scale/opacity to simulate 3D rotation
    const rotationEffect = {
      id: `rotation-${textId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: rotationDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: (() => {
          const ranges: any[] = [];
          const numKeyframes = 36; // Keyframes for smooth rotation

          for (let k = 0; k <= numKeyframes; k++) {
            const progress = k / numKeyframes;
            const currentAngle = angle + progress * 2 * Math.PI;

            // Calculate position at this keyframe
            const currentX = Math.sin(currentAngle) * radius;
            const currentZ = Math.cos(currentAngle) * radius;

            // Calculate depth factor
            const currentDepth = (currentZ + radius) / (2 * radius);

            // Calculate scale
            const currentScale =
              minScale + currentDepth * (maxScale - minScale);

            // Calculate opacity
            const currentOpacity =
              minOpacity + currentDepth * (1 - minOpacity);

            // Calculate blur
            const currentBlur = enableBlur ? maxBlur * (1 - currentDepth) : 0;

            // Add keyframes
            ranges.push(
              { key: 'translateX', val: currentX, prog: progress },
              { key: 'scale', val: currentScale, prog: progress },
              { key: 'opacity', val: currentOpacity, prog: progress },
            );

            if (enableBlur) {
              ranges.push({
                key: 'filter',
                val: `blur(${currentBlur}px)`,
                prog: progress,
              });
            }
          }

          return ranges;
        })(),
      },
    };

    return {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          position: 'absolute',
          fontSize: fontSize,
          fontWeight: fontStyle.fontWeight || fontWeight,
          color: textColor,
          textShadow: '0 0 20px rgba(0,0,0,0.5)',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`,
          opacity: opacity,
          filter: enableBlur ? `blur(${blur}px)` : undefined,
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: [
            fontStyle.fontWeight?.toString() || fontWeight.toString(),
          ],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [rotationEffect],
    } as RenderableComponentData;
  });

  // Container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'cylinder-carousel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
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
        id: 'cylinder-carousel-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: textElements,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: 'circular-text-carousel-2d',
  title: '2D Circular Text Carousel',
  description:
    'A rotating text carousel that positions text elements in a circle and continuously rotates them around the center. Creates a carousel-like effect perfect for cycling through multiple text elements with simulated depth via scale and opacity. This is a 2D simulation of a 3D cylindrical wrap effect using only 2D transforms supported by the effects system.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'carousel',
    'rotation',
    '3d-effect',
    'cylindrical',
    'ticker',
    'circular',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: [
      'Innovation',
      'Creativity',
      'Excellence',
      'Passion',
      'Vision',
      'Growth',
      'Impact',
      'Future',
    ],
    radius: 200,
    rotationDuration: 10,
    fontSize: 48,
    fontWeight: '700',
    textColor: '#ffffff',
    font: 'Inter',
    perspective: 800,
    minOpacity: 0.3,
    minScale: 0.7,
    maxScale: 1.3,
    enableBlur: true,
    maxBlur: 3,
    duration: 10,
  },
};

// Export preset
export const circularTextCarousel2dPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
