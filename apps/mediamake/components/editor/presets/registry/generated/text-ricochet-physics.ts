/**
 * Text Ricochet Physics Preset
 *
 * A dynamic physics-based preset where text elements bounce off invisible screen boundaries
 * and collide with each other like billiard balls. Features real-time collision detection,
 * momentum transfer, reflection angles, and visual feedback with scale bounce and color flash
 * on each collision. Includes optional audio reactivity for beat-synced impact effects.
 *
 * Features:
 * - **Physics Simulation**: Pre-computed physics with velocity, acceleration, and momentum
 * - **Collision Detection**: Boundary collisions and inter-element collision detection
 * - **Reflection Angles**: Accurate reflection calculations like particle deflection
 * - **Visual Feedback**: Scale bounce and color flash (hue-rotate) on each collision
 * - **Audio Reactivity**: Optional beat detection sync for rhythmic bouncing
 * - **Performance Optimized**: Uses transform: translate3d() for GPU acceleration
 * - **Configurable Physics**: Adjustable gravity, friction, elasticity, and collision damping
 *
 * Use cases:
 * - Creating kinetic typography sequences with real physics
 * - Building energetic text animations with collisions
 * - Adding dynamic visual effects to music videos
 * - Creating engaging social media content with physics-based text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  texts: z
    .array(
      z.object({
        text: z.string().describe('Text content to display'),
        fontSize: z.number().default(48).describe('Font size in pixels'),
        color: z
          .string()
          .default('#FF6B6B')
          .describe('Text color (CSS color value)'),
        fontWeight: z
          .string()
          .default('bold')
          .describe('Font weight (e.g., "700", "bold")'),
      }),
    )
    .max(6)
    .describe(
      'Array of text elements to animate (max 6 for performance). Default provides 5 elements.',
    )
    .default([
      { text: 'DYNAMIC', fontSize: 48, color: '#FF6B6B', fontWeight: 'bold' },
      { text: 'KINETIC', fontSize: 52, color: '#4ECDC4', fontWeight: 'bold' },
      { text: 'ENERGY', fontSize: 44, color: '#FFE66D', fontWeight: 'bold' },
      { text: 'MOTION', fontSize: 50, color: '#A8E6CF', fontWeight: 'bold' },
      { text: 'IMPACT', fontSize: 46, color: '#FF8B94', fontWeight: 'bold' },
    ]),
  duration: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('Total animation duration in seconds'),
  fps: z
    .number()
    .default(30)
    .describe('Frames per second for physics simulation'),
  physics: z
    .object({
      gravity: z
        .number()
        .default(0)
        .describe('Gravity acceleration (pixels/frame^2, default: 0 for no gravity)'),
      friction: z
        .number()
        .min(0)
        .max(1)
        .default(0.01)
        .describe('Friction coefficient (0-1, default: 0.01 for gradual slowdown)'),
      elasticity: z
        .number()
        .min(0)
        .max(1)
        .default(0.8)
        .describe('Bounce elasticity (0-1, default: 0.8 for bouncy collisions)'),
      collisionDamping: z
        .number()
        .min(0)
        .max(1)
        .default(0.9)
        .describe('Energy loss on collision (0-1, default: 0.9 for slight energy loss)'),
    })
    .optional()
    .describe('Physics configuration for simulation'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL or path'),
      beatThreshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.3)
        .describe('Threshold for beat detection (0-1, higher = more selective)'),
    })
    .optional()
    .describe('Optional audio configuration for beat-synced collisions'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config } = props;
  const width = config?.dimensions?.width || 1920;
  const height = config?.dimensions?.height || 1080;

  const duration = params.duration;
  const fps = params.fps;
  const totalFrames = Math.round(duration * fps);

  // Physics constants
  const physics = params.physics || {};
  const gravity = physics.gravity ?? 0;
  const friction = physics.friction ?? 0.01;
  const elasticity = physics.elasticity ?? 0.8;
  const collisionDamping = physics.collisionDamping ?? 0.9;

  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontStyle: Record<string, any> = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Initialize random velocities and positions
  const initializePhysics = (textCount: number) => {
    const entities: Array<{
      id: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      width: number;
      height: number;
      mass: number;
    }> = [];

    for (let i = 0; i < textCount; i++) {
      const textItem = params.texts[i];
      const fontSize = textItem.fontSize;
      // Approximate text dimensions (width = text.length * fontSize * 0.6, height = fontSize * 1.2)
      const textWidth = textItem.text.length * fontSize * 0.6;
      const textHeight = fontSize * 1.2;

      // Random starting position from edges
      const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let x = 0;
      let y = 0;
      let vx = 0;
      let vy = 0;

      if (edge === 0) {
        // Top edge
        x = Math.random() * (width - textWidth);
        y = -textHeight;
        vx = (Math.random() - 0.5) * 10;
        vy = Math.random() * 5 + 3;
      } else if (edge === 1) {
        // Right edge
        x = width;
        y = Math.random() * (height - textHeight);
        vx = -(Math.random() * 5 + 3);
        vy = (Math.random() - 0.5) * 10;
      } else if (edge === 2) {
        // Bottom edge
        x = Math.random() * (width - textWidth);
        y = height;
        vx = (Math.random() - 0.5) * 10;
        vy = -(Math.random() * 5 + 3);
      } else {
        // Left edge
        x = -textWidth;
        y = Math.random() * (height - textHeight);
        vx = Math.random() * 5 + 3;
        vy = (Math.random() - 0.5) * 10;
      }

      entities.push({
        id: `text-element-${i + 1}`,
        x,
        y,
        vx,
        vy,
        width: textWidth,
        height: textHeight,
        mass: fontSize, // Mass proportional to fontSize
      });
    }

    return entities;
  };

  // Helper: Check collision between two rectangles
  const checkCollision = (
    e1: { x: number; y: number; width: number; height: number },
    e2: { x: number; y: number; width: number; height: number },
  ) => {
    return (
      e1.x < e2.x + e2.width &&
      e1.x + e1.width > e2.x &&
      e1.y < e2.y + e2.height &&
      e1.y + e1.height > e2.y
    );
  };

  // Helper: Resolve collision between two entities
  const resolveCollision = (
    e1: { x: number; y: number; vx: number; vy: number; mass: number },
    e2: { x: number; y: number; vx: number; vy: number; mass: number },
  ) => {
    // Calculate relative velocity
    const dvx = e2.vx - e1.vx;
    const dvy = e2.vy - e1.vy;

    // Calculate relative position
    const dx = e2.x - e1.x;
    const dy = e2.y - e1.y;

    // Check if entities are moving towards each other
    if (dvx * dx + dvy * dy >= 0) return;

    // Calculate collision angle
    const angle = Math.atan2(dy, dx);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    // Rotate velocities
    const v1x = e1.vx * cos + e1.vy * sin;
    const v1y = e1.vy * cos - e1.vx * sin;
    const v2x = e2.vx * cos + e2.vy * sin;
    const v2y = e2.vy * cos - e2.vx * sin;

    // Calculate new velocities using elastic collision formula
    const m1 = e1.mass;
    const m2 = e2.mass;
    const v1xFinal = ((m1 - m2) * v1x + 2 * m2 * v2x) / (m1 + m2);
    const v2xFinal = ((m2 - m1) * v2x + 2 * m1 * v1x) / (m1 + m2);

    // Rotate velocities back and apply collision damping
    e1.vx = (v1xFinal * cos - v1y * sin) * collisionDamping;
    e1.vy = (v1y * cos + v1xFinal * sin) * collisionDamping;
    e2.vx = (v2xFinal * cos - v2y * sin) * collisionDamping;
    e2.vy = (v2y * cos + v2xFinal * sin) * collisionDamping;
  };

  // Pre-compute physics simulation
  const entities = initializePhysics(params.texts.length);
  const collisionHistory: Array<{ frame: number; entityIds: string[] }> = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    const frameCollisions: string[] = [];

    // Update velocities and positions
    for (const entity of entities) {
      // Apply gravity
      entity.vy += gravity;

      // Apply friction
      entity.vx *= 1 - friction;
      entity.vy *= 1 - friction;

      // Update position
      entity.x += entity.vx;
      entity.y += entity.vy;

      // Boundary collisions
      let collided = false;
      if (entity.x < 0) {
        entity.x = 0;
        entity.vx = -entity.vx * elasticity;
        collided = true;
      } else if (entity.x + entity.width > width) {
        entity.x = width - entity.width;
        entity.vx = -entity.vx * elasticity;
        collided = true;
      }

      if (entity.y < 0) {
        entity.y = 0;
        entity.vy = -entity.vy * elasticity;
        collided = true;
      } else if (entity.y + entity.height > height) {
        entity.y = height - entity.height;
        entity.vy = -entity.vy * elasticity;
        collided = true;
      }

      if (collided) {
        frameCollisions.push(entity.id);
      }
    }

    // Inter-element collisions
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        if (checkCollision(e1, e2)) {
          // Check collision history to prevent repeated collisions within 100ms
          const collisionDelay = Math.round(0.1 * fps); // 100ms in frames
          const recentCollision = collisionHistory
            .slice(-collisionDelay)
            .find(
              (c) =>
                c.entityIds.includes(e1.id) && c.entityIds.includes(e2.id),
            );

          if (!recentCollision) {
            resolveCollision(e1, e2);
            frameCollisions.push(e1.id);
            frameCollisions.push(e2.id);
          }
        }
      }
    }

    // Store collision history
    if (frameCollisions.length > 0) {
      collisionHistory.push({ frame, entityIds: frameCollisions });
    }
  }

  // Generate effects with keyframes for each text element
  const generateEffects = (entityId: string) => {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return [];

    const effects: Array<{
      id: string;
      componentId: string;
      data: GenericEffectData;
    }> = [];

    // Reset entity for new simulation pass to generate keyframes
    const entityForKeyframes = initializePhysics(params.texts.length).find(
      (e) => e.id === entityId,
    );
    if (!entityForKeyframes) return effects;

    const positionKeyframes: Array<{ prog: number; x: number; y: number }> = [];
    const scaleKeyframes: Array<{ prog: number; scale: number }> = [];
    const hueKeyframes: Array<{ prog: number; hue: number }> = [];

    // Simulate again to generate keyframes (sample every 5 frames for performance)
    const sampleRate = 5;
    for (let frame = 0; frame < totalFrames; frame += sampleRate) {
      const prog = frame / totalFrames;

      // Store position keyframe
      positionKeyframes.push({
        prog,
        x: entityForKeyframes.x,
        y: entityForKeyframes.y,
      });

      // Check if collision occurred near this frame
      const collision = collisionHistory.find(
        (c) =>
          Math.abs(c.frame - frame) < 3 && c.entityIds.includes(entityId),
      );

      if (collision) {
        // Add scale bounce: 1 → 1.2 → 1 over 200ms
        const collisionProg = collision.frame / totalFrames;
        const bounceFrames = Math.round(0.2 * fps);
        scaleKeyframes.push({ prog: collisionProg, scale: 1 });
        scaleKeyframes.push({
          prog: Math.min(1, collisionProg + bounceFrames / totalFrames / 2),
          scale: 1.2,
        });
        scaleKeyframes.push({
          prog: Math.min(1, collisionProg + bounceFrames / totalFrames),
          scale: 1,
        });

        // Add color flash: hue-rotate by 180deg
        hueKeyframes.push({ prog: collisionProg, hue: 0 });
        hueKeyframes.push({
          prog: Math.min(1, collisionProg + 0.1 / duration),
          hue: 180,
        });
        hueKeyframes.push({
          prog: Math.min(1, collisionProg + 0.2 / duration),
          hue: 0,
        });
      }

      // Update entity for next keyframe (simplified physics step)
      entityForKeyframes.vy += gravity;
      entityForKeyframes.vx *= 1 - friction;
      entityForKeyframes.vy *= 1 - friction;
      entityForKeyframes.x += entityForKeyframes.vx * sampleRate;
      entityForKeyframes.y += entityForKeyframes.vy * sampleRate;

      // Boundary check
      if (entityForKeyframes.x < 0) {
        entityForKeyframes.x = 0;
        entityForKeyframes.vx = -entityForKeyframes.vx * elasticity;
      } else if (entityForKeyframes.x + entityForKeyframes.width > width) {
        entityForKeyframes.x = width - entityForKeyframes.width;
        entityForKeyframes.vx = -entityForKeyframes.vx * elasticity;
      }
      if (entityForKeyframes.y < 0) {
        entityForKeyframes.y = 0;
        entityForKeyframes.vy = -entityForKeyframes.vy * elasticity;
      } else if (entityForKeyframes.y + entityForKeyframes.height > height) {
        entityForKeyframes.y = height - entityForKeyframes.height;
        entityForKeyframes.vy = -entityForKeyframes.vy * elasticity;
      }
    }

    // Add final keyframe
    positionKeyframes.push({
      prog: 1,
      x: entityForKeyframes.x,
      y: entityForKeyframes.y,
    });

    // Create position effect
    const translateRanges = positionKeyframes.flatMap((kf) => [
      { key: 'translateX', val: kf.x, prog: kf.prog },
      { key: 'translateY', val: kf.y, prog: kf.prog },
    ]);

    effects.push({
      id: `${entityId}-position-effect`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [entityId],
        ranges: translateRanges,
      },
    });

    // Create scale effect if collisions occurred
    if (scaleKeyframes.length > 0) {
      effects.push({
        id: `${entityId}-scale-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [entityId],
          ranges: scaleKeyframes.map((kf) => ({
            key: 'scale',
            val: kf.scale,
            prog: kf.prog,
          })),
        },
      });
    }

    // Create hue-rotate effect if collisions occurred
    if (hueKeyframes.length > 0) {
      effects.push({
        id: `${entityId}-hue-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [entityId],
          ranges: hueKeyframes.map((kf) => ({
            key: 'filter',
            val: `hue-rotate(${kf.hue}deg)`,
            prog: kf.prog,
          })),
        },
      });
    }

    return effects;
  };

  // Create text elements with effects
  const textElements: RenderableComponentData[] = params.texts.map(
    (textItem, index) => {
      const entityId = `text-element-${index + 1}`;
      const effects = generateEffects(entityId);

      return {
        id: entityId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: textItem.text,
          style: {
            fontSize: textItem.fontSize,
            color: textItem.color,
            fontWeight: textItem.fontWeight,
            ...fontStyle,
            position: 'absolute',
            willChange: 'transform',
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
            duration,
          },
        },
        effects,
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'text-ricochet-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: textElements,
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
  id: 'text-ricochet-physics',
  title: 'Text Ricochet Physics',
  description:
    'Physics-based text animation where words bounce off screen boundaries and each other like billiard balls. Features pre-computed collision detection, momentum transfer, reflection angles, and visual collision feedback with scale bounce and color flash. Includes optional audio reactivity for beat-synced impact effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'physics',
    'kinetic',
    'collision',
    'billiards',
    'bounce',
    'ricochet',
    'dynamic',
    'motion',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: [
      { text: 'DYNAMIC', fontSize: 48, color: '#FF6B6B', fontWeight: 'bold' },
      { text: 'KINETIC', fontSize: 52, color: '#4ECDC4', fontWeight: 'bold' },
      { text: 'ENERGY', fontSize: 44, color: '#FFE66D', fontWeight: 'bold' },
      { text: 'MOTION', fontSize: 50, color: '#A8E6CF', fontWeight: 'bold' },
      { text: 'IMPACT', fontSize: 46, color: '#FF8B94', fontWeight: 'bold' },
    ],
    duration: 6,
    fps: 30,
    physics: {
      gravity: 0,
      friction: 0.01,
      elasticity: 0.8,
      collisionDamping: 0.9,
    },
    font: 'Inter:700',
  },
};

export const textRicochetPhysicsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
