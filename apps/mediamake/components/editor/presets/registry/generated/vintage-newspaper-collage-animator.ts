/**
 * Vintage Newspaper Collage Animator Preset
 *
 * This preset creates a vintage newspaper collage effect where each word is treated as a physical
 * newspaper clipping with realistic physics simulation. Words float down from the top with rotation,
 * air resistance wobble, and bounce landing effects. The animation has a stop-motion feel (12fps)
 * achieved by using discrete keyframes instead of smooth interpolation.
 *
 * Features:
 * - **Newspaper Aesthetic**: Varying yellowing levels, serif fonts, aged paper textures
 * - **Realistic Physics**: Gravity acceleration, air resistance wobble, bounce landing
 * - **Stop-Motion Feel**: 12fps discrete stepping using keyframe technique
 * - **Shadow Effects**: Shadows grow as words fall closer to surface
 * - **Paper Texture**: Sepia filter, noise grain, vintage paper look
 * - **3D Effects**: rotateX tilt on impact for depth
 *
 * Use cases:
 * - Creating spy movie-style threatening messages
 * - Vintage newspaper ransom note effects
 * - Retro collage animations
 * - Stop-motion style text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display as newspaper collage (split into words)'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the animation in seconds'),
  fallDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the fall animation for each word in seconds'),
  bounceDuration: z
    .number()
    .default(0.3)
    .describe('Duration of the bounce/landing animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.15)
    .describe('Delay between each word starting to fall (seconds)'),
  fonts: z
    .array(z.string())
    .default(['Times New Roman', 'Georgia', 'Garamond'])
    .describe('Array of serif font families to randomly choose from'),
  backgroundGradient: z
    .string()
    .default('from-amber-50 to-yellow-100')
    .describe('Tailwind gradient classes for background'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Helper: Generate random value in range
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Helper: Choose random item from array
  const choose = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Helper: Generate noise texture data URI for paper grain
  const generateNoiseTexture = (): string => {
    // Simple noise pattern as SVG data URI
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="200" height="200" filter="url(#noise)" opacity="0.05"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Helper: Generate yellowing background colors
  const yellowingColors = [
    '#f5f5dc', // beige
    '#faf0e6', // linen
    '#ffefd5', // papayawhip
    '#ffe4c4', // bisque
    '#fdf5e6', // oldlace
    '#f5deb3', // wheat
  ];

  // Create word components with physics effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const wordContainerId = `word-container-${index}`;

    // Random styling for newspaper variety
    const fontSize = random(18, 32);
    const fontWeight = choose([400, 700]);
    const fontStyle = choose(['normal', 'italic']);
    const fontFamily = choose(params.fonts);
    const backgroundColor = choose(yellowingColors);
    const horizontalPosition = random(10, 90); // 10% to 90% of width

    // Start time for this word (staggered)
    const wordStartTime = index * params.staggerDelay;

    // Create 12 discrete keyframes for stop-motion effect (12fps feel)
    const createStopMotionKeyframes = () => {
      const keyframes = [];
      const steps = 12; // 12 frames per second feel

      for (let i = 0; i <= steps; i++) {
        const prog = i / steps;

        // Gravity acceleration: quadratic easing for translateY
        const translateYProgress = prog * prog; // Accelerating fall
        const translateYValue = `${-100 + translateYProgress * 100}vh`;

        // Wobble rotation using sine wave
        const rotationAngle = Math.sin(prog * 6) * 5; // 5 degrees max wobble

        keyframes.push(
          { key: 'translateY', val: translateYValue, prog },
          { key: 'rotate', val: `${rotationAngle}deg`, prog },
        );
      }

      return keyframes;
    };

    // Fall effect with stop-motion discrete keyframes
    const fallEffect = {
      id: `fall-effect-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const, // Linear for discrete stepping
        start: 0, // Relative to word container start
        duration: params.fallDuration,
        mode: 'provider' as const,
        targetIds: [wordContainerId],
        ranges: createStopMotionKeyframes(),
      },
    };

    // Shadow growth effect (grows as word falls closer)
    const shadowGrowthEffect = {
      id: `shadow-growth-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in' as const,
        start: 0,
        duration: params.fallDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'boxShadow', val: '0px 2px 4px rgba(0,0,0,0.1)', prog: 0 },
          { key: 'boxShadow', val: '0px 8px 16px rgba(0,0,0,0.3)', prog: 1 },
        ],
      },
    };

    // Bounce landing effect
    const bounceEffect = {
      id: `bounce-effect-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: params.fallDuration, // Start after fall completes
        duration: params.bounceDuration,
        mode: 'provider' as const,
        targetIds: [wordContainerId],
        ranges: [
          { key: 'translateY', val: '0vh', prog: 0 },
          { key: 'translateY', val: '-20px', prog: 0.5 }, // Bounce up
          { key: 'translateY', val: '0vh', prog: 1 }, // Settle down
          { key: 'rotateX', val: '0deg', prog: 0 },
          { key: 'rotateX', val: '10deg', prog: 0.5 }, // 3D tilt on impact
          { key: 'rotateX', val: '0deg', prog: 1 },
        ],
      },
    };

    // Settle shadow effect (reduce shadow after landing)
    const settleShadowEffect = {
      id: `settle-shadow-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: params.fallDuration,
        duration: params.bounceDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'boxShadow', val: '0px 8px 16px rgba(0,0,0,0.3)', prog: 0 },
          { key: 'boxShadow', val: '0px 4px 8px rgba(0,0,0,0.2)', prog: 1 },
        ],
      },
    };

    // Text atom with newspaper styling
    const textAtom: RenderableComponentData = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          fontStyle: fontStyle,
          color: '#1a1a1a',
          padding: '6px 10px',
          backgroundColor: backgroundColor,
          border: '1px solid rgba(0,0,0,0.1)',
          filter: 'sepia(0.3) contrast(1.1)',
          backgroundImage: `url(${generateNoiseTexture()})`,
          backgroundBlendMode: 'multiply',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.1)', // Initial shadow
          display: 'inline-block',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.fallDuration + params.bounceDuration,
        },
      },
      effects: [shadowGrowthEffect, settleShadowEffect],
    };

    // Word container with fall and bounce effects
    const wordContainer: RenderableComponentData = {
      id: wordContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${horizontalPosition}%`,
            top: '0',
            transform: 'translateY(-100vh)', // Start above viewport
          },
        },
      },
      context: {
        timing: {
          start: wordStartTime, // Staggered start
          duration: params.fallDuration + params.bounceDuration,
        },
      },
      effects: [fallEffect, bounceEffect],
      childrenData: [textAtom],
    };

    return wordContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-newspaper-collage-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative min-h-screen bg-gradient-to-br ${params.backgroundGradient}`,
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: wordComponents,
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
  id: 'vintage-newspaper-collage-animator',
  title: 'Vintage Newspaper Collage Animator',
  description:
    'Animates words as physical newspaper clippings with realistic physics, stop-motion feel (12fps), and vintage newspaper aesthetics. Each word floats down with gravity acceleration, rotation wobble, air resistance, shadow growth, bounce landing, and aged paper textures.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'newspaper',
    'collage',
    'vintage',
    'physics',
    'stop-motion',
    'retro',
    'spy',
    'ransom-note',
    'paper',
    'clipping',
  ],
  defaultInputParams: {
    text: 'We have your precious data Pay 1000 bitcoins or else',
    duration: 10,
    fallDuration: 2.0,
    bounceDuration: 0.3,
    staggerDelay: 0.15,
    fonts: ['Times New Roman', 'Georgia', 'Garamond'],
    backgroundGradient: 'from-amber-50 to-yellow-100',
  },
  dependencies: {},
};

// Export preset
export const vintageNewspaperCollageAnimatorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
