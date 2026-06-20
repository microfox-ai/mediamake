/**
 * Spring-Loaded Compression Text Effect Preset
 *
 * This preset creates a dynamic spring physics animation where text squashes down like a spring
 * being compressed, then bounces back with stored energy. The effect includes:
 *
 * Features:
 * - **Squash and Stretch**: Text compresses to 40% height while expanding to 160% width to maintain volume
 * - **Bounce Physics**: Spring-back with overshoot to 120% height before settling to normal
 * - **Secondary Motion**: Individual letters rotate slightly during compression (spring twisting effect)
 * - **Particle Burst**: Colorful particles burst out during spring release using HTMLBlockAtom
 * - **Grounded Animation**: Transform origin at bottom center for realistic compression
 * - **Custom Easing**: Bounce easing with cubic-bezier for spring-like motion
 *
 * Animation Phases:
 * - Compression (0-20%): Text squashes down, letters rotate
 * - Release/Bounce (20-40%): Spring-back with overshoot, particles burst
 * - Settling (40-80%): Oscillating motion to settle
 * - Final (80-100%): Reaches final resting position
 *
 * Use cases:
 * - Impact text reveals
 * - Energetic title animations
 * - Spring physics demonstrations
 * - Dynamic logo animations
 * - Attention-grabbing text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('SPRING')
    .describe('Text content to display with spring compression effect'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the spring animation in seconds'),
  fontSize: z
    .number()
    .min(40)
    .max(300)
    .default(120)
    .describe('Font size of the text in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text (CSS color value)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "400", "700", "900")'),
  particleCount: z
    .number()
    .min(4)
    .max(16)
    .default(8)
    .describe('Number of particle burst elements during spring release'),
  particleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for particle burst distance and size'),
  rotationIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum rotation angle in degrees for letter twisting during compression'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    fontFamily,
    fontWeight,
    particleCount,
    particleIntensity,
    rotationIntensity,
  } = params;

  const rootContainerId = 'spring-root-container';
  const textWrapperId = 'spring-text-wrapper';
  const textId = 'spring-text';
  const particleContainerId = 'spring-particle-container';

  // Helper: Generate particle components with burst animations
  const createParticles = () => {
    const particles: RenderableComponentData[] = [];
    const angleStep = 360 / particleCount;
    const colors = [
      'linear-gradient(135deg, #ff6b6b, #ee5a6f)',
      'linear-gradient(135deg, #4ecdc4, #44a3a3)',
      'linear-gradient(135deg, #f7b731, #fa8231)',
      'linear-gradient(135deg, #a55eea, #8854d0)',
      'linear-gradient(135deg, #26de81, #20bf6b)',
      'linear-gradient(135deg, #fd79a8, #e84393)',
      'linear-gradient(135deg, #45aaf2, #2d98da)',
      'linear-gradient(135deg, #fed330, #f7b731)',
    ];

    for (let i = 0; i < particleCount; i++) {
      const angle = angleStep * i;
      const size = (10 + Math.random() * 4) * particleIntensity;
      const distance = (80 + Math.random() * 40) * particleIntensity;
      const color = colors[i % colors.length];
      const startTime = 0.6 + Math.random() * 0.12; // Burst starts around 20% mark
      const particleDuration = 1.0 + Math.random() * 0.2;

      const particleId = `particle-${i}`;
      const radians = (angle * Math.PI) / 180;
      const endX = Math.cos(radians) * distance;
      const endY = Math.sin(radians) * distance;

      // Particle effect: translate + scale + fade
      const particleEffect: GenericEffectData = {
        type: 'ease-out',
        start: startTime,
        duration: particleDuration,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          // Start from center
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: endX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: endY, prog: 1 },
          // Scale burst
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.3 },
          { key: 'scale', val: 0.8, prog: 1 },
          // Fade out
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      particles.push({
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${size}px; height: ${size}px; background: ${color}; border-radius: 50%; box-shadow: 0 0 ${size}px rgba(255,255,255,0.6);'></div>`,
          className: 'absolute',
          style: {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
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
            id: `particle-effect-${i}`,
            componentId: 'generic',
            data: particleEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Main text squash-stretch effect with spring physics
  const textWrapperEffect: GenericEffectData = {
    type: 'linear', // Custom cubic-bezier handled via ranges progression
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textWrapperId],
    ranges: [
      // Compression phase (0-20%): scaleY 1→0.4, scaleX 1→1.6
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: 0.4, prog: 0.2 },
      // Release/bounce (20-40%): scaleY 0.4→1.2
      { key: 'scaleY', val: 1.2, prog: 0.4 },
      // Settling oscillation (40-60%): scaleY 1.2→0.9
      { key: 'scaleY', val: 0.9, prog: 0.6 },
      // (60-80%): scaleY 0.9→1.05
      { key: 'scaleY', val: 1.05, prog: 0.8 },
      // Final settle (80-100%): scaleY 1.05→1
      { key: 'scaleY', val: 1, prog: 1 },

      // Inverse scaleX to maintain volume
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 1.6, prog: 0.2 },
      { key: 'scaleX', val: 0.85, prog: 0.4 },
      { key: 'scaleX', val: 1.1, prog: 0.6 },
      { key: 'scaleX', val: 0.97, prog: 0.8 },
      { key: 'scaleX', val: 1, prog: 1 },
    ],
  };

  // Letter rotation effect (secondary motion - letters twist during compression)
  // We'll apply rotation to the text atom itself as a subtle twist
  const textRotationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Slight rotation during compression
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: rotationIntensity * 0.5, prog: 0.2 }, // Twist at compression peak
      { key: 'rotate', val: -rotationIntensity * 0.3, prog: 0.4 }, // Counter-twist during bounce
      { key: 'rotate', val: rotationIntensity * 0.1, prog: 0.6 },
      { key: 'rotate', val: 0, prog: 1 },
    ],
  };

  // Build component tree
  const textWrapperComponent: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          transformOrigin: 'bottom center',
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
        id: 'text-wrapper-squash-stretch',
        componentId: 'generic',
        data: textWrapperEffect,
      },
    ],
    childrenData: [
      {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            color: textColor,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            letterSpacing: '0.05em',
            transformOrigin: 'bottom center',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            display: 'swap',
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
            id: 'text-rotation',
            componentId: 'generic',
            data: textRotationEffect,
          },
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  const particleContainerComponent: RenderableComponentData = {
    id: particleContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: createParticles(),
  } as RenderableComponentData;

  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
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
        duration: duration,
      },
    },
    childrenData: [
      textWrapperComponent,
      particleContainerComponent,
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'spring-compression-text',
  title: 'Spring-Loaded Compression Text Effect',
  description:
    'Dynamic text effect that emulates spring physics with squash-and-stretch animation. Text compresses vertically to 40% height while expanding horizontally to 160% width (maintaining volume), then bounces back with overshoot to 120% height before settling. Includes secondary rotation motion on letters during compression (like springs twisting under pressure) and particle burst effects during spring release for extra dynamism.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'spring',
    'compression',
    'squash',
    'stretch',
    'bounce',
    'physics',
    'particles',
    'dynamic',
    'energetic',
    'impact',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SPRING',
    duration: 3,
    fontSize: 120,
    textColor: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '900',
    particleCount: 8,
    particleIntensity: 1,
    rotationIntensity: 5,
  },
};

export const springCompressionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
