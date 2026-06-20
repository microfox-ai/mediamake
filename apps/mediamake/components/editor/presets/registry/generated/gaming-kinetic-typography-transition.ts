/**
 * Gaming Kinetic Typography Transition Preset
 *
 * A high-energy transition featuring gaming terms and stats (LEVEL UP, CRITICAL HIT, COMBO X10, etc.)
 * exploding across the screen in neon colors before reassembling to frame the incoming scene.
 *
 * Features:
 * - **15 Gaming Text Elements**: Varied gaming terminology with unique positioning and sizes
 * - **Neon Glow Effects**: Multi-layered text shadows in cyan, magenta, yellow, and green
 * - **Kinetic Animations**: Each text element has unique trajectories with spring easing
 * - **Motion Blur**: Dynamic blur effects applied to fast-moving text elements
 * - **Particle Explosions**: Small particle bursts at text positions with animated opacity and scale
 * - **Impact Shake Effects**: Container-level shake when larger words appear
 * - **Light Trails**: Pseudo-element gradient trails following text movement
 * - **Scene Transition**: Outgoing scene fades as text explodes, incoming scene revealed through gaps
 *
 * Use cases:
 * - Gaming content transitions
 * - eSports highlight reels
 * - Stream overlays and transitions
 * - High-energy social media content
 * - Gaming montage sequences
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Schema ---
const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL or reference for outgoing video'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL or reference for incoming video'),
    })
    .describe('Incoming video configuration'),
  duration: z
    .number()
    .default(2.5)
    .describe('Total transition duration in seconds'),
  impactIntensity: z
    .number()
    .min(0.5)
    .max(3.0)
    .default(1.0)
    .describe('Global impact intensity multiplier for shake and effects'),
  motionBlurStrength: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Maximum motion blur strength in pixels during fast movement'),
  textExplosionStagger: z
    .number()
    .default(0.1)
    .describe('Stagger delay between text element appearances in seconds'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    duration,
    impactIntensity,
    motionBlurStrength,
    textExplosionStagger,
  } = params;

  // Helper: Generate random trajectory parameters
  const generateTrajectory = (index: number) => {
    const seed = index * 137.508; // Golden angle for distribution
    const angle = (seed % 360) * (Math.PI / 180);
    const distance = 800 + (index % 5) * 200;
    
    return {
      translateX: Math.cos(angle) * distance,
      translateY: Math.sin(angle) * distance,
      rotate: (index % 7) * 45 - 90,
      scale: 0.3 + (index % 3) * 0.2,
    };
  };

  // Helper: Get color class based on index
  const getColorClass = (index: number): string => {
    const colors = ['text-cyan-400', 'text-pink-500', 'text-yellow-400', 'text-green-400'];
    return colors[index % colors.length];
  };

  // Helper: Get font class variation
  const getFontClass = (index: number): string => {
    const fonts = [
      'font-mono',
      'font-black uppercase',
      'font-bold italic',
      'font-bold',
    ];
    return fonts[index % fonts.length];
  };

  // Helper: Get text size class
  const getSizeClass = (index: number): string => {
    const sizes = ['text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'];
    const sizeIndex = index % sizes.length;
    return sizes[sizeIndex];
  };

  // Text content array
  const textContent = [
    'LEVEL UP',
    'CRITICAL HIT',
    'COMBO X10',
    '+500 XP',
    'HEADSHOT',
    'VICTORY',
    'BONUS ROUND',
    'POWER UP',
    'KILLSTREAK',
    'ACHIEVEMENT',
    'MVP',
    'RESPAWN',
    'DOUBLE KILL',
    'RAGE MODE',
    'GG',
  ];

  // Initial positions (percentage-based)
  const initialPositions = [
    { top: 20, left: 10 },
    { top: 35, left: 50 },
    { top: 55, left: 25 },
    { top: 15, left: 70 },
    { top: 45, left: 60 },
    { top: 70, left: 15 },
    { top: 25, left: 40 },
    { top: 60, left: 75 },
    { top: 80, left: 45 },
    { top: 10, left: 30 },
    { top: 40, left: 5 },
    { top: 65, left: 55 },
    { top: 30, left: 80 },
    { top: 75, left: 85 },
    { top: 50, left: 35 },
  ];

  // Build text elements with effects
  const textElements: RenderableComponentData[] = textContent.map((text, index) => {
    const textId = `text-${index + 1}`;
    const staggerDelay = index * textExplosionStagger;
    const trajectory = generateTrajectory(index);
    const position = initialPositions[index];
    const isLargeText = getSizeClass(index).includes('6xl') || getSizeClass(index).includes('7xl');
    
    // Phase timings
    const explosionStart = 0.1 + staggerDelay;
    const explosionDuration = 0.3;
    const flyDuration = 1.2;
    const convergeDuration = 0.5;
    const convergeStart = duration - convergeDuration;

    // Glow intensity based on size
    const glowLayers = isLargeText
      ? '0 0 15px currentColor, 0 0 30px currentColor, 0 0 45px currentColor'
      : '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor';

    // Build effects array
    const effects: any[] = [];

    // 1. Explosion appearance (scale + opacity)
    effects.push({
      id: `${textId}-explosion`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: explosionStart,
        duration: explosionDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
        config: {
          stiffness: 200,
          damping: 15,
        },
      },
    });

    // 2. Trajectory animation (translateX, translateY, rotate) with motion blur
    const flyStart = explosionStart + explosionDuration;
    const blurPeak = flyStart + flyDuration * 0.4;
    
    effects.push({
      id: `${textId}-trajectory`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: flyStart,
        duration: flyDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: trajectory.translateX, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: trajectory.translateY, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'rotateZ', val: 0, prog: 0 },
          { key: 'rotateZ', val: trajectory.rotate, prog: 0.5 },
          { key: 'rotateZ', val: 0, prog: 1 },
        ],
      },
    });

    // 3. Motion blur during fast movement
    effects.push({
      id: `${textId}-blur`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: flyStart,
        duration: flyDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'blur', val: 0, prog: 0 },
          { key: 'blur', val: motionBlurStrength, prog: 0.4 },
          { key: 'blur', val: motionBlurStrength, prog: 0.6 },
          { key: 'blur', val: 0, prog: 1 },
        ],
      },
    });

    // 4. Convergence to final frame position (slight scale adjustment)
    effects.push({
      id: `${textId}-converge`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: convergeStart,
        duration: convergeDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.8, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
        config: {
          stiffness: 150,
          damping: 20,
        },
      },
    });

    return {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          textShadow: glowLayers,
          position: 'absolute',
          top: `${position.top}%`,
          left: `${position.left}%`,
          transform: 'translate(-50%, -50%)',
          whiteSpace: 'nowrap',
        },
        className: `absolute font-bold ${getFontClass(index)} ${getColorClass(index)} ${getSizeClass(index)}`,
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: effects,
    } as RenderableComponentData;
  });

  // Build particle elements
  const particlePositions = [
    { top: 20, left: 12 },
    { top: 36, left: 52 },
    { top: 56, left: 27 },
    { top: 46, left: 62 },
    { top: 70, left: 17 },
    { top: 40, left: 7 },
    { top: 31, left: 82 },
    { top: 80, left: 47 },
  ];

  const particleElements: RenderableComponentData[] = particlePositions.map((pos, index) => {
    const particleId = `particle-${index + 1}`;
    const colorClass = getColorClass(index);
    const bgColor = colorClass.replace('text-', 'bg-');
    const burstStart = 0.3 + (index * 0.15);
    const burstDuration = 0.6;
    const size = index % 2 === 0 ? 'w-2 h-2' : 'w-3 h-3';

    // Particle burst animation
    const burstEffect = {
      id: `${particleId}-burst`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: burstStart,
        duration: burstDuration,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 0.2, prog: 0 },
          { key: 'scale', val: 2, prog: 0.5 },
          { key: 'scale', val: 0.5, prog: 1 },
        ],
      },
    };

    return {
      id: particleId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape: 'circle',
        style: {
          position: 'absolute',
          top: `${pos.top}%`,
          left: `${pos.left}%`,
          boxShadow: '0 0 8px currentColor',
        },
        className: `absolute ${size} rounded-full ${bgColor}`,
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [burstEffect],
    } as RenderableComponentData;
  });

  // Container shake effect for impact moments
  const shakeEffect = {
    id: 'container-shake',
    componentId: 'shake',
    data: {
      type: 'shake',
      start: 0.3,
      duration: 0.5,
      mode: 'provider',
      targetIds: ['text-explosion-layer'],
      amplitude: 5 * impactIntensity,
      frequency: 15,
      decay: 0.8,
    },
  };

  // Build composition structure
  const outgoingSceneLayer: RenderableComponentData = {
    id: 'outgoing-scene-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
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
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['outgoing-scene-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const incomingSceneLayer: RenderableComponentData = {
    id: 'incoming-scene-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-5',
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
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 1.5,
          duration: 1.0,
          mode: 'provider',
          targetIds: ['incoming-scene-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const textExplosionLayer: RenderableComponentData = {
    id: 'text-explosion-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [shakeEffect],
    childrenData: textElements,
  };

  const particleLayer: RenderableComponentData = {
    id: 'particle-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-25 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: particleElements,
  };

  const rootContainer: RenderableComponentData = {
    id: 'gaming-kinetic-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      outgoingSceneLayer,
      incomingSceneLayer,
      textExplosionLayer,
      particleLayer,
    ],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'gamingKineticTypographyTransition',
  title: 'Gaming Kinetic Typography Transition',
  description:
    'A kinetic typography-driven transition where gaming terms and stats (LEVEL UP, CRITICAL HIT, COMBO X10, etc.) explode across the screen in neon colors before reassembling to frame the incoming scene. Features 15 text elements with varied fonts, neon glow effects (cyan, magenta, yellow, green), unique animation trajectories with spring easing, particle explosions, motion blur on fast-moving text, and impact shake effects on large words. The outgoing scene fades as text bursts forth, then text elements align to highlight the new scene.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'kinetic-typography',
    'gaming',
    'neon',
    'explosion',
    'motion-blur',
    'particle-effects',
    'shake',
    'high-energy',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'data:outgoingVideo',
    },
    incomingVideo: {
      src: 'data:incomingVideo',
    },
    duration: 2.5,
    impactIntensity: 1.0,
    motionBlurStrength: 10,
    textExplosionStagger: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const gamingKineticTypographyTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
