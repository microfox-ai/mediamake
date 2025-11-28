/**
 * Shattered Glass Circle Reveal Preset
 * 
 * A dramatic circle reveal effect where expanding cracks shatter through a glass surface.
 * Features realistic crack propagation physics, light refraction effects on crack edges,
 * falling glass shards with gravity physics, and particle effects for glass fragments.
 * Perfect for intense action content or breakthrough/transformation moments.
 * 
 * Technical Implementation:
 * - Uses HTMLBlockAtom for crack lines (instead of deprecated ShapeAtom)
 * - Generates 25 crack lines with random lengths and angles
 * - Implements staggered timing based on distance from center
 * - Glass shards with gravity physics (translateY + rotate)
 * - Particle scatter effects with opacity fade
 * - Light refraction effects using backdrop-filter
 * - Screen shake effect during impact phase
 * 
 * Phases:
 * 1. Impact & Initial Crack (0-0.5s): Screen shake + initial crack appearance
 * 2. Crack Propagation (0-1.5s): Spider-web pattern with distance-based stagger
 * 3. Glass Shattering (1.0-2.0s): Glass surface fades, shards fall with gravity
 * 4. Particle Scatter (1.0-2.5s): Small fragments scatter outward
 * 5. Clear State (2.0-3.5s): Fully revealed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  trackId: z
    .string()
    .default('shattered-glass-reveal')
    .describe('Unique ID for this glass reveal effect'),
  duration: z
    .number()
    .default(3.5)
    .describe('Total duration of the effect in seconds'),
  crackCount: z
    .number()
    .min(10)
    .max(40)
    .default(25)
    .describe('Number of crack lines to generate'),
  shardCount: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Number of glass shards to generate'),
  particleCount: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Number of particle fragments'),
  impactDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the initial impact phase in seconds'),
  crackPropagationDuration: z
    .number()
    .default(1.5)
    .describe('Duration of crack propagation in seconds'),
  shatterDuration: z
    .number()
    .default(1.0)
    .describe('Duration of glass shattering phase in seconds'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Intensity of screen shake effect in pixels'),
  crackColor: z
    .string()
    .default('rgba(255, 255, 255, 0.9)')
    .describe('Color of the crack lines'),
  glassOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .describe('Opacity of the glass surface layer'),
  refractionBlur: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Blur amount for light refraction effect in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    duration,
    crackCount,
    shardCount,
    particleCount,
    impactDuration,
    crackPropagationDuration,
    shatterDuration,
    shakeIntensity,
    crackColor,
    glassOpacity,
    refractionBlur,
  } = params;

  const fps = props.config?.fps || 30;

  // Helper: Generate random value in range
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Helper: Generate crack lines
  const generateCracks = () => {
    const cracks: RenderableComponentData[] = [];
    
    for (let i = 0; i < crackCount; i++) {
      const angle = random(0, 360);
      const length = random(100, 300);
      const distance = length / 2; // Distance from center for stagger calculation
      const delay = distance * 0.002; // Stagger based on distance
      
      const crackId = `${trackId}-crack-${i}`;
      
      // Create crack line using HTMLBlockAtom with CSS styling
      const crackLine: RenderableComponentData = {
        id: crackId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 2px; height: ${length}px; background: linear-gradient(to bottom, ${crackColor}, rgba(255,255,255,0.3)); box-shadow: 0 0 4px rgba(255,255,255,0.6), 0 0 8px rgba(150,200,255,0.3);"></div>`,
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            transformOrigin: 'center top',
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
            id: `${crackId}-propagate`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: delay,
              duration: crackPropagationDuration - delay,
              mode: 'provider',
              targetIds: [crackId],
              ranges: [
                { key: 'scaleY', val: 0, prog: 0 },
                { key: 'scaleY', val: 1, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0.3, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };
      
      cracks.push(crackLine);
    }
    
    return cracks;
  };

  // Helper: Generate glass shards
  const generateShards = () => {
    const shards: RenderableComponentData[] = [];
    
    for (let i = 0; i < shardCount; i++) {
      const size = random(20, 40);
      const startX = random(45, 55);
      const startY = random(45, 55);
      const endY = random(120, 180);
      const rotation = random(-180, 180);
      const fallDelay = random(1.0, 1.3);
      const fallDuration = random(0.7, 1.0);
      
      const shardId = `${trackId}-shard-${i}`;
      const shardShape = i % 3 === 0 ? 'triangle' : 'rectangle';
      
      const shardHTML = shardShape === 'triangle'
        ? `<div style="width: 0; height: 0; border-left: ${size/2}px solid transparent; border-right: ${size/2}px solid transparent; border-bottom: ${size}px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(2px); box-shadow: 0 2px 8px rgba(255,255,255,0.2), inset 0 0 4px rgba(255,255,255,0.3);"></div>`
        : `<div style="width: ${size}px; height: ${size}px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(2px); border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 2px 8px rgba(255,255,255,0.2);"></div>`;
      
      const shard: RenderableComponentData = {
        id: shardId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: shardHTML,
          className: 'absolute',
          style: {
            left: `${startX}%`,
            top: `${startY}%`,
            transform: `rotate(${random(-15, 15)}deg)`,
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
            id: `${shardId}-fall`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: fallDelay,
              duration: fallDuration,
              mode: 'provider',
              targetIds: [shardId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: endY, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotation, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };
      
      shards.push(shard);
    }
    
    return shards;
  };

  // Helper: Generate particles
  const generateParticles = () => {
    const particles: RenderableComponentData[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const size = random(2, 6);
      const startX = random(48, 52);
      const startY = random(48, 52);
      const angle = random(0, 360);
      const distance = random(50, 150);
      const endX = startX + Math.cos((angle * Math.PI) / 180) * distance;
      const endY = startY + Math.sin((angle * Math.PI) / 180) * distance;
      const scatterDelay = random(1.0, 1.5);
      const scatterDuration = random(1.0, 1.5);
      
      const particleId = `${trackId}-particle-${i}`;
      
      const particle: RenderableComponentData = {
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: rgba(255, 255, 255, 0.8); border-radius: 50%; box-shadow: 0 0 4px rgba(255,255,255,0.9);"></div>`,
          className: 'absolute',
          style: {
            left: `${startX}%`,
            top: `${startY}%`,
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
            id: `${particleId}-scatter`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: scatterDelay,
              duration: scatterDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: endX - startX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: endY - startY, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };
      
      particles.push(particle);
    }
    
    return particles;
  };

  // Generate all elements
  const cracks = generateCracks();
  const shards = generateShards();
  const particles = generateParticles();

  // Glass surface layer
  const glassSurface: RenderableComponentData = {
    id: `${trackId}-glass-surface`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: rgba(255, 255, 255, ${glassOpacity}); backdrop-filter: blur(${refractionBlur}px) brightness(1.2); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${trackId}-glass-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 1.0,
          duration: shatterDuration,
          mode: 'provider',
          targetIds: [`${trackId}-glass-surface`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Screen shake container
  const screenShakeContainer: RenderableComponentData = {
    id: `${trackId}-shake-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
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
        id: `${trackId}-shake`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: impactDuration,
          mode: 'provider',
          targetIds: [`${trackId}-shake-container`],
          ranges: [
            { key: 'translateX', val: shakeIntensity, prog: 0 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.2 },
            { key: 'translateX', val: shakeIntensity * 0.7, prog: 0.4 },
            { key: 'translateX', val: -shakeIntensity * 0.5, prog: 0.6 },
            { key: 'translateX', val: shakeIntensity * 0.3, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: -shakeIntensity * 0.5, prog: 0 },
            { key: 'translateY', val: shakeIntensity * 0.5, prog: 0.25 },
            { key: 'translateY', val: -shakeIntensity * 0.3, prog: 0.5 },
            { key: 'translateY', val: shakeIntensity * 0.2, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: [...cracks, ...shards, ...particles] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [glassSurface, screenShakeContainer] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'shattered-glass-reveal',
  title: 'Shattered Glass Circle Reveal',
  description:
    'A dramatic circle reveal effect where expanding cracks shatter through a glass surface. Features realistic crack propagation physics, light refraction effects on crack edges, falling glass shards with gravity physics, and particle effects for glass fragments. Perfect for intense action content or breakthrough/transformation moments.',
  type: 'predefined',
  presetType: 'children',
  tags: ['reveal', 'glass', 'shatter', 'dramatic', 'impact', 'effects', 'particles'],
  defaultInputParams: {
    trackId: 'shattered-glass-reveal',
    duration: 3.5,
    crackCount: 25,
    shardCount: 10,
    particleCount: 15,
    impactDuration: 0.5,
    crackPropagationDuration: 1.5,
    shatterDuration: 1.0,
    shakeIntensity: 8,
    crackColor: 'rgba(255, 255, 255, 0.9)',
    glassOpacity: 0.05,
    refractionBlur: 8,
  },
  dependencies: {},
};

// Export preset
export const shatteredGlassRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
