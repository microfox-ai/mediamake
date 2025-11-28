/**
 * Film Burn Hole Transition Preset
 *
 * Creates a dramatic film burn transition where the outgoing media appears to melt and burn away,
 * revealing the incoming media underneath. The burn starts from a random point and expands outward
 * in an organic, irregular pattern with flickering, heat distortion, and burn edge effects.
 *
 * Features:
 * - **Organic Burn Pattern**: Random burn origin point with expanding circular reveal
 * - **Flickering Effect**: Rapid opacity flickering (1 to 0.3) for 0.3s to simulate fire
 * - **Irregular Fade**: Complex keyframe animation for unpredictable burn progression
 * - **Heat Distortion**: Subtle scaleX/scaleY variations to simulate heat waves
 * - **Burn Edge Effect**: Dark gradient overlay with expanding clip-path
 * - **Brightness Normalization**: Incoming media starts overexposed and normalizes
 * - **1.2s Overlap Period**: Smooth transition with all effects synchronized
 *
 * Use cases:
 * - Creating intense, cinematic transitions between video clips
 * - Adding dramatic flair to film-style content
 * - Simulating vintage film damage effects
 * - Building suspenseful reveal transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z.object({
    src: z.string().describe('Source URL of the outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }).describe('Outgoing media configuration'),
  incomingMedia: z.object({
    src: z.string().describe('Source URL of the incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }).describe('Incoming media configuration'),
  overlapDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of the burn transition overlap in seconds'),
  burnOrigin: z.object({
    x: z.number().min(0).max(100).optional().describe('Burn origin X position (percentage, 0-100). Random if not specified'),
    y: z.number().min(0).max(100).optional().describe('Burn origin Y position (percentage, 0-100). Random if not specified'),
  }).optional().describe('Custom burn origin point. Random if not provided'),
  flickerIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Intensity of the flickering effect (0.1-1, lower = more intense flicker)'),
  distortionIntensity: z
    .number()
    .min(0)
    .max(0.05)
    .default(0.01)
    .describe('Intensity of heat distortion effect (0-0.05)'),
  brightnessBoost: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Initial brightness boost for incoming media (1-2)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMedia,
    incomingMedia,
    overlapDuration,
    burnOrigin,
    flickerIntensity,
    distortionIntensity,
    brightnessBoost,
  } = params;

  // Generate random burn origin if not provided
  const burnX = burnOrigin?.x ?? Math.floor(Math.random() * 40) + 30; // 30-70%
  const burnY = burnOrigin?.y ?? Math.floor(Math.random() * 40) + 30; // 30-70%

  // Calculate total duration
  const totalDuration = outgoingMedia.duration + incomingMedia.duration - overlapDuration;

  // Determine component IDs based on media type
  const outgoingComponentId = outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate flicker keyframes
  const flickerDuration = 0.3;
  const flickerMin = flickerIntensity * 0.3 + (1 - flickerIntensity) * 0.1; // More intense = lower min

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Incoming media (bottom layer) - starts at overlap point
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingMedia.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: outgoingMedia.duration - overlapDuration,
          duration: incomingMedia.duration + overlapDuration,
        },
      },
      effects: [
        // Brightness normalization effect
        {
          id: 'brightness-normalize',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'filter', val: `brightness(${brightnessBoost})`, prog: 0 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing media (middle layer) - with complex effects
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingMedia.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingMedia.duration,
        },
      },
      effects: [
        // Flicker effect (0-0.3s during overlap)
        {
          id: 'flicker-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingMedia.duration - overlapDuration,
            duration: flickerDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: flickerMin, prog: 0.15 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: flickerMin, prog: 0.45 },
              { key: 'opacity', val: 1, prog: 0.6 },
              { key: 'opacity', val: flickerMin, prog: 0.75 },
              { key: 'opacity', val: 0.8, prog: 1 },
            ],
          },
        },
        // Irregular fade (0.3s-1.2s during overlap)
        {
          id: 'irregular-fade',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingMedia.duration - overlapDuration + flickerDuration,
            duration: overlapDuration - flickerDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.2 },
              { key: 'opacity', val: 0.7, prog: 0.35 },
              { key: 'opacity', val: 0.4, prog: 0.5 },
              { key: 'opacity', val: 0.5, prog: 0.65 },
              { key: 'opacity', val: 0.2, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Heat distortion (scaleX variations)
        {
          id: 'heat-distortion-x',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingMedia.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 1 + distortionIntensity, prog: 0.2 },
              { key: 'scaleX', val: 1 - distortionIntensity, prog: 0.4 },
              { key: 'scaleX', val: 1 + distortionIntensity, prog: 0.6 },
              { key: 'scaleX', val: 1 - distortionIntensity, prog: 0.8 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
        // Heat distortion (scaleY variations)
        {
          id: 'heat-distortion-y',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingMedia.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 1 - distortionIntensity, prog: 0.25 },
              { key: 'scaleY', val: 1 + distortionIntensity, prog: 0.5 },
              { key: 'scaleY', val: 1 - distortionIntensity, prog: 0.75 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Burn edge overlay (top layer) - expanding dark gradient
    {
      id: 'burn-edge-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at ${burnX}% ${burnY}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.8) 50%, transparent 100%); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 15,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: outgoingMedia.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        // Expanding clip-path animation
        {
          id: 'burn-expansion',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['burn-edge-overlay'],
            ranges: [
              { key: 'clipPath', val: `circle(0% at ${burnX}% ${burnY}%)`, prog: 0 },
              { key: 'clipPath', val: `circle(50% at ${burnX}% ${burnY}%)`, prog: 0.5 },
              { key: 'clipPath', val: `circle(150% at ${burnX}% ${burnY}%)`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'film-burn-transition-container',
    type: 'layout',
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
  id: 'film-burn-transition',
  title: 'Film Burn Hole Transition',
  description:
    'Dramatic film burn transition where outgoing media melts and burns away revealing incoming media underneath. Features organic, irregular burn patterns starting from a random point with flickering, expanding burn edges, heat distortion, and brightness normalization.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'burn', 'film', 'organic', 'dramatic', 'cinematic', 'melt', 'fire'],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    overlapDuration: 1.2,
    flickerIntensity: 0.7,
    distortionIntensity: 0.01,
    brightnessBoost: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const filmBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
