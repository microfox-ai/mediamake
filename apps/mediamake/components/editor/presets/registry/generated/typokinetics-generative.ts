/**
 * Typokinetics: Generative Autonomous Motion
 *
 * This preset creates generative art-inspired typography where each character
 * exhibits autonomous behavior through algorithmic motion. Characters transition
 * through four behavioral states (wander, seek, arrive, settle) using Perlin noise
 * simulation, steering behaviors, and spring physics. Motion is pre-calculated
 * with 25-30 keyframes per character for organic, life-like text animation.
 *
 * Features:
 * - **4-State Motion System**: Wander → Seek → Arrive → Settle
 * - **Perlin Noise Simulation**: Organic drift using sine/cosine combinations
 * - **Steering Behaviors**: Acceleration-based seeking toward target
 * - **Spring Physics**: Damped settling with overshoot
 * - **Velocity-Based Rotation**: Characters rotate to follow motion direction
 * - **Organic Pulsing**: Subtle scale variations per character
 * - **Color Variation**: Hue rotation during movement
 * - **Algorithmic Generation**: 25-30 keyframes per character
 *
 * Use cases:
 * - Generative art title sequences
 * - Creative coding-inspired text reveals
 * - Autonomous typography animations
 * - Processing/p5.js-style motion graphics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to animate with autonomous character motion'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  wanderIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for wander phase (0.1-3)'),
  seekSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for seeking phase (0.5-3)'),
  springDamping: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .describe('Spring damping for settling phase (0.1-1, lower = more bounce)'),
  enableHueRotation: z
    .boolean()
    .default(true)
    .describe('Enable color variation during movement'),
  hueRotationRange: z
    .number()
    .min(0)
    .max(180)
    .default(15)
    .describe('Maximum hue rotation in degrees'),
  enablePulsing: z
    .boolean()
    .default(true)
    .describe('Enable subtle scale pulsing for organic feel'),
  pulseIntensity: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Scale pulse intensity (0.01-0.2)'),
  startPosition: z
    .enum(['random', 'top', 'bottom', 'left', 'right', 'center'])
    .default('random')
    .describe('Initial off-canvas position for characters'),
  targetPosition: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .describe('Final text position on screen'),
});

type PresetParams = z.infer<typeof presetParams>;

// ==================== PRESET EXECUTION ====================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontWeight,
    textColor,
    font,
    wanderIntensity,
    seekSpeed,
    springDamping,
    enableHueRotation,
    hueRotationRange,
    enablePulsing,
    pulseIntensity,
    startPosition,
    targetPosition,
  } = params;

  // Parse font
  const fontString = font || 'Inter';
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
  if (!fontStyle.fontWeight) {
    fontStyle.fontWeight = fontWeight;
  }

  // Helper: Generate Perlin noise simulation using sine/cosine combinations
  const generatePerlinNoise = (
    t: number,
    seed: number,
    frequency: number = 1,
  ): { x: number; y: number } => {
    const x =
      Math.sin(t * frequency + seed) * Math.cos(t * frequency * 0.5 + seed);
    const y =
      Math.cos(t * frequency + seed) * Math.sin(t * frequency * 0.7 + seed);
    return { x, y };
  };

  // Helper: Calculate velocity-based rotation
  const calculateRotation = (dx: number, dy: number): number => {
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  // Helper: Spring physics calculation
  const springPhysics = (
    current: number,
    target: number,
    velocity: number,
    damping: number,
  ): { position: number; velocity: number } => {
    const springConstant = 0.3;
    const force = (target - current) * springConstant;
    const newVelocity = velocity * damping + force;
    const newPosition = current + newVelocity;
    return { position: newPosition, velocity: newVelocity };
  };

  // Helper: Get start position offset
  const getStartOffset = (
    index: number,
    totalChars: number,
  ): { x: number; y: number } => {
    const seed = index * 123.456;
    const viewportWidth = props.config?.width || 1920;
    const viewportHeight = props.config?.height || 1080;

    switch (startPosition) {
      case 'top':
        return { x: (index / totalChars) * viewportWidth - viewportWidth / 2, y: -viewportHeight / 2 - 100 };
      case 'bottom':
        return { x: (index / totalChars) * viewportWidth - viewportWidth / 2, y: viewportHeight / 2 + 100 };
      case 'left':
        return { x: -viewportWidth / 2 - 100, y: (index / totalChars) * viewportHeight - viewportHeight / 2 };
      case 'right':
        return { x: viewportWidth / 2 + 100, y: (index / totalChars) * viewportHeight - viewportHeight / 2 };
      case 'center':
        return { x: 0, y: 0 };
      case 'random':
      default:
        const angle = Math.random() * Math.PI * 2;
        const distance = 400 + Math.random() * 200;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        };
    }
  };

  // Helper: Get target position
  const getTargetPosition = (
    index: number,
    totalChars: number,
  ): { x: number; y: number } => {
    const charSpacing = fontSize * 0.6;
    const totalWidth = (totalChars - 1) * charSpacing;
    const xOffset = index * charSpacing - totalWidth / 2;

    const viewportHeight = props.config?.height || 1080;

    switch (targetPosition) {
      case 'top':
        return { x: xOffset, y: -viewportHeight * 0.3 };
      case 'bottom':
        return { x: xOffset, y: viewportHeight * 0.3 };
      case 'left':
        return { x: xOffset - 200, y: 0 };
      case 'right':
        return { x: xOffset + 200, y: 0 };
      case 'center':
      default:
        return { x: xOffset, y: 0 };
    }
  };

  // Generate character components
  const characters = text.split('');
  const numKeyframes = 28; // 25-30 keyframes per character

  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;
      const seed = index * 78.91;

      // Calculate positions
      const startOffset = getStartOffset(index, characters.length);
      const targetPos = getTargetPosition(index, characters.length);

      // State timing percentages
      const wanderEnd = 0.2;
      const seekEnd = 0.5;
      const arriveEnd = 0.8;
      const settleEnd = 1.0;

      // Generate motion keyframes
      const ranges: any[] = [];

      // Physics state
      let posX = startOffset.x;
      let posY = startOffset.y;
      let velX = 0;
      let velY = 0;
      let prevPosX = posX;
      let prevPosY = posY;

      for (let i = 0; i < numKeyframes; i++) {
        const prog = i / (numKeyframes - 1);
        const t = prog * duration;

        let newPosX = posX;
        let newPosY = posY;
        let rotation = 0;
        let scale = 1;
        let hueRotate = 0;

        // State 1: Wander (0 - 20%)
        if (prog <= wanderEnd) {
          const localProg = prog / wanderEnd;
          const noise = generatePerlinNoise(t * 2, seed, 1.5);
          const wanderStrength = 150 * wanderIntensity;
          newPosX = startOffset.x + noise.x * wanderStrength * localProg;
          newPosY = startOffset.y + noise.y * wanderStrength * localProg;

          // Rotation follows wander direction
          const dx = newPosX - prevPosX;
          const dy = newPosY - prevPosY;
          rotation = calculateRotation(dx, dy) * 0.3;
        }
        // State 2: Seek (20% - 50%)
        else if (prog <= seekEnd) {
          const localProg = (prog - wanderEnd) / (seekEnd - wanderEnd);
          
          // Steering behavior
          const dx = targetPos.x - posX;
          const dy = targetPos.y - posY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 1) {
            const maxSpeed = 15 * seekSpeed;
            const desiredVelX = (dx / distance) * maxSpeed;
            const desiredVelY = (dy / distance) * maxSpeed;
            
            // Acceleration
            velX += (desiredVelX - velX) * 0.3;
            velY += (desiredVelY - velY) * 0.3;
          }
          
          newPosX = posX + velX;
          newPosY = posY + velY;
          
          rotation = calculateRotation(velX, velY);
          scale = 1 + Math.abs(velX + velY) * 0.005;
        }
        // State 3: Arrive (50% - 80%)
        else if (prog <= arriveEnd) {
          const localProg = (prog - seekEnd) / (arriveEnd - seekEnd);
          
          // Deceleration proportional to distance
          const dx = targetPos.x - posX;
          const dy = targetPos.y - posY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 1) {
            const slowingRadius = 100;
            const speedFactor = Math.min(distance / slowingRadius, 1);
            const arriveSpeed = 8 * speedFactor;
            
            velX = (dx / distance) * arriveSpeed;
            velY = (dy / distance) * arriveSpeed;
          } else {
            velX *= 0.8;
            velY *= 0.8;
          }
          
          newPosX = posX + velX;
          newPosY = posY + velY;
          
          rotation = calculateRotation(velX, velY) * (1 - localProg);
          scale = 1 + (0.05 - localProg * 0.05);
        }
        // State 4: Settle (80% - 100%)
        else {
          const localProg = (prog - arriveEnd) / (settleEnd - arriveEnd);
          
          // Spring physics
          const springX = springPhysics(posX, targetPos.x, velX, springDamping);
          const springY = springPhysics(posY, targetPos.y, velY, springDamping);
          
          newPosX = springX.position;
          newPosY = springY.position;
          velX = springX.velocity;
          velY = springY.velocity;
          
          rotation *= (1 - localProg);
          scale = 1 + (0.02 * (1 - localProg));
        }

        // Apply hue rotation
        if (enableHueRotation && prog < 0.9) {
          const huePhase = Math.sin(prog * Math.PI);
          hueRotate = huePhase * hueRotationRange;
        }

        // Apply pulsing
        if (enablePulsing) {
          const pulsePhase = Math.sin((prog + seed * 0.1) * Math.PI * 4);
          scale += pulsePhase * pulseIntensity;
        }

        // Add keyframes
        ranges.push(
          { key: 'translateX', val: newPosX, prog },
          { key: 'translateY', val: newPosY, prog },
          { key: 'rotate', val: rotation, prog },
          { key: 'scale', val: scale, prog },
        );

        if (enableHueRotation) {
          ranges.push({ key: 'hue-rotate', val: hueRotate, prog });
        }

        // Update physics state
        prevPosX = posX;
        prevPosY = posY;
        posX = newPosX;
        posY = newPosY;
      }

      // Create character component
      const charComponent: RenderableComponentData = {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontStyle.fontWeight,
            fontStyle: fontStyle.fontStyle,
            willChange: 'transform, filter',
          },
          font: {
            family: fontFamily,
            weights: [String(fontStyle.fontWeight || fontWeight)],
          },
          className: 'absolute transform-gpu pointer-events-none',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${charId}-motion`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [charId],
              ranges: ranges,
            },
          },
        ],
      };

      return charComponent;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-generative-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'character-container',
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
        childrenData: characterComponents,
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

// ==================== PRESET METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-generative',
  title: 'Typokinetics: Generative Autonomous Motion',
  description:
    'Generative art-inspired typokinetics where each character exhibits autonomous behavior through algorithmic motion. Characters transition through four behavioral states (wander, seek, arrive, settle) using Perlin noise simulation, steering behaviors, and spring physics. Motion is pre-calculated with 25-30 keyframes per character for organic, life-like text animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'generative',
    'autonomous',
    'motion',
    'algorithmic',
    'perlin-noise',
    'steering',
    'spring-physics',
    'creative-coding',
    'processing',
    'p5js',
  ],
  defaultInputParams: {
    text: 'KINETIC',
    duration: 3,
    fontSize: 48,
    fontWeight: '700',
    textColor: '#ffffff',
    font: 'Inter:700',
    wanderIntensity: 1,
    seekSpeed: 1,
    springDamping: 0.6,
    enableHueRotation: true,
    hueRotationRange: 15,
    enablePulsing: true,
    pulseIntensity: 0.05,
    startPosition: 'random',
    targetPosition: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ==================== EXPORT ====================

export const typokineticsGenerativePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
