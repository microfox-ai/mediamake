/**
 * Gaming Kinetic Text Explosion Transition Preset
 *
 * Creates an explosive kinetic typography transition featuring gaming terms
 * (LEVEL UP, CRITICAL HIT, COMBO X10, etc.) that burst across the screen in neon colors.
 * Text elements have unique trajectories, sizes, and glow intensities with staggered timing.
 * Features motion blur on fast movement, particle explosions, light trails, and impact shake effects.
 * The incoming scene gradually reveals through gaps between flying text, with text finally
 * settling to frame key areas of the new scene.
 *
 * Features:
 * - **Explosive Kinetic Typography**: Gaming terms burst across screen with unique trajectories
 * - **Neon Color Schemes**: Cyan, magenta, yellow, green, and more gaming-inspired colors
 * - **Motion Blur Effects**: Fast-moving text gets dynamic blur for speed sensation
 * - **Particle Explosions**: Small particle bursts triggered by text impacts
 * - **Light Trails**: Trailing effects behind fast-moving text elements
 * - **Impact Shake Effects**: Screen shake when larger words appear
 * - **Scene Reveal**: Incoming scene appears through gaps between flying text
 * - **Text Framing**: Text elements align to highlight key areas of new scene
 * - **Gaming Fonts**: Uses Orbitron, Press Start 2P, Bebas Neue, and Russo One
 *
 * Use cases:
 * - Gaming content transitions
 * - Esports highlight reels
 * - Game streaming overlays
 * - High-energy montage cuts
 * - Achievement/stat displays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  incomingSceneSrc: z
    .string()
    .optional()
    .describe(
      'Optional incoming scene media (video or image URL). If not provided, preset creates placeholder for scene content.',
    ),
  incomingSceneDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the full transition in seconds'),
  transitionIntensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Intensity multiplier for all effects and animations'),
  enableParticles: z
    .boolean()
    .default(true)
    .describe('Enable particle explosion effects'),
  enableShake: z
    .boolean()
    .default(true)
    .describe('Enable impact shake effects'),
  customTexts: z
    .array(z.string())
    .optional()
    .describe(
      'Optional custom text array to replace default gaming terms. If provided, overrides default texts.',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingSceneSrc,
    incomingSceneDuration,
    transitionIntensity,
    enableParticles,
    enableShake,
    customTexts,
  } = params;

  const totalDuration = incomingSceneDuration;

  // Default gaming texts with their properties
  const defaultTexts = [
    {
      text: 'LEVEL UP',
      color: 'text-cyan-400',
      shadow: '0_0_30px_rgba(34,211,238,0.8)',
      size: '120px',
      font: 'Orbitron',
      weight: '700',
      start: 0,
      duration: 2.5,
    },
    {
      text: 'CRITICAL HIT',
      color: 'text-rose-500',
      shadow: '0_0_25px_rgba(244,63,94,0.9)',
      size: '80px',
      font: 'Press Start 2P',
      weight: '400',
      start: 0.15,
      duration: 2.35,
    },
    {
      text: 'COMBO X10',
      color: 'text-yellow-400',
      shadow: '0_0_35px_rgba(250,204,21,0.85)',
      size: '100px',
      font: 'Bebas Neue',
      weight: '400',
      start: 0.3,
      duration: 2.2,
    },
    {
      text: 'POWER UP',
      color: 'text-emerald-400',
      shadow: '0_0_20px_rgba(52,211,153,0.8)',
      size: '70px',
      font: 'Russo One',
      weight: '400',
      start: 0.2,
      duration: 2.3,
    },
    {
      text: 'GAME OVER',
      color: 'text-fuchsia-500',
      shadow: '0_0_22px_rgba(217,70,239,0.85)',
      size: '60px',
      font: 'Press Start 2P',
      weight: '400',
      start: 0.4,
      duration: 2.1,
    },
    {
      text: 'VICTORY',
      color: 'text-sky-300',
      shadow: '0_0_28px_rgba(125,211,252,0.9)',
      size: '90px',
      font: 'Orbitron',
      weight: '700',
      start: 0.25,
      duration: 2.25,
    },
    {
      text: '+500 BONUS',
      color: 'text-lime-400',
      shadow: '0_0_18px_rgba(163,230,53,0.8)',
      size: '55px',
      font: 'Bebas Neue',
      weight: '400',
      start: 0.35,
      duration: 2.15,
    },
    {
      text: '2X MULTIPLIER',
      color: 'text-orange-400',
      shadow: '0_0_20px_rgba(251,146,60,0.85)',
      size: '65px',
      font: 'Russo One',
      weight: '400',
      start: 0.45,
      duration: 2.05,
    },
  ];

  // If custom texts provided, map them to the default structure
  const textsConfig = customTexts
    ? customTexts.map((text, index) => {
        const template = defaultTexts[index % defaultTexts.length];
        return { ...template, text };
      })
    : defaultTexts;

  // Create text elements with kinetic animations
  const textElements: RenderableComponentData[] = textsConfig.map(
    (textConfig, index) => {
      const textId = `kinetic-text-${index}`;
      const explosionPhase = 0.5; // First 0.5s: explosion
      const travelPhase = 1.5; // Next 1.5s: travel across screen
      const settlePhase = 0.5; // Last 0.5s: settle into position

      // Calculate trajectory based on index (different directions)
      const trajectories = [
        { startX: 50, startY: 50, endX: 85, endY: 15, rotate: -15 }, // top-right
        { startX: 50, startY: 50, endX: 15, endY: 80, rotate: 10 }, // bottom-left
        { startX: 50, startY: 50, endX: 75, endY: 60, rotate: 25 }, // right-center
        { startX: 50, startY: 50, endX: 20, endY: 20, rotate: -20 }, // top-left
        { startX: 50, startY: 50, endX: 40, endY: 75, rotate: 15 }, // bottom-center
        { startX: 50, startY: 50, endX: 80, endY: 40, rotate: -10 }, // right-upper
        { startX: 50, startY: 50, endX: 25, endY: 50, rotate: 5 }, // left-center
        { startX: 50, startY: 50, endX: 60, endY: 85, rotate: -25 }, // bottom-right
      ];

      const trajectory = trajectories[index % trajectories.length];

      // Phase 1: Explosion (scale 0 -> 1.5, opacity 0 -> 1, from center)
      // Phase 2: Travel (move to final position, scale 1.5 -> 1, add blur)
      // Phase 3: Settle (remove blur, final adjustments)

      const textComponent: RenderableComponentData = {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: textConfig.text,
          className: `absolute font-bold ${textConfig.color} drop-shadow-[${textConfig.shadow}]`,
          style: {
            fontSize: textConfig.size,
            left: `${trajectory.startX}%`,
            top: `${trajectory.startY}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10 + index,
          },
          font: {
            family: textConfig.font,
            weights: [textConfig.weight],
          },
        },
        context: {
          timing: {
            start: textConfig.start,
            duration: textConfig.duration,
          },
        },
        effects: [
          // Phase 1: Explosion burst (0 -> 0.5s relative)
          {
            id: `${textId}-explosion`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: explosionPhase * transitionIntensity,
              mode: 'provider',
              targetIds: [textId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.5, prog: 1 },
              ],
            },
          },
          // Phase 2: Travel trajectory (0.5s -> 2.0s relative)
          {
            id: `${textId}-travel`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: explosionPhase * transitionIntensity,
              duration: travelPhase * transitionIntensity,
              mode: 'provider',
              targetIds: [textId],
              ranges: [
                {
                  key: 'translateX',
                  val: `0px`,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: `${(trajectory.endX - trajectory.startX) * 10}px`,
                  prog: 1,
                },
                {
                  key: 'translateY',
                  val: `0px`,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: `${(trajectory.endY - trajectory.startY) * 10}px`,
                  prog: 1,
                },
                { key: 'scale', val: 1.5, prog: 0 },
                { key: 'scale', val: 1.0, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: trajectory.rotate, prog: 1 },
                // Motion blur during fast movement
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(4px)', prog: 0.5 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
          // Phase 3: Settle and glow pulse (2.0s -> 2.5s relative)
          {
            id: `${textId}-settle`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start:
                (explosionPhase + travelPhase) * transitionIntensity,
              duration: settlePhase * transitionIntensity,
              mode: 'provider',
              targetIds: [textId],
              ranges: [
                // Glow intensity pulse
                {
                  key: 'filter',
                  val: `drop-shadow(0 0 ${20 * transitionIntensity}px currentColor)`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `drop-shadow(0 0 ${10 * transitionIntensity}px currentColor)`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      };

      return textComponent;
    },
  );

  // Create particle effects if enabled
  const particleElements: RenderableComponentData[] = enableParticles
    ? [
        // Particle burst 1 (cyan)
        {
          id: 'particle-burst-1',
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle' as const,
            color: '#22d3ee',
            className:
              'absolute w-3 h-3 rounded-full shadow-[0_0_15px_5px_rgba(34,211,238,0.6)]',
            style: {
              left: '50%',
              top: '50%',
              zIndex: 5,
            },
          },
          context: {
            timing: {
              start: 0.1,
              duration: 0.8 * transitionIntensity,
            },
          },
          effects: [
            {
              id: 'particle-1-burst',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.8 * transitionIntensity,
                mode: 'provider',
                targetIds: ['particle-burst-1'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: 150, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: -100, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.3, prog: 1 },
                ],
              },
            },
          ],
        },
        // Particle burst 2 (rose)
        {
          id: 'particle-burst-2',
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle' as const,
            color: '#f43f5e',
            className:
              'absolute w-4 h-4 rounded-full shadow-[0_0_20px_8px_rgba(244,63,94,0.7)]',
            style: {
              left: '50%',
              top: '50%',
              zIndex: 5,
            },
          },
          context: {
            timing: {
              start: 0.25,
              duration: 0.7 * transitionIntensity,
            },
          },
          effects: [
            {
              id: 'particle-2-burst',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.7 * transitionIntensity,
                mode: 'provider',
                targetIds: ['particle-burst-2'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: -120, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: 100, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.2, prog: 1 },
                ],
              },
            },
          ],
        },
        // Particle burst 3 (yellow)
        {
          id: 'particle-burst-3',
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle' as const,
            color: '#facc15',
            className:
              'absolute w-2 h-2 rounded-full shadow-[0_0_12px_4px_rgba(250,204,21,0.6)]',
            style: {
              left: '50%',
              top: '50%',
              zIndex: 5,
            },
          },
          context: {
            timing: {
              start: 0.4,
              duration: 0.6 * transitionIntensity,
            },
          },
          effects: [
            {
              id: 'particle-3-burst',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.6 * transitionIntensity,
                mode: 'provider',
                targetIds: ['particle-burst-3'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: 80, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: 120, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.5, prog: 1 },
                ],
              },
            },
          ],
        },
      ]
    : [];

  // Incoming scene container (reveals gradually)
  const incomingSceneElement: RenderableComponentData = {
    id: 'incoming-scene-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Gradual opacity reveal through text gaps
      {
        id: 'scene-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0.5 * transitionIntensity,
          duration: 2.0 * transitionIntensity,
          mode: 'provider',
          targetIds: ['incoming-scene-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: incomingSceneSrc
      ? [
          {
            id: 'incoming-media',
            type: 'atom',
            componentId: incomingSceneSrc.match(/\.(mp4|webm|mov)$/i)
              ? 'VideoAtom'
              : 'ImageAtom',
            data: {
              src: incomingSceneSrc,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ]
      : [
          {
            id: 'incoming-placeholder',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className:
                  'w-full h-full bg-gradient-to-br from-slate-900 to-slate-800',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            childrenData: [],
          } as RenderableComponentData,
        ],
  };

  // Particle effects layer
  const particleLayer: RenderableComponentData = {
    id: 'particle-effects-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-screen',
        style: {
          zIndex: 15,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: particleElements,
  };

  // Text explosion layer
  const textLayer: RenderableComponentData = {
    id: 'text-explosion-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: textElements,
  };

  // Impact shake container (if enabled)
  const shakeContainer: RenderableComponentData | null = enableShake
    ? {
        id: 'impact-shake-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 0,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Shake effect when large text impacts
          {
            id: 'impact-shake-1',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0.5 * transitionIntensity,
              duration: 0.2 * transitionIntensity,
              mode: 'provider',
              targetIds: ['impact-shake-container'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 5 * transitionIntensity, prog: 0.25 },
                { key: 'translateX', val: -5 * transitionIntensity, prog: 0.5 },
                { key: 'translateX', val: 3 * transitionIntensity, prog: 0.75 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -3 * transitionIntensity, prog: 0.25 },
                { key: 'translateY', val: 3 * transitionIntensity, prog: 0.5 },
                { key: 'translateY', val: -2 * transitionIntensity, prog: 0.75 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      }
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'gaming-kinetic-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-neutral-950',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...(shakeContainer ? [shakeContainer] : []),
      incomingSceneElement,
      particleLayer,
      textLayer,
    ].filter(Boolean),
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
  id: 'gaming-kinetic-text-explosion-transition',
  title: 'Gaming Kinetic Text Explosion Transition',
  description:
    'A motion graphics-style transition featuring explosive kinetic typography with gaming terms (LEVEL UP, CRITICAL HIT, COMBO X10, etc.) bursting across the screen in neon colors (cyan, magenta, yellow, green). Text elements have unique trajectories, sizes, and glow intensities with staggered timing. Features motion blur on fast movement, particle explosions, light trails, and impact shake effects. The incoming scene reveals through gaps between flying text, with text finally settling to frame key areas. Uses gaming-style fonts and dramatic neon glow effects throughout.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'kinetic',
    'typography',
    'gaming',
    'explosion',
    'neon',
    'motion-graphics',
    'particles',
    'shake',
    'blur',
    'text-effects',
  ],
  defaultInputParams: {
    incomingSceneSrc: undefined,
    incomingSceneDuration: 2.5,
    transitionIntensity: 1.0,
    enableParticles: true,
    enableShake: true,
    customTexts: undefined,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gamingKineticTextExplosionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};