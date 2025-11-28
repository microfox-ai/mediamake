/**
 * Volumetric Fog Transition Preset
 *
 * A cinematic video transition where content appears to exist in layers of atmospheric mist.
 * During the 2.5s transition, the outgoing video breaks into multiple semi-transparent fog layers
 * that drift apart with turbulent sin/cos wave motion, while the incoming video materializes
 * from converging fog layers. Features depth-based blur (further layers more blurred),
 * screen blend mode for authentic fog layering, staggered timing for organic movement,
 * and subtle color grading shift to enhance mood change between clips.
 *
 * Features:
 * - 5 fog layers per video (outgoing and incoming)
 * - Depth-based opacity (0.2, 0.4, 0.6, 0.8, 1.0)
 * - Depth-based blur (furthest: 16px, closest: 0px)
 * - Sin/cos wave transforms for turbulent drift motion
 * - Screen blend mode for fog effect
 * - Staggered timing (0.2s per layer)
 * - Atmospheric color grading during transition
 *
 * Use cases:
 * - Creating cinematic transitions between video clips
 * - Building atmospheric mood changes
 * - Adding depth and layering to video transitions
 * - Creating mystical or ethereal visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the fog transition in seconds'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for turbulent wave motion'),
  colorGradingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of color grading shift during transition'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;
  const turbulenceIntensity = params.turbulenceIntensity ?? 1;
  const colorGradingIntensity = params.colorGradingIntensity ?? 0.3;

  // Calculate total duration (videos overlap during transition)
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Layer configurations
  const layerConfigs = [
    { opacity: 0.2, blur: 16 },
    { opacity: 0.4, blur: 12 },
    { opacity: 0.6, blur: 8 },
    { opacity: 0.8, blur: 4 },
    { opacity: 1.0, blur: 0 },
  ];

  // Helper function to create wave-based transform values
  const createWaveTransform = (
    layerIndex: number,
    isOutgoing: boolean,
  ): Array<{ key: string; val: string; prog: number }> => {
    const stagger = layerIndex * 0.2; // 0.2s stagger per layer
    const direction = isOutgoing ? 1 : -1; // Outgoing drifts away, incoming converges
    const amplitude = 50 * turbulenceIntensity * (layerIndex + 1) / 5; // More drift for back layers
    
    // Sin/cos wave motion for turbulent drift
    const waveFrequency = 0.5 + layerIndex * 0.1; // Different frequencies per layer
    
    return [
      // Start position (no transform for outgoing, dispersed for incoming)
      { 
        key: 'translateX', 
        val: isOutgoing ? '0px' : `${direction * amplitude * Math.sin(layerIndex * waveFrequency)}px`,
        prog: 0 
      },
      { 
        key: 'translateY', 
        val: isOutgoing ? '0px' : `${direction * amplitude * Math.cos(layerIndex * waveFrequency)}px`,
        prog: 0 
      },
      // Mid-transition (maximum drift)
      { 
        key: 'translateX', 
        val: `${direction * amplitude * Math.sin((layerIndex + 1) * waveFrequency * 2)}px`,
        prog: 0.5 
      },
      { 
        key: 'translateY', 
        val: `${direction * amplitude * Math.cos((layerIndex + 1) * waveFrequency * 2)}px`,
        prog: 0.5 
      },
      // End position (dispersed for outgoing, no transform for incoming)
      { 
        key: 'translateX', 
        val: isOutgoing ? `${direction * amplitude * Math.sin((layerIndex + 2) * waveFrequency * 3)}px` : '0px',
        prog: 1 
      },
      { 
        key: 'translateY', 
        val: isOutgoing ? `${direction * amplitude * Math.cos((layerIndex + 2) * waveFrequency * 3)}px` : '0px',
        prog: 1 
      },
    ];
  };

  // Create outgoing fog layers
  const outgoingLayers: RenderableComponentData[] = layerConfigs.map((config, index) => {
    const layerId = `outgoing-layer-${index}`;
    const videoId = `outgoing-video-${index}`;
    const staggerDelay = index * 0.2;

    return {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            opacity: config.opacity,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Opacity fade out
        {
          id: `${layerId}-opacity-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideo.duration - transitionDuration + staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'opacity', val: config.opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Turbulent wave motion
        {
          id: `${layerId}-wave-drift`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingVideo.duration - transitionDuration + staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [layerId],
            ranges: createWaveTransform(index, true),
          },
        },
        // Depth-based blur
        {
          id: `${layerId}-blur`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration + staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${config.blur}px)`, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Create incoming fog layers
  const incomingLayers: RenderableComponentData[] = layerConfigs.map((config, index) => {
    const layerId = `incoming-layer-${index}`;
    const videoId = `incoming-video-${index}`;
    const staggerDelay = (layerConfigs.length - 1 - index) * 0.2; // Reverse stagger for incoming

    return {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Opacity fade in
        {
          id: `${layerId}-opacity-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: config.opacity, prog: 1 },
            ],
          },
        },
        // Turbulent wave motion (converging)
        {
          id: `${layerId}-wave-converge`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [layerId],
            ranges: createWaveTransform(index, false),
          },
        },
        // Depth-based blur (clearing)
        {
          id: `${layerId}-blur-clear`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'filter', val: `blur(${config.blur}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Color grading overlay
  const colorGradingOverlay: RenderableComponentData = {
    id: 'color-grading-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
          backgroundColor: 'rgba(100, 120, 150, 0)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Subtle color grading shift during transition
      {
        id: 'color-grading-shift',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['color-grading-overlay'],
          ranges: [
            { 
              key: 'backgroundColor', 
              val: 'rgba(100, 120, 150, 0)', 
              prog: 0 
            },
            { 
              key: 'backgroundColor', 
              val: `rgba(100, 120, 150, ${colorGradingIntensity})`, 
              prog: 0.5 
            },
            { 
              key: 'backgroundColor', 
              val: 'rgba(100, 120, 150, 0)', 
              prog: 1 
            },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'volumetric-fog-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...outgoingLayers,
      ...incomingLayers,
      colorGradingOverlay,
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
  id: 'volumetric-fog-transition',
  title: 'Volumetric Fog Transition',
  description:
    'A cinematic video transition where content appears to exist in layers of atmospheric mist. During the 2.5s transition, the outgoing video breaks into multiple semi-transparent fog layers that drift apart with turbulent sin/cos wave motion, while the incoming video materializes from converging fog layers. Features depth-based blur (further layers more blurred), screen blend mode for authentic fog layering, staggered timing for organic movement, and subtle color grading shift to enhance mood change between clips.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'fog', 'volumetric', 'cinematic', 'atmospheric', 'depth', 'layered'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 5,
    },
    transitionDuration: 2.5,
    turbulenceIntensity: 1,
    colorGradingIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const volumetricFogTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};