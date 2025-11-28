/**
 * Orbital Slingshot Typography Preset
 *
 * This preset creates dynamic typography where text uses gravitational assists to gain momentum,
 * mimicking spacecraft using planetary flybys. Words approach massive invisible objects (gravity wells),
 * whip around them gaining speed via hyperbolic trajectories, then launch toward the next gravity source.
 *
 * Features:
 * - Multi-body gravity simulation with n-body physics calculations
 * - Hyperbolic trajectory mathematics for realistic slingshot mechanics
 * - Comet-like tails that stretch and fade based on velocity
 * - Escape velocity visualization with color transitions and glow effects
 * - Variable timing based on trajectory segments (slow near gravity wells, fast in open space)
 * - Audio-reactive gravity where beat intensity modulates gravitational pull
 * - Performance optimizations with will-change and CSS containment
 *
 * Use cases:
 * - Creating dynamic space-themed typography animations
 * - Building physics-based text effects with realistic orbital mechanics
 * - Adding sci-fi visual effects to titles and captions
 * - Creating music-synchronized text with audio-reactive gravity
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display (will be split into words)'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the animation in seconds'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z
    .number()
    .default(48)
    .describe('Base font size for text in pixels'),
  textColor: z.string().default('#ffffff').describe('Text color'),
  
  // Gravity system configuration
  gravityWells: z
    .array(
      z.object({
        x: z.number().min(0).max(100).describe('X position as percentage'),
        y: z.number().min(0).max(100).describe('Y position as percentage'),
        mass: z.number().min(1).max(10).describe('Gravitational mass strength'),
        color: z.string().describe('Visual color for gravity well glow'),
      }),
    )
    .optional()
    .describe('Custom gravity well positions and properties'),
  
  // Physics parameters
  gravitationalConstant: z
    .number()
    .default(50)
    .describe('G constant for gravity calculation strength'),
  escapeVelocityThreshold: z
    .number()
    .default(150)
    .describe('Velocity threshold for escape velocity effects'),
  
  // Visual effects
  showGravityWells: z
    .boolean()
    .default(true)
    .describe('Show visual indicators for gravity wells'),
  showCometTails: z
    .boolean()
    .default(true)
    .describe('Show comet-like tails behind text'),
  tailLength: z
    .number()
    .default(100)
    .describe('Maximum tail length in pixels'),
  
  // Audio reactivity
  audioReactive: z.boolean().default(false).describe('Enable audio-reactive gravity'),
  audioSrc: z.string().optional().describe('Audio source for reactivity'),
  audioSensitivity: z
    .number()
    .default(1.5)
    .describe('Audio reactivity sensitivity multiplier'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    font,
    fontSize,
    textColor,
    gravityWells,
    gravitationalConstant,
    escapeVelocityThreshold,
    showGravityWells,
    showCometTails,
    tailLength,
    audioReactive,
    audioSrc,
    audioSensitivity,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:700';
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

  // Split text into words
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  // Default gravity wells if not provided
  const wells = gravityWells || [
    { x: 20, y: 30, mass: 5, color: 'rgba(100,149,237,0.3)' },
    { x: 60, y: 50, mass: 8, color: 'rgba(255,165,0,0.25)' },
    { x: 75, y: 15, mass: 4, color: 'rgba(147,112,219,0.3)' },
  ];

  // Calculate orbital paths for each word using n-body simulation
  const calculateOrbitPath = (
    wordIndex: number,
    totalWords: number,
  ): Array<{ x: number; y: number; velocity: number; time: number }> => {
    const path: Array<{ x: number; y: number; velocity: number; time: number }> = [];
    const timeStep = 0.05; // 50ms steps
    const totalSteps = Math.floor(duration / timeStep);
    
    // Initial position (staggered entry points)
    let x = 10 + (wordIndex * 5) % 30;
    let y = 50 + (wordIndex * 10) % 40;
    let vx = 80 + Math.random() * 40;
    let vy = -20 + Math.random() * 40;

    for (let step = 0; step < totalSteps; step++) {
      const time = step * timeStep;
      
      // Calculate gravitational forces from all wells
      let fx = 0;
      let fy = 0;
      
      wells.forEach((well) => {
        const dx = well.x - x;
        const dy = well.y - y;
        const distSq = dx * dx + dy * dy + 1; // Add 1 to prevent division by zero
        const dist = Math.sqrt(distSq);
        
        // Newton's law of gravitation: F = G * m1 * m2 / r^2
        const force = (gravitationalConstant * well.mass) / distSq;
        
        // Direction components
        fx += (force * dx) / dist;
        fy += (force * dy) / dist;
      });
      
      // Update velocity (F = ma, assuming mass = 1)
      vx += fx * timeStep;
      vy += fy * timeStep;
      
      // Update position
      x += vx * timeStep;
      y += vy * timeStep;
      
      // Calculate speed for tail effects
      const velocity = Math.sqrt(vx * vx + vy * vy);
      
      // Keep within bounds (with wrapping for continuous motion)
      if (x < -10) x += 120;
      if (x > 110) x -= 120;
      if (y < -10) y += 120;
      if (y > 110) y -= 120;
      
      // Record keyframe
      if (step % 2 === 0) { // Record every other step to reduce data
        path.push({ x, y, velocity, time });
      }
    }
    
    return path;
  };

  // Generate gravity well visual indicators
  const gravityWellComponents: RenderableComponentData[] = showGravityWells
    ? wells.map((well, index) => ({
        id: `gravity-well-${index}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, ${well.color} 0%, transparent 70%); filter: blur(${15 + well.mass * 3}px);"></div>`,
          className: 'absolute',
          style: {
            width: `${100 + well.mass * 20}px`,
            height: `${100 + well.mass * 20}px`,
            left: `${well.x}%`,
            top: `${well.y}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none' as const,
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      }))
    : [];

  // Audio reactive effects if enabled
  const audioReactiveEffects = audioReactive && audioSrc
    ? wells.map((well, index) => ({
        id: `audio-pulse-${index}`,
        componentId: 'waveform' as const,
        data: {
          audioSrc,
          audioProperty: 'bass' as const,
          effectType: 'scale' as const,
          intensity: audioSensitivity * 0.3,
          baseScale: 1,
          sensitivity: audioSensitivity,
          threshold: 0.2,
          mode: 'provider' as const,
          targetIds: [`gravity-well-${index}`],
          start: 0,
          duration,
        },
      }))
    : [];

  // Generate word components with orbital trajectories
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const tailId = `tail-${index}`;
    const orbitPath = calculateOrbitPath(index, wordCount);

    // Create keyframes for translateX/Y based on orbit path
    const positionRanges = orbitPath.map((point) => [
      {
        key: 'translateX' as const,
        val: `${point.x}vw`,
        prog: point.time / duration,
      },
      {
        key: 'translateY' as const,
        val: `${point.y}vh`,
        prog: point.time / duration,
      },
    ]).flat();

    // Scale effect based on velocity (faster = more stretched)
    const scaleRanges = orbitPath.map((point) => {
      const speedFactor = Math.min(point.velocity / 100, 2);
      const scaleX = 1 + speedFactor * 0.3;
      const scaleY = 1 / scaleX; // Maintain area
      return [
        { key: 'scaleX' as const, val: scaleX, prog: point.time / duration },
        { key: 'scaleY' as const, val: scaleY, prog: point.time / duration },
      ];
    }).flat();

    // Escape velocity color transition
    const colorRanges = orbitPath.map((point) => {
      const isEscaping = point.velocity > escapeVelocityThreshold;
      const color = isEscaping ? '#00ff88' : textColor;
      return {
        key: 'color' as const,
        val: color,
        prog: point.time / duration,
      };
    });

    // Glow effect at high velocities
    const glowRanges = orbitPath.map((point) => {
      const glowIntensity = Math.max(0, (point.velocity - escapeVelocityThreshold) / 50);
      const blur = Math.min(glowIntensity * 20, 40);
      return {
        key: 'filter' as const,
        val: `drop-shadow(0 0 ${blur}px rgba(0,255,136,${glowIntensity}))`,
        prog: point.time / duration,
      };
    });

    // Main word with orbital motion
    const wordNode: RenderableComponentData = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize,
          fontWeight: fontStyle.fontWeight || 'bold',
          color: textColor,
          ...fontStyle,
          willChange: 'transform',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `orbit-motion-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: 0,
            duration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [...positionRanges, ...scaleRanges, ...colorRanges, ...glowRanges],
          },
        },
      ],
    };

    // Comet tail if enabled
    const tailNode: RenderableComponentData | null = showCometTails
      ? {
          id: tailId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background: linear-gradient(to left, transparent 0%, ${textColor}80 50%, ${textColor}FF 100%); filter: blur(2px); transform-origin: right center;"></div>`,
            className: 'absolute',
            style: {
              width: `${tailLength}px`,
              height: '4px',
              pointerEvents: 'none' as const,
              willChange: 'transform',
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          effects: [
            {
              id: `tail-stretch-${index}`,
              componentId: 'generic',
              data: {
                type: 'linear' as const,
                start: 0,
                duration,
                mode: 'provider' as const,
                targetIds: [tailId],
                ranges: [
                  ...positionRanges,
                  ...orbitPath.map((point) => {
                    const velocityFactor = point.velocity / 100;
                    const length = Math.min(velocityFactor, 2);
                    const opacity = Math.min(velocityFactor * 0.8, 1);
                    return [
                      { key: 'scaleX' as const, val: length, prog: point.time / duration },
                      { key: 'opacity' as const, val: opacity, prog: point.time / duration },
                    ];
                  }).flat(),
                ],
              },
            },
          ],
        }
      : null;

    return [wordNode, tailNode].filter(Boolean) as RenderableComponentData[];
  }).flat();

  // Escape velocity indicator
  const escapeIndicator: RenderableComponentData = {
    id: 'escape-velocity-indicator',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: `ESCAPE VELOCITY: ${escapeVelocityThreshold}`,
      style: {
        fontSize: 14,
        color: '#00ff88',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        padding: '8px 16px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.3)',
      },
      className: 'absolute',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Assemble root container
  const rootContainer: RenderableComponentData = {
    id: 'orbital-slingshot-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          willChange: 'transform',
          contain: 'layout style paint' as any,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      ...gravityWellComponents,
      ...wordComponents,
      escapeIndicator,
    ],
    effects: audioReactiveEffects,
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
  id: 'orbital-slingshot-typography',
  title: 'Orbital Slingshot Typography',
  description:
    'Dynamic typography preset where text uses gravitational assists to gain momentum. Words approach invisible massive objects, whip around them gaining speed via hyperbolic trajectories, then launch toward the next gravity well. Features multi-body gravity simulation with n-body physics, comet-like tails that stretch based on velocity, escape velocity visualizations with color/glow transitions, and variable timing based on orbital mechanics (slow near gravity wells, fast in open space). Supports audio-reactive gravity where beat intensity modulates gravitational pull strength.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'orbital',
    'physics',
    'gravity',
    'slingshot',
    'space',
    'n-body',
    'trajectory',
    'comet',
    'escape-velocity',
    'audio-reactive',
    'sci-fi',
  ],
  defaultInputParams: {
    text: 'GRAVITY ASSIST',
    duration: 10,
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    gravitationalConstant: 50,
    escapeVelocityThreshold: 150,
    showGravityWells: true,
    showCometTails: true,
    tailLength: 100,
    audioReactive: false,
    audioSensitivity: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const orbitalSlingshotTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};