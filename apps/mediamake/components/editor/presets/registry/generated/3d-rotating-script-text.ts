/**
 * 3D Rotating Script Text Animation Preset
 *
 * This preset creates a carnival-style 3D rotating text animation where handwritten letters
 * spin into view from different angles. Each letter is mounted on an invisible axis, rotating
 * into place with dimensional depth. Some letters spin horizontally, others vertically,
 * creating a playful, dynamic entrance.
 *
 * Features:
 * - 3D rotation effects with proper perspective and depth
 * - Individual letter animations with staggered timing
 * - Depth-based effects (background letters blurred, foreground crisp)
 * - Bounce animation when letters lock into final position
 * - Celebratory particles (confetti/sparkles) that emit when letters snap into place
 * - Randomized rotation directions for dynamic variety
 * - Moving shadows based on rotation angle
 *
 * Use cases:
 * - Carnival-style title sequences
 * - Playful animated text intros
 * - Festival or celebration video titles
 * - Dynamic typography effects with dimensional quality
 * - Energetic text reveals for social media
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('HELLO')
    .describe('Text to animate with 3D rotation effect'),
  font: z
    .string()
    .default('Lobster:400')
    .describe(
      'Font family with optional weight (e.g., "Lobster:400", "Righteous:400")',
    ),
  fontSize: z
    .number()
    .min(50)
    .max(300)
    .default(120)
    .describe('Font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Text color'),
  letterStagger: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Delay between letter animations in seconds'),
  rotationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of rotation animation in seconds'),
  bounceDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of bounce animation in seconds'),
  enableParticles: z
    .boolean()
    .default(true)
    .describe('Enable particle effects when letters lock into place'),
  particleCount: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of particle effects per letter'),
  totalDuration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Total duration of the animation in seconds'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string (format: "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  // Helper: Generate random rotation direction (rotateX or rotateY)
  const getRandomRotationAxis = () => {
    return Math.random() > 0.5 ? 'rotateX' : 'rotateY';
  };

  // Helper: Generate random depth translateZ value (-100px to 100px)
  const getRandomDepth = () => {
    return Math.floor(Math.random() * 200) - 100;
  };

  // Helper: Generate random particle trajectory
  const getRandomParticleTrajectory = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 60;
    return {
      x: Math.cos(angle) * distance,
      y: -60 - Math.random() * 60,
    };
  };

  const {
    text,
    font,
    fontSize,
    textColor,
    letterStagger,
    rotationDuration,
    bounceDuration,
    enableParticles,
    particleCount,
    totalDuration,
  } = params;

  const { fontFamily, fontStyle } = parseFontString(font);
  const letters = text.split('');

  // Build letter components with 3D rotation effects
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const letterGroupId = `letter-group-${index}`;
      const letterStart = index * letterStagger;

      // Randomize rotation axis and depth
      const rotationAxis = getRandomRotationAxis();
      const depth = getRandomDepth();
      const rotationStart = 180 + Math.random() * 90 - 45; // Random 135-225deg
      const depthStart = depth + 50;

      // Calculate bounce start (80% through rotation)
      const bounceStart = letterStart + rotationDuration * 0.75;

      // Calculate particle start (80% through rotation)
      const particleStart = letterStart + rotationDuration * 0.8;

      // Create letter effects (rotation, bounce, shadow, depth-blur)
      const letterEffects = [
        // 3D Rotation effect
        {
          id: `rotation-${letterId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: letterStart,
            duration: rotationDuration,
            mode: 'provider' as const,
            targetIds: [letterGroupId],
            ranges: [
              { key: rotationAxis, val: rotationStart, prog: 0 },
              { key: rotationAxis, val: 0, prog: 1 },
              { key: 'translateZ', val: depthStart, prog: 0 },
              { key: 'translateZ', val: depth, prog: 1 },
            ],
          },
        },
        // Bounce effect
        {
          id: `bounce-${letterId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: bounceStart,
            duration: bounceDuration,
            mode: 'provider' as const,
            targetIds: [letterGroupId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Shadow animation
        {
          id: `shadow-${letterId}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: letterStart,
            duration: rotationDuration,
            mode: 'provider' as const,
            targetIds: [letterId],
            ranges: [
              {
                key: 'textShadow',
                val: '0px 0px 0px rgba(0,0,0,0)',
                prog: 0,
              },
              {
                key: 'textShadow',
                val: '4px 4px 8px rgba(0,0,0,0.5)',
                prog: 1,
              },
            ],
          },
        },
        // Depth blur effect
        {
          id: `blur-${letterId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: letterStart,
            duration: rotationDuration,
            mode: 'provider' as const,
            targetIds: [letterGroupId],
            ranges: [
              { key: 'filter', val: 'blur(4px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ];

      // Create particle effects if enabled
      const particleEffects: RenderableComponentData[] = [];
      if (enableParticles) {
        for (let p = 0; p < particleCount; p++) {
          const particleId = `particle-${index}-${p}`;
          const trajectory = getRandomParticleTrajectory();
          const particleDuration = 0.5 + Math.random() * 0.3;
          const particleRotation = Math.random() * 360;

          // Randomize particle shape (circle, star, sparkle)
          const particleShapes = [
            `<div style="width: 10px; height: 10px; background: linear-gradient(135deg, #ffd700, #ff6b6b); border-radius: 50%;"></div>`,
            `<div style="width: 8px; height: 8px; background: linear-gradient(135deg, #4ecdc4, #44a3f7); border-radius: 50%;"></div>`,
            `<div style="width: 12px; height: 12px; background: linear-gradient(135deg, #f7dc6f, #f39c12); clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);"></div>`,
          ];
          const particleShape =
            particleShapes[Math.floor(Math.random() * particleShapes.length)];

          particleEffects.push({
            id: particleId,
            type: 'atom' as const,
            componentId: 'HTMLBlockAtom',
            data: {
              html: particleShape,
              className: 'absolute',
              style: {
                left: '50%',
                top: '50%',
                willChange: 'transform',
              },
            },
            context: {
              timing: {
                start: letterStart,
                duration: totalDuration - letterStart,
              },
            },
            effects: [
              {
                id: `particle-trajectory-${particleId}`,
                componentId: 'generic',
                data: {
                  type: 'ease-out' as const,
                  start: particleStart - letterStart,
                  duration: particleDuration,
                  mode: 'provider' as const,
                  targetIds: [particleId],
                  ranges: [
                    { key: 'translateX', val: 0, prog: 0 },
                    { key: 'translateX', val: trajectory.x, prog: 1 },
                    { key: 'translateY', val: 0, prog: 0 },
                    { key: 'translateY', val: trajectory.y, prog: 1 },
                    { key: 'scale', val: 0, prog: 0 },
                    { key: 'scale', val: 1, prog: 0.3 },
                    { key: 'scale', val: 0, prog: 1 },
                    { key: 'rotate', val: 0, prog: 0 },
                    { key: 'rotate', val: particleRotation, prog: 1 },
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.2 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          });
        }
      }

      // Return letter group with text and particles
      return {
        id: letterGroupId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: letterStart,
            duration: totalDuration - letterStart,
          },
        },
        effects: letterEffects,
        childrenData: [
          // Letter text
          {
            id: letterId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: letter,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight || 400,
                color: textColor,
                textShadow: '4px 4px 8px rgba(0, 0, 0, 0.5)',
                willChange: 'transform',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['400'],
                display: 'swap' as const,
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration - letterStart,
              },
            },
          },
          // Particles for this letter
          ...particleEffects,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: '3d-rotating-script-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'letters-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: '3d-rotating-script-text',
  title: '3D Rotating Script Text Animation',
  description:
    'Carnival-style 3D rotating text animation where handwritten letters spin into view from different angles with dimensional depth, perspective shadows, depth-based blur effects, and celebratory particle emissions when letters lock into place.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    '3d',
    'rotation',
    'carnival',
    'script',
    'dimensional',
    'depth',
    'particles',
    'bounce',
    'celebration',
    'dynamic',
    'playful',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HELLO',
    font: 'Lobster:400',
    fontSize: 120,
    textColor: '#ffffff',
    letterStagger: 0.15,
    rotationDuration: 0.8,
    bounceDuration: 0.2,
    enableParticles: true,
    particleCount: 3,
    totalDuration: 5,
  },
};

// --- Export ---
export const rotatingScriptTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
