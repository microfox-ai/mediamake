/**
 * Dolly Zoom (Vertigo Effect) Text Reveal Preset
 *
 * This preset creates the famous dolly zoom (vertigo) effect where the text appears to maintain
 * its size while the spatial relationship dramatically changes around it. This creates an unsettling
 * visual sensation by animating perspective and scale inversely.
 *
 * Features:
 * - Perspective animation from 200px to 1200px over 1s
 * - Inverse scale/translateZ transforms to maintain apparent text size
 * - Subtle warping effects (rotateX, skewY) for psychological disorientation
 * - Background element that scales inversely to enhance depth perception
 * - Uses cubic-bezier(0.4, 0.1, 0.4, 0.9) for psychological impact
 * - 3D transform-style preservation throughout hierarchy
 *
 * Use cases:
 * - Creating dramatic reveals for titles or emphasis text
 * - Adding cinematic depth to video intros
 * - Creating psychological impact for dramatic moments
 * - Building unsettling or intense visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('VERTIGO')
    .describe('Text to display with the dolly zoom effect'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1)
    .describe('Duration of the effect in seconds'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or CSS color)'),
  perspectiveStart: z
    .number()
    .min(100)
    .max(500)
    .default(200)
    .describe('Starting perspective value in pixels (closer = more intense)'),
  perspectiveEnd: z
    .number()
    .min(600)
    .max(2000)
    .default(1200)
    .describe('Ending perspective value in pixels (farther = less intense)'),
  scaleStart: z
    .number()
    .min(0.1)
    .max(0.8)
    .default(0.3)
    .describe('Starting scale value for text (smaller = more dramatic)'),
  translateZStart: z
    .number()
    .min(50)
    .max(200)
    .default(100)
    .describe('Starting translateZ value in pixels (depth offset)'),
  rotateXStart: z
    .number()
    .min(-30)
    .max(0)
    .default(-10)
    .describe('Starting rotateX value in degrees (warping effect)'),
  skewYStart: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Starting skewY value in degrees (distortion effect)'),
  showBackground: z
    .boolean()
    .default(true)
    .describe('Whether to show the inverse-scaling background element'),
  backgroundIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of the background gradient (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  // Component IDs
  const rootContainerId = 'dolly-zoom-root';
  const perspectiveContainerId = 'dolly-zoom-perspective-container';
  const backgroundElementId = 'dolly-zoom-background';
  const textElementId = 'dolly-zoom-text';

  // Build background element
  const backgroundElement: RenderableComponentData = {
    id: backgroundElementId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle, rgba(100,100,100,${params.backgroundIntensity}) 0%, rgba(50,50,50,${params.backgroundIntensity * 0.3}) 100%);"></div>`,
      style: {
        position: 'absolute',
        inset: 0,
        transformStyle: 'preserve-3d',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: params.showBackground
      ? [
          {
            id: `${backgroundElementId}-inverse-scale`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: params.duration,
              mode: 'provider',
              targetIds: [backgroundElementId],
              ranges: [
                // Background scales inversely to text (grows as text appears to stay same size)
                { key: 'scale', val: 1 / params.scaleStart, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ]
      : [],
  };

  // Build text element
  const textElement: RenderableComponentData = {
    id: textElementId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontStyle.fontWeight,
        fontStyle: fontStyle.fontStyle,
        color: params.textColor,
        textAlign: 'center',
        textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        transformStyle: 'preserve-3d',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `${textElementId}-dolly-zoom`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            // Scale up from small to normal
            { key: 'scale', val: params.scaleStart, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // TranslateZ moves from far to near (inverse of scale)
            { key: 'translateZ', val: `${params.translateZStart}px`, prog: 0 },
            { key: 'translateZ', val: '0px', prog: 1 },
            // RotateX for warping effect
            { key: 'rotateX', val: `${params.rotateXStart}deg`, prog: 0 },
            { key: 'rotateX', val: '0deg', prog: 1 },
            // SkewY for distortion
            { key: 'skewY', val: `${params.skewYStart}deg`, prog: 0 },
            { key: 'skewY', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // Build perspective container
  const perspectiveContainer: RenderableComponentData = {
    id: perspectiveContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: params.showBackground
      ? [backgroundElement, textElement]
      : [textElement],
    effects: [
      {
        id: `${perspectiveContainerId}-perspective-anim`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [perspectiveContainerId],
          ranges: [
            // Perspective animates from close to far
            {
              key: 'perspective',
              val: `${params.perspectiveStart}px`,
              prog: 0,
            },
            { key: 'perspective', val: `${params.perspectiveEnd}px`, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [perspectiveContainer],
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
  id: 'dolly-zoom-text-reveal',
  title: 'Dolly Zoom (Vertigo Effect) Text Reveal',
  description:
    'A cinematic dolly zoom effect where text appears to maintain size while spatial relationships change dramatically. Features perspective animation from 200px to 1200px, inverse scale/translateZ transforms, and subtle warping effects (rotateX, skewY) for psychological disorientation. Uses cubic-bezier easing for enhanced impact. Includes optional background element for enhanced depth perception.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'dolly-zoom',
    'vertigo',
    'cinematic',
    '3d',
    'perspective',
    'warp',
    'dramatic',
    'effect',
  ],
  defaultInputParams: {
    text: 'VERTIGO',
    duration: 1,
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    perspectiveStart: 200,
    perspectiveEnd: 1200,
    scaleStart: 0.3,
    translateZStart: 100,
    rotateXStart: -10,
    skewYStart: 5,
    showBackground: true,
    backgroundIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dollyZoomTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
