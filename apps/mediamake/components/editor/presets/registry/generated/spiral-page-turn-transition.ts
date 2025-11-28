/**
 * Spiral Page-Turn Transition Preset
 *
 * Creates a spiral page-turn effect inspired by notebook rings or spiral-bound presentations.
 * The current scene rotates around a central vertical axis (like a revolving door) while
 * simultaneously sliding upward, creating a helix-like motion. The next scene emerges from
 * below with opposite spiral motion.
 *
 * Features:
 * - Spiral rotation effect (rotateY + translateY + rotateZ tilt)
 * - Motion blur during fastest rotation
 * - Particle effects with scattered paper fragments
 * - Energetic and playful feel
 * - Perfect for creative portfolios and dynamic presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingScene: z
    .object({
      type: z.enum(['image', 'video']).describe('Type of outgoing media'),
      src: z.string().describe('Source URL of outgoing media'),
    })
    .describe('Outgoing scene media configuration'),

  incomingScene: z
    .object({
      type: z.enum(['image', 'video']).describe('Type of incoming media'),
      src: z.string().describe('Source URL of incoming media'),
    })
    .describe('Incoming scene media configuration'),

  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of the spiral transition in seconds'),

  motionBlurIntensity: z
    .number()
    .min(0)
    .max(8)
    .default(4)
    .describe('Maximum blur intensity during transition (in pixels)'),

  particleCount: z
    .number()
    .int()
    .min(4)
    .max(16)
    .default(8)
    .describe('Number of paper fragment particles'),

  rotationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Rotation intensity multiplier'),

  tiltIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Tilt (rotateZ) intensity multiplier'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingScene,
    incomingScene,
    transitionDuration,
    motionBlurIntensity,
    particleCount,
    rotationIntensity,
    tiltIntensity,
  } = params;

  // Helper to generate random particle positions and trajectories
  const generateParticleData = (
    count: number,
  ): Array<{
    id: string;
    top: number;
    left: number;
    width: number;
    height: number;
    rotation: number;
    translateX: number;
    translateY: number;
    delay: number;
  }> => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        id: `particle-${i}`,
        top: 20 + Math.random() * 60, // 20-80%
        left: 20 + Math.random() * 60, // 20-80%
        width: 4 + Math.random() * 8, // 4-12px
        height: 4 + Math.random() * 8, // 4-12px
        rotation: Math.random() * 360, // Full rotation
        translateX: (Math.random() - 0.5) * 200, // -100 to +100px
        translateY: (Math.random() - 0.5) * 200, // -100 to +100px
        delay: i * 0.1, // Staggered delays
      });
    }
    return particles;
  };

  const particles = generateParticleData(particleCount);

  // Determine component IDs
  const outgoingComponentId =
    outgoingScene.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingScene.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create particle components
  const particleComponents: RenderableComponentData[] = particles.map(
    (particle) => ({
      id: particle.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #e5e5e5, #d4d4d4); border-radius: 2px;"></div>`,
        style: {
          position: 'absolute' as const,
          top: `${particle.top}%`,
          left: `${particle.left}%`,
          width: `${particle.width}px`,
          height: `${particle.height}px`,
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
          id: `${particle.id}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: particle.delay,
            duration: transitionDuration - particle.delay,
            mode: 'provider' as const,
            targetIds: [particle.id],
            ranges: [
              // Fade in and out
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
              // Translation
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: particle.translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: particle.translateY, prog: 1 },
              // Rotation
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: particle.rotation, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create outgoing scene with spiral-out animation
  const outgoingSceneComponent: RenderableComponentData = {
    id: 'spiral-outgoing-scene',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
          backfaceVisibility: 'hidden' as const,
          willChange: 'transform, filter',
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
      {
        id: 'outgoing-content',
        type: 'atom' as const,
        componentId: outgoingComponentId,
        data: {
          src: outgoingScene.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      },
    ],
    effects: [
      {
        id: 'spiral-out-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['spiral-outgoing-scene'],
          ranges: [
            // Spiral rotation (0 to 180deg)
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 180 * rotationIntensity, prog: 1 },
            // Slide upward (0 to 100%)
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-100%', prog: 1 },
            // Tilt (0 to 15deg back to 0)
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 15 * tiltIntensity, prog: 0.5 },
            { key: 'rotateZ', val: 0, prog: 1 },
            // Scale for depth (1 to 0.8 back to 1)
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Motion blur (0 to 4px back to 0)
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            {
              key: 'filter',
              val: `blur(${motionBlurIntensity}px)`,
              prog: 0.5,
            },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming scene with spiral-in animation
  const incomingSceneComponent: RenderableComponentData = {
    id: 'spiral-incoming-scene',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
          backfaceVisibility: 'hidden' as const,
          willChange: 'transform, filter',
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
      {
        id: 'incoming-content',
        type: 'atom' as const,
        componentId: incomingComponentId,
        data: {
          src: incomingScene.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      },
    ],
    effects: [
      {
        id: 'spiral-in-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['spiral-incoming-scene'],
          ranges: [
            // Spiral rotation (-180 to 0deg)
            { key: 'rotateY', val: -180 * rotationIntensity, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            // Slide upward (-100% to 0%)
            { key: 'translateY', val: '100%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
            // Opposite tilt (0 to -15deg back to 0)
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: -15 * tiltIntensity, prog: 0.5 },
            { key: 'rotateZ', val: 0, prog: 1 },
            // Scale for depth (0.8 to 1)
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Motion blur (0 to 4px back to 0)
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            {
              key: 'filter',
              val: `blur(${motionBlurIntensity}px)`,
              prog: 0.5,
            },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create particles container
  const particlesContainer: RenderableComponentData = {
    id: 'spiral-particles-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: particleComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'spiral-page-turn-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
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
      outgoingSceneComponent,
      incomingSceneComponent,
      particlesContainer,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'spiral-page-turn-transition',
  title: 'Spiral Page-Turn Transition',
  description:
    'A dynamic spiral page-turn effect inspired by notebook rings or spiral-bound presentations. The current scene rotates around a central vertical axis while sliding upward in a helix-like motion, while the next scene emerges from below with opposite spiral motion. Features motion blur at peak rotation speed and scattered paper fragment particles for added dynamism. Perfect for creative portfolios and dynamic presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'spiral',
    'page-turn',
    'notebook',
    'helix',
    'motion-blur',
    'particles',
    'creative',
    'dynamic',
  ],
  defaultInputParams: {
    outgoingScene: {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    incomingScene: {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 1,
    motionBlurIntensity: 4,
    particleCount: 8,
    rotationIntensity: 1,
    tiltIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const spiralPageTurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
