/**
 * Charcoal Dust Scatter Reveal Transition Preset
 *
 * This preset creates a dynamic transition effect that simulates charcoal dust particles
 * being blown across paper to unveil the next scene. The transition features particle-like
 * elements that start clustered in the center and scatter outward in a radial pattern,
 * revealing the incoming video underneath.
 *
 * Features:
 * - **Particle Scatter Effect**: 35 circular particles with varying sizes (4-12px) animate
 *   from center to edges in a radial pattern
 * - **Smudge Trails**: Particles leave subtle blend trails (mix-blend-mode: multiply) that
 *   briefly show both videos blended together
 * - **Camera Shake**: Shake effect at peak scatter (0.9s) adds dynamic energy
 * - **Sketch Desaturation**: Outgoing video gradually becomes sketchy and desaturated
 * - **Radial Mask Reveal**: Incoming video revealed through expanding radial gradient
 *
 * Technical Implementation:
 * - Uses BaseLayout with shake effect via transform animations
 * - Multiple particles positioned absolutely with radial coordinate animations
 * - Particles use opacity fade (0.8 to 0) and multiply blend mode
 * - SVG filter for sketch effect on outgoing video
 * - Generic effects in provider mode with precise timing
 *
 * Use cases:
 * - Artistic transitions between scenes
 * - Paper/drawing-themed content transitions
 * - Creative reveal effects for storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video to reveal'),
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that fades out'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Total duration of the transition effect in seconds'),
  particleCount: z
    .number()
    .default(35)
    .describe('Number of charcoal dust particles (30-40 recommended)'),
  shakeIntensity: z
    .number()
    .default(5)
    .describe('Maximum shake distance in pixels (default: 5px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingVideoSrc,
    outgoingVideoSrc,
    transitionDuration,
    particleCount,
    shakeIntensity,
  } = params;

  // Helper: Generate random particle properties
  const generateParticle = (index: number) => {
    const angle = (index / particleCount) * Math.PI * 2;
    const distance = 150 + Math.random() * 100; // 150-250px scatter distance
    const size = 4 + Math.floor(Math.random() * 9); // 4-12px
    const duration = 0.8 + Math.random() * 0.6; // 0.8-1.4s scatter duration
    const delay = Math.random() * 0.4; // 0-0.4s delay

    return {
      id: `particle-${index}`,
      size,
      angle,
      distance,
      duration,
      delay,
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance,
    };
  };

  const particles = Array.from({ length: particleCount }, (_, i) =>
    generateParticle(i),
  );

  // Helper: Generate shake keyframes at specific times
  const generateShakeEffect = () => {
    const shakeTimes = [0.8, 0.85, 0.9, 0.95, 1.0];
    const ranges: Array<{ key: string; val: string; prog: number }> = [];

    shakeTimes.forEach((time) => {
      const prog = time / transitionDuration;
      const offsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * shakeIntensity;

      ranges.push({
        key: 'translateX',
        val: `${offsetX}px`,
        prog,
      });
      ranges.push({
        key: 'translateY',
        val: `${offsetY}px`,
        prog,
      });
    });

    // Start and end at 0 offset
    ranges.unshift(
      { key: 'translateX', val: '0px', prog: 0 },
      { key: 'translateY', val: '0px', prog: 0 },
    );
    ranges.push(
      { key: 'translateX', val: '0px', prog: 1 },
      { key: 'translateY', val: '0px', prog: 1 },
    );

    return ranges;
  };

  // Create particle nodes
  const particleNodes: RenderableComponentData[] = particles.map((p) => ({
    id: p.id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width:${p.size}px;height:${p.size}px;background:#2c2c2c;border-radius:50%;"></div>`,
      className: 'absolute pointer-events-none',
      style: {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        mixBlendMode: 'multiply',
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
        id: `${p.id}-scatter`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: p.delay,
          duration: p.duration,
          mode: 'provider',
          targetIds: [p.id],
          ranges: [
            // Move from center to edge
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${p.endX}px`, prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `${p.endY}px`, prog: 1 },
            // Fade out
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Incoming video with radial mask reveal
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
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
        id: 'mask-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            {
              key: 'clipPath',
              val: 'circle(0% at 50% 50%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'circle(71% at 50% 50%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Outgoing video with sketch and desaturation effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
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
        id: 'desaturate-sketch',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            // Desaturate
            {
              key: 'filter',
              val: 'saturate(1) contrast(1)',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'saturate(0.3) contrast(1.3)',
              prog: 1,
            },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: particleNodes,
  };

  // Root container with shake effect
  const rootContainer: RenderableComponentData = {
    id: 'transition-root',
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
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'camera-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.8,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['transition-root'],
          ranges: generateShakeEffect(),
        },
      },
    ],
    childrenData: [incomingVideo, outgoingVideo, particleContainer],
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
  id: 'charcoal-dust-scatter-reveal',
  title: 'Charcoal Dust Scatter Reveal Transition',
  description:
    'A particle-based transition effect that simulates charcoal dust being blown across paper. Particles start clustered in the center and scatter outward in a radial pattern, revealing the incoming video underneath. Features smudge trails during dispersion, camera shake at peak scatter (0.9s), and a progressive sketch/desaturation effect on the outgoing video. Duration: 1.8 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'charcoal',
    'particle',
    'scatter',
    'artistic',
    'reveal',
    'paper',
    'sketch',
  ],
  defaultInputParams: {
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    transitionDuration: 1.8,
    particleCount: 35,
    shakeIntensity: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const charcoalDustScatterRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
