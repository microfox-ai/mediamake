/**
 * Particle Assembly Typokinetics Preset
 *
 * This preset creates an ethereal particle-based typography effect where letters assemble
 * from scattered dots that spiral inward to form each character. Each letter is created
 * from 8 circular particles that start at random positions within a 100px radius and
 * converge to the center with spiral motion (combined rotate + translate), fading from
 * individual dots into solid letter forms.
 *
 * Features:
 * - 8 particles per letter with randomized initial positions
 * - Spiral convergence animation (rotate 0→720deg + translateX/Y to center)
 * - Particle trail effect using staggered duplicate particles with decreasing opacity
 * - Letter fade-in timed at 60% of particle animation
 * - Post-formation breathing animation (scale 0.98↔1.02) for living quality
 * - Staggered letter assembly (index * 0.15s delay)
 * - Cubic-bezier easing for organic motion paths
 *
 * Use cases:
 * - Fantasy or sci-fi titles requiring mystical/magical atmosphere
 * - Tech/futuristic content with particle effects
 * - High-impact title reveals with ethereal quality
 * - Brand intros requiring sophisticated particle animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('MAGIC')
    .describe('Text to display with particle assembly effect'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .describe('Font size in pixels for the final letter'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text (format: "FontName" or "FontName:weight:style")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the final assembled text'),
  particleColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the converging particles'),
  particleSize: z
    .number()
    .min(2)
    .max(12)
    .default(6)
    .describe('Size of each particle in pixels'),
  particleCount: z
    .number()
    .min(6)
    .max(12)
    .default(8)
    .describe('Number of particles per letter (6-12 for performance)'),
  particleRadius: z
    .number()
    .min(50)
    .max(200)
    .default(100)
    .describe('Radius from letter center where particles start (in pixels)'),
  convergenceDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of particle convergence animation in seconds'),
  letterStagger: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .describe('Delay between each letter starting animation (in seconds)'),
  breathingIntensity: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .describe('Breathing animation scale variation (0.02 = ±2%)'),
  breathingDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration of one breathing cycle in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the entire animation relative to parent (seconds)'),
  duration: z
    .number()
    .min(2)
    .default(10)
    .describe('Total duration of the animation (seconds)'),
  enableTrails: z
    .boolean()
    .default(true)
    .describe('Enable particle trail effect (2 trailing particles per main particle)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
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

  const text = params.text || 'MAGIC';
  const letters = text.split('');
  const letterContainerWidth = params.fontSize * 0.8;
  const letterContainerHeight = params.fontSize * 1.2;

  // Helper function: Generate random position within radius
  const generateRandomPosition = (radius: number) => {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Build letter containers with particles
  const letterContainers: RenderableComponentData[] = letters.map(
    (letter, letterIndex) => {
      const letterStart = params.startTime + letterIndex * params.letterStagger;
      const letterId = `letter-container-${letterIndex}`;
      const textId = `letter-text-${letterIndex}`;

      // Generate particles for this letter
      const particleComponents: RenderableComponentData[] = [];
      const trailComponents: RenderableComponentData[] = [];

      for (let i = 0; i < params.particleCount; i++) {
        const particleId = `particle-${letterIndex}-${i}`;
        const randomDelay = Math.random() * 0.2;
        const startPos = generateRandomPosition(params.particleRadius);

        // Main particle
        particleComponents.push({
          id: particleId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${params.particleSize}px; height: ${params.particleSize}px; background-color: ${params.particleColor}; border-radius: 50%;"></div>`,
            style: {
              position: 'absolute',
              left: `calc(50% + ${startPos.x}px)`,
              top: `calc(50% + ${startPos.y}px)`,
              transform: 'translate(-50%, -50%)',
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
              id: `${particleId}-convergence`,
              componentId: 'generic',
              data: {
                type: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                start: randomDelay,
                duration: params.convergenceDuration,
                mode: 'provider',
                targetIds: [particleId],
                ranges: [
                  // Spiral rotation
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: 720, prog: 1 },
                  // Translate to center
                  { key: 'translateX', val: startPos.x, prog: 0 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'translateY', val: startPos.y, prog: 0 },
                  { key: 'translateY', val: 0, prog: 1 },
                  // Scale down to disappear
                  { key: 'scale', val: 0.3, prog: 0 },
                  { key: 'scale', val: 0, prog: 0.9 },
                  // Fade out
                  { key: 'opacity', val: 0.8, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              } as GenericEffectData,
            },
          ],
        } as RenderableComponentData);

        // Trail particles (if enabled)
        if (params.enableTrails) {
          // First trail
          const trailId1 = `trail-${letterIndex}-${i}-a`;
          trailComponents.push({
            id: trailId1,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: ${params.particleSize * 0.7}px; height: ${params.particleSize * 0.7}px; background-color: ${params.particleColor}; border-radius: 50%; opacity: 0.4;"></div>`,
              style: {
                position: 'absolute',
                left: `calc(50% + ${startPos.x}px)`,
                top: `calc(50% + ${startPos.y}px)`,
                transform: 'translate(-50%, -50%)',
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
                id: `${trailId1}-convergence`,
                componentId: 'generic',
                data: {
                  type: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                  start: randomDelay + 0.05,
                  duration: params.convergenceDuration,
                  mode: 'provider',
                  targetIds: [trailId1],
                  ranges: [
                    { key: 'rotate', val: 0, prog: 0 },
                    { key: 'rotate', val: 720, prog: 1 },
                    { key: 'translateX', val: startPos.x, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                    { key: 'translateY', val: startPos.y, prog: 0 },
                    { key: 'translateY', val: 0, prog: 1 },
                    { key: 'scale', val: 0.3, prog: 0 },
                    { key: 'scale', val: 0, prog: 0.9 },
                    { key: 'opacity', val: 0.4, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                } as GenericEffectData,
              },
            ],
          } as RenderableComponentData);

          // Second trail
          const trailId2 = `trail-${letterIndex}-${i}-b`;
          trailComponents.push({
            id: trailId2,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: ${params.particleSize * 0.5}px; height: ${params.particleSize * 0.5}px; background-color: ${params.particleColor}; border-radius: 50%; opacity: 0.2;"></div>`,
              style: {
                position: 'absolute',
                left: `calc(50% + ${startPos.x}px)`,
                top: `calc(50% + ${startPos.y}px)`,
                transform: 'translate(-50%, -50%)',
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
                id: `${trailId2}-convergence`,
                componentId: 'generic',
                data: {
                  type: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                  start: randomDelay + 0.1,
                  duration: params.convergenceDuration,
                  mode: 'provider',
                  targetIds: [trailId2],
                  ranges: [
                    { key: 'rotate', val: 0, prog: 0 },
                    { key: 'rotate', val: 720, prog: 1 },
                    { key: 'translateX', val: startPos.x, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                    { key: 'translateY', val: startPos.y, prog: 0 },
                    { key: 'translateY', val: 0, prog: 1 },
                    { key: 'scale', val: 0.3, prog: 0 },
                    { key: 'scale', val: 0, prog: 0.9 },
                    { key: 'opacity', val: 0.2, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                } as GenericEffectData,
              },
            ],
          } as RenderableComponentData);
        }
      }

      // Letter text atom (fades in at 60% of particle animation)
      const letterFadeStart = params.convergenceDuration * 0.6;
      const letterFadeDuration = params.convergenceDuration * 0.4;

      const letterTextComponent: RenderableComponentData = {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter,
          style: {
            position: 'absolute',
            fontSize: `${params.fontSize}px`,
            fontWeight: '700',
            color: params.textColor,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            ...fontStyle,
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
          // Fade in
          {
            id: `${textId}-fade-in`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: letterFadeStart,
              duration: letterFadeDuration,
              mode: 'provider',
              targetIds: [textId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
          // Breathing animation (starts after convergence completes)
          {
            id: `${textId}-breathing`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: params.convergenceDuration,
              duration: params.breathingDuration * 100, // Repeat by making duration long
              mode: 'provider',
              targetIds: [textId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                {
                  key: 'scale',
                  val: 1 + params.breathingIntensity,
                  prog: 0.125,
                },
                { key: 'scale', val: 1, prog: 0.25 },
                {
                  key: 'scale',
                  val: 1 - params.breathingIntensity,
                  prog: 0.375,
                },
                { key: 'scale', val: 1, prog: 0.5 },
                {
                  key: 'scale',
                  val: 1 + params.breathingIntensity,
                  prog: 0.625,
                },
                { key: 'scale', val: 1, prog: 0.75 },
                {
                  key: 'scale',
                  val: 1 - params.breathingIntensity,
                  prog: 0.875,
                },
                { key: 'scale', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };

      // Letter container
      return {
        id: letterId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: `${letterContainerWidth}px`,
              height: `${letterContainerHeight}px`,
            },
          },
        },
        context: {
          timing: {
            start: letterStart,
            duration: params.duration - letterStart + params.startTime,
          },
        },
        childrenData: [
          ...particleComponents,
          ...trailComponents,
          letterTextComponent,
        ] as RenderableComponentData[],
      } as RenderableComponentData;
    },
  );

  // Letters container
  const lettersContainer: RenderableComponentData = {
    id: 'letters-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center',
        style: {
          gap: `${params.fontSize * 0.1}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterContainers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-assembly-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.duration,
      },
    },
    childrenData: [lettersContainer],
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
  id: 'particleAssemblyTypokinetics',
  title: 'Particle Assembly Typokinetics',
  description:
    'Ethereal particle-based typography preset where letters assemble from scattered dots that spiral inward to form each character. Features 8 circular particles per letter with spiral convergence animation (rotate + translate), trail effects via staggered particle duplicates, and post-formation breathing animation. Creates a magical, mystical quality ideal for fantasy, sci-fi, or tech-themed titles. Particles use cubic-bezier easing for organic motion paths.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'particles',
    'kinetic',
    'assemble',
    'spiral',
    'ethereal',
    'magical',
    'sci-fi',
    'tech',
    'title',
    'breathing',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MAGIC',
    fontSize: 64,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    particleColor: '#ffffff',
    particleSize: 6,
    particleCount: 8,
    particleRadius: 100,
    convergenceDuration: 1.2,
    letterStagger: 0.15,
    breathingIntensity: 0.02,
    breathingDuration: 2,
    startTime: 0,
    duration: 10,
    enableTrails: true,
  },
};

// Export preset
export const particleAssemblyTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
