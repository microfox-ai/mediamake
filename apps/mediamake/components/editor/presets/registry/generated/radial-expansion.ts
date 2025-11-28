/**
 * Radial Expansion Reveal Preset
 *
 * This preset creates a dramatic circular reveal effect that emanates from the center,
 * similar to a camera aperture opening or a spotlight expanding to illuminate content.
 * Multiple concentric circles expand at different rates, creating a layered depth effect
 * with varying opacity and blur values.
 *
 * Features:
 * - **Concentric Circle Reveal**: 4 circles expand from center with staggered timing
 * - **Layered Depth Effect**: Each ring has different opacity (1.0, 0.7, 0.5, 0.3) and blur (0px, 2px, 4px, 6px)
 * - **Hierarchical Reveal**: Reveals content layers in sequence (background → text → UI)
 * - **Customizable Parameters**: Control colors, speeds, scale factors, and blur amounts
 * - **Motion Graphics Quality**: After Effects-style dramatic reveals
 *
 * Use cases:
 * - Dramatic content reveals for presentations
 * - Spotlight effects for key moments
 * - Motion graphics-style transitions
 * - Attention-directing animations from center outward
 * - Video editing reveals and transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  trackId: z
    .string()
    .default('radial-expansion')
    .describe('Unique identifier for this preset instance'),

  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total duration of the reveal animation in seconds'),

  expansionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of each circle expansion animation in seconds'),

  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay between each circle starting (stagger timing in seconds)'),

  circle1Scale: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Final scale value for innermost circle (sharpest, most opaque)'),

  circle2Scale: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Final scale value for second circle'),

  circle3Scale: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Final scale value for third circle'),

  circle4Scale: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.8)
    .describe('Final scale value for outermost circle (most blur)'),

  circle1Opacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Opacity for innermost circle'),

  circle2Opacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Opacity for second circle'),

  circle3Opacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Opacity for third circle'),

  circle4Opacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity for outermost circle'),

  circle1Blur: z
    .number()
    .min(0)
    .max(20)
    .default(0)
    .describe('Blur amount for innermost circle in pixels'),

  circle2Blur: z
    .number()
    .min(0)
    .max(20)
    .default(2)
    .describe('Blur amount for second circle in pixels'),

  circle3Blur: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Blur amount for third circle in pixels'),

  circle4Blur: z
    .number()
    .min(0)
    .max(20)
    .default(6)
    .describe('Blur amount for outermost circle in pixels'),

  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color behind the reveal (CSS color value)'),

  maskColor: z
    .string()
    .default('#000000')
    .describe('Color of the expanding circle masks (CSS color value)'),

  useClipPath: z
    .boolean()
    .default(false)
    .describe('Use clip-path instead of scale transforms (better performance for complex scenes)'),

  backgroundImage: z
    .string()
    .optional()
    .describe('Optional background image to reveal first'),

  textContent: z
    .string()
    .optional()
    .describe('Optional text content to reveal in the middle layer'),

  uiElements: z
    .string()
    .optional()
    .describe('Optional HTML for UI elements to reveal last'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    duration,
    expansionDuration,
    staggerDelay,
    circle1Scale,
    circle2Scale,
    circle3Scale,
    circle4Scale,
    circle1Opacity,
    circle2Opacity,
    circle3Opacity,
    circle4Opacity,
    circle1Blur,
    circle2Blur,
    circle3Blur,
    circle4Blur,
    backgroundColor,
    maskColor,
    useClipPath,
    backgroundImage,
    textContent,
    uiElements,
  } = params;

  // Helper function to create circle mask effects
  const createCircleEffect = (
    circleId: string,
    scaleEnd: number,
    opacity: number,
    blur: number,
    startDelay: number,
  ) => {
    if (useClipPath) {
      // Use clip-path animation
      return {
        id: `${circleId}-clip-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: startDelay,
          duration: expansionDuration,
          mode: 'provider',
          targetIds: [circleId],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 1 },
            { key: 'opacity', val: opacity, prog: 0 },
            { key: 'opacity', val: opacity, prog: 1 },
          ],
        },
      };
    } else {
      // Use scale transform animation
      return {
        id: `${circleId}-scale-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: startDelay,
          duration: expansionDuration,
          mode: 'provider',
          targetIds: [circleId],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: scaleEnd, prog: 1 },
            { key: 'opacity', val: opacity, prog: 0 },
            { key: 'opacity', val: opacity, prog: 1 },
          ],
        },
      };
    }
  };

  // Content layers
  const contentLayers: RenderableComponentData[] = [];

  // Background layer (revealed first)
  if (backgroundImage) {
    contentLayers.push({
      id: `${trackId}-background-layer`,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: backgroundImage,
        className: 'absolute inset-0 w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);
  }

  // Text layer (revealed second)
  if (textContent) {
    contentLayers.push({
      id: `${trackId}-text-layer`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: textContent,
        className: 'absolute inset-0 flex items-center justify-center text-white text-6xl font-bold',
        style: {
          textAlign: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);
  }

  // UI layer (revealed last)
  if (uiElements) {
    contentLayers.push({
      id: `${trackId}-ui-layer`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: uiElements,
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);
  }

  // Circle mask layers (4 concentric circles with staggered timing)
  const circles = [
    {
      id: `${trackId}-circle-1`,
      scale: circle1Scale,
      opacity: circle1Opacity,
      blur: circle1Blur,
      delay: 0,
    },
    {
      id: `${trackId}-circle-2`,
      scale: circle2Scale,
      opacity: circle2Opacity,
      blur: circle2Blur,
      delay: staggerDelay,
    },
    {
      id: `${trackId}-circle-3`,
      scale: circle3Scale,
      opacity: circle3Opacity,
      blur: circle3Blur,
      delay: staggerDelay * 2,
    },
    {
      id: `${trackId}-circle-4`,
      scale: circle4Scale,
      opacity: circle4Opacity,
      blur: circle4Blur,
      delay: staggerDelay * 3,
    },
  ];

  const circleLayers: RenderableComponentData[] = circles.map((circle) => ({
    id: circle.id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          mixBlendMode: 'normal',
        },
      },
    },
    context: {
      timing: {
        start: circle.delay,
        duration: duration - circle.delay,
      },
    },
    effects: [
      createCircleEffect(
        circle.id,
        circle.scale,
        circle.opacity,
        circle.blur,
        0, // Effect starts immediately relative to circle container
      ),
    ],
    childrenData: [
      {
        id: `${circle.id}-mask`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="w-full h-full rounded-full" style="background: radial-gradient(circle, transparent 0%, transparent 50%, ${maskColor} 50%); will-change: transform; ${circle.blur > 0 ? `filter: blur(${circle.blur}px);` : ''}"></div>`,
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: expansionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  })) as RenderableComponentData[];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
    childrenData: [...contentLayers, ...circleLayers],
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
  id: 'radial-expansion',
  title: 'Radial Expansion Reveal',
  description:
    'Creates a circular reveal effect emanating from the center with multiple concentric circles expanding at different rates. Features layered depth with varying opacity and blur, revealing content hierarchically from center outward.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'reveal',
    'radial',
    'circular',
    'aperture',
    'spotlight',
    'motion-graphics',
    'transition',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'radial-expansion',
    duration: 2,
    expansionDuration: 1.5,
    staggerDelay: 0.15,
    circle1Scale: 1,
    circle2Scale: 1.2,
    circle3Scale: 1.5,
    circle4Scale: 1.8,
    circle1Opacity: 1,
    circle2Opacity: 0.7,
    circle3Opacity: 0.5,
    circle4Opacity: 0.3,
    circle1Blur: 0,
    circle2Blur: 2,
    circle3Blur: 4,
    circle4Blur: 6,
    backgroundColor: '#000000',
    maskColor: '#000000',
    useClipPath: false,
    backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    textContent: 'DRAMATIC REVEAL',
    uiElements: '<div style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); color: white; font-size: 24px; text-align: center;">Scroll for more</div>',
  },
};

// Export preset
export const radialExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
