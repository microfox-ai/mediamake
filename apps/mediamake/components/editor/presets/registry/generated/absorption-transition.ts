/**
 * Absorption Transition Preset
 *
 * This preset creates a cinematic absorption transition where the outgoing video appears to be
 * absorbed into canvas fabric, with ink bleeding through the fibers before the incoming video
 * emerges from the absorbed ink. The transition uses a 2.8-second overlap with three distinct stages:
 * absorption (1s), diffusion (0.8s), and emergence (1s).
 *
 * Features:
 * - **Three-Stage Transition**: Absorption → Diffusion → Emergence
 * - **Fabric Texture Effect**: Canvas texture overlay with noise pattern
 * - **Desaturation & Blur**: Outgoing video desaturates and blurs during absorption
 * - **Scale Animation**: Slight scale-down effect during absorption
 * - **Ink Diffusion**: Fabric noise layer with hue-rotation during diffusion stage
 * - **Progressive Clarity**: Incoming video emerges from heavy blur to crystal clear
 * - **Organic Motion**: Complex cubic-bezier easing for natural, organic feel
 *
 * Use cases:
 * - Creating organic video transitions with fabric/ink aesthetics
 * - Building cinematic video sequences with artistic transitions
 * - Adding texture-based transition effects to video content
 * - Creating immersive storytelling transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  outgoingVideoDuration: z.number().describe('Duration of the outgoing video in seconds'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  incomingVideoDuration: z.number().describe('Duration of the incoming video in seconds'),
  transitionDuration: z.number().default(2.8).describe('Total duration of the transition overlap in seconds'),
  absorptionDuration: z.number().default(1.0).describe('Duration of the absorption stage in seconds'),
  diffusionDuration: z.number().default(0.8).describe('Duration of the diffusion stage in seconds'),
  emergenceDuration: z.number().default(1.0).describe('Duration of the emergence stage in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    outgoingVideoDuration,
    incomingVideoSrc,
    incomingVideoDuration,
    transitionDuration,
    absorptionDuration,
    diffusionDuration,
    emergenceDuration,
  } = params;

  // Calculate timing
  const baseLayoutDuration = outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Stage start times (relative to transition container)
  const absorptionStart = 0;
  const diffusionStart = absorptionDuration;
  const emergenceStart = absorptionDuration + diffusionDuration;

  // Outgoing video timing
  const outgoingStart = 0;
  const outgoingDuration = outgoingVideoDuration;

  // Incoming video timing (starts before outgoing ends to create overlap)
  const incomingStart = outgoingVideoDuration - transitionDuration;
  const incomingDuration = incomingVideoDuration + transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Absorption effect (0-1s)
        {
          id: 'absorption-effect',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            start: absorptionStart,
            duration: absorptionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              // Scale down slightly
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.95, prog: 1 },
              // Desaturate
              { key: 'filter:grayscale(%)', val: 0, prog: 0 },
              { key: 'filter:grayscale(%)', val: 80, prog: 1 },
              // Blur edges
              { key: 'filter:blur(px)', val: 0, prog: 0 },
              { key: 'filter:blur(px)', val: 4, prog: 1 },
              // Fade to semi-transparent
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
        // Complete fade out during diffusion (1-1.8s)
        {
          id: 'outgoing-fade-complete',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: diffusionStart,
            duration: diffusionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 0.9, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Fabric noise layer
    {
      id: 'fabric-noise-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle, rgba(0,0,0,0.3) 1px, transparent 1px); background-size: 4px 4px; mix-blend-mode: multiply; pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          opacity: 0,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: diffusionStart,
          duration: diffusionDuration + emergenceDuration,
        },
      },
      effects: [
        // Diffusion effect (1-1.8s)
        {
          id: 'diffusion-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to fabric layer start
            duration: diffusionDuration,
            mode: 'provider',
            targetIds: ['fabric-noise-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 1 },
              { key: 'filter:hue-rotate(deg)', val: 0, prog: 0 },
              { key: 'filter:hue-rotate(deg)', val: 30, prog: 1 },
            ],
          },
        },
        // Fabric fade out during emergence (1.8-2.8s)
        {
          id: 'fabric-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: diffusionDuration, // Relative to fabric layer start
            duration: emergenceDuration,
            mode: 'provider',
            targetIds: ['fabric-noise-layer'],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        // Emergence effect (1.8-2.8s relative to transition start)
        {
          id: 'emergence-effect',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            start: emergenceStart - incomingStart, // Relative to incoming video start
            duration: emergenceDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              // Fade in from transparent
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
              // Scale up to normal
              { key: 'scale', val: 0.9, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Clear blur progressively
              { key: 'filter:blur(px)', val: 12, prog: 0 },
              { key: 'filter:blur(px)', val: 6, prog: 0.5 },
              { key: 'filter:blur(px)', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'absorption-transition-container',
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
        duration: baseLayoutDuration,
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
  id: 'absorption-transition',
  title: 'Absorption Transition',
  description:
    'Cinematic video transition where outgoing video appears absorbed into canvas fabric, with ink bleeding through fibers before incoming video emerges from the absorbed ink. Features three stages: absorption (1s), diffusion (0.8s), and emergence (1s) with 2.8-second total overlap.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'cinematic', 'organic', 'fabric', 'ink', 'absorption', 'diffusion', 'emergence'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    outgoingVideoDuration: 10,
    incomingVideoSrc: 'https://example.com/video2.mp4',
    incomingVideoDuration: 10,
    transitionDuration: 2.8,
    absorptionDuration: 1.0,
    diffusionDuration: 0.8,
    emergenceDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const absorptionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};