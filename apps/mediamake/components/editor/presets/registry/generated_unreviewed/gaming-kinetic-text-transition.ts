/**
 * Gaming Kinetic Typography Transition Preset
 *
 * A high-energy kinetic typography-driven transition where gaming terms and stats explode across 
 * the screen in neon colors before reassembling into the next scene. Words like 'LEVEL UP', 
 * 'CRITICAL HIT', 'COMBO X10' burst onto screen with different trajectories, sizes, and glow 
 * intensities. Each text element has unique animation timing and easing, creating a chaotic but 
 * orchestrated feel.
 *
 * Features:
 * - **Explosive Text Animation**: Gaming terms burst with unique trajectories and timings
 * - **Neon Color Schemes**: Cyan, magenta, yellow, green with intense glow effects
 * - **Light Trails**: Motion-blurred trails following fast-moving text
 * - **Particle Explosions**: Small bursts triggered at text impact points
 * - **Dynamic Blur**: Velocity-based blur for fast-moving text elements
 * - **Impact Shake**: Screen shake effects when larger words appear
 * - **Scene Reveal**: Incoming scene gradually appears through gaps between flying text
 * - **Final Alignment**: Text elements realign to frame key areas of new scene
 *
 * Use cases:
 * - Gaming video transitions with high energy
 * - eSports highlight reels
 * - Game review/commentary transitions
 * - Streaming overlays and scene changes
 * - Gaming montages and compilations
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
    .describe('Source URL of the incoming scene (video or image)'),
  incomingSceneType: z
    .enum(['video', 'image'])
    .default('video')
    .describe('Type of incoming scene media'),
  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Total duration of the transition in seconds'),
  gamingTerms: z
    .array(z.string())
    .optional()
    .describe(
      'Custom gaming terms to display (default: LEVEL UP, CRITICAL HIT, COMBO X10, POWER UP, VICTORY, +500 XP)',
    ),
  neonColors: z
    .array(z.string())
    .optional()
    .describe(
      'Custom neon color palette (default: cyan, magenta, yellow, green, orange)',
    ),
  impactIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for shake and particle effects intensity'),
  textGlowIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Multiplier for neon glow intensity'),
  particleCount: z
    .number()
    .int()
    .min(3)
    .max(20)
    .default(8)
    .describe('Number of particle bursts'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingSceneSrc,
    incomingSceneType,
    transitionDuration,
    gamingTerms,
    neonColors,
    impactIntensity = 1,
    textGlowIntensity = 1,
    particleCount = 8,
  } = params;

  const { config } = props;
  const width = config?.width || 1920;
  const height = config?.height || 1080;

  // Default gaming terms
  const defaultTerms = [
    'LEVEL UP',
    'CRITICAL HIT',
    'COMBO X10',
    'POWER UP',
    'VICTORY',
    '+500 XP',
  ];
  const terms = gamingTerms && gamingTerms.length > 0 ? gamingTerms : defaultTerms;

  // Default neon colors
  const defaultColors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff6600'];
  const colors = neonColors && neonColors.length > 0 ? neonColors : defaultColors;

  // Gaming fonts
  const fonts = ['Orbitron:900', 'Russo One:400', 'Press Start 2P:400', 'Audiowide:400'];

  // Phase durations (percentages of total)
  const explosionPhase = transitionDuration * 0.4; // 0-40%: Explosion
  const flyPhase = transitionDuration * 0.3; // 40-70%: Flying across
  const alignPhase = transitionDuration * 0.3; // 70-100%: Alignment

  // Helper: Parse font string
  const parseFont = (fontString: string) => {
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] || '400',
    };
  };

  // Helper: Generate random trajectory
  const generateTrajectory = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2 + Math.random() * 0.5;
    const distance = 300 + Math.random() * 400;
    return {
      startX: Math.cos(angle) * distance,
      startY: Math.sin(angle) * distance,
      midX: Math.cos(angle + Math.PI / 4) * (distance * 1.5),
      midY: Math.sin(angle + Math.PI / 4) * (distance * 1.5),
      endX: (Math.random() - 0.5) * width * 0.3,
      endY: (Math.random() - 0.5) * height * 0.3,
    };
  };

  // Helper: Generate text size
  const generateSize = (index: number, total: number) => {
    const sizes = [120, 90, 72, 80, 100, 48];
    return sizes[index % sizes.length] || 80;
  };

  // Create text elements
  const textElements: RenderableComponentData[] = terms.map((term, index) => {
    const color = colors[index % colors.length];
    const font = parseFont(fonts[index % fonts.length]);
    const fontSize = generateSize(index, terms.length);
    const trajectory = generateTrajectory(index, terms.length);
    const delay = (index / terms.length) * 0.3; // Stagger 0-0.3s

    const glowIntensity = 30 * textGlowIntensity;
    const textShadow = `0 0 ${glowIntensity}px ${color}, 0 0 ${glowIntensity * 2}px ${color}, 0 0 ${glowIntensity * 3}px ${color}`;

    return {
      id: `text-${index}`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: term,
        font: {
          family: font.family,
          weights: [font.weight],
        },
        style: {
          fontSize: `${fontSize}px`,
          color: color,
          textShadow: textShadow,
          position: 'absolute' as const,
          fontWeight: font.weight,
          whiteSpace: 'nowrap' as const,
          left: '50%',
          top: '50%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Phase 1: Explosion (0-40%)
        {
          id: `explosion-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: delay,
            duration: explosionPhase,
            mode: 'provider' as const,
            targetIds: [`text-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'scale', val: 0.3, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: trajectory.startX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: trajectory.startY, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: (Math.random() - 0.5) * 45, prog: 1 },
            ],
          },
        },
        // Phase 2: Flying across (40-70%)
        {
          id: `fly-${index}`,
          componentId: 'generic',
          data: {
            type: index % 2 === 0 ? ('ease-in-out' as const) : ('linear' as const),
            start: explosionPhase + delay,
            duration: flyPhase,
            mode: 'provider' as const,
            targetIds: [`text-${index}`],
            ranges: [
              { key: 'translateX', val: trajectory.startX, prog: 0 },
              { key: 'translateX', val: trajectory.midX, prog: 0.5 },
              { key: 'translateX', val: trajectory.endX, prog: 1 },
              { key: 'translateY', val: trajectory.startY, prog: 0 },
              { key: 'translateY', val: trajectory.midY, prog: 0.5 },
              { key: 'translateY', val: trajectory.endY, prog: 1 },
              { key: 'rotate', val: (Math.random() - 0.5) * 45, prog: 0 },
              { key: 'rotate', val: (Math.random() - 0.5) * 90, prog: 1 },
              // Dynamic blur based on velocity
              { key: 'filter', val: `blur(${fontSize > 100 ? 8 : 4}px)`, prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Phase 3: Final alignment (70-100%)
        {
          id: `align-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: explosionPhase + flyPhase + delay,
            duration: alignPhase,
            mode: 'provider' as const,
            targetIds: [`text-${index}`],
            ranges: [
              { key: 'translateX', val: trajectory.endX, prog: 0 },
              { key: 'translateX', val: trajectory.endX * 0.2, prog: 1 },
              { key: 'translateY', val: trajectory.endY, prog: 0 },
              { key: 'translateY', val: trajectory.endY * 0.2, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.7, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 1 },
              { key: 'rotate', val: (Math.random() - 0.5) * 90, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create light trails
  const lightTrails: RenderableComponentData[] = terms.slice(0, 3).map((_, index) => {
    const color = colors[index % colors.length];
    const trajectory = generateTrajectory(index, 3);

    return {
      id: `trail-${index}`,
      type: 'atom' as const,
      componentId: 'ShapeAtom',
      data: {
        shape: 'rectangle' as const,
        color: color,
        style: {
          width: `${200 - index * 20}px`,
          height: `${4 - index}px`,
          position: 'absolute' as const,
          borderRadius: '2px',
          opacity: 0.7 - index * 0.1,
          left: '50%',
          top: '50%',
          filter: 'blur(3px)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `trail-movement-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: explosionPhase * 0.5,
            duration: flyPhase,
            mode: 'provider' as const,
            targetIds: [`trail-${index}`],
            ranges: [
              { key: 'translateX', val: trajectory.startX * 0.8, prog: 0 },
              { key: 'translateX', val: trajectory.midX * 0.8, prog: 1 },
              { key: 'translateY', val: trajectory.startY * 0.8, prog: 0 },
              { key: 'translateY', val: trajectory.midY * 0.8, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7 - index * 0.1, prog: 0.2 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create particle bursts
  const particles: RenderableComponentData[] = Array.from({ length: particleCount }).map(
    (_, index) => {
      const color = colors[index % colors.length];
      const size = 5 + Math.random() * 5;
      const angle = (index / particleCount) * Math.PI * 2;
      const distance = 100 + Math.random() * 200;
      const burstTime = explosionPhase + (index / particleCount) * flyPhase * 0.5;

      return {
        id: `particle-${index}`,
        type: 'atom' as const,
        componentId: 'ShapeAtom',
        data: {
          shape: 'circle' as const,
          color: color,
          style: {
            width: `${size}px`,
            height: `${size}px`,
            position: 'absolute' as const,
            filter: `blur(${Math.ceil(size / 3)}px)`,
            left: '50%',
            top: '50%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `particle-burst-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: burstTime,
              duration: 0.4,
              mode: 'provider' as const,
              targetIds: [`particle-${index}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.1 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                {
                  key: 'translateX',
                  val: Math.cos(angle) * distance * impactIntensity,
                  prog: 1,
                },
                { key: 'translateY', val: 0, prog: 0 },
                {
                  key: 'translateY',
                  val: Math.sin(angle) * distance * impactIntensity,
                  prog: 1,
                },
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.5, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Incoming scene with reveal effect
  const incomingScene: RenderableComponentData = {
    id: 'incoming-scene',
    type: 'atom' as const,
    componentId: incomingSceneType === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: incomingSceneSrc,
      fit: 'cover' as const,
      className: 'w-full h-full',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'scene-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in' as const,
          start: explosionPhase,
          duration: flyPhase + alignPhase,
          mode: 'provider' as const,
          targetIds: ['incoming-scene'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 1.2, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Shake container for impact effects
  const shakeContainer: RenderableComponentData = {
    id: 'shake-container',
    type: 'layout' as const,
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
        duration: transitionDuration,
      },
    },
    effects: [
      // Shake on first large text impact
      {
        id: 'shake-impact-1',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: explosionPhase * 0.3,
          duration: 0.15,
          mode: 'provider' as const,
          targetIds: ['shake-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 8 * impactIntensity, prog: 0.25 },
            { key: 'translateX', val: -8 * impactIntensity, prog: 0.5 },
            { key: 'translateX', val: 4 * impactIntensity, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -6 * impactIntensity, prog: 0.25 },
            { key: 'translateY', val: 6 * impactIntensity, prog: 0.5 },
            { key: 'translateY', val: -3 * impactIntensity, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Shake on second impact
      {
        id: 'shake-impact-2',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: explosionPhase * 0.6,
          duration: 0.12,
          mode: 'provider' as const,
          targetIds: ['shake-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -6 * impactIntensity, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 5 * impactIntensity, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container structure
  const rootContainer: RenderableComponentData = {
    id: 'gaming-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#0a0a0a',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Incoming scene layer (bottom)
      {
        id: 'incoming-scene-layer',
        type: 'layout' as const,
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
            duration: transitionDuration,
          },
        },
        childrenData: [incomingScene],
      },
      // Light trails layer
      {
        id: 'light-trail-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 8,
              mixBlendMode: 'screen' as const,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: lightTrails,
      },
      // Text explosion layer
      {
        id: 'text-explosion-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 10,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: textElements,
      },
      // Particle layer
      {
        id: 'particle-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 15,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: particles,
      },
      // Shake container (top)
      shakeContainer,
    ],
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
  id: 'gaming-kinetic-text-transition',
  title: 'Gaming Kinetic Typography Transition',
  description:
    'High-energy kinetic typography transition featuring gaming terms and stats (LEVEL UP, CRITICAL HIT, COMBO X10, etc.) that explode across the screen in neon colors. Text elements burst with unique trajectories, sizes, and glow intensities, leaving light trails and triggering particle explosions. The incoming scene gradually reveals through gaps between flying text, which then realigns to frame key areas. Includes dynamic motion blur on fast-moving text and impact shake effects for larger words.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'gaming',
    'kinetic',
    'typography',
    'neon',
    'explosion',
    'particles',
    'motion-graphics',
    'energy',
    'esports',
  ],
  defaultInputParams: {
    incomingSceneSrc: 'https://example.com/gameplay.mp4',
    incomingSceneType: 'video',
    transitionDuration: 3,
    gamingTerms: undefined,
    neonColors: undefined,
    impactIntensity: 1,
    textGlowIntensity: 1,
    particleCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gamingKineticTextTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
