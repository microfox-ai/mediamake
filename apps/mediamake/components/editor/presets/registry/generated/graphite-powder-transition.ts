/**
 * Graphite Powder Blow-Away Transition Preset
 *
 * This preset creates a sophisticated transition effect where the outgoing scene appears to be made
 * of loose graphite powder that gets blown away by wind from left to right, revealing the incoming video.
 *
 * Features:
 * - 100+ particles distributed across three depth layers for parallax effect
 * - Realistic wind turbulence using sine wave modulation
 * - Particle velocities vary by size (smaller particles move faster)
 * - Progressive fragmentation of outgoing video synchronized with particle dispersion
 * - GPU-accelerated animations with staggered particle delays
 * - 2.2-second overlap period for smooth transition
 *
 * Technical Implementation:
 * - BaseLayout with three depth layers (back, mid, front)
 * - HTMLBlockAtom particles (1-6px) with varying speeds and turbulence
 * - Outgoing VideoAtom with progressive opacity fade
 * - Incoming VideoAtom revealed through particle gaps
 * - Wind pattern: translateX(100-300%), translateY(-50 to 50% with sine modulation), rotate(0-360deg)
 *
 * Use cases:
 * - Transitions between video clips
 * - Scene changes with dramatic effect
 * - Stylized video editing
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (being blown away)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (being revealed)'),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds'),
  particleCount: z
    .number()
    .min(50)
    .max(300)
    .default(120)
    .describe('Total number of particles (distributed across 3 layers)'),
  windIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Wind intensity multiplier (affects particle speeds)'),
  turbulenceAmount: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Vertical turbulence amount in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    particleCount,
    windIntensity,
    turbulenceAmount,
  } = params;

  const { config } = props;
  const viewportWidth = config?.width || 1920;
  const viewportHeight = config?.height || 1080;

  // Helper: Generate random number in range
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Helper: Generate particle data
  const generateParticles = (count: number, layer: 'back' | 'mid' | 'front') => {
    const particles: RenderableComponentData[] = [];
    
    // Layer-specific speed multipliers (front particles move fastest)
    const layerSpeed = layer === 'front' ? 1.5 : layer === 'mid' ? 1.2 : 1.0;

    for (let i = 0; i < count; i++) {
      // Particle size (1-6px)
      const size = Math.floor(random(1, 7));
      
      // Smaller particles move faster
      const sizeSpeedMultiplier = 7 - size; // 6 for 1px, 1 for 6px
      
      // Random position
      const x = random(0, 100); // percentage
      const y = random(0, 100); // percentage
      
      // Movement distances (larger values for faster particles)
      const translateXDistance = random(100, 300) * windIntensity * sizeSpeedMultiplier * layerSpeed;
      
      // Vertical turbulence using sine wave concept
      const turbulenceRange = turbulenceAmount;
      const turbulencePhase = random(0, 1); // 0-1 for sine wave phase
      
      // Rotation amount
      const rotationAmount = random(0, 360);
      
      // Stagger delay (0-500ms)
      const delay = random(0, 0.5);
      
      // Particle duration (slightly varied for natural effect)
      const duration = transitionDuration - delay;

      // Create particle with HTMLBlockAtom (using div as graphite particle)
      const particleId = `particle-${layer}-${i}`;
      
      particles.push({
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: rgba(64, 64, 64, 0.95); border-radius: ${size < 3 ? '50%' : '2px'}; will-change: transform, opacity;"></div>`,
          className: 'absolute',
          style: {
            left: `${x}%`,
            top: `${y}%`,
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: delay,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${particleId}-wind-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                // Horizontal movement (left to right)
                { key: 'translateX', val: '0px', prog: 0 },
                { key: 'translateX', val: `${translateXDistance}%`, prog: 1 },
                
                // Vertical turbulence (sine wave simulation with multiple keyframes)
                { key: 'translateY', val: '0px', prog: 0 },
                { 
                  key: 'translateY', 
                  val: `${Math.sin(turbulencePhase * Math.PI * 2) * turbulenceRange}px`, 
                  prog: 0.25 
                },
                { 
                  key: 'translateY', 
                  val: `${Math.sin((turbulencePhase + 0.25) * Math.PI * 2) * turbulenceRange}px`, 
                  prog: 0.5 
                },
                { 
                  key: 'translateY', 
                  val: `${Math.sin((turbulencePhase + 0.5) * Math.PI * 2) * turbulenceRange}px`, 
                  prog: 0.75 
                },
                { 
                  key: 'translateY', 
                  val: `${Math.sin((turbulencePhase + 0.75) * Math.PI * 2) * turbulenceRange}px`, 
                  prog: 1 
                },
                
                // Rotation
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotationAmount, prog: 1 },
                
                // Opacity fade out
                { key: 'opacity', val: 0.95, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.3 },
                { key: 'opacity', val: 0.4, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Calculate particles per layer
  const particlesPerLayer = Math.floor(particleCount / 3);
  const backParticles = generateParticles(particlesPerLayer, 'back');
  const midParticles = generateParticles(particlesPerLayer, 'mid');
  const frontParticles = generateParticles(particleCount - (particlesPerLayer * 2), 'front');

  // Incoming video (revealed as particles blow away)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full',
      muted: false,
      style: {
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Outgoing video (fragments and fades as particles disperse)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full',
      muted: false,
      style: {
        willChange: 'opacity',
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
        id: 'outgoing-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0.4, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Particle layers
  const particleLayerBack: RenderableComponentData = {
    id: 'particle-layer-back',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: backParticles,
  };

  const particleLayerMid: RenderableComponentData = {
    id: 'particle-layer-mid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 4,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: midParticles,
  };

  const particleLayerFront: RenderableComponentData = {
    id: 'particle-layer-front',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 5,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: frontParticles,
  };

  // Incoming video layer (below outgoing)
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
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
        duration: transitionDuration,
      },
    },
    childrenData: [incomingVideo],
  };

  // Outgoing video layer (above incoming, below particles)
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingVideo],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'graphite-powder-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
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
      incomingVideoLayer,
      outgoingVideoLayer,
      particleLayerBack,
      particleLayerMid,
      particleLayerFront,
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
  id: 'graphite-powder-transition',
  title: 'Graphite Powder Blow-Away Transition',
  description:
    'A sophisticated transition effect where the outgoing scene appears to be made of loose graphite powder that gets blown away by wind from left to right, revealing the incoming video. Features 100+ particles distributed across three depth layers for parallax effect, with realistic wind turbulence using sine wave modulation, varying particle velocities based on size, and progressive fragmentation of the outgoing video synchronized with particle dispersion. The 2.2-second overlap includes GPU-accelerated animations with staggered particle delays for natural wind patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'particle', 'wind', 'powder', 'graphite', 'parallax'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 2.2,
    particleCount: 120,
    windIntensity: 1,
    turbulenceAmount: 50,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const graphitePowderTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
