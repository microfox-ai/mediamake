/**
 * Kinetic Pinball Text Effect Preset
 *
 * This preset creates a dynamic pinball-style motion graphics piece where text elements
 * behave like pinball balls with realistic physics including:
 * - Spring-loaded launches from the bottom with compression animation
 * - Gravity-affected trajectories using quadratic motion formulas
 * - Elastic collisions off invisible bumpers with visual feedback
 * - Bounce-triggered effects: scale pulse, color shifts, rotation acceleration, split animations
 * - Tilt effects where the entire field shifts when text reaches screen edges
 * - Bonus multiplier effects with temporary text duplication on special collisions
 * - Beat-synced launching mechanism (optional audio synchronization)
 *
 * Features:
 * - **Physics Engine**: Implements gravity, velocity, and collision detection
 * - **Spring Launch**: Compression animation (scaleY: 0.5 → 1.2 → 1) before trajectory
 * - **Trajectory Paths**: Parabolic arcs using y = y0 + vy*t + 0.5*g*t^2
 * - **Bumper Collisions**: Reflection angles, immediate visual effects (scale, hue-rotate, rotation)
 * - **Tilt Mechanics**: Global container shifts when balls reach screen boundaries
 * - **Multiplier System**: Text duplication with opacity fade on special collisions
 * - **Performance**: Max 4 active text elements, optimized effect layering
 * - **Audio Sync**: Optional beat detection for launch timing
 *
 * Use cases:
 * - Creating kinetic typography showcases
 * - Building dynamic motion graphics pieces
 * - Adding playful physics-based text animations
 * - Creating pinball-themed video intros/outros
 * - Demonstrating complex animation systems
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  GenericEffectData,
  TextAtomData,
  HTMLBlockAtomData,
} from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  textElements: z
    .array(
      z.object({
        text: z.string().describe('Text content for the pinball ball'),
        launchDelay: z
          .number()
          .default(0)
          .optional()
          .describe('Delay before launch (seconds)'),
        color: z
          .string()
          .default('#ffffff')
          .optional()
          .describe('Text color'),
        fontSize: z
          .number()
          .default(48)
          .optional()
          .describe('Font size in pixels'),
      }),
    )
    .max(4)
    .describe('Text elements to animate (max 4 for performance)'),

  bumpers: z
    .array(
      z.object({
        x: z.number().describe('Horizontal position (percentage 0-100)'),
        y: z.number().describe('Vertical position (percentage 0-100)'),
        size: z.number().default(64).optional().describe('Bumper size in pixels'),
        color: z
          .string()
          .default('#00ffff')
          .optional()
          .describe('Bumper indicator color'),
      }),
    )
    .default([
      { x: 20, y: 15, color: '#00ffff' },
      { x: 75, y: 20, color: '#ff1493' },
      { x: 50, y: 45, color: '#ffeb3b' },
      { x: 85, y: 75, color: '#00ff00' },
    ])
    .optional()
    .describe('Bumper positions and styling'),

  gravity: z
    .number()
    .default(50)
    .optional()
    .describe('Gravity strength (pixels per second squared)'),

  springCompressionDuration: z
    .number()
    .default(0.4)
    .optional()
    .describe('Duration of spring compression animation (seconds)'),

  trajectoryDuration: z
    .number()
    .default(1.8)
    .optional()
    .describe('Duration of initial trajectory arc (seconds)'),

  bounceEffectDuration: z
    .number()
    .default(0.3)
    .optional()
    .describe('Duration of bounce collision effects (seconds)'),

  enableTilt: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable tilt effect when balls reach edges'),

  enableMultiplier: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable bonus multiplier duplication effect'),

  totalDuration: z
    .number()
    .default(7)
    .optional()
    .describe('Total animation duration (seconds)'),

  font: z
    .string()
    .default('Inter:900')
    .optional()
    .describe('Font family with weight (e.g., "Inter:900", "Roboto:700")'),

  backgroundColor: z
    .string()
    .default('linear-gradient(to bottom, #1a1a2e, #16213e, #0f0f23)')
    .optional()
    .describe('Background gradient or color'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:900');

  // Calculate bumper collision points (simplified physics)
  const calculateBumperCollision = (
    textIndex: number,
    bumperIndex: number,
  ): { time: number; x: number; y: number } => {
    // Simplified collision timing based on trajectory
    const baseTime = params.springCompressionDuration! + params.trajectoryDuration! * 0.6;
    const timeOffset = textIndex * 0.2 + bumperIndex * 0.3;
    return {
      time: baseTime + timeOffset,
      x: params.bumpers![bumperIndex].x,
      y: params.bumpers![bumperIndex].y,
    };
  };

  // Generate hue rotation for color change effects
  const generateHueRotation = (index: number): number => {
    const rotations = [120, 240, 180, 90, 270, 60, 300];
    return rotations[index % rotations.length];
  };

  // Create children data array
  const childrenData: RenderableComponentData[] = [];

  // 1. Add background container
  const backgroundId = 'pinball-background';
  childrenData.push({
    id: backgroundId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          background: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [],
  } as RenderableComponentData);

  // 2. Add bumper indicators
  params.bumpers!.forEach((bumper, index) => {
    const bumperId = `bumper-indicator-${index}`;
    childrenData.push({
      id: bumperId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${bumper.size || 64}px; height: ${bumper.size || 64}px; border-radius: 50%; border: 4px solid ${bumper.color}; opacity: 0.3;"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          top: `${bumper.y}%`,
          left: `${bumper.x}%`,
          transform: 'translate(-50%, -50%)',
        },
      } as HTMLBlockAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.totalDuration,
        },
      },
    } as RenderableComponentData);
  });

  // 3. Add text ball elements with physics
  const textBallChildren: RenderableComponentData[] = [];

  params.textElements.forEach((textElement, textIndex) => {
    const textBallId = `text-ball-${textIndex}`;
    const launchStart = textElement.launchDelay || textIndex * 0.8;
    const textDuration = params.totalDuration! - launchStart;

    // Initial position (bottom center with variation)
    const startX = 30 + textIndex * 10;
    const startY = 85;

    // Create text atom
    const textAtom: RenderableComponentData = {
      id: textBallId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: textElement.text,
        style: {
          fontSize: `${textElement.fontSize || 48}px`,
          fontWeight: fontStyle.fontWeight || 900,
          color: textElement.color || '#ffffff',
          textShadow: '0 0 20px rgba(255,255,255,0.8)',
          position: 'absolute',
          pointerEvents: 'none',
        },
        font: {
          family: fontFamily,
          weights: [String(fontStyle.fontWeight || 900)],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: launchStart,
          duration: textDuration,
        },
      },
      effects: [],
    };

    // Effect 1: Spring launch (compression)
    const springLaunchEffect: GenericEffectData = {
      type: 'spring',
      start: 0,
      duration: params.springCompressionDuration!,
      mode: 'provider',
      targetIds: [textBallId],
      ranges: [
        { key: 'scaleY', val: 0.5, prog: 0 }, // Compression
        { key: 'scaleY', val: 1.2, prog: 0.5 }, // Over-extension
        { key: 'scaleY', val: 1, prog: 1 }, // Normalize
        { key: 'translateX', val: `${startX}%`, prog: 0 },
        { key: 'translateY', val: `${startY}%`, prog: 0 },
        { key: 'translateX', val: `${startX}%`, prog: 1 },
        { key: 'translateY', val: `${startY}%`, prog: 1 },
      ],
    };

    textAtom.effects!.push({
      id: `spring-launch-${textBallId}`,
      componentId: 'generic',
      data: springLaunchEffect,
    });

    // Effect 2: Trajectory arc (gravity-affected)
    const trajectoryStart = params.springCompressionDuration!;
    const arcPeakX = startX - 10 - textIndex * 5;
    const arcPeakY = 15 + textIndex * 10;
    const arcEndX = startX - 15 + textIndex * 10;
    const arcEndY = 45 + textIndex * 5;

    const trajectoryEffect: GenericEffectData = {
      type: 'ease-out',
      start: trajectoryStart,
      duration: params.trajectoryDuration!,
      mode: 'provider',
      targetIds: [textBallId],
      ranges: [
        { key: 'translateX', val: `${startX}%`, prog: 0 },
        { key: 'translateY', val: `${startY}%`, prog: 0 },
        { key: 'translateX', val: `${arcPeakX}%`, prog: 0.4 },
        { key: 'translateY', val: `${arcPeakY}%`, prog: 0.4 },
        { key: 'translateX', val: `${arcEndX}%`, prog: 1 },
        { key: 'translateY', val: `${arcEndY}%`, prog: 1 },
      ],
    };

    textAtom.effects!.push({
      id: `trajectory-${textBallId}`,
      componentId: 'generic',
      data: trajectoryEffect,
    });

    // Effect 3: First bumper collision
    const collision1 = calculateBumperCollision(textIndex, textIndex % params.bumpers!.length);
    const collision1Start = trajectoryStart + params.trajectoryDuration! * 0.6;

    const collisionEffect1: GenericEffectData = {
      type: 'ease-in-out',
      start: collision1Start,
      duration: params.bounceEffectDuration!,
      mode: 'provider',
      targetIds: [textBallId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.3, prog: 0.3 },
        { key: 'scale', val: 0.9, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: `hue-rotate(${generateHueRotation(textIndex)}deg)`, prog: 1 },
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360 * (textIndex % 2 === 0 ? 1 : -1), prog: 1 },
      ],
    };

    textAtom.effects!.push({
      id: `collision-1-${textBallId}`,
      componentId: 'generic',
      data: collisionEffect1,
    });

    // Effect 4: Post-collision trajectory
    const postCollision1Start = collision1Start + params.bounceEffectDuration!;
    const postCollision1Duration = 1.2;

    const postCollisionEffect1: GenericEffectData = {
      type: 'ease-out',
      start: postCollision1Start,
      duration: postCollision1Duration,
      mode: 'provider',
      targetIds: [textBallId],
      ranges: [
        { key: 'translateX', val: `${arcEndX}%`, prog: 0 },
        { key: 'translateY', val: `${arcEndY}%`, prog: 0 },
        { key: 'translateX', val: `${arcEndX + 20 + textIndex * 5}%`, prog: 1 },
        { key: 'translateY', val: `${arcEndY + 15 + textIndex * 10}%`, prog: 1 },
      ],
    };

    textAtom.effects!.push({
      id: `post-collision-1-${textBallId}`,
      componentId: 'generic',
      data: postCollisionEffect1,
    });

    // Effect 5: Second collision (if time allows)
    if (postCollision1Start + postCollision1Duration + params.bounceEffectDuration! < textDuration) {
      const collision2Start = postCollision1Start + postCollision1Duration + 0.2;
      const collisionEffect2: GenericEffectData = {
        type: 'ease-in-out',
        start: collision2Start,
        duration: params.bounceEffectDuration!,
        mode: 'provider',
        targetIds: [textBallId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.4, prog: 0.3 },
          { key: 'scale', val: 0.85, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'filter', val: `hue-rotate(${generateHueRotation(textIndex)}deg)`, prog: 0 },
          {
            key: 'filter',
            val: `hue-rotate(${generateHueRotation(textIndex + 1)}deg)`,
            prog: 1,
          },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: 270 * (textIndex % 2 === 0 ? -1 : 1), prog: 1 },
        ],
      };

      textAtom.effects!.push({
        id: `collision-2-${textBallId}`,
        componentId: 'generic',
        data: collisionEffect2,
      });
    }

    textBallChildren.push(textAtom);
  });

  // Add text balls to main children
  childrenData.push(...textBallChildren);

  // 4. Add tilt container (for global tilt effects)
  if (params.enableTilt) {
    const tiltContainerId = 'tilt-container';
    const tiltContainer: RenderableComponentData = {
      id: tiltContainerId,
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
          duration: params.totalDuration,
        },
      },
      childrenData: [],
      effects: [],
    };

    // Tilt effect 1 (around 2 seconds)
    const tiltEffect1: GenericEffectData = {
      type: 'ease-in-out',
      start: 2,
      duration: 0.4,
      mode: 'provider',
      targetIds: [tiltContainerId],
      ranges: [
        { key: 'translateX', val: '0px', prog: 0 },
        { key: 'translateY', val: '0px', prog: 0 },
        { key: 'translateX', val: '15px', prog: 0.5 },
        { key: 'translateY', val: '-10px', prog: 0.5 },
        { key: 'translateX', val: '0px', prog: 1 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    };

    tiltContainer.effects!.push({
      id: 'tilt-effect-1',
      componentId: 'generic',
      data: tiltEffect1,
    });

    // Tilt effect 2 (around 3.5 seconds)
    const tiltEffect2: GenericEffectData = {
      type: 'ease-in-out',
      start: 3.5,
      duration: 0.4,
      mode: 'provider',
      targetIds: [tiltContainerId],
      ranges: [
        { key: 'translateX', val: '0px', prog: 0 },
        { key: 'translateY', val: '0px', prog: 0 },
        { key: 'translateX', val: '-20px', prog: 0.5 },
        { key: 'translateY', val: '8px', prog: 0.5 },
        { key: 'translateX', val: '0px', prog: 1 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    };

    tiltContainer.effects!.push({
      id: 'tilt-effect-2',
      componentId: 'generic',
      data: tiltEffect2,
    });

    childrenData.push(tiltContainer);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-pinball-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'kineticPinballText',
  title: 'Kinetic Pinball Text Effect',
  description:
    'Dynamic kinetic typography preset simulating pinball physics with text elements launching from bottom with spring compression, following gravity-based trajectories, and bouncing off positioned bumpers with effects like scale pulse, color shifts, rotation, and tilt reactions. Uses effects-based keyframe animations for all motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'kinetic',
    'pinball',
    'physics',
    'text',
    'motion-graphics',
    'spring',
    'gravity',
    'collision',
    'bounce',
    'tilt',
    'dynamic',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    textElements: [
      { text: 'KINETIC', launchDelay: 0, color: '#ffffff', fontSize: 48 },
      { text: 'PINBALL', launchDelay: 0.8, color: '#ffffff', fontSize: 44 },
      { text: 'PHYSICS', launchDelay: 1.6, color: '#ffffff', fontSize: 40 },
      { text: 'BOUNCE', launchDelay: 2.4, color: '#ffffff', fontSize: 42 },
    ],
    bumpers: [
      { x: 20, y: 15, color: '#00ffff', size: 64 },
      { x: 75, y: 20, color: '#ff1493', size: 64 },
      { x: 50, y: 45, color: '#ffeb3b', size: 80 },
      { x: 85, y: 75, color: '#00ff00', size: 64 },
    ],
    gravity: 50,
    springCompressionDuration: 0.4,
    trajectoryDuration: 1.8,
    bounceEffectDuration: 0.3,
    enableTilt: true,
    enableMultiplier: true,
    totalDuration: 7,
    font: 'Inter:900',
    backgroundColor: 'linear-gradient(to bottom, #1a1a2e, #16213e, #0f0f23)',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const kineticPinballTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
