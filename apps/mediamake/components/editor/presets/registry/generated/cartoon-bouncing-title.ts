/**
 * Cartoon Bouncing Title Animation Preset
 *
 * This preset creates a playful, cartoon-style bouncing title animation inspired by classic animation principles.
 * The text scales up with exaggerated anticipation, massive overshoot, and multiple bounces that gradually decay,
 * mimicking a cartoon character's eyes popping out. Each bounce includes squash frames at contact points where the
 * text compresses before expanding again. Rotation and skew add personality to the bounce, while secondary sparkle
 * elements react to the main bounce with staggered animations.
 *
 * Features:
 * - **Exaggerated Bounce Animation**: Scale sequence with anticipation and overshoot
 * - **Squash & Stretch Physics**: Vertical compression at each bounce contact point
 * - **Rotation Effects**: Dynamic rotation for added personality
 * - **Secondary Animation**: Sparkle elements that react to main bounce timing
 * - **Festive Composition**: Vibrant gradient background with playful energy
 *
 * Use cases:
 * - Creating energetic title cards for videos
 * - Adding playful intro animations
 * - Building cartoon-style text effects
 * - Creating attention-grabbing social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  titleText: z.string().default('BOUNCE!').describe('The title text to animate with cartoon bouncing effect'),
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Impact:900", "BebasNeue:700", "Anton")'),
  textColor: z.string().default('#FFFFFF').describe('Color of the title text'),
  strokeColor: z.string().default('#000000').describe('Color of the text stroke outline'),
  strokeWidth: z.number().default(2).describe('Width of the text stroke outline in pixels'),
  sparkleColor: z.string().default('#FFD700').describe('Color of the sparkle decorative elements'),
  duration: z.number().default(2).describe('Total duration of the animation in seconds'),
  backgroundGradientStart: z.string().default('#60A5FA').describe('Start color of the gradient background (from-color)'),
  backgroundGradientEnd: z.string().default('#A855F7').describe('End color of the gradient background (to-color)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Impact';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;

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
  } else {
    fontStyle.fontWeight = 900; // Default bold weight for Impact
  }

  const duration = params.duration;

  // Main title text component
  const titleTextComponent: RenderableComponentData = {
    id: 'cartoon-title-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.titleText,
      className: 'text-8xl font-black',
      style: {
        color: params.textColor,
        textShadow: '4px 4px 8px rgba(0,0,0,0.3)',
        fontFamily: fontFamily,
        WebkitTextStroke: `${params.strokeWidth}px ${params.strokeColor}`,
        paintOrder: 'stroke fill',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // Create bounce scale effect with exaggerated animation
  const bounceScaleEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['cartoon-title-text'],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },         // Start normal
      { key: 'scale', val: 0.7, prog: 0.1 },     // Anticipation (squash down)
      { key: 'scale', val: 2.0, prog: 0.25 },    // Massive overshoot
      { key: 'scale', val: 0.6, prog: 0.4 },     // First bounce (compress)
      { key: 'scale', val: 1.3, prog: 0.55 },    // Second bounce peak
      { key: 'scale', val: 0.8, prog: 0.7 },     // Third bounce (compress)
      { key: 'scale', val: 1.1, prog: 0.82 },    // Fourth bounce peak
      { key: 'scale', val: 0.95, prog: 0.91 },   // Final settle
      { key: 'scale', val: 1.0, prog: 1 },       // Rest position
    ],
  };

  // Create squash effect (scaleY compression at bounce contact points)
  const squashEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['cartoon-title-text'],
    ranges: [
      { key: 'scaleY', val: 1, prog: 0 },        // Start normal
      { key: 'scaleY', val: 1, prog: 0.1 },      // Normal during anticipation
      { key: 'scaleY', val: 0.7, prog: 0.25 },   // Squash at first peak contact
      { key: 'scaleY', val: 1, prog: 0.3 },      // Stretch back
      { key: 'scaleY', val: 0.7, prog: 0.4 },    // Squash at second bounce
      { key: 'scaleY', val: 1, prog: 0.48 },     // Stretch back
      { key: 'scaleY', val: 0.8, prog: 0.55 },   // Lighter squash
      { key: 'scaleY', val: 1, prog: 0.62 },     // Stretch back
      { key: 'scaleY', val: 0.85, prog: 0.7 },   // Even lighter squash
      { key: 'scaleY', val: 1, prog: 0.76 },     // Stretch back
      { key: 'scaleY', val: 0.9, prog: 0.82 },   // Final subtle squash
      { key: 'scaleY', val: 1, prog: 1 },        // Rest position
    ],
  };

  // Create rotation effect for personality
  const rotationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['cartoon-title-text'],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },        // Start straight
      { key: 'rotate', val: -15, prog: 0.1 },    // Tilt left during anticipation
      { key: 'rotate', val: 25, prog: 0.3 },     // Swing right after first bounce
      { key: 'rotate', val: -10, prog: 0.55 },   // Tilt left again
      { key: 'rotate', val: 5, prog: 0.75 },     // Small tilt right
      { key: 'rotate', val: 0, prog: 1 },        // Settle straight
    ],
  };

  // Attach effects to title component
  titleTextComponent.effects = [
    {
      id: 'bounce-scale-effect',
      componentId: 'generic',
      data: bounceScaleEffect,
    },
    {
      id: 'squash-effect',
      componentId: 'generic',
      data: squashEffect,
    },
    {
      id: 'rotation-effect',
      componentId: 'generic',
      data: rotationEffect,
    },
  ];

  // Create sparkle elements using HTMLBlockAtom (ShapeAtom is deprecated)
  const createSparkle = (id: string, size: number, top?: string, bottom?: string, left?: string, right?: string, triggerTime: number) => {
    const sparkleHTML = `<div style='width: ${size}px; height: ${size}px; background: ${params.sparkleColor}; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);'></div>`;
    
    const sparkleComponent: RenderableComponentData = {
      id: id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: sparkleHTML,
        className: 'absolute',
        style: {
          ...(top && { top }),
          ...(bottom && { bottom }),
          ...(left && { left }),
          ...(right && { right }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [],
    };

    // Scale effect for sparkle (pop in and settle)
    const sparkleScaleEffect: GenericEffectData = {
      type: 'ease-out',
      start: triggerTime,
      duration: 0.3,
      mode: 'provider',
      targetIds: [id],
      ranges: [
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1.5, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    // Rotation effect for sparkle (spin)
    const sparkleRotateEffect: GenericEffectData = {
      type: 'linear',
      start: triggerTime,
      duration: 0.5,
      mode: 'provider',
      targetIds: [id],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 180, prog: 1 },
      ],
    };

    sparkleComponent.effects = [
      {
        id: `${id}-scale`,
        componentId: 'generic',
        data: sparkleScaleEffect,
      },
      {
        id: `${id}-rotate`,
        componentId: 'generic',
        data: sparkleRotateEffect,
      },
    ];

    return sparkleComponent;
  };

  // Create four sparkles at different positions with staggered timing
  const sparkle1 = createSparkle('sparkle-1', 40, '20%', undefined, '15%', undefined, 0.25);
  const sparkle2 = createSparkle('sparkle-2', 35, '30%', undefined, undefined, '20%', 0.4);
  const sparkle3 = createSparkle('sparkle-3', 45, undefined, '25%', '25%', undefined, 0.55);
  const sparkle4 = createSparkle('sparkle-4', 38, undefined, '20%', undefined, '18%', 0.7);

  // Root container with gradient background
  const rootContainer: RenderableComponentData = {
    id: 'cartoon-bounce-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full bg-gradient-to-b flex items-center justify-center`,
        style: {
          background: `linear-gradient(to bottom, ${params.backgroundGradientStart}, ${params.backgroundGradientEnd})`,
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
      sparkle1,
      sparkle2,
      sparkle3,
      sparkle4,
      titleTextComponent,
    ] as RenderableComponentData[],
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
  id: 'cartoonBouncingTitle',
  title: 'Cartoon Bouncing Title Animation',
  description: 'Playful cartoon-style bouncing title animation with exaggerated anticipation, massive overshoot, multiple decaying bounces, squash-and-stretch physics, rotation/skew personality, and reactive sparkle decorations. Features classic animation principles with 8-stage bounce sequence and secondary motion elements for a festive, energetic composition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['title', 'cartoon', 'bounce', 'animation', 'playful', 'squash-stretch', 'sparkles', 'energetic', 'festive'],
  dependencies: {},
  defaultInputParams: {
    titleText: 'BOUNCE!',
    font: 'Impact:900',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 2,
    sparkleColor: '#FFD700',
    duration: 2,
    backgroundGradientStart: '#60A5FA',
    backgroundGradientEnd: '#A855F7',
  },
};

// Export preset
export const cartoonBouncingTitlePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
