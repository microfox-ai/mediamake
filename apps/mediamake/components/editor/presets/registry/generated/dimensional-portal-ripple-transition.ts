/**
 * Dimensional Portal Ripple Transition Preset
 *
 * Creates a stunning dimensional portal transition where videos exist in parallel liquid dimensions
 * that merge during transition. Features concentric ripple effects emanating from a central portal
 * point with radial scaling and spiral rotation effects.
 *
 * Features:
 * - **Spiral Portal Effect**: Outgoing video warps into portal using radial scaling and 720° rotation
 * - **Inverse Spiral Entry**: Incoming video emerges with counter-rotation (-720°) while scaling up
 * - **Concentric Ripples**: Multiple box-shadow rings with different colors animate outward
 * - **Particle Flow**: CSS pseudo-elements create colored particles flowing between dimensions
 * - **Liquid Dimension Merge**: 2.2-second overlap creates seamless dimensional merging
 * - **Radial Gradient Background**: Deep space portal aesthetic with gradient backdrop
 *
 * Technical Implementation:
 * - Transform-origin at center (50%, 50%) for perfect portal effect
 * - Dual rotation/scale transforms for spiral warping
 * - Staggered box-shadow animations for ripple waves
 * - HTMLBlockAtom particles with circular motion paths
 * - Z-index layering for proper dimensional stacking
 *
 * Use Cases:
 * - Sci-fi video transitions
 * - Dimensional travel effects
 * - Portal-themed content
 * - Psychedelic visual sequences
 * - Abstract liquid transitions
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z.number()
    .default(2.2)
    .describe('Duration of the portal transition overlap in seconds'),
  
  portalIntensity: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for portal effects (rotation speed, ripple size)'),
  
  particleCount: z.number()
    .min(3)
    .max(12)
    .default(6)
    .optional()
    .describe('Number of particle effects flowing between dimensions'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration, portalIntensity = 1, particleCount = 6 } = params;

  // Calculate timing
  const outgoingDuration = outgoingVideo.duration - overlapDuration;
  const transitionStart = outgoingDuration;
  const totalDuration = outgoingVideo.duration - overlapDuration + incomingVideo.duration;

  // Calculate rotation degrees based on intensity
  const outgoingRotation = 720 * portalIntensity;
  const incomingRotation = -720 * portalIntensity;

  // Ripple colors - outgoing (purple/magenta) and incoming (cyan/blue)
  const outgoingRipples = [
    { color: 'rgba(138, 43, 226, 0.8)', size: 50, duration: 2.2, delay: 0 },
    { color: 'rgba(75, 0, 130, 0.6)', size: 80, duration: 2.0, delay: 0.2 },
    { color: 'rgba(255, 0, 255, 0.4)', size: 110, duration: 1.8, delay: 0.4 },
  ];

  const incomingRipples = [
    { color: 'rgba(0, 255, 255, 0.8)', size: 50, duration: 2.2, delay: 0 },
    { color: 'rgba(0, 191, 255, 0.6)', size: 80, duration: 2.0, delay: 0.2 },
    { color: 'rgba(64, 224, 208, 0.4)', size: 110, duration: 1.8, delay: 0.4 },
  ];

  // Generate particle data
  const particleColors = ['#8A2BE2', '#FF00FF', '#00FFFF', '#40E0D0', '#4B0082', '#00BFFF'];
  const particleData = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * 360;
    const distance = 80 + Math.random() * 50;
    const translateX = Math.cos((angle * Math.PI) / 180) * distance;
    const translateY = Math.sin((angle * Math.PI) / 180) * distance;
    const size = 5 + Math.random() * 5;
    const duration = 1.7 + Math.random() * 0.5;
    const delay = i * 0.1;
    const color = particleColors[i % particleColors.length];

    return { translateX, translateY, size, duration, delay, color, id: `particle-${i}` };
  });

  // Build outgoing video effects
  const outgoingEffects: any[] = [
    // Main spiral warp effect
    {
      id: 'outgoing-spiral-warp',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: overlapDuration, // Relative to outgoing video start
        duration: overlapDuration,
        mode: 'provider',
        targetIds: ['outgoing-video'],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: outgoingRotation, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0, prog: 1 },
          { key: 'transformOriginX', val: 50, prog: 0 },
          { key: 'transformOriginY', val: 50, prog: 0 },
        ],
      },
    },
    // Opacity fade
    {
      id: 'outgoing-opacity-fade',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: overlapDuration + 0.7,
        duration: 1.5,
        mode: 'provider',
        targetIds: ['outgoing-video'],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Add outgoing ripple effects
  outgoingRipples.forEach((ripple, index) => {
    outgoingEffects.push({
      id: `outgoing-ripple-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: overlapDuration + ripple.delay,
        duration: ripple.duration,
        mode: 'provider',
        targetIds: ['outgoing-video'],
        ranges: [
          { key: 'boxShadow', val: `0 0 0 0px ${ripple.color}`, prog: 0 },
          { key: 'boxShadow', val: `0 0 0 ${ripple.size}px ${ripple.color.replace(/[\d.]+\)$/, '0)')}`, prog: 1 },
        ],
      },
    });
  });

  // Build incoming video effects
  const incomingEffects: any[] = [
    // Inverse spiral effect
    {
      id: 'incoming-inverse-spiral',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0, // Relative to incoming video start
        duration: overlapDuration,
        mode: 'provider',
        targetIds: ['incoming-video'],
        ranges: [
          { key: 'rotate', val: incomingRotation, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'transformOriginX', val: 50, prog: 0 },
          { key: 'transformOriginY', val: 50, prog: 0 },
        ],
      },
    },
    // Opacity fade in
    {
      id: 'incoming-opacity-fade',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 1.5,
        mode: 'provider',
        targetIds: ['incoming-video'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
  ];

  // Add incoming ripple effects
  incomingRipples.forEach((ripple, index) => {
    incomingEffects.push({
      id: `incoming-ripple-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: ripple.delay,
        duration: ripple.duration,
        mode: 'provider',
        targetIds: ['incoming-video'],
        ranges: [
          { key: 'boxShadow', val: `0 0 0 0px ${ripple.color}`, prog: 0 },
          { key: 'boxShadow', val: `0 0 0 ${ripple.size}px ${ripple.color.replace(/[\d.]+\)$/, '0)')}`, prog: 1 },
        ],
      },
    });
  });

  // Build particle components
  const particleComponents = particleData.map((particle) => ({
    id: particle.id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: ${particle.size}px; height: ${particle.size}px; border-radius: 50%; background: ${particle.color};'></div>`,
      style: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 20,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: `${particle.id}-flow`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: particle.delay,
          duration: particle.duration,
          mode: 'provider',
          targetIds: [particle.id],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: particle.translateX, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: particle.translateY, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  })) as RenderableComponentData[];

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration + overlapDuration,
        },
      },
      effects: outgoingEffects,
    },
    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration,
        },
      },
      effects: incomingEffects,
    },
    // Particles
    ...particleComponents,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'dimensional-portal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'fixed inset-0',
        style: {
          background: 'radial-gradient(circle at center, #1a0033, #000000)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'dimensional-portal-ripple-transition',
  title: 'Dimensional Portal Ripple Transition',
  description: 'Videos exist in parallel liquid dimensions that merge during transition with concentric ripple effects, spiral rotation warping, and particle flows between dimensions',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'portal', 'ripple', 'spiral', 'dimensional', 'particles', 'liquid', 'sci-fi'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2.2,
    portalIntensity: 1,
    particleCount: 6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dimensionalPortalRippleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};