/**
 * Momentum-Conserving 3D Carousel Preset
 *
 * Creates a dynamic 3D carousel where text rotates along an elliptical orbital path
 * with constant angular velocity. Words travel through 3D space with perspective depth
 * scaling, starting from behind (z: -100px, opacity: 0), rotating forward into view,
 * and fading out as they pass. Features motion blur during fastest movement sections
 * and smooth Ferris wheel-like rotation perfect for sports highlight reels and high-energy content.
 *
 * Features:
 * - **3D Perspective**: Words rotate through 3D space with depth-based scaling
 * - **Constant Angular Velocity**: Smooth linear rotation like a Ferris wheel
 * - **Elliptical Orbit**: Words travel along circular path with depth (z-axis)
 * - **Dynamic Motion Blur**: Blur effect during fastest movement (sides of ellipse)
 * - **Opacity Transitions**: Fade in/out based on z-position visibility
 * - **Staggered Timing**: Words follow each other with precise timing gaps
 * - **Scale Dynamics**: Near text appears larger, distant text smaller
 *
 * Use cases:
 * - Sports highlight reels with constant energy
 * - Dynamic product showcases
 * - High-energy promotional content
 * - Continuous motion graphics
 * - Carousel-style presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  words: z.array(z.string()).describe('Array of words to display in carousel'),
  duration: z
    .number()
    .min(1)
    .default(15)
    .describe('Total duration of the carousel animation in seconds'),
  rotationDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration for one complete 360-degree rotation per word in seconds'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Delay between each word entering the carousel in seconds'),
  orbitRadius: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Radius of the circular orbital path in pixels'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Base font size for text in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (CSS color value)'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Maximum blur amount during fastest movement in pixels'),
  scaleMultiplier: z
    .number()
    .min(0.001)
    .max(0.01)
    .default(0.003)
    .describe('Scale factor based on z-position (higher = more dramatic scaling)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
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
  }

  const words = params.words || [
    'MOMENTUM',
    'ENERGY',
    'DYNAMIC',
    'POWER',
    'IMPACT',
  ];
  const rotationDuration = params.rotationDuration;
  const staggerDelay = params.staggerDelay;
  const orbitRadius = params.orbitRadius;

  // Create word components with effects
  const wordComponents = words.map((word, index) => {
    const wordId = `carousel-word-${index}`;
    const wordStartTime = index * staggerDelay;

    // Rotation effect: 0deg to 360deg with linear easing
    const rotationEffect: GenericEffectData = {
      type: 'linear',
      start: wordStartTime,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Rotate from 0 to 360 degrees
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: 360, prog: 1 },
        // Translate Z to create circular path
        { key: 'translateZ', val: orbitRadius, prog: 0 },
        { key: 'translateZ', val: orbitRadius, prog: 1 },
      ],
    };

    // Opacity effect: fade based on z-position visibility
    // Visible from -45deg to 45deg (front-facing), fade out elsewhere
    const opacityEffect: GenericEffectData = {
      type: 'linear',
      start: wordStartTime,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 }, // Start: behind (270deg)
        { key: 'opacity', val: 0, prog: 0.125 }, // 315deg: still behind
        { key: 'opacity', val: 1, prog: 0.25 }, // 0deg: fully visible (front)
        { key: 'opacity', val: 1, prog: 0.375 }, // 45deg: still visible
        { key: 'opacity', val: 0, prog: 0.5 }, // 90deg: side, fade out
        { key: 'opacity', val: 0, prog: 0.625 }, // 135deg: back
        { key: 'opacity', val: 0, prog: 0.75 }, // 180deg: far back
        { key: 'opacity', val: 0, prog: 0.875 }, // 225deg: back
        { key: 'opacity', val: 0, prog: 1 }, // 270deg: behind again
      ],
    };

    // Dynamic scale based on z-position
    // When rotateX = 0deg (front), scale = 1 + orbitRadius * scaleMultiplier
    // When rotateX = 180deg (back), scale = 1 - orbitRadius * scaleMultiplier
    const scaleEffect: GenericEffectData = {
      type: 'linear',
      start: wordStartTime,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale based on apparent z-position
        { key: 'scale', val: 1, prog: 0 }, // 270deg: neutral
        { key: 'scale', val: 1 + orbitRadius * params.scaleMultiplier, prog: 0.25 }, // 0deg: closest (largest)
        { key: 'scale', val: 1, prog: 0.5 }, // 90deg: side
        { key: 'scale', val: 1 - orbitRadius * params.scaleMultiplier * 0.5, prog: 0.75 }, // 180deg: farthest (smallest)
        { key: 'scale', val: 1, prog: 1 }, // 270deg: neutral
      ],
    };

    // Motion blur during fastest movement (sides of ellipse: 90deg and 270deg)
    const blurEffect: GenericEffectData = {
      type: 'linear',
      start: wordStartTime,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'blur', val: '0px', prog: 0 }, // 270deg: no blur (apex)
        { key: 'blur', val: `${params.maxBlur}px`, prog: 0.125 }, // 315deg: side, blur building
        { key: 'blur', val: '0px', prog: 0.25 }, // 0deg: front apex, clear
        { key: 'blur', val: `${params.maxBlur}px`, prog: 0.375 }, // 45deg: side, blur
        { key: 'blur', val: '0px', prog: 0.5 }, // 90deg: side apex, clear
        { key: 'blur', val: `${params.maxBlur}px`, prog: 0.625 }, // 135deg: side, blur
        { key: 'blur', val: '0px', prog: 0.75 }, // 180deg: back apex, clear
        { key: 'blur', val: `${params.maxBlur}px`, prog: 0.875 }, // 225deg: side, blur
        { key: 'blur', val: '0px', prog: 1 }, // 270deg: apex, clear
      ],
    };

    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          color: params.textColor,
          fontWeight: fontStyle.fontWeight || 700,
          fontStyle: fontStyle.fontStyle || 'normal',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          transformStyle: 'preserve-3d',
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['700'],
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
          id: `rotation-${wordId}`,
          componentId: 'generic',
          data: rotationEffect,
        },
        {
          id: `opacity-${wordId}`,
          componentId: 'generic',
          data: opacityEffect,
        },
        {
          id: `scale-${wordId}`,
          componentId: 'generic',
          data: scaleEffect,
        },
        {
          id: `blur-${wordId}`,
          componentId: 'generic',
          data: blurEffect,
        },
      ],
    };

    return wordComponent;
  });

  // Create center anchor container
  const centerAnchor: RenderableComponentData = {
    id: 'carousel-center-anchor',
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
        duration: params.duration,
      },
    },
    childrenData: wordComponents as RenderableComponentData[],
  };

  // Create perspective container
  const perspectiveContainer: RenderableComponentData = {
    id: 'carousel-perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [centerAnchor],
  };

  return {
    output: {
      childrenData: [perspectiveContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'momentum-carousel-3d',
  title: 'Momentum-Conserving 3D Carousel',
  description:
    'A dynamic 3D carousel where text rotates along an elliptical orbital path with constant angular velocity. Words travel through 3D space with perspective depth scaling, starting from behind (z: -100px, opacity: 0), rotating forward into view, and fading out as they pass. Features motion blur during fastest movement sections and smooth Ferris wheel-like rotation perfect for sports highlight reels and high-energy content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'carousel',
    '3d',
    'rotation',
    'perspective',
    'orbit',
    'motion-blur',
    'sports',
    'energy',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['MOMENTUM', 'ENERGY', 'DYNAMIC', 'POWER', 'IMPACT'],
    duration: 15,
    rotationDuration: 3,
    staggerDelay: 0.3,
    orbitRadius: 200,
    fontSize: 72,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    maxBlur: 2,
    scaleMultiplier: 0.003,
  },
};

export const momentumCarousel3dPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
