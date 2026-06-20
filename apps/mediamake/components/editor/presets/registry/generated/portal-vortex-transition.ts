/**
 * Portal Vortex Transition Preset
 *
 * This preset creates a dramatic video transition where the outgoing video spirals into a 
 * shrinking circular portal at the center while rotating, and the incoming video emerges 
 * from the same portal expanding outward with counter-rotation. The portal features swirling 
 * edge effects with distortion and particle effects around the edge for energy.
 *
 * Features:
 * - Outgoing video: Spirals into center with rotation (0deg to 360deg) and scale (1 to 0)
 * - Incoming video: Emerges from center with counter-rotation (-360deg to 0deg) and scale (0 to 1)
 * - Portal edge: Swirling glow effect with drop-shadow
 * - Particle effects: 8 particles orbiting the portal during transition
 * - Tunnel effect: Both videos visible during 2-second overlap with distortion
 * - Blur effects: Increasing blur on outgoing video, decreasing on incoming
 *
 * Use cases:
 * - Creating dramatic video transitions
 * - Building sci-fi or fantasy style transitions
 * - Adding energy and motion to video sequences
 * - Creating tunnel/vortex visual effects between clips
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video data'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video data'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
  portalColor: z
    .string()
    .default('rgba(147, 51, 234, 0.8)')
    .describe('Color of the portal glow and particles'),
  particleCount: z
    .number()
    .default(8)
    .describe('Number of particles orbiting the portal (4-12 recommended)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, portalColor, particleCount } = params;

  // Calculate total duration: video1.duration + video2.duration - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Outgoing video timing: plays from 0 to video1.duration
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;

  // Incoming video timing: starts before video1 ends (overlap)
  const incomingStart = video1.duration - transitionDuration;
  const incomingDuration = video2.duration;

  // Transition effects start timing (relative to each video's context)
  const outgoingEffectStart = video1.duration - transitionDuration;
  const incomingEffectStart = 0; // Relative to incoming video start

  // Generate particles
  const particleNodes: RenderableComponentData[] = [];
  const clampedParticleCount = Math.min(Math.max(particleCount, 4), 12);
  
  for (let i = 0; i < clampedParticleCount; i++) {
    const angle = (i / clampedParticleCount) * 360;
    const radius = 200; // Orbit radius in pixels
    
    particleNodes.push({
      id: `portal-particle-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle, ${portalColor} 0%, transparent 70%); border-radius: 50%;"></div>`,
        className: 'absolute w-8 h-8 rounded-full',
        style: {
          opacity: 0.6,
          filter: `drop-shadow(0 0 10px ${portalColor})`,
          pointerEvents: 'none',
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
          id: `particle-orbit-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`portal-particle-${i}`],
            ranges: [
              {
                key: 'translateX',
                val: `${Math.cos((angle * Math.PI) / 180) * radius}px`,
                prog: 0,
              },
              {
                key: 'translateX',
                val: `${Math.cos(((angle + 360) * Math.PI) / 180) * radius}px`,
                prog: 1,
              },
              {
                key: 'translateY',
                val: `${Math.sin((angle * Math.PI) / 180) * radius}px`,
                prog: 0,
              },
              {
                key: 'translateY',
                val: `${Math.sin(((angle + 360) * Math.PI) / 180) * radius}px`,
                prog: 1,
              },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.1 },
              { key: 'opacity', val: 0.8, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Outgoing video (spirals into center)
  const outgoingVideo: RenderableComponentData = {
    id: 'portal-outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 rounded-full',
      fit: 'cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-spiral-shrink',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['portal-outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
            { key: 'clipPath', val: 'circle(50% at center)', prog: 0 },
            { key: 'clipPath', val: 'circle(0% at center)', prog: 1 },
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(5px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video (emerges from center)
  const incomingVideo: RenderableComponentData = {
    id: 'portal-incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 rounded-full',
      fit: 'cover',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      {
        id: 'incoming-spiral-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: incomingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['portal-incoming-video'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: -360, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'clipPath', val: 'circle(0% at center)', prog: 0 },
            { key: 'clipPath', val: 'circle(50% at center)', prog: 1 },
            { key: 'filter', val: 'blur(5px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Particle container (only visible during transition)
  const particleContainer: RenderableComponentData = {
    id: 'portal-particle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: transitionDuration,
      },
    },
    childrenData: particleNodes,
  };

  // Portal glow (swirling edge effect)
  const portalGlow: RenderableComponentData = {
    id: 'portal-glow',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, transparent 40%, ${portalColor.replace('0.8', '0.4')} 50%, transparent 60%);"></div>`,
      className: 'absolute pointer-events-none',
      style: {
        width: '300px',
        height: '300px',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        filter: `drop-shadow(0 0 20px ${portalColor}) blur(2px)`,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'portal-glow-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['portal-glow'],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 180, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'portal-vortex-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideo,
      incomingVideo,
      particleContainer,
      portalGlow,
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
  id: 'portal-vortex-transition',
  title: 'Portal Vortex Transition',
  description:
    'A dramatic video transition where the outgoing video spirals into a shrinking circular portal at the center while rotating, and the incoming video emerges from the same portal expanding outward with counter-rotation. Features swirling portal edge effects, particle energy around the portal, and a glowing vortex aesthetic during the 2-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'portal', 'vortex', 'spiral', 'video', 'dramatic', 'sci-fi'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2,
    portalColor: 'rgba(147, 51, 234, 0.8)',
    particleCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const portalVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
