/**
 * Plasma Energy Displacement Transition Preset
 * 
 * This preset creates a high-energy transition effect where videos transform through 
 * an energized plasma field with electric distortion effects. The outgoing video 
 * fractures into 4 quadrants that rotate and scale down with color-shifting plasma 
 * effects, while the incoming video crystallizes from rotated/scaled quadrants.
 * 
 * Features:
 * - 4-quadrant split with independent transform origins
 * - Rotation (0 to 180deg) and scale (1 to 0.3) animations with staggered timing
 * - Plasma energy effects: hue-rotate, saturate, brightness filters
 * - Radial gradient overlays (purple/cyan) with color-dodge blend mode
 * - Rapid transform-origin changes for electric distortion feel
 * - 1.7s transition duration with complete overlap
 * 
 * Use cases:
 * - High-energy video transitions
 * - Sci-fi or futuristic video effects
 * - Music video transitions with plasma effects
 * - Gaming or tech content transitions
 * - Dynamic social media video transitions
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.7)
    .describe('Duration of the plasma transition overlap in seconds'),
  rotationIntensity: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .optional()
    .describe('Maximum rotation angle in degrees (default: 180)'),
  scaleIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum scale value for quadrants (default: 0.3)'),
  plasmaIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.8)
    .optional()
    .describe('Maximum brightness intensity for plasma effect (default: 1.8)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    rotationIntensity = 180,
    scaleIntensity = 0.3,
    plasmaIntensity = 1.8,
  } = params;

  // Calculate total duration (with complete overlap)
  const totalDuration = outgoingVideo.duration + incomingVideo.duration;

  // Stagger delays for quadrants (0s, 0.15s, 0.3s, 0.45s)
  const staggerDelays = [0, 0.15, 0.3, 0.45];

  // Quadrant configurations (top-left, top-right, bottom-left, bottom-right)
  const quadrantConfigs = [
    {
      id: 'top-left',
      position: { top: 0, left: 0 },
      transformOrigin: 'top left',
      objectPosition: 'left top',
    },
    {
      id: 'top-right',
      position: { top: 0, left: '50%' },
      transformOrigin: 'top right',
      objectPosition: 'right top',
    },
    {
      id: 'bottom-left',
      position: { top: '50%', left: 0 },
      transformOrigin: 'bottom left',
      objectPosition: 'left bottom',
    },
    {
      id: 'bottom-right',
      position: { top: '50%', left: '50%' },
      transformOrigin: 'bottom right',
      objectPosition: 'right bottom',
    },
  ];

  // Helper: Create outgoing quadrant with effects
  const createOutgoingQuadrant = (
    config: typeof quadrantConfigs[0],
    index: number,
  ): RenderableComponentData => {
    const quadrantId = `outgoing-${config.id}`;
    const staggerDelay = staggerDelays[index];
    const effectDuration = transitionDuration - staggerDelay;

    return {
      id: quadrantId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute will-change-transform',
        style: {
          ...config.position,
          width: '50%',
          height: '50%',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          objectFit: 'cover',
          objectPosition: config.objectPosition,
          transformOrigin: config.transformOrigin,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Transform effect (rotate + scale)
        {
          id: `${quadrantId}-transform`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideo.duration - transitionDuration + staggerDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationIntensity, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: scaleIntensity, prog: 1 },
            ],
          },
        },
        // Filter effects (hue-rotate, saturate, brightness)
        {
          id: `${quadrantId}-filter`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration + staggerDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              {
                key: 'filter',
                val: 'hue-rotate(0deg) saturate(1) brightness(1)',
                prog: 0,
              },
              {
                key: 'filter',
                val: `hue-rotate(360deg) saturate(2) brightness(${plasmaIntensity})`,
                prog: 1,
              },
            ],
          },
        },
        // Opacity fade out
        {
          id: `${quadrantId}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideo.duration - transitionDuration + staggerDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create incoming quadrant with effects
  const createIncomingQuadrant = (
    config: typeof quadrantConfigs[0],
    index: number,
  ): RenderableComponentData => {
    const quadrantId = `incoming-${config.id}`;
    const staggerDelay = staggerDelays[3 - index]; // Reverse stagger (0.45s, 0.3s, 0.15s, 0s)
    const effectDuration = transitionDuration - staggerDelay;

    return {
      id: quadrantId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute will-change-transform',
        style: {
          ...config.position,
          width: '50%',
          height: '50%',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          objectFit: 'cover',
          objectPosition: config.objectPosition,
          transformOrigin: config.transformOrigin,
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Transform effect (rotate + scale in)
        {
          id: `${quadrantId}-transform`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: staggerDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              { key: 'rotate', val: rotationIntensity, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: scaleIntensity, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Filter effects (hue-rotate, saturate, brightness in)
        {
          id: `${quadrantId}-filter`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              {
                key: 'filter',
                val: `hue-rotate(360deg) saturate(2) brightness(${plasmaIntensity})`,
                prog: 0,
              },
              {
                key: 'filter',
                val: 'hue-rotate(0deg) saturate(1) brightness(1)',
                prog: 1,
              },
            ],
          },
        },
        // Opacity fade in
        {
          id: `${quadrantId}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: staggerDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create plasma overlay with radial gradient
  const createPlasmaOverlay = (
    config: typeof quadrantConfigs[0],
    index: number,
  ): RenderableComponentData => {
    const overlayId = `plasma-overlay-${config.id}`;
    
    // Alternate colors (purple/cyan)
    const isPurpleFirst = index % 2 === 0;
    const color1 = isPurpleFirst
      ? 'rgba(168, 85, 247, 0.8)'
      : 'rgba(6, 182, 212, 0.8)';
    const color2 = isPurpleFirst
      ? 'rgba(6, 182, 212, 0.6)'
      : 'rgba(168, 85, 247, 0.6)';

    return {
      id: overlayId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: 100%; height: 100%; background: radial-gradient(circle at center, ${color1} 0%, ${color2} 50%, transparent 100%);'></div>`,
        className: 'absolute will-change-transform',
        style: {
          ...config.position,
          width: '50%',
          height: '50%',
          mixBlendMode: 'color-dodge',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // Pulsing opacity
        {
          id: `${overlayId}-pulse`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [overlayId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Scaling pulse
        {
          id: `${overlayId}-scale`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [overlayId],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Build outgoing quadrants
  const outgoingQuadrants = quadrantConfigs.map((config, index) =>
    createOutgoingQuadrant(config, index),
  );

  // Build incoming quadrants
  const incomingQuadrants = quadrantConfigs.map((config, index) =>
    createIncomingQuadrant(config, index),
  );

  // Build plasma overlays
  const plasmaOverlays = quadrantConfigs.map((config, index) =>
    createPlasmaOverlay(config, index),
  );

  // Outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: outgoingQuadrants,
  };

  // Incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: incomingQuadrants,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'plasma-transition-root',
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
      outgoingContainer,
      incomingContainer,
      ...plasmaOverlays,
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
  id: 'plasma-energy-transition',
  title: 'Plasma Energy Displacement Transition',
  description:
    'A high-energy transition effect where videos transform through an energized plasma field. The outgoing video fractures into 4 quadrants that rotate and scale down with electric color distortion effects (hue-rotate, saturate, brightness), while the incoming video crystallizes from scaled/rotated quadrants back to normal. Plasma overlay gradients use color-dodge blend mode to simulate energy displacement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'plasma',
    'energy',
    'rotation',
    'scale',
    'quadrants',
    'split',
    'electric',
    'distortion',
    'color-shifting',
    'high-energy',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.7,
    rotationIntensity: 180,
    scaleIntensity: 0.3,
    plasmaIntensity: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const plasmaEnergyTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
